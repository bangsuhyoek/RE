import { formatWon, toLocalDateKey } from "../dates.js";
import { toMonthlyAmount } from "../subscriptionMath.js";
import { findCheaperPlan, unusedStreak, isUsageThrottled, hasUsageAnswerForCycle } from "../usageCheck.js";
import {
  MONTHLY_REPORT_NOTIFICATION_ID,
  MONTHLY_REPORT_TYPE,
  USAGE_CHECK_ACTION_TYPE_ID,
  scheduledAt,
} from "./core.js";

/** 매달 1일 09시 요약 시각. 1일 09시 전이면 아직 오지 않은 오늘 09시 알림을 유지한다. */
export function getMonthlyReportScheduleAt(now = new Date()) {
  const todayAtNine = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);
  if (now.getDate() === 1 && now < todayAtNine) return todayAtNine;
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0, 0);
}

/** 요약 예정일의 바로 전 달에 이미 구독 중이던 유료 서비스의 월 환산 예상 결제액. */
export function getPreviousMonthPaidTotal(subscriptions = [], now = new Date()) {
  const scheduledFor = getMonthlyReportScheduleAt(now);
  const reportMonthEnd = new Date(scheduledFor.getFullYear(), scheduledFor.getMonth(), 1);
  return (Array.isArray(subscriptions) ? subscriptions : []).reduce((total, subscription) => {
    if (!subscription || subscription.status === "cancelled") return total;
    if (subscription.isTrial || subscription.status === "trial") return total;
    const createdAt = subscription.createdAt ? new Date(subscription.createdAt) : null;
    if (createdAt && !Number.isNaN(createdAt.getTime()) && createdAt >= reportMonthEnd) {
      return total;
    }
    return total + toMonthlyAmount(subscription);
  }, 0);
}

/** 매달 1일 09시에 지난달 예상 결제액과 누적 절약액을 알리는 고정 ID 알림. */
export function buildMonthlyReportNotification(subscriptions = [], savedAmount = 0, now = new Date()) {
  const paidTotal = getPreviousMonthPaidTotal(subscriptions, now);
  const safeSavedAmount = Number.isFinite(Number(savedAmount)) ? Math.max(0, Number(savedAmount)) : 0;
  const scheduledFor = getMonthlyReportScheduleAt(now);
  return {
    id: MONTHLY_REPORT_NOTIFICATION_ID,
    title: "꾸독 월간 요약",
    body: `지난달 예상 결제액은 ${formatWon(paidTotal)}, 지금까지 아낀 금액은 ${formatWon(safeSavedAmount)}이에요.`,
    channelId: "submate-billing-channel",
    ...scheduledAt(scheduledFor),
    extra: { type: MONTHLY_REPORT_TYPE },
  };
}

/**
 * 결제 3일 전(D-3) 알림 내용 생성:
 * 1. 2회 이상 연속 미사용(unusedStreak >= 2) -> 해지 권유 알림 (눌러서 해지 상세로 이동)
 * 2. 최근 2회 연속 '잘 썼어요'(isUsageThrottled) -> 기존 안내형 D-3 알림
 * 3. 이번 주기 답변 이미 존재 -> 기존 안내형 D-3 알림
 * 4. 연간/비월간 구독 또는 2회차(cycle > 1) 또는 무료체험 -> 기존 안내형 알림
 * 5. 그 외 -> 사용 여부를 묻는 액션 버튼 알림
 */
export function buildD3NotificationContent({
  subscription,
  chargeDate,
  cycleIndex = 0,
  answers = {},
  catalog = [],
}) {
  const name = subscription.name || "구독";
  const isTrial = Boolean(subscription.isTrial || subscription.status === "trial");
  const isMonthly = (subscription.billingCycle || "매월") !== "매년";
  const subKey = subscription.subscriptionId || subscription.id;
  const cycleNumber = cycleIndex + 1;
  const cycleDateKey = chargeDate ? toLocalDateKey(chargeDate) : toLocalDateKey(new Date());

  // 기존 안내형 D-3 폴백
  const informational = {
    title: `[결제 D-3] ${name} 결제 예정`,
    body: `3일 뒤 ${name} ${formatWon(subscription.amount)}이 결제될 예정입니다.`,
    extra: { subscriptionId: subKey, cycle: cycleNumber, type: "billing_d3", cycleKey: cycleDateKey },
    actionTypeId: undefined,
  };

  // 월간 정기 구독의 1회차 주기(cycle 1)에만 질문/권유 로직 적용
  if (cycleIndex !== 0 || isTrial || !isMonthly) {
    return informational;
  }

  const streak = unusedStreak(answers, subscription, cycleDateKey);
  if (streak >= 2) {
    const monthlyAmount = toMonthlyAmount(subscription);
    const cheaper = findCheaperPlan(subscription, catalog);
    const title = `${name} ${streak}달째 거의 안 쓰셨어요`;
    let body = `그동안 ${formatWon(streak * monthlyAmount)} 나갔어요. 3일 뒤 또 결제돼요. 눌러서 해지를 확인하세요.`;
    if (cheaper) {
      body += ` 더 싼 ${cheaper.name}(${formatWon(cheaper.amount)})도 있어요.`;
    }
    return {
      title,
      body,
      extra: { subscriptionId: subKey, cycle: cycleNumber, type: "usage_cancel_suggest", cycleKey: cycleDateKey },
      actionTypeId: undefined,
    };
  }

  if (isUsageThrottled(answers, subscription) || hasUsageAnswerForCycle(answers, subscription, chargeDate)) {
    return informational;
  }

  return {
    title: `${name}, 3일 뒤 ${formatWon(subscription.amount)}`,
    body: `이번 달 ${name} 잘 쓰셨어요? 알림을 내려서 바로 답해 주세요.`,
    extra: { subscriptionId: subKey, cycle: cycleNumber, type: "usage_check", cycleKey: cycleDateKey },
    actionTypeId: USAGE_CHECK_ACTION_TYPE_ID,
  };
}

/**
 * Creates a single test notification for a given subscription
 */
export function createTestNotification(subscription, forcedType = "auto") {
  const isTrial = Boolean(subscription.isTrial || subscription.status === "trial");
  const type = forcedType === "auto" ? (isTrial ? "trial_d1" : "billing_d3") : forcedType;

  let badge = "D-3";
  let title = `[결제 D-3] ${subscription.name} 결제 예정`;
  let message = `3일 뒤 ${subscription.name} ${formatWon(subscription.amount)}이 결제될 예정입니다.`;
  let daysUntil = 3;

  if (type === "trial_d1") {
    badge = "TRIAL D-1";
    title = `[체험 만료 D-1] ${subscription.name} 무료체험 종료`;
    message = `내일 ${subscription.name} 무료체험이 종료되고 ${formatWon(subscription.amount)}이 결제됩니다.`;
    daysUntil = 1;
  } else if (type === "billing_d1") {
    badge = "D-1";
    title = `[결제 D-1] ${subscription.name} 결제 예정`;
    message = `내일 ${subscription.name} ${formatWon(subscription.amount)}이 결제될 예정입니다.`;
    daysUntil = 1;
  }

  return {
    id: `test-alert-${subscription.subscriptionId || subscription.id}-${Date.now()}`,
    subscriptionId: subscription.subscriptionId || subscription.id,
    serviceName: subscription.name,
    amount: subscription.amount,
    plan: subscription.plan,
    monogram: subscription.monogram || subscription.name?.slice(0, 1) || "S",
    category: subscription.category || "기타",
    type,
    badge,
    title,
    message,
    timestamp: new Date().toISOString(),
    daysUntil,
    read: false,
    isTest: true,
  };
}
