import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateMonthlyProgress,
  getChargeDateInCurrentMonth,
  selectCarouselPromotions,
  DEFAULT_CAROUSEL_PROMO_IDS,
} from "../src/lib/monthlyProgress.js";
import { promotionCatalog } from "../src/data/subscriptionData.js";

test("월간 구독: 기준일 이전/당일은 결제 완료, 기준일 이후는 남은 예정으로 집계한다", () => {
  const reference = new Date(2026, 9, 15); // 2026-10-15
  const subscriptions = [
    { subscriptionId: "s1", name: "Netflix", amount: 17000, dueDay: 5, billingCycle: "매월", status: "active" },
    { subscriptionId: "s2", name: "Spotify", amount: 10900, dueDay: 15, billingCycle: "매월", status: "active" },
    { subscriptionId: "s3", name: "ChatGPT", amount: 29000, dueDay: 25, billingCycle: "매월", status: "active" },
    { subscriptionId: "s4", name: "Cancelled", amount: 9900, dueDay: 10, billingCycle: "매월", status: "cancelled" },
  ];

  const progress = calculateMonthlyProgress(subscriptions, reference);
  assert.equal(progress.completedAmount, 17000 + 10900);
  assert.equal(progress.remainingAmount, 29000);
  assert.equal(progress.totalAmount, 56900);
  assert.equal(progress.completedCount, 2);
  assert.equal(progress.remainingCount, 1);
  assert.equal(progress.progressPercent, Math.round((27900 / 56900) * 100));
});

test("연간 구독: 이번 달이 결제월인 경우에만 포함하고 다른 달이면 제외한다", () => {
  const reference = new Date(2026, 9, 10); // 2026년 10월 10일
  const subscriptions = [
    {
      subscriptionId: "annual-oct-past",
      name: "Disney+ 연간",
      amount: 99000,
      billingCycle: "매년",
      nextBillingDate: "2026-10-05",
      dueDay: 5,
      status: "active",
    },
    {
      subscriptionId: "annual-oct-upcoming",
      name: "Wavve 연간",
      amount: 109000,
      billingCycle: "매년",
      nextBillingDate: "2026-10-20",
      dueDay: 20,
      status: "active",
    },
    {
      subscriptionId: "annual-nov",
      name: "JetBrains 연간",
      amount: 370000,
      billingCycle: "매년",
      nextBillingDate: "2026-11-15",
      dueDay: 15,
      status: "active",
    },
  ];

  const progress = calculateMonthlyProgress(subscriptions, reference);
  assert.equal(progress.completedAmount, 99000);
  assert.equal(progress.remainingAmount, 109000);
  assert.equal(progress.totalAmount, 208000);
  assert.equal(progress.items.length, 2);
});

test("30일까지 있는 달에 결제일이 31일인 구독은 30일로 말일 보정되어 계산된다", () => {
  const sep20 = new Date(2026, 8, 20); // 2026-09-20 (9월은 30일까지)
  const sep30 = new Date(2026, 8, 30); // 2026-09-30
  const sub31 = {
    subscriptionId: "s-31",
    name: "Adobe",
    amount: 26400,
    dueDay: 31,
    billingCycle: "매월",
    status: "active",
  };

  const chargeDate = getChargeDateInCurrentMonth(sub31, sep20);
  assert.ok(chargeDate);
  assert.equal(chargeDate.getMonth(), 8);
  assert.equal(chargeDate.getDate(), 30);

  const before30 = calculateMonthlyProgress([sub31], sep20);
  assert.equal(before30.completedAmount, 0);
  assert.equal(before30.remainingAmount, 26400);

  const on30 = calculateMonthlyProgress([sub31], sep30);
  assert.equal(on30.completedAmount, 26400);
  assert.equal(on30.remainingAmount, 0);
  assert.equal(on30.progressPercent, 100);
});

test("무료체험 구독은 유료 전환일이 이번 달인 경우에만 포함하고 다음 달이면 제외한다", () => {
  const reference = new Date(2026, 9, 10); // 2026-10-10
  const subscriptions = [
    {
      subscriptionId: "trial-this-month",
      name: "YouTube 체험",
      amount: 14900,
      isTrial: true,
      status: "trial",
      nextBillingDate: "2026-10-18",
      dueDay: 18,
      billingCycle: "매월",
    },
    {
      subscriptionId: "trial-next-month",
      name: "Apple TV+ 체험",
      amount: 6500,
      isTrial: true,
      status: "trial",
      nextBillingDate: "2026-11-02",
      dueDay: 2,
      billingCycle: "매월",
    },
  ];

  const progress = calculateMonthlyProgress(subscriptions, reference);
  assert.equal(progress.completedAmount, 0);
  assert.equal(progress.remainingAmount, 14900);
  assert.equal(progress.items.length, 1);
  assert.equal(progress.items[0].subscriptionId, "trial-this-month");
});

