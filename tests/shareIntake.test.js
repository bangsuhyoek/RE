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

test("무료체험 가입 문자는 체험 중으로, 끝나는 날을 결제일로 등록한다", () => {
  const detected = sharedTextToDetected("[넷플릭스] 무료 체험이 시작되었습니다. 2026.10.20부터 17,000원이 결제됩니다.", now);
  assert.ok(detected);
  assert.equal(detected.isTrial, true);
  assert.equal(detected.dueDay, 20);
});
