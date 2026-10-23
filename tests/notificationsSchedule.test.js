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

const {
  scheduleSubscriptionNotifications,
  getStoredNotifications,
  saveStoredNotifications,
  generateSubscriptionAlerts,
  NOTIFICATION_STORAGE_KEY,
} = await import("../src/lib/notifications.js");

const baseNow = new Date("2026-10-01T00:00:00.000Z");

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

  const ok = await scheduleSubscriptionNotifications([sub], baseNow);
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

  await scheduleSubscriptionNotifications([sub1, sub2], baseNow);
  const ids = lastScheduled.map((n) => n.id);
  const uniqueIds = new Set(ids);
  assert.equal(ids.length, uniqueIds.size, "알림 ID 간 충돌이 없어야 함");

  const firstRunAlerts = [...lastScheduled];
  await scheduleSubscriptionNotifications([sub1, sub2], baseNow);
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

  await scheduleSubscriptionNotifications([trialSub], baseNow);
  const trialAlerts = lastScheduled.filter((n) => n.extra?.subscriptionId === "sub-trial" && n.extra?.type === "trial_d1");
  assert.equal(trialAlerts.length, 1);
  assert.equal(trialAlerts[0].extra?.cycle, 1);
  assert.equal(trialAlerts[0].extra?.type, "trial_d1");
});

test("D-2 및 오후 시간 설정(예: 오후 3시)이 그대로 예약된다", async () => {
  lastScheduled = [];

  const sub = {
    subscriptionId: "sub-custom",
    name: "Custom Service",
    amount: 9900,
    dueDay: 20,
    alertEnabled: true,
    alertDDay: 2,
    alertAmpm: "오후",
    alertHour: "03",
    status: "active",
  };

  const ok = await scheduleSubscriptionNotifications([sub], baseNow);
  assert.equal(ok, true);

  const customAlerts = lastScheduled.filter((n) => n.extra?.subscriptionId === "sub-custom");
  assert.equal(customAlerts.length, 2);

  const cycle1 = customAlerts.find((n) => n.extra?.cycle === 1);
  assert.ok(cycle1);
  assert.equal(cycle1.extra?.type, "billing_d2");
  assert.equal(cycle1.title, "[결제 D-2] Custom Service 결제 예정");
  assert.equal(cycle1.body, "2일 뒤 Custom Service ₩9,900이 결제될 예정입니다.");

  const scheduledDate = new Date(cycle1.schedule.at);
  assert.equal(scheduledDate.getDate(), 18);
  assert.equal(scheduledDate.getHours(), 15);
  assert.equal(scheduledDate.getMinutes(), 0);
});

test("alertEnabled가 false이면 결제 사전 알림이 예약되지 않는다", async () => {
  lastScheduled = [];

  const sub = {
    subscriptionId: "sub-disabled",
    name: "Disabled Service",
    amount: 12000,
    dueDay: 25,
    alertEnabled: false,
    alertDDay: 1,
    alertD1: true,
    alertD3: true,
    status: "active",
  };

  const ok = await scheduleSubscriptionNotifications([sub], baseNow);
  assert.equal(ok, true);

  const alerts = lastScheduled.filter((n) => n.extra?.subscriptionId === "sub-disabled");
  assert.equal(alerts.length, 0);
});

test("clearAll 후 저장소가 빈 배열([])로 영속화된다", () => {
  const storageMap = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => storageMap.get(key) ?? null,
      setItem: (key, val) => storageMap.set(key, String(val)),
      removeItem: (key) => storageMap.delete(key),
    },
  };

  // 알림이 있는 상태 저장
  saveStoredNotifications([{ id: "alert-1", title: "Test" }]);
  assert.equal(getStoredNotifications().length, 1);

  // clearAll 수행 시 빈 배열 저장
  saveStoredNotifications([]);
  const stored = getStoredNotifications();
  assert.deepEqual(stored, []);

  const raw = globalThis.window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
  assert.equal(raw, "[]");
});

test("알림 센터 ID에 결제 주기 식별자가 포함되어 다음 달 알림이 중복으로 제외되지 않는다", () => {
  const sub = {
    subscriptionId: "sub-netflix",
    name: "Netflix",
    amount: 17000,
    dueDay: 25,
    alertD3: true,
    alertD1: true,
    billingCycle: "매월",
  };

  // 이번 달(10월 22일) 기준 알림 생성 (10월 25일 결제 D-3)
  const octDate = new Date("2026-10-22T09:00:00.000Z");
  const octAlerts = generateSubscriptionAlerts([sub], octDate);
  assert.equal(octAlerts.length, 1);
  assert.equal(octAlerts[0].id, "alert-sub-netflix-2026-10-25-d3");

  // 다음 달(11월 22일) 기준 알림 생성 (11월 25일 결제 D-3)
  const novDate = new Date("2026-11-22T09:00:00.000Z");
  const novAlerts = generateSubscriptionAlerts([sub], novDate);
  assert.equal(novAlerts.length, 1);
  assert.equal(novAlerts[0].id, "alert-sub-netflix-2026-11-25-d3");

  // 10월 알림이 알림 센터 목록에 남아 있어도 11월 알림 ID가 달라 중복 필터링되지 않음
  const existingIds = new Set(octAlerts.map((n) => n.id));
  assert.ok(!existingIds.has(novAlerts[0].id));
});

