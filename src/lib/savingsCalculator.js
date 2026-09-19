import { BenefitEligibility, getTargetSubscriptions } from "./benefitMatcher.js";

export const SavingPeriod = Object.freeze({
  MONTHLY_RECURRING: "MONTHLY_RECURRING",
  ONE_TIME: "ONE_TIME",
  CAMPAIGN_TOTAL: "CAMPAIGN_TOTAL",
  ANNUAL: "ANNUAL",
});

function normalize(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "");
}

function monthlyAmount(subscription = {}) {
  const amount = Number(subscription.amount) || 0;
  const cycle = String(subscription.billingCycle || "").toLowerCase();
  if (cycle.includes("년") || cycle.includes("annual") || cycle.includes("year")) {
    return amount / 12;
  }
  return amount;
}

function ownsMembership(subscriptions, requiredMembership) {
  const required = normalize(requiredMembership);
  if (!required) return true;
  return subscriptions.some((subscription) =>
    [subscription.id, subscription.serviceId, subscription.service_id, subscription.name]
      .map(normalize)
      .includes(required)
  );
}
function capped(value, cap) {
  const numeric = Math.max(0, Number(value) || 0);
  const numericCap = Number(cap);
  return Number.isFinite(numericCap) && numericCap >= 0
    ? Math.min(numeric, numericCap)
    : numeric;
}

function periodBaseline(monthlyBaseline, period) {
  return period === SavingPeriod.ANNUAL
    ? monthlyBaseline * 12
    : monthlyBaseline;
}

export function calculateBenefitSavings(
  subscriptions = [],
  benefit = {},
  eligibility = null
) {
  const period = String(
    benefit.savingPeriod || benefit.saving_period || SavingPeriod.MONTHLY_RECURRING
  ).toUpperCase();
  const matchedSubscriptions = eligibility?.matchedSubscriptions?.length
    ? eligibility.matchedSubscriptions
    : getTargetSubscriptions(subscriptions, benefit);
  const baselineMonthly = matchedSubscriptions.reduce(
    (sum, subscription) => sum + monthlyAmount(subscription),
    0
  );

  if (baselineMonthly <= 0) {
    return {
      amount: null,
      period,
      isConfirmed: false,
      reason: "NO_CURRENT_COST",
      baselineMonthly,
    };
  }
  const requiredMembership =
    benefit.requiredMembership || benefit.required_membership;
  const membershipOwned = ownsMembership(subscriptions, requiredMembership);
  const rawRequiredCost = benefit.requiredCost ?? benefit.required_cost;
  const requiredCostKnown =
    !requiredMembership || membershipOwned || Number.isFinite(Number(rawRequiredCost));

  if (!requiredCostKnown) {
    return {
      amount: null,
      period,
      isConfirmed: false,
      reason: "REQUIRED_COST_UNKNOWN",
      baselineMonthly,
    };
  }

  const requiredCost = requiredMembership && !membershipOwned
    ? Math.max(0, Number(rawRequiredCost) || 0)
    : 0;
  const baseline = periodBaseline(baselineMonthly, period);
  const type = String(benefit.benefitType || benefit.benefit_type || "").toUpperCase();
  const benefitAmount = Number(benefit.benefitAmount ?? benefit.benefit_amount);
  const benefitRate = Number(benefit.benefitRate ?? benefit.benefit_rate);
  const benefitCap = benefit.benefitCap ?? benefit.benefit_cap;
  const offerPrice = Number(benefit.offerPrice ?? benefit.offer_price);

  let saving = null;
  let afterCost = null;
  if (type === "CASHBACK" || type === "FIXED_DISCOUNT" || type === "COUPON") {
    if (Number.isFinite(benefitAmount)) {
      saving = capped(benefitAmount, benefitCap) - requiredCost;
      afterCost = Math.max(0, baseline - saving);
    }
  } else if (type === "PERCENT_DISCOUNT") {
    if (Number.isFinite(benefitRate)) {
      const rate = benefitRate > 1 ? benefitRate / 100 : benefitRate;
      saving = capped(baseline * Math.max(0, rate), benefitCap) - requiredCost;
      afterCost = Math.max(0, baseline - saving);
    }
  } else if (type === "FREE_INCLUDED") {
    saving = baseline - requiredCost;
    afterCost = requiredCost;
  } else if (type === "BUNDLE_PRICE" || type === "PRICE_OVERRIDE") {
    if (Number.isFinite(offerPrice)) {
      afterCost = Math.max(0, offerPrice + requiredCost);
      saving = baseline - afterCost;
    }
  } else if (Number.isFinite(benefitAmount) && type) {
    saving = capped(benefitAmount, benefitCap) - requiredCost;
    afterCost = Math.max(0, baseline - saving);
  }

  if (!Number.isFinite(saving)) {
    return {
      amount: null,
      period,
      isConfirmed: false,
      reason: "SAVING_NOT_COMPUTABLE",
      baselineMonthly,
      requiredCost,
    };
  }
  const amount = Math.max(0, Math.round(saving));
  const status = eligibility?.status || BenefitEligibility.NEEDS_CHECK;
  return {
    amount,
    period,
    isConfirmed: status === BenefitEligibility.ELIGIBLE && amount > 0,
    isPositive: amount > 0,
    baselineMonthly,
    baselinePeriod: Math.round(baseline),
    afterCost: Number.isFinite(afterCost) ? Math.round(afterCost) : null,
    requiredCost,
    membershipOwned,
    reason: amount > 0 ? null : "NO_NET_SAVING",
  };
}

function targetKey(benefit = {}) {
  const ids = benefit.targetServiceIds || benefit.target_service_ids || benefit.sourceServiceIds || [];
  return [...ids].map(normalize).filter(Boolean).sort().join("+");
}

export function summarizeConfirmedMonthlySavings(recommendations = []) {
  const eligible = recommendations
    .filter((item) =>
      item?.eligibility?.status === BenefitEligibility.ELIGIBLE &&
      item?.savings?.isConfirmed &&
      item.savings.period === SavingPeriod.MONTHLY_RECURRING &&
      item.savings.amount > 0
    )
    .sort((a, b) => b.savings.amount - a.savings.amount);

  const selected = [];
  const usedExclusiveGroups = new Set();
  const usedNonStackableTargets = new Set();
  for (const item of eligible) {
    const benefit = item.benefit || item;
    const exclusiveGroup =
      benefit.exclusiveGroup || benefit.exclusive_group || null;
    const key = targetKey(benefit);
    const stackable = Boolean(benefit.stackable);

    if (exclusiveGroup && usedExclusiveGroups.has(exclusiveGroup)) continue;
    if (!stackable && key && usedNonStackableTargets.has(key)) continue;

    selected.push(item);
    if (exclusiveGroup) usedExclusiveGroups.add(exclusiveGroup);
    if (!stackable && key) usedNonStackableTargets.add(key);
  }

  return {
    amount: selected.reduce((sum, item) => sum + item.savings.amount, 0),
    count: selected.length,
    selected,
  };
}
