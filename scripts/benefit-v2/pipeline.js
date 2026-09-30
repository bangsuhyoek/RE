import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  buildSearchProviders,
  configuredProviderSummary,
} from "./searchProviders.js";
import {
  evaluateLiveSearchReadiness,
  runSearchDiscovery,
} from "./queryPlanner.js";
import { fetchWithOptionalRenderer, probeFirstHttpsRedirect } from "./sourceFetcher.js";
import { createPlaywrightRenderer } from "./playwrightRenderer.js";
import { buildAuthorityRegistry } from "./sourceAuthority.js";
import {
  classifyOfferCategory,
  extractDeterministicObservations,
} from "./extractor.js";
import {
  extractObservationsWithLlm,
  rankSnapshotWithLlm,
} from "./llmExtractor.js";
import { mergeOfferCandidates } from "./canonicalizer.js";
import { evaluatePublishGate } from "./publishGate.js";
import { auditGoldSetCurrency, evaluateGoldSet, loadGoldSet } from "./qualityMetrics.js";
import { assessActivePublicationReadiness, persistenceModeForRun } from "./activePublicationGate.js";
import {
  createRunId,
  createV2Store,
  finishRun,
  loadDueOffers,
  markOfferStale,
  persistDiscoveryCandidates,
  persistMetrics,
  persistOfferVersion,
  persistSnapshot,
} from "./store.js";
import { runTrackedBenefitV2 } from "./runLifecycle.js";
import { getOfficialBenefitSources } from "../crawler/officialBenefitSources.js";
import { discoverOfficialBenefits } from "../crawler/promotionDiscovery.js";
import { assessPriceEvidence, reconcileOfficialPriceReview } from "./priceEvidence.js";
import { loadCatalogGroupLesson, saveCatalogGroupLesson } from
  "./catalogGroupLessons.js";
import {
  reconcileOfficialConditionReview,
  applyOfficialConditionReview,
} from "./conditionReview.js";
import { diagnosePublicationHold } from "./holdDiagnosis.js";
import { summarizeHoldInvestigations,
  summarizeHeldConditionBundles } from "./holdInvestigation.js";
import { officialConditionLinks } from "./conditionSourceExpansion.js";
import { deriveAutomaticPriceReview } from "./autoConditionReview.js";
import { discoverOfficialPriceConditions, loadSolvedConditionRule,
  saveSolvedConditionRule, loadPendingConditionInvestigation,
  savePendingConditionInvestigation, isPriceContextHold, independentConditionAnchor,
  ruleMatchesIndependentAnchor, findReusableConditionLessons } from
  "./learnedConditionRules.js";
import { serviceCatalog } from "../../src/data/subscriptionData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.resolve(__dirname, "../../outputs/benefit-v2");
function candidateKey(url = "") {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.href.toLowerCase();
  } catch {
    return String(url || "").toLowerCase();
  }
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function memoizedLlm(cache, kind, snapshot, service, authority, compute) {
  if (!cache) return compute();
  const key = createHash("sha256").update(JSON.stringify([
    kind, snapshot.finalUrl || snapshot.url, snapshot.observedAt,
    String(snapshot.text || "").slice(0, 24_000),
    service?.id || null, service?.name || null,
    authority?.type || null, authority?.score || null,
  ])).digest("hex");
  const entries = cache[kind];
  if (entries.has(key)) {
    cache.hits[kind] += 1;
    return entries.get(key);
  }
  // Keep a pending promise as well; a future parallel candidate loop must
  // still make only one request for identical official evidence.
  const pending = Promise.resolve().then(compute);
  entries.set(key, pending);
  return pending;
}

export function candidateMergeKey(candidate = {}) {
  const url = typeof candidate === "string" ? candidate : candidate?.url;
  const variantId = typeof candidate === "string" ? "" : (candidate?.variantId || "");
  return `${candidateKey(url)}|${String(variantId).trim().toLowerCase()}`;
}

export function mergeDiscoveryCandidates(...groups) {
  const map = new Map();
  for (const group of groups.flat()) {
    if (!group?.url) continue;
    const key = candidateMergeKey(group);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        url: group.url,
        variantId: group.variantId || null,
        serviceIds: [...new Set(group.serviceIds || group.targetServiceIds || [])],
        discoveryRefs: [...(group.discoveryRefs || [])],
        revalidationOf: [...(group.revalidationOf || [])],
        trustedConstraints: { ...(group.trustedConstraints || {}) },
      });
      continue;
    }
    existing.serviceIds = [...new Set([
      ...existing.serviceIds,
      ...(group.serviceIds || group.targetServiceIds || []),
    ])];
    existing.discoveryRefs.push(...(group.discoveryRefs || []));
    existing.revalidationOf.push(...(group.revalidationOf || []));
    for (const [field, value] of Object.entries(group.trustedConstraints || {})) {
      if (value == null || value === "") continue;
      if (existing.trustedConstraints[field] == null) {
        existing.trustedConstraints[field] = value;
      } else if (existing.trustedConstraints[field] !== value) {
        existing.trustedConstraints[field] = null;
        existing.trustedConstraints[field + "Conflict"] = true;
      }
    }
  }
  return [...map.values()];
}

