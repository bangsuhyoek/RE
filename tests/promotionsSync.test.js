import test from "node:test";
import assert from "node:assert/strict";
import {
  mapPromotionToBenefitRow,
  mapPromotionToServiceBenefitRows,
  syncPromotionsToSupabase,
} from "../scripts/crawler/promotions/supabaseSync.js";
import {
  filterActivePromotions,
  mapDbBenefitToPromotion,
  getInitialPromotions,
  loadLivePromotions,
} from "../src/lib/promotionsSync.js";

const NOW = Date.parse("2026-10-16T12:00:00+09:00");

test("mapPromotionToBenefitRow 및 mapPromotionToServiceBenefitRows는 Supabase 스키마에 맞게 변환한다", () => {
  const promo = {
    id: "naverplus-netflix",
    title: "네이버플러스 X Netflix",
    subtitle: "네이버 멤버십으로 넷플릭스 0원",
    kind: "넷플릭스 광고형 스탠다드 무료 연동",
    category: "통신사/결합",
    description: "설명",
    saving: 5500,
    originalPrice: 5500,
    offerPrice: 0,
    dday: 30,
    sourceServiceIds: ["netflix", "naverplus"],
    link: "https://help.naver.com/service/23168/contents/23881?lang=ko",
    monogram: "N",
    verifiedStatus: "LIVE_CONFIRMED",
    benefitPeriod: "상시",
    campaignPeriod: "상시 제휴",
  };
  const updatedAt = "2026-10-16T03:00:00.000Z";
  const benefitRow = mapPromotionToBenefitRow(promo, updatedAt);

  assert.equal(benefitRow.id, "naverplus-netflix");
  assert.equal(benefitRow.original_price, 5500);
  assert.equal(benefitRow.offer_price, 0);
  assert.equal(benefitRow.verified_status, "confirmed");
  assert.equal(benefitRow.updated_at, updatedAt);

  const joinRows = mapPromotionToServiceBenefitRows(promo);
  assert.equal(joinRows.length, 2);
  assert.deepEqual(joinRows[0], {
    service_id: "netflix",
    benefit_id: "naverplus-netflix",
    role: "partner",
    is_primary: true,
  });
  assert.deepEqual(joinRows[1], {
    service_id: "naverplus",
    benefit_id: "naverplus-netflix",
    role: "partner",
    is_primary: false,
  });
});

test("syncPromotionsToSupabase는 benefits 및 service_benefits 테이블에 Upsert를 수행한다", async () => {
  const upserted = {};
  const mockSupabase = {
    from(table) {
      return {
        async select() {
          if (table === "subscription_services") {
            return { data: [{ id: "youtube" }], error: null };
          }
          return { data: [], error: null };
        },
        async upsert(rows, options) {
          upserted[table] = { rows, options };
          return { data: rows, error: null };
        },
      };
    },
  };

  const promos = [
    {
      id: "youtube-promo",
      title: "YouTube Premium",
      subtitle: "1개월 무료",
      kind: "1개월 무료 체험",
      category: "OTT",
      saving: 14900,
      originalPrice: 14900,
      offerPrice: 0,
      sourceServiceIds: ["youtube"],
      link: "https://www.youtube.com/premium",
      verifiedStatus: "LIVE_CONFIRMED",
    },
  ];

  const res = await syncPromotionsToSupabase(promos, {
    supabaseClient: mockSupabase,
    updatedAt: "2026-10-16T03:00:00.000Z",
  });

  assert.equal(res.skipped, false);
  assert.equal(res.syncedBenefits, 1);
  assert.equal(res.syncedServiceBenefits, 1);
  assert.equal(res.benefitsUpserted, 1);
  assert.equal(res.mappingsUpserted, 1);
  assert.deepEqual(res.invalid, []);
  assert.deepEqual(res.unknownServiceIds, []);
  assert.deepEqual(res.errors, []);
  assert.equal(upserted.benefits.rows[0].id, "youtube-promo");
  assert.equal(upserted.service_benefits.rows[0].service_id, "youtube");
});

