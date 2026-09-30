import test from "node:test";
import assert from "node:assert/strict";
import {
  createGoogleSearchProvider,
  createNaverSearchProvider,
} from "../scripts/benefit-v2/searchProviders.js";
import {
  evaluateLiveSearchReadiness,
  runSearchDiscovery,
} from "../scripts/benefit-v2/queryPlanner.js";
import { classifyPage } from "../scripts/benefit-v2/sourceFetcher.js";
import {
  classifyOfferCategory,
  extractDeterministicObservations,
  resolveTargetService,
} from "../scripts/benefit-v2/extractor.js";
import {
  buildActionVerificationObservations,
  candidateMergeKey,
  dueOfferCandidates,
  filterLlmObservationsForTrustedConstraints,
  mergeDiscoveryCandidates,
  resolveDiscoveryPolicy,
  trustedCandidates,
} from "../scripts/benefit-v2/pipeline.js";
import { assessPriceEvidence, reconcileOfficialPriceReview } from "../scripts/benefit-v2/priceEvidence.js";
import { discoverOfficialBenefits } from "../scripts/crawler/promotionDiscovery.js";
import { OFFICIAL_BENEFIT_SOURCES } from "../scripts/crawler/officialBenefitSources.js";
import {
  extractObservationsWithLlm,
  rankSnapshotWithLlm,
} from "../scripts/benefit-v2/llmExtractor.js";
import {
  canonicalizeOffer,
  buildOfferIdentity,
  mergeOfferCandidates,
} from "../scripts/benefit-v2/canonicalizer.js";
import { evaluatePublishGate } from "../scripts/benefit-v2/publishGate.js";
import {
  assessPartnershipOffer,
  assessFreeTrialOffer,
} from "../src/features/benefits/domain/v2OfferEvaluation.js";
import {
  mapV2PublicOffer,
} from "../src/features/benefits/api/v2PublishedOffers.js";
import { loadBenefitRecommendations } from "../src/features/benefits/api/benefitRecommendationLoader.js";
import {
  buildV2RecommendationViewModel,
  summarizePublishedConfirmedSavings,
} from "../src/features/benefits/presentation/recommendationViewModel.js";
import {
  benefitFetchSuccess,
} from "../src/features/benefits/api/fetchState.js";
import { persistDiscoveryCandidates, persistSnapshot } from "../scripts/benefit-v2/store.js";

const NOW = Date.parse("2026-09-21T05:00:00+09:00");
const observedAt = new Date(NOW).toISOString();

test("Spotify official seeds absorb only matching due revalidations", () => {
  const premiumUrl = "https://www.spotify.com/kr-ko/premium/";
  const trusted = [{
    url: premiumUrl,
    variantId: "spotify-individual-1m-trial",
    serviceIds: ["spotify"],
    discoveryRefs: [{ provider: "TRUSTED_SOURCE" }],
    trustedConstraints: {
      targetPlan: "개인", categoryHint: "NEW_USER_FREE_TRIAL",
      partnerId: "spotify", trustedAudience: "NEW",
    },
  }];
  const due = ["old-personal", "old-personal-duplicate"].map((offer_id) => ({
    offer_id,
    offer_version: "v1",
    service_id: "spotify",
    category: "NEW_USER_FREE_TRIAL",
    action_url: "https://www.spotify.com/kr-ko/signup/",
    evidence_urls: [premiumUrl],
    canonical_values: { target_plan: "개인", post_trial_price: 6600 },
  }));
  const merged = mergeDiscoveryCandidates(trusted, dueOfferCandidates(due, trusted));
  const premium = merged.filter((candidate) => candidate.url === premiumUrl);
  assert.equal(premium.length, 1, "a repeated official page creates one extraction candidate");
  assert.equal(premium[0].variantId, trusted[0].variantId);
  assert.deepEqual(new Set(premium[0].revalidationOf.map((item) => item.offerId)),
    new Set(["old-personal", "old-personal-duplicate"]));
  assert.equal(premium[0].trustedConstraints.targetPlan, "개인");
  assert.equal(premium[0].trustedConstraints.postTrialPrice, undefined,
    "old prices cannot become fresh trusted evidence");

  const mismatched = { ...due[0], offer_id: "student", canonical_values: { target_plan: "학생" } };
  assert.equal(dueOfferCandidates([mismatched], trusted).find((item) => item.url === premiumUrl).variantId, null,
    "another plan cannot inherit the individual's official seed");
  const conflicting = { ...due[0], offer_id: "existing", canonical_values: { target_plan: "개인", audience: "EXISTING" } };
  assert.equal(dueOfferCandidates([conflicting], trusted).find((item) => item.url === premiumUrl).variantId, null,
    "an explicit audience mismatch cannot be aligned");
  assert.equal(dueOfferCandidates([due[0]], [trusted[0], {
    ...trusted[0], variantId: "second-variant",
  }]).find((item) => item.url === premiumUrl).variantId, null,
    "two possible official variants must remain separate");
});

function observation(field, value, authorityScore = 600, sourceUrl = "https://official.example/offer") {
  return {
    field,
    value,
    state: "EXTRACTED",
    sourceUrl,
    observedAt,
    extractor: "TEST",
    authorityType: "OFFICIAL_ACTION",
    authorityScore,
    evidenceText: String(value),
  };
}