export function trustedCandidates(discovery = {}, sources = [], now = Date.now(),
  ruleDirectory = null) {
  return (discovery.candidates || []).map((candidate) => {
    const matchingSources = sources.filter((source) =>
      (Array.isArray(source.seedPages) ? source.seedPages : [])
        .some((seed) => seed.variantId === candidate.variantId &&
          (seed.partnerId || source.partnerId) === candidate.partnerId &&
          seed.requiredPlan === candidate.requiredPlan)
    );
    const matchingSeeds = matchingSources.flatMap((source) =>
      source.seedPages.filter((seed) => seed.variantId === candidate.variantId &&
        (seed.partnerId || source.partnerId) === candidate.partnerId &&
        seed.requiredPlan === candidate.requiredPlan)
    );
    const priceReview = matchingSeeds.length === 1 ? matchingSeeds[0].priceReview : null;
    const conditionReview = matchingSeeds.length === 1 ? matchingSeeds[0].conditionReview : null;
    const priceAssessment = priceReview ? assessPriceEvidence(priceReview, { now }) : null;
    const seedOfferPrice = optionalNumber(candidate.trustedOfferPrice);
    const hasDiscountFormula = [candidate.discountRate,
      candidate.fixedDiscountAmount, candidate.perTransactionCap,
      candidate.monthlyDiscountCap].some((value) => value != null);
    const unpricedFixedVariant = candidate.trustedEvidenceVerified === true &&
      candidate.categoryHint === "PARTNERSHIP_SAVING" &&
      candidate.suppressOfferPrice === true && seedOfferPrice == null &&
      Boolean(candidate.requiredPlan) && !hasDiscountFormula;
    const candidateUrl = candidate.sourceUrl || candidate.url;
    const matchingSeed = matchingSeeds.length === 1 &&
      candidateKey(matchingSeeds[0].url) === candidateKey(candidateUrl)
      ? matchingSeeds[0] : null;
    const lessonFamily = matchingSeed && matchingSources.length === 1 &&
      (candidate.targetServiceIds || []).length === 1 &&
      matchingSources[0].id && candidate.partnerId
      ? { sourceId: matchingSources[0].id, partnerId: candidate.partnerId,
        serviceId: candidate.targetServiceIds[0] } : null;
    const ruleIdentity = { url: candidateUrl, variantId: candidate.variantId,
      field: candidate.categoryHint === "NEW_USER_FREE_TRIAL" ? "trial_cost" : "offer_price",
      holdReason: candidate.trustedBlockReason || (unpricedFixedVariant
        ? "OFFICIAL_PRICE_CONTEXT_UNVERIFIED" : null) };
    const independentAnchor = independentConditionAnchor(candidate.requiredPlan,
      matchingSeed?.independentConditionScope);
    const cachedRule = ruleDirectory && matchingSeed &&
      candidate.trustedEvidenceVerified === true &&
      isPriceContextHold(ruleIdentity.holdReason) &&
      !priceReview && !conditionReview
      ? loadSolvedConditionRule(ruleDirectory, ruleIdentity) : null;
    const scopedRule = cachedRule && cachedRule.scope.plan === independentAnchor.plan &&
      ruleMatchesIndependentAnchor(cachedRule, independentAnchor)
      ? cachedRule : null;
    return {
      url: candidate.sourceUrl || candidate.url,
      variantId: candidate.variantId || null,
      serviceIds: candidate.targetServiceIds || [],
      discoveryRefs: [{
        provider: "TRUSTED_SOURCE",
        query: candidate.sourceListUrl || "",
        rank: 0,
        title: candidate.title,
        snippet: candidate.description,
        discoveredAt: candidate.discoveredAt,
        ...(priceAssessment ? { priceReview: {
          status: priceAssessment.status,
          holdReason: priceAssessment.holdReason,
          checks: priceAssessment.checks,
        } } : {}),
      }],
      trustedConstraints: {
        targetServiceId:
          (candidate.targetServiceIds || []).length === 1
            ? candidate.targetServiceIds[0]
            : null,
        partnerId: candidate.partnerId || null,
        partnerType: candidate.partnerType || null,
        requiredMembership: candidate.requiredMembership || null,
        requiredCarrier: candidate.requiredCarrier || null,
        requiredCard: candidate.requiredCard || null,
        requiredPlan: candidate.requiredPlan || null,
        incrementalPartnerCost: optionalNumber(candidate.requiredMembershipCost),
        incrementalPartnerCostEvidenceUrl: candidate.requiredMembershipCostEvidenceUrl || null,
        categoryHint: candidate.categoryHint || null,
        targetPlan: candidate.targetPlanHint || null,
        actionUrl: candidate.actionUrlHint || null,
        preferredPlanActionUrl: candidate.preferredPlanActionUrl || null,
        actionRequiresLogin: typeof candidate.actionRequiresLoginHint === "boolean"
          ? candidate.actionRequiresLoginHint
          : null,
        preferSourcePageActionEntrypoint:
          candidate.preferSourcePageActionEntrypoint === true,
        suppressContextualMembership: candidate.suppressContextualMembership === true,
        suppressOfferPrice: priceAssessment
          ? priceAssessment.offerPrice === null
          : candidate.suppressOfferPrice === true,
        autoPriceDiscoveryEligible: unpricedFixedVariant,
        trustedOfferPrice: priceAssessment ? priceAssessment.offerPrice : seedOfferPrice,
        trustedOfferBillingCycle: candidate.trustedOfferBillingCycle || null,
        trustedAudience: candidate.trustedAudience || null,
        trustedEndAt: candidate.trustedEndAt || null,
        trustedNewUserRule: candidate.trustedNewUserRule || null,
        trustedBlockReason: priceAssessment
          ? priceAssessment.holdReason : candidate.trustedBlockReason || null,
        priceReview,
        conditionReview,
        independentConditionScope: matchingSeed?.independentConditionScope || null,
        conditionLessonFamily: lessonFamily,
        autoPriceTarget: matchingSeed ? matchingSeed.autoPriceTarget || scopedRule : null,
        conditionAllowedOrigins: matchingSeeds.length === 1
          ? matchingSources[0].allowedOrigins || [] : [],
        priceAllowedOrigins: matchingSeeds.length === 1
          ? matchingSources[0].allowedOrigins || [] : [],
        trustedEvidenceVerified: candidate.trustedEvidenceVerified === true,
        discountRate: optionalNumber(candidate.discountRate),
        fixedDiscountAmount: optionalNumber(candidate.fixedDiscountAmount),
        perTransactionCap: optionalNumber(candidate.perTransactionCap),
        monthlyDiscountCap: optionalNumber(candidate.monthlyDiscountCap),
        monthlyDiscountCapScope: candidate.monthlyDiscountCapScope || null,
        minimumTransactionAmount: optionalNumber(candidate.minimumTransactionAmount),
        priorMonthSpendRequirement: optionalNumber(candidate.priorMonthSpendRequirement),
        monthlyTransactionLimit: optionalNumber(candidate.monthlyTransactionLimit),
        eligiblePaymentChannel: candidate.eligiblePaymentChannel || null,
        bundleOptions: Array.isArray(candidate.bundleOptions) ? candidate.bundleOptions : [],
        bundleSelectionLimit: candidate.bundleSelectionLimit ?? null,
        exclusiveGroupId: candidate.exclusiveGroupId || null,
        selectionLimit: candidate.selectionLimit ?? null,
        stackable: typeof candidate.stackable === "boolean" ? candidate.stackable : null,
        conflictsWith: Array.isArray(candidate.conflictsWith) ? candidate.conflictsWith : [],
      },
    };
  });
}
export function dueOfferCandidates(offers = [], trusted = []) {
  const rows = [];
  for (const offer of offers) {
    const urls = [
      offer.action_url,
      ...(offer.evidence_urls || []),
    ].filter(Boolean);
    for (const url of urls) {
      const current = offer.canonical_values || {};
      const matches = trusted.filter((candidate) => {
        const constraints = candidate.trustedConstraints || {};
        if (!candidate.variantId || candidateKey(candidate.url) !== candidateKey(url) ||
            candidate.serviceIds?.length !== 1 || candidate.serviceIds[0] !== offer.service_id ||
            !constraints.targetPlan || constraints.targetPlan !== current.target_plan ||
            constraints.categoryHint !== offer.category) return false;
        return [
          ["partnerId", "partner_id"],
          ["requiredMembership", "required_membership"],
          ["requiredCarrier", "required_carrier"],
          ["requiredCard", "required_card"],
          ["requiredPlan", "required_plan"],
          ["trustedAudience", "audience"],
        ].every(([key, field]) =>
          !constraints[key] || !current[field] || constraints[key] === current[field]
        );
      });
      rows.push({
        url,
        // Carry only the variant key. Current official evidence supplies all
        // trusted constraints; stored values are never reused as fresh proof.
        variantId: matches.length === 1 ? matches[0].variantId : null,
        serviceIds: [offer.service_id],
        discoveryRefs: [{
          provider: "REVALIDATION",
          query: offer.offer_id,
          rank: 0,
          title: offer.offer_id,
          snippet: "",
          discoveredAt: new Date().toISOString(),
        }],
        revalidationOf: [{
          offerId: offer.offer_id,
          offerVersion: offer.offer_version,
        }],
      });
    }
  }
  return rows;
}

function discoveryPriority(candidate = {}) {
  const refs = candidate.discoveryRefs || [];
  const trusted = refs.some((ref) => ["TRUSTED_SOURCE", "REVALIDATION"].includes(ref.provider)) ? 1000 : 0;
  const bestRank = Math.min(...refs.map((ref) => Number(ref.rank) || 9999), 9999);
  const crossProvider = new Set(refs.map((ref) => ref.provider)).size * 25;
  return trusted + crossProvider + Math.max(0, 100 - bestRank);
}

function limitCandidates(candidates, env) {
  const limit = Math.max(1, Number(env.BENEFIT_PIPELINE_MAX_CANDIDATES) || 400);
  return [...candidates]
    .sort((a, b) => discoveryPriority(b) - discoveryPriority(a))
    .slice(0, limit);
}

function operationalMetrics({
  discovered,
  fetched,
  relevant,
  canonical,
  publishable,
} = {}) {
  return {
    candidatePrecision: null,
    classificationPrecision: null,
    fieldAccuracy: null,
    canonicalValueAccuracy: null,
    actionUrlAccuracy: null,
    publishPrecision: null,
    falsePublishRate: null,
    coverage: relevant > 0 ? publishable / relevant : null,
    sampleSize: canonical,
    details: {
      discoveryCandidates: discovered,
      fetchedSnapshots: fetched,
      relevantCandidates: relevant,
      canonicalOffers: canonical,
      publishableOffers: publishable,
      note: "Precision/accuracy require an independent Gold Set and are not inferred from pipeline success.",
    },
  };
}

const ACTION_VERIFICATION_FIELDS = new Set([
  "actionability_status",
  "requires_login",
]);

export function filterLlmObservationsForTrustedConstraints(
  llmObservations = [],
  trustedConstraints = {}
) {
  const blocked = new Set();
  if (trustedConstraints.suppressOfferPrice === true) {
    blocked.add("offer_price");
    blocked.add("regular_price");
  }
  return (llmObservations || []).filter((item) =>
    item?.field && !blocked.has(item.field)
  );
}

function mergeLlmFallbackObservations(observations = [], llmObservations = []) {
  const present = new Set(
    observations
      .filter((item) => item?.field && item.value !== null && item.value !== undefined && item.value !== "")
      .map((item) => item.field)
  );
  for (const item of llmObservations || []) {
    if (!item?.field || present.has(item.field)) continue;
    observations.push(item);
    present.add(item.field);
  }
  return observations;
}

