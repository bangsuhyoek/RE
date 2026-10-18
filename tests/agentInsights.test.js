import test from "node:test";
import assert from "node:assert/strict";
import {
  generateAgentInsights,
  dismissInsightId,
  isInsightDismissed,
  snoozeInsightId,
  isInsightSnoozed,
  readSnoozedInsights,
  writeDismissedInsights,
  writeSnoozedInsights,
} from "../src/lib/agentInsights.js";
import { toLocalDateKey } from "../src/lib/dates.js";

// Mock localStorage for node test environment
const mockStorage = (() => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

globalThis.window = {
  localStorage: mockStorage,
};

// Fixed reference date: 2026-10-18
const NOW = new Date(2026, 9, 18, 10, 0, 0);

test("generateAgentInsights: 빈 목록이나 유효하지 않은 입력 시 빈 배열 반환", () => {
  assert.deepEqual(generateAgentInsights([]), []);
  assert.deepEqual(generateAgentInsights(null), []);
  assert.deepEqual(generateAgentInsights(undefined), []);
});

test("generateAgentInsights: 해지된(cancelled) 구독은 모든 규칙에서 제외된다", () => {
  const cancelledSubs = [
    {
      subscriptionId: "sub-trial-cancelled",
      name: "체험 해지",
      amount: 10000,
      dueDay: 19,
      isTrial: true,
      status: "cancelled",
    },
    {
      subscriptionId: "sub-annual-cancelled",
      name: "연간 해지",
      amount: 120000,
      dueDay: 20,
      billingCycle: "매년",
      status: "cancelled",
    },
  ];

  const insights = generateAgentInsights(cancelledSubs, { now: NOW });
  assert.equal(insights.length, 0);
});

test("Rule a (trial_ending): 무료체험 종료 3일 이내 감지 및 D-1 이하 high 우선순위", () => {
  // NOW = 2026-10-18
  // dueDay 18: 오늘 종료 (D-0) -> high
  // dueDay 19: 1일 뒤 (D-1) -> high
  // dueDay 20: 2일 뒤 (D-2) -> normal
  // dueDay 21: 3일 뒤 (D-3) -> normal
  // dueDay 22: 4일 뒤 (D-4) -> 제외
  const subs = [
    {
      subscriptionId: "t-d0",
      name: "넷플릭스 체험",
      amount: 17000,
      dueDay: 18,
      isTrial: true,
      status: "active",
    },
    {
      subscriptionId: "t-d1",
      name: "티빙 체험",
      amount: 9500,
      dueDay: 19,
      isTrial: true,
      status: "active",
    },
    {
      subscriptionId: "t-d2",
      name: "디즈니 체험",
      amount: 9900,
      dueDay: 20,
      isTrial: true,
      status: "active",
    },
    {
      subscriptionId: "t-d4",
      name: "웨이브 체험",
      amount: 7900,
      dueDay: 22,
      isTrial: true,
      status: "active",
    },
  ];

  const insights = generateAgentInsights(subs, { now: NOW });
  const trialInsights = insights.filter((i) => i.kind === "trial_ending");

  assert.equal(trialInsights.length, 3);
  assert.equal(trialInsights[0].subscriptionId, "t-d0");
  assert.equal(trialInsights[0].priority, "high");
  assert.match(trialInsights[0].title, /오늘 끝나요/);
  assert.match(trialInsights[0].message, /무료체험이 오늘 끝나요/);

  assert.equal(trialInsights[1].subscriptionId, "t-d1");
  assert.equal(trialInsights[1].priority, "high");
  assert.match(trialInsights[1].title, /1일 뒤 끝나요/);
  assert.match(trialInsights[1].message, /무료체험이 1일 뒤 끝나요/);

  assert.equal(trialInsights[2].subscriptionId, "t-d2");
  assert.equal(trialInsights[2].priority, "normal");
  assert.match(trialInsights[2].title, /2일 뒤 끝나요/);
});

test("Rule b (annual_renewal): 매년 결제 7일 이내 갱신 감지 및 D-2 이하 high 우선순위", () => {
  // NOW = 2026-10-18
  // dueDay 20 (D-2) -> high
  // dueDay 23 (D-5) -> normal
  // dueDay 27 (D-9) -> 제외
  const subs = [
    {
      subscriptionId: "a-d2",
      name: "젯브레인스 연간",
      amount: 250000,
      dueDay: 20,
      billingCycle: "매년",
      createdAt: "2025-10-20T00:00:00.000Z",
      status: "active",
    },
    {
      subscriptionId: "a-d5",
      name: "노션 연간",
      amount: 120000,
      dueDay: 23,
      billingCycle: "매년",
      createdAt: "2025-10-23T00:00:00.000Z",
      status: "active",
    },
    {
      subscriptionId: "a-d9",
      name: "슬랙 연간",
      amount: 150000,
      dueDay: 27,
      billingCycle: "매년",
      createdAt: "2025-10-27T00:00:00.000Z",
      status: "active",
    },
  ];

  const insights = generateAgentInsights(subs, { now: NOW });
  const annualInsights = insights.filter((i) => i.kind === "annual_renewal");

  assert.equal(annualInsights.length, 2);
  assert.equal(annualInsights[0].subscriptionId, "a-d2");
  assert.equal(annualInsights[0].priority, "high");
  assert.match(annualInsights[0].title, /2일 뒤 갱신돼요/);

  assert.equal(annualInsights[1].subscriptionId, "a-d5");
  assert.equal(annualInsights[1].priority, "normal");
  assert.match(annualInsights[1].title, /5일 뒤 갱신돼요/);
});

test("Rule c (unused_renewal): 결제 5일 이내 미사용/미확인 구독 감지 (항상 high)", () => {
  // NOW = 2026-10-18
  // dueDay 21 (D-3) -> 미사용 답변 존재
  // dueDay 22 (D-4) -> 답변 없음(미확인)
  // dueDay 23 (D-5) -> 잘 썼음(used) 답변 존재 -> 제외
  const subs = [
    {
      subscriptionId: "sub-unused",
      name: "ChatGPT",
      amount: 29000,
      dueDay: 21,
      billingCycle: "매월",
      status: "active",
    },
    {
      subscriptionId: "sub-unconfirmed",
      name: "밀리의 서재",
      amount: 9900,
      dueDay: 22,
      billingCycle: "매월",
      status: "active",
    },
    {
      subscriptionId: "sub-used",
      name: "유튜브 프리미엄",
      amount: 14900,
      dueDay: 23,
      billingCycle: "매월",
      status: "active",
    },
  ];

  const usageAnswers = {
    "sub-unused@2026-10-21": { answer: "unused", subscriptionId: "sub-unused" },
    "sub-used@2026-10-23": { answer: "used", subscriptionId: "sub-used" },
  };

  const insights = generateAgentInsights(subs, { now: NOW, usageAnswers });
  const unusedInsights = insights.filter((i) => i.kind === "unused_renewal");

  assert.equal(unusedInsights.length, 2);
  assert.equal(unusedInsights[0].subscriptionId, "sub-unused");
  assert.equal(unusedInsights[0].priority, "high");
  assert.match(unusedInsights[0].title, /거의 안 쓴/);

  assert.equal(unusedInsights[1].subscriptionId, "sub-unconfirmed");
  assert.equal(unusedInsights[1].priority, "high");
  assert.match(unusedInsights[1].title, /이번 달 잘 쓰셨나요/);
});

test("Rule d (duplicate_category): OTT 및 음악 카테고리 2개 이상 중복 시 정상 감지 (normal)", () => {
  const subs = [
    {
      subscriptionId: "ott-1",
      name: "넷플릭스",
      amount: 17000,
      category: "OTT",
      dueDay: 25,
      billingCycle: "매월",
      status: "active",
    },
    {
      subscriptionId: "ott-2",
      name: "디즈니+",
      amount: 9900,
      category: "OTT",
      dueDay: 28,
      billingCycle: "매월",
      status: "active",
    },
    {
      subscriptionId: "music-1",
      name: "스포티파이",
      amount: 10900,
      category: "음악",
      dueDay: 26,
      billingCycle: "매월",
      status: "active",
    },
    {
      subscriptionId: "music-2",
      name: "멜론",
      amount: 8900,
      category: "음악",
      dueDay: 27,
      billingCycle: "매월",
      status: "active",
    },
  ];

  const insights = generateAgentInsights(subs, { now: NOW, usageAnswers: { "ott-1@2026-10-25": { answer: "used" }, "ott-2@2026-10-28": { answer: "used" }, "music-1@2026-10-26": { answer: "used" }, "music-2@2026-10-27": { answer: "used" } } });
  const dupInsights = insights.filter((i) => i.kind === "duplicate_category");

  assert.equal(dupInsights.length, 2);
  const ottDup = dupInsights.find((i) => i.id.includes("ott"));
  assert.ok(ottDup);
  assert.equal(ottDup.priority, "normal");
  assert.match(ottDup.title, /OTT 구독이 2개 있어요/);
  assert.match(ottDup.message, /월 총 ₩26,900/);

  const musicDup = dupInsights.find((i) => i.id.includes("music"));
  assert.ok(musicDup);
  assert.equal(musicDup.priority, "normal");
  assert.match(musicDup.title, /음악 구독이 2개 있어요/);
  assert.match(musicDup.message, /월 총 ₩19,800/);
});

test("Rule e (price_changed): originalAmount 존재 및 인상/인하 감지", () => {
  const subs = [
    {
      subscriptionId: "price-up",
      name: "인상된 서비스",
      amount: 15000,
      originalAmount: 12000,
      dueDay: 25,
      billingCycle: "매월",
      status: "active",
    },
    {
      subscriptionId: "price-down",
      name: "인하된 서비스",
      amount: 8000,
      originalAmount: 10000,
      dueDay: 26,
      billingCycle: "매월",
      status: "active",
    },
    {
      subscriptionId: "price-same",
      name: "변동 없는 서비스",
      amount: 10000,
      originalAmount: 10000,
      dueDay: 27,
      billingCycle: "매월",
      status: "active",
    },
  ];

  const insights = generateAgentInsights(subs, { now: NOW, usageAnswers: { "price-up@2026-10-25": { answer: "used" }, "price-down@2026-10-26": { answer: "used" } } });
  const priceInsights = insights.filter((i) => i.kind === "price_changed");

  assert.equal(priceInsights.length, 2);
  assert.equal(priceInsights[0].subscriptionId, "price-up");
  assert.equal(priceInsights[0].priority, "high");
  assert.match(priceInsights[0].title, /요금이 올랐어요/);
  assert.match(priceInsights[0].message, /₩3,000 인상되었어요/);

  assert.equal(priceInsights[1].subscriptionId, "price-down");
  assert.equal(priceInsights[1].priority, "normal");
  assert.match(priceInsights[1].title, /요금이 내렸어요/);
  assert.match(priceInsights[1].message, /₩2,000 인하되었어요/);
});

test("정렬 검증: high 우선순위가 항상 normal보다 앞서고, 같은 우선순위 내에서는 빠른 결제일 순으로 정렬된다", () => {
  const subs = [
    // normal: 연간 갱신 5일 뒤 (D-5)
    {
      subscriptionId: "normal-early",
      name: "연간 D-5",
      amount: 100000,
      dueDay: 23,
      billingCycle: "매년",
      createdAt: "2025-10-23T00:00:00.000Z",
      status: "active",
    },
    // high: 무료체험 1일 뒤 (D-1)
    {
      subscriptionId: "high-late",
      name: "체험 D-1",
      amount: 15000,
      dueDay: 19,
      isTrial: true,
      status: "active",
    },
    // high: 무료체험 오늘 (D-0)
    {
      subscriptionId: "high-early",
      name: "체험 D-0",
      amount: 15000,
      dueDay: 18,
      isTrial: true,
      status: "active",
    },
  ];

  const insights = generateAgentInsights(subs, { now: NOW });
  assert.equal(insights[0].subscriptionId, "high-early");
  assert.equal(insights[0].priority, "high");
  assert.equal(insights[1].subscriptionId, "high-late");
  assert.equal(insights[1].priority, "high");
  assert.equal(insights[2].subscriptionId, "normal-early");
  assert.equal(insights[2].priority, "normal");
});

test("Dismiss / Snooze 영속성 및 3일 만료(expiry) 가지치기 검증", () => {
  mockStorage.clear();

  const id1 = "insight-1";
  const id2 = "insight-2";

  // 1. Dismiss 영구 숨김
  assert.equal(isInsightDismissed(id1), false);
  dismissInsightId(id1);
  assert.equal(isInsightDismissed(id1), true);

  // 2. Snooze 3일 숨김
  const t0 = new Date(2026, 9, 18, 12, 0, 0);
  assert.equal(isInsightSnoozed(id2, t0), false);
  snoozeInsightId(id2, t0);
  assert.equal(isInsightSnoozed(id2, t0), true);

  // 2일 후: 여전히 snoozed
  const t2 = new Date(2026, 9, 20, 12, 0, 0);
  assert.equal(isInsightSnoozed(id2, t2), true);

  // 3일 + 1초 후: 만료되어 해제됨
  const t3Plus = new Date(2026, 9, 21, 12, 0, 1);
  assert.equal(isInsightSnoozed(id2, t3Plus), false);

  // Expired snoozes pruned from storage
  const valid = readSnoozedInsights(t3Plus);
  assert.equal(Object.keys(valid).length, 0);
});

test("KST 날짜 경계 검증: 한국 자정 전후(23:59 vs 00:01) D-day 계산 일관성", () => {
  // 2026-10-18T23:59:00 KST = 2026-10-18T14:59:00Z
  const kstLateNight = new Date("2026-10-18T14:59:00.000Z");
  // 2026-10-19T00:01:00 KST = 2026-10-18T15:01:00Z
  const kstNextEarly = new Date("2026-10-18T15:01:00.000Z");

  const sub = {
    subscriptionId: "kst-test",
    name: "넷플릭스",
    amount: 17000,
    dueDay: 19,
    isTrial: true,
    status: "active",
  };

  const lateNightInsights = generateAgentInsights([sub], { now: kstLateNight });
  const nextEarlyInsights = generateAgentInsights([sub], { now: kstNextEarly });

  // 18일 밤에는 dueDay 19가 1일 뒤
  assert.equal(lateNightInsights.length, 1);
  assert.match(lateNightInsights[0].title, /1일 뒤 끝나요/);

  // 19일 새벽에는 dueDay 19가 오늘 끝남
  assert.equal(nextEarlyInsights.length, 1);
  assert.match(nextEarlyInsights[0].title, /오늘 끝나요/);
});

test("선제적 로컬 알림 스케줄링 검증: 하루 최대 1건, 고유 id 생성 및 중복 발송 방지", async () => {
  mockStorage.clear();

  // Capacitor native mock
  let scheduledList = [];
  globalThis.androidBridge = {};
  const { Capacitor } = await import("@capacitor/core");
  Capacitor.PluginHeaders = [
    {
      name: "LocalNotifications",
      methods: [
        { name: "checkPermissions", rtype: "promise" },
        { name: "schedule", rtype: "promise" },
      ],
    },
  ];
  Capacitor.isNativePlatform = () => true;
  Capacitor.nativePromise = async (pluginName, methodName, options) => {
    if (pluginName === "LocalNotifications") {
      if (methodName === "checkPermissions") return { display: "granted" };
      if (methodName === "schedule") {
        scheduledList.push(...(options?.notifications || []));
        return { notifications: scheduledList };
      }
    }
    return {};
  };

  const { scheduleAgentInsightNotification } = await import("../src/lib/notifications.js");

  const highInsight = {
    id: "trial_ending:sub-netflix:2026-10-19",
    kind: "trial_ending",
    title: "넷플릭스 무료체험이 1일 뒤 끝나요",
    message: "무료체험이 1일 뒤 끝나요. 이후 ₩17,000이 결제돼요.",
    priority: "high",
    subscriptionId: "sub-netflix",
  };

  const normalInsight = {
    id: "duplicate_category:ott:sub1-sub2",
    kind: "duplicate_category",
    title: "OTT 중복",
    message: "2개 이용 중",
    priority: "normal",
  };

  // normal 인사이트는 알림 스케줄링 제외
  const resNormal = await scheduleAgentInsightNotification(normalInsight, NOW);
  assert.equal(resNormal, false);
  assert.equal(scheduledList.length, 0);

  // high 인사이트 1회 스케줄링 성공
  const resHigh1 = await scheduleAgentInsightNotification(highInsight, NOW);
  assert.equal(resHigh1, true);
  assert.equal(scheduledList.length, 1);
  assert.equal(scheduledList[0].title, "꾸독");
  assert.equal(scheduledList[0].body, highInsight.message);
  // id range check: 200,000,000 ~ 299,999,999
  assert.ok(scheduledList[0].id >= 200000000 && scheduledList[0].id < 300000000);

  // 같은 날(KST) 재호출 시 발송되지 않음 (1일 최대 1회)
  const resHigh2 = await scheduleAgentInsightNotification(highInsight, NOW);
  assert.equal(resHigh2, false);
  assert.equal(scheduledList.length, 1);

  // 다른 insight라도 같은 날이면 스케줄링 차단
  const anotherHigh = {
    id: "unused_renewal:sub-tving:2026-10-20",
    kind: "unused_renewal",
    title: "티빙 결제일",
    message: "티빙 결제 예정",
    priority: "high",
  };
  const resHigh3 = await scheduleAgentInsightNotification(anotherHigh, NOW);
  assert.equal(resHigh3, false);
  assert.equal(scheduledList.length, 1);
});