test("NAVER API HUB provider uses the verified API HUB hostname and discovery-only result", async () => {
  let captured;
  const fetchImpl = async (url, options) => {
    captured = { url: String(url), options };
    return new Response(JSON.stringify({
      items: [{ title: "혜택", description: "발견용 설명", link: "https://partner.example/apply" }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const provider = createNaverSearchProvider({
    NAVER_SEARCH_API_KEY_ID: "id",
    NAVER_SEARCH_API_KEY: "key",
  }, fetchImpl);
  const result = await provider.search("Spotify 제휴 할인", { display: 1 });
  assert.equal(provider.mode, "API_HUB");
  assert.match(captured.url, /^https:\/\/naverapihub\.apigw\.ntruss\.com\/search\/v1\/webkr/);
  assert.equal(captured.options.headers["X-NCP-APIGW-API-KEY-ID"], "id");
  assert.equal(result.items[0].url, "https://partner.example/apply");
});
test("Google provider builds Custom Search request and normalizes URL candidates", async () => {
  let captured = "";
  const provider = createGoogleSearchProvider({
    GOOGLE_SEARCH_API_KEY: "g-key",
    GOOGLE_SEARCH_CX: "cx-id",
  }, async (url) => {
    captured = String(url);
    return new Response(JSON.stringify({
      items: [{ title: "Trial", snippet: "discovery", link: "https://service.example/trial?utm_source=x" }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  });
  const result = await provider.search("서비스 무료체험", { display: 1 });
  assert.match(captured, /^https:\/\/customsearch\.googleapis\.com\/customsearch\/v1/);
  assert.match(captured, /cx=cx-id/);
  assert.equal(result.items[0].url, "https://service.example/trial");
});

test("NAVER and Google duplicate URLs collapse into one candidate with both refs", async () => {
  const makeProvider = (id) => ({
    id,
    mode: "TEST",
    configured: true,
    search: async (query) => ({
      items: [{ provider: id, query, rank: 1, url: "https://same.example/offer", title: id, snippet: "" }],
      error: null,
    }),
  });
  const result = await runSearchDiscovery({
    providers: [makeProvider("NAVER"), makeProvider("GOOGLE")],
    services: [{ id: "spotify", name: "Spotify", plan: "Premium" }],
    perQuery: 1,
  });
  assert.equal(result.candidates.length, 1);
  assert.deepEqual(new Set(result.candidates[0].discoveryRefs.map((x) => x.provider)), new Set(["NAVER", "GOOGLE"]));
});
test("real action controls pass while FAQ-only pages do not", () => {
  const actionable = classifyPage({
    ok: true,
    finalUrl: "https://partner.example/event",
    text: "Spotify 할인",
    actionCandidates: [{
      label: "혜택 받기",
      url: "https://partner.example/apply",
      requiresLogin: false,
      infoLike: false,
    }],
  });
  assert.equal(actionable.actionability, "VERIFIED_ACTION");

  const info = classifyPage({
    ok: true,
    finalUrl: "https://partner.example/faq/spotify",
    text: "혜택에 대한 설명",
    actionCandidates: [],
  });
  assert.equal(info.actionability, "INFO_ONLY");
});

test("offer identity separates otherwise-similar campaigns with different periods", () => {
  const common = [
    observation("target_plan", "Premium"),
    observation("audience", "EXISTING_OR_ALL"),
    observation("required_membership", "NAVER Plus"),
  ];
  const a = buildOfferIdentity({
    category: "PARTNERSHIP_SAVING",
    serviceId: "spotify",
    observations: [...common, observation("start_at", "2026-09-01"), observation("end_at", "2026-09-30")],
  });
  const b = buildOfferIdentity({
    category: "PARTNERSHIP_SAVING",
    serviceId: "spotify",
    observations: [...common, observation("start_at", "2026-10-01"), observation("end_at", "2026-10-31")],
  });
  assert.notEqual(a.offerId, b.offerId);
});
test("canonicalization blocks equal-authority price conflicts", () => {
  const offer = canonicalizeOffer({
    offerId: "off_conflict",
    category: "PARTNERSHIP_SAVING",
    serviceId: "spotify",
    observations: [
      observation("offer_price", 8900, 550, "https://spotify.example/a"),
      observation("offer_price", 9900, 550, "https://spotify.example/b"),
    ],
    now: NOW,
  });
  assert.equal(offer.fields.offer_price.state, "CONFLICT");
  assert.equal(offer.canonical.offer_price, null);
});

test("unequal official authority cannot silently choose one disputed price", () => {
  const first = { ...observation("offer_price", 4000, 550, "https://official.example/a"),
    authorityType: "OFFICIAL_SERVICE" };
  const second = { ...observation("offer_price", 4450, 500, "https://official.example/b"),
    authorityType: "OFFICIAL_PARTNER" };
  const offer = canonicalizeOffer({
    offerId: "off_official_price_dispute", category: "PARTNERSHIP_SAVING",
    serviceId: "youtube", observations: [first, second], now: NOW,
  });
  assert.equal(offer.fields.offer_price.state, "CONFLICT");
  assert.equal(offer.canonical.offer_price, null);
  assert.equal(evaluatePublishGate(offer, { now: NOW }).decision, "DO_NOT_PUBLISH");
});

function verifiedPartnershipOffer() {
  const observations = [
    observation("target_service", "spotify"),
    observation("target_plan", "Premium"),
    observation("partner_id", "naverplus"),
    observation("offer_price", 4900),
    observation("audience", "EXISTING_OR_ALL"),
    observation("action_url", "https://official.example/apply"),
    observation("actionability_status", "VERIFIED_ACTION"),
  ];
  return canonicalizeOffer({
    offerId: "off_valid",
    category: "PARTNERSHIP_SAVING",
    serviceId: "spotify",
    observations,
    now: NOW,
  });
}

test("publish gate requires authoritative core facts and verified action", () => {
  const offer = verifiedPartnershipOffer();
  assert.equal(evaluatePublishGate(offer, { now: NOW }).decision, "PUBLISH");

  const weak = canonicalizeOffer({
    offerId: "off_weak",
    category: "PARTNERSHIP_SAVING",
    serviceId: "spotify",
    observations: [
      observation("target_service", "spotify", 100),
      observation("target_plan", "Premium", 100),
      observation("offer_price", 4900, 100),
      observation("audience", "EXISTING_OR_ALL", 100),
      observation("action_url", "https://blog.example/apply", 100),
      observation("actionability_status", "VERIFIED_ACTION", 100),
    ],
    now: NOW,
  });
  const decision = evaluatePublishGate(weak, { now: NOW });
  assert.equal(decision.decision, "DO_NOT_PUBLISH");
  assert.ok(decision.failures.some((x) => x.includes("NO_AUTHORITATIVE_EVIDENCE")));
});
test("partnership calculator counts required membership cost exactly once", () => {
  const offer = {
    category: "PARTNERSHIP_SAVING",
    serviceId: "spotify",
    canonical: {
      target_plan: "Premium",
      offer_price: 0,
      offer_billing_cycle: "MONTHLY",
      required_membership: "NAVER Plus",
      incremental_partner_cost: 4900,
      incremental_required_cost: 0,
      comparison_window_months: 1,
    },
  };
  const assessment = assessPartnershipOffer(
    offer,
    [{ id: "spotify", serviceId: "spotify", plan: "Premium", amount: 11900, billingCycle: "매월", status: "active" }],
    {}
  );
  assert.equal(assessment.candidateCost, 4900);
  assert.equal(assessment.netSaving, 7000);
});

test("already-owned required membership has zero incremental partner cost", () => {
  const offer = {
    category: "PARTNERSHIP_SAVING",
    serviceId: "spotify",
    canonical: {
      target_plan: "Premium",
      offer_price: 0,
      required_membership: "naverplus",
      incremental_partner_cost: 4900,
    },
  };
  const assessment = assessPartnershipOffer(offer, [
    { id: "spotify", serviceId: "spotify", plan: "Premium", amount: 11900, status: "active" },
    { id: "naverplus", serviceId: "naverplus", plan: "멤버십", amount: 4900, status: "active" },
  ]);
  assert.equal(assessment.incrementalPartnerCost, 0);
  assert.equal(assessment.netSaving, 11900);
});

test("plan downgrade is never promoted to confirmed saving", () => {
  const assessment = assessPartnershipOffer({
    category: "PARTNERSHIP_SAVING",
    serviceId: "netflix",
    planEquivalence: "DOWNGRADE",
    canonical: { target_plan: "광고형", offer_price: 5000 },
  }, [{ id: "netflix", serviceId: "netflix", plan: "Premium", amount: 17000, status: "active" }]);
  assert.equal(assessment.status, "UNKNOWN");
  assert.equal(assessment.reason, "PLAN_DOWNGRADE");
});
test("free trial keeps user eligibility UNKNOWN when history is unavailable", () => {
  const assessment = assessFreeTrialOffer({
    category: "NEW_USER_FREE_TRIAL",
    serviceId: "spotify",
    canonical: {
      trial_duration_days: 90,
      trial_cost: 0,
      post_trial_price: 11900,
      regular_price: 11900,
      auto_renewal: true,
      new_user_rule: "NEW_USER_ONLY",
    },
  }, [], {});
  assert.equal(assessment.status, "FREE_TRIAL");
  assert.equal(assessment.eligibility, "UNKNOWN");
  assert.equal(assessment.reason, "NEW_USER_STATUS_UNKNOWN");
  assert.equal(assessment.trialValue, 35700);
});

test("V2 DB row mapper preserves action/freshness/exclusivity metadata", () => {
  const mapped = mapV2PublicOffer({
    offer_id: "off1",
    offer_version: "v1",
    category: "PARTNERSHIP_SAVING",
    service_id: "spotify",
    canonical_values: { offer_price: 0 },
    action_url: "https://official.example/apply",
    freshness_status: "FRESH",
    exclusive_group_id: "choice1",
    selection_limit: 1,
    stackable: false,
  });
  assert.equal(mapped.actionUrl, "https://official.example/apply");
  assert.equal(mapped.exclusiveGroupId, "choice1");
  assert.equal(mapped.stackable, false);
});

test("feature flag alone cannot suppress existing benefits without reviewed V2 routes", async () => {
  const v2Offer = {
    offerId: "off_v2",
    offerVersion: "ver1",
    category: "NEW_USER_FREE_TRIAL",
    serviceId: "spotify",
    canonical: {
      target_plan: "Premium",
      trial_duration_days: 90,
      trial_cost: 0,
      post_trial_price: 11900,
      regular_price: 11900,
      auto_renewal: true,
      new_user_rule: "NEW_USER_ONLY",
      action_url: "https://official.example/trial",
    },
    actionUrl: "https://official.example/trial",
    freshnessStatus: "FRESH",
  };
  const existing = { id: "old-spotify", title: "Existing Spotify benefit",
    targetServiceIds: ["spotify"], sourceUrl: "https://official.example/old" };
  let v2Reads = 0;
  const v2 = await loadBenefitRecommendations({
    subscriptions: [],
    legacyFetcher: async () => benefitFetchSuccess([existing], "legacy"),
    v7Fetcher: async () => benefitFetchSuccess([], "v7"),
    v2Fetcher: async () => {
      v2Reads += 1;
      return benefitFetchSuccess([v2Offer], "benefit_v2_public_offers");
    },
    pipelineFlagFetcher: async () => ({ activeVersion: "v2", shadowMode: false, source: "database" }),
  });
  assert.equal(v2.source, "hybrid");
  assert.equal(v2.v2Offers.length, 0);
  assert.equal(v2.legacyBenefits.length, 1);
  assert.equal(v2Reads, 0);

  const v1 = await loadBenefitRecommendations({
    legacyFetcher: async () => benefitFetchSuccess([], "legacy"),
    v7Fetcher: async () => benefitFetchSuccess([], "v7"),
  });
  assert.equal(v1.pipelineFlag.activeVersion, "v1");
  assert.equal(v1.source, "hybrid");
});

import { evaluateGoldSet, loadGoldSet } from "../scripts/benefit-v2/qualityMetrics.js";

test("Gold Set metrics distinguish publish precision and coverage", () => {
  const metrics = evaluateGoldSet([
    { offerId: "a", category: "PARTNERSHIP_SAVING", publish: true, fields: { offer_price: 4900 }, actionUrl: "https://x/a" },
    { offerId: "b", category: "PARTNERSHIP_SAVING", publish: false, fields: { offer_price: 9900 } },
  ], [
    { offerId: "a", category: "PARTNERSHIP_SAVING", canonical: { offer_price: 4900 }, actionUrl: "https://x/a", decision: "PUBLISH" },
    { offerId: "b", category: "PARTNERSHIP_SAVING", canonical: { offer_price: 9900 }, actionUrl: null, decision: "DO_NOT_PUBLISH" },
  ]);
  assert.equal(metrics.publishPrecision, 1);
  assert.equal(metrics.coverage, 1);
  assert.equal(metrics.fieldAccuracy, 1);
  assert.equal(metrics.actionUrlAccuracy, 1);
});

test("customer-center subdomains never become final action pages by themselves", () => {
  const page = classifyPage({
    ok: true,
    finalUrl: "https://help.naver.com/service/23168/category/3637",
    text: "Spotify 혜택 설명",
    actionCandidates: [{
      label: "자세히 보기",
      url: "https://help.naver.com/service/23168/contents/24787",
      requiresLogin: false,
      infoLike: true,
    }],
  });
  assert.equal(page.actionability, "INFO_ONLY");
});


test("free-trial classification requires trial and new-user language in the same context", () => {
  const farApart = [
    "처음 이용하시는 고객은 온보딩 안내를 확인하세요.",
    "x".repeat(500),
    "일반 회원에게 무료 이용권 번호를 입력하는 방법을 안내합니다.",
  ].join(" ");
  assert.notEqual(classifyOfferCategory(farApart), "NEW_USER_FREE_TRIAL");

  const realTrial = "신규 가입 고객은 Premium 개인 요금제를 3개월 무료 체험할 수 있습니다.";
  assert.equal(classifyOfferCategory(realTrial), "NEW_USER_FREE_TRIAL");
});

test("requirement extraction ignores unrelated card mentions and accepts trusted source requirements", () => {
  const snapshot = {
    ok: true,
    url: "https://help.naver.com/service/23168/contents/24788",
    finalUrl: "https://help.naver.com/service/23168/contents/24788",
    title: "Spotify 제휴 혜택",
    text: "Spotify 제휴 할인 안내입니다. 페이지 하단에는 현대카드 고객센터 링크가 있습니다.",
    jsonLd: [],
    actionability: "INFO_ONLY",
    pageType: "INFO_ONLY",
    observedAt,
  };
  const services = [{ id: "spotify", name: "Spotify", plan: "개인", aliases: [] }];
  const result = extractDeterministicObservations({
    snapshot,
    services,
    hintedServiceIds: ["spotify"],
    authorityRegistry: [{ domain: "naver.com", type: "OFFICIAL_PARTNER", name: "NAVER" }],
    trustedConstraints: { requiredMembership: "naverplus" },
  });
  const byField = new Map(result.observations.map((item) => [item.field, item.value]));
  assert.equal(byField.get("required_membership"), "naverplus");
  assert.equal(byField.has("required_card"), false);
});

test("official discovery consumes configured seed pages without turning the list page into the offer", async () => {
  const source = {
    id: "naver-test",
    partnerType: "MEMBERSHIP",
    partnerId: "naverplus",
    partnerName: "네이버플러스",
    listUrl: "https://help.naver.com/service/23168",
    allowedOrigins: ["https://help.naver.com"],
    requiredMembership: "naverplus",
    seedPages: [{
      url: "https://help.naver.com/service/23168/contents/24788",
      title: "Spotify 혜택 안내",
      targetServiceIds: ["spotify"],
      preferSourcePageActionEntrypoint: true,
    }],
  };
  const fetchImpl = async (url) => ({
    ok: true,
    status: 200,
    url: String(url),
    headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    text: async () => String(url).includes("/contents/")
      ? "<html><title>Spotify 혜택</title><body>Spotify 제휴 할인 혜택 안내</body></html>"
      : "<html><body>고객센터</body></html>",
  });
  const result = await discoverOfficialBenefits({
    sources: [source],
    services: [{ id: "spotify", name: "Spotify", aliases: [] }],
    fetchImpl,
    now: NOW,
  });
  assert.equal(result.failures.length, 0);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].sourceUrl, source.seedPages[0].url);
  assert.deepEqual(result.candidates[0].targetServiceIds, ["spotify"]);
  assert.equal(result.candidates[0].requiredMembership, "naverplus");
  assert.equal(result.candidates[0].preferSourcePageActionEntrypoint, true);
});

test("official seed evidence survives whitespace-heavy content before the product copy", async () => {
  const source = {
    id: "card-test",
    partnerType: "CARD",
    partnerId: "card",
    partnerName: "Card",
    listUrl: "https://card.example/product",
    allowedOrigins: ["https://card.example"],
    disableAnchorDiscovery: true,
    seedPages: [{
      variantId: "card-youtube",
      url: "https://card.example/product",
      title: "카드 유튜브 30% 할인",
      targetServiceIds: ["youtube"],
      requiredEvidenceTerms: ["유튜브", "30%", "5천원"],
    }],
  };
  const whitespaceHeavyPrefix = " \n".repeat(130000);
  const fetchImpl = async (url) => ({
    ok: true,
    status: 200,
    url: String(url),
    headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    text: async () => `<html><body><div>${whitespaceHeavyPrefix}</div><section>유튜브 정기결제 30% 할인, 월 5천원 한도 혜택</section></body></html>`,
  });
  const result = await discoverOfficialBenefits({
    sources: [source],
    services: [{ id: "youtube", name: "YouTube Premium", aliases: ["유튜브"] }],
    fetchImpl,
    now: NOW,
  });
  assert.equal(result.failures.length, 0);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].variantId, "card-youtube");
});

test("Gold Set can match one live offer by strict identity when offerId changes", () => {
  const metrics = evaluateGoldSet([
    {
      match: {
        serviceId: "spotify",
        category: "NEW_USER_FREE_TRIAL",
        target_plan: "Individual",
        partner: "",
        eligibility: "NEW_USER_ONLY",
        valid_from: "2026-09-01",
        valid_to: "2026-09-30",
      },
      category: "NEW_USER_FREE_TRIAL",
      publish: true,
      fields: { trial_duration_days: 90 },
    },
  ], [
    {
      offerId: "different-hash-after-revalidation",
      offerVersion: "v2",
      serviceId: "spotify",
      category: "NEW_USER_FREE_TRIAL",
      canonical: {
        target_plan: "Individual",
        new_user_rule: "NEW_USER_ONLY",
        start_at: "2026-09-01",
        end_at: "2026-09-30",
        trial_duration_days: 90,
      },
      decision: "PUBLISH",
    },
  ]);
  assert.equal(metrics.details.identityMatched, 1);
  assert.equal(metrics.publishPrecision, 1);
  assert.equal(metrics.coverage, 1);
});

test("Gold Set fallback refuses ambiguous identities instead of merging offer versions", () => {
  const gold = [{
    match: { serviceId: "spotify", category: "PARTNERSHIP_SAVING", target_plan: "Premium" },
    publish: true,
  }];
  const samples = [
    { offerId: "a", serviceId: "spotify", category: "PARTNERSHIP_SAVING", canonical: { target_plan: "Premium", start_at: "2026-09-01" }, decision: "PUBLISH" },
    { offerId: "b", serviceId: "spotify", category: "PARTNERSHIP_SAVING", canonical: { target_plan: "Premium", start_at: "2026-10-01" }, decision: "PUBLISH" },
  ];
  const metrics = evaluateGoldSet(gold, samples);
  assert.equal(metrics.details.ambiguousMatches, 1);
  assert.equal(metrics.details.matched, 0);
  assert.equal(metrics.coverage, 0);
});


test("historical free-trial references do not become a current free-trial offer", () => {
  const text = "첫 가입 혜택은 현재 4,900원 쿠폰입니다. 2025년 3월 18일 이전에 이미 첫 가입 혜택으로 1개월 무료이용권을 받으신 이력이 있는 경우 쿠폰이 제공되지 않습니다.";
  assert.notEqual(classifyOfferCategory(text), "NEW_USER_FREE_TRIAL");
});


test("same-service plan discount cannot publish as partnership without an external partner basis", () => {
  const offer = canonicalizeOffer({
    offerId: "off_self_plan",
    category: "PARTNERSHIP_SAVING",
    serviceId: "naverplus",
    observations: [
      observation("target_service", "naverplus"),
      observation("target_plan", "연간 이용권"),
      observation("offer_price", 46800),
      observation("audience", "EXISTING_OR_ALL"),
      observation("action_url", "https://nid.naver.com/membership/join"),
      observation("actionability_status", "VERIFIED_ACTION"),
    ],
    now: NOW,
  });
  const gate = evaluatePublishGate(offer, { now: NOW });
  assert.equal(gate.decision, "DO_NOT_PUBLISH");
  assert.ok(gate.failures.includes("PARTNERSHIP_BASIS_UNVERIFIED"));
});


test("generic UI text ending in 멤버십 is not treated as a required membership", () => {
  const snapshot = {
    ok: true,
    url: "https://nid.naver.com/membership/my",
    finalUrl: "https://nid.naver.com/membership/my",
    title: "마이 멤버십",
    text: "혜택을 확인하는 경우 마이 멤버십 화면으로 이동합니다.",
    jsonLd: [],
    actionability: "VERIFIED_ENTRYPOINT",
    pageType: "ACTION_ENTRYPOINT",
    primaryAction: { label: "마이 멤버십", url: "https://nid.naver.com/membership/my", requiresLogin: true },
    observedAt,
  };
  const result = extractDeterministicObservations({
    snapshot,
    services: [{ id: "naverplus", name: "네이버플러스 멤버십", plan: "월간 이용권", aliases: [] }],
    hintedServiceIds: ["naverplus"],
    authorityRegistry: [{ domain: "naver.com", type: "OFFICIAL_PARTNER", name: "NAVER" }],
    trustedConstraints: { partnerId: "naverplus", requiredMembership: "naverplus", targetServiceId: "naverplus", targetServiceName: "네이버플러스 멤버십" },
  });
  assert.equal(result.observations.some((item) => item.field === "required_membership"), false);
});


test("Gemini benefit ranking falls back when the preferred model is unavailable", async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(String(url));
    if (requested.length === 1) {
      return new Response(JSON.stringify({ error: { message: "model unavailable" } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        score: 0.92,
        category: "PARTNERSHIP_SAVING",
        reason: "official monetary partnership",
      }) }] } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const result = await rankSnapshotWithLlm({
    ok: true,
    url: "https://official.example/benefit",
    finalUrl: "https://official.example/benefit",
    text: "Spotify 제휴 할인 혜택",
  }, {
    serviceHint: { id: "spotify", name: "Spotify" },
    env: { GEMINI_API_KEY: "test-key" },
    fetchImpl,
  });
  assert.equal(requested.length, 2);
  assert.equal(result.score, 0.92);
  assert.equal(result.category, "PARTNERSHIP_SAVING");
  assert.equal(result.model, "gemini-3.5-flash");
});

test("V2 NAVERPLUS_DIGITAL_CONTENT_CHOICE counts only one confirmed monthly saving", () => {
  const base = {
    sourceType: "PIPELINE_V2",
    publicationQualified: true,
    publicationState: "PUBLISHED",
    status: "ELIGIBLE_CONFIRMED",
    applicability: "APPLICABLE",
    sourceUrl: "https://nid.naver.com/membership/my?m=viewBenefit",
    provenance: {
      projection: "benefit_v2_public_offers",
      freshnessStatus: "FRESH",
    },
    temporal: {},
    savings: {
      isConfirmed: true,
      period: "MONTHLY_RECURRING",
    },
  };
  const spotify = {
    ...base,
    id: "v2-spotify",
    serviceId: "spotify",
    savings: { ...base.savings, amount: 7000 },
    benefit: {
      id: "v2-spotify",
      targetServiceIds: ["spotify"],
      exclusiveGroup: "NAVERPLUS_DIGITAL_CONTENT_CHOICE",
      selectionLimit: 1,
      stackable: false,
      conflictsWith: [],
    },
    materialConditions: {
      exclusiveGroup: "NAVERPLUS_DIGITAL_CONTENT_CHOICE",
      selectionLimit: 1,
      stackable: false,
    },
  };
  const netflix = {
    ...base,
    id: "v2-netflix",
    serviceId: "netflix",
    savings: { ...base.savings, amount: 2100 },
    benefit: {
      id: "v2-netflix",
      targetServiceIds: ["netflix"],
      exclusiveGroup: "NAVERPLUS_DIGITAL_CONTENT_CHOICE",
      selectionLimit: 1,
      stackable: false,
      conflictsWith: [],
    },
    materialConditions: {
      exclusiveGroup: "NAVERPLUS_DIGITAL_CONTENT_CHOICE",
      selectionLimit: 1,
      stackable: false,
    },
  };

  const summary = summarizePublishedConfirmedSavings([spotify, netflix]);
  assert.equal(summary.amount, 7000);
  assert.equal(summary.count, 1);
  assert.equal(summary.candidateCount, 2);
  assert.equal(summary.hasExclusiveChoice, true);
  assert.deepEqual(summary.selected.map((item) => item.id), ["v2-spotify"]);
});

test("trusted seed metadata carries plan/category and Naver choice constraints", async () => {
  const source = {
    id: "naver-seed-metadata",
    partnerType: "MEMBERSHIP",
    partnerId: "naverplus",
    partnerName: "네이버플러스",
    listUrl: "https://help.naver.com/service/23168",
    allowedOrigins: ["https://help.naver.com"],
    requiredMembership: "naverplus",
    exclusiveGroupId: "NAVERPLUS_DIGITAL_CONTENT_CHOICE",
    selectionLimit: 1,
    stackable: false,
    seedPages: [{
      url: "https://help.naver.com/service/23168/contents/24788",
      title: "Spotify 혜택 안내",
      targetServiceIds: ["spotify"],
      categoryHint: "PARTNERSHIP_SAVING",
      targetPlanHint: "프리미엄 베이직",
    }],
  };
  const fetchImpl = async (url) => ({
    ok: true,
    status: 200,
    url: String(url),
    headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    text: async () => String(url).includes("/contents/")
      ? "<html><body>Spotify 제휴 혜택 프리미엄 베이직 추가 금액 없이 이용</body></html>"
      : "<html><body>고객센터</body></html>",
  });
  const result = await discoverOfficialBenefits({
    sources: [source],
    services: [{ id: "spotify", name: "Spotify", aliases: [] }],
    fetchImpl,
    now: NOW,
  });
  assert.equal(result.candidates.length, 1);
  const candidate = result.candidates[0];
  assert.equal(candidate.categoryHint, "PARTNERSHIP_SAVING");
  assert.equal(candidate.targetPlanHint, "프리미엄 베이직");
  assert.equal(candidate.exclusiveGroupId, "NAVERPLUS_DIGITAL_CONTENT_CHOICE");
  assert.equal(candidate.selectionLimit, 1);
  assert.equal(candidate.stackable, false);
});

test("trusted Naver partnership facts extract zero direct price, membership cost, and both-user audience", () => {
  const snapshot = {
    ok: true,
    url: "https://help.naver.com/service/23168/contents/24788",
    finalUrl: "https://help.naver.com/service/23168/contents/24788",
    title: "스포티파이 혜택 안내 및 신청 방법",
    text: "네이버플러스 멤버십을 통해 스포티파이 혜택을 선택하면 추가 금액 없이 프리미엄 베이직을 받습니다. 스포티파이 회원이 아닌 경우 회원가입을 진행하고, 스포티파이 회원인 경우 로그인합니다.",
    jsonLd: [],
    actionability: "VERIFIED_ENTRYPOINT",
    pageType: "ACTION_ENTRYPOINT",
    primaryAction: { label: "마이 멤버십 바로가기", url: "https://nid.naver.com/membership/my?m=viewBenefit", requiresLogin: true },
    observedAt,
  };
  const result = extractDeterministicObservations({
    snapshot,
    services: [{ id: "spotify", name: "Spotify", plan: "개인", aliases: [] }],
    hintedServiceIds: ["spotify"],
    authorityRegistry: [{ domain: "naver.com", type: "OFFICIAL_PARTNER", name: "NAVER" }],
    trustedConstraints: {
      partnerId: "naverplus",
      requiredMembership: "naverplus",
      incrementalPartnerCost: 4900,
      incrementalPartnerCostEvidenceUrl: "https://help.naver.com/service/23168/contents/11764",
      targetPlan: "프리미엄 베이직",
      exclusiveGroupId: "NAVERPLUS_DIGITAL_CONTENT_CHOICE",
      selectionLimit: 1,
      stackable: false,
    },
  });
  const fields = Object.fromEntries(result.observations.map((item) => [item.field, item.value]));
  assert.equal(fields.target_plan, "프리미엄 베이직");
  assert.equal(fields.offer_price, 0);
  assert.equal(fields.audience, "EXISTING_OR_ALL");
  assert.equal(fields.required_membership, "naverplus");
  assert.equal(fields.incremental_partner_cost, 4900);
  assert.equal(fields.exclusive_group_id, "NAVERPLUS_DIGITAL_CONTENT_CHOICE");
  assert.equal(fields.selection_limit, 1);
  assert.equal(fields.stackable, false);
});

test("trusted Netflix Premium row extracts its explicit monthly upgrade price", () => {
  const snapshot = {
    ok: true,
    url: "https://help.naver.com/service/23168/contents/23782",
    finalUrl: "https://help.naver.com/service/23168/contents/23782",
    title: "넷플릭스 이용권 업그레이드 방법",
    text: "이용권명 월 이용료 (VAT 포함) 광고형 스탠다드 무료 스탠다드 6,500원 프리미엄 10,000원. 넷플릭스 회원이 아닌 경우 가입하고 넷플릭스 회원인 경우 로그인합니다.",
    jsonLd: [],
    actionability: "VERIFIED_ACTION",
    pageType: "ACTION_OR_LANDING",
    primaryAction: { label: "콘텐츠 혜택 바로가기", url: "https://nid.naver.com/membership/my?m=viewDigital", requiresLogin: true },
    observedAt,
  };
  const result = extractDeterministicObservations({
    snapshot,
    services: [{ id: "netflix", name: "Netflix", plan: "프리미엄", aliases: [] }],
    hintedServiceIds: ["netflix"],
    authorityRegistry: [{ domain: "naver.com", type: "OFFICIAL_PARTNER", name: "NAVER" }],
    trustedConstraints: {
      partnerId: "naverplus",
      requiredMembership: "naverplus",
      incrementalPartnerCost: 4900,
      targetPlan: "프리미엄",
    },
  });
  const fields = Object.fromEntries(result.observations.map((item) => [item.field, item.value]));
  assert.equal(fields.target_plan, "프리미엄");
  assert.equal(fields.offer_price, 10000);
  assert.equal(fields.audience, "EXISTING_OR_ALL");
  assert.equal(fields.incremental_partner_cost, 4900);
});

test("monthly upgrade billing wins over incidental annual-plan wording near the same price", () => {
  const snapshot = {
    ok: true,
    url: "https://help.naver.com/service/23168/contents/23782",
    finalUrl: "https://help.naver.com/service/23168/contents/23782",
    title: "넷플릭스 이용권 업그레이드 방법",
    text: "이용권명 월 이용료 (VAT 포함) 광고형 스탠다드 무료 스탠다드 6,500원 프리미엄 10,000원. 디지털 콘텐츠 업그레이드 금액은 월간·연간 이용권에 포함되지 않고 매월 별도 결제됩니다.",
    jsonLd: [],
    actionability: "VERIFIED_ACTION",
    pageType: "ACTION_OR_LANDING",
    primaryAction: { label: "콘텐츠 혜택 바로가기", url: "https://nid.naver.com/membership/my?m=viewDigital", requiresLogin: true },
    observedAt,
  };
  const result = extractDeterministicObservations({
    snapshot,
    services: [{ id: "netflix", name: "Netflix", plan: "프리미엄", aliases: [] }],
    hintedServiceIds: ["netflix"],
    authorityRegistry: [{ domain: "naver.com", type: "OFFICIAL_PARTNER", name: "NAVER" }],
    trustedConstraints: {
      partnerId: "naverplus",
      requiredMembership: "naverplus",
      incrementalPartnerCost: 4900,
      targetPlan: "프리미엄",
    },
  });
  const fields = Object.fromEntries(result.observations.map((item) => [item.field, item.value]));
  assert.equal(fields.offer_price, 10000);
  assert.equal(fields.offer_billing_cycle, "MONTHLY");
});

test("shadow-ready V2 rows map to production-quality needs-check copy when plan equivalence is unproven", () => {
  const spotifyRow = {
    offer_id: "off_shadow_spotify",
    offer_version: "ver_shadow_spotify",
    category: "PARTNERSHIP_SAVING",
    service_id: "spotify",
    canonical_values: {
      audience: "EXISTING_OR_ALL",
      action_url: "https://nid.naver.com/membership/my?m=viewBenefit",
      partner_id: "naverplus",
      offer_price: 0,
      target_plan: "프리미엄 베이직",
      requires_login: true,
      target_service: "spotify",
      selection_limit: 1,
      exclusive_group_id: "NAVERPLUS_DIGITAL_CONTENT_CHOICE",
      required_membership: "naverplus",
      actionability_status: "VERIFIED_ENTRYPOINT",
      incremental_partner_cost: 4900,
      stackable: false,
    },
    action_url: "https://nid.naver.com/membership/my?m=viewBenefit",
    requires_login: true,
    exclusive_group_id: "NAVERPLUS_DIGITAL_CONTENT_CHOICE",
    selection_limit: 1,
    stackable: false,
    freshness_status: "FRESH",
  };
  const netflixRow = {
    offer_id: "off_shadow_netflix",
    offer_version: "ver_shadow_netflix",
    category: "PARTNERSHIP_SAVING",
    service_id: "netflix",
    canonical_values: {
      audience: "EXISTING_OR_ALL",
      action_url: "https://nid.naver.com/membership/my?m=viewBenefit",
      partner_id: "naverplus",
      offer_price: 0,
      target_plan: "광고형 스탠다드",
      requires_login: true,
      target_service: "netflix",
      selection_limit: 1,
      exclusive_group_id: "NAVERPLUS_DIGITAL_CONTENT_CHOICE",
      required_membership: "naverplus",
      actionability_status: "VERIFIED_ENTRYPOINT",
      incremental_partner_cost: 4900,
      stackable: false,
    },
    action_url: "https://nid.naver.com/membership/my?m=viewBenefit",
    requires_login: true,
    exclusive_group_id: "NAVERPLUS_DIGITAL_CONTENT_CHOICE",
    selection_limit: 1,
    stackable: false,
    freshness_status: "FRESH",
  };

  const subscriptions = [
    {
      id: "spotify-current",
      serviceId: "spotify",
      name: "Spotify",
      plan: "개인",
      amount: 11990,
      billingCycle: "매월",
      status: "active",
    },
    {
      id: "netflix-current",
      serviceId: "netflix",
      name: "Netflix",
      plan: "프리미엄",
      amount: 17000,
      billingCycle: "매월",
      status: "active",
    },
  ];

  const spotify = buildV2RecommendationViewModel(
    subscriptions,
    mapV2PublicOffer(spotifyRow)
  );
  const netflix = buildV2RecommendationViewModel(
    subscriptions,
    mapV2PublicOffer(netflixRow)
  );

  assert.equal(spotify.status, "NEEDS_CHECK");
  assert.equal(netflix.status, "NEEDS_CHECK");
  assert.equal(spotify.displayStatus, "NEEDS_CHECK");
  assert.equal(netflix.displayStatus, "NEEDS_CHECK");
  assert.equal(spotify.savings, null);
  assert.equal(netflix.savings, null);
  assert.equal(spotify.title, "네이버플러스 멤버십 제휴 혜택");
  assert.equal(netflix.title, "네이버플러스 멤버십 제휴 혜택");
  assert.match(spotify.description, /같은 조건인지 확인/);
  assert.match(netflix.description, /같은 조건인지 확인/);
  assert.equal(spotify.partnerName, "네이버플러스 멤버십");
  assert.equal(netflix.partnerName, "네이버플러스 멤버십");

  const summary = summarizePublishedConfirmedSavings([spotify, netflix]);
  assert.equal(summary.amount, 0);
  assert.equal(summary.count, 0);
  assert.equal(summary.hasExclusiveChoice, false);
});

test("live search readiness requires successful NAVER and Google API calls", () => {
  assert.deepEqual(
    evaluateLiveSearchReadiness([
      {
        provider: "NAVER",
        configured: true,
        attemptedCalls: 1,
        successfulCalls: 1,
      },
      {
        provider: "GOOGLE",
        configured: true,
        attemptedCalls: 1,
        successfulCalls: 0,
      },
    ]),
    {
      requiredProviders: ["NAVER", "GOOGLE"],
      ready: false,
      failures: ["GOOGLE_NO_SUCCESSFUL_LIVE_CALL"],
    }
  );

  assert.equal(
    evaluateLiveSearchReadiness([
      {
        provider: "NAVER",
        configured: true,
        attemptedCalls: 1,
        successfulCalls: 1,
      },
      {
        provider: "GOOGLE",
        configured: true,
        attemptedCalls: 1,
        successfulCalls: 1,
      },
    ]).ready,
    true
  );
});

test("search discovery intentionally calls both configured providers and tracks live success", async () => {
  const calls = [];
  const providers = ["NAVER", "GOOGLE"].map((id) => ({
    id,
    mode: "LIVE_TEST",
    configured: true,
    async search(query) {
      calls.push({ id, query });
      return {
        provider: id,
        items: [{
          provider: id,
          query,
          rank: 1,
          url: `https://example.com/${id.toLowerCase()}/${calls.length}`,
          title: "result",
          snippet: "snippet",
          discoveredAt: observedAt,
        }],
        error: null,
      };
    },
  }));

  const result = await runSearchDiscovery({
    providers,
    services: [{ id: "spotify", name: "Spotify", plan: "개인" }],
    env: {
      BENEFIT_DISCOVERY_SERVICE_IDS: "spotify",
      BENEFIT_SEARCH_QUERY_LIMIT_PER_SERVICE: "2",
    },
    perQuery: 1,
  });

  assert.equal(calls.filter((item) => item.id === "NAVER").length, 2);
  assert.equal(calls.filter((item) => item.id === "GOOGLE").length, 2);
  assert.equal(result.providerRuns[0].attemptedCalls, 2);
  assert.equal(result.providerRuns[0].successfulCalls, 2);
  assert.equal(result.providerRuns[1].attemptedCalls, 2);
  assert.equal(result.providerRuns[1].successfulCalls, 2);
  assert.equal(result.liveSearch.ready, true);
});

test("Google Custom Search remains the live provider until the planned 2027-01-01 transition", () => {
  const provider = createGoogleSearchProvider(
    {
      GOOGLE_SEARCH_MODE: "CUSTOM_SEARCH_JSON",
      GOOGLE_SEARCH_API_KEY: "g-key",
      GOOGLE_SEARCH_CX: "cx-id",
    },
    async () => new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
    Date.parse("2026-12-31T23:59:59Z")
  );
  assert.equal(provider.mode, "CUSTOM_SEARCH_JSON");
  assert.equal(provider.configured, true);
});

test("Google Custom Search fails closed at the planned 2027-01-01 transition boundary", async () => {
  let called = false;
  const provider = createGoogleSearchProvider(
    {
      GOOGLE_SEARCH_MODE: "CUSTOM_SEARCH_JSON",
      GOOGLE_SEARCH_API_KEY: "g-key",
      GOOGLE_SEARCH_CX: "cx-id",
    },
    async () => {
      called = true;
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    },
    Date.parse("2027-01-01T00:00:00Z")
  );
  assert.equal(provider.mode, "TRANSITION_REQUIRED");
  assert.equal(provider.configured, false);
  const result = await provider.search("Spotify 할인");
  assert.equal(result.error, "GOOGLE_CUSTOM_SEARCH_TRANSITION_REQUIRED");
  assert.equal(called, false);
});

test("B route UNION_VERIFY keeps search-provider health separate from offer truth gate", () => {
  assert.deepEqual(resolveDiscoveryPolicy({
    BENEFIT_DISCOVERY_POLICY: "UNION_VERIFY",
    BENEFIT_REQUIRE_LIVE_SEARCH: "false",
  }), {
    policy: "UNION_VERIFY",
    gateOnSearchHealth: false,
  });
  assert.equal(resolveDiscoveryPolicy({
    BENEFIT_DISCOVERY_POLICY: "DUAL_REQUIRED",
  }).gateOnSearchHealth, true);
});

test("strong official Spotify eligibility language classifies a historical 3-month trial", () => {
  const text = [
    "3개월 동안 ₩0에 Premium을 이용할 수 있습니다.",
    "체험 기간 종료 후 매월 ₩11,990이 부과됩니다.",
    "이전에 Premium 요금제를 이용해 본 적이 없다면 무료 체험을 이용할 수 있습니다.",
  ].join(" ");
  assert.equal(classifyOfferCategory(text), "NEW_USER_FREE_TRIAL");
});

test("Spotify personal and student one-month trials keep their own renewal prices", () => {
  const common = {
    ok: true,
    jsonLd: [],
    actionability: "VERIFIED_ACTION",
    pageType: "ACTION_OR_LANDING",
    primaryAction: { label: "가입하기", url: "https://www.spotify.com/kr-ko/signup/" },
    observedAt,
  };
  const pages = [
    {
      ...common,
      url: "https://www.spotify.com/kr-ko/premium/",
      finalUrl: "https://www.spotify.com/kr-ko/premium/",
      title: "Spotify Premium - Spotify (대한민국)",
      text: "Premium 개인 ₩0에 1개월 동안 Premium 개인 요금제를 이용해 보세요. 이후에는 ₩11,990/월이 부과됩니다. 신용카드 또는 기타 수단으로 결제하기 1개월 무료. 전자 지갑으로 결제하기 1개월 동안 ₩100. 이전에 Premium을 이용해 본 적이 없다면 무료 체험을 이용할 수 있습니다.",
    },
    {
      ...common,
      url: "https://www.spotify.com/kr-ko/student/",
      finalUrl: "https://www.spotify.com/kr-ko/student/",
      title: "Premium 학생 요금제 - Spotify (KR)",
      text: "Premium 개인 개인 사용자를 위한 계정 1개. 학생은 1개월 동안 무료로 Premium 서비스를 이용할 수 있습니다. 이후 매월 ₩6,600이 부과됩니다. 이전에 Premium 요금제를 이용해 본 적이 없다면 무료 체험을 이용할 수 있습니다.",
    },
  ];
  const candidates = pages.map((snapshot) => {
    const result = extractDeterministicObservations({
      snapshot,
      services: [{ id: "spotify", name: "Spotify", plan: "개인", aliases: ["Premium"] }],
      hintedServiceIds: ["spotify"],
      authorityRegistry: [{ domain: "spotify.com", type: "OFFICIAL_ACTION", name: "Spotify" }],
    });
    assert.equal(result.category, "NEW_USER_FREE_TRIAL");
    return { ...result, snapshot };
  });
  const offers = mergeOfferCandidates(candidates, NOW);
  assert.equal(offers.length, 2, "different plans must not merge into one conflicting offer");
  const personal = offers.find((offer) => offer.canonical.target_plan === "개인");
  const student = offers.find((offer) => offer.canonical.target_plan === "학생");
  assert.equal(personal.canonical.post_trial_price, 11990);
  assert.equal(student.canonical.post_trial_price, 6600);
  assert.ok(evaluatePublishGate(personal, { now: NOW }).failures.includes(
    "VERIFICATION_HOLD:SPOTIFY_PAYMENT_METHOD_DEPENDENT_TRIAL_COST"
  ), "zero-cost card and paid wallet trials require a payment method model before publishing");
});

test("Spotify official individual seed tracks the supported one-month term", () => {
  const source = OFFICIAL_BENEFIT_SOURCES.find((item) => item.id === "spotify-official-trials");
  const individual = source.seedPages.find((item) => item.targetPlanHint === "개인");
  assert.equal(individual.variantId, "spotify-individual-1m-trial");
  assert.ok(individual.requiredEvidenceTerms.includes("₩0에 1개월 동안 Premium 개인"));
  assert.equal(individual.trustedBlockReason, "SPOTIFY_PAYMENT_METHOD_DEPENDENT_TRIAL_COST");
});

test("Spotify renewal uses matching individual trial terms outside the short trial excerpt", () => {
  function extractRenewal(tierTerms, recurringTerms) {
    const snapshot = {
      ok: true,
      url: "https://www.spotify.com/kr-ko/premium/",
      finalUrl: "https://www.spotify.com/kr-ko/premium/",
      title: "Spotify Premium 개인",
      text: [
        "신규 가입자는 3개월 무료 체험을 이용할 수 있습니다. 체험 기간 이후에 구독 유지를 선택하면 매월 ₩11,990이 부과됩니다.",
        "일반 안내와 요금제 소개 ".repeat(40),
        tierTerms,
        recurringTerms,
      ].join(" "),
      jsonLd: [],
      actionability: "VERIFIED_ACTION",
      pageType: "ACTION_OR_LANDING",
      primaryAction: { label: "무료 체험", url: "https://www.spotify.com/kr-ko/signup/", requiresLogin: false },
      observedAt,
    };
    const result = extractDeterministicObservations({
      snapshot,
      services: [{ id: "spotify", name: "Spotify", plan: "개인", aliases: ["Premium"] }],
      hintedServiceIds: ["spotify"],
      authorityRegistry: [{ domain: "spotify.com", type: "OFFICIAL_ACTION", name: "Spotify" }],
      trustedConstraints: { partnerId: "spotify", targetPlan: "개인", trustedAudience: "NEW" },
    });
    return Object.fromEntries(result.observations.map((item) => [item.field, item.value]));
  }
  const personalTerms = "Premium 개인 체험 기간 종료 후 매월 ₩11,990 (부가세 포함) 결제";
  const automatic = "정기 결제 구독에는 월별 자동 결제가 포함됩니다.";
  const matched = extractRenewal(personalTerms, automatic);
  assert.equal(matched.post_trial_price, 11990);
  assert.equal(matched.auto_renewal, true);
  assert.equal(extractRenewal(personalTerms, "").auto_renewal, undefined);
  assert.equal(extractRenewal("Premium 학생 체험 기간 종료 후 매월 ₩6,600 결제", automatic).auto_renewal, undefined);
});

test("Spotify Student current exclusion wording classifies the 1-month offer as a new-user trial without a trusted category hint", () => {
  const text = [
    "1개월 이용 시 ₩0, 이후 매월 ₩6,600(부가세 포함)입니다.",
    "이 혜택은 혜택 제공 대상에 포함되어 있는 승인된 대학 교육 기관에 등록된 학생에게만 제공됩니다.",
    "이미 Premium을 체험해본 사용자는 이 혜택을 이용할 수 없습니다.",
  ].join(" ");
  assert.equal(classifyOfferCategory(text), "NEW_USER_FREE_TRIAL");
});

test("eligible returning subscriber wording is preserved instead of being collapsed to new-user-only", () => {
  const snapshot = {
    ok: true,
    url: "https://official.example/tv",
    finalUrl: "https://official.example/tv",
    title: "7일 무료 체험",
    text: "신규 구독자 및 조건에 부합하는 재구독자는 7일 무료 체험을 이용할 수 있습니다. 이후 매월 ₩6,500이 부과되며 자동 갱신됩니다.",
    jsonLd: [],
    actionability: "VERIFIED_ACTION",
    pageType: "ACTION_OR_LANDING",
    primaryAction: { label: "무료 체험 시작", url: "https://official.example/tv/start", requiresLogin: false },
    observedAt,
  };
  const result = extractDeterministicObservations({
    snapshot,
    services: [{ id: "appletv", name: "Apple TV", plan: "Apple TV", aliases: ["Apple TV"] }],
    hintedServiceIds: ["appletv"],
    authorityRegistry: [{ domain: "official.example", type: "OFFICIAL_ACTION", name: "Official" }],
    trustedConstraints: { partnerId: "appletv", targetPlan: "Apple TV" },
  });
  const fields = Object.fromEntries(result.observations.map((item) => [item.field, item.value]));
  assert.equal(result.category, "NEW_USER_FREE_TRIAL");
  assert.equal(fields.trial_duration_days, 7);
  assert.equal(fields.trial_cost, 0);
  assert.equal(fields.post_trial_price, 6500);
  assert.equal(fields.new_user_rule, "NEW_OR_ELIGIBLE_RETURNING");
  assert.equal(fields.auto_renewal, true);
});

test("new benefit announcement wording alone does not misclassify all members as NEW users", () => {
  const snapshot = {
    ok: true,
    url: "https://help.naver.com/example",
    finalUrl: "https://help.naver.com/example",
    title: "신규 혜택 PC Game Pass 출시 안내",
    text: "네이버플러스 멤버십 회원 대상으로 PC Game Pass를 추가 금액 없이 제공합니다.",
    jsonLd: [],
    actionability: "VERIFIED_ENTRYPOINT",
    pageType: "ACTION_OR_LANDING",
    primaryAction: { label: "마이 멤버십", url: "https://nid.naver.com/membership/my", requiresLogin: true },
    observedAt,
  };
  const result = extractDeterministicObservations({
    snapshot,
    services: [{ id: "xbox-gamepass", name: "Xbox Game Pass Ultimate", plan: "Ultimate", aliases: [] }],
    hintedServiceIds: ["xbox-gamepass"],
    authorityRegistry: [{ domain: "naver.com", type: "OFFICIAL_PARTNER", name: "NAVER" }],
    trustedConstraints: {
      partnerId: "naverplus",
      requiredMembership: "naverplus",
      targetPlan: "PC Game Pass",
    },
  });
  const fields = Object.fromEntries(result.observations.map((item) => [item.field, item.value]));
  assert.equal(result.service.id, "xbox-gamepass");
  assert.equal(fields.audience, "EXISTING_OR_ALL");
});

test("hinted service fallback resolves Xbox PC Game Pass without trusting the hint alone", () => {
  const service = { id: "xbox-gamepass", name: "Xbox Game Pass Ultimate", plan: "Ultimate", aliases: [] };
  assert.equal(
    resolveTargetService(
      { title: "PC Game Pass 혜택", text: "Xbox PC Game Pass를 멤버십 회원에게 제공합니다." },
      [service],
      ["xbox-gamepass"]
    )?.id,
    "xbox-gamepass"
  );
  assert.equal(
    resolveTargetService(
      { title: "무관한 혜택", text: "영화 할인 안내" },
      [service],
      ["xbox-gamepass"]
    ),
    null
  );
});

test("trusted carrier seed can suppress ambiguous membership and price extraction without hiding the partnership", () => {
  const snapshot = {
    ok: true,
    url: "https://m.tworld.co.kr/product/callplan?prod_id=NA00009801",
    finalUrl: "https://m.tworld.co.kr/product/callplan?prod_id=NA00009801",
    title: "베스트 109(유튜브 프리미엄)",
    text: "SKT 요금제 이용 고객은 T 우주 YouTube Premium을 월 1,000원에 이용할 수 있습니다. 우주패스 편의점&카페 관련 예시도 안내합니다.",
    jsonLd: [],
    actionability: "VERIFIED_ACTION",
    pageType: "ACTION_OR_LANDING",
    primaryAction: { label: "요금제 변경하기", url: "https://m.tworld.co.kr/product/mobileplan/join", requiresLogin: false },
    observedAt,
  };
  const result = extractDeterministicObservations({
    snapshot,
    services: [{ id: "youtube", name: "YouTube Premium", plan: "개인 멤버십", aliases: ["유튜브 프리미엄"] }],
    hintedServiceIds: ["youtube"],
    authorityRegistry: [{ domain: "tworld.co.kr", type: "OFFICIAL_PARTNER", name: "SKT" }],
    trustedConstraints: {
      partnerId: "skt",
      requiredCarrier: "SKT",
      targetPlan: "유튜브 프리미엄",
      suppressContextualMembership: true,
      suppressOfferPrice: true,
    },
  });
  const fields = Object.fromEntries(result.observations.map((item) => [item.field, item.value]));
  assert.equal(fields.required_carrier, "SKT");
  assert.equal(fields.required_membership, undefined);
  assert.equal(fields.offer_price, undefined);
  assert.equal(result.category, "PARTNERSHIP_SAVING");
});

test("date extraction keeps promo deadline as end_at without inventing start_at", () => {
  const snapshot = {
    ok: true,
    url: "https://official.example/trial",
    finalUrl: "https://official.example/trial",
    title: "Premium 신규 가입 혜택",
    text: "신규 가입 고객은 3개월 무료 체험할 수 있습니다. 이 혜택은 2026년 9월 23일에 종료됩니다.",
    jsonLd: [],
    actionability: "VERIFIED_ACTION",
    pageType: "ACTION_OR_LANDING",
    primaryAction: { label: "가입하기", url: "https://official.example/signup", requiresLogin: false },
    observedAt,
  };
  const result = extractDeterministicObservations({
    snapshot,
    services: [{ id: "spotify", name: "Spotify", plan: "개인", aliases: ["Premium"] }],
    hintedServiceIds: ["spotify"],
    authorityRegistry: [{ domain: "official.example", type: "OFFICIAL_ACTION", name: "Official" }],
    trustedConstraints: { partnerId: "spotify", targetPlan: "개인" },
  });
  const fields = Object.fromEntries(result.observations.map((item) => [item.field, item.value]));
  assert.equal(fields.start_at, undefined);
  assert.equal(fields.end_at, "2026-09-23");
});

test("LLM Korean dates normalize to ISO and post-trial billing date is not accepted as benefit start", async () => {
  const page = [
    "이 혜택은 2026년 9월 23일에 종료됩니다.",
    "무료 체험 종료 후 2026년 12월 21일부터 매월 11,990원이 부과됩니다.",
  ].join(" ");
  const fetchImpl = async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify({
      fields: [
        { field: "end_at", value: "2026년 9월 23일", evidence: "이 혜택은 2026년 9월 23일에 종료됩니다." },
        { field: "start_at", value: "2026년 12월 21일", evidence: "무료 체험 종료 후 2026년 12월 21일부터 매월 11,990원이 부과됩니다." },
      ],
    }) }] } }],
  }), { status: 200, headers: { "content-type": "application/json" } });
  const result = await extractObservationsWithLlm({
    ok: true,
    url: "https://official.example/trial",
    finalUrl: "https://official.example/trial",
    text: page,
    observedAt,
  }, {
    targetService: { id: "spotify", name: "Spotify" },
    authority: { type: "OFFICIAL_ACTION", score: 600 },
    env: { GEMINI_API_KEY: "test-key" },
    fetchImpl,
  });
  const fields = Object.fromEntries(result.observations.map((item) => [item.field, item.value]));
  assert.equal(fields.end_at, "2026-09-23");
  assert.equal(fields.start_at, undefined);
});

