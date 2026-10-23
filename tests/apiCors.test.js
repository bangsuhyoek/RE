import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCors,
  isOriginAllowed,
  getAllowedOrigins,
  DEFAULT_ALLOWED_ORIGINS,
} from "../api/_lib/cors.js";
import accountDeleteHandler from "../api/account-delete.js";
import agentHandler from "../api/agent.js";
import cancelHandler from "../api/cancel-next-step.js";
import chatHandler from "../api/chat.js";
import ocrHandler from "../api/ocr.js";

function createMockRes() {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    ended: false,
    setHeader(key, value) {
      headers[key.toLowerCase()] = value;
      headers[key] = value;
    },
    getHeader(key) {
      return headers[key.toLowerCase()] ?? headers[key];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

test("CORS: 기본 허용 출처 목록이 올바르게 정의되어 있다", () => {
  const expected = [
    "capacitor://localhost",
    "http://localhost",
    "https://localhost",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
  assert.deepEqual(DEFAULT_ALLOWED_ORIGINS, expected);
  for (const origin of expected) {
    assert.equal(isOriginAllowed(origin), true, `${origin}은 기본 허용되어야 함`);
  }
});

test("CORS: ALLOWED_ORIGINS 환경변수를 통해 추가 출처를 병합한다", () => {
  const originalEnv = process.env.ALLOWED_ORIGINS;
  try {
    process.env.ALLOWED_ORIGINS = "https://submate.app, https://staging.submate.app, ";
    const allowed = getAllowedOrigins();
    assert.ok(allowed.includes("https://submate.app"));
    assert.ok(allowed.includes("https://staging.submate.app"));
    assert.ok(allowed.includes("http://localhost:5173"));
    assert.equal(isOriginAllowed("https://submate.app"), true);
    assert.equal(isOriginAllowed("https://staging.submate.app"), true);
    assert.equal(isOriginAllowed("https://malicious.attacker.com"), false);
  } finally {
    if (originalEnv !== undefined) {
      process.env.ALLOWED_ORIGINS = originalEnv;
    } else {
      delete process.env.ALLOWED_ORIGINS;
    }
  }
});

test("applyCors: Vary: Origin 및 기본 CORS 헤더를 설정한다", () => {
  const req = { headers: {} };
  const res = createMockRes();
  applyCors(req, res);

  assert.equal(res.headers["vary"], "Origin");
  assert.equal(res.headers["access-control-allow-methods"], "POST, OPTIONS");
  assert.equal(res.headers["access-control-allow-headers"], "Content-Type, Authorization");
  assert.equal(res.headers["access-control-allow-origin"], undefined);
});

test("applyCors: 허용된 Origin은 ACAO로 반환되고, 미허용/누락 Origin은 ACAO를 반환하지 않는다", () => {
  // 1) 허용된 Origin
  for (const allowedOrigin of DEFAULT_ALLOWED_ORIGINS) {
    const req = { headers: { origin: allowedOrigin } };
    const res = createMockRes();
    applyCors(req, res);
    assert.equal(res.headers["access-control-allow-origin"], allowedOrigin);
    assert.equal(res.headers["vary"], "Origin");
  }

  // 2) 미허용 Origin
  const forbiddenReq = { headers: { origin: "https://evil-phishing.com" } };
  const forbiddenRes = createMockRes();
  applyCors(forbiddenReq, forbiddenRes);
  assert.equal(forbiddenRes.headers["access-control-allow-origin"], undefined);
  assert.equal(forbiddenRes.headers["vary"], "Origin");

  // 3) Origin 헤더 누락
  const noOriginReq = { headers: {} };
  const noOriginRes = createMockRes();
  applyCors(noOriginReq, noOriginRes);
  assert.equal(noOriginRes.headers["access-control-allow-origin"], undefined);
  assert.equal(noOriginRes.headers["vary"], "Origin");
});

test("5개 API 엔드포인트: OPTIONS 204에 올바른 CORS 헤더가 설정된다", async () => {
  const endpoints = [
    { name: "account-delete", handler: accountDeleteHandler },
    { name: "agent", handler: agentHandler },
    { name: "cancel-next-step", handler: cancelHandler },
    { name: "chat", handler: chatHandler },
    { name: "ocr", handler: ocrHandler },
  ];

  for (const { name, handler } of endpoints) {
    // 1) 허용 Origin의 OPTIONS 프리플라이트 요청 -> 204 및 ACAO 반영
    const allowedOrigin = "capacitor://localhost";
    const reqAllowed = {
      method: "OPTIONS",
      headers: { origin: allowedOrigin },
    };
    const resAllowed = createMockRes();
    await handler(reqAllowed, resAllowed);

    assert.equal(resAllowed.statusCode, 204, `${name} OPTIONS status should be 204`);
    assert.equal(resAllowed.ended, true, `${name} OPTIONS should end response`);
    assert.equal(resAllowed.headers["access-control-allow-origin"], allowedOrigin, `${name} ACAO should match allowed origin`);
    assert.equal(resAllowed.headers["access-control-allow-methods"], "POST, OPTIONS", `${name} Allow-Methods`);
    assert.equal(resAllowed.headers["access-control-allow-headers"], "Content-Type, Authorization", `${name} Allow-Headers`);
    assert.equal(resAllowed.headers["vary"], "Origin", `${name} Vary: Origin`);

    // 2) 미허용 Origin의 OPTIONS 프리플라이트 요청 -> 204 반환하지만 ACAO 없음
    const reqDisallowed = {
      method: "OPTIONS",
      headers: { origin: "https://not-allowed.com" },
    };
    const resDisallowed = createMockRes();
    await handler(reqDisallowed, resDisallowed);

    assert.equal(resDisallowed.statusCode, 204);
    assert.equal(resDisallowed.headers["access-control-allow-origin"], undefined, `${name} should not set ACAO for disallowed origin`);
    assert.equal(resDisallowed.headers["vary"], "Origin");

    // 3) Origin 헤더가 없는 OPTIONS 요청 -> 204 반환하지만 ACAO 없음
    const reqNoOrigin = {
      method: "OPTIONS",
      headers: {},
    };
    const resNoOrigin = createMockRes();
    await handler(reqNoOrigin, resNoOrigin);

    assert.equal(resNoOrigin.statusCode, 204);
    assert.equal(resNoOrigin.headers["access-control-allow-origin"], undefined, `${name} should not set ACAO when origin is missing`);
    assert.equal(resNoOrigin.headers["vary"], "Origin");
  }
});
