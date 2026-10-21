import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/cancel-next-step.js";
import {
  validateAndClamp,
  scrub,
  normalize,
  buildPrompt,
} from "../api/_lib/cancelNextStep.js";
import { _resetInMemoryRateLimits } from "../api/_lib/rateLimit.js";

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
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
      return this;
    },
    end(str) {
      if (str && !this.body) {
        try {
          this.body = JSON.parse(str);
        } catch {
          this.body = str;
        }
      }
      return this;
    },
  };
}

test("scrub: email, 4+ digits, and Korean 님 masking", () => {
  const raw = "안녕하세요 user123@gmail.com 님! 카드번호 4412-5567 주문번호 987654 홍길동님 처리되었습니다.";
  const scrubbed = scrub(raw);
  assert.ok(!scrubbed.includes("user123@gmail.com"));
  assert.ok(scrubbed.includes("[EMAIL]"));
  assert.ok(!scrubbed.includes("4412"));
  assert.ok(!scrubbed.includes("987654"));
  assert.ok(scrubbed.includes("[NUM]"));
  assert.ok(!scrubbed.includes("홍길동님"));
  assert.ok(scrubbed.includes("회원님"));

  assert.equal(scrub("OOO님 결제"), "회원님 결제");
  assert.equal(scrub("김철수님"), "회원님");
  assert.equal(scrub("3자리 123"), "3자리 123");
  assert.equal(scrub("4자리 1234"), "4자리 [NUM]");
});

test("validateAndClamp: rejects invalid request bodies", () => {
  assert.equal(validateAndClamp(null).valid, false);
  assert.equal(validateAndClamp({}).valid, false);
  assert.equal(
    validateAndClamp({
      serviceName: "Netflix",
      host: "netflix.com",
      pageTitle: "Title",
      history: [],
      elements: [], // empty elements not allowed (1..60)
    }).valid,
    false
  );

  // host with protocol/path rejected
  assert.equal(
    validateAndClamp({
      serviceName: "Netflix",
      host: "https://netflix.com/account",
      pageTitle: "Title",
      history: [],
      elements: [{ i: 0, text: "btn", role: "button", tag: "button", inDialog: false }],
    }).valid,
    false
  );

  // serviceName > 60 chars
  assert.equal(
    validateAndClamp({
      serviceName: "A".repeat(61),
      host: "netflix.com",
      pageTitle: "Title",
      history: [],
      elements: [{ i: 0, text: "btn", role: "button", tag: "button", inDialog: false }],
    }).valid,
    false
  );

  // duplicate element i
  assert.equal(
    validateAndClamp({
      serviceName: "Netflix",
      host: "netflix.com",
      pageTitle: "Title",
      history: [],
      elements: [
        { i: 0, text: "btn", role: "button", tag: "button", inDialog: false },
        { i: 0, text: "btn2", role: "button", tag: "button", inDialog: false },
      ],
    }).valid,
    false
  );
});

test("validateAndClamp: valid body clamped and scrubbed", () => {
  const res = validateAndClamp({
    serviceName: "  Netflix OOO님  ",
    host: "netflix.com",
    pageTitle: "계정 관리 123456",
    history: ["설정 010-1234-5678"],
    elements: [
      { i: 10, text: "user@test.com 해지하기", role: "button", tag: "button", inDialog: false },
    ],
  });
  assert.equal(res.valid, true);
  assert.equal(res.value.serviceName, "Netflix 회원님");
  assert.equal(res.value.host, "netflix.com");
  assert.equal(res.value.pageTitle, "계정 관리 [NUM]");
  assert.equal(res.value.history[0], "설정 [PHONE]");
  assert.equal(res.value.elements[0].text, "[EMAIL] 해지하기");
  assert.equal(res.value.elements[0].i, 10);
});

