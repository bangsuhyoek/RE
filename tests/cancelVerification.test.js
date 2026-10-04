import test from "node:test";
import assert from "node:assert/strict";
import {
  answerCancelCheck,
  cancelCheckItems,
  expectedChargeAfterCancel,
  markRecordCharged,
  recordKey,
  reviewCancelVerifications,
  verificationDueAt,
} from "../src/lib/cancelVerification.js";

const sub = { subscriptionId: "s1", id: "netflix", name: "Netflix", amount: 17000, dueDay: 15, billingCycle: "매월" };
const record = (over = {}) => ({
  subscriptionId: "s1", id: "netflix", name: "Netflix", amount: 17000,
  cancelledAt: new Date(2026, 9, 4, 12).toISOString(),
  expectedChargeOn: new Date(2026, 9, 15).toISOString(),
  verification: "watching",
  ...over,
});

test("해지한 날 다음 날부터 본 다음 결제일을 지켜본다", () => {
  assert.equal(expectedChargeAfterCancel(sub, new Date(2026, 9, 4)).getDate(), 15);
  // 결제일 당일 해지하면 그날 결제는 이미 나갔을 수 있어 다음 달을 본다.
  const onDue = expectedChargeAfterCancel(sub, new Date(2026, 9, 15, 10));
  assert.equal(onDue.getMonth(), 10);
  assert.equal(onDue.getDate(), 15);
  assert.equal(expectedChargeAfterCancel({ name: "x" }), null);
});

test("확인 시각은 결제일 2일 뒤 오전 9시", () => {
  const due = verificationDueAt(record());
  assert.equal(due.getDate(), 17);
  assert.equal(due.getHours(), 9);
});

test("결제 감지를 켠 사용자는 결제가 없으면 자동으로 해지 확정", () => {
  const { history, events } = reviewCancelVerifications([record()], { now: new Date(2026, 9, 17, 10), captureEnabled: true });
  assert.equal(history[0].verification, "verified");
  assert.equal(history[0].verifiedBy, "no_payment_detected");
  assert.equal(events[0].kind, "verified");
});

test("결제 감지를 안 쓰면 시각이 지난 뒤 한 번 물어본다", () => {
  const early = reviewCancelVerifications([record()], { now: new Date(2026, 9, 16, 10) });
  assert.equal(early.events.length, 0);
  const { history, events } = reviewCancelVerifications([record()], { now: new Date(2026, 9, 17, 10) });
  assert.equal(history[0].verification, "asking");
  assert.equal(events[0].kind, "ask");
  // 이미 물어본 기록은 다시 처리하지 않는다.
  assert.equal(reviewCancelVerifications(history, { now: new Date(2026, 9, 18, 10) }).events.length, 0);
});

test("답변: 결제 없음은 확정, 결제됨은 결제 기록, 나중에는 다음 날 다시 묻기", () => {
  const asking = [record({ verification: "asking" })];
  const key = recordKey(asking[0]);
  const now = new Date(2026, 9, 17, 12);
  assert.equal(answerCancelCheck(asking, key, "no_charge", now).record.verification, "verified");
  assert.equal(answerCancelCheck(asking, key, "charged", now).record.verification, "charged");
  const later = answerCancelCheck(asking, key, "later", now).record;
  assert.equal(later.verification, "watching");
  assert.equal(verificationDueAt(later).getDate(), 18);
  assert.equal(verificationDueAt(later).getHours(), 9);
});

test("해지 후 결제 감지는 기록을 결제됨으로 바꾼다", () => {
  const list = [record()];
  assert.equal(markRecordCharged(list, list[0])[0].verification, "charged");
});

test("홈 항목: 확인 중·질문·확정(7일)·결제됨을 보여주고 오래된 확정은 숨긴다", () => {
  const now = new Date(2026, 9, 20);
  const items = cancelCheckItems([
    record(),
    record({ subscriptionId: "s2", verification: "asking" }),
    record({ subscriptionId: "s3", verification: "verified", verifiedAt: new Date(2026, 9, 18).toISOString() }),
    record({ subscriptionId: "s4", verification: "verified", verifiedAt: new Date(2026, 9, 1).toISOString() }),
    record({ subscriptionId: "s5", verification: "charged", chargedAt: new Date(2026, 9, 16).toISOString() }),
    { name: "old", cancelledAt: "2026-01-01" },
  ], now);
  assert.deepEqual(items.map((item) => item.type), ["cancel_watching", "cancel_ask", "cancel_verified", "cancel_charged"]);
  assert.match(items[2].body, /17,000/);
});

