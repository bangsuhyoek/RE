import test from "node:test";
import assert from "node:assert/strict";
import { formatKoreanMonth, getCalendarDays, getLastDate } from "../src/lib/dates.js";

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
