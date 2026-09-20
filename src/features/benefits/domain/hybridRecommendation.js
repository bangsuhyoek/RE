import { BenefitEligibility } from "../../../lib/benefitMatcher.js";
import { calculateBenefitSavings } from "../../../lib/savingsCalculator.js";
import {
  SubscriptionRelevance,
  classifySubscriptionRelevance,
} from "./subscriptionRelevance.js";
import {
  TruthValue,
  evaluateCondition,
  evaluateUserConstraints,
} from "./userConstraintEvaluator.js";
import {
  MonetaryComputability,
  evaluateMonetaryComputability,
  resolveSavingPeriod,
} from "./monetaryComputability.js";

export {
  SubscriptionRelevance,
  classifySubscriptionRelevance,
  TruthValue,
  evaluateCondition,
  evaluateUserConstraints,
  MonetaryComputability,
  evaluateMonetaryComputability,
};

export const HybridRecommendationStatus = Object.freeze({
  ELIGIBLE_CONFIRMED: "ELIGIBLE_CONFIRMED",
  ELIGIBLE_NOT_COMPUTABLE: "ELIGIBLE_NOT_COMPUTABLE",
  NEEDS_CHECK: "NEEDS_CHECK",
  NOT_CURRENTLY_SUBSCRIBED: "NOT_CURRENTLY_SUBSCRIBED",
  INELIGIBLE: "INELIGIBLE",
  NON_SUBSCRIPTION_RELEVANT: "NON_SUBSCRIPTION_RELEVANT",
  SOURCE_UNAVAILABLE: "SOURCE_UNAVAILABLE",
});

export const RecommendationApplicability = Object.freeze({
  APPLICABLE: "APPLICABLE",
  NEEDS_USER_INFO: "NEEDS_USER_INFO",
  NOT_CURRENTLY_SUBSCRIBED: "NOT_CURRENTLY_SUBSCRIBED",
  CONSTRAINT_NOT_SATISFIED: "CONSTRAINT_NOT_SATISFIED",
});

function normalize(value = "") {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\uAC00-\uD7A3_]/g, "");
}

function numberValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return NaN;
  const parsed = Number(value.replace(/,/g, "").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function maximumBenefitValue(maximumBenefit) {
  if (typeof maximumBenefit === "number") return maximumBenefit;
  if (maximumBenefit && typeof maximumBenefit === "object") {
    const unit = normalize(maximumBenefit.unit || maximumBenefit.benefit_unit);
    const value = numberValue(
      maximumBenefit.value ?? maximumBenefit.amount ?? maximumBenefit.benefit_value
    );
    if (Number.isFinite(value) && (!unit || unit === "KRW" || unit === "\uC6D0")) {
      return value;
    }
  }
  return NaN;
}

function findExplicitValue(value, keys, depth = 0) {
  if (depth > 5 || value == null) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findExplicitValue(item, keys, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  if (typeof value !== "object") return undefined;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) return value[key];
  }
  for (const child of Object.values(value)) {
    const found = findExplicitValue(child, keys, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function legacyBenefitType(offer = {}) {
  const type = normalize(offer.benefitType);
  if (/FREE|INCLUDED/.test(type)) return "FREE_INCLUDED";
  if (/CASHBACK/.test(type)) return "CASHBACK";
  if (/PERCENT|RATE/.test(type)) return "PERCENT_DISCOUNT";
  if (/BUNDLE_PRICE/.test(type)) return "BUNDLE_PRICE";
  if (/PRICE_OVERRIDE/.test(type)) return "PRICE_OVERRIDE";
  if (/DISCOUNT/.test(type)) return "FIXED_DISCOUNT";
  return "";
}

function economicBenefitForCalculator(offer = {}) {
  const type = legacyBenefitType(offer);
  const value = numberValue(offer.benefitValue);
  const unit = normalize(offer.benefitUnit);
  const period = resolveSavingPeriod(offer);
  const conditionSources = [
    offer.audienceCondition,
    offer.paymentCondition,
    offer.displayContract,
  ];

  const requiredMembership = findExplicitValue(
    conditionSources,
    ["required_membership", "requiredMembership"]
  );
  const requiredCost = findExplicitValue(
    conditionSources,
    ["required_cost", "requiredCost"]
  );
  const exclusiveGroup = findExplicitValue(
    offer.selectionRelation,
    ["exclusive_group", "exclusiveGroup", "group"]
  );
  const stackable = findExplicitValue(
    offer.selectionRelation,
    ["stackable"]
  );

  const benefit = {
    id: offer.serviceOfferId,
    targetServiceIds: offer.linkedServiceId ? [offer.linkedServiceId] : [],
    benefitType: type,
    savingPeriod: period,
    requiredMembership,
    requiredCost,
    exclusiveGroup,
    stackable,
  };

  if (type === "PERCENT_DISCOUNT" && Number.isFinite(value)) {
    benefit.benefitRate = value;
  } else if (
    ["FIXED_DISCOUNT", "CASHBACK"].includes(type) &&
    Number.isFinite(value) &&
    (unit === "KRW" || unit === "\uC6D0")
  ) {
    benefit.benefitAmount = value;
  } else if (
    ["BUNDLE_PRICE", "PRICE_OVERRIDE"].includes(type) &&
    Number.isFinite(value) &&
    (unit === "KRW" || unit === "\uC6D0")
  ) {
    benefit.offerPrice = value;
  }

  const cap = maximumBenefitValue(offer.maximumBenefit);
  if (Number.isFinite(cap)) benefit.benefitCap = cap;
  return benefit;
}

function legacyEligibility(truth, matchedSubscriptions) {
  return {
    status: truth === TruthValue.TRUE
      ? BenefitEligibility.ELIGIBLE
      : BenefitEligibility.NEEDS_CHECK,
    matchedSubscriptions,
    reasons: [],
    actions: [],
  };
}

export function buildSourceUnavailableRecommendation(error = null) {
  return {
    status: HybridRecommendationStatus.SOURCE_UNAVAILABLE,
    error,
    relevance: SubscriptionRelevance.UNKNOWN,
    constraintTruth: TruthValue.UNKNOWN,
    computability: {
      status: MonetaryComputability.NOT_COMPUTABLE,
      reason: "SOURCE_UNAVAILABLE",
    },
    savings: null,
  };
}

export function buildHybridRecommendation(
  offer = {},
  subscriptions = [],
  userContext = {}
) {
  const relevance = classifySubscriptionRelevance(offer);

  if ([
    SubscriptionRelevance.NON_SUBSCRIPTION_BENEFIT,
    SubscriptionRelevance.LOTTERY,
    SubscriptionRelevance.GENERAL_REWARD,
  ].includes(relevance)) {
    return {
      status: HybridRecommendationStatus.NON_SUBSCRIPTION_RELEVANT,
      offer,
      relevance,
      eligibility: null,
      computability: evaluateMonetaryComputability(offer, relevance),
      savings: null,
    };
  }

  if (relevance === SubscriptionRelevance.UNKNOWN) {
    return {
      status: HybridRecommendationStatus.NEEDS_CHECK,
      applicability: RecommendationApplicability.NEEDS_USER_INFO,
      offer,
      relevance,
      eligibility: {
        truth: TruthValue.UNKNOWN,
        status: BenefitEligibility.NEEDS_CHECK,
        matchedSubscriptions: [],
        checks: {},
      },
      computability: evaluateMonetaryComputability(offer, relevance),
      savings: null,
      reason: "SUBSCRIPTION_RELEVANCE_UNKNOWN",
    };
  }

  const eligibility = evaluateUserConstraints(offer, subscriptions, userContext);
  const computability = evaluateMonetaryComputability(offer, relevance);

  if (eligibility.matchedSubscriptions.length === 0) {
    return {
      status: HybridRecommendationStatus.NOT_CURRENTLY_SUBSCRIBED,
      applicability: RecommendationApplicability.NOT_CURRENTLY_SUBSCRIBED,
      offer,
      relevance,
      eligibility,
      computability,
      savings: null,
      reason: "SERVICE_NOT_SUBSCRIBED",
    };
  }

  if (eligibility.truth === TruthValue.FALSE) {
    return {
      status: HybridRecommendationStatus.INELIGIBLE,
      applicability: RecommendationApplicability.CONSTRAINT_NOT_SATISFIED,
      offer,
      relevance,
      eligibility,
      computability,
      savings: null,
      reason: "CONSTRAINT_NOT_SATISFIED",
    };
  }

  if (computability.status === MonetaryComputability.NOT_COMPUTABLE) {
    return {
      status: eligibility.truth === TruthValue.UNKNOWN
        ? HybridRecommendationStatus.NEEDS_CHECK
        : HybridRecommendationStatus.ELIGIBLE_NOT_COMPUTABLE,
      applicability: eligibility.truth === TruthValue.UNKNOWN
        ? RecommendationApplicability.NEEDS_USER_INFO
        : RecommendationApplicability.APPLICABLE,
      offer,
      relevance,
      eligibility,
      computability,
      savings: null,
    };
  }

  const economicBenefit = economicBenefitForCalculator(offer);
  if (!economicBenefit.savingPeriod) {
    return {
      status: eligibility.truth === TruthValue.UNKNOWN
        ? HybridRecommendationStatus.NEEDS_CHECK
        : HybridRecommendationStatus.ELIGIBLE_NOT_COMPUTABLE,
      applicability: eligibility.truth === TruthValue.UNKNOWN
        ? RecommendationApplicability.NEEDS_USER_INFO
        : RecommendationApplicability.APPLICABLE,
      offer,
      relevance,
      eligibility,
      computability: {
        status: MonetaryComputability.NOT_COMPUTABLE,
        reason: "SAVING_PERIOD_UNKNOWN",
      },
      savings: null,
    };
  }

  const savings = calculateBenefitSavings(
    subscriptions,
    economicBenefit,
    legacyEligibility(eligibility.truth, eligibility.matchedSubscriptions)
  );

  if (eligibility.truth === TruthValue.UNKNOWN) {
    return {
      status: HybridRecommendationStatus.NEEDS_CHECK,
      applicability: RecommendationApplicability.NEEDS_USER_INFO,
      offer,
      relevance,
      eligibility,
      computability,
      savings,
      benefit: economicBenefit,
    };
  }

  if (savings?.amount == null) {
    return {
      status: HybridRecommendationStatus.ELIGIBLE_NOT_COMPUTABLE,
      applicability: RecommendationApplicability.APPLICABLE,
      offer,
      relevance,
      eligibility,
      computability,
      savings,
      benefit: economicBenefit,
    };
  }

  return {
    status: HybridRecommendationStatus.ELIGIBLE_CONFIRMED,
    applicability: RecommendationApplicability.APPLICABLE,
    offer,
    relevance,
    eligibility,
    computability,
    savings,
    benefit: economicBenefit,
  };
}
