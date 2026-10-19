// 구독 금액의 월/연간 환산 공통 모듈

/**
 * 단일 구독 객체의 월 환산 금액(KRW)을 계산한다.
 * billingCycle이 '매년'인 경우 12로 나눈 반올림 금액을 반환한다.
 */
export function toMonthlyAmount(subscription) {
  if (!subscription) return 0;
  const rawAmt = Number(subscription.amount || 0);
  if (!Number.isFinite(rawAmt)) return 0;
  if (subscription.billingCycle === "매년") {
    return Math.round(rawAmt / 12);
  }
  return rawAmt;
}

/**
 * 단일 구독 객체의 연 환산 금액(KRW)을 계산한다.
 * billingCycle이 '매년'인 경우 원래 금액, 그 외는 12를 곱한 금액을 반환한다.
 */
export function toAnnualAmount(subscription) {
  if (!subscription) return 0;
  const rawAmt = Number(subscription.amount || 0);
  if (!Number.isFinite(rawAmt)) return 0;
  if (subscription.billingCycle === "매년") {
    return rawAmt;
  }
  return rawAmt * 12;
}

/**
 * 활성 구독 목록의 총 월간 지출을 계산한다 (cancelled 제외).
 */
export function calculateMonthlyTotal(subscriptions = []) {
  return subscriptions
    .filter((sub) => sub && sub.status !== "cancelled")
    .reduce((sum, sub) => sum + toMonthlyAmount(sub), 0);
}

/**
 * 활성 구독 목록의 총 연간 지출을 계산한다 (cancelled 제외).
 */
export function calculateYearlyTotal(subscriptions = []) {
  return subscriptions
    .filter((sub) => sub && sub.status !== "cancelled")
    .reduce((sum, sub) => sum + toAnnualAmount(sub), 0);
}