test("selectCarouselPromotions: 만료 혜택을 제외하고 최대 5개 이내로 미구독/대체 번들을 우선 추천한다", () => {
  const now = Date.parse("2026-10-29T00:00:00+09:00");
  const userSubscriptions = [
    { id: "netflix", name: "Netflix", status: "active" },
  ];
  const withExpired = [
    { id: "expired-1", title: "만료 혜택", verifiedStatus: "EXPIRED", sourceServiceIds: ["netflix"] },
    ...promotionCatalog,
  ];

  const selected = selectCarouselPromotions(withExpired, userSubscriptions, { maxCount: 5, now });
  assert.ok(selected.length > 0 && selected.length <= 5);
  assert.ok(selected.every((p) => p.id !== "expired-1"));
  // 넷플릭스 구독 중이므로 네이버플러스 X 넷플릭스 결합 혜택이 최상위권에 포함됨
  assert.equal(selected[0].id, "naverplus-netflix");

  // 기본 폴백 확인
  const fallbackOnly = promotionCatalog.filter((p) => DEFAULT_CAROUSEL_PROMO_IDS.includes(p.id));
  const selectedFallback = selectCarouselPromotions(fallbackOnly, [], { maxCount: 5, now });
  assert.equal(selectedFallback.length, 3);
});
+
test("월간 구독: 결제 후 nextBillingDate가 다음 주기로 넘어가도 이번 달 결제는 완료로 집계한다", () => {
  const reference = new Date(2026, 9, 29); // 2026-10-29
  const rolledForward = {
    subscriptionId: "monthly-rolled",
    name: "Netflix",
    amount: 17000,
    dueDay: 5,
    billingCycle: "매월",
    nextBillingDate: "2026-11-05",
    status: "active",
  };

  assert.equal(
    getChargeDateInCurrentMonth(rolledForward, reference)?.getMonth(),
    9,
    "한 주기(1개월) 앞이면 이번 달 결제일을 반환한다"
  );

  const progress = calculateMonthlyProgress([rolledForward], reference);
  assert.equal(progress.completedAmount, 17000, "이번 달 결제는 완료 금액으로 잡힌다");
  assert.equal(progress.remainingAmount, 0);
  assert.equal(progress.items.length, 1);
  assert.equal(progress.progressPercent, 100);

  // 두 주기 이상 앞이면 이번 달 결제가 없으므로 제외한다
  const twoCyclesAhead = { ...rolledForward, nextBillingDate: "2026-12-05" };
  assert.equal(getChargeDateInCurrentMonth(twoCyclesAhead, reference), null);
  const skipped = calculateMonthlyProgress([twoCyclesAhead], reference);
  assert.equal(skipped.completedAmount, 0);
  assert.equal(skipped.remainingAmount, 0);
});

test("연간 구독: 결제 후 nextBillingDate가 1년 앞으로 넘어가도 이번 달 결제는 완료로 집계한다", () => {
  const reference = new Date(2026, 9, 29); // 2026-10-29
  const rolledForward = {
    subscriptionId: "yearly-rolled",
    name: "Disney+ 연간",
    amount: 99000,
    dueDay: 5,
    billingCycle: "매년",
    nextBillingDate: "2027-10-05",
    status: "active",
  };

  assert.equal(
    getChargeDateInCurrentMonth(rolledForward, reference)?.getMonth(),
    9,
    "정확히 1년 앞이면 이번 달 결제일을 반환한다"
  );

  const progress = calculateMonthlyProgress([rolledForward], reference);
  assert.equal(progress.completedAmount, 99000);
  assert.equal(progress.remainingAmount, 0);

  // 1년을 넘어서면 이번 달 결제가 없다
  const moreThanAYear = { ...rolledForward, nextBillingDate: "2028-01-05" };
  assert.equal(getChargeDateInCurrentMonth(moreThanAYear, reference), null);
  assert.equal(calculateMonthlyProgress([moreThanAYear], reference).items.length, 0);
});

test("이번 달 결제일 이후에 등록한 구독은 이번 달 결제로 집계하지 않는다", () => {
  const reference = new Date(2026, 9, 29); // 2026-10-29
  const afterCharge = {
    subscriptionId: "created-after-charge",
    name: "Spotify",
    amount: 10900,
    dueDay: 5,
    billingCycle: "매월",
    createdAt: "2026-10-20",
    status: "active",
  };
  const beforeCharge = {
    ...afterCharge,
    subscriptionId: "created-before-charge",
    createdAt: "2026-09-20",
  };

  assert.equal(getChargeDateInCurrentMonth(afterCharge, reference), null);
  const progress = calculateMonthlyProgress([afterCharge], reference);
  assert.equal(progress.completedAmount, 0);
  assert.equal(progress.remainingAmount, 0);
  assert.equal(progress.items.length, 0);

  // 결제일 이전에 등록한 구독은 정상적으로 집계한다
  assert.equal(calculateMonthlyProgress([beforeCharge], reference).completedAmount, 10900);
});