test("SKT Best Max bundle is structured separately with verified carrier plan and OTT options", () => {
  const snapshot = {
    ok: true,
    url: "https://m.tworld.co.kr/product/callplan?prod_id=NA00009814",
    finalUrl: "https://m.tworld.co.kr/product/callplan?prod_id=NA00009814",
    title: "베스트 Max(유튜브 프리미엄)",
    text: [
      "베스트 Max(유튜브 프리미엄) 유튜브 프리미엄과 추가 OTT 1종을 할인받을 수 있어요.",
      "넷플릭스 디즈니+ 티빙 Wavve 중 택 1 가능.",
      "2026년 12월 31일까지 가입 시 월 1,000원 → 0원부터 이용 가능.",
    ].join(" "),
    jsonLd: [],
    actionability: "VERIFIED_ACTION",
    pageType: "ACTION_OR_LANDING",
    primaryAction: { label: "요금제 변경하기", url: "https://m.tworld.co.kr/product/mobileplan/join", requiresLogin: false },
    observedAt,
  };
  const result = extractDeterministicObservations({
    snapshot,
    services: [{ id: "youtube", name: "YouTube Premium", plan: "유튜브 프리미엄", aliases: ["유튜브 프리미엄"] }],
    hintedServiceIds: ["youtube"],
    authorityRegistry: [{ domain: "tworld.co.kr", type: "OFFICIAL_ACTION", name: "SKT" }],
    trustedConstraints: {
      partnerId: "skt",
      requiredCarrier: "SKT",
      requiredPlan: "베스트 Max(유튜브 프리미엄)",
      targetPlan: "유튜브 프리미엄",
      bundleOptions: ["넷플릭스", "디즈니+", "티빙", "Wavve"],
      bundleSelectionLimit: 1,
      suppressContextualMembership: true,
      suppressOfferPrice: true,
    },
  });
  const fields = Object.fromEntries(result.observations.map((item) => [item.field, item.value]));
  assert.equal(fields.required_plan, "베스트 Max(유튜브 프리미엄)");
  assert.deepEqual(fields.bundle_options, ["넷플릭스", "디즈니+", "티빙", "Wavve"]);
  assert.equal(fields.bundle_selection_limit, 1);
  assert.equal(fields.end_at, "2026-12-31");
  assert.equal(fields.offer_price, undefined);
});

