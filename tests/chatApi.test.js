import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/chat.js";
import { _resetInMemoryRateLimits } from "../api/_lib/rateLimit.js";

function createMockReq(options = {}) {
  return {
    method: options.method || "POST",
    headers: {
      authorization: options.token ? `Bearer ${options.token}` : undefined,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body !== undefined ? options.body : {},
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    chunks: [],
    ended: false,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      this.ended = true;
      return this;
    },
    write(chunk) {
      this.chunks.push(chunk);
      return true;
    },
    end(str) {
      if (str) this.chunks.push(str);
      this.ended = true;
      if (!this.body && this.chunks.length > 0) {
        this.body = this.chunks.join("");
      }
      return this;
    },
  };
}

const validSnapshot = {
  today: "2026-10-18",
  subscriptions: [
    {
      id: "sub-1",
      name: "넷플릭스",
      serviceId: "netflix",
      amount: 13500,
      billingCycle: "매월",
      nextChargeDate: "2026-10-25",
      status: "active",
    },
  ],
};

test("401 without token", async () => {
  const req = createMockReq({ token: null });
  const res = createMockRes();

  process.env.GEMINI_API_KEY = "dummy-key";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "dummy-anon-key";

  await handler(req, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, "AUTH_REQUIRED");
});

test("400 bad body", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/auth/v1/user")) {
      return {
        ok: true,
        json: async () => ({ id: "user-123" }),
      };
    }
    return { ok: false };
  };

  try {
    process.env.GEMINI_API_KEY = "dummy-key";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "dummy-anon-key";

    // Empty messages
    const req1 = createMockReq({
      token: "valid-token",
      body: { messages: [], snapshot: validSnapshot },
    });
    const res1 = createMockRes();
    await handler(req1, res1);
    assert.equal(res1.statusCode, 400);
    assert.equal(res1.body.code, "BAD_REQUEST");

    // Missing snapshot
    const req2 = createMockReq({
      token: "valid-token",
      body: { messages: [{ role: "user", content: "안녕" }] },
    });
    const res2 = createMockRes();
    await handler(req2, res2);
    assert.equal(res2.statusCode, 400);
    assert.equal(res2.body.code, "BAD_REQUEST");

    // Last message is assistant
    const req3 = createMockReq({
      token: "valid-token",
      body: {
        messages: [{ role: "assistant", content: "도와드릴까요?" }],
        snapshot: validSnapshot,
      },
    });
    const res3 = createMockRes();
    await handler(req3, res3);
    assert.equal(res3.statusCode, 400);
    assert.equal(res3.body.code, "BAD_REQUEST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("429 when quota RPC says not allowed", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/auth/v1/user")) {
      return {
        ok: true,
        json: async () => ({ id: "user-rate-limited" }),
      };
    }
    if (String(url).includes("/rpc/consume_endpoint_quota") || String(url).includes("/rpc/consume_agent_chat_quota")) {
      return {
        ok: true,
        json: async () => ({ allowed: false, retry_after_seconds: 42 }),
      };
    }
    return { ok: false };
  };

  try {
    process.env.GEMINI_API_KEY = "dummy-key";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "dummy-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-service-key";

    const req = createMockReq({
      token: "rate-limited-token",
      body: {
        messages: [{ role: "user", content: "내 이번 달 지출 얼마야?" }],
        snapshot: validSnapshot,
      },
    });
    const res = createMockRes();
    await handler(req, res);

    assert.equal(res.statusCode, 429);
    assert.equal(res.body.code, "RATE_LIMITED");
    assert.ok(res.body.error.includes("42초"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Happy path with mocked Gemini SSE producing a functionCall then text -> assert SSE event order", async () => {
  _resetInMemoryRateLimits();
  const originalFetch = globalThis.fetch;

  let geminiCallCount = 0;

  // Mock SSE stream helper
  const createSseStream = (events) => {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        for (const ev of events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        }
        controller.close();
      },
    });
  };

  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes("/auth/v1/user")) {
      return {
        ok: true,
        json: async () => ({ id: "user-happy" }),
      };
    }
    if (urlStr.includes("/rpc/")) {
      return {
        ok: true,
        json: async () => ({ allowed: true, retry_after_seconds: 0 }),
      };
    }
    if (urlStr.includes("streamGenerateContent")) {
      geminiCallCount += 1;
      if (geminiCallCount === 1) {
        // Return a functionCall to list_subscriptions
        return {
          ok: true,
          status: 200,
          body: createSseStream([
            {
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        functionCall: {
                          name: "list_subscriptions",
                          args: {},
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ]),
        };
      } else {
        // Round 2: Return text answer
        return {
          ok: true,
          status: 200,
          body: createSseStream([
            {
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: "현재 넷플릭스 1개를 구독 중이세요!",
                      },
                    ],
                  },
                },
              ],
            },
          ]),
        };
      }
    }
    return { ok: false, status: 500 };
  };

  try {
    process.env.GEMINI_API_KEY = "dummy-key";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "dummy-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-service-key";

    const req = createMockReq({
      token: "valid-token",
      body: {
        messages: [{ role: "user", content: "나 구독 뭐 쓰고 있어?" }],
        snapshot: validSnapshot,
      },
    });
    const res = createMockRes();
    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["content-type"], "text/event-stream; charset=utf-8");

    const fullOutput = res.chunks.join("");
    // Parse SSE events
    const rawEvents = fullOutput.split("\n\n").filter(Boolean);
    const events = rawEvents.map((raw) => {
      const lines = raw.split("\n");
      const eventLine = lines.find((l) => l.startsWith("event:"));
      const dataLine = lines.find((l) => l.startsWith("data:"));
      return {
        event: eventLine ? eventLine.replace("event: ", "").trim() : null,
        data: dataLine ? JSON.parse(dataLine.replace("data: ", "").trim()) : null,
      };
    });

    const eventNames = events.map((e) => e.event);
    assert.deepEqual(eventNames, ["tool", "delta", "done"]);
    assert.equal(events[0].data.name, "list_subscriptions");
    assert.equal(events[0].data.label, "구독 목록을 확인하고 있어요");
    assert.equal(events[1].data.text, "현재 넷플릭스 1개를 구독 중이세요!");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Action event emitted for propose_* call", async () => {
  _resetInMemoryRateLimits();
  const originalFetch = globalThis.fetch;

  let geminiCallCount = 0;
  const createSseStream = (events) => {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        for (const ev of events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        }
        controller.close();
      },
    });
  };

  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes("/auth/v1/user")) {
      return {
        ok: true,
        json: async () => ({ id: "user-action" }),
      };
    }
    if (urlStr.includes("/rpc/")) {
      return {
        ok: true,
        json: async () => ({ allowed: true, retry_after_seconds: 0 }),
      };
    }
    if (urlStr.includes("streamGenerateContent")) {
      geminiCallCount += 1;
      if (geminiCallCount === 1) {
        return {
          ok: true,
          status: 200,
          body: createSseStream([
            {
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        functionCall: {
                          name: "propose_add_subscription",
                          args: {
                            name: "디즈니+",
                            amount: 9900,
                            billingCycle: "매월",
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ]),
        };
      } else {
        return {
          ok: true,
          status: 200,
          body: createSseStream([
            {
              candidates: [
                {
                  content: {
                    parts: [{ text: "디즈니+ 구독 추가 카드를 준비해 드렸어요!" }],
                  },
                },
              ],
            },
          ]),
        };
      }
    }
    return { ok: false, status: 500 };
  };

  try {
    process.env.GEMINI_API_KEY = "dummy-key";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "dummy-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-service-key";

    const req = createMockReq({
      token: "valid-token",
      body: {
        messages: [{ role: "user", content: "디즈니플러스 매월 9900원 추가해줘" }],
        snapshot: validSnapshot,
      },
    });
    const res = createMockRes();
    await handler(req, res);

    assert.equal(res.statusCode, 200);
    const fullOutput = res.chunks.join("");
    const rawEvents = fullOutput.split("\n\n").filter(Boolean);
    const events = rawEvents.map((raw) => {
      const lines = raw.split("\n");
      const eventLine = lines.find((l) => l.startsWith("event:"));
      const dataLine = lines.find((l) => l.startsWith("data:"));
      return {
        event: eventLine ? eventLine.replace("event: ", "").trim() : null,
        data: dataLine ? JSON.parse(dataLine.replace("data: ", "").trim()) : null,
      };
    });

    const eventNames = events.map((e) => e.event);
    assert.deepEqual(eventNames, ["tool", "action", "delta", "done"]);
    assert.equal(events[0].data.name, "propose_add_subscription");
    assert.equal(events[1].data.type, "add_subscription");
    assert.equal(events[1].data.payload.name, "디즈니+");
    assert.equal(events[1].data.payload.amount, 9900);
    assert.equal(events[2].data.text, "디즈니+ 구독 추가 카드를 준비해 드렸어요!");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Provider error -> error event without provider text", async () => {
  _resetInMemoryRateLimits();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes("/auth/v1/user")) {
      return {
        ok: true,
        json: async () => ({ id: "user-err" }),
      };
    }
    if (urlStr.includes("/rpc/")) {
      return {
        ok: true,
        json: async () => ({ allowed: true, retry_after_seconds: 0 }),
      };
    }
    if (urlStr.includes("streamGenerateContent")) {
      return {
        ok: false,
        status: 500,
        text: async () => "Internal Secret Server Database Down At GCP",
      };
    }
    return { ok: false, status: 500 };
  };

  try {
    process.env.GEMINI_API_KEY = "dummy-key";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "dummy-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-service-key";

    const req = createMockReq({
      token: "valid-token",
      body: {
        messages: [{ role: "user", content: "테스트" }],
        snapshot: validSnapshot,
      },
    });
    const res = createMockRes();
    await handler(req, res);

    assert.equal(res.statusCode, 200);
    const fullOutput = res.chunks.join("");
    assert.ok(fullOutput.includes("event: error"));
    assert.ok(!fullOutput.includes("Internal Secret Server Database Down At GCP"));
    assert.ok(fullOutput.includes("답변을 생성하는 중에 문제가 발생했습니다"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
