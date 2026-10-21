/**
 * 크롤러 → Supabase DB (public.benefits / public.service_benefits) 동기화 모듈
 */

import { createClient } from "@supabase/supabase-js";
import { parseKoreanCampaignPeriod } from "../promotionValidator.js";
import { extractDeadline } from "./offerExtractor.js";

const SOFT_DEGRADATION_MS = 48 * 3600 * 1000;

function getKstDateString(dateInput) {
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const ms = typeof dateInput === "number" ? dateInput : Date.parse(dateInput);
  if (!Number.isFinite(ms)) return null;
  const kst = new Date(ms + 9 * 3600 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function kstCalendarDaysBetween(todayStr, targetStr) {
  const [y1, m1, d1] = todayStr.split("-").map(Number);
  const [y2, m2, d2] = targetStr.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  const diffDays = Math.round((utc2 - utc1) / (24 * 3600 * 1000));
  return Math.max(0, diffDays);
}

/**
 * 프로모션의 마감일/종료일 또는 dday 표기로부터 KST 달력 일수 기준 잔여일(dday)을 계산한다.
 * 계산할 수 없는 경우 DB 컬럼이 nullable이므로 null을 반환한다.
 */
export function computeDday(promotion, { now = Date.now() } = {}) {
  if (!promotion || typeof promotion !== "object") return null;

  const nowMs = typeof now === "number" ? now : Date.parse(now);
  const todayKst = getKstDateString(nowMs);
  if (!todayKst) return null;

  let targetKst = null;

  // 1. deadline 필드 검사
  if (promotion.deadline) {
    if (typeof promotion.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(promotion.deadline.trim())) {
      targetKst = promotion.deadline.trim();
    } else {
      const extracted = extractDeadline(String(promotion.deadline), { now: nowMs });
      if (extracted) targetKst = extracted;
    }
  }

  // 2. endAt 필드 검사
  if (!targetKst && promotion.endAt) {
    targetKst = getKstDateString(promotion.endAt);
  }

  // 3. campaignPeriod 또는 periodText 파싱 검사
  const periodText = promotion.campaignPeriod || promotion.periodText;
  if (!targetKst && periodText && typeof periodText === "string") {
    try {
      const parsed = parseKoreanCampaignPeriod(periodText, { now: nowMs });
      if (parsed && parsed.endAt) {
        targetKst = getKstDateString(parsed.endAt);
      }
    } catch {
      // JSON 파싱 실패 시 extractDeadline 으로 대체
    }
    if (!targetKst) {
      const extracted = extractDeadline(periodText, { now: nowMs });
      if (extracted) targetKst = extracted;
    }
  }

  if (targetKst) {
    return kstCalendarDaysBetween(todayKst, targetKst);
  }

  // 4. promotion.dday 폴백 파싱 (예: "D-30" → 30, 30 → 30)
  if (promotion.dday !== undefined && promotion.dday !== null) {
    if (typeof promotion.dday === "number" && Number.isFinite(promotion.dday)) {
      return Math.max(0, Math.floor(promotion.dday));
    }
    if (typeof promotion.dday === "string") {
      const trimmed = promotion.dday.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return kstCalendarDaysBetween(todayKst, trimmed);
      }
      const dMatch = trimmed.match(/^D-(\d+)$/i);
      if (dMatch) {
        return Math.max(0, Number(dMatch[1]));
      }
      const numMatch = trimmed.match(/^\d+$/);
      if (numMatch) {
        return Math.max(0, Number(trimmed));
      }
    }
  }

  return null;
}

export function toDbVerifiedStatus(promotion, { now = Date.now() } = {}) {
  if (promotion.isFreeTier || promotion.verifiedStatus === "free_tier" || promotion.verified_status === "free_tier") return "free_tier";
  if (promotion.verifiedStatus === "LIVE_CONFIRMED" || promotion.verifiedStatus === "AUTO_UPDATED" || promotion.verifiedStatus === "confirmed") return "confirmed";
  if (promotion.verifiedStatus === "EXPIRED" || promotion.verified_status === "expired") return "expired";

  const isSoftDegraded =
    promotion.verifiedStatus === "SOFT_DEGRADED" ||
    promotion.verifiedStatus === "soft_degraded" ||
    promotion.isSoftDegraded === true ||
    Boolean(promotion.softDegradedSince);

  if (isSoftDegraded) {
    const refTime = Date.parse(promotion.lastVerifiedAt ?? promotion.softDegradedSince ?? "");
    const nowMs = typeof now === "number" ? now : Date.parse(now);
    if (Number.isFinite(refTime) && Number.isFinite(nowMs)) {
      if (nowMs >= refTime && nowMs - refTime <= SOFT_DEGRADATION_MS) {
        return "confirmed";
      }
      return "unverified";
    }
    return "confirmed";
  }

  return "unverified";
}

/**
 * 프로모션 항목을 public.benefits 테이블 행 구조로 변환한다.
 */
export function mapPromotionToBenefitRow(promotion, updatedAt = new Date().toISOString(), { now = Date.now() } = {}) {
  const ddayVal = computeDday(promotion, { now });
  return {
    id: promotion.id || null,
    title: promotion.title || null,
    subtitle: promotion.subtitle || null,
    kind: promotion.kind || null,
    category: promotion.category || null,
    description: promotion.description || null,
    saving: Number(promotion.saving) || 0,
    original_price: Number(promotion.originalPrice) || 0,
    offer_price: Number(promotion.offerPrice) || 0,
    dday: ddayVal,
    link: promotion.link || null,
    benefit_period: promotion.benefitPeriod || null,
    campaign_period: promotion.campaignPeriod || null,
    monogram: promotion.monogram || null,
    verified_status: toDbVerifiedStatus(promotion, { now }),
    updated_at: updatedAt,
  };
}

/**
 * 프로모션 항목의 sourceServiceIds를 public.service_benefits 매핑 테이블 행 배열로 변환한다.
 */
export function mapPromotionToServiceBenefitRows(promotion) {
  const serviceIds = Array.isArray(promotion.sourceServiceIds) ? promotion.sourceServiceIds.filter(Boolean) : [];
  const isPartnership = serviceIds.length > 1;
  return serviceIds.map((serviceId, index) => ({
    service_id: serviceId,
    benefit_id: promotion.id,
    role: isPartnership ? "partner" : "target",
    is_primary: index === 0,
  }));
}

function isAnonKey(key) {
  if (!key || typeof key !== "string") return false;
  if (key === "anon" || key.toLowerCase().includes("anon")) return true;
  try {
    const parts = key.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      return payload.role === "anon";
    }
  } catch {
    // 토큰 파싱 또는 디코딩 실패 시 anon 아님 처리
  }
  return false;
}

