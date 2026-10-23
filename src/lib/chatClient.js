import { getApiEndpoint } from "./apiBase.js";
import { supabase } from "./supabase.js";
import { getNextChargeDate, toLocalDateKey } from "./dates.js";
import { getPaymentMethodInfo } from "./paymentMethod.js";
import { unusedStreak } from "./usageCheck.js";

import {
  readUserConsent,
  setUserConsent,
  revokeUserConsent,
} from "./consentStore.js";

export const CHAT_CONSENT_KEY = "submate.chatConsent.v1";

export const CHAT_HISTORY_PREFIX = "submate:chat-history";
export const MAX_PERSISTED_MESSAGES = 30;

export class ChatError extends Error {
  constructor(message, { code = "NETWORK_ERROR", status = 0, retryAfter = null } = {}) {
    super(message);
    this.name = "ChatError";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/**
 * Returns today's date in YYYY-MM-DD format (KST).
 */
export function getKstDateString(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    return toLocalDateKey(date);
  }
}

/**
 * Strips card numbers and returns a clean label only (e.g. "신한카드", "카카오페이").
 */
export function sanitizePaymentMethod(method = "") {
  if (!method) return null;
  const raw = String(method).trim();
  if (!raw) return null;
  const info = getPaymentMethodInfo(raw);
  if (info && info.name && info.name !== "결제수단 미등록") {
    return info.name;
  }
  const cleaned = raw.replace(/[-0-9•*·]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || null;
}

/**
 * Maps app subscription objects to the snapshot shape required by the /api/chat endpoint.
 */
export function buildChatSnapshot(subscriptions = [], now = new Date(), usageAnswers = null) {
  const today = getKstDateString(now);
  const items = Array.isArray(subscriptions) ? subscriptions.slice(0, 100) : [];

  const mappedSubscriptions = items.map((sub) => {
    const id = sub.subscriptionId || sub.id;
    const isYearly = sub.billingCycle === "매년";
    const billingCycle = isYearly ? "매년" : "매월";

    let nextChargeDateStr = null;
    try {
      if (sub.status !== "cancelled") {
        const nextDate = getNextChargeDate(sub, now);
        if (nextDate && !isNaN(nextDate.getTime())) {
          nextChargeDateStr = toLocalDateKey(nextDate);
        }
      }
    } catch {
      nextChargeDateStr = null;
    }

    const personalAmount = Number(sub.amount ?? sub.grossAmount);
    const grossAmount = Number(sub.grossAmount ?? sub.amount);

    let usageStr = null;
    if (usageAnswers && typeof usageAnswers === "object") {
      try {
        const streak = unusedStreak(usageAnswers, sub);
        if (streak > 0) {
          usageStr = streak + "달 연속 미사용";
        }
      } catch {
        usageStr = null;
      }
    }

    return {
      id: String(id),
      name: String(sub.name || ""),
      serviceId: sub.serviceId || sub.id || undefined,
      category: sub.category || undefined,
      plan: sub.plan || undefined,
      amount: Number.isFinite(personalAmount) && personalAmount >= 0 ? personalAmount : 0,
      grossAmount: Number.isFinite(grossAmount) && grossAmount >= 0 ? grossAmount : undefined,
      billingCycle,
      nextChargeDate: nextChargeDateStr,
      paymentMethod: sanitizePaymentMethod(sub.paymentMethod),
      status: sub.status || (sub.isTrial ? "trial" : "active"),
      trialEndDate: sub.trialEndDate || (sub.isTrial && sub.nextBillingDate ? sub.nextBillingDate : undefined),
      alertD3: Boolean(sub.alertD3),
      alertD1: Boolean(sub.alertD1),
      usage: usageStr,
    };
  });

  return {
    today,
    subscriptions: mappedSubscriptions,
  };
}

/**
 * Local storage conversation persistence (up to 30 messages per user id).
 */
const memoryStorage = new Map();
function getClientStorage() {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return {
    getItem: (k) => memoryStorage.get(k) ?? null,
    setItem: (k, v) => memoryStorage.set(k, String(v)),
    removeItem: (k) => memoryStorage.delete(k),
  };
}

export function getChatStorageKey(userId = null) {
  return userId ? `${CHAT_HISTORY_PREFIX}:${userId}` : `${CHAT_HISTORY_PREFIX}:guest`;
}

export function loadChatHistory(userId = null) {
  try {
    const raw = getClientStorage().getItem(getChatStorageKey(userId));
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(-MAX_PERSISTED_MESSAGES) : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(userId = null, messages = []) {
  try {
    const list = Array.isArray(messages) ? messages.slice(-MAX_PERSISTED_MESSAGES) : [];
    getClientStorage().setItem(getChatStorageKey(userId), JSON.stringify(list));
  } catch {
    // 스토리지 저장 실패 시 무시
  }
}

export function clearChatHistory(userId = null) {
  try {
    getClientStorage().removeItem(getChatStorageKey(userId));
  } catch {
    // 스토리지 삭제 실패 시 무시
  }
}

/**
 * Consent helpers for AI data sharing (per-user with guest fallback).
 */
export function readChatConsent(userId = null, storage = null) {
  return readUserConsent(userId, "chat", storage);
}

export function grantChatConsent(userId = null, storage = null) {
  setUserConsent(userId, "chat", true, {}, storage);
}

export function revokeChatConsent(userId = null, storage = null) {
  revokeUserConsent(userId, "chat", storage);
}


/**
 * Creates an incremental SSE parser for event-stream payloads.
 * Handles split chunk boundaries, CRLF / LF line endings.
 */
export function createSSEParser(onEvent) {
  let buffer = "";

  return function push(chunk = "") {
    buffer += chunk;
    const normalized = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const parts = normalized.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const block of parts) {
      if (!block.trim()) continue;
      let eventType = "message";
      const dataLines = [];

      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }

      const rawData = dataLines.join("\n");
      let parsedData = rawData;
      try {
        parsedData = JSON.parse(rawData);
      } catch {
        // JSON 파싱 실패 시 원본 문자열 유지
      }

      onEvent({ event: eventType, data: parsedData });
    }
  };
}

/**
 * Helper to get the current Supabase auth session token.
 */
export async function getAuthToken(sessionGetter = null) {
  if (import.meta.env?.DEV && import.meta.env?.VITE_SUBMATE_DEV_CHAT_BYPASS === "1") {
    return "dev-chat-bypass-token";
  }
  const getter = typeof sessionGetter === "function"
    ? sessionGetter
    : sessionGetter?.auth?.getSession
      ? () => sessionGetter.auth.getSession()
      : supabase?.auth
        ? () => supabase.auth.getSession()
        : null;
  if (!getter) return null;
  try {
    const res = await getter();
    return res?.data?.session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Prepares the last <=12 messages with role user/assistant and content <=1000 chars.
 */
export function formatMessagesForServer(messages = []) {
  const filtered = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({
      role: m.role,
      content: String(m.content ?? m.text ?? "").slice(0, 1000),
    }))
    .filter((m) => m.content.length > 0);

  return filtered.slice(-12);
}

/**
 * streamChat connects to POST /api/chat and streams SSE events.
 */
export async function streamChat({ messages = [], snapshot, context, signal, onEvent }) {
  const token = await getAuthToken();
  if (!token) {
    throw new ChatError("로그인이 필요합니다.", { code: "UNAUTHORIZED", status: 401 });
  }

  const endpoint = getApiEndpoint("/api/chat");
  const payload = {
    messages: formatMessagesForServer(messages),
    snapshot: snapshot || { today: getKstDateString(), subscriptions: [] },
  };
  if (context && (context.insightId || context.insightText)) {
    payload.context = context;
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) {
      throw err;
    }
    throw new ChatError("네트워크 연결을 확인해 주세요.", { code: "NETWORK_ERROR", status: 0 });
  }

  if (!response.ok) {
    let errorJson = null;
    try {
      errorJson = await response.json();
    } catch {
      // 응답 본문 파싱 실패 시 무시
    }

    const errorMessage = errorJson?.error || (response.status === 429 ? "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." : "서버 오류가 발생했습니다.");
    const code = errorJson?.code || (response.status === 429 ? "RATE_LIMITED" : response.status === 401 ? "UNAUTHORIZED" : response.status === 503 ? "SERVICE_UNAVAILABLE" : "SERVER_ERROR");

    throw new ChatError(errorMessage, {
      code,
      status: response.status,
      retryAfter: response.headers.get("Retry-After"),
    });
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream") && !response.body) {
    try {
      const data = await response.json();
      onEvent?.({ event: "done", data });
      return { ok: true };
    } catch {
      throw new ChatError("올바르지 않은 응답 형식입니다.", { code: "INVALID_RESPONSE", status: response.status });
    }
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const parseChunk = createSSEParser(onEvent);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      parseChunk(text);
    }
    parseChunk("");
    return { ok: true };
  } catch (err) {
    if (signal?.aborted) {
      throw err;
    }
    throw new ChatError("스트림 수신 중 오류가 발생했습니다.", { code: "STREAM_ERROR", status: 0 });
  }
}
