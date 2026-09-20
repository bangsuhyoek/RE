import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTEST_BENEFIT_SOURCES,
  CONTEST_SUPERSEDED_OFFERS,
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
  recommendationConditionLabels,
  summarizePublishedConfirmedSavings,
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

const spotifyBasicSubscription = {
  id: "spotify",
  serviceId: "spotify",
  name: "Spotify",
  plan: "프리미엄 베이직",
  amount: 10900,
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
  assert.deepEqual(CONTEST_SUPERSEDED_OFFERS, [
    {
      service_offer_id: "contest-naverplus-netflix-premium-20260920",
      replacement_service_offer_id:
        "contest-naverplus-netflix-premium-20260920-r2",
      reason: "Correct Naver Plus monthly digital-content choice exclusivity.",
    },
  ]);
});

test("primary contest Netflix premium flow produces 2,100 KRW confirmed monthly saving", () => {
  const offer = mappedOffer("contest-naverplus-netflix-premium-20260920-r2");
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
        item.id === "contest-naverplus-netflix-premium-20260920-r2" &&
        item.savings?.amount === 2100
    )
  );
});

test("Spotify-only flow produces 6,000 KRW confirmed monthly saving", () => {
  const offer = mappedOffer("contest-naverplus-spotify-basic-20260920");
  const recommendation = buildV7RecommendationViewModel(
    [spotifyBasicSubscription],
    offer,
    {}
  );
  const summary = summarizePublishedConfirmedSavings([recommendation]);

  assert.equal(
    recommendation.status,
    HybridRecommendationStatus.ELIGIBLE_CONFIRMED
  );
  assert.equal(recommendation.savings.amount, 6000);
  assert.equal(summary.amount, 6000);
  assert.equal(summary.count, 1);
  assert.equal(summary.hasExclusiveChoice, false);
});

test("Netflix and Spotify share one Naver Plus digital-content choice slot", () => {
  const netflix = mappedOffer("contest-naverplus-netflix-premium-20260920-r2");
  const spotify = mappedOffer("contest-naverplus-spotify-basic-20260920");

  assert.equal(
    netflix.selectionRelation.exclusive_group,
    "NAVERPLUS_DIGITAL_CONTENT_CHOICE"
  );
  assert.equal(
    spotify.selectionRelation.exclusive_group,
    "NAVERPLUS_DIGITAL_CONTENT_CHOICE"
  );
  assert.equal(netflix.selectionRelation.stackable, false);
  assert.equal(spotify.selectionRelation.stackable, false);
  assert.equal(
    netflix.selectionRelation.choice_label,
    "네이버플러스 디지털 콘텐츠 월 1개 선택"
  );
});

test("Netflix + Spotify stays visible but portfolio total chooses only the better exclusive option", () => {
  const offers = CONTEST_VERIFIED_OFFERS.map((offer) =>
    mapV7PublicOffer(toPublicV7OfferRow(offer))
  );
  const recommendations = offers.map((offer) =>
    buildV7RecommendationViewModel(
      [netflixPremiumSubscription, spotifyBasicSubscription],
      offer,
      {}
    )
  );
  const sections = partitionRecommendationViewModels(recommendations);
  const summary = summarizePublishedConfirmedSavings(recommendations);

  assert.equal(sections.confirmed.length, 2);
  assert.equal(summary.amount, 6000);
  assert.equal(summary.count, 1);
  assert.equal(summary.candidateCount, 2);
  assert.equal(summary.hasExclusiveChoice, true);
  assert.equal(summary.exclusiveChoices.length, 1);
  assert.equal(
    summary.exclusiveChoices[0].choiceLabel,
    "네이버플러스 디지털 콘텐츠 월 1개 선택"
  );
  assert.equal(summary.selected[0].serviceId, "spotify");
  assert.deepEqual(
    summary.exclusiveChoices[0].recommendationIds.sort(),
    [
      "contest-naverplus-netflix-premium-20260920-r2",
      "contest-naverplus-spotify-basic-20260920",
    ].sort()
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
  const offer = mappedOffer("contest-naverplus-netflix-premium-20260920-r2");
  const result = buildHybridRecommendation(
    offer,
    [{ id: "youtube", serviceId: "youtube", amount: 14900, status: "active" }],
    {}
  );
  assert.equal(result.status, HybridRecommendationStatus.INELIGIBLE);
  assert.equal(result.reason, "SERVICE_NOT_SUBSCRIBED");
});

test("confirmed benefit condition labels use user-facing Korean instead of internal enums", () => {
  const offer = mappedOffer("contest-naverplus-netflix-premium-20260920-r2");
  const recommendation = buildV7RecommendationViewModel(
    [netflixPremiumSubscription],
    offer,
    {}
  );
  const labels = recommendationConditionLabels(recommendation);
  const text = labels.join(" ");
  assert.match(text, /현재 이용 중인 고객도 가능/);
  assert.match(text, /요금제 프리미엄/);
  assert.match(text, /네이버플러스 멤버십 필요/);
  assert.doesNotMatch(text, /EXISTING_SUBSCRIBER|\bANY\b/);
});
