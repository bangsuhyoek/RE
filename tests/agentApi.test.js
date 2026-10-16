import test from "node:test";
import assert from "node:assert/strict";
import handler, { _resetRateLimits } from "../api/agent.js";
import { normalizeInterpretation } from "../api/_lib/agentInterpretation.js";

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

test("새로운 의도(spending, top_cost, unused, service_info)가 normalizeInterpretation을 정상 통과한다", () => {
  const services = [{ id: "sub-1", name: "넷플릭스" }];

  assert.deepEqual(
    normalizeInterpretation('{"intent":"spending","subscriptionId":null}', services),
    { intent: "spending", subscriptionId: null }
  );

  assert.deepEqual(
    normalizeInterpretation('{"intent":"top_cost","subscriptionId":null}', services),
    { intent: "top_cost", subscriptionId: null }
  );

  assert.deepEqual(
    normalizeInterpretation('{"intent":"unused","subscriptionId":null}', services),
    { intent: "unused", subscriptionId: null }
  );

  assert.deepEqual(
    normalizeInterpretation('{"intent":"service_info","subscriptionId":"sub-1"}', services),
    { intent: "service_info", subscriptionId: "sub-1" }
  );
});

test("인증 토큰 없음 -> 401 및 Gemini 호출 안 됨", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.GEMINI_API_KEY = "test-gemini-key";

  try {
    const req = {
      method: "POST",
      headers: {},
      body: { text: "구독 취소해줘", services: [] },
    };
    const res = createMockRes();

    await handler(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body?.code, "AUTH_REQUIRED");
    assert.equal(fetchCalled, false, "토큰이 없으면 fetch(Supabase / Gemini)가 호출되지 않아야 함");
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("유효하지 않은 토큰 -> 401", async () => {
  const originalFetch = globalThis.fetch;
  let geminiCalled = false;

  globalThis.fetch = async (url) => {
    if (String(url).includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ message: "Invalid token" }), { status: 401 });
    }
    geminiCalled = true;
    return new Response(JSON.stringify({}), { status: 200 });
  };

  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.GEMINI_API_KEY = "test-gemini-key";

  try {
    const req = {
      method: "POST",
      headers: {
        authorization: "Bearer invalid-token",
      },
      body: { text: "구독 취소해줘", services: [] },
    };
    const res = createMockRes();

    await handler(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body?.code, "AUTH_REQUIRED");
    assert.equal(geminiCalled, false, "인증 실패 시 Gemini가 호출되지 않아야 함");
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("서버 Supabase 환경변수 부재 -> 503 AGENT_AUTH_NOT_CONFIGURED", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.VITE_SUPABASE_ANON_KEY;
  process.env.GEMINI_API_KEY = "test-gemini-key";

  try {
    const req = {
      method: "POST",
      headers: {
        authorization: "Bearer some-token",
      },
      body: { text: "구독 취소해줘", services: [] },
    };
    const res = createMockRes();

    await handler(req, res);

    assert.equal(res.statusCode, 503);
    assert.equal(res.body?.code, "AGENT_AUTH_NOT_CONFIGURED");
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("유효한 토큰 -> 200 정규화된 해석 결과 반환", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.GEMINI_API_KEY = "test-gemini-key";

  globalThis.fetch = async (url) => {
    if (String(url).includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "valid-user-123" }), { status: 200 });
    }
    if (String(url).includes("generateContent")) {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '{"intent":"cancel","subscriptionId":"seed-netflix"}' }],
              },
            },
          ],
        }),
        { status: 200 }
      );
    }
    throw new Error("unexpected fetch url: " + url);
  };

  try {
    _resetRateLimits();
    const req = {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
      },
      body: {
        text: "넷플릭스 해지해줘",
        services: [{ id: "seed-netflix", name: "Netflix" }],
      },
    };
    const res = createMockRes();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.ok, true);
    assert.equal(res.body?.intent, "cancel");
    assert.equal(res.body?.subscriptionId, "seed-netflix");
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("10분 내 21번째 요청 -> 429 RATE_LIMITED 및 Retry-After 헤더", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.GEMINI_API_KEY = "test-gemini-key";

  globalThis.fetch = async (url) => {
    if (String(url).includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "rate-limit-user" }), { status: 200 });
    }
    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"intent":"upcoming"}' }] } }],
      }),
      { status: 200 }
    );
  };

  try {
    _resetRateLimits();
    const req = {
      method: "POST",
      headers: { authorization: "Bearer rate-limit-token" },
      body: { text: "이번 달 결제 언제야?", services: [] },
    };

    // 20 requests should pass
    for (let i = 0; i < 20; i++) {
      const res = createMockRes();
      await handler(req, res);
      assert.equal(res.statusCode, 200, `요청 ${i + 1}회차는 성공해야 함`);
    }

    // 21st request should be rate limited (429)
    const res21 = createMockRes();
    await handler(req, res21);
    assert.equal(res21.statusCode, 429);
    assert.equal(res21.body?.code, "RATE_LIMITED");
    assert.ok(res21.headers["retry-after"] || res21.headers["Retry-After"]);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("첫 번째 모델 지연/실패 -> 두 번째 모델이 예산 내 응답", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.GEMINI_MODEL = "first-model";

  let callCount = 0;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "fallback-user" }), { status: 200 });
    }
    if (String(url).includes("generateContent")) {
      callCount++;
      if (callCount === 1) {
        // 첫 번째 모델은 AbortController로 취소되도록 지연
        return new Promise((_, reject) => {
          options.signal.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      }
      // 두 번째 모델 성공 응답
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '{"intent":"spending","subscriptionId":null}' }],
              },
            },
          ],
        }),
        { status: 200 }
      );
    }
    throw new Error("unexpected fetch url: " + url);
  };

  try {
    _resetRateLimits();
    const req = {
      method: "POST",
      headers: { authorization: "Bearer fallback-token" },
      body: { text: "총 지출 얼마야?", services: [] },
    };
    const res = createMockRes();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.ok, true);
    assert.equal(res.body?.intent, "spending");
    assert.equal(callCount, 2, "첫 모델 실패 후 두 번째 모델이 호출되어야 함");
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});
