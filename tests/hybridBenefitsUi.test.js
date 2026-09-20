import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import {
  BenefitLoadState,
  benefitFetchSuccess,
} from "../src/features/benefits/api/fetchState.js";
import { fetchPublishedV7Offers } from "../src/features/benefits/api/v7PublishedOffers.js";
import { loadBenefitRecommendations } from "../src/features/benefits/api/benefitRecommendationLoader.js";
import {
  HybridRecommendationStatus,
} from "../src/features/benefits/domain/hybridRecommendation.js";
import {
  RecommendationDisplayStatus,
  RecommendationSource,
  partitionRecommendationViewModels,
  summarizePublishedConfirmedSavings,
} from "../src/features/benefits/presentation/recommendationViewModel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

let vite;
let PromotionScreen;

before(async () => {
  vite = await createServer({
    root,
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  ({ PromotionScreen } = await vite.ssrLoadModule("/src/components/PromotionScreen.jsx"));
});

after(async () => {
  await vite?.close();
});

const netflix = {
  id: "netflix",
  name: "Netflix",
  plan: "Premium",
  amount: 17000,
  billingCycle: "monthly",
  paymentMethod: "Shinhan",
  status: "active",
};

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

function v7Client(rows = [], error = null) {
  return {
    from(table) {
      assert.equal(table, "v7_public_offers");
      return {
        async select(columns) {
          assert.equal(columns, "*");
          return { data: error ? null : rows, error };
        },
      };
    },
  };
}

async function load(rows, {
  subscriptions = [netflix],
  userContext = { channel: "APP" },
  v7Error = null,
  legacyError = null,
} = {}) {
  return loadBenefitRecommendations({
    subscriptions,
    userContext,
    legacyFetcher: async () =>
      legacyError
        ? { status: "FETCH_FAILED", items: [], source: "legacy-fixture", error: legacyError }
        : benefitFetchSuccess([], "legacy-fixture"),
    v7Fetcher: () => fetchPublishedV7Offers(v7Client(rows, v7Error)),
  });
}

function render(result, subscriptions = [netflix]) {
  return renderToStaticMarkup(
    React.createElement(PromotionScreen, {
      subscriptions,
      recommendations: result.recommendations,
      loading: false,
      loadState: result.loadState,
      partial: result.partial,
      source: result.source,
    })
  );
}


test("E2E 1: published Netflix discount reaches confirmed UI and monthly total", async () => {
  const result = await load([publishedRow()]);
  const summary = summarizePublishedConfirmedSavings(result.recommendations);
  const html = render(result);

  assert.equal(result.loadState, BenefitLoadState.SUCCESS);
  assert.equal(result.recommendations[0].sourceType, RecommendationSource.TRUSTFIX_V7);
  assert.equal(result.recommendations[0].status, HybridRecommendationStatus.ELIGIBLE_CONFIRMED);
  assert.equal(summary.amount, 5000);
  assert.match(html, /바로 아낄 수 있어요/);
  assert.match(html, /매달 ₩5,000 절약 가능/);
  assert.match(html, /현재 이용 중인 고객도 가능/);
  assert.doesNotMatch(html, /대상: EXISTING/);

  const vm = result.recommendations[0];
  assert.equal(vm.provenance.officialSourceUrl, "https://example.com/offer");
  assert.equal(vm.provenance.partner, "Official Partner");
  assert.equal(vm.temporal.end, "2026-12-31");
  assert.equal(vm.materialConditions.audienceCondition.audience, "EXISTING");
});

test("E2E 2: unknown SKT plan/carrier becomes NEEDS_CHECK in UI", async () => {
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
  const subscriptions = [{ ...netflix, plan: "" }];
  const result = await load([row], {
    subscriptions,
    userContext: { channel: "APP" },
  });
  const html = render(result, subscriptions);

  assert.equal(result.recommendations[0].status, HybridRecommendationStatus.NEEDS_CHECK);
  assert.match(html, /조건을 확인하면 아낄 수 있어요/);
  assert.doesNotMatch(html, /매달 ₩5,000 절약 가능/);
});

test("E2E 3: new-subscriber-only offer is excluded for current subscriber", async () => {
  const result = await load([
    publishedRow({
      benefit_name: "new subscriber only",
      audience_condition: { audience: "NEW" },
    }),
  ]);
  const sections = partitionRecommendationViewModels(result.recommendations);
  const html = render(result);

  assert.equal(result.recommendations[0].status, HybridRecommendationStatus.INELIGIBLE);
  assert.equal(sections.hidden.length, 1);
  assert.doesNotMatch(html, /new subscriber only/);
  assert.match(html, /현재 확인된 절약 방법은 없어요/);
});


test("E2E 3b: verified unsubscribed service is shown only in discovery", async () => {
  const row = publishedRow({
    service_offer_id: "offer-spotify-discovery",
    service_id: "spotify",
    service_name: "Spotify",
    benefit_name: "Spotify premium benefit",
    benefit_type: "FREE_INCLUDED",
    benefit_value: null,
    benefit_unit: null,
    audience_condition: { audience: "EXISTING" },
  });
  const result = await load([row]);
  const sections = partitionRecommendationViewModels(result.recommendations);
  const summary = summarizePublishedConfirmedSavings(result.recommendations);
  const html = render(result);

  assert.equal(
    result.recommendations[0].status,
    HybridRecommendationStatus.NOT_CURRENTLY_SUBSCRIBED
  );
  assert.equal(
    result.recommendations[0].displayStatus,
    RecommendationDisplayStatus.DISCOVERY
  );
  assert.equal(sections.discovery.length, 1);
  assert.equal(summary.amount, 0);
  assert.match(html, /다른 절약 혜택 둘러보기/);
  assert.match(html, /Spotify 이용 중이라면 확인해보세요/);
  assert.match(html, /현재 내 구독에는 없어요/);
  assert.doesNotMatch(html, /매달 ₩5,000 절약 가능/);
});

test("E2E 3c: annual plan saving is shown as optimization, not monthly total", async () => {
  const naverPlus = {
    id: "naverplus",
    serviceId: "naverplus",
    name: "네이버플러스 멤버십",
    plan: "월간 이용권",
    amount: 4900,
    billingCycle: "매월",
    status: "active",
  };
  const row = publishedRow({
    service_offer_id: "offer-naverplus-annual",
    service_id: "naverplus",
    service_name: "네이버플러스 멤버십",
    benefit_name: "연간 이용권",
    benefit_type: "PRICE_OVERRIDE",
    benefit_value: "46800",
    benefit_unit: "KRW",
    frequency_family: "ANNUAL",
    frequency_count: 1,
    audience_condition: {
      operator: "AND",
      conditions: [
        { audience: "EXISTING_SUBSCRIBER" },
        { required_plan: "월간 이용권" },
      ],
    },
    display_contract: { saving_period: "ANNUAL" },
  });
  const result = await load([row], { subscriptions: [naverPlus] });
  const sections = partitionRecommendationViewModels(result.recommendations);
  const summary = summarizePublishedConfirmedSavings(result.recommendations);
  const html = render(result, [naverPlus]);

  assert.equal(
    result.recommendations[0].displayStatus,
    RecommendationDisplayStatus.OPTIMIZATION
  );
  assert.equal(sections.optimization.length, 1);
  assert.equal(result.recommendations[0].savings.amount, 12000);
  assert.equal(summary.amount, 0);
  assert.match(html, /연간·이용 방식 절약 방법 1개/);
  assert.match(html, /이용 방법을 바꾸면 더 아낄 수 있어요/);
  assert.match(html, /월 확정 절약액에 포함하지 않았어요/);
  assert.match(html, /연 ₩12,000 절약/);
});

test("E2E 4: RATE_BASE_UNKNOWN is never added to confirmed savings", async () => {
  const result = await load([
    publishedRow({
      benefit_name: "maximum 20 percent",
      benefit_type: "PERCENT_DISCOUNT",
      benefit_value: "20",
      benefit_unit: "PERCENT",
      display_contract: { unresolved: ["RATE_BASE_UNKNOWN"] },
    }),
  ]);
  const summary = summarizePublishedConfirmedSavings(result.recommendations);
  const html = render(result);

  assert.equal(result.recommendations[0].status, HybridRecommendationStatus.ELIGIBLE_NOT_COMPUTABLE);
  assert.equal(summary.amount, 0);
  assert.match(html, /구독료 외 추가 혜택/);
  assert.match(html, /확정 절약액 산정 불가/);
  assert.doesNotMatch(html, /매달 ₩3,400 절약 가능/);
});

test("E2E 5: points without proven KRW value stay outside confirmed total", async () => {
  const result = await load([
    publishedRow({
      benefit_name: "5000 points",
      benefit_type: "POINT_AMOUNT",
      benefit_value: "5000",
      benefit_unit: "POINT",
    }),
  ]);
  const summary = summarizePublishedConfirmedSavings(result.recommendations);
  const html = render(result);

  assert.equal(result.recommendations[0].status, HybridRecommendationStatus.ELIGIBLE_NOT_COMPUTABLE);
  assert.equal(summary.amount, 0);
  assert.match(html, /구독료 외 추가 혜택/);
  assert.doesNotMatch(html, /매달 ₩5,000 절약 가능/);
});

test("E2E 6: lottery benefit is visible only as additional benefit", async () => {
  const result = await load([
    publishedRow({
      benefit_name: "lottery free month",
      benefit_type: "CHANCE_PRIZE",
      benefit_value: null,
      benefit_unit: null,
      lottery_award_mechanism: "LOTTERY",
      lottery_certainty: "CONDITIONAL_ON_WINNING",
      allocation_method: "RANDOM",
    }),
  ]);
  const summary = summarizePublishedConfirmedSavings(result.recommendations);
  const html = render(result);

  assert.equal(result.recommendations[0].status, HybridRecommendationStatus.NON_SUBSCRIPTION_RELEVANT);
  assert.equal(summary.amount, 0);
  assert.match(html, /구독료 외 추가 혜택/);
  assert.doesNotMatch(html, /바로 아낄 수 있어요/);
});

test("E2E 7: general shopping free shipping is excluded from core saving area", async () => {
  const result = await load([
    publishedRow({
      benefit_name: "shopping free shipping",
      benefit_type: "FREE",
      benefit_value: null,
      benefit_unit: null,
      benefit_base: "SHIPPING",
      minimum_purchase_value: 15000,
      minimum_purchase_unit: "KRW",
    }),
  ]);
  const html = render(result);

  assert.equal(result.recommendations[0].status, HybridRecommendationStatus.NON_SUBSCRIPTION_RELEVANT);
  assert.match(html, /구독료 외 추가 혜택/);
  assert.doesNotMatch(html, /바로 아낄 수 있어요/);
});


test("E2E 8: required membership cost is deducted before UI total", async () => {
  const result = await load([
    publishedRow({
      benefit_name: "Netflix included with membership",
      benefit_type: "FREE_INCLUDED",
      benefit_value: null,
      benefit_unit: null,
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
    }),
  ]);
  const summary = summarizePublishedConfirmedSavings(result.recommendations);
  const html = render(result);

  assert.equal(result.recommendations[0].status, HybridRecommendationStatus.ELIGIBLE_CONFIRMED);
  assert.equal(result.recommendations[0].savings.amount, 12100);
  assert.equal(summary.amount, 12100);
  assert.match(html, /매달 ₩12,100 절약 가능/);
});

test("E2E 9: exclusive offers contribute only the highest confirmed amount", async () => {
  const result = await load([
    publishedRow({
      service_offer_id: "offer-high",
      benefit_name: "high discount",
      benefit_value: "5000",
      selection_relation: {
        exclusive_group: "netflix-choice",
        stackable: false,
      },
    }),
    publishedRow({
      service_offer_id: "offer-low",
      benefit_name: "low discount",
      benefit_value: "3000",
      selection_relation: {
        exclusive_group: "netflix-choice",
        stackable: false,
      },
    }),
  ]);
  const summary = summarizePublishedConfirmedSavings(result.recommendations);
  const html = render(result);

  assert.equal(summary.amount, 5000);
  assert.equal(summary.count, 1);
  assert.equal(summary.candidateCount, 2);
  assert.equal(summary.hasExclusiveChoice, true);
  assert.equal(summary.selected[0].id, "offer-high");
  assert.match(html, /확정 월 절약 선택지 2개/);
  assert.match(html, /선택 조건 반영 시 매달 최대 ₩5,000 절약 가능/);
  assert.match(html, /택1 적용 가능/);
  assert.match(html, /선택 시 매달 ₩5,000 절약/);
  assert.doesNotMatch(html, /매달 ₩8,000 절약 가능/);
});

test("E2E 10: successful zero rows renders SUCCESS_EMPTY, not failure", async () => {
  const result = await load([]);
  const html = render(result);

  assert.equal(result.loadState, BenefitLoadState.SUCCESS_EMPTY);
  assert.match(html, /현재 확인된 절약 방법은 없어요/);
  assert.doesNotMatch(html, /최신 혜택을 확인하지 못했어요/);
});

test("E2E 11: source failure renders FETCH_FAILED, not normal empty state", async () => {
  const error = new Error("permission denied for table benefits");
  const result = await load([], { v7Error: error });
  const html = render(result);

  assert.equal(result.loadState, BenefitLoadState.FETCH_FAILED);
  assert.match(html, /최신 혜택을 확인하지 못했어요/);
  assert.match(html, /현재 혜택이 없는 것으로 처리하지 않았어요/);
  assert.doesNotMatch(html, /현재 확인된 절약 방법은 없어요/);
});

test("E2E 12: unknown material condition remains NEEDS_CHECK through UI", async () => {
  const result = await load([
    publishedRow({
      audience_condition: null,
      payment_condition: {},
      channel_condition: "ANY",
      exclusions: [],
    }),
  ]);
  const html = render(result);

  assert.equal(result.recommendations[0].status, HybridRecommendationStatus.NEEDS_CHECK);
  assert.match(html, /조건을 확인하면 아낄 수 있어요/);
  assert.doesNotMatch(html, /매달 ₩5,000 절약 가능/);
});


test("E2E extra: partial source failure is preserved while available recommendations remain visible", async () => {
  const legacyBenefit = {
    id: "legacy-netflix",
    title: "Legacy Netflix discount",
    kind: "카드 제휴",
    targetServiceIds: ["netflix"],
    audience: "EXISTING",
    benefitType: "FIXED_DISCOUNT",
    benefitAmount: 1000,
    savingPeriod: "MONTHLY_RECURRING",
    partnerName: "Legacy Partner",
    sourceUrl: "https://example.com/legacy",
    verificationStatus: "ACTIVE",
  };

  const result = await loadBenefitRecommendations({
    subscriptions: [netflix],
    userContext: { channel: "APP" },
    legacyFetcher: async () => benefitFetchSuccess([legacyBenefit], "legacy-fixture"),
    v7Fetcher: () =>
      fetchPublishedV7Offers(
        v7Client([], new Error("v7 source temporarily unavailable"))
      ),
  });
  const html = render(result);

  assert.equal(result.loadState, BenefitLoadState.SUCCESS);
  assert.equal(result.partial, true);
  assert.match(html, /일부 최신 혜택은 확인하지 못했어요/);
  assert.doesNotMatch(html, /최신 혜택을 확인하지 못했어요/);
});
