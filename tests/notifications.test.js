import test from "node:test";
import assert from "node:assert/strict";
import {
  generateSubscriptionAlerts,
  createTestNotification,
} from "../src/lib/notifications.js";

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
