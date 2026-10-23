import test from "node:test";
import assert from "node:assert/strict";
import {
  describeAccountInfoAvailability,
  isAccountInfoCancelOpen,
  isBusinessDay,
  nextAccountInfoCancelOpening,
} from "../src/lib/businessDays.js";

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const key = (date) => [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours()].join("-");

test("주말과 대체공휴일은 영업일이 아니다", () => {
  assert.equal(isBusinessDay(at(2026, 10, 4)), false); // 일요일
  assert.equal(isBusinessDay(at(2026, 10, 5)), false); // 개천절 대체공휴일
  assert.equal(isBusinessDay(at(2026, 10, 6)), true);
  assert.equal(isBusinessDay(at(2026, 10, 9)), false); // 한글날
});

test("해지는 영업일 09:00 이상 22:00 미만에만 열린다", () => {
  assert.equal(isAccountInfoCancelOpen(at(2026, 10, 6, 8, 59)), false);
  assert.equal(isAccountInfoCancelOpen(at(2026, 10, 6, 9, 0)), true);
  assert.equal(isAccountInfoCancelOpen(at(2026, 10, 6, 21, 59)), true);
  assert.equal(isAccountInfoCancelOpen(at(2026, 10, 6, 22, 0)), false);
});

test("일요일에 누르면 대체공휴일을 건너뛰고 화요일 09:00을 다음 해지 시각으로 잡는다", () => {
  assert.equal(key(nextAccountInfoCancelOpening(at(2026, 10, 4, 15))), "2026-10-6-9");
});

test("영업일 이른 아침이면 그날 09:00, 밤이면 다음 영업일 09:00", () => {
  assert.equal(key(nextAccountInfoCancelOpening(at(2026, 10, 6, 7))), "2026-10-6-9");
  assert.equal(key(nextAccountInfoCancelOpening(at(2026, 10, 8, 23))), "2026-10-12-9"); // 9일 한글날, 10·11일 주말
});

test("설 연휴와 대체공휴일이 이어져도 건너뛴다", () => {
  assert.equal(key(nextAccountInfoCancelOpening(at(2027, 2, 5, 23))), "2027-2-10-9");
});

test("공휴일 목록이 없는 해는 주말만 빼고 계산하고 그 사실을 알린다", () => {
  const info = describeAccountInfoAvailability(at(2028, 1, 1, 10)); // 토요일
  assert.equal(info.open, false);
  assert.equal(info.holidayDataKnown, false);
  assert.equal(key(info.nextOpen), "2028-1-3-9");
  assert.match(info.nextOpenLabel, /1월 3일\(월\) 09:00/);
});

test("해지 가능 시간이면 지금 시각을 그대로 돌려준다", () => {
  const now = at(2026, 10, 6, 10, 30);
  const info = describeAccountInfoAvailability(now);
  assert.equal(info.open, true);
  assert.equal(info.nextOpen.getTime(), now.getTime());
});