test("required carrier plan separates SKT offer identities and user eligibility", () => {
  const common = [
    observation("target_service", "youtube"),
    observation("target_plan", "유튜브 프리미엄"),
    observation("audience", "EXISTING_OR_ALL"),
    observation("partner_id", "skt"),
    observation("required_carrier", "SKT"),
    observation("offer_price", 0),
  ];
  const best109 = buildOfferIdentity({
    category: "PARTNERSHIP_SAVING",
    serviceId: "youtube",
    observations: [...common, observation("required_plan", "베스트 109(유튜브 프리미엄)")],
  });
  const bestMax = buildOfferIdentity({
    category: "PARTNERSHIP_SAVING",
    serviceId: "youtube",
    observations: [...common, observation("required_plan", "베스트 Max(유튜브 프리미엄)")],
  });
  assert.notEqual(best109.offerId, bestMax.offerId);

  const assessment = assessPartnershipOffer({
    serviceId: "youtube",
    canonical: {
      target_service: "youtube",
      target_plan: "유튜브 프리미엄",
      offer_price: 0,
      required_carrier: "SKT",
      required_plan: "베스트 Max(유튜브 프리미엄)",
    },
  }, [{
    id: "youtube",
    serviceId: "youtube",
    plan: "유튜브 프리미엄",
    amount: 14900,
    billingCycle: "MONTHLY",
  }], {
    carrier: "SKT",
    carrierPlan: "베스트 109(유튜브 프리미엄)",
  });
  assert.equal(assessment.eligibility, "INELIGIBLE");
  assert.equal(assessment.reason, "REQUIRED_PLAN_NOT_MATCHED");
});

