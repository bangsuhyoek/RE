import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTEST_BENEFIT_SOURCES,
  CONTEST_VERIFIED_OFFERS,
  toPublicV7OfferRow,
} from "../scripts/benefits/contestVerifiedOffers.js";
import { mapV7PublicOffer } from "../src/features/benefits/adapters/v7PublishedOfferAdapter.js";
import {
  HybridRecommendationStatus,
  buildHybridRecommendation,
} from "../src/features/benefits/domain/hybridRecommendation.js";
import {
  buildV7RecommendationViewModel,
  partitionRecommendationViewModels,
} from "../src/features/benefits/presentation/recommendationViewModel.js";
import { loadBenefitRecommendations } from "../src/features/benefits/api/benefitRecommendationLoader.js";
import { benefitFetchSuccess } from "../src/features/benefits/api/fetchState.js";

function mappedOffer(id) {
  const payload = CONTEST_VERIFIED_OFFERS.find(
    (offer) => offer.service_offer_id === id
  );
  assert.ok(payload, "Missing contest offer " + id);
  return mapV7PublicOffer(toPublicV7OfferRow(payload));
}

const netflixPremiumSubscription = {
  id: "netflix",
  serviceId: "netflix",
  name: "Netflix",
  plan: "프리미엄",
  amount: 17000,
  billingCycle: "매월",
  status: "active",
};

test("contest offer manifest contains only verified official-source V7 publications", () => {
  assert.equal(CONTEST_VERIFIED_OFFERS.length, 3);
  for (const offer of CONTEST_VERIFIED_OFFERS) {
    assert.equal(offer.publication_state, "PUBLISHED");
    assert.equal(offer.verification_state, "VERIFIED_OFFICIAL_SOURCE");
    assert.match(offer.candidate_payload_sha256, /^[0-9A-F]{64}$/);
    assert.match(offer.publication_payload_sha256, /^[0-9A-F]{64}$/);
    assert.ok(offer.source_url.startsWith("https://help.naver.com/"));
    assert.ok(offer.evidence_refs.length > 0);
    assert.ok(offer.resolved_fact_refs.length > 0);
  }
  assert.ok(CONTEST_BENEFIT_SOURCES.naverPlusPrice.includes("help.naver.com"));
});

test("primary contest Netflix premium flow produces 2,100 KRW confirmed monthly saving", () => {
  const offer = mappedOffer("contest-naverplus-netflix-premium-20260920");
  const recommendation = buildV7RecommendationViewModel(
    [netflixPremiumSubscription],
    offer,
    {}
  );
  assert.equal(
    recommendation.status,
    HybridRecommendationStatus.ELIGIBLE_CONFIRMED
  );
  assert.equal(recommendation.publicationQualified, true);
  assert.equal(recommendation.savings.amount, 2100);
  assert.equal(recommendation.savings.period, "MONTHLY_RECURRING");
  assert.equal(recommendation.savings.isConfirmed, true);
});

test("contest V7 fetch makes Hybrid loader SUCCESS with visible recommendation", async () => {
  const offers = CONTEST_VERIFIED_OFFERS.map((offer) =>
    mapV7PublicOffer(toPublicV7OfferRow(offer))
  );
  const result = await loadBenefitRecommendations({
    subscriptions: [netflixPremiumSubscription],
    legacyFetcher: async () => benefitFetchSuccess([], "legacy-test"),
    v7Fetcher: async () => benefitFetchSuccess(offers, "v7-public-offers-test"),
  });

  const sections = partitionRecommendationViewModels(result.recommendations);
  const visibleCount =
    sections.confirmed.length +
    sections.needsCheck.length +
    sections.additional.length;

  assert.equal(result.loadState, "SUCCESS");
  assert.equal(result.v7Offers.length, 3);
  assert.ok(visibleCount > 0);
  assert.ok(
    sections.confirmed.some(
      (item) =>
        item.id === "contest-naverplus-netflix-premium-20260920" &&
        item.savings?.amount === 2100
    )
  );
});

test("Naver Plus annual official price computes 12,000 KRW annual saving", () => {
  const offer = mappedOffer("contest-naverplus-annual-20260920");
  const subscription = {
    id: "naverplus",
    serviceId: "naverplus",
    name: "네이버플러스 멤버십",
    plan: "월간 이용권",
    amount: 4900,
    billingCycle: "매월",
    status: "active",
  };
  const result = buildHybridRecommendation(offer, [subscription], {});
  assert.equal(result.status, HybridRecommendationStatus.ELIGIBLE_CONFIRMED);
  assert.equal(result.savings.amount, 12000);
  assert.equal(result.savings.period, "ANNUAL");
});

test("non-matching subscription is not promoted to a fake visible saving", () => {
  const offer = mappedOffer("contest-naverplus-netflix-premium-20260920");
  const result = buildHybridRecommendation(
    offer,
    [{ id: "youtube", serviceId: "youtube", amount: 14900, status: "active" }],
    {}
  );
  assert.equal(result.status, HybridRecommendationStatus.INELIGIBLE);
  assert.equal(result.reason, "SERVICE_NOT_SUBSCRIBED");
});
