import {
  ActionabilityStatus,
  DEFAULT_REVERIFY_HOURS,
  FieldState,
  OfferCategory,
  PARTNERSHIP_CRITICAL_FIELDS,
  PublishDecision,
  TRIAL_CRITICAL_FIELDS,
} from "./constants.js";

function fieldResult(offer, field) {
  return offer?.fields?.[field] || {
    field,
    value: null,
    state: FieldState.UNKNOWN,
    evidence: [],
  };
}

function verifiedValue(offer, field) {
  const result = fieldResult(offer, field);
  return result.state === FieldState.VERIFIED ? result.value : null;
}

function hasAuthoritativeEvidence(offer, field) {
  return (fieldResult(offer, field).evidence || [])
    .some((item) => Number(item.authorityScore) >= 500);
}

function currentValidity(offer, now) {
  const start = offer.validFrom ? Date.parse(`${offer.validFrom}T00:00:00+09:00`) : NaN;
  const end = offer.validTo ? Date.parse(`${offer.validTo}T23:59:59.999+09:00`) : NaN;
  if (Number.isFinite(start) && start > now) return false;
  if (Number.isFinite(end) && end < now) return false;
  return true;
}
export function freshnessStatus(offer, {
  now = Date.now(),
  reverifyHours = DEFAULT_REVERIFY_HOURS,
} = {}) {
  if (!currentValidity(offer, now)) return "INACTIVE";
  const verified = Date.parse(offer.lastVerifiedAt || offer.observedAt || "");
  if (!Number.isFinite(verified)) return "UNKNOWN";
  return now - verified <= reverifyHours * 3600_000 ? "FRESH" : "STALE";
}

function actionVerified(offer) {
  const actionStatus = verifiedValue(offer, "actionability_status");
  return [
    ActionabilityStatus.VERIFIED_ACTION,
    ActionabilityStatus.VERIFIED_ENTRYPOINT,
  ].includes(actionStatus);
}

function criticalFieldFailures(offer, fields) {
  const failures = [];
  for (const field of fields) {
    const result = fieldResult(offer, field);
    if (result.state !== FieldState.VERIFIED) {
      failures.push(`${field}:${result.state}`);
      continue;
    }
    if (!hasAuthoritativeEvidence(offer, field)) {
      failures.push(`${field}:NO_AUTHORITATIVE_EVIDENCE`);
    }
  }
  return failures;
}

export function userValueGate(offer) {
  const category = offer.category;
  if (category === OfferCategory.PARTNERSHIP_SAVING) {
    const rawPrice = verifiedValue(offer, "offer_price");
    const price = rawPrice === null || rawPrice === "" ? NaN : Number(rawPrice);
    if (!Number.isFinite(price) || price < 0) {
      return { pass: false, reason: "PARTNERSHIP_PRICE_NOT_MONETARY" };
    }
    return { pass: true, reason: null };
  }
  if (category === OfferCategory.NEW_USER_FREE_TRIAL) {
    const rawDays = verifiedValue(offer, "trial_duration_days");
    const rawCost = verifiedValue(offer, "trial_cost");
    const days = rawDays === null || rawDays === "" ? NaN : Number(rawDays);
    const cost = rawCost === null || rawCost === "" ? NaN : Number(rawCost);
    if (!Number.isFinite(days) || days <= 0 || !Number.isFinite(cost) || cost < 0) {
      return { pass: false, reason: "TRIAL_VALUE_NOT_COMPUTABLE" };
    }
    return { pass: true, reason: null };
  }
  return { pass: false, reason: "UNSUPPORTED_CATEGORY" };
}

function commonGate(offer, criticalFields, options = {}) {
  const failures = [];
  if (!offer?.offerId || !offer?.offerVersion) failures.push("OFFER_IDENTITY_MISSING");
  if ((offer.conflictFields || []).length) {
    failures.push(`UNRESOLVED_CONFLICT:${offer.conflictFields.join(",")}`);
  }
  failures.push(...criticalFieldFailures(offer, criticalFields));
  const verificationHoldReason = verifiedValue(offer, "verification_hold_reason");
  if (verificationHoldReason) {
    failures.push(`VERIFICATION_HOLD:${verificationHoldReason}`);
  }

  if (!currentValidity(offer, options.now ?? Date.now())) failures.push("OFFER_NOT_CURRENT");
  const freshness = freshnessStatus(offer, options);
  if (freshness !== "FRESH") failures.push(`FRESHNESS_${freshness}`);
  if (!actionVerified(offer)) failures.push("ACTION_NOT_VERIFIED");

  const value = userValueGate(offer);
  if (!value.pass) failures.push(value.reason);

  return {
    decision: failures.length ? PublishDecision.DO_NOT_PUBLISH : PublishDecision.PUBLISH,
    failures,
    freshness,
  };
}

export function partnershipPublishGate(offer, options = {}) {
  const fields = [...PARTNERSHIP_CRITICAL_FIELDS];
  const membership = verifiedValue(offer, "required_membership");
  if (membership) fields.push("incremental_partner_cost");

  const result = commonGate(offer, fields, options);
  const targetService = String(
    verifiedValue(offer, "target_service") || offer?.serviceId || ""
  ).trim().toLowerCase();
  const partnerId = String(verifiedValue(offer, "partner_id") || "").trim().toLowerCase();
  const externalPartnerId = partnerId && partnerId !== targetService
    ? partnerId
    : null;
  const partnershipBasis = externalPartnerId
    || verifiedValue(offer, "required_membership")
    || verifiedValue(offer, "required_carrier")
    || verifiedValue(offer, "required_card");

  if (!partnershipBasis) {
    result.failures.push("PARTNERSHIP_BASIS_UNVERIFIED");
    result.decision = PublishDecision.DO_NOT_PUBLISH;
  }
  return result;
}
export function freeTrialPublishGate(offer, options = {}) {
  return commonGate(offer, TRIAL_CRITICAL_FIELDS, options);
}

export function evaluatePublishGate(offer, options = {}) {
  if (offer?.category === OfferCategory.PARTNERSHIP_SAVING) {
    return partnershipPublishGate(offer, options);
  }
  if (offer?.category === OfferCategory.NEW_USER_FREE_TRIAL) {
    return freeTrialPublishGate(offer, options);
  }
  return {
    decision: PublishDecision.DO_NOT_PUBLISH,
    failures: ["UNSUPPORTED_CATEGORY"],
    freshness: freshnessStatus(offer || {}, options),
  };
}
