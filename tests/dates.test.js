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

test("2월 29일 시작 연간 구독은 윤년과 평년을 거치며 2월 28일/29일로 유지된다", () => {
  // 2024년 2월 29일(윤년) 가입
  const leapSub = { billingCycle: "매년", nextBillingDate: "2024-02-29" };

  // 2024-01-01 기준 -> 2024년 2월 29일
  const d2024 = getNextChargeDate(leapSub, new Date(2024, 0, 1));
  assert.equal(d2024.getFullYear(), 2024);
  assert.equal(d2024.getMonth(), 1); // 2월
  assert.equal(d2024.getDate(), 29);

  // 2024-03-01 기준 (평년 2025년으로 갱신) -> 2025년 2월 28일로 보정
  const d2025 = getNextChargeDate(leapSub, new Date(2024, 2, 1));
  assert.equal(d2025.getFullYear(), 2025);
  assert.equal(d2025.getMonth(), 1);
  assert.equal(d2025.getDate(), 28);

  // 2025-03-01 기준 (평년 2026년으로 갱신) -> 2026년 2월 28일
  const d2026 = getNextChargeDate(leapSub, new Date(2025, 2, 1));
  assert.equal(d2026.getFullYear(), 2026);
  assert.equal(d2026.getMonth(), 1);
  assert.equal(d2026.getDate(), 28);

  // 2027-03-01 기준 (윤년 2028년으로 갱신) -> 3월 1일로 밀리지 않고 2028년 2월 29일로 복원
  const d2028 = getNextChargeDate(leapSub, new Date(2027, 2, 1));
  assert.equal(d2028.getFullYear(), 2028);
  assert.equal(d2028.getMonth(), 1);
  assert.equal(d2028.getDate(), 29);
});
