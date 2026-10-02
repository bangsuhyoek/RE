import { supabase } from "./supabase.js";

/**
 * "항상 허용" 범위를 Supabase agent_mandates에 기록한다.
 * - 로그인(Supabase 계정)한 사용자만 서버에 저장하고, 그 외에는 기기 저장만 쓴다.
 * - 만들기·해제는 서버 함수로만 한다. 자동 허용 여부는 서버의 decide_approval_request가 다시 확인한다.
 */

export function mapRowToMandate(row) {
  return {
    id: row.id,
    subscriptionId: row.subscription_id,
    serviceName: row.service_name,
    maxAmount: row.max_amount_krw,
    verifiedWith: row.verified_with,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
}

/** 구독마다 가장 최근 기록 하나만 돌려준다. */
export async function fetchMandates(userId) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from("agent_mandates")
      .select("id, subscription_id, service_name, max_amount_krw, verified_with, created_at, expires_at, revoked_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const latest = new Map();
    for (const row of data || []) {
      if (!latest.has(row.subscription_id)) latest.set(row.subscription_id, mapRowToMandate(row));
    }
    return [...latest.values()];
  } catch (error) {
    console.warn("fetchMandates error:", error);
    return [];
  }
}

export async function createMandateOnServer(userId, mandate) {
  if (!supabase || !userId || !mandate) return null;
  try {
    const { data, error } = await supabase.rpc("create_agent_mandate", {
      p_subscription_id: mandate.subscriptionId,
      p_service_name: mandate.serviceName || "",
      p_max_amount_krw: mandate.maxAmount,
      p_verified_with: mandate.verifiedWith,
    });
    if (error) throw error;
    return data?.id ? mapRowToMandate(data) : null;
  } catch (error) {
    console.warn("createMandateOnServer error:", error);
    return null;
  }
}

export async function revokeMandateOnServer(userId, subscriptionId) {
  if (!supabase || !userId || !subscriptionId) return false;
  try {
    const { error } = await supabase.rpc("revoke_agent_mandate", { p_subscription_id: subscriptionId });
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("revokeMandateOnServer error:", error);
    return false;
  }
}
