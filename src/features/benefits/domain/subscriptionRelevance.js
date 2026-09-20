export const SubscriptionRelevance = Object.freeze({
  SUBSCRIPTION_COST_REDUCTION: "SUBSCRIPTION_COST_REDUCTION",
  SUBSCRIPTION_INCLUDED: "SUBSCRIPTION_INCLUDED",
  BUNDLE_COST_REDUCTION: "BUNDLE_COST_REDUCTION",
  PAYMENT_CASHBACK: "PAYMENT_CASHBACK",
  SUBSCRIPTION_CREDIT: "SUBSCRIPTION_CREDIT",
  NON_SUBSCRIPTION_BENEFIT: "NON_SUBSCRIPTION_BENEFIT",
  LOTTERY: "LOTTERY",
  GENERAL_REWARD: "GENERAL_REWARD",
  UNKNOWN: "UNKNOWN",
});

function normalize(value = "") {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\uAC00-\uD7A3_]/g, "");
}

export function isSubscriptionBase(offer = {}) {
  const base = normalize(offer.benefitBase);
  return /SUBSCRIPTION|MEMBERSHIP|MONTHLYFEE|SERVICEFEE|PLANFEE/.test(base);
}

export function classifySubscriptionRelevance(offer = {}) {
  const type = normalize(offer.benefitType);
  const unit = normalize(offer.benefitUnit);
  const base = normalize(offer.benefitBase);
  const lottery = [
    offer.lottery?.awardMechanism,
    offer.lottery?.certainty,
    offer.lottery?.allocationMethod,
    offer.allocationMethod,
  ].map(normalize).join("|");

  if (
    type === "CHANCE_PRIZE" ||
    /LOTTERY|RANDOM|CONDITIONAL_ON_WINNING/.test(lottery)
  ) {
    return SubscriptionRelevance.LOTTERY;
  }

  if (/SHIPPING/.test(base) || type === "FREE_SHIPPING") {
    return SubscriptionRelevance.NON_SUBSCRIPTION_BENEFIT;
  }

  if (/POINT/.test(type) || unit === "POINT" || unit === "POINTS") {
    return isSubscriptionBase(offer)
      ? SubscriptionRelevance.SUBSCRIPTION_CREDIT
      : SubscriptionRelevance.GENERAL_REWARD;
  }

  if (/BUNDLE/.test(type)) {
    return SubscriptionRelevance.BUNDLE_COST_REDUCTION;
  }

  if (/FREE|INCLUDED/.test(type)) {
    return isSubscriptionBase(offer)
      ? SubscriptionRelevance.SUBSCRIPTION_INCLUDED
      : SubscriptionRelevance.UNKNOWN;
  }

  if (/CASHBACK/.test(type)) {
    return isSubscriptionBase(offer)
      ? SubscriptionRelevance.PAYMENT_CASHBACK
      : SubscriptionRelevance.UNKNOWN;
  }

  if (/DISCOUNT|PRICE_OVERRIDE/.test(type)) {
    return isSubscriptionBase(offer)
      ? SubscriptionRelevance.SUBSCRIPTION_COST_REDUCTION
      : SubscriptionRelevance.UNKNOWN;
  }

  return SubscriptionRelevance.UNKNOWN;
}
