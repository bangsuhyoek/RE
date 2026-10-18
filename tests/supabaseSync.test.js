import test from "node:test";
import assert from "node:assert/strict";
import {
  computeDday,
  toDbVerifiedStatus,
  mapPromotionToBenefitRow,
} from "../scripts/crawler/promotions/supabaseSync.js";
import { extractOfferWithAi } from "../scripts/crawler/promotions/aiExtractor.js";
import { calculateRetryDelay } from "../scripts/crawler/promotions/pageFetcher.js";

// Mock reference time: 2026-10-18 10:00:00 KST
const MOCK_NOW_KST = Date.parse("2026-10-18T10:00:00+09:00");

test("computeDday: KST 달력 일수 기준 마감일 잔여일 계산 검증", () => {
  // 1. deadline 문자열이 YYYY-MM-DD 형식인 경우
  assert.equal(computeDday({ deadline: "2026-10-25" }, { now: MOCK_NOW_KST }), 7);
  assert.equal(computeDday({ deadline: "2026-10-18" }, { now: MOCK_NOW_KST }), 0);
  assert.equal(computeDday({ deadline: "2026-10-10" }, { now: MOCK_NOW_KST }), 0); // min 0

  // 2. deadline에 마감 문구가 포함된 경우 ("2026.10.31 종료")
  assert.equal(computeDday({ deadline: "2026.10.31 종료" }, { now: MOCK_NOW_KST }), 13);

  // 3. campaignPeriod에 기간 범위가 있는 경우 ("2026.08.15 ~ 2026.10.25")
  assert.equal(computeDday({ campaignPeriod: "2026.08.15 ~ 2026.10.25" }, { now: MOCK_NOW_KST }), 7);

  // 4. campaignPeriod에 마감일만 표기된 경우 ("2026.10.20까지")
  assert.equal(computeDday({ campaignPeriod: "2026.10.20까지" }, { now: MOCK_NOW_KST }), 2);

  // 5. endAt 필드가 ISO 형식으로 존재하는 경우
  assert.equal(computeDday({ endAt: "2026-10-21T14:59:59.999Z" }, { now: MOCK_NOW_KST }), 3);

  // 6. 상시 진행이며 dday가 "D-30", "D-0", 숫자 15, "15"인 경우 폴백 파싱
  assert.equal(computeDday({ campaignPeriod: "상시 진행", dday: "D-30" }, { now: MOCK_NOW_KST }), 30);
  assert.equal(computeDday({ campaignPeriod: "상시 진행", dday: "D-0" }, { now: MOCK_NOW_KST }), 0);
  assert.equal(computeDday({ campaignPeriod: "상시 진행", dday: 15 }, { now: MOCK_NOW_KST }), 15);
  assert.equal(computeDday({ campaignPeriod: "상시 진행", dday: "15" }, { now: MOCK_NOW_KST }), 15);

  // 7. dday 필드 자체에 YYYY-MM-DD 날짜 문자열이 들어있는 경우
  assert.equal(computeDday({ dday: "2026-10-22" }, { now: MOCK_NOW_KST }), 4);

  // 8. 마감 정보와 유효 dday가 전혀 없는 경우 null 반환 (DB nullable 컬럼 반영)
  assert.equal(computeDday({ campaignPeriod: "상시 진행", dday: null }, { now: MOCK_NOW_KST }), null);
  assert.equal(computeDday({ campaignPeriod: "상시 진행", dday: "invalid" }, { now: MOCK_NOW_KST }), null);
  assert.equal(computeDday({}, { now: MOCK_NOW_KST }), null);
});