test("syncPromotionsToSupabase는 anon 키만 있는 경우 SERVICE_ROLE_KEY_REQUIRED로 쓰기를 건너뛴다", async () => {
  let writesAttempted = false;
  const fakeAnonClient = {
    role: "anon",
    from() {
      writesAttempted = true;
      return {};
    },
  };

  const promos = [
    {
      id: "test-promo",
      title: "Test",
      kind: "무료",
      category: "OTT",
    },
  ];

  // 1. 주입된 클라이언트가 anon 역할인 경우
  const resClient = await syncPromotionsToSupabase(promos, {
    supabaseClient: fakeAnonClient,
  });
  assert.equal(resClient.skipped, true);
  assert.equal(resClient.reason, "SERVICE_ROLE_KEY_REQUIRED");
  assert.equal(writesAttempted, false);
  assert.equal(resClient.benefitsUpserted, 0);
  assert.equal(resClient.mappingsUpserted, 0);

  // 2. 옵션으로 anonKey만 제공되고 serviceRoleKey가 없는 경우
  const resOptions = await syncPromotionsToSupabase(promos, {
    supabaseUrl: "https://example.supabase.co",
    anonKey: "test-anon-key",
    serviceRoleKey: "",
  });
  assert.equal(resOptions.skipped, true);
  assert.equal(resOptions.reason, "SERVICE_ROLE_KEY_REQUIRED");
  assert.equal(resOptions.benefitsUpserted, 0);
  assert.equal(resOptions.mappingsUpserted, 0);

  // 3. URL/키가 전혀 없는 경우 SUPABASE_NOT_CONFIGURED
  const resUnconfigured = await syncPromotionsToSupabase(promos, {
    supabaseUrl: "",
    anonKey: "",
    serviceRoleKey: "",
  });
  assert.equal(resUnconfigured.skipped, true);
  assert.equal(resUnconfigured.reason, "SUPABASE_NOT_CONFIGURED");
});

test("syncPromotionsToSupabase는 필수 필드(kind, category, id, title) 누락 행을 제외하고 invalid에 기록한다", async () => {
  const upserted = {};
  const mockSupabase = {
    from(table) {
      return {
        async select() {
          return { data: [{ id: "service-1" }], error: null };
        },
        async upsert(rows, options) {
          upserted[table] = { rows, options };
          return { data: rows, error: null };
        },
      };
    },
  };

  const promos = [
    {
      id: "valid-1",
      title: "정상 혜택",
      kind: "1개월 무료",
      category: "OTT",
      sourceServiceIds: ["service-1"],
    },
    {
      id: "missing-kind",
      title: "종류 없음",
      category: "OTT",
    },
    {
      id: "missing-category",
      title: "카테고리 없음",
      kind: "할인",
    },
    {
      id: "missing-title",
      kind: "무료",
      category: "음악",
    },
    {
      title: "아이디 없음",
      kind: "무료",
      category: "도서",
    },
    {
      id: "empty-fields",
      title: "  ",
      kind: "",
      category: null,
    },
  ];

  const res = await syncPromotionsToSupabase(promos, {
    supabaseClient: mockSupabase,
  });

  assert.equal(res.benefitsUpserted, 1);
  assert.equal(upserted.benefits.rows.length, 1);
  assert.equal(upserted.benefits.rows[0].id, "valid-1");
  assert.equal(upserted.benefits.rows[0].title, "정상 혜택");

  assert.equal(res.invalid.length, 5);
  assert.deepEqual(res.invalid[0], { id: "missing-kind", missing: ["kind"] });
  assert.deepEqual(res.invalid[1], { id: "missing-category", missing: ["category"] });
  assert.deepEqual(res.invalid[2], { id: "missing-title", missing: ["title"] });
  assert.deepEqual(res.invalid[3], { id: null, missing: ["id"] });
  assert.deepEqual(res.invalid[4], { id: "empty-fields", missing: ["title", "kind", "category"] });
});

