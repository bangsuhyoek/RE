// src/lib/consentStore.js
/**
 * 사용자 ID별 동의 관리 모듈 (비로그인은 'guest')
 * 동의 시각(agreedAt)과 방침 버전(policyVersion)을 함께 저장한다.
 */

export const CURRENT_POLICY_VERSION = "2026-10-19";

const LEGACY_CHAT_CONSENT_KEY = "submate.chatConsent.v1";
const LEGACY_CANCEL_CONSENT_KEY = "submate.cancelAiConsent.v1";

const USER_CONSENT_PREFIX = "submate.consent.v2";

function getStorage(customStorage = null) {
  if (customStorage) return customStorage;
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export function normalizeUserId(userId) {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return "guest";
  }
  return userId.trim();
}

function getUserConsentKey(userId, kind) {
  const normUser = normalizeUserId(userId);
  return `${USER_CONSENT_PREFIX}:${normUser}:${kind}`;
}

/**
 * 1회 레거시 기기 단위 동의 마이그레이션.
 * 기존 기기 단위 동의(CHAT_CONSENT_KEY, CANCEL_AI_CONSENT_KEY)가 있으면
 * 현재 사용자(또는 guest)에게 이전하고 레거시 키를 삭제한다.
 */
export function migrateLegacyConsentIfNeeded(userId, storage = null) {
  const store = getStorage(storage);
  if (!store) return;
  const normUser = normalizeUserId(userId);

  // 1. Chat Consent
  try {
    const legacyChat = store.getItem(LEGACY_CHAT_CONSENT_KEY);
    if (legacyChat !== null) {
      const userKey = getUserConsentKey(normUser, "chat");
      if (!store.getItem(userKey)) {
        if (legacyChat === "granted") {
          saveConsentRecord(normUser, "chat", true, { version: CURRENT_POLICY_VERSION }, store);
        } else {
          saveConsentRecord(normUser, "chat", false, { version: CURRENT_POLICY_VERSION }, store);
        }
      }
      if (typeof store.removeItem === "function") {
        store.removeItem(LEGACY_CHAT_CONSENT_KEY);
      }
    }
  } catch (err) {
    console.warn("Legacy chat consent migration failed:", err);
  }

  // 2. Cancel AI Consent
  try {
    const legacyCancel = store.getItem(LEGACY_CANCEL_CONSENT_KEY);
    if (legacyCancel !== null) {
      const userKey = getUserConsentKey(normUser, "cancel");
      if (!store.getItem(userKey)) {
        if (legacyCancel === "granted" || legacyCancel === "true") {
          saveConsentRecord(normUser, "cancel", true, { version: CURRENT_POLICY_VERSION }, store);
        } else {
          saveConsentRecord(normUser, "cancel", false, { version: CURRENT_POLICY_VERSION }, store);
        }
      }
      if (typeof store.removeItem === "function") {
        store.removeItem(LEGACY_CANCEL_CONSENT_KEY);
      }
    }
  } catch (err) {
    console.warn("Legacy cancel consent migration failed:", err);
  }
}


function saveConsentRecord(userId, kind, granted, { version = CURRENT_POLICY_VERSION, at = new Date().toISOString() } = {}, storage = null) {
  const store = getStorage(storage);
  if (!store) return;
  const key = getUserConsentKey(userId, kind);
  if (granted) {
    const record = {
      granted: true,
      agreedAt: at,
      policyVersion: version,
    };
    store.setItem(key, JSON.stringify(record));
  } else {
    const record = {
      granted: false,
      revokedAt: at,
      policyVersion: version,
    };
    store.setItem(key, JSON.stringify(record));
  }
}

export function readUserConsent(userId, kind, storage = null) {
  const store = getStorage(storage);
  if (!store) return false;
  migrateLegacyConsentIfNeeded(userId, store);
  const key = getUserConsentKey(userId, kind);
  try {
    const raw = store.getItem(key);
    if (!raw) return false;
    const record = JSON.parse(raw);
    return Boolean(record && record.granted);
  } catch {
    return false;
  }
}

export function getUserConsentRecord(userId, kind, storage = null) {
  const store = getStorage(storage);
  if (!store) return null;
  migrateLegacyConsentIfNeeded(userId, store);
  const key = getUserConsentKey(userId, kind);
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUserConsent(userId, kind, granted, { version = CURRENT_POLICY_VERSION } = {}, storage = null) {
  const store = getStorage(storage);
  if (!store) return Boolean(granted);
  migrateLegacyConsentIfNeeded(userId, store);
  saveConsentRecord(userId, kind, Boolean(granted), { version }, store);
  // 레거시 키 호환성 지원: 구버전 테스트/호환성을 위해 레거시 키에도 동기화
  try {
    if (kind === "cancel") {
      store.setItem(LEGACY_CANCEL_CONSENT_KEY, granted ? "granted" : "declined");
    } else if (kind === "chat") {
      store.setItem(LEGACY_CHAT_CONSENT_KEY, granted ? "granted" : "declined");
    }
  } catch {
    // 레거시 키 동기화 실패 시 무시
  }
  return Boolean(granted);
}


export function revokeUserConsent(userId, kind, storage = null) {
  const store = getStorage(storage);
  if (!store) return;
  migrateLegacyConsentIfNeeded(userId, store);
  saveConsentRecord(userId, kind, false, { version: CURRENT_POLICY_VERSION }, store);
}

/**
 * 로그아웃 시 동의 정리:
 * 게스트 상태가 아닌 특정 사용자의 동의는 스토리지에 남아있더라도
 * 로그아웃 시 세션 정리 또는 active consent 캐시가 다른 계정으로 넘어가지 않도록
 * 기기 세션 스토리지 및 레거시 키 등을 청소한다.
 */
export function clearConsentOnSignOut(storage = null) {
  const store = getStorage(storage);
  if (!store) return;
  try {
    store.removeItem(LEGACY_CHAT_CONSENT_KEY);
    store.removeItem(LEGACY_CANCEL_CONSENT_KEY);
  } catch {
    // 로그아웃 키 정리 실패 시 무시
  }
}
