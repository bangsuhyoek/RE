/**
 * 크롤러 → Supabase DB (public.benefits / public.service_benefits) 동기화 모듈
 */

import { createClient } from "@supabase/supabase-js";

function toDbVerifiedStatus(promotion) {
  if (promotion.isFreeTier) return "free_tier";
  if (promotion.verifiedStatus === "LIVE_CONFIRMED") return "confirmed";
  if (promotion.verifiedStatus === "EXPIRED") return "expired";
  return "unverified";
}

/**
 * 프로모션 항목을 public.benefits 테이블 행 구조로 변환한다.
 */
export function mapPromotionToBenefitRow(promotion, updatedAt = new Date().toISOString()) {
  const ddayVal = typeof promotion.dday === "number" ? promotion.dday : Number(promotion.dday) || 30;
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
    verified_status: toDbVerifiedStatus(promotion),
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
  } catch {}
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

  const benefitRows = validPromotions.map((p) => mapPromotionToBenefitRow(p, updatedAt));
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
    let serviceSelectError = null;
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
