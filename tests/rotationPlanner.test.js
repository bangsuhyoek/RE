import test from "node:test";
import assert from "node:assert/strict";
import {
  getRotationCandidates,
  buildRotationPlan,
  buildRotationReminders,
} from "../src/lib/rotationPlanner.js";

test("후보 필터: 같은 카테고리의 활성 월간 구독만 포함하고 연간 및 해지 구독은 제외한다", () => {
  const subscriptions = [
    { subscriptionId: "sub-1", name: "넷플릭스", category: "OTT", billingCycle: "매월", status: "active", amount: 17000 },
    { subscriptionId: "sub-2", name: "디즈니+", category: "OTT", billingCycle: "매월", status: "active", amount: 9900 },
    { subscriptionId: "sub-3", name: "티빙 연간권", category: "OTT", billingCycle: "매년", status: "active", amount: 100000 },
    { subscriptionId: "sub-4", name: "웨이브 해지됨", category: "OTT", billingCycle: "매월", status: "cancelled", amount: 7900 },
    { subscriptionId: "sub-5", name: "스포티파이", category: "음악", billingCycle: "매월", status: "active", amount: 10900 },
  ];

  const candidates = getRotationCandidates(subscriptions, "OTT");
  assert.equal(candidates.length, 2);
  assert.deepEqual(
    candidates.map((s) => s.subscriptionId),
    ["sub-1", "sub-2"]
  );
});

test("2개 미만 거부: 순환 후보가 2개 미만이면 { ok: false, reason: 'NEED_TWO' }를 반환한다", () => {
  const single = [{ subscriptionId: "sub-1", name: "넷플릭스", amount: 17000, dueDay: 10, billingCycle: "매월" }];
  const empty = [];

  const resSingle = buildRotationPlan({ subscriptions: single });
  assert.equal(resSingle.ok, false);
  assert.equal(resSingle.reason, "NEED_TWO");

  const resEmpty = buildRotationPlan({ subscriptions: empty });
  assert.equal(resEmpty.ok, false);
  assert.equal(resEmpty.reason, "NEED_TWO");
});

test("order 반영: 지정한 순서대로 월별 활성 구독이 배정되고 없으면 금액 오름차순으로 정렬된다", () => {
  const subs = [
    { subscriptionId: "sub-netflix", name: "넷플릭스", amount: 17000, dueDay: 15, billingCycle: "매월" },
    { subscriptionId: "sub-disney", name: "디즈니+", amount: 9900, dueDay: 20, billingCycle: "매월" },
    { subscriptionId: "sub-tving", name: "티빙", amount: 13500, dueDay: 5, billingCycle: "매월" },
  ];

  // order 지정 시
  const planOrdered = buildRotationPlan({
    subscriptions: subs,
    order: ["sub-disney", "sub-netflix", "sub-tving"],
    months: 4,
    start: new Date(2026, 9, 4), // 2026-10-04
  });

  assert.equal(planOrdered.ok, true);
  assert.equal(planOrdered.months[0].active.subscriptionId, "sub-disney");
  assert.equal(planOrdered.months[1].active.subscriptionId, "sub-netflix");
  assert.equal(planOrdered.months[2].active.subscriptionId, "sub-tving");
  assert.equal(planOrdered.months[3].active.subscriptionId, "sub-disney");

  // order 미지정 시: 금액 오름차순 (디즈니 9900 -> 티빙 13500 -> 넷플릭스 17000)
  const planDefault = buildRotationPlan({
    subscriptions: subs,
    months: 3,
    start: new Date(2026, 9, 4),
  });

  assert.equal(planDefault.months[0].active.subscriptionId, "sub-disney");
  assert.equal(planDefault.months[1].active.subscriptionId, "sub-tving");
  assert.equal(planDefault.months[2].active.subscriptionId, "sub-netflix");
});

test("절약액 계산: 현재 총합, 순환 평균, 월 절약액 및 연간 절약액이 올바르게 계산된다", () => {
  const subs = [
    { subscriptionId: "sub-1", name: "넷플릭스", amount: 17000, dueDay: 10, billingCycle: "매월" },
    { subscriptionId: "sub-2", name: "디즈니+", amount: 9900, dueDay: 15, billingCycle: "매월" },
    { subscriptionId: "sub-3", name: "왓챠", amount: 12900, dueDay: 20, billingCycle: "매월" },
  ];

  const plan = buildRotationPlan({
    subscriptions: subs,
    months: 6,
    start: new Date(2026, 9, 4),
  });

  assert.equal(plan.ok, true);
  // 합계: 17000 + 9900 + 12900 = 39800
  assert.equal(plan.currentMonthly, 39800);
  // 평균: 39800 / 3 = 13266.666... -> 반올림 13267
  assert.equal(plan.plannedMonthly, 13267);
  // 월 절약액: 39800 - 13267 = 26533
  assert.equal(plan.monthlySaving, 26533);
  // 연간 절약액: 26533 * 12 = 318396
  assert.equal(plan.yearlySaving, 318396);
});