function removeObservationFields(observations = [], fields = ACTION_VERIFICATION_FIELDS) {
  for (let index = observations.length - 1; index >= 0; index -= 1) {
    if (fields.has(observations[index]?.field)) observations.splice(index, 1);
  }
}

function isAuthenticationRedirect(originalUrl, snapshot) {
  if (!snapshot?.ok) return false;
  try {
    const original = new URL(originalUrl);
    const final = new URL(snapshot.finalUrl || snapshot.url);
    if (original.href === final.href) return false;
    if (final.hostname === "accounts.kt.com" && /^\/wamui\/AthMobile\.do$/i.test(final.pathname)) return true;
    return /\/(?:login|signin|sign-in|auth|account|nidlogin(?:\.login)?)(?:\/|$|\.)/i.test(final.pathname);
  } catch {
    return false;
  }
}

// The official source must expose the exact plan-specific link. A destination
// that lands on the provider's known login host proves only the entrypoint,
// regardless of whether the login page itself returned 200 or 403.
function isVerifiedAuthBoundary(actionUrl, actionSnapshot,
  trustedConstraints = {}, primaryActionability = null, observations = []) {
  if (trustedConstraints.trustedEvidenceVerified !== true ||
      trustedConstraints.actionRequiresLogin !== true ||
      candidateKey(trustedConstraints.preferredPlanActionUrl) !== candidateKey(actionUrl) ||
      primaryActionability !== "VERIFIED_ENTRYPOINT" ||
      !observations.some((item) => item.field === "action_url" &&
        item.extractor === "DOM_RULE" && candidateKey(item.value) === candidateKey(actionUrl))) {
    return false;
  }
  try {
    const origin = new URL(actionUrl);
    const final = new URL(actionSnapshot.finalUrl);
    return origin.protocol === "https:" && final.protocol === "https:" && (
      (origin.hostname === "www.spotify.com" &&
        origin.pathname === "/kr-ko/student/verification/" &&
        final.hostname === "accounts.spotify.com" && /^\/login(?:\/|$)/i.test(final.pathname)) ||
      (origin.hostname === "m.my.kt.com" &&
        /^\/product\/s_MobilePriceView\.do$/i.test(origin.pathname) &&
        final.hostname === "accounts.kt.com" && /^\/wamui\/AthMobile\.do$/i.test(final.pathname))
    );
  } catch { return false; }
}

export function isVerifiedAuthBoundaryFailure(actionUrl, actionSnapshot,
  trustedConstraints = {}, primaryActionability = null, observations = []) {
  return actionSnapshot?.ok !== true && [401, 403].includes(actionSnapshot?.httpStatus) &&
    isVerifiedAuthBoundary(actionUrl, actionSnapshot, trustedConstraints,
      primaryActionability, observations);
}

export function isVerifiedAuthBoundarySuccess(actionUrl, actionSnapshot,
  trustedConstraints = {}, primaryActionability = null, observations = []) {
  return actionSnapshot?.ok === true &&
    isVerifiedAuthBoundary(actionUrl, actionSnapshot, trustedConstraints,
      primaryActionability, observations);
}

export function isVerifiedAuthBoundaryFirstHop(actionUrl, redirectProbe,
  trustedConstraints = {}, primaryActionability = null, observations = []) {
  return redirectProbe?.ok === true &&
    candidateKey(redirectProbe.url) === candidateKey(actionUrl) &&
    [301, 302, 303, 307, 308].includes(redirectProbe?.httpStatus) &&
    isVerifiedAuthBoundary(actionUrl, redirectProbe, trustedConstraints,
      primaryActionability, observations);
}