test("Gold Set reports discovery recall and disambiguates same-service SKT variants by required plan", () => {
  const gold = [
    {
      match: { serviceId: "youtube", category: "PARTNERSHIP_SAVING", target_plan: "유튜브 프리미엄", partner: "SKT", required_plan: "베스트 109(유튜브 프리미엄)" },
      publish: false,
    },
    {
      match: { serviceId: "youtube", category: "PARTNERSHIP_SAVING", target_plan: "유튜브 프리미엄", partner: "SKT", required_plan: "베스트 Max(유튜브 프리미엄)" },
      publish: false,
    },
  ];
  const samples = [{
    offerId: "max",
    serviceId: "youtube",
    category: "PARTNERSHIP_SAVING",
    canonical: {
      target_plan: "유튜브 프리미엄",
      required_carrier: "SKT",
      required_plan: "베스트 Max(유튜브 프리미엄)",
    },
    decision: "DO_NOT_PUBLISH",
  }];
  const metrics = evaluateGoldSet(gold, samples);
  assert.equal(metrics.details.matched, 1);
  assert.equal(metrics.details.ambiguousMatches, 0);
  assert.equal(metrics.discoveryRecall, 0.5);
});

test("trusted suppression blocks ambiguous SKT prices from LLM fallback too", () => {
  const filtered = filterLlmObservationsForTrustedConstraints([
    { field: "offer_price", value: 1000 },
    { field: "regular_price", value: 129000 },
    { field: "audience", value: "EXISTING_OR_ALL" },
  ], {
    suppressOfferPrice: true,
  });
  assert.deepEqual(filtered, [
    { field: "audience", value: "EXISTING_OR_ALL" },
  ]);
});

test("same official URL keeps independently verified plan variants separate", () => {
  const url = "https://official.example/carrier-plan";
  const first = {
    url,
    variantId: "plan-a",
    serviceIds: ["youtube"],
    trustedConstraints: { requiredPlan: "Plan A" },
  };
  const second = {
    url,
    variantId: "plan-b",
    serviceIds: ["youtube"],
    trustedConstraints: { requiredPlan: "Plan B" },
  };
  assert.notEqual(candidateMergeKey(first), candidateMergeKey(second));
  const merged = mergeDiscoveryCandidates([first], [second]);
  assert.equal(merged.length, 2);
  assert.deepEqual(merged.map((item) => item.variantId).sort(), ["plan-a", "plan-b"]);
});

test("trusted seed title cannot create a benefit when the fetched official page lacks required evidence", async () => {
  const source = {
    id: "official-carrier",
    partnerType: "CARRIER",
    partnerId: "carrier",
    partnerName: "Carrier",
    listUrl: "https://official.example/list",
    allowedOrigins: ["https://official.example"],
    disableAnchorDiscovery: true,
    seedPages: [{
      variantId: "claimed-plan",
      url: "https://official.example/plan",
      title: "Claimed Plan YouTube Premium benefit",
      targetServiceIds: ["youtube"],
      categoryHint: "PARTNERSHIP_SAVING",
      targetPlanHint: "YouTube Premium",
      requiredPlan: "Claimed Plan",
      requiredEvidenceTerms: ["Claimed Plan", "YouTube Premium"],
    }],
  };
  const fetchImpl = async (url) => new Response(
    String(url).endsWith("/plan")
      ? "<html><title>Official plan</title><body>General mobile plan information only.</body></html>"
      : "<html><title>Official list</title><body>Products</body></html>",
    { status: 200, headers: { "content-type": "text/html" } }
  );
  const result = await discoverOfficialBenefits({
    sources: [source],
    services: [{ id: "youtube", name: "YouTube Premium", plan: "개인 멤버십", aliases: ["유튜브 프리미엄"] }],
    fetchImpl,
    now: NOW,
  });
  assert.equal(result.candidates.length, 0);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].reason, "SEED_EVIDENCE_MISSING");
  assert.deepEqual(result.failures[0].missingEvidenceTerms, ["Claimed Plan", "YouTube Premium"]);
});

test("verified source price metadata can fill an exact bundle price without DOM cross-price guessing", () => {
  const snapshot = {
    ok: true,
    url: "https://official.example/bundle",
    finalUrl: "https://official.example/bundle",
    title: "Disney bundle",
    text: "디즈니+ 티빙 번들 월 ₩18,000. 디즈니+ 티빙 웨이브 번들 월 ₩21,500.",
    jsonLd: [],
    actionability: "UNKNOWN",
    pageType: "POSSIBLE_LANDING",
    observedAt,
  };
  const result = extractDeterministicObservations({
    snapshot,
    services: [{ id: "disney", name: "Disney+", plan: "스탠다드", aliases: ["디즈니+"] }],
    hintedServiceIds: ["disney"],
    authorityRegistry: [{ domain: "official.example", type: "OFFICIAL_PARTNER", name: "Official" }],
    trustedConstraints: {
      partnerId: "disney-bundle",
      targetPlan: "디즈니+ 티빙 번들",
      trustedOfferPrice: 18000,
      trustedOfferBillingCycle: "MONTHLY",
    },
  });
  const fields = Object.fromEntries(result.observations.map((item) => [item.field, item.value]));
  assert.equal(fields.offer_price, 18000);
  assert.equal(fields.offer_billing_cycle, "MONTHLY");
});

test("null trusted offer price never overrides a real official DOM price with zero", () => {
  const snapshot = {
    ok: true,
    url: "https://official.example/netflix",
    finalUrl: "https://official.example/netflix",
    title: "넷플릭스 프리미엄 업그레이드",
    text: "넷플릭스 프리미엄으로 업그레이드하면 매월 별도 결제 10,000원이 청구됩니다.",
    jsonLd: [],
    actionability: "VERIFIED_ACTION",
    pageType: "ACTION_OR_LANDING",
    primaryAction: { label: "업그레이드 신청", url: "https://official.example/apply", requiresLogin: false },
    observedAt,
  };
  const result = extractDeterministicObservations({
    snapshot,
    services: [{ id: "netflix", name: "Netflix", plan: "프리미엄", aliases: ["넷플릭스"] }],
    hintedServiceIds: ["netflix"],
    authorityRegistry: [{ domain: "official.example", type: "OFFICIAL_PARTNER", name: "Official" }],
    trustedConstraints: {
      partnerId: "naverplus",
      targetPlan: "프리미엄",
      trustedOfferPrice: null,
    },
  });
  const fields = Object.fromEntries(result.observations.map((item) => [item.field, item.value]));
  assert.equal(fields.offer_price, 10000);
});

