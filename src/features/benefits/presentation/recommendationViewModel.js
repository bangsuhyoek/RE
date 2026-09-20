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
  RecommendationApplicability,
  SubscriptionRelevance,
  buildHybridRecommendation,
} from "../domain/hybridRecommendation.js";
import { serviceCatalog } from "../../../data/subscriptionData.js";

export const RecommendationSource = Object.freeze({
  LEGACY: "LEGACY_BENEFITS",
  TRUSTFIX_V7: "TRUSTFIX_V7",
});

export const RecommendationTrustStatus = Object.freeze({
  VERIFIED: "VERIFIED",
  STALE: "STALE",
  UNVERIFIED: "UNVERIFIED",
  SOURCE_UNAVAILABLE: "SOURCE_UNAVAILABLE",
});

export const RecommendationSavingsStatus = Object.freeze({
  CONFIRMED: "CONFIRMED",
  CONDITIONAL: "CONDITIONAL",
  ESTIMATED: "ESTIMATED",
  NOT_COMPUTABLE: "NOT_COMPUTABLE",
});

export const RecommendationDisplayStatus = Object.freeze({
  PRIMARY: "PRIMARY",
  NEEDS_CHECK: "NEEDS_CHECK",
  OPTIMIZATION: "OPTIMIZATION",
  DISCOVERY: "DISCOVERY",
  ADDITIONAL: "ADDITIONAL",
  HIDDEN: "HIDDEN",
});

const catalogServiceIds = new Set(serviceCatalog.map((service) => service.id));

function clone(value) {
  if (value == null || typeof value !== "object") return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

const DISCOVERY_RELEVANCE = new Set([
  SubscriptionRelevance.SUBSCRIPTION_COST_REDUCTION,
  SubscriptionRelevance.SUBSCRIPTION_INCLUDED,
  SubscriptionRelevance.BUNDLE_COST_REDUCTION,
  SubscriptionRelevance.PAYMENT_CASHBACK,
]);

function recommendationTrustStatus(item = {}) {
  if (item.status === HybridRecommendationStatus.SOURCE_UNAVAILABLE) {
    return RecommendationTrustStatus.SOURCE_UNAVAILABLE;
  }
  if (String(item.publicationState || "").includes("STALE")) {
    return RecommendationTrustStatus.STALE;
  }
  if (
    item.sourceType === RecommendationSource.TRUSTFIX_V7 &&
    item.publicationQualified === true &&
    item.provenance?.projection === "v7_public_offers" &&
    /^https:\/\//i.test(item.sourceUrl || "")
  ) {
    return RecommendationTrustStatus.VERIFIED;
  }
  return RecommendationTrustStatus.UNVERIFIED;
}

function recommendationSavingsStatus(item = {}) {
  if (
    item.status === HybridRecommendationStatus.ELIGIBLE_CONFIRMED &&
    item.savings?.isConfirmed === true &&
    item.savings?.amount > 0
  ) {
    return RecommendationSavingsStatus.CONFIRMED;
  }
  if (item.status === HybridRecommendationStatus.NEEDS_CHECK) {
    return RecommendationSavingsStatus.CONDITIONAL;
  }
  return RecommendationSavingsStatus.NOT_COMPUTABLE;
}

function parseTemporalBoundary(value, endOfDay = false) {
  if (!value) return NaN;
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return Date.parse(
      `${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+09:00`
    );
  }
  return Date.parse(raw);
}

function isTemporallyActive(item = {}, now = Date.now()) {
  const start = parseTemporalBoundary(item.temporal?.start, false);
  const end = parseTemporalBoundary(item.temporal?.end, true);
  if (Number.isFinite(start) && start > now) return false;
  if (Number.isFinite(end) && end < now) return false;
  return true;
}

function isOptimizationRecommendation(item = {}) {
  if (item.applicability !== RecommendationApplicability.APPLICABLE) return false;
  if (
    item.status !== HybridRecommendationStatus.ELIGIBLE_CONFIRMED &&
    item.status !== HybridRecommendationStatus.ELIGIBLE_NOT_COMPUTABLE
  ) {
    return false;
  }
  return (
    item.savings?.period === SavingPeriod.ANNUAL ||
    item.materialConditions?.planChangeRequired === true ||
    item.relevance === SubscriptionRelevance.BUNDLE_COST_REDUCTION
  );
}

