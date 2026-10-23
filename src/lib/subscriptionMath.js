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

/**
 * 해지 기록 또는 구독 객체의 월 환산 절약 금액(KRW)을 계산한다.
 * 기존 레코드(billingCycle 없음)는 월간으로 간주하며, billingCycle이 '매년'인 경우 12로 나눠 반올림한다.
 */
export function toMonthlySavedAmount(record) {
  if (!record) return 0;
  const rawAmt = Number(record.amount ?? record.grossAmount ?? 0);
  if (!Number.isFinite(rawAmt)) return 0;
  if (record.billingCycle === "매년") {
    return Math.round(rawAmt / 12);
  }
  return rawAmt;
}