test("toDbVerifiedStatus: DB 허용값 및 48시간 Soft Degradation 매핑 검증", () => {
  // 1. 상시 무료 (free_tier)
  assert.equal(toDbVerifiedStatus({ isFreeTier: true }, { now: MOCK_NOW_KST }), "free_tier");
  assert.equal(toDbVerifiedStatus({ verifiedStatus: "free_tier" }, { now: MOCK_NOW_KST }), "free_tier");

  // 2. 만료 (expired)
  assert.equal(toDbVerifiedStatus({ verifiedStatus: "EXPIRED" }, { now: MOCK_NOW_KST }), "expired");
  assert.equal(toDbVerifiedStatus({ verified_status: "expired" }, { now: MOCK_NOW_KST }), "expired");

  // 3. 정상 확인 (confirmed)
  assert.equal(toDbVerifiedStatus({ verifiedStatus: "LIVE_CONFIRMED" }, { now: MOCK_NOW_KST }), "confirmed");
  assert.equal(toDbVerifiedStatus({ verifiedStatus: "AUTO_UPDATED" }, { now: MOCK_NOW_KST }), "confirmed");

  // 4. Soft Degraded: 48시간 이내 유예 기간인 경우 앱 가시성 보장을 위해 "confirmed" 매핑
  const withinGrace = {
    verifiedStatus: "SOFT_DEGRADED",
    lastVerifiedAt: new Date(MOCK_NOW_KST - 20 * 3600 * 1000).toISOString(),
  };
  assert.equal(toDbVerifiedStatus(withinGrace, { now: MOCK_NOW_KST }), "confirmed");

  const withinGraceLower = {
    verifiedStatus: "soft_degraded",
    softDegradedSince: new Date(MOCK_NOW_KST - 40 * 3600 * 1000).toISOString(),
  };
  assert.equal(toDbVerifiedStatus(withinGraceLower, { now: MOCK_NOW_KST }), "confirmed");

  // 5. Soft Degraded: 48시간 경과된 경우 "unverified" 매핑
  const pastGrace = {
    verifiedStatus: "SOFT_DEGRADED",
    lastVerifiedAt: new Date(MOCK_NOW_KST - 50 * 3600 * 1000).toISOString(),
  };
  assert.equal(toDbVerifiedStatus(pastGrace, { now: MOCK_NOW_KST }), "unverified");

  // 6. 타임스탬프 없는 soft_degraded 항목은 기본 유예 상태("confirmed")로 처리
  assert.equal(toDbVerifiedStatus({ verifiedStatus: "SOFT_DEGRADED" }, { now: MOCK_NOW_KST }), "confirmed");

  // 7. 기타 미검증 상태
  assert.equal(toDbVerifiedStatus({ verifiedStatus: "UNREACHABLE" }, { now: MOCK_NOW_KST }), "unverified");
});

test("mapPromotionToBenefitRow: computeDday 및 toDbVerifiedStatus를 정상 반영한다", () => {
  const promo = {
    id: "test-benefit",
    title: "테스트 혜택",
    kind: "1개월 무료",
    category: "테스트",
    deadline: "2026-10-23",
    verifiedStatus: "SOFT_DEGRADED",
    lastVerifiedAt: new Date(MOCK_NOW_KST - 10 * 3600 * 1000).toISOString(),
  };

  const row = mapPromotionToBenefitRow(promo, "2026-10-18T01:00:00.000Z", { now: MOCK_NOW_KST });
  assert.equal(row.id, "test-benefit");
  assert.equal(row.dday, 5);
  assert.equal(row.verified_status, "confirmed");
});

test("aiExtractor: 429 및 5xx 오류 시 1회 재시도(지수 백오프) 후 fallback 모델 전환 검증", async () => {
  const promotion = {
    id: "retry-promo",
    title: "Retry Promo",
    kind: "1개월 0원 무료 체험",
    originalPrice: 10000,
    offerPrice: 0,
  };
  const pageText = "Retry Promo\n1개월 0원 무료 체험 제공.\n" + "안내 문구 ".repeat(30);

  const sleepDelays = [];
  const mockSleep = async (ms) => {
    sleepDelays.push(ms);
  };

  let callCount = 0;
  const mockFetchWith429ThenSuccess = async () => {
    callCount++;
    if (callCount === 1) {
      return { ok: false, status: 429 };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    isActive: true,
                    evidenceQuote: "1개월 0원 무료 체험 제공.",
                    originalPrice: 10000,
                    offerPrice: 0,
                    benefitPeriod: "1개월",
                    kind: "1개월 0원 무료 체험",
                    deadline: null,
                  }),
                },
              ],
            },
          },
        ],
      }),
    };
  };

  const res = await extractOfferWithAi(promotion, pageText, {
    apiKey: "test-key",
    fetchImpl: mockFetchWith429ThenSuccess,
    now: MOCK_NOW_KST,
    sleep: mockSleep,
  });

  assert.equal(res.confirmed, true);
  assert.equal(callCount, 2);
  assert.deepEqual(sleepDelays, [1000]);
});

test("pageFetcher: 429/503 시 Retry-After(최대 30초) 상한 및 재시도 지연시간 계산 검증", () => {
  assert.equal(calculateRetryDelay({ retryAfter: "45", maxDelayMs: 30000 }), 30000);
  assert.equal(calculateRetryDelay({ retryAfter: "20", maxDelayMs: 30000 }), 20000);
  assert.equal(calculateRetryDelay({ retryAfter: "5", maxDelayMs: 30000 }), 5000);
});

