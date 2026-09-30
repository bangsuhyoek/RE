import crypto from "node:crypto";
import { FieldState, OfferCategory } from "./constants.js";

function stable(value) {
  if (Array.isArray(value)) return JSON.stringify([...value].sort());
  if (value && typeof value === "object") {
    return JSON.stringify(Object.keys(value).sort().reduce((out, key) => {
      out[key] = value[key];
      return out;
    }, {}));
  }
  return JSON.stringify(value);
}

function hash(value, length = 32) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, length);
}

function normalizeToken(value = "") {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g, "");
}

function observationValue(observations, field) {
  return observations.find((item) => item.field === field)?.value ?? null;
}

function sourceHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function buildOfferIdentity({
  category,
  serviceId,
  observations = [],
  sourceUrl = "",
} = {}) {
  const audience = observationValue(observations, "audience") || "UNKNOWN";
  const plan = observationValue(observations, "target_plan") || "";
  const membership = observationValue(observations, "required_membership") || "";
  const carrier = observationValue(observations, "required_carrier") || "";
  const card = observationValue(observations, "required_card") || "";
  const requiredPlan = observationValue(observations, "required_plan") || "";
  const partnerId = observationValue(observations, "partner_id") || "";
  const trialDays = observationValue(observations, "trial_duration_days") || "";
  const startAt = observationValue(observations, "start_at") || "";
  const endAt = observationValue(observations, "end_at") || "";
  const campaignPeriod = [startAt, endAt].filter(Boolean).join("~");
  let partnerIdentity = [partnerId, membership, carrier, card].map(normalizeToken).filter(Boolean).join("+");
  if (category === OfferCategory.PARTNERSHIP_SAVING && !partnerIdentity) {
    partnerIdentity = sourceHost(sourceUrl);
  }

  const identity = [
    category || "UNKNOWN",
    serviceId || "UNKNOWN",
    normalizeToken(plan),
    normalizeToken(audience),
    partnerIdentity,
    normalizeToken(requiredPlan),
    category === OfferCategory.NEW_USER_FREE_TRIAL ? String(trialDays) : "",
    campaignPeriod,
  ].join("|");

  return {
    offerId: `off_${hash(identity, 24)}`,
    identity,
  };
}

function resolveField(field, observations = []) {
  const applicable = observations
    .filter((item) => item.field === field)
    .filter((item) => item.value !== undefined && item.value !== null && item.value !== "");

  if (!applicable.length) {
    return { field, value: null, state: FieldState.UNKNOWN, evidence: [] };
  }

  const groups = new Map();
  for (const observation of applicable) {
    const key = stable(observation.value);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(observation);
  }

  const ranked = [...groups.entries()].map(([key, items]) => ({
    key,
    value: items[0].value,
    maxAuthority: Math.max(...items.map((item) => Number(item.authorityScore) || 0)),
    supportCount: items.length,
    latest: Math.max(...items.map((item) => Date.parse(item.observedAt) || 0)),
    items,
  })).sort((a, b) =>
    b.maxAuthority - a.maxAuthority ||
    b.supportCount - a.supportCount ||
    b.latest - a.latest
  );

  const best = ranked[0];
  // Official claims for the same offer must be separated by verified variant
  // conditions before unequal values may be selected by authority rank.
  const officialReviewField = new Set([
    "target_plan", "audience", "required_plan", "required_membership",
    "offer_price", "regular_price", "post_trial_price", "trial_cost",
    "trial_duration_days", "new_user_rule", "auto_renewal",
    "action_url", "actionability_status",
  ]).has(field);
  const officialValues = officialReviewField
    ? new Set(ranked.filter((entry) => entry.items.some((item) =>
      /^OFFICIAL_/.test(item.authorityType || "") && Number(item.authorityScore) >= 450
    )).map((entry) => entry.key))
    : new Set();
  const competing = ranked.filter(
    (entry) => entry.key !== best.key &&
      (entry.maxAuthority >= best.maxAuthority ||
        (officialValues.has(best.key) && officialValues.has(entry.key)))
  );
  if (competing.length) {
    return {
      field,
      value: null,
      state: FieldState.CONFLICT,
      evidence: [...best.items, ...competing.flatMap((entry) => entry.items)],
      conflicts: ranked.map((entry) => ({
        value: entry.value,
        authority: entry.maxAuthority,
        supportCount: entry.supportCount,
      })),
    };
  }

  return {
    field,
    value: best.value,
    state: FieldState.VERIFIED,
    evidence: best.items,
    alternatives: ranked.slice(1).map((entry) => ({
      value: entry.value,
      authority: entry.maxAuthority,
      supportCount: entry.supportCount,
    })),
  };
}

