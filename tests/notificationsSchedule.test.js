import test from "node:test";
import assert from "node:assert/strict";

// Mock native bridge before importing Capacitor/notifications
globalThis.androidBridge = {};

const { Capacitor } = await import("@capacitor/core");
Capacitor.PluginHeaders = [
  {
    name: "LocalNotifications",
    methods: [
      { name: "checkPermissions", rtype: "promise" },
      { name: "getPending", rtype: "promise" },
      { name: "cancel", rtype: "promise" },
      { name: "schedule", rtype: "promise" },
    ],
  },
];

let lastScheduled = [];
let permissionsResult = { display: "granted" };
let pendingResult = { notifications: [] };

Capacitor.nativePromise = async (pluginName, methodName, options) => {
  if (pluginName !== "LocalNotifications") return {};
  if (methodName === "checkPermissions") return permissionsResult;
  if (methodName === "getPending") return pendingResult;
  if (methodName === "cancel") {
    return {};
  }
  if (methodName === "schedule") {
    lastScheduled = options?.notifications || [];
    return { notifications: lastScheduled };
  }
  return {};
};

const { scheduleSubscriptionNotifications } = await import("../src/lib/notifications.js");

test("활성 월간 구독은 2개 결제 주기(cycle 1, cycle 2)의 D-3 및 D-1 알림을 스케줄링한다", async () => {
  lastScheduled = [];

  const sub = {
    subscriptionId: "sub-netflix",
    name: "Netflix",
    amount: 17000,
    dueDay: 25,
    alertD1: true,
    alertD3: true,
    status: "active",
  };

  const ok = await scheduleSubscriptionNotifications([sub]);
  assert.equal(ok, true);

  const netflixAlerts = lastScheduled.filter((n) => n.extra?.subscriptionId === "sub-netflix");
  assert.equal(netflixAlerts.length, 4);

  const cycle1Alerts = netflixAlerts.filter((n) => n.extra?.cycle === 1);
  const cycle2Alerts = netflixAlerts.filter((n) => n.extra?.cycle === 2);

  assert.equal(cycle1Alerts.length, 2);
  assert.equal(cycle2Alerts.length, 2);

  assert.ok(cycle1Alerts.some((n) => n.extra?.type === "billing_d3"));
  assert.ok(cycle1Alerts.some((n) => n.extra?.type === "billing_d1"));

  assert.ok(cycle2Alerts.some((n) => n.extra?.type === "billing_d3"));
  assert.ok(cycle2Alerts.some((n) => n.extra?.type === "billing_d1"));
});

test("모든 알림 ID는 고유하며 동일 (구독, 주기, 오프셋)에 대해 결정적/안정적으로 재현된다", async () => {
  lastScheduled = [];

  const sub1 = {
    subscriptionId: "sub-1",
    name: "Service 1",
    amount: 10000,
    dueDay: 20,
    alertD1: true,
    alertD3: true,
  };
  const sub2 = {
    subscriptionId: "sub-2",
    name: "Service 2",
    amount: 15000,
    dueDay: 22,
    alertD1: true,
    alertD3: true,
  };

  await scheduleSubscriptionNotifications([sub1, sub2]);
  const ids = lastScheduled.map((n) => n.id);
  const uniqueIds = new Set(ids);
  assert.equal(ids.length, uniqueIds.size, "알림 ID 간 충돌이 없어야 함");

  const firstRunAlerts = [...lastScheduled];
  await scheduleSubscriptionNotifications([sub1, sub2]);
  const secondRunAlerts = [...lastScheduled];

  assert.equal(firstRunAlerts.length, secondRunAlerts.length);
  for (let i = 0; i < firstRunAlerts.length; i++) {
    assert.equal(firstRunAlerts[i].id, secondRunAlerts[i].id);
  }
});

test("무료체험 구독은 단발성 전환이므로 1개 주기의 D-1 알림만 예약된다", async () => {
  lastScheduled = [];

  const trialSub = {
    subscriptionId: "sub-trial",
    name: "쿠팡 와우",
    amount: 7890,
    isTrial: true,
    dueDay: 28,
    alertD1: true,
    alertD3: false,
  };

  await scheduleSubscriptionNotifications([trialSub]);
  const trialAlerts = lastScheduled.filter((n) => n.extra?.subscriptionId === "sub-trial" && n.extra?.type === "trial_d1");
  assert.equal(trialAlerts.length, 1);
  assert.equal(trialAlerts[0].extra?.cycle, 1);
  assert.equal(trialAlerts[0].extra?.type, "trial_d1");
});

