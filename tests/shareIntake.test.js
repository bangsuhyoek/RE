import test from "node:test";
import assert from "node:assert/strict";
import { sharedTextToDetected } from "../src/lib/shareIntake.js";

const now = new Date(2026, 9, 4, 12);

test("공유받은 결제 문자를 기기 안에서 빠른 등록 초안으로 바꾼다", () => {
  const detected = sharedTextToDetected("[신한카드] 승인 넷플릭스 17,000원 일시불 10/04 12:01", now);
  assert.ok(detected);
  assert.equal(detected.amount, 17000);
  assert.equal(detected.autoDetected, true);
  assert.ok(detected.dueDay >= 1 && detected.dueDay <= 31);
});

test("결제 정보가 없는 글은 초안을 만들지 않는다", () => {
  assert.equal(sharedTextToDetected("오늘 저녁 7시에 만나요", now), null);
  assert.equal(sharedTextToDetected("", now), null);
});