export function canonicalizeOffer({
  offerId,
  category,
  serviceId,
  observations = [],
  now = Date.now(),
} = {}) {
  const fields = {};
  const fieldNames = [...new Set(observations.map((item) => item.field))];
  for (const field of fieldNames) fields[field] = resolveField(field, observations);

  const canonicalValue = (field) =>
    fields[field]?.state === FieldState.VERIFIED ? fields[field].value : null;
  const evidenceUrls = [...new Set(
    observations.map((item) => item.sourceUrl).filter(Boolean)
  )];
  const conflictFields = Object.values(fields)
    .filter((item) => item.state === FieldState.CONFLICT)
    .map((item) => item.field);

  const versionMaterial = {
    category,
    serviceId,
    targetPlan: canonicalValue("target_plan"),
    audience: canonicalValue("audience"),
    regularPrice: canonicalValue("regular_price"),
    offerPrice: canonicalValue("offer_price"),
    startAt: canonicalValue("start_at"),
    endAt: canonicalValue("end_at"),
    partnerId: canonicalValue("partner_id"),
    requiredMembership: canonicalValue("required_membership"),
    requiredCard: canonicalValue("required_card"),
    requiredCarrier: canonicalValue("required_carrier"),
    requiredPlan: canonicalValue("required_plan"),
    discountRate: canonicalValue("discount_rate"),
    fixedDiscountAmount: canonicalValue("fixed_discount_amount"),
    perTransactionCap: canonicalValue("per_transaction_cap"),
    monthlyDiscountCap: canonicalValue("monthly_discount_cap"),
    monthlyDiscountCapScope: canonicalValue("monthly_discount_cap_scope"),
    minimumTransactionAmount: canonicalValue("minimum_transaction_amount"),
    priorMonthSpendRequirement: canonicalValue("prior_month_spend_requirement"),
    monthlyTransactionLimit: canonicalValue("monthly_transaction_limit"),
    eligiblePaymentChannel: canonicalValue("eligible_payment_channel"),
    verificationHoldReason: canonicalValue("verification_hold_reason"),
    bundleOptions: canonicalValue("bundle_options"),
    bundleSelectionLimit: canonicalValue("bundle_selection_limit"),
    incrementalPartnerCost: canonicalValue("incremental_partner_cost"),
    incrementalRequiredCost: canonicalValue("incremental_required_cost"),
    offerBillingCycle: canonicalValue("offer_billing_cycle"),
    trialDurationDays: canonicalValue("trial_duration_days"),
    trialCost: canonicalValue("trial_cost"),
    postTrialPrice: canonicalValue("post_trial_price"),
    newUserRule: canonicalValue("new_user_rule"),
    formerSubscriberRule: canonicalValue("former_subscriber_rule"),
    autoRenewal: canonicalValue("auto_renewal"),
    exclusiveGroupId: canonicalValue("exclusive_group_id"),
    selectionLimit: canonicalValue("selection_limit"),
    stackable: canonicalValue("stackable"),
    conflictsWith: canonicalValue("conflicts_with"),
    actionUrl: canonicalValue("action_url"),
    actionabilityStatus: canonicalValue("actionability_status"),
    requiresLogin: canonicalValue("requires_login"),
  };

  return {
    offerId,
    offerVersion: `ver_${hash(JSON.stringify(versionMaterial), 20)}`,
    category,
    serviceId,
    fields,
    canonical: Object.fromEntries(
      Object.entries(fields).map(([field, result]) => [field, result.value])
    ),
    evidenceUrls,
    conflictFields,
    observedAt: new Date(now).toISOString(),
    lastVerifiedAt: new Date(now).toISOString(),
    validFrom: canonicalValue("start_at"),
    validTo: canonicalValue("end_at"),
    versionMaterial,
  };
}

export function mergeOfferCandidates(candidates = [], now = Date.now()) {
  const groups = new Map();

  for (const candidate of candidates) {
    const identity = buildOfferIdentity({
      category: candidate.category,
      serviceId: candidate.service?.id || candidate.serviceId,
      observations: candidate.observations,
      sourceUrl: candidate.snapshot?.finalUrl || candidate.url,
    });
    if (!groups.has(identity.offerId)) {
      groups.set(identity.offerId, {
        offerId: identity.offerId,
        category: candidate.category,
        serviceId: candidate.service?.id || candidate.serviceId,
        observations: [],
        candidates: [],
      });
    }
    const group = groups.get(identity.offerId);
    group.observations.push(...candidate.observations);
    group.candidates.push(candidate);
  }

  return [...groups.values()].map((group) => ({
    ...canonicalizeOffer({
      offerId: group.offerId,
      category: group.category,
      serviceId: group.serviceId,
      observations: group.observations,
      now,
    }),
    sourceCandidates: group.candidates,
  }));
}
