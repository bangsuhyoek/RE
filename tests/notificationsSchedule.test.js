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
      { name: "registerActionTypes", rtype: "promise" },
    ],
  },
];

let lastScheduled = [];
let lastRegisteredTypes = [];
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
  if (methodName === "registerActionTypes") {
    lastRegisteredTypes = options?.types || [];
    return {};
  }
  return {};
};

const {
  scheduleSubscriptionNotifications,
  getStoredNotifications,
  saveStoredNotifications,
  generateSubscriptionAlerts,
  NOTIFICATION_STORAGE_KEY,
  registerNotificationActionTypes,
  USAGE_CHECK_ACTION_TYPE_ID,
  buildD3NotificationContent,
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

  assert.ok(cycle1Alerts.some((n) => n.extra?.type === "usage_check"));
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

test("1. 답변이 없을 때 cycle 1 D-3 알림은 질문 형태와 actionTypeId를 갖는다", async () => {
  lastScheduled = [];
  const sub = {
    subscriptionId: "sub-netflix",
    name: "넷플릭스",
    amount: 17000,
    dueDay: 25,
    alertD1: true,
    alertD3: true,
    status: "active",
    billingCycle: "매월",
  };

  const ok = await scheduleSubscriptionNotifications([sub], baseNow, { usageAnswers: {} });
  assert.equal(ok, true);

  const d3Cycle1 = lastScheduled.find(
    (n) => n.extra?.subscriptionId === "sub-netflix" && n.extra?.cycle === 1 && n.extra?.type === "usage_check"
  );
  assert.ok(d3Cycle1, "cycle 1에 usage_check 타입의 D-3 알림이 있어야 함");
  assert.equal(d3Cycle1.title, "넷플릭스, 3일 뒤 ₩17,000");
  assert.equal(d3Cycle1.body, "이번 달 넷플릭스 잘 쓰셨어요? 알림을 내려서 바로 답해 주세요.");
  assert.equal(d3Cycle1.actionTypeId, USAGE_CHECK_ACTION_TYPE_ID);
});

test("2. 최근 2회 연속 '잘 썼어요'인 경우 스케줄링 시 정보성 D-3(billing_d3)으로 발송된다", async () => {
  lastScheduled = [];
  const sub = {
    subscriptionId: "sub-netflix",
    name: "넷플릭스",
    amount: 17000,
    dueDay: 25,
    alertD1: true,
    alertD3: true,
    status: "active",
    billingCycle: "매월",
  };

  const throttledAnswers = {
    "sub-netflix@2026-08-25": { answer: "used", subscriptionId: "sub-netflix" },
    "sub-netflix@2026-09-25": { answer: "used", subscriptionId: "sub-netflix" },
  };

  const ok = await scheduleSubscriptionNotifications([sub], baseNow, { usageAnswers: throttledAnswers });
  assert.equal(ok, true);

  const d3Cycle1 = lastScheduled.find(
    (n) => n.extra?.subscriptionId === "sub-netflix" && n.extra?.cycle === 1 && n.extra?.type === "billing_d3"
  );
  assert.ok(d3Cycle1, "스로틀 시 cycle 1 D-3은 정보성 billing_d3 알림이어야 함");
  assert.equal(d3Cycle1.title, "[결제 D-3] 넷플릭스 결제 예정");
  assert.equal(d3Cycle1.body, "3일 뒤 넷플릭스 ₩17,000이 결제될 예정입니다.");
  assert.equal(d3Cycle1.actionTypeId, undefined);
});

test("3. 2달 이상 미사용(streak>=2) 시 총 누적 금액을 포함한 해지 권유 알림을 생성한다", async () => {
  lastScheduled = [];
  const sub = {
    subscriptionId: "sub-netflix",
    name: "넷플릭스",
    amount: 17000,
    dueDay: 25,
    alertD1: true,
    alertD3: true,
    status: "active",
    billingCycle: "매월",
  };

  const unusedAnswers = {
    "sub-netflix@2026-08-25": { answer: "unused", subscriptionId: "sub-netflix" },
    "sub-netflix@2026-09-25": { answer: "unused", subscriptionId: "sub-netflix" },
  };

  const ok = await scheduleSubscriptionNotifications([sub], baseNow, { usageAnswers: unusedAnswers });
  assert.equal(ok, true);

  const d3Cycle1 = lastScheduled.find(
    (n) => n.extra?.subscriptionId === "sub-netflix" && n.extra?.cycle === 1 && n.extra?.type === "usage_cancel_suggest"
  );
  assert.ok(d3Cycle1, "streak 2 이상 시 cycle 1 D-3은 usage_cancel_suggest 이어야 함");
  assert.equal(d3Cycle1.title, "넷플릭스 2달째 거의 안 쓰셨어요");
  assert.ok(d3Cycle1.body.startsWith("그동안 ₩34,000 나갔어요. 3일 뒤 또 결제돼요. 눌러서 해지를 확인하세요."));
  assert.equal(d3Cycle1.actionTypeId, undefined);
});

test("4. 무료체험 구독은 질문/해지권유로 바뀌지 않고 체험 알림을 유지한다", async () => {
  lastScheduled = [];
  const trialSub = {
    subscriptionId: "sub-trial",
    name: "쿠팡 와우",
    amount: 7890,
    isTrial: true,
    dueDay: 28,
    alertD1: true,
  };

  const ok = await scheduleSubscriptionNotifications([trialSub], baseNow);
  assert.equal(ok, true);

  const trialAlerts = lastScheduled.filter((n) => n.extra?.subscriptionId === "sub-trial");
  // 무료체험은 1회차만 예약되며 기본 D-1(trial_d1)으로 예약됨
  assert.ok(trialAlerts.some((n) => n.extra?.type === "trial_d1"));
  assert.ok(!trialAlerts.some((n) => n.extra?.type === "usage_check"));
  assert.ok(!trialAlerts.some((n) => n.extra?.type === "usage_cancel_suggest"));

  // alertDDay: 3인 체험 구독도 trial_d3을 유지함
  const trialSubD3 = {
    subscriptionId: "sub-trial-d3",
    name: "쿠팡 와우",
    amount: 7890,
    isTrial: true,
    dueDay: 28,
    alertDDay: 3,
  };
  await scheduleSubscriptionNotifications([trialSubD3], baseNow);
  const d3Alert = lastScheduled.find((n) => n.extra?.subscriptionId === "sub-trial-d3" && n.extra?.type === "trial_d3");
  assert.ok(d3Alert);
  assert.equal(d3Alert.title, "[체험 만료 D-3] 쿠팡 와우 무료체험 종료");
  assert.equal(d3Alert.body, "3일 뒤 쿠팡 와우 무료체험이 종료되고 ₩7,890이 결제됩니다.");

  // buildD3NotificationContent도 체험판은 질문/해지권유로 변환하지 않음
  const content = buildD3NotificationContent({
    subscription: trialSub,
    chargeDate: new Date("2026-10-28"),
    cycleIndex: 0,
    answers: {},
  });
  assert.notEqual(content.extra.type, "usage_check");
  assert.notEqual(content.extra.type, "usage_cancel_suggest");
});

test("5. 월간 구독의 cycle 2 D-3 알림은 항상 정보성 문구를 유지한다", async () => {
  lastScheduled = [];
  const sub = {
    subscriptionId: "sub-netflix",
    name: "넷플릭스",
    amount: 17000,
    dueDay: 25,
    alertD1: true,
    alertD3: true,
    status: "active",
    billingCycle: "매월",
  };

  await scheduleSubscriptionNotifications([sub], baseNow, { usageAnswers: {} });

  const cycle2D3 = lastScheduled.find(
    (n) => n.extra?.subscriptionId === "sub-netflix" && n.extra?.cycle === 2 && n.extra?.type === "billing_d3"
  );
  assert.ok(cycle2D3, "cycle 2 D-3은 항상 billing_d3이어야 함");
  assert.equal(cycle2D3.title, "[결제 D-3] 넷플릭스 결제 예정");
  assert.equal(cycle2D3.body, "3일 뒤 넷플릭스 ₩17,000이 결제될 예정입니다.");
  assert.equal(cycle2D3.actionTypeId, undefined);
});

test("6. LocalNotifications action type registration: usage_check 액션 타입 등록 검증", async () => {
  lastRegisteredTypes = [];
  await registerNotificationActionTypes();
  assert.equal(lastRegisteredTypes.length, 1);
  assert.equal(lastRegisteredTypes[0].id, "usage_check");
  assert.deepEqual(lastRegisteredTypes[0].actions, [
    { id: "used", title: "잘 썼어요" },
    { id: "unused", title: "거의 안 썼어요" },
  ]);
});

test("7. extra.cycleKey로 결제일 이후에 기록된 답변이 해당 결제 주기에 저장되고 unusedStreak에 반영된다", async () => {
  const { answerUsage, unusedStreak } = await import("../src/lib/usageCheck.js");
  lastScheduled = [];
  const sub = {
    subscriptionId: "sub-tving",
    name: "티빙",
    amount: 13500,
    dueDay: 15,
    status: "active",
    billingCycle: "매월",
  };

  // 2026-10-01 기준 스케줄링 시 cycle 1의 결제일은 2026-10-15이며 extra.cycleKey는 "2026-10-15"
  await scheduleSubscriptionNotifications([sub], new Date("2026-10-01T00:00:00.000Z"));
  const d3 = lastScheduled.find(
    (n) => n.extra?.subscriptionId === "sub-tving" && n.extra?.cycle === 1 && n.extra?.type === "usage_check"
  );
  assert.ok(d3, "D-3 usage_check 알림이 스케줄링되어야 함");
  assert.equal(d3.extra?.cycleKey, "2026-10-15");

  // 사용자가 결제일 이후(예: 2026-10-20)에 알림 액션 버튼('unused')을 탭한 상황
  const tapDateAfterCharge = new Date("2026-10-20T10:00:00.000Z");
  let answers = {};
  // 이전 주기(9월)에도 미사용 기록이 있었다고 가정
  answers = answerUsage(answers, sub, "unused", new Date("2026-09-15"), "2026-09-15");
  // 결제일 이후 탭 시 extra.cycleKey("2026-10-15")를 전달하여 답변 기록
  answers = answerUsage(answers, sub, "unused", tapDateAfterCharge, d3.extra.cycleKey);

  assert.ok(answers["sub-tving@2026-10-15"], "답변이 결제일 이후 시점이 아닌 알림 주기(2026-10-15) 키에 저장되어야 함");
  assert.equal(unusedStreak(answers, sub), 2, "10-15 주기에 정상 저장되어 unusedStreak가 2로 집계되어야 함");
});

test("8. cycleKey 지정 답변 후 다른 구독의 기본 답변 기록 시 두 구독의 답변이 모두 보존된다", async () => {
  const { answerUsage } = await import("../src/lib/usageCheck.js");
  const subA = { subscriptionId: "sub-a", name: "구독A", dueDay: 10, status: "active", billingCycle: "매월" };
  const subB = { subscriptionId: "sub-b", name: "구독B", dueDay: 20, status: "active", billingCycle: "매월" };

  let answers = {};
  // 알림 액션으로 subA에 cycleKey 지정 답변 기록
  answers = answerUsage(answers, subA, "unused", new Date("2026-10-12"), "2026-10-10");
  // 홈 카드에서 subB에 기본 답변(cycleKey 생략) 기록
  answers = answerUsage(answers, subB, "used", new Date("2026-10-18"));

  assert.equal(answers["sub-a@2026-10-10"]?.answer, "unused");
  assert.equal(answers["sub-b@2026-10-20"]?.answer, "used");
});

test("9. 이번 주기(미결제)의 unused 답변은 알림 권유 금액 산정 시 제외된다", async () => {
  const sub = {
    subscriptionId: "sub-watcha",
    name: "왓챠",
    amount: 10000,
    dueDay: 25,
    status: "active",
    billingCycle: "매월",
  };
  const chargeDate = new Date("2026-10-25");

  // 1) 지난 달(9/25) 1회만 unused이고 이번 달(10/25)도 unused 답변이 있는 경우:
  // 결제 전 과거 누적 주기는 9/25 1회뿐이므로 streak < 2 -> 해지 권유 대신 일반 안내형으로 폴백되어야 함 (미결제 주기 제외)
  const answersOnePast = {
    "sub-watcha@2026-09-25": { answer: "unused", subscriptionId: "sub-watcha" },
    "sub-watcha@2026-10-25": { answer: "unused", subscriptionId: "sub-watcha" },
  };
  const contentOne = buildD3NotificationContent({
    subscription: sub,
    chargeDate,
    cycleIndex: 0,
    answers: answersOnePast,
  });
  assert.notEqual(contentOne.extra.type, "usage_cancel_suggest", "과거 1회 + 이번 주기 1회는 아직 2달 누적 결제가 아니므로 권유로 전환되지 않음");

  // 2) 과거 2회(8/25, 9/25)가 unused이고 이번 달(10/25)도 unused 답변이 있는 경우:
  // 과거 2회만 카운트되어 2달치(₩20,000)만 누적 금액으로 표시되어야 함 (3달치 ₩30,000이 아님)
  const answersTwoPast = {
    "sub-watcha@2026-08-25": { answer: "unused", subscriptionId: "sub-watcha" },
    "sub-watcha@2026-09-25": { answer: "unused", subscriptionId: "sub-watcha" },
    "sub-watcha@2026-10-25": { answer: "unused", subscriptionId: "sub-watcha" },
  };
  const contentTwo = buildD3NotificationContent({
    subscription: sub,
    chargeDate,
    cycleIndex: 0,
    answers: answersTwoPast,
  });
  assert.equal(contentTwo.extra.type, "usage_cancel_suggest");
  assert.equal(contentTwo.title, "왓챠 2달째 거의 안 쓰셨어요");
  assert.ok(contentTwo.body.includes("그동안 ₩20,000 나갔어요"), "아직 결제되지 않은 이번 주기(10/25) 금액은 누적 금액에서 제외되어 ₩20,000이어야 함");
});

test("10. id와 subscriptionId 접두어가 섞여 있어도 날짜 기준으로 올바르게 정렬되어 unusedStreak를 계산한다", async () => {
  const { unusedStreak } = await import("../src/lib/usageCheck.js");
  const sub = {
    id: "netflix-id",
    subscriptionId: "sub-netflix-custom",
    name: "넷플릭스",
  };

  // id와 subscriptionId 접두어가 혼용된 답변 목록
  const mixedAnswers = {
    "netflix-id@2026-08-25": { answer: "unused", subscriptionId: "netflix-id" },
    "sub-netflix-custom@2026-09-25": { answer: "unused", subscriptionId: "sub-netflix-custom" },
    "netflix-id@2026-07-25": { answer: "used", subscriptionId: "netflix-id" },
  };
  assert.equal(unusedStreak(mixedAnswers, sub), 2);
});

