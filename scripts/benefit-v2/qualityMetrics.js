import fs from "node:fs";

function stable(value) {
  if (value === undefined) return "undefined";
  if (value && typeof value === "object") {
    return JSON.stringify(value, Object.keys(value).sort());
  }
  return JSON.stringify(value);
}

function stableField(field, value) {
  if (field === "bundle_options" && Array.isArray(value)) {
    return JSON.stringify(value.map(identityText).sort());
  }
  return stable(value);
}

function ratio(num, den) {
  return den > 0 ? num / den : null;
}

function identityText(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function identityIdentifier(value) {
  return identityText(value).replace(/[^a-z0-9가-힣]+/g, "");
}

function samplePartner(sample = {}) {
  const canonical = sample.canonical || {};
  return canonical.partner_id
    || canonical.required_membership
    || canonical.required_carrier
    || canonical.required_card
    || "";
}

function identityMatches(match = {}, sample = {}) {
  const canonical = sample.canonical || {};
  if (match.offerVersion && identityText(sample.offerVersion) !== identityText(match.offerVersion)) return false;
  if (match.serviceId && identityText(sample.serviceId) !== identityText(match.serviceId)) return false;
  if (match.category && identityText(sample.category) !== identityText(match.category)) return false;
  if (match.target_plan && identityText(canonical.target_plan) !== identityText(match.target_plan)) return false;
  if (match.partner && identityIdentifier(samplePartner(sample)) !== identityIdentifier(match.partner)) return false;
  if (
    match.required_plan &&
    identityIdentifier(canonical.required_plan) !== identityIdentifier(match.required_plan)
  ) return false;
  if (match.eligibility) {
    const eligibility = canonical.new_user_rule || canonical.audience || "";
    if (identityText(eligibility) !== identityText(match.eligibility)) return false;
  }
  if (match.valid_from && identityText(canonical.start_at || sample.validFrom) !== identityText(match.valid_from)) return false;
  if (match.valid_to && identityText(canonical.end_at || sample.validTo) !== identityText(match.valid_to)) return false;
  return true;
}

function findGoldSample(gold, samples, actualById) {
  if (gold.offerId && actualById.has(gold.offerId)) {
    return { actual: actualById.get(gold.offerId), matchedBy: "offerId", ambiguous: false };
  }
  if (!gold.match || typeof gold.match !== "object") {
    return { actual: null, matchedBy: null, ambiguous: false };
  }

  const matches = samples.filter((sample) => identityMatches(gold.match, sample));
  if (matches.length === 1) {
    return { actual: matches[0], matchedBy: "identity", ambiguous: false };
  }
  return { actual: null, matchedBy: null, ambiguous: matches.length > 1 };
}

export function loadGoldSet(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || !Array.isArray(parsed.cases)) {
    throw new Error("BENEFIT_GOLD_SET_MUST_BE_ARRAY_OR_CASE_OBJECT");
  }
  if (parsed.case_count != null && Number(parsed.case_count) !== parsed.cases.length) {
    throw new Error("BENEFIT_GOLD_SET_CASE_COUNT_MISMATCH");
  }

  const include = (target, field, value) => {
    if (value === null || value === undefined || value === "") return;
    if (Array.isArray(value) && value.length === 0) return;
    target[field] = value;
  };
  return parsed.cases.map((item) => {
    const fields = {};
    include(fields, "target_service", item.service_id);
    include(fields, "partner_id", item.partner_id);
    include(fields, "target_plan", item.target_plan);
    include(fields, "audience", item.audience);
    include(fields, "required_membership", item.required_membership);
    include(fields, "required_carrier", item.required_carrier);
    include(fields, "required_plan", item.required_plan);
    include(fields, "required_card", item.required_card);
    include(fields, "offer_price", item.offer_price);
    include(fields, "offer_billing_cycle", item.billing_cycle);
    include(fields, "trial_duration_days", item.trial_duration_days);
    include(fields, "trial_cost", item.trial_cost);
    include(fields, "post_trial_price", item.post_trial_price);
    include(fields, "start_at", item.start_at);
    include(fields, "end_at", item.end_at);
    include(fields, "bundle_options", item.bundle_options);
    include(fields, "bundle_selection_limit", item.bundle_selection_limit);

    const match = {
      serviceId: item.service_id,
      category: item.category,
      partner: item.partner_id,
    };
    if (item.target_plan && !item.required_plan) match.target_plan = item.target_plan;
    if (item.required_plan) match.required_plan = item.required_plan;

    return {
      caseId: item.id,
      match,
      category: item.category,
      fields,
      actionUrl: item.action_url || null,
      publish: item.expected_publish === true,
      // Historical labels remain immutable. A current-run audit must flag
      // labels whose own expiry is already in the past before using coverage.
      validTo: item.end_at || null,
      verifiedAt: item.verified_at || null,
      expectedBlockReason: item.expected_block_reason || null,
      officialEvidenceUrl: item.official_evidence_url || null,
    };
  });
}