export function resolveRecommendationDisplayStatus(item = {}) {
  const trustStatus = item.trustStatus || recommendationTrustStatus(item);
  const savingsStatus = item.savingsStatus || recommendationSavingsStatus(item);

  if (
    item.status === HybridRecommendationStatus.SOURCE_UNAVAILABLE ||
    item.status === HybridRecommendationStatus.INELIGIBLE
  ) {
    return RecommendationDisplayStatus.HIDDEN;
  }

  if (
    item.sourceType === RecommendationSource.TRUSTFIX_V7 &&
    (trustStatus !== RecommendationTrustStatus.VERIFIED || !isTemporallyActive(item))
  ) {
    return RecommendationDisplayStatus.HIDDEN;
  }

  if (item.status === HybridRecommendationStatus.NOT_CURRENTLY_SUBSCRIBED) {
    const discoverable =
      item.applicability === RecommendationApplicability.NOT_CURRENTLY_SUBSCRIBED &&
      trustStatus === RecommendationTrustStatus.VERIFIED &&
      DISCOVERY_RELEVANCE.has(item.relevance) &&
      catalogServiceIds.has(item.serviceId);

    return discoverable
      ? RecommendationDisplayStatus.DISCOVERY
      : RecommendationDisplayStatus.HIDDEN;
  }

  if (item.status === HybridRecommendationStatus.NEEDS_CHECK) {
    return RecommendationDisplayStatus.NEEDS_CHECK;
  }

  if (isOptimizationRecommendation(item)) {
    return RecommendationDisplayStatus.OPTIMIZATION;
  }

  if (
    item.sourceType === RecommendationSource.TRUSTFIX_V7 &&
    item.status === HybridRecommendationStatus.ELIGIBLE_CONFIRMED &&
    savingsStatus === RecommendationSavingsStatus.CONFIRMED
  ) {
    return RecommendationDisplayStatus.PRIMARY;
  }

  if (
    item.status === HybridRecommendationStatus.ELIGIBLE_NOT_COMPUTABLE ||
    item.status === HybridRecommendationStatus.NON_SUBSCRIPTION_RELEVANT ||
    item.sourceType === RecommendationSource.LEGACY
  ) {
    return RecommendationDisplayStatus.ADDITIONAL;
  }

  return RecommendationDisplayStatus.HIDDEN;
}

function applyRecommendationPolicy(item = {}) {
  const trustStatus = recommendationTrustStatus(item);
  const savingsStatus = recommendationSavingsStatus(item);
  const enriched = { ...item, trustStatus, savingsStatus };
  return {
    ...enriched,
    displayStatus: resolveRecommendationDisplayStatus(enriched),
  };
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

  return applyRecommendationPolicy({
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
  });
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

  return applyRecommendationPolicy({
    viewModelVersion: 1,
    id: offer.serviceOfferId,
    sourceType: RecommendationSource.TRUSTFIX_V7,
    publicationState: offer.publicationState,
    publicationQualified: offer.publicationState === "PUBLISHED",
    status: hybrid.status,
    applicability: hybrid.applicability,
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
  });
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
  const prepared = recommendations.map((item) =>
    item?.displayStatus ? item : applyRecommendationPolicy(item)
  );
  const sortBySaving = (items) =>
    items.sort((a, b) => (b.savings?.amount || 0) - (a.savings?.amount || 0));
  const byDisplay = (displayStatus) =>
    sortBySaving(prepared.filter((item) => item.displayStatus === displayStatus));

  return {
    confirmed: byDisplay(RecommendationDisplayStatus.PRIMARY),
    needsCheck: byDisplay(RecommendationDisplayStatus.NEEDS_CHECK),
    optimization: byDisplay(RecommendationDisplayStatus.OPTIMIZATION),
    discovery: byDisplay(RecommendationDisplayStatus.DISCOVERY),
    additional: byDisplay(RecommendationDisplayStatus.ADDITIONAL),
    hidden: prepared.filter(
      (item) => item.displayStatus === RecommendationDisplayStatus.HIDDEN
    ),
  };
}

export function summarizePublishedConfirmedSavings(recommendations = []) {
  const eligible = recommendations
    .filter(
      (item) =>
        item?.sourceType === RecommendationSource.TRUSTFIX_V7 &&
        item?.publicationQualified === true &&
        resolveRecommendationDisplayStatus(item) === RecommendationDisplayStatus.PRIMARY &&
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
  const exclusiveChoices = summary.exclusiveChoices.map((choice) => {
    const recommendationsInChoice = choice.items
      .map((item) => item.recommendation)
      .filter(Boolean);
    const relations = recommendationsInChoice.map(
      (item) => item.materialConditions?.selectionRelation || {}
    );
    const labeledRelation =
      relations.find((relation) => relation.choice_label || relation.choiceLabel) ||
      relations[0] ||
      {};

    return {
      group: choice.group,
      recommendationIds: recommendationsInChoice.map((item) => item.id),
      selectedId: choice.selected?.recommendation?.id || null,
      choiceLabel:
        labeledRelation.choice_label ??
        labeledRelation.choiceLabel ??
        "같은 선택형 혜택 중 1개만 적용",
    };
  });

  return {
    amount: summary.amount,
    count: summary.count,
    candidateCount: summary.candidateCount,
    selected: summary.selected.map((item) => item.recommendation),
    exclusiveChoices,
    hasExclusiveChoice: exclusiveChoices.length > 0,
    uncertainRecommendationIds: summary.uncertainItems
      .map((item) => item.recommendation?.id)
      .filter(Boolean),
    hasUncertainCompatibility: summary.hasUncertainCompatibility,
  };
}

function friendlyConditionToken(value) {
  const raw = String(value ?? "").trim();
  const key = raw.toUpperCase();
  const labels = {
    EXISTING: "현재 이용 중인 고객도 가능",
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
