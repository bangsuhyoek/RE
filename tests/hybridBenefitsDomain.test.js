import test from "node:test";
import assert from "node:assert/strict";

import { mapV7PublicOffer } from "../src/features/benefits/adapters/v7PublishedOfferAdapter.js";
import {
  HybridRecommendationStatus,
  MonetaryComputability,
  SubscriptionRelevance,
  buildHybridRecommendation,
} from "../src/features/benefits/domain/hybridRecommendation.js";
import {
  BenefitFetchStatus,
  BenefitLoadState,
  classifyBenefitFetchResult,
} from "../src/features/benefits/api/fetchState.js";
import { fetchPublishedV7Offers } from "../src/features/benefits/api/v7PublishedOffers.js";
import { summarizeConfirmedMonthlySavings } from "../src/lib/savingsCalculator.js";
import { fetchActiveBenefitsResult } from "../src/lib/supabase.js";

function publishedRow(overrides = {}) {
  return {
    service_offer_id: "offer-netflix",
    service_id: "netflix",
    service_name: "Netflix",
    partner: "Official Partner",
    benefit_name: "Netflix monthly discount",
    benefit_type: "FIXED_DISCOUNT",
    benefit_value: "5000",
    benefit_unit: "KRW",
    benefit_base: "SUBSCRIPTION_FEE",
    minimum_purchase_value: null,
    minimum_purchase_unit: null,
    minimum_purchase_source_expression: null,
    maximum_benefit: null,
    frequency_family: "MONTHLY",
    frequency_count: 1,
    frequency_source_expression: "monthly",
    audience_condition: { audience: "EXISTING" },
    payment_condition: {},
    channel_condition: "ANY",
    exclusions: [],
    selection_relation: null,
    lottery_award_mechanism: null,
    lottery_certainty: null,
    allocation_method: null,
    certainty: "CONFIRMED",
    temporal_start: "2026-09-01",
    temporal_end: "2026-12-31",
    source_url: "https://example.com/offer",
    display_contract: {},
    ...overrides,
  };
}

const netflix = {
  id: "netflix",
  name: "Netflix",
  plan: "Premium",
  amount: 17000,
  billingCycle: "monthly",
  paymentMethod: "Shinhan",
  status: "active",
};

function recommend(row, subscriptions = [netflix], userContext = { channel: "APP" }) {
  return buildHybridRecommendation(
    mapV7PublicOffer(row),
    subscriptions,
    userContext
  );
}
test("Case 1: fixed monthly discount => ELIGIBLE_CONFIRMED and 5000 KRW saving", () => {
  const result = recommend(publishedRow());
  assert.equal(result.status, HybridRecommendationStatus.ELIGIBLE_CONFIRMED);
  assert.equal(result.relevance, SubscriptionRelevance.SUBSCRIPTION_COST_REDUCTION);
  assert.equal(result.savings.amount, 5000);
  assert.equal(result.savings.isConfirmed, true);
});

test("Case 2: required SKT plan with missing user carrier/plan => NEEDS_CHECK", () => {
  const row = publishedRow({
    audience_condition: {
      operator: "AND",
      children: [
        { audience: "EXISTING" },
        { required_carrier: "SKT" },
        { required_plan: "5GX" },
      ],
    },
  });
  const result = recommend(row, [{ ...netflix, plan: "" }], { channel: "APP" });
  assert.equal(result.status, HybridRecommendationStatus.NEEDS_CHECK);
});

test("Case 3: new-subscriber-only offer for current subscriber => INELIGIBLE", () => {
  const result = recommend(publishedRow({
    audience_condition: { audience: "NEW" },
  }));
  assert.equal(result.status, HybridRecommendationStatus.INELIGIBLE);
});
test("Case 4: unresolved 20 percent rate base => ELIGIBLE_NOT_COMPUTABLE", () => {
  const result = recommend(publishedRow({
    benefit_type: "PERCENT_DISCOUNT",
    benefit_value: "20",
    benefit_unit: "PERCENT",
    benefit_base: "SUBSCRIPTION_FEE",
    display_contract: { unresolved: ["RATE_BASE_UNKNOWN"] },
  }));
  assert.equal(result.status, HybridRecommendationStatus.ELIGIBLE_NOT_COMPUTABLE);
  assert.equal(result.computability.status, MonetaryComputability.NOT_COMPUTABLE);
  assert.equal(result.computability.reason, "RATE_BASE_UNKNOWN");
  assert.equal(result.savings, null);
});

