import test from "node:test";
import assert from "node:assert/strict";
import { formatKoreanMonth, getCalendarDays, getLastDate, getNextChargeDate, daysUntilCharge } from "../src/lib/dates.js";

test("formatKoreanMonth는 (year, monthIndex)와 Date 객체 모두 올바른 한국어 년월을 반환한다", () => {
  assert.equal(formatKoreanMonth(2026, 8), "2026년 9월");
  assert.equal(formatKoreanMonth(2026, 0), "2026년 1월");

  const d = new Date(2026, 8, 7);
  assert.equal(formatKoreanMonth(d), "2026년 9월");

  const dJan = new Date(2026, 0, 15);
  assert.equal(formatKoreanMonth(dJan), "2026년 1월");
});

test("getLastDate 및 getCalendarDays가 올바른 달력 일수를 계산한다", () => {
  assert.equal(getLastDate(2026, 1), 28);
  assert.equal(getLastDate(2026, 8), 30);

  const days = getCalendarDays(2026, 8);
  assert.equal(days.length, 42);
  assert.equal(days[2], 1);
});

test("getNextChargeDate 및 daysUntilCharge가 매월 및 매년 결제주기를 올바르게 계산한다", () => {
  const reference = new Date(2026, 8, 9); // 2026-09-09

  // 매월 15일 결제
  const monthlySub = { dueDay: 15, billingCycle: "매월" };
  const nextMonthly = getNextChargeDate(monthlySub, reference);
  assert.equal(nextMonthly.getFullYear(), 2026);
  assert.equal(nextMonthly.getMonth(), 8); // 9월
  assert.equal(nextMonthly.getDate(), 15);
  assert.equal(daysUntilCharge(monthlySub, reference), 6);

  // 매년 9월 5일 결제 (이미 지난 경우 다음 해 2027년으로 계산)
  const yearlySub = { dueDay: 5, billingCycle: "매년", createdAt: "2025-09-05T00:00:00.000Z" };
  const nextYearly = getNextChargeDate(yearlySub, reference);
  assert.equal(nextYearly.getFullYear(), 2027);
  assert.equal(nextYearly.getMonth(), 8); // 9월
  assert.equal(nextYearly.getDate(), 5);
});
