import test from "node:test";
import assert from "node:assert/strict";
import { buildBillingEvent, buildIcs } from "../src/lib/calendarEvent.js";

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

