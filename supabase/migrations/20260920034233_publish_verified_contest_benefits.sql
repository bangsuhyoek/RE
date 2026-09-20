-- Contest demo verified benefits.
-- Sources were re-checked on 2026-09-20 against official NAVER Help pages.
-- Publication goes through the existing Trustfix V7 publication RPC.

select public.v7_upsert_published_offer(
$offer$
{
  "service_offer_id": "contest-naverplus-netflix-premium-20260920",
  "source_candidate_id": "official-naver-netflix-premium-20260920",
  "approval_id": "user-authorized-official-verification-20260920",
  "service_id": "netflix",
  "service_name": "Netflix",
  "partner": "네이버플러스 멤버십",
  "benefit_name": "네이버플러스 Netflix 프리미엄 업그레이드",
  "benefit_type": "PRICE_OVERRIDE",
  "benefit_value": "10000",
  "benefit_unit": "KRW",
  "benefit_base": "SUBSCRIPTION_FEE",
  "frequency_family": "MONTHLY",
  "frequency_count": 1,
  "frequency_source_expression": "매월 별도 결제",
  "audience_condition": {
    "operator": "AND",
    "conditions": [
      {"audience": "EXISTING_SUBSCRIBER"},
      {"required_plan": "프리미엄"},
      {
        "required_membership": "naverplus",
        "allow_join": true,
        "required_cost": 4900
      }
    ]
  },
  "payment_condition": {},
  "channel_condition": "ANY",
  "exclusions": [],
  "selection_relation": {
    "exclusive_group": "NAVERPLUS_NETFLIX_PLAN",
    "stackable": false
  },
  "certainty": "CONFIRMED",
  "temporal_start": "2026-07-01",
  "source_url": "https://help.naver.com/service/23168/bookmark/23782?osType=COMMONOS",
  "evidence_refs": [
    "https://help.naver.com/service/23168/bookmark/23782?osType=COMMONOS",
    "https://help.naver.com/service/23168/contents/11766?lang=ko&osType=COMMONOS"
  ],
  "resolved_fact_refs": [
    "naverplus:monthly-membership:4900-krw",
    "naverplus:netflix-premium-upgrade:10000-krw"
  ],
  "constraint_graph_ref": "contest:nplus:netflix-premium:v1",
  "display_contract": {
    "description": "네이버플러스 멤버십에서 Netflix 프리미엄 업그레이드가 월 10,000원이며, 멤버십이 없다면 월 4,900원 비용을 함께 반영해 순절약액을 계산합니다.",
    "saving_period": "MONTHLY_RECURRING",
    "source_verified_at": "2026-09-20T03:30:00.000Z"
  },
  "approved_at": "2026-09-20T03:30:00.000Z",
  "publication_state": "PUBLISHED",
  "verification_state": "VERIFIED_OFFICIAL_SOURCE",
  "rc3_release_id": "contest-demo-20260920",
  "candidate_payload_sha256": "3EBE56FB9986E443C2D415A72D2B94D96D5C1509A7CF352697AC9E66933E2589",
  "publication_payload_sha256": "988B7C6ABD63F2C5D754141A80348152D1B79D487FE4F1F3932F95C7A7142C38"
}
$offer$::jsonb,
'contest-benefit:contest-naverplus-netflix-premium-20260920:v1',
'user-authorized-contest-publication-20260920'
);