test("SKT promotional signup deadline remains distinct from the later plan enrollment deadline", () => {
  const skt = OFFICIAL_BENEFIT_SOURCES.find((source) => source.id === "skt-subscriptions");
  for (const variantId of ["skt-youtube-best109", "skt-youtube-bestpro", "skt-youtube-bestmax"]) {
    const seed = skt.seedPages.find((item) => item.variantId === variantId);
    assert.equal(seed.promoSignupDeadline, "2026-12-31");
    assert.equal(seed.planEnrollmentDeadline, "2027-06-30");
    assert.equal(seed.trustedEndAt, "2026-12-31");
    assert.ok(seed.requiredEvidenceTerms.includes("2026년 12월 31일"));
    assert.ok(seed.requiredEvidenceTerms.includes("2027년 6월 30일"));
  }
  assert.equal(
    skt.seedPages.find((item) => item.variantId === "skt-youtube-5gx-premium").trustedEndAt,
    "2027-06-30"
  );
  const snapshot = {
    ok: true,
    url: "https://official.example/carrier-plan",
    finalUrl: "https://official.example/carrier-plan",
    title: "베스트 Max(유튜브 프리미엄)",
    text: [
      "추가 OTT 프로모션은 2026년 12월 31일까지 적용됩니다.",
      "대상 요금제: 베스트 Max(유튜브 프리미엄).",
      "해당 요금제는 2027년 6월 30일까지 가입할 수 있습니다.",
    ].join(" "),
    jsonLd: [],
    actionability: "VERIFIED_ACTION",
    pageType: "ACTION_OR_LANDING",
    primaryAction: { label: "요금제 변경하기", url: "https://official.example/join", requiresLogin: false },
    observedAt,
  };
  const result = extractDeterministicObservations({
    snapshot,
    services: [{ id: "youtube", name: "YouTube Premium", plan: "유튜브 프리미엄", aliases: ["유튜브 프리미엄"] }],
    hintedServiceIds: ["youtube"],
    authorityRegistry: [{ domain: "official.example", type: "OFFICIAL_PARTNER", name: "Carrier" }],
    trustedConstraints: {
      partnerId: "skt",
      requiredCarrier: "SKT",
      requiredPlan: "베스트 Max(유튜브 프리미엄)",
      targetPlan: "유튜브 프리미엄",
      trustedEndAt: "2026-12-31",
      suppressOfferPrice: true,
    },
  });
  const fields = Object.fromEntries(result.observations.map((item) => [item.field, item.value]));
  assert.equal(fields.end_at, "2026-12-31");
});

test("verified official seed category hint can unlock deterministic trial extraction, but unverified hint cannot", () => {
  const snapshot = {
    ok: true,
    url: "https://official.example/student",
    finalUrl: "https://official.example/student",
    title: "Premium 학생",
    text: "학생은 1개월 동안 무료로 Premium 서비스를 이용할 수 있습니다. 이후 매월 6,600원이 부과됩니다. 승인된 대학 교육 기관에 등록된 학생에게 제공됩니다.",
    jsonLd: [],
    actionability: "VERIFIED_ACTION",
    pageType: "ACTION_OR_LANDING",
    primaryAction: { label: "가입하기", url: "https://official.example/signup", requiresLogin: false },
    observedAt,
  };
  const common = {
    snapshot,
    services: [{ id: "spotify", name: "Spotify", plan: "개인", aliases: ["Premium"] }],
    hintedServiceIds: ["spotify"],
    authorityRegistry: [{ domain: "official.example", type: "OFFICIAL_ACTION", name: "Official" }],
  };
  const unverified = extractDeterministicObservations({
    ...common,
    trustedConstraints: {
      partnerId: "spotify",
      targetPlan: "학생",
      categoryHint: "NEW_USER_FREE_TRIAL",
      trustedEvidenceVerified: false,
    },
  });
  const verified = extractDeterministicObservations({
    ...common,
    trustedConstraints: {
      partnerId: "spotify",
      targetPlan: "학생",
      categoryHint: "NEW_USER_FREE_TRIAL",
      trustedEvidenceVerified: true,
    },
  });
  assert.equal(unverified.category, "UNKNOWN");
  assert.equal(verified.category, "NEW_USER_FREE_TRIAL");
  const fields = Object.fromEntries(verified.observations.map((item) => [item.field, item.value]));
  assert.equal(fields.trial_duration_days, 30);
  assert.equal(fields.trial_cost, 0);
  assert.equal(fields.post_trial_price, 6600);
  assert.equal(fields.new_user_rule, undefined);
  assert.equal(fields.auto_renewal, true);
});