test("syncPromotionsToSupabase는 subscription_services에 없는 service_id 매핑을 제외하고 unknownServiceIds에 중복 없이 기록한다", async () => {
  const upserted = {};
  const mockSupabase = {
    from(table) {
      return {
        async select() {
          if (table === "subscription_services") {
            return {
              data: [{ id: "netflix" }, { id: "youtube" }],
              error: null,
            };
          }
          return { data: [], error: null };
        },
        async upsert(rows, options) {
          upserted[table] = { rows, options };
          return { data: rows, error: null };
        },
      };
    },
  };

  const promos = [
    {
      id: "promo-1",
      title: "혜택 1",
      kind: "할인",
      category: "OTT",
      sourceServiceIds: ["netflix", "unknown-service-a", "unknown-service-b"],
    },
    {
      id: "promo-2",
      title: "혜택 2",
      kind: "무료",
      category: "OTT",
      sourceServiceIds: ["youtube", "unknown-service-a"],
    },
  ];

  const res = await syncPromotionsToSupabase(promos, {
    supabaseClient: mockSupabase,
  });

  assert.equal(res.benefitsUpserted, 2);
  assert.equal(res.mappingsUpserted, 2);
  assert.deepEqual(res.unknownServiceIds.sort(), ["unknown-service-a", "unknown-service-b"]);

  const upsertedMappings = upserted.service_benefits.rows;
  assert.equal(upsertedMappings.length, 2);
  assert.equal(upsertedMappings[0].service_id, "netflix");
  assert.equal(upsertedMappings[1].service_id, "youtube");
});

test("syncPromotionsToSupabase는 Supabase 오류를 삼키지 않고 message 및 code와 함께 errors에 포함한다", async () => {
  // 1. benefits upsert 오류
  const clientBenefitErr = {
    from() {
      return {
        async upsert() {
          return {
            data: null,
            error: { message: "duplicate key violates unique constraint", code: "23505" },
          };
        },
      };
    },
  };
  const res1 = await syncPromotionsToSupabase(
    [{ id: "p1", title: "T1", kind: "K", category: "C" }],
    { supabaseClient: clientBenefitErr }
  );
  assert.equal(res1.benefitsUpserted, 0);
  assert.equal(res1.errors.length, 1);
  assert.equal(res1.errors[0].message, "duplicate key violates unique constraint");
  assert.equal(res1.errors[0].code, "23505");

  // 2. subscription_services select 오류 (혜택 upsert는 유지, 매핑 upsert만 건너뜀)
  const clientServiceSelectErr = {
    from(table) {
      if (table === "benefits") {
        return {
          async upsert(rows) {
            return { data: rows, error: null };
          },
        };
      }
      if (table === "subscription_services") {
        return {
          async select() {
            return {
              data: null,
              error: { message: "relation subscription_services does not exist", code: "42P01" },
            };
          },
        };
      }
      return {
        async upsert() {
          throw new Error("mapping upsert should not be called");
        },
      };
    },
  };
  const res2 = await syncPromotionsToSupabase(
    [{ id: "p2", title: "T2", kind: "K", category: "C", sourceServiceIds: ["s1"] }],
    { supabaseClient: clientServiceSelectErr }
  );
  assert.equal(res2.benefitsUpserted, 1);
  assert.equal(res2.mappingsUpserted, 0);
  assert.equal(res2.errors.length, 1);
  assert.equal(res2.errors[0].message, "relation subscription_services does not exist");
  assert.equal(res2.errors[0].code, "42P01");

  // 3. service_benefits upsert 오류 (혜택 upsert는 유지되고 매핑 오류 기록)
  const clientJoinErr = {
    from(table) {
      if (table === "benefits") {
        return {
          async upsert(rows) {
            return { data: rows, error: null };
          },
        };
      }
      if (table === "subscription_services") {
        return {
          async select() {
            return { data: [{ id: "s1" }], error: null };
          },
        };
      }
      if (table === "service_benefits") {
        return {
          async upsert() {
            return {
              data: null,
              error: { message: "insert into service_benefits violates foreign key", code: "23503" },
            };
          },
        };
      }
    },
  };
  const res3 = await syncPromotionsToSupabase(
    [{ id: "p3", title: "T3", kind: "K", category: "C", sourceServiceIds: ["s1"] }],
    { supabaseClient: clientJoinErr }
  );
  assert.equal(res3.benefitsUpserted, 1);
  assert.equal(res3.mappingsUpserted, 0);
  assert.equal(res3.errors.length, 1);
  assert.equal(res3.errors[0].message, "insert into service_benefits violates foreign key");
  assert.equal(res3.errors[0].code, "23503");
});

