import test from "node:test";
import assert from "node:assert/strict";
import { buildBillingEvent, buildIcs } from "../src/lib/calendarEvent.js";
import { buildDuesByDay } from "../src/lib/calendarDues.js";

const now = new Date(2026, 9, 4, 12);

test("매월 결제는 다음 결제일 종일 일정과 매월 반복 규칙을 만든다", () => {
  const event = buildBillingEvent({ name: "Netflix", plan: "스탠다드", amount: 13500, dueDay: 15, billingCycle: "매월" }, now);
  assert.equal(event.start.getFullYear(), 2026);
  assert.equal(event.start.getMonth(), 9);
  assert.equal(event.start.getDate(), 15);
  assert.equal(event.rrule, "FREQ=MONTHLY");
  assert.match(event.title, /Netflix 결제일/);
});

test("29일 이후 결제일과 무료체험은 반복하지 않는다", () => {
  assert.equal(buildBillingEvent({ name: "A", amount: 1000, dueDay: 31, billingCycle: "매월" }, now).rrule, null);
  assert.equal(buildBillingEvent({ name: "B", amount: 1000, dueDay: 10, isTrial: true }, now).rrule, null);
});

test("ics 파일은 종일 일정, 하루 전 알림, 특수문자 이스케이프를 담는다", () => {
  const event = buildBillingEvent({ name: "Spotify, Premium; Duo", amount: 16350, dueDay: 7, billingCycle: "매월" }, now);
  const ics = buildIcs(event, { uid: "sub-1@submate", now });
  assert.match(ics, /DTSTART;VALUE=DATE:20261007/);
  assert.match(ics, /DTEND;VALUE=DATE:20261008/);
  assert.match(ics, /RRULE:FREQ=MONTHLY/);
  assert.match(ics, /TRIGGER:-P1D/);
  assert.match(ics, /SUMMARY:Spotify\\, Premium\\; Duo/);
  assert.ok(ics.includes("\r\n"));
});

test("연간 구독이 과거 연도 nextBillingDate를 가질 때도 다음 결제일(갱신 월) 일정이 생성된다", () => {
  const event = buildBillingEvent(
    { name: "Nintendo Switch Online", amount: 37900, dueDay: 15, billingCycle: "매년", nextBillingDate: "2025-10-15" },
    now
  );
  assert.equal(event.start.getFullYear(), 2026);
  assert.equal(event.start.getMonth(), 9); // 10월
  assert.equal(event.start.getDate(), 15);
  assert.equal(event.rrule, "FREQ=YEARLY");
});

test("buildDuesByDay: 다른 연도의 연간 구독이 갱신 월에 표시된다", () => {
  const subs = [
    {
      id: "sub-annual-2025",
      name: "닌텐도 스위치 온라인",
      amount: 37900,
      billingCycle: "매년",
      nextBillingDate: "2025-10-15",
      dueDay: 15,
      status: "active",
    },
  ];
  const dues = buildDuesByDay(subs, 9, 31);
  const day15Dues = dues.get(15) || [];
  assert.equal(day15Dues.length, 1);
  assert.equal(day15Dues[0].id, "sub-annual-2025");
});

test("buildDuesByDay: status가 cancelled인 구독은 달력 표시 및 집계에서 제외된다", () => {
  const subs = [
    {
      id: "sub-active",
      name: "넷플릭스",
      amount: 17000,
      billingCycle: "매월",
      dueDay: 15,
      status: "active",
    },
    {
      id: "sub-cancelled",
      name: "디즈니플러스",
      amount: 9900,
      billingCycle: "매월",
      dueDay: 15,
      status: "cancelled",
    },
    {
      id: "sub-annual-cancelled",
      name: "연간취소",
      amount: 99000,
      billingCycle: "매년",
      nextBillingDate: "2025-10-15",
      dueDay: 15,
      status: "cancelled",
    },
  ];
  const dues = buildDuesByDay(subs, 9, 31);
  const day15Dues = dues.get(15) || [];
  assert.equal(day15Dues.length, 1);
  assert.equal(day15Dues[0].id, "sub-active");

  const total = Array.from(dues.values()).flat().reduce((sum, s) => sum + s.amount, 0);
  assert.equal(total, 17000);
});

test("buildDuesByDay: 갱신 월이 다른 연간 구독은 해당 월 달력에서 제외된다", () => {
  const subs = [
    {
      id: "sub-annual-may",
      name: "어도비 연간",
      amount: 350000,
      billingCycle: "매년",
      nextBillingDate: "2026-05-20",
      dueDay: 20,
      status: "active",
    },
    {
      id: "sub-monthly",
      name: "유튜브 프리미엄",
      amount: 14900,
      billingCycle: "매월",
      dueDay: 20,
      status: "active",
    },
  ];
  const dues = buildDuesByDay(subs, 9, 31);
  const day20Dues = dues.get(20) || [];
  assert.equal(day20Dues.length, 1);
  assert.equal(day20Dues[0].id, "sub-monthly");
  assert.equal(day20Dues.some((s) => s.id === "sub-annual-may"), false);
});