test("Case 5: 5000P without proven KRW subscription value is not converted to money", () => {
  const result = recommend(publishedRow({
    benefit_type: "POINT_AMOUNT",
    benefit_value: "5000",
    benefit_unit: "POINT",
    benefit_base: "SUBSCRIPTION_FEE",
  }));
  assert.equal(result.status, HybridRecommendationStatus.ELIGIBLE_NOT_COMPUTABLE);
  assert.equal(result.relevance, SubscriptionRelevance.SUBSCRIPTION_CREDIT);
  assert.equal(result.computability.reason, "POINT_VALUE_NOT_PROVEN_IN_KRW");
  assert.equal(result.savings, null);
});

test("Case 6: lottery conditional free benefit is excluded from confirmed savings", () => {
  const result = recommend(publishedRow({
    benefit_type: "CHANCE_PRIZE",
    benefit_value: null,
    benefit_unit: null,
    benefit_base: "SUBSCRIPTION_FEE",
    lottery_award_mechanism: "LOTTERY",
    lottery_certainty: "CONDITIONAL_ON_WINNING",
    allocation_method: "RANDOM",
  }));
  assert.equal(result.status, HybridRecommendationStatus.NON_SUBSCRIPTION_RELEVANT);
  assert.equal(result.relevance, SubscriptionRelevance.LOTTERY);
  assert.equal(result.savings, null);
});
test("Case 7: general-shopping free shipping stays non-subscription relevant", () => {
  const result = recommend(publishedRow({
    benefit_type: "FREE",
    benefit_value: null,
    benefit_unit: null,
    benefit_base: "SHIPPING",
    minimum_purchase_value: 15000,
    minimum_purchase_unit: "KRW",
  }));
  assert.equal(result.status, HybridRecommendationStatus.NON_SUBSCRIPTION_RELEVANT);
  assert.equal(result.relevance, SubscriptionRelevance.NON_SUBSCRIPTION_BENEFIT);
});

test("Case 8: required membership cost is deducted from included subscription saving", () => {
  const result = recommend(publishedRow({
    benefit_type: "FREE_INCLUDED",
    benefit_value: null,
    benefit_unit: null,
    benefit_base: "SUBSCRIPTION_FEE",
    audience_condition: {
      operator: "AND",
      children: [
        { audience: "EXISTING" },
        {
          required_membership: "naverplus",
          required_cost: 4900,
          allow_join: true,
        },
      ],
    },
  }));

  assert.equal(result.status, HybridRecommendationStatus.ELIGIBLE_CONFIRMED);
  assert.equal(result.savings.amount, 12100);
  assert.equal(result.savings.requiredCost, 4900);
});
test("Case 9: mutually exclusive offers are not double-counted", () => {
  const high = recommend(publishedRow({
    service_offer_id: "offer-high",
    benefit_value: "5000",
    selection_relation: {
      exclusive_group: "netflix-choice",
      stackable: false,
    },
  }));
  const low = recommend(publishedRow({
    service_offer_id: "offer-low",
    benefit_value: "3000",
    selection_relation: {
      exclusive_group: "netflix-choice",
      stackable: false,
    },
  }));

  const summary = summarizeConfirmedMonthlySavings([low, high]);
  assert.equal(summary.amount, 5000);
  assert.equal(summary.count, 1);
  assert.equal(summary.selected[0].benefit.id, "offer-high");
});

test("Case 9b: independent explicit groups are safely summed", () => {
  const item = (id, target, group, amount) => ({
    benefit: {
      id,
      targetServiceIds: [target],
      exclusiveGroup: group,
      stackable: false,
    },
    eligibility: { status: "ELIGIBLE" },
    savings: {
      amount,
      period: "MONTHLY_RECURRING",
      isConfirmed: true,
    },
  });

  const summary = summarizeConfirmedMonthlySavings([
    item("netflix-offer", "netflix", "group-netflix", 5000),
    item("spotify-offer", "spotify", "group-spotify", 3000),
  ]);

  assert.equal(summary.amount, 8000);
  assert.equal(summary.count, 2);
  assert.equal(summary.exclusiveChoices.length, 0);
});

test("Case 9c: three offers in one exclusive group contribute only the highest saving", () => {
  const item = (id, amount) => ({
    benefit: {
      id,
      targetServiceIds: [id],
      exclusiveGroup: "one-choice",
      stackable: false,
    },
    eligibility: { status: "ELIGIBLE" },
    savings: {
      amount,
      period: "MONTHLY_RECURRING",
      isConfirmed: true,
    },
  });

  const summary = summarizeConfirmedMonthlySavings([
    item("low", 2000),
    item("high", 6000),
    item("mid", 4000),
  ]);

  assert.equal(summary.amount, 6000);
  assert.equal(summary.count, 1);
  assert.equal(summary.candidateCount, 3);
  assert.equal(summary.selected[0].benefit.id, "high");
  assert.equal(summary.exclusiveChoices.length, 1);
  assert.equal(summary.exclusiveChoices[0].items.length, 3);
});