test("normalize safety rules: nav upgraded to cancel when cancel keywords present", () => {
  const input = {
    elements: [
      { i: 0, text: "구독 해지", role: "button", tag: "button", inDialog: false },
      { i: 1, text: "Cancel membership", role: "button", tag: "button", inDialog: false },
      { i: 2, text: "이용 종료 확정", role: "button", tag: "button", inDialog: false },
      { i: 3, text: "일반 설정", role: "link", tag: "a", inDialog: false },
    ],
  };

  assert.deepEqual(normalize({ index: 0, kind: "nav", confidence: 0.8 }, input), {
    index: 0,
    kind: "cancel",
    confidence: 0.8,
  });
  assert.deepEqual(normalize({ index: 1, kind: "nav", confidence: 0.9 }, input), {
    index: 1,
    kind: "cancel",
    confidence: 0.9,
  });
  assert.deepEqual(normalize({ index: 2, kind: "nav", confidence: 0.95 }, input), {
    index: 2,
    kind: "cancel",
    confidence: 0.95,
  });
  assert.deepEqual(normalize({ index: 3, kind: "nav", confidence: 0.75 }, input), {
    index: 3,
    kind: "nav",
    confidence: 0.75,
  });
});

test("normalize safety rules: forbidden keywords rejected to none", () => {
  const input = {
    elements: [
      { i: 0, text: "회원 탈퇴", role: "button", tag: "button", inDialog: false },
      { i: 1, text: "로그아웃", role: "button", tag: "button", inDialog: false },
      { i: 2, text: "결제수단 관리", role: "link", tag: "a", inDialog: false },
      { i: 3, text: "Delete account", role: "button", tag: "button", inDialog: false },
      { i: 4, text: "logout now", role: "button", tag: "button", inDialog: false },
      { i: 5, text: "Payment method change", role: "button", tag: "button", inDialog: false },
    ],
  };

  for (let idx = 0; idx < input.elements.length; idx++) {
    assert.deepEqual(
      normalize({ index: idx, kind: "cancel", confidence: 0.9 }, input),
      { index: null, kind: "none", confidence: 0 }
    );
  }
});

test("normalize safety rules: invalid index or unknown kind converted to none", () => {
  const input = {
    elements: [{ i: 5, text: "다음", role: "button", tag: "button", inDialog: false }],
  };
  // index not found
  assert.deepEqual(normalize({ index: 99, kind: "nav", confidence: 0.8 }, input), {
    index: null,
    kind: "none",
    confidence: 0.8,
  });
  // unknown kind
  assert.deepEqual(normalize({ index: 5, kind: "unknown_action", confidence: 0.8 }, input), {
    index: null,
    kind: "none",
    confidence: 0.8,
  });
  // login kind forces index null
  assert.deepEqual(normalize({ index: 5, kind: "login", confidence: 0.9 }, input), {
    index: null,
    kind: "login",
    confidence: 0.9,
  });
});

test("buildPrompt: includes serviceName, host, title, history, and candidates", () => {
  const prompt = buildPrompt({
    serviceName: "Netflix",
    host: "netflix.com",
    pageTitle: "계정 설정",
    history: ["메뉴 열기", "내 계정"],
    elements: [{ i: 1, text: "멤버십 해지", role: "button", tag: "button", inDialog: false }],
  });
  assert.ok(prompt.includes("Netflix"));
  assert.ok(prompt.includes("netflix.com"));
  assert.ok(prompt.includes("계정 설정"));
  assert.ok(prompt.includes("멤버십 해지"));
  assert.ok(prompt.includes("내 계정"));
});

test("handler: 401 without auth header or invalid token", async () => {
  const req = {
    method: "POST",
    headers: {},
    body: {},
  };
  const res = createMockRes();
  await handler(req, res);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "UNAUTHORIZED" });
});

test("handler: 503 when GEMINI_API_KEY is not configured", async () => {
  const originalEnv = { ...process.env };
  delete process.env.GEMINI_API_KEY;
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "user-123" }), { status: 200 });
    }
    return new Response("{}", { status: 200 });
  };

  try {
    const req = {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: {
        serviceName: "Netflix",
        host: "netflix.com",
        pageTitle: "Account",
        history: [],
        elements: [{ i: 0, text: "해지", role: "button", tag: "button", inDialog: false }],
      },
    };
    const res = createMockRes();
    await handler(req, res);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { error: "CANCEL_AI_NOT_CONFIGURED" });
  } finally {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  }
});