function validatePromotion(promotion) {
  const missing = [];
  if (!promotion || typeof promotion !== "object") {
    return ["id", "title", "kind", "category"];
  }
  if (!promotion.id || (typeof promotion.id === "string" && !promotion.id.trim())) {
    missing.push("id");
  }
  if (!promotion.title || (typeof promotion.title === "string" && !promotion.title.trim())) {
    missing.push("title");
  }
  if (!promotion.kind || (typeof promotion.kind === "string" && !promotion.kind.trim())) {
    missing.push("kind");
  }
  if (!promotion.category || (typeof promotion.category === "string" && !promotion.category.trim())) {
    missing.push("category");
  }
  return missing;
}

/**
 * 마스터/라이브 프로모션 목록을 Supabase benefits 및 service_benefits 테이블에 Upsert한다.
 */
export async function syncPromotionsToSupabase(
  promotions = [],
  {
    supabaseClient = null,
    supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
    supabaseKey = "",
    role = null,
    isAnon = false,
    updatedAt = new Date().toISOString(),
    now = Date.parse(updatedAt) || Date.now(),
  } = {}
) {
  let effectiveServiceKey = serviceRoleKey;
  let effectiveAnonKey = anonKey;
  if (supabaseKey) {
    if (isAnonKey(supabaseKey)) {
      if (!effectiveAnonKey) effectiveAnonKey = supabaseKey;
    } else {
      if (!effectiveServiceKey) effectiveServiceKey = supabaseKey;
    }
  }

  const isAnonClient =
    isAnon ||
    role === "anon" ||
    (supabaseClient && (supabaseClient.role === "anon" || supabaseClient.isAnon === true || isAnonKey(supabaseClient.supabaseKey))) ||
    (!supabaseClient && !effectiveServiceKey && Boolean(effectiveAnonKey));

  if (isAnonClient) {
    return {
      skipped: true,
      reason: "SERVICE_ROLE_KEY_REQUIRED",
      benefitsUpserted: 0,
      mappingsUpserted: 0,
      invalid: [],
      unknownServiceIds: [],
      errors: [],
      syncedBenefits: 0,
      syncedServiceBenefits: 0,
    };
  }

  const client =
    supabaseClient ||
    (supabaseUrl && effectiveServiceKey && !supabaseUrl.includes("your-project")
      ? createClient(supabaseUrl, effectiveServiceKey, { auth: { persistSession: false } })
      : null);

  if (!client) {
    return {
      skipped: true,
      reason: "SUPABASE_NOT_CONFIGURED",
      benefitsUpserted: 0,
      mappingsUpserted: 0,
      invalid: [],
      unknownServiceIds: [],
      errors: [],
      syncedBenefits: 0,
      syncedServiceBenefits: 0,
    };
  }

  const invalid = [];
  const validPromotions = [];
  for (const promotion of (promotions || [])) {
    const missing = validatePromotion(promotion);
    if (missing.length > 0) {
      invalid.push({ id: promotion?.id ?? null, missing });
    } else {
      validPromotions.push(promotion);
    }
  }

  const benefitRows = validPromotions.map((p) => mapPromotionToBenefitRow(p, updatedAt, { now }));
  const rawServiceBenefitRows = validPromotions.flatMap((p) => mapPromotionToServiceBenefitRows(p));

  let benefitsUpserted = 0;
  let mappingsUpserted = 0;
  let unknownServiceIds = [];
  const errors = [];

  let benefitError = null;
  if (benefitRows.length > 0) {
    const res = await client.from("benefits").upsert(benefitRows, { onConflict: "id" });
    benefitError = res?.error;
    if (benefitError) {
      errors.push({
        message: benefitError.message || String(benefitError),
        code: benefitError.code || null,
      });
    } else {
      benefitsUpserted = benefitRows.length;
    }
  }

  if (!benefitError && rawServiceBenefitRows.length > 0) {
    let serviceRows = null;
    let serviceSelectError;
    try {
      const fromObj = client.from("subscription_services");
      if (typeof fromObj?.select === "function") {
        const res = await fromObj.select("id");
        serviceRows = res?.data;
        serviceSelectError = res?.error;
      } else {
        serviceSelectError = {
          message: "subscription_services.select is not a function",
          code: "METHOD_NOT_SUPPORTED",
        };
      }
    } catch (err) {
      serviceSelectError = {
        message: err?.message || String(err),
        code: err?.code || null,
      };
    }

    if (serviceSelectError) {
      errors.push({
        message: serviceSelectError.message || String(serviceSelectError),
        code: serviceSelectError.code || null,
      });
    } else {
      const existingServiceIds = new Set((serviceRows || []).map((s) => s.id));
      const unknownSet = new Set();
      const validMappings = [];

      for (const row of rawServiceBenefitRows) {
        if (existingServiceIds.has(row.service_id)) {
          validMappings.push(row);
        } else {
          unknownSet.add(row.service_id);
        }
      }

      unknownServiceIds = Array.from(unknownSet);

      if (validMappings.length > 0) {
        const { error: joinError } = await client
          .from("service_benefits")
          .upsert(validMappings, { onConflict: "service_id,benefit_id" });
        if (joinError) {
          errors.push({
            message: joinError.message || String(joinError),
            code: joinError.code || null,
          });
        } else {
          mappingsUpserted = validMappings.length;
        }
      }
    }
  }

  return {
    skipped: false,
    benefitsUpserted,
    mappingsUpserted,
    invalid,
    unknownServiceIds,
    errors,
    syncedBenefits: benefitsUpserted,
    syncedServiceBenefits: mappingsUpserted,
  };
}
