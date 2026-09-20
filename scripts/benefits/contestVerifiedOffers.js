import { createHash } from "node:crypto";

export const CONTEST_BENEFIT_VERIFIED_AT = "2026-09-20T03:30:00.000Z";
export const CONTEST_BENEFIT_RELEASE_ID = "contest-demo-20260920";

export const CONTEST_BENEFIT_SOURCES = Object.freeze({
  naverPlusPrice:
    "https://help.naver.com/service/23168/contents/11766?lang=ko&osType=COMMONOS",
  naverNetflixUpgrade:
    "https://help.naver.com/service/23168/bookmark/23782?osType=COMMONOS",
  naverDigitalContent:
    "https://help.naver.com/service/23168/contents/19902?osType=COMMONOS",
  naverSpotifyFaq:
    "https://help.naver.com/service/23168/contents/24787?lang=ko&osType=COMMONOS",
});

function sha256(value) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .toUpperCase();
}

function verifiedOffer(definition) {
  const base = {
    ...definition,
    approved_at: CONTEST_BENEFIT_VERIFIED_AT,
    publication_state: "PUBLISHED",
    verification_state: "VERIFIED_OFFICIAL_SOURCE",
    rc3_release_id: CONTEST_BENEFIT_RELEASE_ID,
  };
  const candidate_payload_sha256 = sha256(base);
  const publication_payload_sha256 = sha256({
    ...base,
    candidate_payload_sha256,
  });
  return Object.freeze({
    ...base,
    candidate_payload_sha256,
    publication_payload_sha256,
  });
}

const netflixPremium = verifiedOffer({
  service_offer_id: "contest-naverplus-netflix-premium-20260920",
  source_candidate_id: "official-naver-netflix-premium-20260920",
  approval_id: "user-authorized-official-verification-20260920",
  service_id: "netflix",
  service_name: "Netflix",
  partner: "네이버플러스 멤버십",
  benefit_name: "네이버플러스 Netflix 프리미엄 업그레이드",
  benefit_type: "PRICE_OVERRIDE",
  benefit_value: "10000",
  benefit_unit: "KRW",
  benefit_base: "SUBSCRIPTION_FEE",
  minimum_purchase_value: null,
  minimum_purchase_unit: null,
  minimum_purchase_source_expression: null,
  maximum_benefit: null,
  frequency_family: "MONTHLY",
  frequency_count: 1,
  frequency_source_expression: "매월 별도 결제",
  audience_condition: {
    operator: "AND",
    conditions: [
      { audience: "EXISTING_SUBSCRIBER" },
      { required_plan: "프리미엄" },
      {
        required_membership: "naverplus",
        allow_join: true,
        required_cost: 4900,
      },
    ],
  },
  payment_condition: {},
  channel_condition: "ANY",
  exclusions: [],
  selection_relation: {
    exclusive_group: "NAVERPLUS_NETFLIX_PLAN",
    stackable: false,
  },
  lottery_award_mechanism: null,
  lottery_certainty: null,
  allocation_method: null,
  certainty: "CONFIRMED",
  temporal_start: "2026-07-01",
  temporal_end: null,
  source_url: CONTEST_BENEFIT_SOURCES.naverNetflixUpgrade,
  evidence_refs: [
    CONTEST_BENEFIT_SOURCES.naverNetflixUpgrade,
    CONTEST_BENEFIT_SOURCES.naverPlusPrice,
  ],
  resolved_fact_refs: [
    "naverplus:monthly-membership:4900-krw",
    "naverplus:netflix-premium-upgrade:10000-krw",
  ],
  constraint_graph_ref: "contest:nplus:netflix-premium:v1",
  display_contract: {
    description:
      "네이버플러스 멤버십에서 Netflix 프리미엄 업그레이드가 월 10,000원이며, 멤버십이 없다면 월 4,900원 비용을 함께 반영해 순절약액을 계산합니다.",
    saving_period: "MONTHLY_RECURRING",
    source_verified_at: CONTEST_BENEFIT_VERIFIED_AT,
  },
});