test("handler: happy path with mocked fetch returning Gemini JSON", async () => {
  const originalEnv = { ...process.env };
  process.env.GEMINI_API_KEY = "mock-key";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  _resetInMemoryRateLimits();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "user-123" }), { status: 200 });
    }
    if (url.includes("/rpc/")) {
      return new Response(JSON.stringify({ allowed: true, retry_after_seconds: 0 }), { status: 200 });
    }
    if (url.includes("generateContent")) {
      const geminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    index: 1,
                    kind: "nav", // will be upgraded to cancel because text is '해지 계속하기'
                    confidence: 0.92,
                  }),
                },
              ],
            },
          },
        ],
      };
      return new Response(JSON.stringify(geminiResponse), { status: 200 });
    }
    return new Response("{}", { status: 200 });
  };

  try {
    const req = {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: {
        serviceName: "Netflix",
        host: "netflix.com",
        pageTitle: "Account",
        history: ["설정"],
        elements: [
          { i: 0, text: "계정 유지", role: "button", tag: "button", inDialog: false },
          { i: 1, text: "해지 계속하기", role: "button", tag: "button", inDialog: false },
        ],
      },
    };
    const res = createMockRes();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      index: 1,
      kind: "cancel",
      confidence: 0.92,
    });
  } finally {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  }
});

test("handler: timeout abort triggers 504 CANCEL_AI_TIMEOUT", async () => {
  const originalEnv = { ...process.env };
  process.env.GEMINI_API_KEY = "mock-key";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  _resetInMemoryRateLimits();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "user-123" }), { status: 200 });
    }
    if (url.includes("/rpc/")) {
      return new Response(JSON.stringify({ allowed: true, retry_after_seconds: 0 }), { status: 200 });
    }
    if (url.includes("generateContent")) {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      throw err;
    }
    return new Response("{}", { status: 200 });
  };

  try {
    const req = {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: {
        serviceName: "Netflix",
        host: "netflix.com",
        pageTitle: "Account",
        history: [],
        elements: [{ i: 0, text: "해지", role: "button", tag: "button", inDialog: false }],
      },
    };
    const res = createMockRes();
    await handler(req, res);
    assert.equal(res.statusCode, 504);
    assert.deepEqual(res.body, { error: "CANCEL_AI_TIMEOUT" });
  } finally {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  }
});

test("handler: falls back to secondary model when primary model returns 503", async () => {
  const originalEnv = { ...process.env };
  process.env.GEMINI_API_KEY = "mock-key";
  process.env.GEMINI_CANCEL_MODEL = "gemini-primary-unavailable";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  _resetInMemoryRateLimits();

  const calledModels = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "user-123" }), { status: 200 });
    }
    if (url.includes("/rpc/")) {
      return new Response(JSON.stringify({ allowed: true, retry_after_seconds: 0 }), { status: 200 });
    }
    if (url.includes("generateContent")) {
      calledModels.push(url);
      if (url.includes("gemini-primary-unavailable")) {
        return new Response(JSON.stringify({ error: { message: "Overloaded" } }), { status: 503 });
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ index: 0, kind: "nav", confidence: 0.88 }) }],
              },
            },
          ],
        }),
        { status: 200 }
      );
    }
    return new Response("{}", { status: 200 });
  };

  try {
    const req = {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: {
        serviceName: "Netflix",
        host: "netflix.com",
        pageTitle: "Account",
        history: [],
        elements: [{ i: 0, text: "마이페이지", role: "link", tag: "a", inDialog: false }],
      },
    };
    const res = createMockRes();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.ok(calledModels.length >= 2);
    assert.deepEqual(res.body, { index: 0, kind: "nav", confidence: 0.88 });
  } finally {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  }
});
