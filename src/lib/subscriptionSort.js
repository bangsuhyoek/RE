/**
 * 구독 목록 화면의 정렬 규칙. 화면과 테스트가 같은 비교 함수를 쓴다.
 */

import { daysUntilCharge } from "./dates.js";
import { toMonthlyAmount } from "./subscriptionMath.js";

export const SUBSCRIPTION_SORTS = {
  DUE: "due",
  AMOUNT: "amount",
  RECENT: "recent",
};

/**
 * - due: 결제일이 가까운 순
 * - amount: 월 환산 금액이 높은 순 (연간 구독도 공정하게 비교)
 * - recent: 최근 등록순
 */
export function compareSubscriptions(a, b, sort) {
  if (sort === SUBSCRIPTION_SORTS.AMOUNT) return toMonthlyAmount(b) - toMonthlyAmount(a);
  if (sort === SUBSCRIPTION_SORTS.RECENT) return new Date(b.createdAt) - new Date(a.createdAt);
  return daysUntilCharge(a) - daysUntilCharge(b);
}

export function sortSubscriptions(subscriptions = [], sort = SUBSCRIPTION_SORTS.DUE) {
  return [...subscriptions].sort((a, b) => compareSubscriptions(a, b, sort));
}