export function auditGoldSetCurrency(goldSet = [], { now = Date.now() } = {}) {
  const expiredPublishExpectations = [];
  for (const item of goldSet) {
    if (item.publish !== true || !/^20\d{2}-\d{2}-\d{2}$/.test(item.validTo || "")) continue;
    const expiry = Date.parse(`${item.validTo}T23:59:59.999+09:00`);
    if (Number.isFinite(expiry) && expiry < now) {
      expiredPublishExpectations.push({ caseId: item.caseId || item.offerId || null,
        validTo: item.validTo, verifiedAt: item.verifiedAt || null });
    }
  }
  return { status: expiredPublishExpectations.length ? "REVIEW_REQUIRED" : "CURRENT",
    expiredPublishExpectations };
}

export function evaluateGoldSet(goldSet = [], samples = []) {
  const actualById = new Map(samples.map((item) => [item.offerId, item]));
  let categoryTotal = 0;
  let categoryCorrect = 0;
  let fieldTotal = 0;
  let fieldCorrect = 0;
  let actionTotal = 0;
  let actionCorrect = 0;
  let expectedPublish = 0;
  let actualPublish = 0;
  let truePublish = 0;
  let falsePublish = 0;
  let matched = 0;
  let identityMatched = 0;
  let ambiguousMatches = 0;
  const caseResults = [];

  for (const gold of goldSet) {
    const resolved = findGoldSample(gold, samples, actualById);
    const actual = resolved.actual;
    if (gold.publish === true) expectedPublish += 1;
    if (resolved.ambiguous) ambiguousMatches += 1;
    if (!actual) {
      caseResults.push({
        caseId: gold.caseId || gold.offerId || null,
        status: resolved.ambiguous ? "AMBIGUOUS_IDENTITY" : "NO_CANONICAL_MATCH",
        matchedBy: null,
        expectedPublish: gold.publish === true,
        expectedBlockReason: gold.expectedBlockReason || null,
      });
      continue;
    }
    matched += 1;
    if (resolved.matchedBy === "identity") identityMatched += 1;

    const mismatches = [];
    if (gold.category) {
      categoryTotal += 1;
      if (actual.category === gold.category) categoryCorrect += 1;
      else mismatches.push(`category:${stable(actual.category)}!=${stable(gold.category)}`);
    }

    for (const [field, expected] of Object.entries(gold.fields || {})) {
      fieldTotal += 1;
      if (stableField(field, actual.canonical?.[field]) === stableField(field, expected)) {
        fieldCorrect += 1;
      }
      else mismatches.push(`${field}:${stable(actual.canonical?.[field])}!=${stable(expected)}`);
    }

    if (gold.actionUrl) {
      actionTotal += 1;
      if (actual.actionUrl === gold.actionUrl) actionCorrect += 1;
      else mismatches.push(`action_url:${stable(actual.actionUrl)}!=${stable(gold.actionUrl)}`);
    }
    const published = actual.decision === "PUBLISH";
    if (published) {
      actualPublish += 1;
      if (gold.publish === true) truePublish += 1;
      else falsePublish += 1;
    }
    if (published !== (gold.publish === true)) {
      mismatches.push(`publish:${published}!=${gold.publish === true}`);
    }
    caseResults.push({
      caseId: gold.caseId || gold.offerId || null,
      status: mismatches.length ? "MISMATCH" : "MATCH",
      matchedBy: resolved.matchedBy,
      offerId: actual.offerId || null,
      expectedPublish: gold.publish === true,
      actualPublish: published,
      expectedBlockReason: gold.expectedBlockReason || null,
      gateFailures: actual.gateFailures || [],
      mismatches,
    });
  }

  return {
    candidatePrecision: null,
    discoveryRecall: ratio(matched, goldSet.length),
    classificationPrecision: ratio(categoryCorrect, categoryTotal),
    fieldAccuracy: ratio(fieldCorrect, fieldTotal),
    canonicalValueAccuracy: ratio(fieldCorrect, fieldTotal),
    actionUrlAccuracy: ratio(actionCorrect, actionTotal),
    publishPrecision: ratio(truePublish, actualPublish),
    falsePublishRate: ratio(falsePublish, actualPublish),
    coverage: ratio(truePublish, expectedPublish),
    sampleSize: goldSet.length,
    details: {
      goldSetSize: goldSet.length,
      matched,
      identityMatched,
      ambiguousMatches,
      categoryTotal,
      fieldTotal,
      actionTotal,
      expectedPublish,
      actualPublish,
      truePublish,
      falsePublish,
      caseResults,
      misses: caseResults.filter((item) => item.status !== "MATCH"),
      note: "Candidate precision needs a separately labelled discovery-candidate set.",
    },
  };
}