test("Case 9d: same target is summed only when both offers are explicitly stackable", () => {
  const item = (id, amount) => ({
    benefit: {
      id,
      targetServiceIds: ["netflix"],
      stackable: true,
    },
    eligibility: { status: "ELIGIBLE" },
    savings: {
      amount,
      period: "MONTHLY_RECURRING",
      isConfirmed: true,
    },
  });

  const summary = summarizeConfirmedMonthlySavings([
    item("stack-a", 2000),
    item("stack-b", 3000),
  ]);

  assert.equal(summary.amount, 5000);
  assert.equal(summary.count, 2);
});

test("Case 9e: unknown cross-offer relation is never combined with another confirmed offer", () => {
  const known = {
    benefit: {
      id: "known",
      targetServiceIds: ["netflix"],
      exclusiveGroup: "known-group",
      stackable: false,
    },
    eligibility: { status: "ELIGIBLE" },
    savings: {
      amount: 5000,
      period: "MONTHLY_RECURRING",
      isConfirmed: true,
    },
  };
  const unknown = {
    benefit: {
      id: "unknown",
      targetServiceIds: ["spotify"],
      stackable: false,
    },
    eligibility: { status: "ELIGIBLE" },
    savings: {
      amount: 4000,
      period: "MONTHLY_RECURRING",
      isConfirmed: true,
    },
  };

  const summary = summarizeConfirmedMonthlySavings([known, unknown]);

  assert.equal(summary.amount, 5000);
  assert.equal(summary.count, 1);
  assert.equal(summary.hasUncertainCompatibility, true);
  assert.equal(summary.uncertainItems.length, 1);
  assert.equal(summary.uncertainItems[0].benefit.id, "unknown");
});

test("Case 9f: portfolio selector finds the best compatible combination beyond greedy order", () => {
  const item = (id, target, group, amount) => ({
    benefit: {
      id,
      targetServiceIds: [target],
      exclusiveGroup: group,
      stackable: false,
    },
    eligibility: { status: "ELIGIBLE" },
    savings: {
      amount,
      period: "MONTHLY_RECURRING",
      isConfirmed: true,
    },
  });

  const summary = summarizeConfirmedMonthlySavings([
    item("single-high", "netflix", "choice-a", 6000),
    item("combo-a", "spotify", "choice-a", 4000),
    item("combo-b", "netflix", "choice-b", 4000),
  ]);

  assert.equal(summary.amount, 8000);
  assert.equal(summary.count, 2);
  assert.deepEqual(
    summary.selected.map((entry) => entry.benefit.id).sort(),
    ["combo-a", "combo-b"]
  );
});

test("Case 10: fetch failure is distinct from successful empty result", async () => {
  const failingClient = {
    from() {
      return {
        async select() {
          return { data: null, error: new Error("permission denied") };
        },
      };
    },
  };
  const emptyClient = {
    from() {
      return {
        async select() {
          return { data: [], error: null };
        },
      };
    },
  };

  const failed = await fetchPublishedV7Offers(failingClient);
  const empty = await fetchPublishedV7Offers(emptyClient);

  assert.equal(failed.status, BenefitFetchStatus.FETCH_FAILED);
  assert.equal(classifyBenefitFetchResult(failed), BenefitLoadState.FETCH_FAILED);
  assert.equal(empty.status, BenefitFetchStatus.SUCCESS);
  assert.equal(classifyBenefitFetchResult(empty), BenefitLoadState.SUCCESS_EMPTY);
});
test("V7 public mapper preserves null, zero, false and empty string without defaults", () => {
  const mapped = mapV7PublicOffer(publishedRow({
    partner: null,
    benefit_value: 0,
    benefit_unit: "",
    minimum_purchase_value: 0,
    display_contract: {
      enabled: false,
      note: "",
      unknown: null,
    },
  }));

  assert.equal(mapped.partner, null);
  assert.equal(mapped.benefitValue, 0);
  assert.equal(mapped.benefitUnit, "");
  assert.equal(mapped.minimumPurchase.value, 0);
  assert.equal(mapped.displayContract.enabled, false);
  assert.equal(mapped.displayContract.note, "");
  assert.equal(mapped.displayContract.unknown, null);
  assert.equal(mapped.publicationState, "PUBLISHED");
  assert.equal(mapped.linkedServiceId, "netflix");
});

test("Legacy active-benefit permission failure is surfaced as FETCH_FAILED", async () => {
  const failingClient = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async order() {
                  return {
                    data: null,
                    error: new Error("permission denied for table benefits"),
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const result = await fetchActiveBenefitsResult(failingClient);
  assert.equal(result.status, BenefitFetchStatus.FETCH_FAILED);
  assert.equal(result.items.length, 0);
  assert.match(result.error.message, /permission denied/);
  assert.equal(classifyBenefitFetchResult(result), BenefitLoadState.FETCH_FAILED);
});
