import test from "node:test";
import assert from "node:assert/strict";
import { evaluateFramePolicy } from "../api/frame-check.js";

test("X-Frame-Options DENY는 내부 임베드를 차단한다", () => {
  const result = evaluateFramePolicy({ "x-frame-options": "DENY" });
  assert.equal(result.embeddable, false);
  assert.equal(result.reason, "X_FRAME_OPTIONS_DENY");
});

test("X-Frame-Options SAMEORIGIN은 꾸독의 교차 출처 iframe을 차단한다", () => {
  const result = evaluateFramePolicy({ "x-frame-options": "SAMEORIGIN" });
  assert.equal(result.embeddable, false);
  assert.equal(result.reason, "X_FRAME_OPTIONS_SAMEORIGIN");
});

test("CSP frame-ancestors self도 외부 서비스의 꾸독 임베드를 차단한다", () => {
  const result = evaluateFramePolicy({
    "content-security-policy": "default-src 'self'; frame-ancestors 'self'",
  });
  assert.equal(result.embeddable, false);
});

test("명시적인 프레임 차단 헤더가 없으면 내부 표시 시도를 허용한다", () => {
  const result = evaluateFramePolicy({});
  assert.equal(result.embeddable, true);
  assert.equal(result.reason, "NO_BLOCKING_FRAME_HEADER");
});