test("RE discovery schema stores one URL row and retains each plan variant", async () => {
  let capturedRows = null;
  const client = {
    from(table) {
      assert.equal(table, "benefit_v2_discovery_candidates");
      return {
        upsert(rows, options) {
          capturedRows = rows;
          assert.deepEqual(options, { onConflict: "candidate_id" });
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  const result = await persistDiscoveryCandidates(client, "run-test", [
    { url: "https://official.example/plan", variantId: "plan-a", serviceIds: ["youtube"], discoveryRefs: [{ provider: "OFFICIAL" }] },
    { url: "https://official.example/plan", variantId: "plan-b", serviceIds: ["youtube", "tving"], discoveryRefs: [{ provider: "OFFICIAL" }] },
  ]);
  assert.equal(result.count, 1);
  assert.equal(capturedRows.length, 1);
  assert.equal(Object.hasOwn(capturedRows[0], "variant_id"), false);
  assert.deepEqual(capturedRows[0].service_ids, ["youtube", "tving"]);
  assert.deepEqual(capturedRows[0].discovery_refs.map((ref) => ref.variantId), ["plan-a", "plan-b"]);
  assert.deepEqual(result.rows.map((row) => row.variant_id), ["plan-a", "plan-b"]);
  assert.equal(result.rows[0].candidate_id, result.rows[1].candidate_id);
});

test("snapshot persistence keeps a direct evidence row for every candidate sharing an official page", async () => {
  const stored = new Map();
  const client = {
    from(table) {
      assert.equal(table, "benefit_v2_source_snapshots");
      return {
        upsert(row, options) {
          assert.deepEqual(options, { onConflict: "snapshot_id" });
          stored.set(row.snapshot_id, row);
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  const snapshot = {
    url: "https://official.example/benefit",
    finalUrl: "https://official.example/benefit",
    contentHash: "same-page-hash",
    observedAt,
    ok: true,
  };
  const first = await persistSnapshot(client, { runId: "run-test", candidateId: "cand_plan_a", snapshot });
  const second = await persistSnapshot(client, { runId: "run-test", candidateId: "cand_plan_b", snapshot });
  const repeated = await persistSnapshot(client, { runId: "run-test", candidateId: "cand_plan_a", snapshot });
  assert.notEqual(first.snapshotId, second.snapshotId);
  assert.equal(first.snapshotId, repeated.snapshotId, "retries remain idempotent for one candidate");
  assert.deepEqual(new Set([...stored.values()].map((row) => row.candidate_id)),
    new Set(["cand_plan_a", "cand_plan_b"]));
  assert.equal(stored.size, 2);

  const redirect = await persistSnapshot(client, {
    runId: "run-test", candidateId: "cand_plan_a",
    snapshot: { ...snapshot, url: "https://official.example/entry" },
  });
  assert.notEqual(redirect.snapshotId, first.snapshotId,
    "two source URLs with the same redirect destination remain distinct evidence");
  await assert.rejects(
    persistSnapshot(client, { runId: "run-test", snapshot }),
    /persisted discovery candidate is required/
  );
});

test("current official seeds retain handed-off variants except the superseded Spotify trial", () => {
  const seeds = OFFICIAL_BENEFIT_SOURCES.flatMap((source) => source.seedPages || []);
  const ids = new Set(seeds.map((seed) => seed.variantId));
  const expected = [
    "naverplus-netflix-standard-upgrade",
    "naverplus-student-spotify-basic",
    "naverplus-student-netflix-ad-standard",
    "naverplus-student-pc-game-pass",
    "lguplus-netflix-130",
    "lguplus-netflix-115",
    "lguplus-netflix-105",
    "kb-need-pay-netflix",
    "kb-need-pay-youtube",
    "kb-need-pay-disney",
    "kb-need-pay-tving",
    "kb-need-pay-wavve",
    "kb-need-pay-spotify",
    "kb-need-pay-naverplus",
    "shinhan-happy-netflix",
    "shinhan-happy-youtube",
    "shinhan-happy-naverplus",
  ];
  assert.deepEqual(expected.filter((id) => !ids.has(id)), []);
  assert.equal(seeds.length, 59);
  const gold = loadGoldSet(new URL("./benefit-v2-independent-gold-20260922.json", import.meta.url));
  // Keep the frozen independent Gold case intact; its former 3-month offer is
  // not a current official seed while the live page advertises one month.
  assert.deepEqual(gold.map((item) => item.caseId).filter((id) => !ids.has(id)), [
    "spotify-individual-3m-trial",
  ]);
  assert.ok(ids.has("spotify-individual-1m-trial"));
});

test("verified card constraints remain structured and never become offer_price", () => {
  const snapshot = {
    ok: true,
    url: "https://card.kbcard.com/benefit",
    finalUrl: "https://card.kbcard.com/benefit",
    title: "KB NEED Pay 카드 디지털 콘텐츠 할인",
    text: "KB NEED Pay 카드로 유튜브 공식 홈페이지 정기결제 시 30% 할인, 건당 3천원, 월 5천원 한도, 전월 이용실적 40만원 이상",
    jsonLd: [],
    actionability: "INFO_ONLY",
    pageType: "INFO_ONLY",
    observedAt,
  };
  const extracted = extractDeterministicObservations({
    snapshot,
    services: [{ id: "youtube", name: "YouTube Premium", aliases: ["유튜브"] }],
    hintedServiceIds: ["youtube"],
    authorityRegistry: [{ domain: "kbcard.com", type: "OFFICIAL_PARTNER", name: "KB Card" }],
    trustedConstraints: {
      trustedEvidenceVerified: true,
      categoryHint: "PARTNERSHIP_SAVING",
      partnerId: "kbcard",
      requiredCard: "KB NEED Pay 카드",
      trustedAudience: "EXISTING_OR_ALL",
      trustedOfferBillingCycle: "MONTHLY",
      suppressOfferPrice: true,
      discountRate: 30,
      perTransactionCap: 3000,
      monthlyDiscountCap: 5000,
      priorMonthSpendRequirement: 400000,
      eligiblePaymentChannel: "OFFICIAL_SITE_RECURRING_DIRECT_CARD",
    },
  });
  const fields = Object.fromEntries(extracted.observations.map((item) => [item.field, item.value]));
  assert.equal(fields.discount_rate, 30);
  assert.equal(fields.per_transaction_cap, 3000);
  assert.equal(fields.monthly_discount_cap, 5000);
  assert.equal(fields.prior_month_spend_requirement, 400000);
  assert.equal(fields.eligible_payment_channel, "OFFICIAL_SITE_RECURRING_DIRECT_CARD");
  assert.equal(fields.offer_price, undefined);

  const offer = canonicalizeOffer({
    offerId: "off_card_discount",
    category: extracted.category,
    serviceId: extracted.service.id,
    observations: extracted.observations,
    now: NOW,
  });
  const gate = evaluatePublishGate(offer, { now: NOW });
  assert.equal(gate.decision, "DO_NOT_PUBLISH");
  assert.ok(gate.failures.includes("PARTNERSHIP_PRICE_NOT_MONETARY"));
});

test("independent 52-case Gold object loads directly and reports case-level misses", () => {
  const gold = loadGoldSet(new URL("./benefit-v2-independent-gold-20260922.json", import.meta.url));
  assert.equal(gold.length, 52);
  assert.equal(gold[0].caseId, "naverplus-spotify-basic");
  assert.equal(gold[0].fields.offer_price, 0);

  const disney = gold.find((item) => item.caseId === "disney-tving-bundle");
  const metrics = evaluateGoldSet([disney], [{
    offerId: "off_disney_bundle",
    serviceId: "disney",
    category: "PARTNERSHIP_SAVING",
    canonical: {
      ...disney.fields,
      partner_id: "disney_bundle",
    },
    actionUrl: disney.actionUrl,
    decision: disney.publish ? "PUBLISH" : "DO_NOT_PUBLISH",
    gateFailures: [],
  }]);
  assert.equal(metrics.discoveryRecall, 1);
  assert.equal(metrics.details.caseResults[0].status, "MATCH");

  const missed = evaluateGoldSet([gold[0]], []);
  assert.equal(missed.details.misses[0].caseId, "naverplus-spotify-basic");
  assert.equal(missed.details.misses[0].status, "NO_CANONICAL_MATCH");
});

test("an explicit official-evidence reconciliation hold blocks an otherwise publishable offer", () => {
  const offer = canonicalizeOffer({
    offerId: "off_price_conflict_hold",
    category: "PARTNERSHIP_SAVING",
    serviceId: "youtube",
    observations: [
      observation("target_service", "youtube"),
      observation("target_plan", "유튜브 프리미엄"),
      observation("offer_price", 4000),
      observation("audience", "EXISTING_OR_ALL"),
      observation("action_url", "https://official.example/join"),
      observation("actionability_status", "VERIFIED_ACTION"),
      observation("partner_id", "lguplus"),
      observation("verification_hold_reason", "OFFICIAL_PRICE_EVIDENCE_CONFLICT"),
    ],
    now: NOW,
  });
  const gate = evaluatePublishGate(offer, { now: NOW });
  assert.equal(gate.decision, "DO_NOT_PUBLISH");
  assert.ok(gate.failures.includes("VERIFICATION_HOLD:OFFICIAL_PRICE_EVIDENCE_CONFLICT"));
});

test("missing trusted membership cost stays unknown instead of becoming zero", () => {
  const snapshot = {
    ok: true,
    url: "https://help.naver.com/student",
    finalUrl: "https://help.naver.com/student",
    title: "네이버플러스 스튜던트 Spotify 혜택",
    text: "스튜던트 회원은 Spotify Premium Basic을 선택할 수 있습니다.",
    jsonLd: [],
    actionability: "VERIFIED_ENTRYPOINT",
    primaryAction: {
      url: "https://nid.naver.com/membership/my",
      requiresLogin: true,
    },
    observedAt: new Date(NOW).toISOString(),
  };
  const extracted = extractDeterministicObservations({
    snapshot,
    services: [{ id: "spotify", name: "Spotify", aliases: ["Spotify"] }],
    hintedServiceIds: ["spotify"],
    authorityRegistry: [{ domain: "naver.com", type: "OFFICIAL_PARTNER", name: "NAVER" }],
    trustedConstraints: {
      trustedEvidenceVerified: true,
      targetServiceId: "spotify",
      categoryHint: "PARTNERSHIP_SAVING",
      partnerId: "naverplus_student",
      requiredMembership: "naverplus_student",
      incrementalPartnerCost: null,
      trustedOfferPrice: 0,
      trustedOfferBillingCycle: "MONTHLY",
      trustedAudience: "EXISTING_OR_ALL",
    },
  });
  assert.equal(
    extracted.observations.some((item) => item.field === "incremental_partner_cost"),
    false
  );

  const offer = canonicalizeOffer({
    offerId: "off_student_unknown_cost",
    category: extracted.category,
    serviceId: extracted.service.id,
    observations: extracted.observations,
    now: NOW,
  });
  const gate = evaluatePublishGate(offer, { now: NOW });
  assert.equal(gate.decision, "DO_NOT_PUBLISH");
  assert.ok(gate.failures.includes("incremental_partner_cost:UNKNOWN"));
});

test("verified single-service seed resolves its trusted target on a multi-benefit page", () => {
  const snapshot = {
    ok: true,
    url: "https://card.example/happy",
    finalUrl: "https://card.example/happy",
    title: "국민행복 카드 혜택",
    text: "넷플릭스와 네이버 등 디지털 구독 할인",
    jsonLd: [],
    actionability: "INFO_ONLY",
    observedAt: new Date(NOW).toISOString(),
  };
  const services = [
    { id: "netflix", name: "Netflix", aliases: ["넷플릭스"] },
    { id: "youtube", name: "YouTube Premium", aliases: ["유튜브"] },
  ];
  const extracted = extractDeterministicObservations({
    snapshot,
    services,
    hintedServiceIds: ["youtube"],
    authorityRegistry: [{ domain: "card.example", type: "OFFICIAL_PARTNER", name: "Card" }],
    trustedConstraints: {
      trustedEvidenceVerified: true,
      targetServiceId: "youtube",
      categoryHint: "PARTNERSHIP_SAVING",
      partnerId: "card",
      requiredCard: "행복 카드",
      suppressOfferPrice: true,
      discountRate: 50,
    },
  });
  assert.equal(extracted.service.id, "youtube");
  assert.equal(
    extracted.observations.find((item) => item.field === "target_service")?.value,
    "youtube"
  );
});

test("verified official landing page with a real CTA can remain the action entrypoint", () => {
  const snapshot = {
    ok: true,
    url: "https://official.example/landing",
    finalUrl: "https://official.example/landing/",
    title: "공식 번들 할인",
    text: "두 서비스를 함께 이용하는 월간 할인 혜택",
    jsonLd: [],
    actionability: "VERIFIED_ACTION",
    pageType: "ACTION_OR_LANDING",
    primaryAction: {
      label: "번들 활성화",
      url: "https://official.example/activate",
      requiresLogin: false,
    },
    observedAt: new Date(NOW).toISOString(),
  };
  const extracted = extractDeterministicObservations({
    snapshot,
    services: [{ id: "disney", name: "Disney+", aliases: ["디즈니"] }],
    hintedServiceIds: ["disney"],
    authorityRegistry: [{ domain: "official.example", type: "OFFICIAL_PARTNER", name: "Official" }],
    trustedConstraints: {
      trustedEvidenceVerified: true,
      targetServiceId: "disney",
      categoryHint: "PARTNERSHIP_SAVING",
      partnerId: "bundle",
      targetPlan: "번들",
      trustedOfferPrice: 18000,
      trustedOfferBillingCycle: "MONTHLY",
      trustedAudience: "EXISTING_OR_ALL",
      actionUrl: "https://official.example/landing",
      actionRequiresLogin: false,
      preferSourcePageActionEntrypoint: true,
    },
  });
  const fields = Object.fromEntries(extracted.observations.map((item) => [item.field, item.value]));
  assert.equal(fields.action_url, "https://official.example/landing");
  assert.equal(fields.actionability_status, "VERIFIED_ENTRYPOINT");
  assert.equal(fields.requires_login, false);

  const unverified = extractDeterministicObservations({
    snapshot: { ...snapshot, actionability: "UNKNOWN", primaryAction: undefined },
    services: [{ id: "disney", name: "Disney+", aliases: ["디즈니"] }],
    hintedServiceIds: ["disney"],
    authorityRegistry: [{ domain: "official.example", type: "OFFICIAL_PARTNER", name: "Official" }],
    trustedConstraints: {
      trustedEvidenceVerified: true,
      targetServiceId: "disney",
      categoryHint: "PARTNERSHIP_SAVING",
      actionUrl: "https://official.example/landing",
      preferSourcePageActionEntrypoint: true,
    },
  });
  const unverifiedFields = Object.fromEntries(
    unverified.observations.map((item) => [item.field, item.value])
  );
  assert.equal(unverifiedFields.actionability_status, "UNKNOWN");
});

test("card landing keeps its own application page when the first link is an unrelated government application", () => {
  const source = OFFICIAL_BENEFIT_SOURCES.find((item) => item.id === "shinhan-happy");
  assert.equal(source.seedPages[0].preferSourcePageActionEntrypoint, true);
  const url = source.seedPages[0].actionUrlHint;
  const snapshot = {
    ok: true,
    url,
    finalUrl: url,
    title: "신한카드 국민행복",
    text: "국민행복 카드 넷플릭스, 유튜브 프리미엄 할인 혜택과 신청 방법",
    jsonLd: [],
    pageType: "ACTION_OR_LANDING",
    actionability: "VERIFIED_ACTION",
    primaryAction: {
      label: "임신 출산 지원금 신청",
      url: "https://www.shinhancard.com/mob/MOBFM038N/MOBFM038C17.shc",
      requiresLogin: false,
    },
    actionCandidates: [
      { label: "임신 출산 지원금 신청", url: "https://www.shinhancard.com/mob/MOBFM038N/MOBFM038C17.shc" },
      { label: "온라인 신청하기", url: null },
    ],
    observedAt,
  };
  const common = {
    services: [{ id: "netflix", name: "Netflix", aliases: ["넷플릭스"] }],
    hintedServiceIds: ["netflix"],
    authorityRegistry: [{ domain: "shinhancard.com", type: "OFFICIAL_PARTNER", name: "Shinhan" }],
    trustedConstraints: {
      trustedEvidenceVerified: true,
      partnerId: "shinhancard",
      partnerType: "CARD",
      targetServiceId: "netflix",
      actionUrl: url,
      preferSourcePageActionEntrypoint: true,
    },
  };
  const matched = extractDeterministicObservations({ snapshot, ...common });
  const values = Object.fromEntries(matched.observations.map((item) => [item.field, item.value]));
  assert.equal(values.action_url, url);
  assert.equal(values.actionability_status, "VERIFIED_ENTRYPOINT");

  const withoutApplication = extractDeterministicObservations({
    snapshot: { ...snapshot, actionCandidates: snapshot.actionCandidates.slice(0, 1) },
    ...common,
  });
  const withheld = Object.fromEntries(withoutApplication.observations.map((item) => [item.field, item.value]));
  assert.equal(withheld.action_url, url);
  assert.equal(withheld.actionability_status, "UNKNOWN");
});

test("LG U+ plan prices remain review leads until scope, dates and final billing agree", async () => {
  const builtIn = OFFICIAL_BENEFIT_SOURCES.find((source) => source.id === "lguplus-youtube");
  const source = {
    ...builtIn,
    seedPages: builtIn.seedPages.slice(0, 3),
  };
  const html = [
    "<html><body>",
    "유튜브 프리미엄 할인 혜택",
    "유튜브프리미엄 플러스플랜130 플러스플랜130",
    "유튜브프리미엄 플러스플랜115 플러스플랜115",
    "유튜브프리미엄 플러스플랜105 플러스플랜105",
    "</body></html>",
  ].join(" ");
  const fetchImpl = async (url) => ({
    ok: true,
    status: 200,
    url: String(url),
    headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    text: async () => html,
  });
  const result = await discoverOfficialBenefits({
    sources: [source],
    services: [{ id: "youtube", name: "YouTube Premium", aliases: ["유튜브 프리미엄"] }],
    fetchImpl,
    now: NOW,
  });
  assert.equal(result.failures.length, 0);
  assert.equal(result.candidates.length, 3);
  for (const candidate of result.candidates) {
    assert.equal(candidate.sourceUrl, builtIn.listUrl);
    assert.equal(candidate.actionUrlHint, builtIn.listUrl);
    assert.equal(candidate.preferSourcePageActionEntrypoint, true);
    assert.equal(candidate.suppressOfferPrice, true);
    assert.equal(candidate.trustedOfferPrice, null);
    assert.equal(candidate.trustedBlockReason, "OFFICIAL_PRICE_CONTEXT_UNVERIFIED");
  }
  const mapped = trustedCandidates(result, [source], NOW);
  for (const item of mapped) {
    assert.equal(item.discoveryRefs[0].priceReview.status, "UNVERIFIED_CONTEXT");
    assert.equal(item.trustedConstraints.trustedOfferPrice, null);
    assert.equal(item.trustedConstraints.suppressOfferPrice, true);
    assert.equal(item.trustedConstraints.trustedBlockReason, "OFFICIAL_PRICE_CONTEXT_UNVERIFIED");
    const planQuote = item.trustedConstraints.priceReview.quotes[0];
    const guideQuote = item.trustedConstraints.priceReview.quotes[1];
    assert.equal(planQuote.plan, item.trustedConstraints.requiredPlan);
    assert.equal(planQuote.evidenceKind, "SEARCH_INDEX");
    assert.equal(planQuote.effectiveFrom, null);
    assert.equal(guideQuote.plan, null);
    assert.equal(guideQuote.amount, 4450);
  }
});

test("price evidence compares only the same current plan, path, eligibility and billing stage", () => {
  const now = Date.parse("2026-09-25T12:00:00+09:00");
  const seed = OFFICIAL_BENEFIT_SOURCES.find((source) => source.id === "lguplus-youtube")
    .seedPages.find((item) => item.requiredPlan.includes("130"));
  const target = seed.priceReview.target;
  const url = "https://www.lguplus.com/verified/plan-pricing";
  const context = "유튜브 프리미엄 유독 요금제 전용 프리미엄 팩 월말까지 유지 갱신 월 최종 추가 청구";
  const proof4000 = `${target.plan} ${context} 2026-09-01~2026-12-31 4,000원`;
  const proof4450 = `${target.plan} ${context} 2026-09-01~2026-12-31 4,450원`;
  const quote = (amount, proof) => ({
    ...target,
    amount,
    sourceUrl: url,
    evidenceKind: "LIVE_OFFICIAL_PAGE",
    effectiveFrom: "2026-09-01",
    effectiveTo: "2026-12-31",
    evidenceSnippet: proof,
    requiredEvidenceTerms: [target.plan, "2026-09-01", `${amount.toLocaleString("en-US")}원`],
  });
  const snapshot = {
    ok: true, url, finalUrl: url,
    text: `${proof4000} | ${proof4450}`,
    observedAt: new Date(now).toISOString(),
  };
  const review = { target, quotes: [quote(4000, proof4000), seed.priceReview.quotes[1]] };
  const unresolved = assessPriceEvidence(review, { now, snapshot });
  assert.equal(unresolved.offerPrice, null, "an unscoped public quote can still apply to this plan");
  assert.equal(unresolved.holdReason, "OFFICIAL_PRICE_CONTEXT_UNVERIFIED");

  const otherPlan = quote(4450, proof4450.replace(target.plan, "LTE 프리미어 플러스"));
  otherPlan.plan = "LTE 프리미어 플러스";
  const resolved = assessPriceEvidence({ target, knownPlans: seed.priceReview.knownPlans,
    quotes: [quote(4000, proof4000), otherPlan] }, {
    now, snapshot: { ...snapshot, text: `${proof4000} | ${otherPlan.evidenceSnippet}` },
  });
  assert.equal(resolved.status, "VERIFIED_CURRENT_PRICE");
  assert.equal(resolved.offerPrice, 4000);
  assert.deepEqual(resolved.checks[1].differingFields, ["plan"]);
  for (const dimension of ["signupPath", "eligibility", "billingStage", "priceBasis"]) {
    const originals = {
      signupPath: "유독 요금제 전용",
      eligibility: "프리미엄 팩 월말까지 유지",
      billingStage: "갱신 월",
      priceBasis: "최종 추가 청구",
    };
    const alternateProof = `${proof4450.replace(originals[dimension], "다른 조건")} ${dimension}=OTHER_CONDITION`;
    const differentlyScoped = { ...quote(4450, alternateProof),
      [dimension]: "OTHER_CONDITION",
      conditionEvidence: { [dimension]: `${dimension}=OTHER_CONDITION` } };
    assert.equal(assessPriceEvidence({ target, quotes: [quote(4000, proof4000), differentlyScoped] }, {
      now, snapshot: { ...snapshot, text: `${proof4000} | ${alternateProof}` },
    }).offerPrice, 4000, `${dimension} must not create a false price conflict`);
  }
  assert.equal(assessPriceEvidence({ target, quotes: [quote(4000, proof4000), {
    ...quote(4450, `${proof4450} product=OTHER_CONDITION`),
    product: "OTHER_CONDITION",
    conditionEvidence: { product: "product=OTHER_CONDITION" },
  }] }, { now, snapshot: { ...snapshot,
    text: `${proof4000} | ${proof4450} product=OTHER_CONDITION` } }).offerPrice, null,
  "an alternate product label cannot override the target product embedded in the plan");
  const conflict = assessPriceEvidence({ target, quotes: [quote(4000, proof4000), quote(4450, proof4450)] }, { now, snapshot });
  assert.equal(conflict.holdReason, "OFFICIAL_PRICE_SAME_CONTEXT_CONFLICT");
  assert.equal(conflict.offerPrice, null);
  const oldProof = proof4450.replace("2026-12-31", "2026-08-31");
  const oldQuote = { ...quote(4450, oldProof), effectiveTo: "2026-08-31" };
  assert.equal(assessPriceEvidence({ target, quotes: [quote(4000, proof4000), oldQuote] }, {
    now, snapshot: { ...snapshot, text: `${proof4000} | ${oldProof}` },
  }).offerPrice, 4000);
  assert.equal(assessPriceEvidence({ target, quotes: [{
    ...quote(4000, proof4000), evidenceKind: "SEARCH_INDEX",
  }] }, { now, snapshot }).offerPrice, 4000, "live page proof can upgrade an index lead");
  assert.equal(assessPriceEvidence({ target, quotes: [{
    ...quote(4000, proof4000), effectiveFrom: null,
  }] }, { now, snapshot }).offerPrice, 4000, "a unique period visible in the page fills a missing lead date");
  assert.equal(assessPriceEvidence({ target, quotes: [{
    ...quote(4000, proof4000), effectiveFrom: null, effectiveTo: null,
  }] }, { now, snapshot: { ...snapshot, text: proof4000.replace("2026-09-01~2026-12-31", "") } }).offerPrice, null);
  assert.equal(assessPriceEvidence({ target, quotes: [quote(4000, proof4000)] }, {
    now, snapshot: { ...snapshot, finalUrl: "https://other.example/page" },
  }).offerPrice, null);
});

test("review fetches both approved official pages and resolves a plan-scoped discrepancy", async () => {
  const source = OFFICIAL_BENEFIT_SOURCES.find((item) => item.id === "lguplus-youtube");
  const review = source.seedPages.find((item) => item.requiredPlan.includes("130")).priceReview;
  const now = Date.parse("2026-09-25T12:00:00+09:00");
  const [plan, guide] = review.quotes;
  const clause = (name, amount) =>
    `유튜브 프리미엄 ${name} 유독 요금제 전용 프리미엄 팩 월말까지 유지 갱신 월 최종 추가 청구 ${amount}원 2026-09-01~2026-12-31`;
  const content = new Map([
    [plan.sourceUrl, clause("플러스플랜130", "4,000")],
    [guide.sourceUrl, clause("LTE 프리미어 플러스", "4,450")],
  ]);
  const fetched = [];
  const stored = [];
  const loadSnapshot = async (url) => {
    fetched.push(url);
    const text = content.get(url) || "";
    return { ok: true, url, finalUrl: url, title: "유튜브 프리미엄",
      html: `<html><body><table><tr><td>${text}</td></tr></table></body></html>`,
      text, observedAt: new Date(now).toISOString() };
  };
  const options = {
    now, primarySnapshot: { ok: true, url: source.listUrl, finalUrl: source.listUrl,
      text: "LG U+ 유튜브 프리미엄 혜택", observedAt: new Date(now).toISOString() },
    allowedOrigins: source.allowedOrigins,
    authorityRegistry: [{ domain: "lguplus.com", type: "OFFICIAL_PARTNER", name: "LG U+" }],
    targetServiceId: "youtube",
    loadSnapshot,
    onSnapshot: async (page) => stored.push(page.url),
  };
  const resolved = await reconcileOfficialPriceReview(review, options);
  assert.equal(resolved.status, "VERIFIED_CURRENT_PRICE");
  assert.equal(resolved.offerPrice, 4000);
  assert.deepEqual(resolved.checks.map((check) => check.status),
    ["SAME_CURRENT_CONDITION", "DIFFERENT_CONDITION"]);
  assert.deepEqual(fetched, [plan.sourceUrl, guide.sourceUrl]);
  assert.deepEqual(stored, fetched);

  content.set(guide.sourceUrl, clause("플러스플랜130", "4,450"));
  assert.equal((await reconcileOfficialPriceReview(review, options)).holdReason,
    "OFFICIAL_PRICE_SAME_CONTEXT_CONFLICT",
    "a second live amount for the same plan must not be published");
  content.set(guide.sourceUrl, "유튜브 프리미엄 월 추가금액 4,450원");
  assert.equal((await reconcileOfficialPriceReview(review, options)).holdReason,
    "OFFICIAL_PRICE_CONTEXT_UNVERIFIED",
    "an unscoped guide cannot be dismissed as another plan");
  content.set(plan.sourceUrl, "플러스플랜130 유튜브 프리미엄 가입 안내");
  assert.equal((await reconcileOfficialPriceReview(review, options)).offerPrice, null,
    "the old search-index amount alone cannot unlock a price");
  content.set(plan.sourceUrl, clause("플러스플랜130", "4,000"));
  const unapproved = { ...review, quotes: [plan, { ...guide, sourceUrl: "https://other.example/guide" }] };
  const before = fetched.length;
  assert.equal((await reconcileOfficialPriceReview(unapproved, options)).offerPrice, null);
  assert.equal(fetched.length, before + 1, "unapproved URLs must not be fetched");
  const redirecting = { ...options, loadSnapshot: async (url) => ({
    ...(await loadSnapshot(url)), finalUrl: "https://other.example/redirect",
  }) };
  assert.equal((await reconcileOfficialPriceReview(review, redirecting)).offerPrice, null);
  const splitRows = { ...options, loadSnapshot: async (url) => {
    const base = await loadSnapshot(url);
    if (url !== plan.sourceUrl) return base;
    const description = clause("플러스플랜130", "4,000").replace("4,000원", "");
    const unrelatedPrice = "유튜브 프리미엄 LTE 프리미어 플러스 4,000원";
    return { ...base, html: `<table><tr><td>${description}</td></tr><tr><td>${unrelatedPrice}</td></tr></table>`,
      text: `${description} ${unrelatedPrice}` };
  } };
  assert.equal((await reconcileOfficialPriceReview(review, splitRows)).offerPrice, null,
    "price and target conditions in different HTML rows cannot be combined");
});

test("LG U+ unverified context blocks both page-extracted and LLM-suggested prices", () => {
  const source = OFFICIAL_BENEFIT_SOURCES.find((item) => item.id === "lguplus-youtube");
  const seed = source.seedPages.find((item) => item.requiredPlan.includes("115"));
  const [mapped] = trustedCandidates({ candidates: [{
    ...seed,
    sourceUrl: seed.url,
    partnerId: source.partnerId,
    trustedEvidenceVerified: true,
  }] }, [source], NOW);
  const snapshot = {
    ok: true,
    url: seed.url,
    finalUrl: seed.url,
    title: seed.title,
    text: `${seed.requiredPlan} 유튜브 프리미엄 혜택가 4,000원. 월말까지 유지하세요.`,
    jsonLd: [],
    actionability: "VERIFIED_ENTRYPOINT",
    primaryAction: { url: seed.url, requiresLogin: false },
    observedAt,
  };
  const extracted = extractDeterministicObservations({
    snapshot,
    services: [{ id: "youtube", name: "YouTube Premium", aliases: ["유튜브 프리미엄"] }],
    hintedServiceIds: ["youtube"],
    authorityRegistry: [{ domain: "lguplus.com", type: "OFFICIAL_PARTNER", name: "LG U+" }],
    trustedConstraints: mapped.trustedConstraints,
  });
  assert.equal(extracted.observations.find((row) => row.field === "offer_price"), undefined);
  assert.equal(filterLlmObservationsForTrustedConstraints([
    observation("offer_price", 4000),
  ], mapped.trustedConstraints).length, 0);
  const offer = canonicalizeOffer({
    offerId: "off_lguplus_plan115_unverified",
    category: "PARTNERSHIP_SAVING",
    serviceId: "youtube",
    observations: extracted.observations,
    now: NOW,
  });
  assert.equal(evaluatePublishGate(offer, { now: NOW }).decision, "DO_NOT_PUBLISH");
  assert.equal(offer.fields.verification_hold_reason.value, "OFFICIAL_PRICE_CONTEXT_UNVERIFIED");
});

test("KT shared benefit page selects the matching plan signup link", async () => {
  const kt = OFFICIAL_BENEFIT_SOURCES.find((source) => source.id === "kt-choice-bundles");
  const seeds = kt.seedPages.filter((seed) => seed.preferredPlanActionUrl);
  const codes = {
    "kt-netflix-초이스130": "PL25BD669",
    "kt-netflix-초이스110": "PL2649754",
    "kt-netflix-초이스90": "PL2649755",
    "kt-youtube-choice130": "PL25BD667",
    "kt-youtube-choice110": "PL2649753",
    "kt-youtube-choice90": "PL2649752",
    "kt-disney-초이스130": "PL25BD671",
    "kt-disney-초이스110": "PL2649749",
    "kt-disney-초이스90": "PL2649748",
  };
  assert.equal(seeds.length, 9);
  const requestedSeed = seeds.find((seed) => seed.variantId === "kt-netflix-초이스110");
  const discovered = await discoverOfficialBenefits({
    sources: [{ ...kt, seedPages: [requestedSeed] }],
    services: [{ id: "netflix", name: "Netflix", aliases: ["넷플릭스"] }],
    fetchImpl: async (url) => ({
      ok: true,
      status: 200,
      url: String(url),
      headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
      text: async () => `<html><body>${requestedSeed.requiredEvidenceTerms.join(" ")}</body></html>`,
    }),
    now: NOW,
  });
  assert.equal(discovered.failures.length, 0);
  assert.equal(discovered.candidates[0].preferredPlanActionUrl, requestedSeed.preferredPlanActionUrl);
  for (const seed of seeds) {
    assert.equal(seed.actionRequiresLoginHint, true);
    if (seed.targetServiceIds[0] === "youtube") {
      assert.equal(seed.actionUrlHint, seed.url);
      assert.equal(seed.suppressOfferPrice, true);
    }
    assert.equal(
      seed.preferredPlanActionUrl,
      `https://m.my.kt.com/product/s_MobilePriceView.do?ctgryProd=${codes[seed.variantId]}`
    );
    const related = seeds.filter((item) => item.url === seed.url);
    const snapshot = {
      ok: true,
      url: seed.url,
      finalUrl: seed.url,
      title: seed.title,
      text: related.map((item) => item.requiredPlan).join(" "),
      actionability: "VERIFIED_ACTION",
      primaryAction: { label: "신청하기", url: related[0].preferredPlanActionUrl },
      actionCandidates: related.map((item) => ({
        label: "신청하기",
        url: item.preferredPlanActionUrl,
      })),
      observedAt,
    };
    const args = {
      snapshot,
      services: [{ id: seed.targetServiceIds[0], name: seed.title, aliases: [] }],
      hintedServiceIds: seed.targetServiceIds,
      authorityRegistry: [{ domain: "kt.com", type: "OFFICIAL_PARTNER", name: "KT" }],
      trustedConstraints: {
        trustedEvidenceVerified: true,
        preferredPlanActionUrl: seed.preferredPlanActionUrl,
        actionUrl: seed.actionUrlHint,
        actionRequiresLogin: seed.actionRequiresLoginHint,
      },
    };
    const observed = extractDeterministicObservations(args);
    assert.equal(
      observed.observations.find((item) => item.field === "action_url")?.value,
      seed.preferredPlanActionUrl
    );
    assert.equal(observed.observations.find((item) => item.field === "requires_login")?.value, true);
    assert.equal(observed.observations.find((item) => item.field === "actionability_status")?.value, "VERIFIED_ENTRYPOINT");
    if (seed !== related[0]) {
      const missing = extractDeterministicObservations({
        ...args,
        snapshot: { ...snapshot, actionCandidates: snapshot.actionCandidates.slice(0, 1) },
      });
      const fields = Object.fromEntries(missing.observations.map((item) => [item.field, item.value]));
      assert.equal(fields.action_url, seed.actionUrlHint);
      assert.equal(fields.actionability_status, "UNKNOWN");
      assert.equal(fields.requires_login, false);
    }
  }
});

test("KT plan signup authentication remains a login entrypoint after action fetch", () => {
  const actionUrl = "https://m.my.kt.com/product/s_MobilePriceView.do?ctgryProd=PL2649754";
  const actionSnapshot = {
    ok: true,
    url: actionUrl,
    finalUrl: `https://accounts.kt.com/wamui/AthMobile.do?mRt=${encodeURIComponent(actionUrl)}`,
    actionability: "VERIFIED_ACTION",
    primaryAction: { requiresLogin: false },
  };
  const fields = (snapshot, trustedConstraints = {}) => Object.fromEntries(
    buildActionVerificationObservations({ actionUrl, actionSnapshot: snapshot, trustedConstraints })
      .map((item) => [item.field, item.value])
  );
  assert.deepEqual(fields(actionSnapshot), {
    actionability_status: "VERIFIED_ENTRYPOINT",
    requires_login: true,
  });
  assert.deepEqual(fields({ ...actionSnapshot, finalUrl: actionUrl }, {
    actionRequiresLogin: true,
    preferredPlanActionUrl: actionUrl,
  }), {
    actionability_status: "VERIFIED_ENTRYPOINT",
    requires_login: true,
  });
  assert.deepEqual(fields({ ...actionSnapshot, finalUrl: actionUrl }), {
    actionability_status: "VERIFIED_ACTION",
    requires_login: false,
  });
});

test("Gold bundle option comparison is order-insensitive", () => {
  const metrics = evaluateGoldSet([{
    caseId: "bundle-order",
    match: { serviceId: "youtube", category: "PARTNERSHIP_SAVING" },
    category: "PARTNERSHIP_SAVING",
    publish: false,
    fields: { bundle_options: ["넷플릭스", "디즈니+", "티빙", "웨이브"] },
  }], [{
    offerId: "off_bundle_order",
    serviceId: "youtube",
    category: "PARTNERSHIP_SAVING",
    canonical: { bundle_options: ["넷플릭스", "티빙", "디즈니+", "웨이브"] },
    decision: "DO_NOT_PUBLISH",
  }]);
  assert.equal(metrics.fieldAccuracy, 1);
  assert.deepEqual(metrics.details.caseResults[0].mismatches, []);
});