test("filterActivePromotions는 만료일 경과 항목, EXPIRED 항목, free_tier 항목을 제외한다", () => {
  const items = [
    { id: "live-1", title: "Live", verifiedStatus: "LIVE_CONFIRMED", dday: 30 },
    { id: "future-deadline", title: "Future", verifiedStatus: "LIVE_CONFIRMED", deadline: "2026-12-31" },
    { id: "past-deadline", title: "Past", verifiedStatus: "LIVE_CONFIRMED", deadline: "2026-09-30" },
    { id: "past-dday-str", title: "Past Dday", verifiedStatus: "LIVE_CONFIRMED", dday: "2026-10-01" },
    { id: "expired-status", title: "Expired", verifiedStatus: "EXPIRED" },
    { id: "free-tier", title: "Free Tier", verifiedStatus: "LIVE_CONFIRMED", isFreeTier: true },
  ];

  const active = filterActivePromotions(items, { now: NOW });
  assert.deepEqual(
    active.map((p) => p.id),
    ["live-1", "future-deadline"]
  );
});

test("mapDbBenefitToPromotion 및 loadLivePromotions는 Supabase/원격 데이터를 클라이언트 카탈로그 형식으로 동기화하고 캐시한다", async () => {
  const dbRow = {
    id: "disney-bundle-37",
    title: "Disney+ X TVING X Wavve",
    subtitle: "3사 통합 번들",
    kind: "37% 결합 할인",
    category: "통신사/결합",
    description: "결합 할인",
    saving: 12000,
    original_price: 34300,
    offer_price: 22300,
    dday: 15,
    link: "https://www.disneyplus.com/ko-kr",
    benefit_period: "상시",
    campaign_period: "상시 제휴",
    monogram: "D",
    verified_status: "confirmed",
    service_benefits: [
      { service_id: "disney", is_primary: true },
      { service_id: "tving", is_primary: false },
    ],
  };

  const mapped = mapDbBenefitToPromotion(dbRow);
  assert.equal(mapped.id, "disney-bundle-37");
  assert.equal(mapped.originalPrice, 34300);
  assert.equal(mapped.offerPrice, 22300);
  assert.equal(mapped.verifiedStatus, "LIVE_CONFIRMED");
  assert.deepEqual(mapped.sourceServiceIds, ["disney", "tving"]);

  const memoryStorage = new Map();
  const storage = {
    getItem: (k) => memoryStorage.get(k) ?? null,
    setItem: (k, v) => memoryStorage.set(k, v),
  };

  const mockSupabaseClient = {
    from() {
      return {
        select() {
          return {
            eq() {
              return Promise.resolve({ data: [dbRow], error: null });
            },
          };
        },
      };
    },
  };

  const fallback = [{ id: "fallback-promo", title: "Fallback", verifiedStatus: "LIVE_CONFIRMED" }];
  const initial = getInitialPromotions({ fallbackPromotions: fallback, storage, now: NOW });
  assert.equal(initial[0].id, "fallback-promo");

  const synced = await loadLivePromotions({
    fallbackPromotions: fallback,
    supabaseClient: mockSupabaseClient,
    storage,
    now: NOW,
  });
  assert.equal(synced.length, 1);
  assert.equal(synced[0].id, "disney-bundle-37");

  // 캐시에 저장되었는지 확인
  const cachedInitial = getInitialPromotions({ fallbackPromotions: fallback, storage, now: NOW });
  assert.equal(cachedInitial[0].id, "disney-bundle-37");
});