const spotifyBasic = verifiedOffer({
  service_offer_id: "contest-naverplus-spotify-basic-20260920",
  source_candidate_id: "official-naver-spotify-basic-20260920",
  approval_id: "user-authorized-official-verification-20260920",
  service_id: "spotify",
  service_name: "Spotify",
  partner: "네이버플러스 멤버십",
  benefit_name: "네이버플러스 Spotify 프리미엄 베이직",
  benefit_type: "FREE_INCLUDED",
  benefit_value: null,
  benefit_unit: null,
  benefit_base: "SUBSCRIPTION_FEE",
  minimum_purchase_value: null,
  minimum_purchase_unit: null,
  minimum_purchase_source_expression: null,
  maximum_benefit: null,
  frequency_family: "MONTHLY",
  frequency_count: 1,
  frequency_source_expression: "1개월 단위 회차마다 1개 선택",
  audience_condition: {
    operator: "AND",
    conditions: [
      { audience: "EXISTING_SUBSCRIBER" },
      { required_plan: "프리미엄 베이직" },
      {
        required_membership: "naverplus",
        allow_join: true,
        required_cost: 4900,
      },
    ],
  },
  payment_condition: {},
  channel_condition: "ANY",
  exclusions: [],
  selection_relation: {
    exclusive_group: "NAVERPLUS_DIGITAL_CONTENT_CHOICE",
    stackable: false,
  },
  lottery_award_mechanism: null,
  lottery_certainty: null,
  allocation_method: null,
  certainty: "CONFIRMED",
  temporal_start: null,
  temporal_end: null,
  source_url: CONTEST_BENEFIT_SOURCES.naverSpotifyFaq,
  evidence_refs: [
    CONTEST_BENEFIT_SOURCES.naverSpotifyFaq,
    CONTEST_BENEFIT_SOURCES.naverDigitalContent,
    CONTEST_BENEFIT_SOURCES.naverPlusPrice,
  ],
  resolved_fact_refs: [
    "naverplus:monthly-membership:4900-krw",
    "naverplus:spotify-benefit:premium-basic",
  ],
  constraint_graph_ref: "contest:nplus:spotify-basic:v1",
  display_contract: {
    description:
      "네이버플러스 멤버십의 월 선택 콘텐츠로 Spotify 프리미엄 베이직을 이용할 수 있어요. 멤버십이 없다면 월 4,900원 비용을 순절약액에 반영합니다.",
    saving_period: "MONTHLY_RECURRING",
    source_verified_at: CONTEST_BENEFIT_VERIFIED_AT,
  },
});

const naverPlusAnnual = verifiedOffer({
  service_offer_id: "contest-naverplus-annual-20260920",
  source_candidate_id: "official-naverplus-annual-20260920",
  approval_id: "user-authorized-official-verification-20260920",
  service_id: "naverplus",
  service_name: "네이버플러스 멤버십",
  partner: "NAVER",
  benefit_name: "네이버플러스 멤버십 연간 이용권",
  benefit_type: "PRICE_OVERRIDE",
  benefit_value: "46800",
  benefit_unit: "KRW",
  benefit_base: "SUBSCRIPTION_FEE",
  minimum_purchase_value: null,
  minimum_purchase_unit: null,
  minimum_purchase_source_expression: null,
  maximum_benefit: null,
  frequency_family: "ANNUAL",
  frequency_count: 1,
  frequency_source_expression: "연간 이용권 연 46,800원",
  audience_condition: {
    operator: "AND",
    conditions: [
      { audience: "EXISTING_SUBSCRIBER" },
      { required_plan: "월간 이용권" },
    ],
  },
  payment_condition: {},
  channel_condition: "ANY",
  exclusions: [],
  selection_relation: {
    exclusive_group: "NAVERPLUS_BILLING_CYCLE",
    stackable: false,
  },
  lottery_award_mechanism: null,
  lottery_certainty: null,
  allocation_method: null,
  certainty: "CONFIRMED",
  temporal_start: null,
  temporal_end: null,
  source_url: CONTEST_BENEFIT_SOURCES.naverPlusPrice,
  evidence_refs: [CONTEST_BENEFIT_SOURCES.naverPlusPrice],
  resolved_fact_refs: [
    "naverplus:monthly-membership:4900-krw",
    "naverplus:annual-membership:46800-krw",
  ],
  constraint_graph_ref: "contest:nplus:annual:v1",
  display_contract: {
    description:
      "네이버플러스 멤버십 월간 4,900원과 연간 46,800원의 공식 가격 차이를 기준으로 연간 전환 절약액을 계산합니다.",
    saving_period: "ANNUAL",
    source_verified_at: CONTEST_BENEFIT_VERIFIED_AT,
  },
});

export const CONTEST_VERIFIED_OFFERS = Object.freeze([
  netflixPremium,
  spotifyBasic,
  naverPlusAnnual,
]);

export function toPublicV7OfferRow(offer) {
  return {
    service_offer_id: offer.service_offer_id,
    service_id: offer.service_id,
    service_name: offer.service_name,
    partner: offer.partner,
    benefit_name: offer.benefit_name,
    benefit_type: offer.benefit_type,
    benefit_value: offer.benefit_value,
    benefit_unit: offer.benefit_unit,
    benefit_base: offer.benefit_base,
    minimum_purchase_value: offer.minimum_purchase_value,
    minimum_purchase_unit: offer.minimum_purchase_unit,
    minimum_purchase_source_expression: offer.minimum_purchase_source_expression,
    maximum_benefit: offer.maximum_benefit,
    frequency_family: offer.frequency_family,
    frequency_count: offer.frequency_count,
    frequency_source_expression: offer.frequency_source_expression,
    audience_condition: offer.audience_condition,
    payment_condition: offer.payment_condition,
    channel_condition: offer.channel_condition,
    exclusions: offer.exclusions,
    selection_relation: offer.selection_relation,
    lottery_award_mechanism: offer.lottery_award_mechanism,
    lottery_certainty: offer.lottery_certainty,
    allocation_method: offer.allocation_method,
    certainty: offer.certainty,
    temporal_start: offer.temporal_start,
    temporal_end: offer.temporal_end,
    source_url: offer.source_url,
    display_contract: offer.display_contract,
  };
}