export function buildActionVerificationObservations({
  actionUrl,
  actionSnapshot,
  actionFacts,
  trustedConstraints = {},
  fallbackActionability = null,
  fallbackRequiresLogin = null,
} = {}) {
  if (!actionSnapshot?.ok || !actionUrl) return [];
  const authority = actionFacts?.authority || { type: "OTHER_WEB", score: 100 };
  const redirectedToAuth = isAuthenticationRedirect(actionUrl, actionSnapshot);
  const verifiedPlanLoginEntrypoint = Boolean(
    trustedConstraints.actionRequiresLogin === true &&
    trustedConstraints.preferredPlanActionUrl === actionUrl
  );
  const sourceLandingVerified = trustedConstraints.trustedEvidenceVerified === true &&
    trustedConstraints.preferSourcePageActionEntrypoint === true &&
    candidateKey(trustedConstraints.actionUrl) === candidateKey(actionUrl);
  const controlMatchesRequestedAction = !actionSnapshot.primaryAction?.url ||
    candidateKey(actionSnapshot.primaryAction.url) === candidateKey(actionUrl) ||
    sourceLandingVerified;
  // An unrelated menu or detail link on the destination page cannot prove
  // that the specifically selected URL performs the required action.
  const fetchedStatus = controlMatchesRequestedAction
    ? actionSnapshot.actionability : "UNKNOWN";
  const status = redirectedToAuth || verifiedPlanLoginEntrypoint
    ? "VERIFIED_ENTRYPOINT"
    : ["VERIFIED_ACTION", "VERIFIED_ENTRYPOINT"].includes(fetchedStatus)
      ? fetchedStatus
      : controlMatchesRequestedAction &&
        ["VERIFIED_ACTION", "VERIFIED_ENTRYPOINT"].includes(fallbackActionability)
        ? fallbackActionability
        : fetchedStatus;
  const requiresLogin = redirectedToAuth || verifiedPlanLoginEntrypoint
    ? true
    : Boolean(
        actionSnapshot.primaryAction?.requiresLogin ??
        fallbackRequiresLogin ??
        trustedConstraints.actionRequiresLogin ??
        false
      );
  const sourceUrl = actionUrl;
  const observedAt = actionSnapshot.observedAt || new Date().toISOString();

  return [
    {
      field: "actionability_status",
      value: status,
      state: "EXTRACTED",
      sourceUrl,
      observedAt,
      extractor: "ACTION_VERIFIER",
      authorityType: authority.type,
      authorityScore: authority.score,
      evidenceText: redirectedToAuth
        ? "official action entrypoint redirected to authentication"
        : String(actionSnapshot.pageType || status || ""),
    },
    {
      field: "requires_login",
      value: requiresLogin,
      state: "EXTRACTED",
      sourceUrl,
      observedAt,
      extractor: "ACTION_VERIFIER",
      authorityType: authority.type,
      authorityScore: authority.score,
      evidenceText: redirectedToAuth
        ? "authentication required before continuing"
        : String(actionSnapshot.primaryAction?.label || ""),
    },
  ];
}
export async function extractCandidate({
  candidate,
  services,
  authorityRegistry,
  env,
  fetchImpl,
  renderer,
  now,
  store,
  runId,
  candidateId,
  snapshotFetcher,
  firstRedirectProbe = null,
  llmCache,
  ruleDirectory = null,
} = {}) {
  const snapshots = [];
  const loadSnapshot = snapshotFetcher || ((url) => fetchWithOptionalRenderer(url, {
    fetchImpl,
    renderer,
    now,
  }));
  const primary = await loadSnapshot(candidate.url);
  snapshots.push(primary);
  await persistSnapshot(store, { runId, candidateId, snapshot: primary });
  if (!primary.ok) {
    return { candidate, snapshots, processed: null, reason: primary.reason };
  }

  let priceReviewResult = null;
  let priceReviewUsed = null;
  if (candidate.trustedConstraints?.priceReview) {
    const constraints = candidate.trustedConstraints;
    const options = { now, allowedOrigins: constraints.priceAllowedOrigins,
      authorityRegistry, targetServiceId: constraints.targetServiceId };
    const lesson = ruleDirectory && !constraints.priceReview.catalogJoin &&
      constraints.requiredPlan === constraints.priceReview.target?.plan
      ? loadCatalogGroupLesson(ruleDirectory, constraints.conditionLessonFamily,
        constraints.priceReview, options) : null;
    priceReviewUsed = lesson
      ? { ...constraints.priceReview, catalogJoin: lesson.catalogJoin }
      : constraints.priceReview;
    const review = await reconcileOfficialPriceReview(priceReviewUsed, {
      now,
      primarySnapshot: primary,
      allowedOrigins: constraints.priceAllowedOrigins,
      authorityRegistry,
      targetServiceId: constraints.targetServiceId,
      loadSnapshot,
      onSnapshot: async (page) => {
        await persistSnapshot(store, { runId, candidateId, snapshot: page });
        snapshots.push(page);
      },
    });
    priceReviewResult = review;
    candidate.trustedConstraints.trustedBlockReason = review.holdReason;
    candidate.trustedConstraints.suppressOfferPrice = review.offerPrice === null;
    candidate.trustedConstraints.trustedOfferPrice = review.offerPrice;
    for (const ref of candidate.discoveryRefs || []) {
      if (ref.priceReview) ref.priceReview = {
        status: review.status, holdReason: review.holdReason,
        evidenceMode: review.evidenceMode || null,
        conditions: review.conditions || [], checks: review.checks,
        lessonId: lesson?.lessonId || null,
      };
    }
  }

  let conditionReviewResult = null;
  const conditionReview = candidate.trustedConstraints?.conditionReview;
  if (conditionReview) {
    conditionReviewResult = await reconcileOfficialConditionReview(conditionReview, {
      now,
      primarySnapshot: primary,
      allowedOrigins: candidate.trustedConstraints.conditionAllowedOrigins,
      authorityRegistry,
      targetServiceId: candidate.trustedConstraints.targetServiceId,
      loadSnapshot,
      onSnapshot: async (page) => {
        await persistSnapshot(store, { runId, candidateId, snapshot: page });
        snapshots.push(page);
      },
    });
    // A resolved review removes only the hold it owns. Other source holds,
    // including an independent payment-method or action hold, remain active.
    const constraints = candidate.trustedConstraints;
    if (conditionReviewResult.status === "VERIFIED_CURRENT_CONDITION") {
      if (constraints.trustedBlockReason === conditionReview.holdReason) {
        constraints.trustedBlockReason = null;
      }
    } else if (!constraints.trustedBlockReason) {
      constraints.trustedBlockReason = conditionReview.holdReason ||
        "OFFICIAL_CONDITION_CONTEXT_UNVERIFIED";
    }
    if (conditionReview.field === "offer_price") {
      constraints.suppressOfferPrice = true;
      constraints.trustedOfferPrice = null;
    }
  }

  const deterministic = extractDeterministicObservations({
    snapshot: primary,
    services,
    hintedServiceIds: candidate.serviceIds,
    authorityRegistry,
    trustedConstraints: candidate.trustedConstraints || {},
  });
  const service = deterministic.service;
  const rank = await memoizedLlm(llmCache, "rank", primary, service, null,
    () => rankSnapshotWithLlm(primary, {
    serviceHint: service,
    env,
    fetchImpl,
    }));

  let category = deterministic.category;
  const trustedCategoryHint = candidate.trustedConstraints?.categoryHint;
  if (
    ["UNKNOWN", "IRRELEVANT"].includes(category) &&
    ["PARTNERSHIP_SAVING", "NEW_USER_FREE_TRIAL"].includes(trustedCategoryHint)
  ) {
    category = trustedCategoryHint;
  }
  if (
    ["UNKNOWN", "IRRELEVANT"].includes(category) &&
    rank?.score >= 0.8 &&
    ["PARTNERSHIP_SAVING", "NEW_USER_FREE_TRIAL"].includes(rank.category)
  ) {
    category = rank.category;
  }

  if (
    rank?.score >= 0.9 &&
    rank.category === "IRRELEVANT" &&
    !["PARTNERSHIP_SAVING", "NEW_USER_FREE_TRIAL"].includes(deterministic.category)
  ) {
    return {
      candidate,
      snapshots,
      processed: null,
      reason: "LLM_HIGH_CONFIDENCE_IRRELEVANT",
      rank,
    };
  }

  const trustedPartnerId = String(candidate.trustedConstraints?.partnerId || "")
    .trim()
    .toLowerCase();
  const targetServiceId = String(service?.id || "").trim().toLowerCase();
  if (
    category === "PARTNERSHIP_SAVING" &&
    trustedPartnerId &&
    targetServiceId &&
    trustedPartnerId === targetServiceId
  ) {
    return {
      candidate,
      snapshots,
      processed: null,
      reason: "SELF_PLAN_OPTIMIZATION_NOT_PARTNERSHIP",
      rank,
    };
  }

  if (!service || !["PARTNERSHIP_SAVING", "NEW_USER_FREE_TRIAL"].includes(category)) {
    return {
      candidate,
      snapshots,
      processed: null,
      reason: !service ? "TARGET_SERVICE_UNRESOLVED" : "OFFER_CATEGORY_UNRESOLVED",
      rank,
    };
  }
  const observations = [...deterministic.observations];
  const llm = await memoizedLlm(llmCache, "extraction", primary, service,
    deterministic.authority, () => extractObservationsWithLlm(primary, {
    targetService: service,
    authority: deterministic.authority,
    env,
    fetchImpl,
    }));
  mergeLlmFallbackObservations(
    observations,
    filterLlmObservationsForTrustedConstraints(
      llm.observations || [],
      candidate.trustedConstraints || {}
    )
  );

  const actionUrl =
    observations.find((item) => item.field === "action_url")?.value ||
    primary.primaryAction?.url ||
    candidate.trustedConstraints?.actionUrl ||
    null;
  const primaryActionability = observations.find(
    (item) => item.field === "actionability_status"
  )?.value || null;
  const primaryRequiresLogin = observations.find(
    (item) => item.field === "requires_login"
  )?.value;
  const preferredPlanActionUrl = candidate.trustedConstraints?.preferredPlanActionUrl;
  const preferredPlanLinkObserved = Boolean(preferredPlanActionUrl && observations.some(
    (item) => item.field === "action_url" && item.extractor === "DOM_RULE" &&
      candidateKey(item.value) === candidateKey(preferredPlanActionUrl)
  ));
  let authRedirectProbe = null;

  if (actionUrl && candidateKey(actionUrl) !== candidateKey(primary.finalUrl)) {
    const actionSnapshot = await loadSnapshot(actionUrl);
    snapshots.push(actionSnapshot);
    await persistSnapshot(store, { runId, candidateId, snapshot: actionSnapshot });

    const constraints = candidate.trustedConstraints || {};
    const trustedBoundary = isVerifiedAuthBoundarySuccess(actionUrl, actionSnapshot,
      constraints, primaryActionability, observations) ||
      isVerifiedAuthBoundaryFailure(actionUrl, actionSnapshot,
        constraints, primaryActionability, observations);
    if (!trustedBoundary && preferredPlanLinkObserved &&
        primaryActionability === "VERIFIED_ENTRYPOINT" &&
        typeof firstRedirectProbe === "function") {
      try {
        authRedirectProbe = await firstRedirectProbe(actionUrl);
      } catch {
        // A failed supplementary probe cannot promote the action.
        authRedirectProbe = { ok: false, reason: "PROBE_FAILED" };
      }
    }
    const verifiedAuthBoundary = trustedBoundary ||
      isVerifiedAuthBoundaryFirstHop(actionUrl, authRedirectProbe,
        constraints, primaryActionability, observations);

    if (actionSnapshot.ok) {
      if (!verifiedAuthBoundary) {
        removeObservationFields(observations);
        // A known destination URL from source configuration cannot replace a
        // missing plan-specific link on the current official page.
        if (!preferredPlanActionUrl || preferredPlanLinkObserved) {
          const actionFacts = extractDeterministicObservations({
            snapshot: actionSnapshot,
            services,
            hintedServiceIds: [service.id],
            authorityRegistry,
            trustedConstraints: {
              ...(candidate.trustedConstraints || {}),
              targetServiceId: service.id,
              targetServiceName: service.name,
            },
          });
          observations.push(...buildActionVerificationObservations({
            actionUrl,
            actionSnapshot,
            actionFacts,
            trustedConstraints: candidate.trustedConstraints || {},
            fallbackActionability: primaryActionability,
            fallbackRequiresLogin: primaryRequiresLogin,
          }));
        }
      }
    } else if (!verifiedAuthBoundary) {
      removeObservationFields(observations);
    }
  }

  // Automatic reviews require a separately scoped official variant. Only the
  // exact source hold can be cleared; other gate failures remain untouched.
  let automaticConditionResult = null;
  let conditionLearning = null;
  let automaticTarget = candidate.trustedConstraints?.autoPriceTarget;
  const constraintsForLearning = candidate.trustedConstraints || {};
  const syntheticPriceHold = Boolean(constraintsForLearning.autoPriceDiscoveryEligible &&
    !constraintsForLearning.trustedBlockReason &&
    !constraintsForLearning.priceReview);
  const holdReason = String(constraintsForLearning.trustedBlockReason ||
    (syntheticPriceHold ? "OFFICIAL_PRICE_CONTEXT_UNVERIFIED" : ""));
  const priceContextHold = isPriceContextHold(holdReason);
  const canInvestigate = !conditionReview && priceContextHold &&
    constraintsForLearning.requiredPlan &&
    constraintsForLearning.trustedEvidenceVerified && candidate.variantId &&
    Array.isArray(constraintsForLearning.conditionAllowedOrigins) &&
    constraintsForLearning.conditionAllowedOrigins.length > 0;
  // Investigate a failed explicit price review too, without letting a newly
  // found claim silently bypass that review's unresolved competing sources.
  const canDiscover = canInvestigate && !constraintsForLearning.priceReview;
  const learningIdentity = { url: candidate.url, variantId: candidate.variantId,
    field: constraintsForLearning.categoryHint === "NEW_USER_FREE_TRIAL"
      ? "trial_cost" : "offer_price", holdReason };
  const previousInvestigation = canInvestigate && ruleDirectory
    ? loadPendingConditionInvestigation(ruleDirectory, learningIdentity) : null;
  const reusableLessons = canDiscover && ruleDirectory
    ? findReusableConditionLessons(ruleDirectory, {
      lessonFamily: constraintsForLearning.conditionLessonFamily,
      url: candidate.url, variantId: candidate.variantId,
      field: learningIdentity.field, holdReason, now,
      requiredPlan: constraintsForLearning.requiredPlan,
      independentProduct: constraintsForLearning.independentConditionScope?.product,
      allowedOrigins: constraintsForLearning.conditionAllowedOrigins,
      authorityRegistry, targetServiceId: constraintsForLearning.targetServiceId,
    }) : [];
  const searchMemory = {
    proposedCombinations: [...(previousInvestigation?.proposedCombinations || []),
      ...reusableLessons.flatMap((lesson) => lesson.preferredCombinations)],
  };
  const lessonSourcesUsed = [];
  const discoveredField = constraintsForLearning.categoryHint === "NEW_USER_FREE_TRIAL"
    ? "trial_cost" : "offer_price";
  const extraConditionUrls = [];
  function learningSources() {
    return [...new Set([candidate.url,
      ...(constraintsForLearning.priceReview?.quotes || []).map((quote) => quote.sourceUrl),
      ...observations
      .filter((item) => item.field === discoveredField &&
        Number(item.authorityScore) >= 450)
      .map((item) => item.sourceUrl).filter(Boolean), ...extraConditionUrls])];
  }
  function discoverFromFetchedPages() {
    const relevantUrls = learningSources();
    const learned = discoverOfficialPriceConditions({
      candidate: { url: candidate.url, variantId: candidate.variantId,
        field: discoveredField, holdReason,
        anchor: independentConditionAnchor(constraintsForLearning.requiredPlan,
          constraintsForLearning.independentConditionScope),
        sourceUrls: relevantUrls },
      snapshots, now, authorityRegistry,
      allowedOrigins: constraintsForLearning.conditionAllowedOrigins,
      targetServiceId: constraintsForLearning.targetServiceId,
      previous: searchMemory,
    });
    conditionLearning = { status: learned.status, holdReason,
      discriminators: learned.discriminators, checkedRows: learned.checkedRows,
      analysis: learned.analysis, investigatedUrls: [...relevantUrls],
      previousInvestigationUsed: Boolean(previousInvestigation),
      reusableLessonIds: reusableLessons.map((lesson) => lesson.lessonId),
      lessonSourcesUsed: [...lessonSourcesUsed],
      ruleOrigin: "DISCOVERED" };
    if (learned.status === "VERIFIED_CURRENT_CONDITION") {
      automaticTarget = learned.target;
    }
  }
  if (!automaticTarget && canInvestigate) {
    discoverFromFetchedPages();
    // A verified earlier solution provides a search route, never a price.
    // A suggested page must itself show this variant's independently
    // registered plan and the same product before entering the claim set.
    if (canDiscover && conditionLearning.status !== "VERIFIED_CURRENT_CONDITION") {
      for (const lesson of reusableLessons) {
        for (const url of lesson.sourceUrls) {
          if (conditionLearning.status === "VERIFIED_CURRENT_CONDITION" ||
              learningSources().length >= 4 || lessonSourcesUsed.length >= 2) break;
          if (learningSources().some((known) => candidateKey(known) === candidateKey(url))) {
            continue;
          }
          try {
            const page = await loadSnapshot(url);
            await persistSnapshot(store, { runId, candidateId, snapshot: page });
            snapshots.push(page);
            const age = now - Date.parse(page.observedAt || "");
            const body = String(page.text || page.html || "");
            if (!page.ok || candidateKey(page.finalUrl || page.url) !== candidateKey(url) ||
                !Number.isFinite(age) || age < 0 || age > 7 * 86400_000 ||
                !body.includes(constraintsForLearning.requiredPlan) ||
                !body.includes(lesson.productTerm)) continue;
            extraConditionUrls.push(url);
            lessonSourcesUsed.push(url);
            discoverFromFetchedPages();
          } catch { /* A failed lesson lead cannot settle a hold. */ }
        }
      }
    }
    // At most two one-hop official leads and four total claim sources per
    // variant. A failed fetch adds no evidence; the next weekly run retries.
    const currentUrls = learningSources();
    if (conditionLearning.status !== "VERIFIED_CURRENT_CONDITION" &&
        currentUrls.length < 4) {
      const links = officialConditionLinks({ snapshots,
        existingUrls: currentUrls, requiredPlan: constraintsForLearning.requiredPlan,
        allowedOrigins: constraintsForLearning.conditionAllowedOrigins,
        authorityRegistry, targetServiceId: constraintsForLearning.targetServiceId,
        limit: Math.min(2, 4 - currentUrls.length) });
      for (const link of links) {
        try {
          const page = await loadSnapshot(link.url);
          await persistSnapshot(store, { runId, candidateId, snapshot: page });
          snapshots.push(page);
          if (!page.ok) continue;
          extraConditionUrls.push(link.url);
          discoverFromFetchedPages();
          if (conditionLearning.status === "VERIFIED_CURRENT_CONDITION") break;
        } catch { /* Missing live official page cannot settle this hold. */ }
      }
    }
  }
  if (automaticTarget && priceContextHold && !conditionReview &&
      !candidate.trustedConstraints?.priceReview &&
      (candidate.trustedConstraints.trustedBlockReason === automaticTarget.holdReason ||
        (syntheticPriceHold && automaticTarget.holdReason === holdReason))) {
    let registeredUrls = Array.isArray(automaticTarget.sourceUrls)
      ? automaticTarget.sourceUrls : [];
    if (registeredUrls.length <= 4 && registeredUrls.length > 0) {
      for (const url of registeredUrls) {
        let approved = false;
        try {
          const parsed = new URL(url);
          approved = parsed.protocol === "https:" && !parsed.username && !parsed.password &&
            candidate.trustedConstraints.conditionAllowedOrigins.includes(parsed.origin);
        } catch { /* Invalid URL keeps the hold. */ }
        if (!approved) continue;
        if (snapshots.some((page) => candidateKey(page.url) === candidateKey(url))) continue;
        try {
          const page = await loadSnapshot(url);
          await persistSnapshot(store, { runId, candidateId, snapshot: page });
          snapshots.push(page);
        } catch { /* A missing source keeps the hold. */ }
      }
    }
    automaticConditionResult = deriveAutomaticPriceReview(automaticTarget, {
      snapshots, now, authorityRegistry,
      allowedOrigins: candidate.trustedConstraints.conditionAllowedOrigins,
      targetServiceId: candidate.trustedConstraints.targetServiceId,
    });
    if (automaticConditionResult.status !== "VERIFIED_CURRENT_CONDITION" &&
        automaticTarget.ruleOrigin === "CACHE" && canDiscover) {
      discoverFromFetchedPages();
      if (conditionLearning.status === "VERIFIED_CURRENT_CONDITION") {
        registeredUrls = automaticTarget.sourceUrls;
        automaticConditionResult = deriveAutomaticPriceReview(automaticTarget, {
          snapshots, now, authorityRegistry,
          allowedOrigins: candidate.trustedConstraints.conditionAllowedOrigins,
          targetServiceId: candidate.trustedConstraints.targetServiceId,
        });
      }
    }
    const allCompetingClaimsReviewed = observations
      .filter((observation) => observation.field === automaticTarget.field &&
        Number(observation.authorityScore) >= 450)
      .every((observation) => registeredUrls.some((url) =>
        candidateKey(url) === candidateKey(observation.sourceUrl)));
    if (automaticConditionResult.status === "VERIFIED_CURRENT_CONDITION" &&
        allCompetingClaimsReviewed) {
      if (!conditionLearning) conditionLearning = {
        status: "CACHE_REVERIFIED", discriminators: automaticTarget.discriminators || [],
        checkedRows: automaticConditionResult.review?.quotes?.length || 0,
        ruleOrigin: automaticTarget.ruleOrigin || "REGISTERED" };
      candidate.trustedConstraints.trustedBlockReason = null;
      candidate.trustedConstraints.suppressOfferPrice = false;
      candidate.trustedConstraints.trustedOfferPrice = automaticConditionResult.value;
      removeObservationFields(observations, new Set([automaticTarget.field]));
      for (let index = observations.length - 1; index >= 0; index--) {
        if (observations[index].field === "verification_hold_reason" &&
            observations[index].value === automaticTarget.holdReason &&
            observations[index].extractor === "TRUSTED_SOURCE_CONFIG") {
          observations.splice(index, 1);
        }
      }
      observations.push(...applyOfficialConditionReview([], automaticConditionResult.review,
        automaticConditionResult, now));
    } else if (automaticConditionResult.status === "VERIFIED_CURRENT_CONDITION") {
      automaticConditionResult = { field: automaticTarget.field, status: "UNVERIFIED_CONTEXT",
        holdReason: automaticTarget.holdReason, value: null, evidence: null,
        checks: [{ status: "UNVERIFIED_CONTEXT", missing: ["allOfficialClaimSources"] }] };
    }
  }
  if (conditionReview && conditionReviewResult.status !== "VERIFIED_CURRENT_CONDITION") {
    observations.push({
      field: "verification_hold_reason",
      value: conditionReviewResult.holdReason || "OFFICIAL_CONDITION_CONTEXT_UNVERIFIED",
      state: "EXTRACTED",
      sourceUrl: primary.finalUrl || primary.url,
      observedAt: new Date(now).toISOString(),
      extractor: "OFFICIAL_CONDITION_REVIEW",
      authorityType: "TRUSTED_BENEFIT_SOURCE",
      authorityScore: 300,
      evidenceText: "Live official conditions were not fully verified",
    });
  }
  const reviewedObservations = conditionReview
    ? applyOfficialConditionReview(observations, conditionReview, conditionReviewResult, now)
    : observations;

  return {
    candidate,
    snapshots,
    authRedirectProbe: authRedirectProbe && {
      status: authRedirectProbe.reason,
      httpStatus: authRedirectProbe.httpStatus || null,
      finalHostPath: (() => {
        try {
          const url = new URL(authRedirectProbe.finalUrl);
          return `${url.origin}${url.pathname}`;
        } catch { return null; }
      })(),
      verified: isVerifiedAuthBoundaryFirstHop(actionUrl, authRedirectProbe,
        candidate.trustedConstraints || {}, primaryActionability, observations),
    },
    priceReviewResult,
    priceReviewUsed,
    conditionReviewResult,
    automaticConditionResult,
    conditionLearning: conditionLearning && automaticTarget
      ? { ...conditionLearning, target: automaticTarget } : conditionLearning,
    rank,
    processed: {
      category,
      service,
      observations: reviewedObservations,
      snapshot: primary,
      llmConfigured: Boolean(rank?.configured || llm?.configured),
      llmModels: [...new Set([rank?.model, llm?.model].filter(Boolean))],
      llmError: llm?.error || null,
      llmAmbiguousFields: llm?.ambiguousFields || [],
    },
    reason: null,
  };
}