test("31일 결제의 2월 cancelBy 보정: 말일(31일) 결제 구독은 2월에 28일(윤년이면 29일) 하루 전으로 보정된다", () => {
  // 2026년은 평년(2월 28일까지)
  const subs = [
    { subscriptionId: "sub-1", name: "넷플릭스", amount: 17000, dueDay: 15, billingCycle: "매월" },
    { subscriptionId: "sub-2", name: "디즈니+", amount: 9900, dueDay: 31, billingCycle: "매월" },
  ];

  // start = 2027년 1월 (month 0). month[1]은 2027년 2월 (month 1).
  const plan = buildRotationPlan({
    subscriptions: subs,
    order: ["sub-1", "sub-2"],
    months: 3,
    start: new Date(2027, 0, 1),
  });

  // 첫 달(2027년 1월): sub-1 유지, sub-2(31일 결제)는 1월 30일까지 해지(31일 하루 전)
  const janCancel = plan.months[0].cancel.find((c) => c.subscriptionId === "sub-2");
  assert.ok(janCancel);
  assert.equal(janCancel.cancelBy.getFullYear(), 2027);
  assert.equal(janCancel.cancelBy.getMonth(), 0); // 1월
  assert.equal(janCancel.cancelBy.getDate(), 30); // 31일의 하루 전

  // 둘째 달(2027년 2월): sub-2 유지, sub-1(15일 결제) 해지
  assert.equal(plan.months[1].active.subscriptionId, "sub-2");

  // 셋째 달(2027년 3월): sub-1 유지, 이전 달 활성이었던 sub-2(31일 결제) 해지
  // 3월에 sub-2의 3월 결제일은 3월 31일.
  // 2월 결제일을 테스트하기 위해 start를 2027년 2월로 잡고 1번째 달의 cancel 대상 확인
  const planFeb = buildRotationPlan({
    subscriptions: subs,
    order: ["sub-1", "sub-2"], // 1번째 달은 sub-1 유지, sub-2 해지
    months: 2,
    start: new Date(2027, 1, 1), // 2027년 2월
  });

  const febCancel = planFeb.months[0].cancel.find((c) => c.subscriptionId === "sub-2");
  assert.ok(febCancel);
  // 2027년 2월의 말일은 28일. dueDay 31은 dateForDueDay에 의해 2월 28일로 보정됨.
  // cancelBy는 하루 전이므로 2월 27일이어야 한다.
  assert.equal(febCancel.cancelBy.getFullYear(), 2027);
  assert.equal(febCancel.cancelBy.getMonth(), 1); // 2월
  assert.equal(febCancel.cancelBy.getDate(), 27);
});

test("알림 시각 9시와 과거 제외: 모든 알림은 오전 9시에 맞춰지고 now 이전 시각은 제외된다", () => {
  const subs = [
    { subscriptionId: "sub-1", name: "넷플릭스", amount: 17000, dueDay: 10, billingCycle: "매월" },
    { subscriptionId: "sub-2", name: "디즈니+", amount: 9900, dueDay: 20, billingCycle: "매월" },
  ];

  const plan = buildRotationPlan({
    subscriptions: subs,
    order: ["sub-1", "sub-2"],
    months: 2,
    start: new Date(2026, 9, 1), // 2026년 10월 1일
  });

  // 기준 시각: 2026년 10월 25일 (첫 달 cancelBy인 10월 19일은 이미 지남)
  const now = new Date(2026, 9, 25, 12, 0, 0);
  const reminders = buildRotationReminders(plan, now);

  // 모든 알림의 시각은 오전 9시여야 함
  for (const reminder of reminders) {
    assert.equal(reminder.at.getHours(), 9);
    assert.equal(reminder.at.getMinutes(), 0);
    assert.equal(reminder.at.getSeconds(), 0);
    assert.ok(reminder.at > now, "과거 시각 알림은 제외되어야 한다");
  }

  // 첫 달 cancelBy(10월 19일 09:00)는 10월 25일보다 과거이므로 제외되었는지 확인
  const pastReminder = reminders.find((r) => r.subscriptionId === "sub-2" && r.type === "rotation_cancel");
  assert.equal(pastReminder, undefined);

  // 둘째 달(11월) 알림은 미래이므로 포함되어 있어야 함
  assert.ok(reminders.length > 0);
});
