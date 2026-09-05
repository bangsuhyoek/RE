import test from "node:test";
import assert from "node:assert/strict";
import {
  formatKoreanMonth,
  getChargeDateInMonth,
  getNextChargeDate,
  monthlyEquivalentTotal,
} from "../src/lib/dates.js";

const parts = (date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

test("직접 입력한 다음 결제일을 월간 반복의 기준으로 사용한다", () => {
  const subscription = { billingCycle: "매월", nextBillingDate: "2026-09-10", dueDay: 10, amount: 17000 };
  assert.deepEqual(parts(getNextChargeDate(subscription, new Date(2026, 8, 6))), [2026, 9, 10]);
  assert.deepEqual(parts(getNextChargeDate(subscription, new Date(2026, 8, 11))), [2026, 10, 10]);
});

test("연간 구독은 기준 월에만 반복 결제로 계산한다", () => {
  const subscription = { billingCycle: "매년", nextBillingDate: "2026-09-10", dueDay: 10, amount: 120000 };
  assert.deepEqual(parts(getNextChargeDate(subscription, new Date(2026, 9, 1))), [2027, 9, 10]);
  assert.equal(getChargeDateInMonth(subscription, 2027, 9), null);
  assert.deepEqual(parts(getChargeDateInMonth(subscription, 2027, 8)), [2027, 9, 10]);
});

test("연간 금액은 월 환산 합계에서 12개월로 나눈다", () => {
  const total = monthlyEquivalentTotal([
    { billingCycle: "매년", amount: 120000 },
    { billingCycle: "매월", amount: 10000 },
  ]);
  assert.equal(total, 20000);
});

test("달력 제목은 Date와 연도/월 인자를 모두 안전하게 지원한다", () => {
  assert.equal(formatKoreanMonth(new Date(2026, 8, 1)), "2026년 9월");
  assert.equal(formatKoreanMonth(2026, 8), "2026년 9월");
});