export function resolveDiscoveryPolicy(env = process.env) {
  const policy = String(
    env.BENEFIT_DISCOVERY_POLICY || "UNION_VERIFY"
  ).trim().toUpperCase();
  return {
    policy,
    gateOnSearchHealth:
      policy === "DUAL_REQUIRED" ||
      String(env.BENEFIT_REQUIRE_LIVE_SEARCH || "false").toLowerCase() === "true",
  };
}

export async function runBenefitPipelineV2({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = Date.now(),
} = {}) {
  const startedAt = new Date(now).toISOString();
  const mode = String(env.BENEFIT_PIPELINE_MODE || "shadow").toLowerCase() === "active"
    ? "active"
    : "shadow";
  if (mode === "active" && env.RE_BENEFIT_V2_ALLOW_ACTIVE !== "true") {
    throw new Error("RE_BENEFIT_V2_ACTIVE_NOT_APPROVED");
  }
  const services = serviceCatalog;
  const store = createV2Store(env);
  const runId = createRunId(now);
  const providers = buildSearchProviders(env, fetchImpl);
  const providerSummary = configuredProviderSummary(providers);
  const policyState = resolveDiscoveryPolicy(env);
  const discoveryPolicy = policyState.policy;
  const requireLiveSearch = policyState.gateOnSearchHealth;
  let requiredSearchProvidersReady = false;
  return runTrackedBenefitV2({
    store,
    runId,
    mode,
    startedAt,
    providerStatus: providerSummary,
    execute: async () => {

  const errors = [];
  const ruleDirectory = path.resolve(env.BENEFIT_CONDITION_RULE_DIR ||
    path.join(REPORT_DIR, "condition-rules"));
  let searchDiscovery = {
    candidates: [],
    providerRuns: providerSummary.map((item) => ({
      provider: item.id,
      mode: item.mode,
      configured: item.configured,
      queryCount: 0,
      attemptedCalls: 0,
      successfulCalls: 0,
      resultCount: 0,
      failures: item.configured ? [] : [`${item.id}_NOT_CONFIGURED`],
    })),
    serviceCount: 0,
    liveSearch: null,
  };
  try {
    searchDiscovery = await runSearchDiscovery({
      providers,
      services,
      env,
      perQuery: Math.max(1, Math.min(Number(env.BENEFIT_SEARCH_RESULTS_PER_QUERY) || 5, 10)),
    });
  } catch (error) {
    errors.push({ stage: "SEARCH_DISCOVERY", reason: error.message });
  }
  searchDiscovery.liveSearch =
    searchDiscovery.liveSearch ||
    evaluateLiveSearchReadiness(searchDiscovery.providerRuns);
  requiredSearchProvidersReady = Boolean(searchDiscovery.liveSearch.ready);

  if (requireLiveSearch && !requiredSearchProvidersReady) {
    errors.push({
      stage: "SEARCH_DISCOVERY",
      reason: "REQUIRED_LIVE_SEARCH_NOT_VERIFIED",
      failures: searchDiscovery.liveSearch.failures,
    });
  }

  let trustedDiscovery = { candidates: [], failures: [] };
  let officialSources = [];
  try {
    officialSources = getOfficialBenefitSources(env);
    trustedDiscovery = await discoverOfficialBenefits({
      sources: officialSources,
      services,
      fetchImpl,
      now,
      timeoutMs: Math.max(1_000, Number(env.BENEFIT_FETCH_TIMEOUT_MS) || 12_000),
    });
  } catch (error) {
    errors.push({ stage: "TRUSTED_DISCOVERY", reason: error.message });
  }

  let dueOffers = [];
  try {
    dueOffers = await loadDueOffers(store, now);
  } catch (error) {
    errors.push({ stage: "REVALIDATION_LOAD", reason: error.message });
  }

  const officialCandidates = trustedCandidates(trustedDiscovery, officialSources, now,
    ruleDirectory);
  const allCandidates = mergeDiscoveryCandidates(
    searchDiscovery.candidates,
    officialCandidates,
    dueOfferCandidates(dueOffers, officialCandidates)
  );
  const candidates = limitCandidates(allCandidates, env);
  const persisted = await persistDiscoveryCandidates(store, runId, candidates);
  const persistedRows = new Map(
    (persisted.rows || []).map((row) => [
      candidateMergeKey({ url: row.url, variantId: row.variant_id || null }),
      row.candidate_id,
    ])
  );

  const rendererState = await createPlaywrightRenderer(env);
  const renderer = rendererState.configured ? rendererState.render : null;
  const snapshotCache = new Map();
  const llmCache = { rank: new Map(), extraction: new Map(),
    hits: { rank: 0, extraction: 0 } };
  const snapshotFetcher = (url) => {
    const key = candidateKey(url);
    if (!snapshotCache.has(key)) {
      snapshotCache.set(key, fetchWithOptionalRenderer(url, {
        fetchImpl,
        renderer,
        now,
        timeoutMs: Math.max(1_000, Number(env.BENEFIT_FETCH_TIMEOUT_MS) || 12_000),
      }));
    }
    return snapshotCache.get(key);
  };
  const authorityRegistry = buildAuthorityRegistry(services, env);
  const extracted = [];
  const attempts = [];
  const revalidated = new Set();

  for (const candidate of candidates) {
    const result = await extractCandidate({
      candidate,
      services,
      authorityRegistry,
      env,
      fetchImpl,
      renderer,
      now,
      store,
      runId,
      candidateId: persistedRows.get(candidateMergeKey(candidate)) || null,
      snapshotFetcher,
      firstRedirectProbe: (url) => probeFirstHttpsRedirect(url, {
        fetchImpl, now, timeoutMs: Math.max(1_000,
          Number(env.BENEFIT_FETCH_TIMEOUT_MS) || 12_000),
      }),
      llmCache,
      ruleDirectory,
    });
    attempts.push(result);

    if (result.processed) {
      extracted.push(result.processed);
      for (const tracked of candidate.revalidationOf || []) {
        revalidated.add(`${tracked.offerId}|${tracked.offerVersion}`);
      }
    }
  }

  for (const due of dueOffers) {
    const key = `${due.offer_id}|${due.offer_version}`;
    if (revalidated.has(key)) continue;
    try {
      await markOfferStale(store, due.offer_id, due.offer_version, "REVALIDATION_FAILED");
    } catch (error) {
      errors.push({
        stage: "REVALIDATION_STALE",
        offerId: due.offer_id,
        reason: error.message,
      });
    }
  }

  const canonicalOffers = mergeOfferCandidates(extracted, now);
  const reverifyHours = Math.max(1, Number(env.BENEFIT_REVERIFY_HOURS) || 24);
  const plannedOutcomes = canonicalOffers.map((offer) => {
    const baseGate = evaluatePublishGate(offer, { now, reverifyHours });
    const gate = requireLiveSearch && !requiredSearchProvidersReady
      ? {
          ...baseGate,
          decision: "DO_NOT_PUBLISH",
          failures: [...new Set([
            ...(baseGate.failures || []),
            "REQUIRED_LIVE_SEARCH_NOT_VERIFIED",
          ])],
        }
      : baseGate;
    return { offer, gate };
  });
  const activePublication = mode === "active"
    ? assessActivePublicationReadiness({
        goldSetPath: env.BENEFIT_GOLD_SET_PATH,
        qualitySamples: plannedOutcomes.map(({ offer, gate }) => ({
          offerId: offer.offerId,
          offerVersion: offer.offerVersion,
          category: offer.category,
          serviceId: offer.serviceId,
          canonical: offer.canonical,
          actionUrl: offer.canonical?.action_url || null,
          decision: gate.decision,
          gateFailures: gate.failures || [],
        })),
        now,
        priorErrors: errors,
      })
    : { allowed: false, reasons: ["SHADOW_MODE"] };
  if (mode === "active" && !activePublication.allowed) {
    errors.push({ stage: "ACTIVE_PUBLICATION_GUARD",
      reason: "ACTIVE_PUBLICATION_BLOCKED", failures: activePublication.reasons });
  }
  const persistenceMode = persistenceModeForRun(mode, activePublication);
  const outcomes = [];

  for (const { offer, gate } of plannedOutcomes) {
    let persistence = { persisted: false, reason: "SERVICE_ROLE_NOT_CONFIGURED" };
    try {
      persistence = await persistOfferVersion(store, {
        runId,
        offer,
        gate,
        mode: persistenceMode,
        reverifyHours,
      });
    } catch (error) {
      errors.push({
        stage: "OFFER_PERSIST",
        offerId: offer.offerId,
        reason: error.message,
      });
    }
    outcomes.push({ offer, gate, persistence });
    for (const attempt of attempts.filter((item) => item.processed &&
      offer.sourceCandidates.includes(item.processed) &&
      item.priceReviewResult?.evidenceMode === "CURRENT_CATALOG_GROUP_JOIN")) {
      try {
        const constraints = attempt.candidate.trustedConstraints;
        const saved = saveCatalogGroupLesson(ruleDirectory,
          constraints.conditionLessonFamily, attempt.priceReviewUsed,
          attempt.priceReviewResult, offer, gate, {
            now, allowedOrigins: constraints.priceAllowedOrigins,
            authorityRegistry, targetServiceId: constraints.targetServiceId,
          });
        for (const ref of attempt.candidate.discoveryRefs || []) {
          if (ref.priceReview) ref.priceReview.lessonSaved = saved;
        }
      } catch (error) {
        errors.push({ stage: "CATALOG_GROUP_LESSON_SAVE", offerId: offer.offerId,
          reason: error.message });
      }
    }
    {
      for (const attempt of attempts.filter((item) => item.processed &&
        offer.sourceCandidates.includes(item.processed) &&
        item.conditionLearning?.ruleOrigin === "DISCOVERED" &&
        item.automaticConditionResult?.status === "VERIFIED_CURRENT_CONDITION")) {
        try {
          const target = attempt.conditionLearning.target;
          const identity = { url: attempt.candidate.url,
            variantId: attempt.candidate.variantId, field: target.field,
            holdReason: target.holdReason,
            lessonFamily: attempt.candidate.trustedConstraints.conditionLessonFamily };
          attempt.conditionLearning.saved = saveSolvedConditionRule(ruleDirectory,
            identity, target, {
            result: attempt.automaticConditionResult, gate,
            fieldResolved: true, now,
          });
        } catch (error) {
          errors.push({ stage: "CONDITION_RULE_SAVE", offerId: offer.offerId,
            reason: error.message });
        }
      }
    }
  }
  for (const attempt of attempts.filter((item) => item.conditionLearning?.analysis)) {
    try {
      const constraints = attempt.candidate.trustedConstraints || {};
      const identity = { url: attempt.candidate.url, variantId: attempt.candidate.variantId,
        field: constraints.categoryHint === "NEW_USER_FREE_TRIAL" ? "trial_cost" : "offer_price",
        holdReason: constraints.trustedBlockReason ||
          attempt.conditionLearning.target?.holdReason ||
          attempt.conditionLearning.holdReason };
      if (attempt.conditionLearning.status !== "VERIFIED_CURRENT_CONDITION" ||
          !attempt.conditionLearning.saved) {
        attempt.conditionLearning.savedInvestigation = savePendingConditionInvestigation(
          ruleDirectory, identity, attempt.conditionLearning.analysis, { now });
      }
    } catch (error) {
      errors.push({ stage: "CONDITION_INVESTIGATION_SAVE",
        variantId: attempt.candidate.variantId, reason: error.message });
    }
  }
  const operational = operationalMetrics({
    discovered: candidates.length,
    fetched: attempts.filter((item) => item.snapshots?.some((snapshot) => snapshot.ok)).length,
    relevant: extracted.length,
    canonical: canonicalOffers.length,
    publishable: outcomes.filter((item) => item.gate.decision === "PUBLISH").length,
  });
  const qualitySamples = outcomes.map(({ offer, gate }) => ({
    offerId: offer.offerId,
    offerVersion: offer.offerVersion,
    category: offer.category,
    serviceId: offer.serviceId,
    canonical: offer.canonical,
    actionUrl: offer.canonical?.action_url || null,
    decision: gate.decision,
    gateFailures: gate.failures || [],
  }));
  let metrics = operational;
  let goldAudit = null;
  if (env.BENEFIT_GOLD_SET_PATH) {
    try {
      const goldSet = loadGoldSet(path.resolve(env.BENEFIT_GOLD_SET_PATH));
      if (goldSet) {
        goldAudit = auditGoldSetCurrency(goldSet, { now });
        if (goldAudit.status === "REVIEW_REQUIRED") {
          errors.push({ stage: "GOLD_SET_CURRENTNESS",
            reason: "EXPIRED_PUBLISH_EXPECTATION_REQUIRES_INDEPENDENT_ADJUDICATION",
            cases: goldAudit.expiredPublishExpectations });
        }
        const goldMetrics = evaluateGoldSet(goldSet, qualitySamples);
        metrics = {
          ...goldMetrics,
          details: {
            ...goldMetrics.details,
            operational: operational.details,
          },
        };
      }
    } catch (error) {
      errors.push({ stage: "GOLD_SET_EVALUATION", reason: error.message });
    }
  }

  try {
    await persistMetrics(store, runId, metrics);
  } catch (error) {
    errors.push({ stage: "METRICS_PERSIST", reason: error.message });
  }

  const searchProviderFailure = searchDiscovery.providerRuns.some(
    (item) => !item.configured || item.failures?.length
  );
  const status =
    errors.length || searchProviderFailure || (trustedDiscovery.failures || []).length
      ? "PARTIAL"
      : "SUCCESS";
  const completedAt = new Date().toISOString();
  const llmModels = [...new Set(
    attempts.flatMap((item) => [
      item.rank?.model,
      ...(item.processed?.llmModels || []),
    ]).filter(Boolean)
  )];
  const llmRankSuccessCount = attempts.filter(
    (item) => item.rank?.configured && item.rank?.score !== null && item.rank?.score !== undefined
  ).length;
  const llmExtractionSuccessCount = attempts.filter(
    (item) => item.processed?.llmConfigured && !item.processed?.llmError
  ).length;

  await finishRun(store, {
    runId,
    status,
    completedAt,
    providerStatus: searchDiscovery.providerRuns,
    metrics,
    errors: [
      ...errors,
      ...(trustedDiscovery.failures || []).map((item) => ({
        stage: "TRUSTED_DISCOVERY",
        ...item,
      })),
    ],
  });

  const report = {
    runId,
    mode,
    activePublication: { ...activePublication, persistedAs: persistenceMode },
    startedAt,
    completedAt,
    status,
    base: {
      serviceCount: services.length,
      selectedServiceCount: searchDiscovery.serviceCount,
    },
    providers: searchDiscovery.providerRuns,
    requiredSearchProvidersReady,
    discoveryPolicy,
    liveSearch: {
      required: requireLiveSearch,
      role: requireLiveSearch ? "PUBLISH_GATE" : "DISCOVERY_HEALTH",
      ...searchDiscovery.liveSearch,
    },
    renderer: {
      configured: rendererState.configured,
      reason: rendererState.reason,
    },
    llm: {
      configured: Boolean(env.GEMINI_API_KEY),
      model: llmModels.length === 1 ? llmModels[0] : null,
      models: llmModels,
      rankSuccessCount: llmRankSuccessCount,
      extractionSuccessCount: llmExtractionSuccessCount,
      cache: { ...llmCache.hits, uniqueRankRequests: llmCache.rank.size,
        uniqueExtractionRequests: llmCache.extraction.size },
    },
    counts: {
      discovered: allCandidates.length,
      processed: candidates.length,
      fetched: attempts.filter((item) => item.snapshots?.some((snapshot) => snapshot.ok)).length,
      relevant: extracted.length,
      canonical: canonicalOffers.length,
      publishable: outcomes.filter((item) => item.gate.decision === "PUBLISH").length,
      blocked: outcomes.filter((item) => item.gate.decision !== "PUBLISH").length,
      dueRevalidation: dueOffers.length,
      revalidated: revalidated.size,
    },
    priceReconciliations: attempts
      .filter((item) => item.candidate.trustedConstraints?.priceReview)
      .map((item) => ({
        variantId: item.candidate.variantId,
        sourceUrl: item.candidate.url,
        ...((item.candidate.discoveryRefs || [])
          .find((ref) => ref.priceReview)?.priceReview || {
          status: "UNVERIFIED_CONTEXT",
          holdReason: "OFFICIAL_PRICE_CONTEXT_UNVERIFIED",
          checks: [],
        }),
      })),
    conditionReconciliations: attempts
      .filter((item) => item.candidate.trustedConstraints?.conditionReview)
      .map((item) => ({
        variantId: item.candidate.variantId,
        sourceUrl: item.candidate.url,
        field: item.candidate.trustedConstraints.conditionReview.field,
        offerIds: canonicalOffers.filter((offer) => offer.sourceCandidates.some((source) =>
          source === item.processed
        )).map((offer) => offer.offerId),
        ...(item.conditionReviewResult || {
          status: "UNVERIFIED_CONTEXT", holdReason: "OFFICIAL_CONDITION_CONTEXT_UNVERIFIED",
          value: null, checks: [],
        }),
      })),
    automaticConditionReconciliations: attempts
      .filter((item) => item.automaticConditionResult)
      .map((item) => ({ variantId: item.candidate.variantId,
        sourceUrl: item.candidate.url,
        field: item.automaticConditionResult.field,
        status: item.automaticConditionResult.status,
        checks: item.automaticConditionResult.checks,
        evidence: item.automaticConditionResult.evidence || null,
      })),
    actionSelectionAudit: attempts
      .filter((item) => item.processed &&
        item.candidate.trustedConstraints?.trustedEvidenceVerified === true)
      .map((item) => {
        const selected = item.processed.observations.find((entry) =>
          entry.field === "action_url");
        const status = item.processed.observations.find((entry) =>
          entry.field === "actionability_status");
        return { variantId: item.candidate.variantId,
          sourceUrl: item.candidate.url,
          registeredActionUrl: item.candidate.trustedConstraints.actionUrl || null,
          selectedActionUrl: selected?.value || null,
          verifiedStatus: status?.value || null,
          extractor: selected?.extractor || null,
          actionStatusAuthority: status?.authorityScore || null,
          actionStatusSource: status?.sourceUrl || null,
          authRedirectProbe: item.authRedirectProbe || null,
        };
      }),
    learnedConditionRules: attempts
      .filter((item) => item.conditionLearning)
      .map((item) => ({ variantId: item.candidate.variantId,
        sourceUrl: item.candidate.url,
        status: item.conditionLearning.status,
        ruleOrigin: item.conditionLearning.ruleOrigin,
        discriminators: item.conditionLearning.discriminators,
        checkedRows: item.conditionLearning.checkedRows,
        saved: item.conditionLearning.saved === true,
        savedInvestigation: item.conditionLearning.savedInvestigation === true,
        previousInvestigationUsed: item.conditionLearning.previousInvestigationUsed === true,
        reusableLessonIds: item.conditionLearning.reusableLessonIds || [],
        lessonSourcesUsed: item.conditionLearning.lessonSourcesUsed || [],
        investigatedUrls: item.conditionLearning.investigatedUrls,
        analysis: item.conditionLearning.analysis,
      })),
    holdDiagnoses: outcomes
      .filter(({ gate }) => gate.decision !== "PUBLISH")
      .map(({ offer, gate }) => diagnosePublicationHold({ offer, gate })),
    holdInvestigations: summarizeHoldInvestigations(outcomes, attempts),
    heldConditionBundles: summarizeHeldConditionBundles(outcomes, attempts),
    goldAudit,
    metrics,
    qualitySamples,
    errors: [
      ...errors,
      ...(trustedDiscovery.failures || []).map((item) => ({
        stage: "TRUSTED_DISCOVERY",
        ...item,
      })),
    ],
    outcomes: outcomes.map(({ offer, gate, persistence }) => ({
      offerId: offer.offerId,
      offerVersion: offer.offerVersion,
      category: offer.category,
      serviceId: offer.serviceId,
      actionUrl: offer.canonical?.action_url || null,
      decision: gate.decision,
      failures: gate.failures,
      freshness: gate.freshness,
      publishState: persistence.publishState || null,
    })),
    skipped: attempts
      .filter((item) => !item.processed)
      .slice(0, 100)
      .map((item) => ({
        url: item.candidate.url,
        reason: item.reason,
        llmRank: item.rank || null,
      })),
  };

  if (String(env.BENEFIT_REPORT_WRITE || "true").toLowerCase() !== "false") {
    const reportDir = env.BENEFIT_REPORT_DIR
      ? path.resolve(env.BENEFIT_REPORT_DIR)
      : REPORT_DIR;
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(
      path.join(reportDir, "latest-report.json"),
      JSON.stringify(report, null, 2),
      "utf8"
    );
  }

  return report;
    },
  });
}
