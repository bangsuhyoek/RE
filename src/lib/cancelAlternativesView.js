import { getCancelAlternatives } from "../data/cancelAlternatives.js";
import { getRotationCandidates } from "./rotationPlanner.js";
import { toMonthlyAmount } from "./subscriptionMath.js";

/**
 * 구독 객체로부터 월 환산 금액(KRW)을 계산한다.
 * billingCycle이 '매년'인 경우 12로 나눈 반올림 금액을 사용한다.
 */
export function getSubscriptionMonthlyAmount(subscription) {
  return toMonthlyAmount(subscription);
}

/**
 * 해지 전 대안 옵션 목록을 반환한다.
 * - 월 환산 절약액(monthlySavings) = current monthly - alt monthlyPrice (null if monthlyPrice is null/undefined)
 * - isCheaper: alt.monthlyPrice !== null && alt.monthlyPrice < currentMonthly
 * - 현재 월 요금보다 저렴한 옵션만 포함하되, 'pause'와 'family' 유형은 금액과 무관하게(또는 null이더라도) 항상 포함
 * - 절약액(monthlySavings) 내림차순 정렬 (절약액이 큰 순서, null은 뒤로)
 */
export function getAlternativeOptions({ subscription, serviceId } = {}) {
  const targetId = serviceId || subscription?.serviceId || subscription?.id;
  if (!targetId) return [];

  const rawList = getCancelAlternatives(targetId);
  if (!Array.isArray(rawList) || rawList.length === 0) return [];

  const currentMonthly = getSubscriptionMonthlyAmount(subscription);

  const results = [];

  for (const alt of rawList) {
    const hasPrice = typeof alt.monthlyPrice === "number" && !isNaN(alt.monthlyPrice);
    const monthlySavings = hasPrice ? currentMonthly - alt.monthlyPrice : null;
    const isCheaper = hasPrice && alt.monthlyPrice < currentMonthly;

    // pause와 family는 항상 포함. 그 외는 현재 월 요금보다 더 저렴한 경우만 포함
    const isAlwaysIncluded = alt.type === "pause" || alt.type === "family";
    if (isAlwaysIncluded || isCheaper) {
      results.push({
        ...alt,
        monthlySavings,
        isCheaper,
      });
    }
  }

  // 절약액 기준 내림차순 정렬. 절약액이 있는 항목 우선, 그 다음 절약액이 큰 순서
  results.sort((a, b) => {
    if (a.monthlySavings === null && b.monthlySavings === null) return 0;
    if (a.monthlySavings === null) return 1;
    if (b.monthlySavings === null) return -1;
    return b.monthlySavings - a.monthlySavings;
  });

  return results;
}

/**
 * 해당 구독이 구독 순환(rotation) 계획에 참여할 수 있는지 여부를 판정한다.
 * - 같은 카테고리의 활성 월간 구독(후보)이 2개 이상이면 eligible: true
 * - 이미 활성화된 rotationPlan이 있다면 해당 플랜의 카테고리 일치 여부 및 포함 여부 확인 가능
 */
export function canJoinRotation({ subscription, subscriptions = [], rotationPlan = null } = {}) {
  if (!subscription) {
    return { eligible: false, reason: "NO_SUBSCRIPTION" };
  }

  // 연간 구독이거나 이미 취소된 구독은 월별 순환에 참여 불가
  if (subscription.billingCycle !== "매월" || subscription.status === "cancelled") {
    return { eligible: false, reason: "NOT_MONTHLY_OR_CANCELLED" };
  }

  const subId = subscription.subscriptionId || subscription.id;
  const category = subscription.category;

  if (!category) {
    return { eligible: false, reason: "NO_CATEGORY" };
  }

  // 전체 구독 목록에서 같은 카테고리의 월간 활성 구독 후보 목록
  const candidates = getRotationCandidates(subscriptions, category);

  // 대상 구독이 candidates 목록에 아직 없다면(예: 새로 확인 중이거나 목록에 미포함된 경우) 추가하여 계산
  const candidateIds = new Set(candidates.map((s) => s.subscriptionId || s.id));
  const effectiveCandidates = candidateIds.has(subId)
    ? candidates
    : [...candidates, subscription];

  if (effectiveCandidates.length < 2) {
    return { eligible: false, reason: "NEED_TWO_IN_CATEGORY" };
  }

  // 기존 rotationPlan이 있는 경우
  if (rotationPlan && rotationPlan.category) {
    if (rotationPlan.category === category) {
      const alreadyIn = Array.isArray(rotationPlan.order) && rotationPlan.order.includes(subId);
      return {
        eligible: true,
        alreadyInPlan: alreadyIn,
        reason: alreadyIn ? "ALREADY_IN_PLAN" : "CAN_ADD_TO_EXISTING_PLAN",
      };
    }
    // 다른 카테고리에 이미 계획이 있는 경우
    return {
      eligible: true,
      reason: "CAN_START_NEW_CATEGORY_PLAN",
    };
  }

  return {
    eligible: true,
    reason: "ELIGIBLE_CANDIDATE",
  };
}
