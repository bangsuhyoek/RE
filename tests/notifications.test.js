import test from "node:test";
import assert from "node:assert/strict";
import { generateSubscriptionAlerts } from "../src/lib/notifications.js";

const subscription = {
  subscriptionId: "manual-1",
  name: "테스트 구독",
  plan: "기본",
  amount: 10000,
  billingCycle: "매월",
  nextBillingDate: "2026-09-09",
  dueDay: 9,
  alertD3: true,
  alertD1: true,
  status: "active",
};

test("같은 구독도 결제 회차가 달라지면 새 알림 ID를 만든다", () => {
  const september = generateSubscriptionAlerts([subscription], new Date(2026, 8, 6));
  const october = generateSubscriptionAlerts([subscription], new Date(2026, 9, 6));

  assert.equal(september.length, 1);
  assert.equal(october.length, 1);
  assert.match(september[0].id, /2026-09-09-d3$/);
  assert.match(october[0].id, /2026-10-09-d3$/);
  assert.notEqual(september[0].id, october[0].id);
});

test("알림이 꺼진 시점에는 D-3 알림을 만들지 않는다", () => {
  const alerts = generateSubscriptionAlerts([{ ...subscription, alertD3: false }], new Date(2026, 8, 6));
  assert.equal(alerts.length, 0);
});
