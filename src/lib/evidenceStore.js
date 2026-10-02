import { supabase } from "./supabase.js";
import { clearStoredValue, readEvidenceCases, readStoredValue, saveEvidenceCase, storageKeys, writeStoredValue } from "./storage.js";
import { EVIDENCE_TITLES } from "./subscriptionAgent.js";

/**
 * 증빙 사건 서버 보관(선택 동의)
 * - 기본은 기기 저장만 한다. 로그인 사용자가 "계정에 보관"에 동의한 경우에만 evidence_cases·evidence_items에 올린다.
 * - 서버 보관 기간은 만든 날부터 1년이고, 지난 사건은 서버가 매일 지운다.
 * - 동의를 철회하면 서버 기록을 지운다. 기기 기록은 "증빙 모두 지우기"로 지운다.
 */

const SERVER_KINDS = new Set(["price_increase", "trial_conversion", "charged_after_cancel"]);
const RETENTION_MS = 365 * 86_400_000;

export function readEvidenceConsent(userId) {
  const consent = readStoredValue(storageKeys.evidenceConsent, null);
  return userId && consent?.userId === userId ? consent : null;
}

export const evidenceItemKey = (item) => item.type + ":" + item.capturedAt + ":" + (item.approvalId || "");

export function mapCaseToRow(evidenceCase) {
  const createdAt = new Date(evidenceCase.createdAt || Date.now());
  return {
    case_key: evidenceCase.id,
    kind: evidenceCase.kind,
    subscription_id: evidenceCase.subscriptionId || null,
    service_name: evidenceCase.serviceName || "",
    amount_krw: Math.max(0, Math.round(Number(evidenceCase.amount) || 0)),
    previous_amount_krw: evidenceCase.previousAmount == null ? null : Math.max(0, Math.round(Number(evidenceCase.previousAmount) || 0)),
    // 보관 기간은 기기에서 사건을 만든 날부터 1년이다. 늦게 올려도 기간이 늘어나지 않는다.
    created_at: createdAt.toISOString(),
    expires_at: new Date(createdAt.getTime() + RETENTION_MS).toISOString(),
  };
}

export function mapItemToRow(item, caseId) {
  return {
    case_id: caseId,
    item_key: evidenceItemKey(item),
    type: item.type,
    captured_at: item.capturedAt,
    detail: String(item.detail || "").slice(0, 500),
    approval_key: item.approvalId || null,
  };
}

export function mapRowsToCase(row) {
  return {
    id: row.case_key,
    kind: row.kind,
    subscriptionId: row.subscription_id,
    title: EVIDENCE_TITLES[row.kind] || "",
    serviceName: row.service_name,
    amount: row.amount_krw,
    previousAmount: row.previous_amount_krw,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    items: (row.evidence_items || []).map((item) => ({
      type: item.type,
      capturedAt: item.captured_at,
      detail: item.detail,
      ...(item.approval_key ? { approvalId: item.approval_key } : {}),
    })),
  };
}

/** 서버 사건을 기기 사건에 합친다. 항목은 item_key 기준으로 한 번만 남긴다. */
export function mergeEvidenceCases(local = {}, remote = []) {
  const next = { ...local };
  for (const remoteCase of remote) {
    const current = next[remoteCase.id];
    if (!current) {
      next[remoteCase.id] = remoteCase;
      continue;
    }
    const seen = new Set(current.items.map(evidenceItemKey));
    const extra = remoteCase.items.filter((item) => !seen.has(evidenceItemKey(item)));
    next[remoteCase.id] = { ...current, expiresAt: remoteCase.expiresAt || current.expiresAt, items: [...current.items, ...extra] };
  }
  return next;
}

export async function uploadEvidenceCase(userId, evidenceCase) {
  if (!supabase || !userId || !evidenceCase?.id || !SERVER_KINDS.has(evidenceCase.kind)) return false;
  try {
    const { error: caseError } = await supabase
      .from("evidence_cases")
      .upsert(mapCaseToRow(evidenceCase), { onConflict: "user_id,case_key", ignoreDuplicates: true });
    if (caseError) throw caseError;
    const { data: row, error: findError } = await supabase
      .from("evidence_cases")
      .select("id")
      .eq("case_key", evidenceCase.id)
      .maybeSingle();
    if (findError) throw findError;
    if (!row?.id) return false;
    const items = (evidenceCase.items || []).map((item) => mapItemToRow(item, row.id));
    if (items.length) {
      const { error: itemError } = await supabase
        .from("evidence_items")
        .upsert(items, { onConflict: "case_id,item_key", ignoreDuplicates: true });
      if (itemError) throw itemError;
    }
    return true;
  } catch (error) {
    console.warn("uploadEvidenceCase error:", error);
    return false;
  }
}

export async function fetchServerEvidence(userId) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from("evidence_cases")
      .select("case_key, kind, subscription_id, service_name, amount_krw, previous_amount_krw, created_at, expires_at, evidence_items(type, captured_at, detail, approval_key)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []).map(mapRowsToCase);
  } catch (error) {
    console.warn("fetchServerEvidence error:", error);
    return [];
  }
}

/** 기기에 저장하고, 동의한 로그인 사용자면 서버에도 올린다. */
export function persistEvidenceCase(userId, evidenceCase) {
  if (!evidenceCase?.id) return;
  saveEvidenceCase(evidenceCase);
  if (readEvidenceConsent(userId)) uploadEvidenceCase(userId, evidenceCase);
}

/** 서버 기록을 내려받아 기기 기록과 합친다. 동의한 사용자만. */
export async function pullServerEvidence(userId) {
  if (!readEvidenceConsent(userId)) return;
  const remote = await fetchServerEvidence(userId);
  if (!remote.length) return;
  const merged = mergeEvidenceCases(readEvidenceCases(), remote);
  for (const evidenceCase of Object.values(merged)) saveEvidenceCase(evidenceCase);
}

export async function grantEvidenceConsent(userId) {
  if (!userId) return false;
  writeStoredValue(storageKeys.evidenceConsent, { userId, consentedAt: new Date().toISOString(), retentionDays: 365 });
  const results = await Promise.all(Object.values(readEvidenceCases()).map((evidenceCase) => uploadEvidenceCase(userId, evidenceCase)));
  return results.every(Boolean);
}

async function deleteServerEvidence(userId) {
  if (!supabase || !userId) return true;
  try {
    const { error } = await supabase.from("evidence_cases").delete().eq("user_id", userId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("deleteServerEvidence error:", error);
    return false;
  }
}

/** 동의를 철회하고 서버 기록을 지운다. 기기 기록은 남긴다. */
export async function revokeEvidenceConsent(userId) {
  const deleted = await deleteServerEvidence(userId);
  if (deleted) clearStoredValue(storageKeys.evidenceConsent);
  return deleted;
}

/** 기기와 서버의 증빙을 모두 지운다. 서버 동의는 유지한다. */
export async function deleteAllEvidence(userId) {
  const deleted = readEvidenceConsent(userId) ? await deleteServerEvidence(userId) : true;
  if (deleted) clearStoredValue(storageKeys.evidenceCases);
  return deleted;
}
