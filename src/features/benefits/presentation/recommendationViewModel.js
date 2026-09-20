import {
  BenefitEligibility,
  evaluateBenefitEligibility,
} from "../../../lib/benefitMatcher.js";
import {
  SavingPeriod,
  calculateBenefitSavings,
  summarizeConfirmedMonthlySavings,
} from "../../../lib/savingsCalculator.js";
import {
  HybridRecommendationStatus,
  buildHybridRecommendation,
} from "../domain/hybridRecommendation.js";

export const RecommendationSource = Object.freeze({
  LEGACY: "LEGACY_BENEFITS",
  TRUSTFIX_V7: "TRUSTFIX_V7",
});

function clone(value) {
  if (value == null || typeof value !== "object") return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function legacyStatus(eligibility, savings) {
  if (eligibility?.status === BenefitEligibility.INELIGIBLE) {
    return HybridRecommendationStatus.INELIGIBLE;
  }
  if (eligibility?.status === BenefitEligibility.NEEDS_CHECK) {
    return HybridRecommendationStatus.NEEDS_CHECK;
  }
  if (savings?.isConfirmed && savings?.amount > 0) {
    return HybridRecommendationStatus.ELIGIBLE_CONFIRMED;
  }
  return HybridRecommendationStatus.ELIGIBLE_NOT_COMPUTABLE;
}

function legacyMaterialConditions(benefit = {}) {
  return {
    audience: benefit.audience,
    paymentMethod: benefit.requiredPaymentMethod,
    carrier: benefit.requiredCarrier,
    membership: benefit.requiredMembership,
    plan: benefit.requiredPlan,
    planChangeRequired: benefit.planChangeRequired,
    targetPlan: benefit.targetPlan,
    eligibilityRules: clone(benefit.eligibilityRules),
    exclusiveGroup: benefit.exclusiveGroup,
    stackable: benefit.stackable,
  };
}

export function buildLegacyRecommendationViewModel(
  subscriptions = [],
  benefit = {}
) {
  const eligibility = evaluateBenefitEligibility(subscriptions, benefit);
  const savings = calculateBenefitSavings(subscriptions, benefit, eligibility);
  const status = legacyStatus(eligibility, savings);
  const matched = eligibility?.matchedSubscriptions?.[0] || {};

  return {
    viewModelVersion: 1,
    id: benefit.id,
    sourceType: RecommendationSource.LEGACY,
    publicationState: "LEGACY_ACTIVE",
    publicationQualified: false,
    status,
    serviceId:
      matched.serviceId ||
      matched.service_id ||
      matched.id ||
      benefit.targetServiceIds?.[0] ||
      null,
    serviceName: matched.name || benefit.title || "구독 서비스",
    servicePlan: matched.plan || null,
    currentAmount: matched.amount ?? null,
    title: benefit.kind || benefit.title || "제휴 혜택",
    description: benefit.description || "",
    partnerName:
      benefit.partnerName ||
      benefit.partnerId ||
      benefit.subtitle ||
      "공식 제휴",
    sourceUrl: benefit.sourceUrl || benefit.link || null,
    temporal: {
      start: benefit.startAt ?? null,
      end: benefit.endAt ?? null,
    },
    materialConditions: legacyMaterialConditions(benefit),
    provenance: {
      sourceType: RecommendationSource.LEGACY,
      officialSourceUrl: benefit.sourceUrl || benefit.link || null,
      partner: benefit.partnerName || benefit.partnerId || null,
      lastVerifiedAt: benefit.lastVerifiedAt ?? null,
    },
    eligibility,
    computability: {
      status: savings?.amount == null ? "NOT_COMPUTABLE" : "LEGACY_COMPUTED",
      reason: savings?.reason ?? null,
    },
    savings,
    benefit,
    actionTarget: benefit,
  };
}


function v7MaterialConditions(offer = {}) {
  return {
    minimumPurchase: clone(offer.minimumPurchase),
    frequency: clone(offer.frequency),
    audienceCondition: clone(offer.audienceCondition),
    paymentCondition: clone(offer.paymentCondition),
    channelCondition: offer.channelCondition,
    exclusions: clone(offer.exclusions),
    selectionRelation: clone(offer.selectionRelation),
    lottery: clone(offer.lottery),
    certainty: offer.certainty,
  };
}

function v7BenefitForConflict(hybrid, offer) {
  if (hybrid?.benefit) return hybrid.benefit;

  const relation = offer?.selectionRelation || {};
  return {
    id: offer?.serviceOfferId,
    targetServiceIds: offer?.linkedServiceId ? [offer.linkedServiceId] : [],
    exclusiveGroup:
      relation.exclusive_group ??
      relation.exclusiveGroup ??
      relation.group ??
      null,
    stackable: Object.prototype.hasOwnProperty.call(relation, "stackable")
      ? relation.stackable
      : undefined,
  };
}

export function buildV7RecommendationViewModel(
  subscriptions = [],
  offer = {},
  userContext = {}
) {
  const hybrid = buildHybridRecommendation(offer, subscriptions, userContext);
  const matched = hybrid.eligibility?.matchedSubscriptions?.[0] || {};

  return {
    viewModelVersion: 1,
    id: offer.serviceOfferId,
    sourceType: RecommendationSource.TRUSTFIX_V7,
    publicationState: offer.publicationState,
    publicationQualified: offer.publicationState === "PUBLISHED",
    status: hybrid.status,
    relevance: hybrid.relevance,
    serviceId:
      matched.serviceId ||
      matched.service_id ||
      matched.id ||
      offer.linkedServiceId ||
      null,
    serviceName: matched.name || offer.serviceName || "구독 서비스",
    servicePlan: matched.plan || null,
    currentAmount: matched.amount ?? null,
    title: offer.benefitName || "공식 제휴 혜택",
    description:
      offer.displayContract?.description ||
      offer.displayContract?.summary ||
      "",
    partnerName: offer.partner || "공식 제휴",
    sourceUrl: offer.sourceUrl ?? null,
    temporal: clone(offer.temporal),
    materialConditions: v7MaterialConditions(offer),
    provenance: {
      sourceType: RecommendationSource.TRUSTFIX_V7,
      officialSourceUrl: offer.sourceUrl ?? null,
      serviceId: offer.linkedServiceId ?? null,
      partner: offer.partner ?? null,
      temporal: clone(offer.temporal),
      projection: offer.projection,
      publicationState: offer.publicationState,
    },
    eligibility: hybrid.eligibility,
    computability: hybrid.computability,
    savings: hybrid.savings,
    benefit: v7BenefitForConflict(hybrid, offer),
    actionTarget: {
      sourceUrl: offer.sourceUrl ?? null,
      sourceType: RecommendationSource.TRUSTFIX_V7,
    },
  };
}

export function buildRecommendationViewModels({
  subscriptions = [],
  legacyBenefits = [],
  v7Offers = [],
  userContext = {},
} = {}) {
  return [
    ...legacyBenefits.map((benefit) =>
      buildLegacyRecommendationViewModel(subscriptions, benefit)
    ),
    ...v7Offers.map((offer) =>
      buildV7RecommendationViewModel(subscriptions, offer, userContext)
    ),
  ];
}

export function partitionRecommendationViewModels(recommendations = []) {
  const visible = recommendations.filter(
    (item) =>
      item?.status !== HybridRecommendationStatus.INELIGIBLE &&
      item?.status !== HybridRecommendationStatus.SOURCE_UNAVAILABLE
  );

  const confirmed = visible
    .filter(
      (item) =>
        item.sourceType === RecommendationSource.TRUSTFIX_V7 &&
        item.publicationQualified === true &&
        item.status === HybridRecommendationStatus.ELIGIBLE_CONFIRMED &&
        item.savings?.isConfirmed &&
        item.savings?.amount > 0
    )
    .sort((a, b) => (b.savings?.amount || 0) - (a.savings?.amount || 0));

  const needsCheck = visible
    .filter((item) => item.status === HybridRecommendationStatus.NEEDS_CHECK)
    .sort((a, b) => (b.savings?.amount || 0) - (a.savings?.amount || 0));

  const additional = visible
    .filter(
      (item) =>
        !confirmed.includes(item) &&
        !needsCheck.includes(item) &&
        (
          item.status === HybridRecommendationStatus.ELIGIBLE_NOT_COMPUTABLE ||
          item.status === HybridRecommendationStatus.NON_SUBSCRIPTION_RELEVANT ||
          item.sourceType === RecommendationSource.LEGACY
        )
    )
    .sort((a, b) => (b.savings?.amount || 0) - (a.savings?.amount || 0));

  return {
    confirmed,
    needsCheck,
    additional,
    hidden: recommendations.filter(
      (item) =>
        item?.status === HybridRecommendationStatus.INELIGIBLE ||
        item?.status === HybridRecommendationStatus.SOURCE_UNAVAILABLE
    ),
  };
}

export function summarizePublishedConfirmedSavings(recommendations = []) {
  const eligible = recommendations
    .filter(
      (item) =>
        item?.sourceType === RecommendationSource.TRUSTFIX_V7 &&
        item?.publicationQualified === true &&
        item?.status === HybridRecommendationStatus.ELIGIBLE_CONFIRMED &&
        item?.savings?.isConfirmed &&
        item?.savings?.period === SavingPeriod.MONTHLY_RECURRING &&
        item?.savings?.amount > 0
    )
    .map((item) => ({
      recommendation: item,
      benefit: item.benefit,
      eligibility: {
        status: BenefitEligibility.ELIGIBLE,
        matchedSubscriptions: item.eligibility?.matchedSubscriptions || [],
      },
      savings: item.savings,
    }));

  const summary = summarizeConfirmedMonthlySavings(eligible);
  return {
    amount: summary.amount,
    count: summary.count,
    selected: summary.selected.map((item) => item.recommendation),
  };
}

function friendlyConditionToken(value) {
  const raw = String(value ?? "").trim();
  const key = raw.toUpperCase();
  const labels = {
    EXISTING_SUBSCRIBER: "현재 이용 중인 고객도 가능",
    NEW_SUBSCRIBER: "신규 가입 고객",
    NEW_SUBSCRIBER_ONLY: "신규 가입 고객만",
    ANY: "제한 없음",
    NAVERPLUS: "네이버플러스 멤버십",
  };
  return labels[key] || raw;
}

function stringifyCondition(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string" || typeof value === "number") {
    return friendlyConditionToken(value);
  }
  if (Array.isArray(value)) {
    const entries = value.map(stringifyCondition).filter(Boolean);
    return entries.length ? entries.join(", ") : null;
  }
  if (typeof value === "object") {
    const known = [
      value.audience ? friendlyConditionToken(value.audience) : null,
      (value.required_plan ?? value.requiredPlan)
        ? `요금제 ${friendlyConditionToken(value.required_plan ?? value.requiredPlan)}`
        : null,
      (value.required_membership ?? value.requiredMembership)
        ? `${friendlyConditionToken(value.required_membership ?? value.requiredMembership)} 필요`
        : null,
      (value.required_carrier ?? value.requiredCarrier)
        ? `${friendlyConditionToken(value.required_carrier ?? value.requiredCarrier)} 이용자`
        : null,
      (value.required_payment_method ?? value.requiredPaymentMethod)
        ? `${friendlyConditionToken(value.required_payment_method ?? value.requiredPaymentMethod)} 결제`
        : null,
      value.type ? friendlyConditionToken(value.type) : null,
    ].filter(Boolean);
    const children = Array.isArray(value.children)
      ? value.children
      : Array.isArray(value.conditions)
        ? value.conditions
        : [];
    const childText = children.map(stringifyCondition).filter(Boolean);
    const combined = [...known, ...childText];
    if (combined.length) return [...new Set(combined)].join(" · ");
  }
  return null;
}

export function recommendationConditionLabels(recommendation = {}) {
  const conditions = recommendation.materialConditions || {};
  const labels = [];

  const entries = [
    ["대상", conditions.audience ?? conditions.audienceCondition],
    ["결제", conditions.paymentMethod ?? conditions.paymentCondition],
    ["통신사", conditions.carrier],
    ["멤버십", conditions.membership],
    ["요금제", conditions.plan],
    ["채널", conditions.channelCondition],
  ];

  for (const [label, value] of entries) {
    const text = stringifyCondition(value);
    if (text) labels.push(`${label}: ${text}`);
  }

  const minimum = conditions.minimumPurchase;
  if (minimum?.value != null) {
    labels.push(`최소 조건: ${minimum.value}${minimum.unit ? ` ${minimum.unit}` : ""}`);
  }

  if (conditions.planChangeRequired) {
    labels.push(
      conditions.targetPlan
        ? `요금제 변경: ${conditions.targetPlan}`
        : "요금제 변경 필요"
    );
  }

  return labels;
}