select public.v7_upsert_published_offer(
$offer$
{
  "service_offer_id": "contest-naverplus-spotify-basic-20260920",
  "source_candidate_id": "official-naver-spotify-basic-20260920",
  "approval_id": "user-authorized-official-verification-20260920",
  "service_id": "spotify",
  "service_name": "Spotify",
  "partner": "네이버플러스 멤버십",
  "benefit_name": "네이버플러스 Spotify 프리미엄 베이직",
  "benefit_type": "FREE_INCLUDED",
  "benefit_base": "SUBSCRIPTION_FEE",
  "frequency_family": "MONTHLY",
  "frequency_count": 1,
  "frequency_source_expression": "1개월 단위 회차마다 1개 선택",
  "audience_condition": {
    "operator": "AND",
    "conditions": [
      {"audience": "EXISTING_SUBSCRIBER"},
      {"required_plan": "프리미엄 베이직"},
      {
        "required_membership": "naverplus",
        "allow_join": true,
        "required_cost": 4900
      }
    ]
  },
  "payment_condition": {},
  "channel_condition": "ANY",
  "exclusions": [],
  "selection_relation": {
    "exclusive_group": "NAVERPLUS_DIGITAL_CONTENT_CHOICE",
    "stackable": false
  },
  "certainty": "CONFIRMED",
  "source_url": "https://help.naver.com/service/23168/contents/24787?lang=ko&osType=COMMONOS",
  "evidence_refs": [
    "https://help.naver.com/service/23168/contents/24787?lang=ko&osType=COMMONOS",
    "https://help.naver.com/service/23168/contents/19902?osType=COMMONOS",
    "https://help.naver.com/service/23168/contents/11766?lang=ko&osType=COMMONOS"
  ],
  "resolved_fact_refs": [
    "naverplus:monthly-membership:4900-krw",
    "naverplus:spotify-benefit:premium-basic"
  ],
  "constraint_graph_ref": "contest:nplus:spotify-basic:v1",
  "display_contract": {
    "description": "네이버플러스 멤버십의 월 선택 콘텐츠로 Spotify 프리미엄 베이직을 이용할 수 있어요. 멤버십이 없다면 월 4,900원 비용을 순절약액에 반영합니다.",
    "saving_period": "MONTHLY_RECURRING",
    "source_verified_at": "2026-09-20T03:30:00.000Z"
  },
  "approved_at": "2026-09-20T03:30:00.000Z",
  "publication_state": "PUBLISHED",
  "verification_state": "VERIFIED_OFFICIAL_SOURCE",
  "rc3_release_id": "contest-demo-20260920",
  "candidate_payload_sha256": "2B4D572A8886003802B68CA841221C80529EC75DDD4899A421A26948A50A3F17",
  "publication_payload_sha256": "A897B7D424CBD650B91AA9DC57985F7582FD962D2CD2303DC22DB315691DE39E"
}
$offer$::jsonb,
'contest-benefit:contest-naverplus-spotify-basic-20260920:v1',
'user-authorized-contest-publication-20260920'
);

select public.v7_upsert_published_offer(
$offer$
{
  "service_offer_id": "contest-naverplus-annual-20260920",
  "source_candidate_id": "official-naverplus-annual-20260920",
  "approval_id": "user-authorized-official-verification-20260920",
  "service_id": "naverplus",
  "service_name": "네이버플러스 멤버십",
  "partner": "NAVER",
  "benefit_name": "네이버플러스 멤버십 연간 이용권",
  "benefit_type": "PRICE_OVERRIDE",
  "benefit_value": "46800",
  "benefit_unit": "KRW",
  "benefit_base": "SUBSCRIPTION_FEE",
  "frequency_family": "ANNUAL",
  "frequency_count": 1,
  "frequency_source_expression": "연간 이용권 연 46,800원",
  "audience_condition": {
    "operator": "AND",
    "conditions": [
      {"audience": "EXISTING_SUBSCRIBER"},
      {"required_plan": "월간 이용권"}
    ]
  },
  "payment_condition": {},
  "channel_condition": "ANY",
  "exclusions": [],
  "selection_relation": {
    "exclusive_group": "NAVERPLUS_BILLING_CYCLE",
    "stackable": false
  },
  "certainty": "CONFIRMED",
  "source_url": "https://help.naver.com/service/23168/contents/11766?lang=ko&osType=COMMONOS",
  "evidence_refs": [
    "https://help.naver.com/service/23168/contents/11766?lang=ko&osType=COMMONOS"
  ],
  "resolved_fact_refs": [
    "naverplus:monthly-membership:4900-krw",
    "naverplus:annual-membership:46800-krw"
  ],
  "constraint_graph_ref": "contest:nplus:annual:v1",
  "display_contract": {
    "description": "네이버플러스 멤버십 월간 4,900원과 연간 46,800원의 공식 가격 차이를 기준으로 연간 전환 절약액을 계산합니다.",
    "saving_period": "ANNUAL",
    "source_verified_at": "2026-09-20T03:30:00.000Z"
  },
  "approved_at": "2026-09-20T03:30:00.000Z",
  "publication_state": "PUBLISHED",
  "verification_state": "VERIFIED_OFFICIAL_SOURCE",
  "rc3_release_id": "contest-demo-20260920",
  "candidate_payload_sha256": "10B8DCAE356D90B66C0C2E557EA1309FDE1605BF94575728E031BEF49F0F8249",
  "publication_payload_sha256": "F224F26D083A24719EB971E2CC982012A56CD1006D019EB59B4E7DA20003D070"
}
$offer$::jsonb,
'contest-benefit:contest-naverplus-annual-20260920:v1',
'user-authorized-contest-publication-20260920'
);
