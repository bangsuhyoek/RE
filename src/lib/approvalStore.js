import { supabase } from "./supabase.js";

/**
 * 승인 요청을 Supabase approval_requests에 기록한다.
 * - 로그인(Supabase 계정)한 사용자만 서버에 저장하고, 그 외에는 기기 저장만 쓴다.
 * - 결정은 서버 함수 decide_approval_request가 한 번만 반영한다. 서버 결과가 기기 기록보다 우선한다.
 */

const KINDS = new Set(["renewal", "trial_conversion", "price_increase", "cancel", "refund", "cancel_refund"]);

export function mapApprovalToRow(request) {
  return {
    idempotency_key: request.id,
    subscription_id: String(request.subscriptionId || ""),
    service_name: request.serviceName || "",
    kind: request.kind,
    amount_krw: Math.max(0, Math.round(Number(request.amount) || 0)),
    previous_amount_krw: request.previousAmount == null ? null : Math.max(0, Math.round(Number(request.previousAmount) || 0)),
    due_at: request.dueAt,
  };
}

export function mapRowToApproval(row) {
  return {
    id: row.idempotency_key,
    kind: row.kind,
    subscriptionId: row.subscription_id,
    serviceName: row.service_name,
    amount: row.amount_krw,
    previousAmount: row.previous_amount_krw,
    dueAt: row.due_at,
    status: row.status,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  };
}

/** 서버 기록을 기기 기록 위에 덮어쓴다. 서버에서 이미 결정된 요청은 기기에서 바꿀 수 없다. */
export function mergeServerApprovals(local = {}, rows = []) {
  const next = { ...local };
  for (const row of rows) {
    const remote = mapRowToApproval(row);
    const current = next[remote.id];
    if (!current || remote.status !== "pending" || current.status === "pending") {
      next[remote.id] = { ...current, ...remote };
    }
  }
  return next;
}

export async function fetchApprovals(userId) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from("approval_requests")
      .select("idempotency_key, subscription_id, service_name, kind, amount_krw, previous_amount_krw, due_at, status, decided_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn("fetchApprovals error:", error);
    return [];
  }
}

export async function recordApprovalRequest(userId, request) {
  if (!supabase || !userId || !request?.id || !KINDS.has(request.kind) || !request.subscriptionId) return false;
  try {
    const { error } = await supabase
      .from("approval_requests")
      .upsert(mapApprovalToRow(request), { onConflict: "user_id,idempotency_key", ignoreDuplicates: true });
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("recordApprovalRequest error:", error);
    return false;
  }
}

/** 서버에 결정을 반영하고, 서버가 확정한 최종 상태(행)를 돌려준다. 실패하면 null. */
export async function decideApprovalOnServer(userId, request, decision) {
  if (!supabase || !userId || !request?.id) return null;
  try {
    await recordApprovalRequest(userId, request);
    const { data, error } = await supabase.rpc("decide_approval_request", {
      p_idempotency_key: request.id,
      p_decision: decision,
    });
    if (error) throw error;
    return data?.idempotency_key ? data : null;
  } catch (error) {
    console.warn("decideApprovalOnServer error:", error);
    return null;
  }
}
