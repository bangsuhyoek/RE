import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/ocr.js";

const createResponse = () => ({
  statusCode: 200,
  headers: {},
  payload: null,
  setHeader(key, value) { this.headers[key] = value; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.payload = payload; return this; },
});

const mockAuthSuccess = (fetchImpl) => async (url, opts) => {
  if (String(url).includes("/auth/v1/user")) {
    return new Response(JSON.stringify({ id: "valid-ocr-user" }), { status: 200 });
  }
  if (String(url).includes("/rpc/")) {
    return new Response(JSON.stringify({ allowed: true, retry_after_seconds: 0 }), { status: 200 });
  }
  if (fetchImpl) return fetchImpl(url, opts);
  return new Response(JSON.stringify({}), { status: 200 });
};

test("인증 토큰 없음 -> 401 및 OCR 호출 안 됨", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.GEMINI_API_KEY = "test-gemini-key";

  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  try {
    const request = { method: "POST", headers: {}, body: { text: "상품명 티빙\n결제금액 13,500원" } };
    const response = createResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 401);
    assert.equal(response.payload.code, "AUTH_REQUIRED");
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("유효하지 않은 토큰 -> 401", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";

  globalThis.fetch = async (url) => {
    if (String(url).includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ message: "Invalid token" }), { status: 401 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  };

  try {
    const request = {
      method: "POST",
      headers: { authorization: "Bearer invalid-token" },
      body: { text: "상품명 티빙\n결제금액 13,500원" },
    };
    const response = createResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 401);
    assert.equal(response.payload.code, "AUTH_REQUIRED");
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("서버 Supabase 환경변수 부재 -> 503 AGENT_AUTH_NOT_CONFIGURED", async () => {
  const originalEnv = { ...process.env };
  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.VITE_SUPABASE_ANON_KEY;

  try {
    const request = {
      method: "POST",
      headers: { authorization: "Bearer some-token" },
      body: { text: "상품명 티빙\n결제금액 13,500원" },
    };
    const response = createResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 503);
    assert.equal(response.payload.code, "AGENT_AUTH_NOT_CONFIGURED");
  } finally {
    process.env = originalEnv;
  }
});

test("결제 문자는 외부 OCR 키 없이 동일한 파서로 처리한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  globalThis.fetch = mockAuthSuccess();

  try {
    const request = {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: { text: "상품명 티빙\n결제금액 13,500원\n다음 결제일 10월 9일" },
    };
    const response = createResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.data.name, "티빙");
    assert.equal(response.payload.data.plan, "스탠다드");
    assert.equal(response.payload.data.dueDay, 9);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("이미지 OCR 키가 없으면 설정 오류를 명확히 반환한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  delete process.env.GOOGLE_VISION_API_KEY;
  delete process.env.GEMINI_API_KEY;
  globalThis.fetch = mockAuthSuccess();

  try {
    const request = {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: { mimeType: "image/png", imageBase64: "aGVsbG8=" },
    };
    const response = createResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 503);
    assert.equal(response.payload.code, "OCR_NOT_CONFIGURED");
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("Gemini 모델이 high demand(503)를 반환하면 다음 fallback 모델로 전환하여 성공한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  process.env.GEMINI_API_KEY = "test-mock-key";
  let callCount = 0;
  const calledUrls = [];

  globalThis.fetch = async (url) => {
    if (String(url).includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "valid-ocr-user" }), { status: 200 });
    }
    if (String(url).includes("/rpc/")) {
      return new Response(JSON.stringify({ allowed: true, retry_after_seconds: 0 }), { status: 200 });
    }
    callCount++;
    calledUrls.push(url);
    if (callCount === 1) {
      return {
        ok: false,
        status: 503,
        json: async () => ({
          error: {
            code: 503,
            message: "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
            status: "UNAVAILABLE",
          },
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "넷플릭스 17,000원 결제완료 10월 15일" }],
            },
          },
        ],
      }),
    };
  };

  try {
    const request = {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: {
        mimeType: "image/png",
        imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
    };
    const response = createResponse();
    await handler(request, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.ok, true);
    assert.equal(response.payload.data.name, "Netflix");
    assert.equal(response.payload.data.plan, "프리미엄");
    assert.equal(callCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("모든 Gemini 모델이 high demand(503)를 반환하면 사용자 친화적인 한글 안내를 반환한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  process.env.GEMINI_API_KEY = "test-mock-key";

  globalThis.fetch = async (url) => {
    if (String(url).includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "valid-ocr-user" }), { status: 200 });
    }
    if (String(url).includes("/rpc/")) {
      return new Response(JSON.stringify({ allowed: true, retry_after_seconds: 0 }), { status: 200 });
    }
    return {
      ok: false,
      status: 503,
      json: async () => ({
        error: {
          code: 503,
          message: "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
        },
      }),
    };
  };

  try {
    const request = {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: {
        mimeType: "image/png",
        imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
    };
    const response = createResponse();
    await handler(request, response);

    assert.equal(response.statusCode, 502);
    assert.equal(response.payload.ok, false);
    assert.match(response.payload.message, /일시적인 트래픽이 몰려 지연/);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("Google Vision 호출 시 URL에 API 키가 포함되지 않고 X-Goog-Api-Key 헤더로 전달된다", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  process.env.GOOGLE_VISION_API_KEY = "test-vision-secret-key";
  delete process.env.GEMINI_API_KEY;

  let capturedUrl = null;
  let capturedHeaders = null;

  globalThis.fetch = mockAuthSuccess(async (url, opts) => {
    capturedUrl = String(url);
    capturedHeaders = opts?.headers || {};
    return new Response(JSON.stringify({
      responses: [
        {
          fullTextAnnotation: { text: "상품명 티빙\n결제금액 13,500원" },
        },
      ],
    }), { status: 200 });
  });

  try {
    const request = {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: {
        mimeType: "image/png",
        imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
    };
    const response = createResponse();
    await handler(request, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.ok, true);
    assert.ok(capturedUrl, "Google Vision API가 호출되어야 함");
    assert.equal(capturedUrl, "https://vision.googleapis.com/v1/images:annotate");
    assert.ok(!capturedUrl.includes("key="), "URL에 key 파라미터가 없어야 함");
    assert.ok(!capturedUrl.includes("test-vision-secret-key"), "URL에 API 키가 노출되지 않아야 함");

    const headerKey = Object.keys(capturedHeaders).find((k) => k.toLowerCase() === "x-goog-api-key");
    assert.ok(headerKey, "X-Goog-Api-Key 헤더가 존재해야 함");
    assert.equal(capturedHeaders[headerKey], "test-vision-secret-key");
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("붙여넣기 텍스트가 최대 길이(20,000자)를 초과하면 413 과대 텍스트 거부를 반환한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  globalThis.fetch = mockAuthSuccess();

  try {
    const request = {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: { text: "A".repeat(20_001) },
    };
    const response = createResponse();
    await handler(request, response);

    assert.equal(response.statusCode, 413);
    assert.equal(response.payload.ok, false);
    assert.equal(response.payload.code, "TEXT_TOO_LARGE");
    assert.match(response.payload.message, /20,000/);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("붙여넣기 텍스트 경로에서 사용자 레이트리밋 함수가 호출된다", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

  const rpcCalls = [];
  globalThis.fetch = async (url, opts) => {
    const urlStr = String(url);
    if (urlStr.includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "valid-ocr-user" }), { status: 200 });
    }
    if (urlStr.includes("/rpc/")) {
      rpcCalls.push({ url: urlStr, body: JSON.parse(opts?.body || "{}") });
      return new Response(JSON.stringify({ allowed: false, retry_after_seconds: 45 }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  };

  try {
    const request = {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: { text: "상품명 티빙\n결제금액 13,500원\n다음 결제일 10월 9일" },
    };
    const response = createResponse();
    await handler(request, response);

    assert.equal(response.statusCode, 429);
    assert.equal(response.payload.ok, false);
    assert.equal(response.payload.code, "RATE_LIMITED");
    assert.equal(response.headers["Retry-After"] || response.headers["retry-after"], "45");

    assert.equal(rpcCalls.length, 1, "텍스트 경로는 사용자 쿼터 RPC만 1회 호출해야 함");
    assert.ok(rpcCalls[0].url.includes("consume_endpoint_quota"), "consume_endpoint_quota RPC가 호출되어야 함");
    assert.equal(rpcCalls[0].body.p_endpoint, "ocr", "p_endpoint는 ocr이어야 함");
    assert.ok(!rpcCalls.some((c) => c.url.includes("consume_global_gemini_quota")), "전역 Gemini 쿼터는 호출되지 않아야 함");
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

