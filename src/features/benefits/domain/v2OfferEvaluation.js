export const V2Eligibility = Object.freeze({
  ELIGIBLE: "ELIGIBLE",
  INELIGIBLE: "INELIGIBLE",
  UNKNOWN: "UNKNOWN",
});

export const V2AssessmentStatus = Object.freeze({
  CONFIRMED_SAVING: "CONFIRMED_SAVING",
  CONDITIONAL_SAVING: "CONDITIONAL_SAVING",
  FREE_TRIAL: "FREE_TRIAL",
  NOT_BETTER: "NOT_BETTER",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  UNKNOWN: "UNKNOWN",
});

function normalize(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "");
}

function numeric(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function normalizeRecurringMonthly(amount, billingCycle) {
  const value = numeric(amount);
  if (value == null) return null;
  const cycle = normalize(billingCycle);
  if (/annual|year|년|연간/.test(cycle)) return value / 12;
  if (/weekly|week|주간|매주/.test(cycle)) return value * 52 / 12;
  return value;
}

function monthlyCost(subscription = {}) {
  return normalizeRecurringMonthly(
    subscription.currentEffectiveCost ?? subscription.amount,
    subscription.billingCycle || subscription.billing_cycle
  );
}

function subscriptionServiceId(subscription = {}) {
  return subscription.serviceId || subscription.service_id || subscription.id || null;
}
function ownsRequirement(subscriptions = [], required) {
  const token = normalize(required);
  if (!token) return true;
  return subscriptions.some((subscription) =>
    [
      subscription.id,
      subscription.serviceId,
      subscription.service_id,
      subscription.name,
      subscription.plan,
    ].map(normalize).includes(token)
  );
}

function currentTargetSubscriptions(subscriptions = [], serviceId) {
  return subscriptions.filter((subscription) =>
    subscription.status !== "inactive" &&
    normalize(subscriptionServiceId(subscription)) === normalize(serviceId)
  );
}

export function evaluatePlanEquivalence(subscription = {}, offer = {}) {
  const explicit = String(
    offer.planEquivalence || offer.plan_equivalence || offer.canonical?.plan_equivalence || ""
  ).toUpperCase();
  if (["EXACT", "EQUIVALENT", "DOWNGRADE", "UPGRADE", "UNKNOWN"].includes(explicit)) {
    return explicit;
  }

  const offerPlan = offer.canonical?.target_plan ?? offer.targetPlan ?? offer.target_plan;
  const currentPlan = subscription.plan || subscription.planName || subscription.plan_name;
  if (!offerPlan || !currentPlan) return "UNKNOWN";
  return normalize(offerPlan) === normalize(currentPlan) ? "EXACT" : "UNKNOWN";
}

function userCarrierMatches(userContext, requiredCarrier) {
  if (!requiredCarrier) return true;
  const carrier = userContext.carrier || userContext.mobileCarrier || "";
  if (!carrier) return null;
  return normalize(carrier) === normalize(requiredCarrier);
}
function userCarrierPlanMatches(userContext, requiredPlan) {
  if (!requiredPlan) return true;
  const plan =
    userContext.carrierPlan ||
    userContext.mobilePlan ||
    userContext.telecomPlan ||
    "";
  if (!plan) return null;
  return normalize(plan) === normalize(requiredPlan);
}
function userCardMatches(userContext, requiredCard) {
  if (!requiredCard) return true;
  const cards = [
    ...(userContext.cards || []),
    userContext.paymentCard,
    userContext.card,
  ].filter(Boolean);
  if (!cards.length) return null;
  return cards.some((card) => normalize(card).includes(normalize(requiredCard)));
}

export function assessPartnershipOffer(
  offer = {},
  subscriptions = [],
  userContext = {}
) {
  const canonical = offer.canonical || offer;
  const targets = currentTargetSubscriptions(subscriptions, offer.serviceId || canonical.target_service);
  if (!targets.length) {
    return {
      category: "PARTNERSHIP_SAVING",
      status: V2AssessmentStatus.NOT_APPLICABLE,
      eligibility: V2Eligibility.INELIGIBLE,
      reason: "TARGET_NOT_SUBSCRIBED",
    };
  }

  const subscription = targets[0];
  const baselineMonthly = monthlyCost(subscription);
  const equivalence = evaluatePlanEquivalence(subscription, offer);
  if (baselineMonthly == null) {
    return {
      category: "PARTNERSHIP_SAVING",
      status: V2AssessmentStatus.UNKNOWN,
      eligibility: V2Eligibility.UNKNOWN,
      reason: "CURRENT_EFFECTIVE_COST_UNKNOWN",
      planEquivalence: equivalence,
    };
  }
  if (!["EXACT", "EQUIVALENT"].includes(equivalence)) {
    return {
      category: "PARTNERSHIP_SAVING",
      status: V2AssessmentStatus.UNKNOWN,
      eligibility: V2Eligibility.UNKNOWN,
      reason: equivalence === "DOWNGRADE" ? "PLAN_DOWNGRADE" : "PLAN_NOT_PROVEN_EQUIVALENT",
      planEquivalence: equivalence,
      baselineMonthly,
    };
  }

  const offerMonthly = normalizeRecurringMonthly(
    canonical.offer_price,
    canonical.offer_billing_cycle || "MONTHLY"
  );
  if (offerMonthly == null) {
    return {
      category: "PARTNERSHIP_SAVING",
      status: V2AssessmentStatus.UNKNOWN,
      eligibility: V2Eligibility.UNKNOWN,
      reason: "OFFER_PRICE_UNKNOWN",
      planEquivalence: equivalence,
      baselineMonthly,
    };
  }

  const requiredMembership = canonical.required_membership;
  const membershipOwned = ownsRequirement(subscriptions, requiredMembership);
  const partnerCostValue = numeric(canonical.incremental_partner_cost);
  const incrementalPartnerCost = requiredMembership && !membershipOwned
    ? partnerCostValue
    : 0;

  if (requiredMembership && !membershipOwned && incrementalPartnerCost == null) {
    return {
      category: "PARTNERSHIP_SAVING",
      status: V2AssessmentStatus.CONDITIONAL_SAVING,
      eligibility: V2Eligibility.UNKNOWN,
      reason: "REQUIRED_MEMBERSHIP_COST_UNKNOWN",
      planEquivalence: equivalence,
      baselineMonthly,
    };
  }
  const cardMatch = userCardMatches(userContext, canonical.required_card);
  const carrierMatch = userCarrierMatches(userContext, canonical.required_carrier);
  const carrierPlanMatch = userCarrierPlanMatches(userContext, canonical.required_plan);
  if (cardMatch === false || carrierMatch === false || carrierPlanMatch === false) {
    return {
      category: "PARTNERSHIP_SAVING",
      status: V2AssessmentStatus.NOT_APPLICABLE,
      eligibility: V2Eligibility.INELIGIBLE,
      reason:
        cardMatch === false
          ? "REQUIRED_CARD_NOT_OWNED"
          : carrierMatch === false
            ? "REQUIRED_CARRIER_NOT_MATCHED"
            : "REQUIRED_PLAN_NOT_MATCHED",
      planEquivalence: equivalence,
      baselineMonthly,
    };
  }

  const eligibility =
    cardMatch === null || carrierMatch === null || carrierPlanMatch === null
      ? V2Eligibility.UNKNOWN
      : V2Eligibility.ELIGIBLE;

  const additional = numeric(canonical.incremental_required_cost) || 0;
  const oneTime = numeric(canonical.one_time_cost) || 0;
  const transition = numeric(canonical.transition_cost) || 0;
  const months = Math.max(1, numeric(canonical.comparison_window_months) || 1);

  const baselineCost = baselineMonthly * months;
  const candidateCost =
    offerMonthly * months +
    (incrementalPartnerCost || 0) * months +
    additional * months +
    oneTime +
    transition;
  const netSaving = Math.round(baselineCost - candidateCost);

  return {
    category: "PARTNERSHIP_SAVING",
    status:
      netSaving <= 0
        ? V2AssessmentStatus.NOT_BETTER
        : eligibility === V2Eligibility.ELIGIBLE
          ? V2AssessmentStatus.CONFIRMED_SAVING
          : V2AssessmentStatus.CONDITIONAL_SAVING,
    eligibility,
    reason: netSaving > 0 ? null : "NO_NET_SAVING",
    planEquivalence: equivalence,
    baselineMonthly: Math.round(baselineMonthly),
    comparisonWindowMonths: months,
    baselineCost: Math.round(baselineCost),
    candidateCost: Math.round(candidateCost),
    effectiveMonthlyCost: Math.round(candidateCost / months),
    netSaving,
    monthlySaving: Math.round(netSaving / months),
    membershipOwned,
    incrementalPartnerCost: incrementalPartnerCost || 0,
  };
}

export function assessFreeTrialOffer(
  offer = {},
  subscriptions = [],
  userContext = {}
) {
  const canonical = offer.canonical || offer;
  const serviceId = offer.serviceId || canonical.target_service;
  const targets = currentTargetSubscriptions(subscriptions, serviceId);
  if (targets.length) {
    return {
      category: "NEW_USER_FREE_TRIAL",
      status: V2AssessmentStatus.NOT_APPLICABLE,
      eligibility: V2Eligibility.INELIGIBLE,
      reason: "CURRENTLY_SUBSCRIBED",
    };
  }

  const days = numeric(canonical.trial_duration_days);
  const trialCost = numeric(canonical.trial_cost);
  const postTrialPrice = numeric(canonical.post_trial_price);
  const regularPrice = numeric(canonical.regular_price) ?? postTrialPrice;
  if (days == null || trialCost == null || postTrialPrice == null || regularPrice == null) {
    return {
      category: "NEW_USER_FREE_TRIAL",
      status: V2AssessmentStatus.UNKNOWN,
      eligibility: V2Eligibility.UNKNOWN,
      reason: "TRIAL_MONETARY_FACTS_INCOMPLETE",
    };
  }
  const userTrialState =
    userContext.trialEligibility?.[serviceId] ||
    userContext.newUserEligibility?.[serviceId] ||
    null;
  const eligibility =
    userTrialState === true
      ? V2Eligibility.ELIGIBLE
      : userTrialState === false
        ? V2Eligibility.INELIGIBLE
        : V2Eligibility.UNKNOWN;

  if (eligibility === V2Eligibility.INELIGIBLE) {
    return {
      category: "NEW_USER_FREE_TRIAL",
      status: V2AssessmentStatus.NOT_APPLICABLE,
      eligibility,
      reason: "KNOWN_NOT_NEW_USER",
    };
  }

  const trialMonths = days / 30;
  const normalCostForTrial = regularPrice * trialMonths;
  const trialValue = Math.max(0, Math.round(normalCostForTrial - trialCost));

  return {
    category: "NEW_USER_FREE_TRIAL",
    status: V2AssessmentStatus.FREE_TRIAL,
    eligibility,
    reason: eligibility === V2Eligibility.UNKNOWN ? "NEW_USER_STATUS_UNKNOWN" : null,
    trialDurationDays: days,
    trialCost,
    postTrialPrice,
    regularPrice,
    trialValue,
    autoRenewal: canonical.auto_renewal,
  };
}

export function assessV2Offer(offer = {}, subscriptions = [], userContext = {}) {
  if (offer.category === "PARTNERSHIP_SAVING") {
    return assessPartnershipOffer(offer, subscriptions, userContext);
  }
  if (offer.category === "NEW_USER_FREE_TRIAL") {
    return assessFreeTrialOffer(offer, subscriptions, userContext);
  }
  return {
    category: offer.category || "UNKNOWN",
    status: V2AssessmentStatus.NOT_APPLICABLE,
    eligibility: V2Eligibility.INELIGIBLE,
    reason: "UNSUPPORTED_CATEGORY",
  };
}
