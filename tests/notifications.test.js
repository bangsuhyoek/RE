import test from "node:test";
import assert from "node:assert/strict";
import {
  generateSubscriptionAlerts,
  createTestNotification,
  DEFAULT_NOTIFICATION_DURATION,
  selectOverdueToRearm,
} from "../src/lib/notifications.js";

test("다시 예약할 때 시각이 지났지만 아직 오지 않은 알림만 다시 건다", () => {
  const now = new Date("2026-10-06T09:09:00Z");
  const subscriptions = [
    { subscriptionId: "yt", status: "active" },
    { subscriptionId: "gone", status: "cancelled" },
  ];
  const pending = [
    // 플러그인 getPending은 Java Date 문자열로 돌려준다.
    { id: 1, schedule: { at: "Tue Oct 06 09:00:00 GMT 2026" }, extra: { subscriptionId: "yt", type: "cancel_reminder" } },
    { id: 2, schedule: { at: "2026-10-08T09:00:00.000Z" }, extra: { subscriptionId: "yt" } }, // 아직 미래
    { id: 3, schedule: { at: "2026-10-06T06:00:00.000Z" }, extra: { subscriptionId: "yt" } }, // 2시간 넘게 지남
    { id: 4, schedule: { at: "2026-10-06T08:30:00.000Z" }, extra: { subscriptionId: "gone" } }, // 해지한 구독
    { id: 5, schedule: { at: "2026-10-06T08:30:00.000Z" }, extra: { subscriptionId: "deleted" } }, // 지운 구독
  ];
  assert.deepEqual(selectOverdueToRearm(pending, subscriptions, now).map((n) => n.id), [1]);
});

test("D-1 알림 대상 구독에 대해 알림 객체를 정상 생성한다", () => {
  const testSub = {
    subscriptionId: "test-sub-1",
    name: "Spotify",
    amount: 10900,
    plan: "개인",
    dueDay: 10,
    alertD1: true,
    alertD3: true,
  };
  // 2026-09-09 -> dueDay 10 is 1 day away
  const refDate = new Date("2026-09-09T10:00:00Z");
  const alerts = generateSubscriptionAlerts([testSub], refDate);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "billing_d1");
  assert.equal(alerts[0].badge, "D-1");
  assert.equal(alerts[0].daysUntil, 1);
});

test("체험판 구독은 TRIAL D-1 배지와 메시지를 갖는다", () => {
  const trialSub = {
    subscriptionId: "trial-sub-1",
    name: "쿠팡 와우",
    amount: 7890,
    isTrial: true,
    dueDay: 15,
    alertD1: true,
  };
  const refDate = new Date("2026-09-14T10:00:00Z");
  const alerts = generateSubscriptionAlerts([trialSub], refDate);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "trial_d1");
  assert.equal(alerts[0].badge, "TRIAL D-1");
});

test("createTestNotification은 올바른 테스트 알림 아이템을 생성한다", () => {
  const sub = { id: "netflix", name: "Netflix", amount: 17000, plan: "프리미엄" };
  const testItem = createTestNotification(sub, "billing_d3");
  assert.equal(testItem.isTest, true);
  assert.equal(testItem.badge, "D-3");
  assert.equal(testItem.serviceName, "Netflix");
});

test("알림바 지속 시간은 2~3초(2000ms~3000ms) 사이에 위치한다", () => {
  assert.ok(DEFAULT_NOTIFICATION_DURATION >= 2000, "2초 이상이어야 함");
  assert.ok(DEFAULT_NOTIFICATION_DURATION <= 3000, "3초 이하여야 함");
  assert.equal(DEFAULT_NOTIFICATION_DURATION, 2500);
});
