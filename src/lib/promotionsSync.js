/**
 * 클라이언트 런타임 프로모션 Stale-While-Revalidate (SWR) 동기화 및 만료 필터링 모듈
 */

export const PROMOTIONS_CACHE_KEY = "submate_live_promotions_v1";

function getDefaultStorage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function parseDateDeadline(value) {
  if (typeof value !== "string") return NaN;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return NaN;
  return Date.parse(`${trimmed}T23:59:59.999+09:00`);
}

/**
 * 프로모션이 만료(EXPIRED 상태 또는 마감일 경과)되었는지 확인한다.
 */
export function isPromotionExpired(promotion, now = Date.now()) {
  if (!promotion) return true;
  if (promotion.verifiedStatus === "EXPIRED" || promotion.verified_status === "expired") {
    return true;
  }
  const deadlineMs = parseDateDeadline(promotion.deadline);
  if (Number.isFinite(deadlineMs) && deadlineMs < now) {
    return true;
  }
  const ddayMs = parseDateDeadline(promotion.dday);
  if (Number.isFinite(ddayMs) && ddayMs < now) {
    return true;
  }
  return false;
}

/**
 * 만료된 항목, 상시 무료 요금제(isFreeTier), 중복 ID를 제거한 활성 프로모션 목록을 반환한다.
 */
export function filterActivePromotions(promotions = [], { now = Date.now() } = {}) {
  if (!Array.isArray(promotions)) return [];
  const seen = new Set();
  const active = [];

  for (const promo of promotions) {
    if (!promo || !promo.id) continue;
    if (promo.isFreeTier === true || promo.verified_status === "free_tier") continue;
    if (isPromotionExpired(promo, now)) continue;
    if (seen.has(promo.id)) continue;
    seen.add(promo.id);
    active.push(promo);
  }
  return active;
}

/**
 * Supabase public.benefits (+ service_benefits) 행을 앱 카탈로그 객체로 변환한다.
 */
export function mapDbBenefitToPromotion(row) {
  const joins = Array.isArray(row.service_benefits) ? [...row.service_benefits] : [];
  joins.sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)));
  const sourceServiceIds = joins.map((j) => j.service_id).filter(Boolean);

  return {
    id: row.id,
    title: row.title || row.id,
    subtitle: row.subtitle || row.kind || row.title,
    kind: row.kind || row.subtitle || "",
    category: row.category || "기타",
    description: row.description || "",
    saving: Number(row.saving) || 0,
    originalPrice: Number(row.original_price ?? row.originalPrice) || 0,
    offerPrice: Number(row.offer_price ?? row.offerPrice) || 0,
    dday: row.dday ?? 30,
    sourceServiceIds: sourceServiceIds.length > 0 ? sourceServiceIds : row.sourceServiceIds || [],
    link: row.link || "",
    monogram: row.monogram || (row.title ? row.title.slice(0, 1).toUpperCase() : "P"),
    verifiedStatus: row.verified_status === "confirmed" ? "LIVE_CONFIRMED" : row.verifiedStatus || "LIVE_CONFIRMED",
    benefitPeriod: row.benefit_period || row.benefitPeriod || "상시 진행",
    campaignPeriod: row.campaign_period || row.campaignPeriod || "상시 진행",
  };
}

/**
 * 초기 렌더링 시 지연 시간(0ms)을 보장하기 위해 로컬 캐시 또는 번들 카탈로그에서 활성 프로모션을 즉시 반환한다.
 */
export function getInitialPromotions({
  fallbackPromotions = [],
  storage = getDefaultStorage(),
  now = Date.now(),
} = {}) {
  if (storage) {
    try {
      const raw = storage.getItem(PROMOTIONS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const filtered = filterActivePromotions(parsed?.items, { now });
        if (filtered.length > 0) return filtered;
      }
    } catch {
      // 캐시 파싱 실패 시 번들 카탈로그로 폴백
    }
  }
  return filterActivePromotions(fallbackPromotions, { now });
}

function writeCache(storage, items, now) {
  if (!storage) return;
  try {
    storage.setItem(
      PROMOTIONS_CACHE_KEY,
      JSON.stringify({ updatedAt: new Date(now).toISOString(), items })
    );
  } catch {
    // 스토리지 용량 초과 등 무시
  }
}

/**
 * 백그라운드에서 Supabase benefits 테이블(미설정 시 /catalog/promotions.json)을 조회해 최신 프로모션을 동기화한다.
 */
export async function loadLivePromotions({
  fallbackPromotions = [],
  supabaseClient = null,
  fetchImpl = typeof fetch !== "undefined" ? fetch : null,
  storage = getDefaultStorage(),
  now = Date.now(),
} = {}) {
  // 1. Supabase DB 조회 우선 시도
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("benefits")
        .select("*, service_benefits(service_id, role, is_primary)")
        .eq("verified_status", "confirmed");
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapDbBenefitToPromotion);
        const filtered = filterActivePromotions(mapped, { now });
        if (filtered.length > 0) {
          writeCache(storage, filtered, now);
          return filtered;
        }
      }
    } catch {
      // Supabase 조회 실패 시 정적 JSON 또는 폴백 사용
    }
  }

  // 2. 정적 /catalog/promotions.json 조회 시도 (브라우저 환경 등)
  if (typeof fetchImpl === "function" && typeof window !== "undefined") {
    try {
      const res = await fetchImpl("/catalog/promotions.json", { cache: "no-cache" });
      if (res?.ok) {
        const json = await res.json();
        const filtered = filterActivePromotions(json, { now });
        if (filtered.length > 0) {
          writeCache(storage, filtered, now);
          return filtered;
        }
      }
    } catch {
      // 오프라인 또는 네트워크 실패 무시
    }
  }

  return getInitialPromotions({ fallbackPromotions, storage, now });
}
