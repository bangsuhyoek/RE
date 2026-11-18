import { expectedChargeAfterCancel } from "./cancelVerification.js";

const KEY_PREFIX = "submate-mvp";
const PARTITION_ROOT = `${KEY_PREFIX}:owner`;
const PARTITION_MIGRATION_VERSION_KEY = `${KEY_PREFIX}:partition-migration-version`;
const PARTITION_MIGRATION_VERSION = 1;
export const GUEST_PARTITION = "guest";

let activeOwnerPartition = GUEST_PARTITION;
let partitionMigrationChecked = false;
let partitionMigrationStorage = null;

export const STORAGE_SCHEMA_VERSION = 2;

export const storageKeys = {
  version: `${KEY_PREFIX}:schema-version`,
  subscriptions: `${KEY_PREFIX}:subscriptions`,
  ownerUserId: `${KEY_PREFIX}:owner-user-id`,
  profile: `${KEY_PREFIX}:profile`,
  users: `${KEY_PREFIX}:users`,
  onboardingComplete: `${KEY_PREFIX}:onboarding-complete`,
  savedAmount: `${KEY_PREFIX}:saved-amount`,
  agentApprovals: `${KEY_PREFIX}:agent-approvals`,
  agentMandates: `${KEY_PREFIX}:agent-mandates`,
  cancelHistory: `${KEY_PREFIX}:cancel-history`,
  evidenceCases: `${KEY_PREFIX}:evidence-cases`,
  evidenceConsent: `${KEY_PREFIX}:evidence-consent`,
  cancelReminders: `${KEY_PREFIX}:cancel-reminders`,
  usageAnswers: `${KEY_PREFIX}:usage-answers`,
  careAcks: `${KEY_PREFIX}:care-acks`,
  rotationPlan: `${KEY_PREFIX}:rotation-plan`,
  syncTombstones: `${KEY_PREFIX}:sync-tombstones`,
  syncRetryQueue: `${KEY_PREFIX}:sync-retry-queue`,
  chatHistory: `${KEY_PREFIX}:chat-history`,
  notifications: `${KEY_PREFIX}:notifications`,
  notificationSettings: `${KEY_PREFIX}:notification-settings`,
  agentInsightsDismissed: `${KEY_PREFIX}:agent-insights:dismissed`,
  agentInsightsSnoozed: `${KEY_PREFIX}:agent-insights:snoozed`,
  agentInsightsLastNotified: `${KEY_PREFIX}:agent-insights:last-notified-date`,
  difficultyConsent: `${KEY_PREFIX}:difficulty-consent`,
  difficultySubmitted: `${KEY_PREFIX}:difficulty-submitted`,
  cancelProofWipePending: `${KEY_PREFIX}:cancel-proof-wipe-pending`,
};

// owner 파티션 안에 저장되는 사용자 데이터. 기기 설정·버전·계정 목록은 제외한다.
const PARTITIONED_STORAGE_KEYS = new Set([
  storageKeys.subscriptions,
  storageKeys.profile,
  storageKeys.onboardingComplete,
  storageKeys.savedAmount,
  storageKeys.agentApprovals,
  storageKeys.agentMandates,
  storageKeys.cancelHistory,
  storageKeys.evidenceCases,
  storageKeys.evidenceConsent,
  storageKeys.cancelReminders,
  storageKeys.usageAnswers,
  storageKeys.careAcks,
  storageKeys.rotationPlan,
  storageKeys.syncTombstones,
  storageKeys.syncRetryQueue,
  storageKeys.chatHistory,
  storageKeys.notifications,
  storageKeys.agentInsightsDismissed,
  storageKeys.agentInsightsSnoozed,
  storageKeys.agentInsightsLastNotified,
  storageKeys.difficultyConsent,
  storageKeys.difficultySubmitted,
]);

// 최초 로그인에서 guest에서 사용자 파티션으로 옮기는 데이터. 프로필·채팅은 HEAD처럼 guest에 남긴다.
const FIRST_LOGIN_MIGRATION_KEYS = [
  storageKeys.subscriptions,
  storageKeys.onboardingComplete,
  storageKeys.savedAmount,
  storageKeys.agentApprovals,
  storageKeys.agentMandates,
  storageKeys.cancelHistory,
  storageKeys.evidenceCases,
  storageKeys.evidenceConsent,
  storageKeys.cancelReminders,
  storageKeys.usageAnswers,
  storageKeys.careAcks,
  storageKeys.rotationPlan,
  storageKeys.syncTombstones,
  storageKeys.syncRetryQueue,
  storageKeys.notifications,
  storageKeys.agentInsightsLastNotified,
  storageKeys.difficultyConsent,
  storageKeys.difficultySubmitted,
];

export const ownerPartitionId = (userId) => userId ? `user:${userId}` : GUEST_PARTITION;

const normalizePartitionId = (value) => {
  if (!value) return GUEST_PARTITION;
  if (value === GUEST_PARTITION || String(value).startsWith("user:")) return String(value);
  return ownerPartitionId(String(value));
};

const rawStorage = () => {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
};

const rawGet = (key) => {
  const storage = rawStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const rawSet = (key, value) => {
  const storage = rawStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const rawRemove = (key) => {
  const storage = rawStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
};

const partitionPrefix = (partitionId) => `${PARTITION_ROOT}:${partitionId}:`;
const partitionMarkerKey = (partitionId) => `${partitionPrefix(partitionId)}__partition-ready`;
const guestMigrationMarkerKey = (partitionId) => `${partitionPrefix(partitionId)}__guest-migration`;
const logicalKey = (key) =>
  String(key).startsWith(`${KEY_PREFIX}:`) ? String(key).slice(KEY_PREFIX.length + 1) : String(key);

export const getPartitionStorageKey = (key, partitionId = activeOwnerPartition) => {
  if (!PARTITIONED_STORAGE_KEYS.has(key)) return key;
  return `${partitionPrefix(normalizePartitionId(partitionId))}${logicalKey(key)}`;
};

export const getActiveOwnerPartition = () => activeOwnerPartition;

export const setActiveOwnerPartition = (value) => {
  ensureOwnerPartitionMigration();
  activeOwnerPartition = normalizePartitionId(value);
  return activeOwnerPartition;
};

export const hasOwnerPartition = (partitionId) => {
  const id = normalizePartitionId(partitionId);
  return rawGet(partitionMarkerKey(id)) !== null;
};

const markOwnerPartition = (partitionId) => {
  const id = normalizePartitionId(partitionId);
  rawSet(partitionMarkerKey(id), "1");
};

export const hasPendingGuestMigration = (userId) => {
  if (!userId) return false;
  return rawGet(guestMigrationMarkerKey(ownerPartitionId(userId))) === "started";
};

const moveLegacyChatHistory = (targetOwnerValue) => {
  const storage = rawStorage();
  if (!storage) return;
  const prefix = "submate:chat-history:";
  try {
    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) {
      const suffix = key.slice(prefix.length);
      const target = suffix === GUEST_PARTITION
        ? GUEST_PARTITION
        : normalizePartitionId(suffix);
      const value = storage.getItem(key);
      const targetKey = getPartitionStorageKey(storageKeys.chatHistory, target);
      if (value !== null && storage.getItem(targetKey) === null) storage.setItem(targetKey, value);
      storage.removeItem(key);
      markOwnerPartition(target);
    }
  } catch {
    // ignore
  }
  if (targetOwnerValue) markOwnerPartition(normalizePartitionId(targetOwnerValue));
};

const moveLegacyConsents = () => {
  const storage = rawStorage();
  if (!storage) return;
  const prefix = "submate.consent.v2:";
  try {
    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) {
      const rest = key.slice(prefix.length);
      const split = rest.lastIndexOf(":");
      if (split <= 0) continue;
      const ownerValue = rest.slice(0, split);
      const kind = rest.slice(split + 1);
      if (ownerValue === GUEST_PARTITION || ownerValue.startsWith("user:")) continue;
      const partition = normalizePartitionId(ownerValue);
      const targetKey = `${prefix}${partition}:${kind}`;
      const value = storage.getItem(key);
      if (value !== null && storage.getItem(targetKey) === null) storage.setItem(targetKey, value);
      // 다른 동의 소비 모듈과의 호환을 위해 기존 owner 키도 남긴다. wipe 시 함께 제거된다.
      markOwnerPartition(partition);
    }
  } catch {
    // ignore
  }
};

export function ensureOwnerPartitionMigration() {
  const currentStorage = rawStorage();
  if (currentStorage !== partitionMigrationStorage) {
    partitionMigrationStorage = currentStorage;
    partitionMigrationChecked = false;
  }
  if (partitionMigrationChecked) return;
  const storage = currentStorage;
  if (!storage) return;
  partitionMigrationChecked = true;

  try {
    const version = Number(rawGet(PARTITION_MIGRATION_VERSION_KEY) || 0);
    if (version >= PARTITION_MIGRATION_VERSION) return;
    const ownerUserId = rawGet(storageKeys.ownerUserId);
    const parsedOwner = ownerUserId ? JSON.parse(ownerUserId) : null;
    const targetPartition = parsedOwner ? ownerPartitionId(parsedOwner) : GUEST_PARTITION;

    for (const key of PARTITIONED_STORAGE_KEYS) {
      const value = storage.getItem(key);
      if (value === null) continue;
      const targetKey = getPartitionStorageKey(key, targetPartition);
      if (storage.getItem(targetKey) === null) storage.setItem(targetKey, value);
      storage.removeItem(key);
    }
    if (parsedOwner) markOwnerPartition(targetPartition);

    moveLegacyChatHistory(targetPartition);
    moveLegacyConsents();
    rawSet(PARTITION_MIGRATION_VERSION_KEY, String(PARTITION_MIGRATION_VERSION));
  } catch {
    partitionMigrationChecked = false;
  }
}

export const readPartitionValue = (key, partitionId, fallback) => {
  ensureOwnerPartitionMigration();
  const raw = rawGet(getPartitionStorageKey(key, partitionId));
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const writePartitionValue = (key, partitionId, value, { markReady = true } = {}) => {
  ensureOwnerPartitionMigration();
  const id = normalizePartitionId(partitionId);
  const targetKey = getPartitionStorageKey(key, id);
  if (!rawSet(targetKey, JSON.stringify(value))) return false;
  if (markReady && PARTITIONED_STORAGE_KEYS.has(key) && key !== storageKeys.profile) {
    markOwnerPartition(id);
  }
  return true;
};

export const clearPartitionValue = (key, partitionId) => {
  ensureOwnerPartitionMigration();
  rawRemove(getPartitionStorageKey(key, partitionId));
};

export const clearOwnerPartition = (partitionId) => {
  ensureOwnerPartitionMigration();
  const id = normalizePartitionId(partitionId);
  const storage = rawStorage();
  if (!storage) return;
  const prefix = partitionPrefix(id);
  const keys = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (
        key?.startsWith(prefix) ||
        key?.startsWith(`submate.consent.v2:${id}:`)
      ) {
        keys.push(key);
      }
    }
  } catch {
    // ignore
  }
  keys.forEach((key) => storage.removeItem(key));
};

const mergeUniqueArray = (target, guest, keyFor) => {
  const merged = Array.isArray(target) ? [...target] : [];
  const existing = new Set(merged.map((item) => keyFor(item)));
  for (const item of Array.isArray(guest) ? guest : []) {
    const key = keyFor(item);
    if (!existing.has(key)) {
      existing.add(key);
      merged.push(item);
    }
  }
  return merged;
};

const mergeGuestMigrationValues = (key, target, guest, userId) => {
  if (target === undefined) return guest;
  if (key === storageKeys.savedAmount && typeof target === "number" && typeof guest === "number") {
    return target + guest;
  }
  if (key === storageKeys.syncRetryQueue && Array.isArray(target) && Array.isArray(guest)) {
    return mergeUniqueArray(
      target,
      guest.map((item) => ({ ...item, ownerUserId: userId })),
      (item) => `${item.ownerUserId || "guest"}:${item.type}:${item.id}`
    );
  }
  if (Array.isArray(target) && Array.isArray(guest)) {
    return mergeUniqueArray(
      target,
      guest,
      (item) => String(item?.subscriptionId || item?.id || JSON.stringify(item))
    );
  }
  if (
    target && guest &&
    typeof target === "object" &&
    typeof guest === "object" &&
    !Array.isArray(target) &&
    !Array.isArray(guest)
  ) {
    return { ...guest, ...target };
  }
  return target;
};

export const migrateGuestDataToOwner = (userId) => {
  ensureOwnerPartitionMigration();
  const target = ownerPartitionId(userId);
  const markerKey = guestMigrationMarkerKey(target);
  const migrationState = rawGet(markerKey);
  if (migrationState === "complete") return true;
  if (!migrationState && rawGet(partitionMarkerKey(target)) !== null) {
    rawSet(markerKey, "complete");
    return true;
  }
  rawSet(markerKey, "started");
  for (const key of FIRST_LOGIN_MIGRATION_KEYS) {
    const value = readPartitionValue(key, GUEST_PARTITION, undefined);
    if (value === undefined) continue;
    let nextValue = value;
    if (key === storageKeys.syncRetryQueue && Array.isArray(value)) {
      nextValue = value.map((item) => ({ ...item, ownerUserId: userId }));
    }
    nextValue = mergeGuestMigrationValues(
      key,
      readPartitionValue(key, target, undefined),
      nextValue,
      userId
    );
    const written = writePartitionValue(key, target, nextValue, { markReady: false });
    if (!written) return false;
    clearPartitionValue(key, GUEST_PARTITION);
  }
  markOwnerPartition(target);
  rawSet(markerKey, "complete");
  return true;
};

export const readStoredValue = (key, fallback) => {
  try {
    ensureOwnerPartitionMigration();
    const targetKey = PARTITIONED_STORAGE_KEYS.has(key)
      ? getPartitionStorageKey(key, activeOwnerPartition)
      : key;
    const raw = window.localStorage.getItem(targetKey);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const writeStoredValue = (key, value) => {
  try {
    ensureOwnerPartitionMigration();
    if (typeof window === "undefined" || !window.localStorage) return false;
    const partitioned = PARTITIONED_STORAGE_KEYS.has(key);
    const targetKey = partitioned
      ? getPartitionStorageKey(key, activeOwnerPartition)
      : key;
    window.localStorage.setItem(targetKey, JSON.stringify(value));
    if (partitioned && key !== storageKeys.profile) {
      markOwnerPartition(activeOwnerPartition);
    }
    return true;
  } catch (err) {
    const isQuotaExceeded =
      err &&
      (err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        err.code === 22 ||
        err.code === 1014);

    if (isQuotaExceeded) {
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        try {
          window.dispatchEvent(
            new CustomEvent("submate-storage-quota-exceeded", {
              detail: { key, error: err },
            })
          );
        } catch {
          // ignore
        }
      }
      console.warn(`[storage] 저장 공간이 부족합니다. (key: ${key})`);
    } else {
      console.warn(`[storage] 저장 실패 (key: ${key}):`, err);
    }
    return false;
  }
};

export const clearStoredValue = (key) => {
  ensureOwnerPartitionMigration();
  const targetKey = PARTITIONED_STORAGE_KEYS.has(key)
    ? getPartitionStorageKey(key, activeOwnerPartition)
    : key;
  window.localStorage.removeItem(targetKey);
};

/**
 * 로그아웃 또는 다른 계정으로 전환할 때만 호출한다.
 * subscriptions·절약액·해지/사용 기록·에이전트 승인·알림 기록처럼 사용자에게 속한 값만 지우고,
 * 스키마 버전, 알림 설정, 로컬 계정 목록 같은 기기 단위 값은 유지한다.
 */
export const clearUserScopedData = (ownerUserId) => {
  if (!ownerUserId || !rawStorage()) return;
  clearOwnerPartition(ownerPartitionId(ownerUserId));
  // 파티션 도입 전 owner 접미부 키도 함께 정리한다.
  rawRemove(`submate:chat-history:${ownerUserId}`);
  rawRemove("submate.chatConsent.v1");
  rawRemove("submate.cancelAiConsent.v1");
  // agentInsights 모듈은 아직 직접 키를 사용하므로 소유자 wipe에서 함께 제거한다.
  rawRemove(storageKeys.agentInsightsDismissed);
  rawRemove(storageKeys.agentInsightsSnoozed);
  const storage = rawStorage();
  try {
    const prefix = `submate.consent.v2:${ownerUserId}:`;
    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
    const storedOwnerRaw = storage.getItem(storageKeys.ownerUserId);
    if (storedOwnerRaw && JSON.parse(storedOwnerRaw) === ownerUserId) {
      storage.removeItem(storageKeys.ownerUserId);
    }
  } catch {
    // ignore
  }
};

/** 재시도 큐에서 현재 계정 소유 항목만 고른다. 소유자가 없는 레거시 항목은 안전하게 제외한다. */
export const filterRetryQueueForUser = (queue, ownerUserId) => {
  if (!ownerUserId) return [];
  return (Array.isArray(queue) ? queue : []).filter(
    (item) => item && item.ownerUserId === ownerUserId
  );
};

export const shouldClearUserDataOnAccountSwitch = (previousScope, nextScope) =>
  String(previousScope || "").startsWith("user:") &&
  String(nextScope || "").startsWith("user:") &&
  previousScope !== nextScope;

export const shouldWipeLocalDataForIncomingUser = (ownerUserId, currentUserId) =>
  Boolean(ownerUserId && currentUserId && ownerUserId !== currentUserId);

const sameRetryItem = (item, candidate, ownerUserId) =>
  item?.ownerUserId === ownerUserId &&
  item?.id === candidate.id &&
  item?.type === candidate.type;

/** 다른 사용자의 대기 항목은 그대로 두고 현재 사용자의 항목만 추가·갱신한다. */
export const upsertRetryQueueForUser = (queue, item, ownerUserId) => {
  const next = Array.isArray(queue) ? [...queue] : [];
  if (!ownerUserId || !item) return next;
  const index = next.findIndex((candidate) => sameRetryItem(candidate, item, ownerUserId));
  const ownedItem = { ...item, ownerUserId };
  if (index >= 0) {
    next[index] = { ...next[index], ...ownedItem };
  } else {
    next.push({ attempts: 0, timestamp: Date.now(), ...ownedItem });
  }
  return next;
};

/** 다른 사용자의 대기 항목은 그대로 두고 현재 사용자의 항목만 제거한다. */
export const removeRetryQueueItemForUser = (queue, item, ownerUserId) => {
  if (!ownerUserId || !item) return Array.isArray(queue) ? [...queue] : [];
  return (Array.isArray(queue) ? queue : []).filter(
    (candidate) => !sameRetryItem(candidate, item, ownerUserId)
  );
};

/**
 * 로그아웃 부수효과 순서. 원격 로그인은 signOut 성공 뒤에만 원격 사용자 데이터를 지우고,
 * 게스트·로컬 계정은 기기 데이터 정리 없이 현재 세션만 닫는다.
 */
export async function runLogoutFlow({
  isRemoteUser,
  signOut,
  getSession,
  clearRemoteData,
  clearLocalSession,
}) {
  if (isRemoteUser) {
    let signOutError;
    try {
      const result = await signOut();
      signOutError = result?.error || null;
    } catch (error) {
      signOutError = error;
    }

    if (typeof getSession === "function") {
      let session;
      try {
        session = await getSession();
      } catch (error) {
        return { ok: false, error };
      }
      if (session) return { ok: false, error: signOutError || new Error("Session still active") };
    } else if (signOutError) {
      return { ok: false, error: signOutError };
    }

    try {
      await clearRemoteData();
      return { ok: true, remote: true };
    } catch (error) {
      return { ok: false, error };
    }
  }
  await clearLocalSession();
  return { ok: true, remote: false };
}

export const removeDemoSubscriptions = (items) =>
  items.filter((subscription) => !String(subscription.subscriptionId || "").startsWith("seed-"));

const MAX_PERSISTED_CHAT_MESSAGES = 30;

export const loadChatHistory = (partitionId = activeOwnerPartition) => {
  const list = readPartitionValue(storageKeys.chatHistory, partitionId, []);
  return Array.isArray(list) ? list.slice(-MAX_PERSISTED_CHAT_MESSAGES) : [];
};

export const saveChatHistory = (messages = [], partitionId = activeOwnerPartition) => {
  const list = Array.isArray(messages)
    ? messages.slice(-MAX_PERSISTED_CHAT_MESSAGES)
    : [];
  return writePartitionValue(storageKeys.chatHistory, partitionId, list);
};

export const clearChatHistory = (partitionId = activeOwnerPartition) => {
  clearPartitionValue(storageKeys.chatHistory, partitionId);
};

const MAX_CANCEL_HISTORY = 50;
const MAX_EVIDENCE_CASES = 50;

export const readCancelHistory = () => {
  const list = readStoredValue(storageKeys.cancelHistory, []);
  return Array.isArray(list) ? list : [];
};

/** 해지 완료로 처리한 구독을 남긴다. 해지 뒤에 같은 서비스 결제가 감지되면 증빙으로 쓴다. 카드번호는 끝 4자리만 남긴다. */
export const appendCancelRecord = (subscription, cancelledAt = new Date()) => {
  if (!subscription) return;
  const last4 = String(subscription.paymentMethod || "").match(/\d{4}/g)?.pop() || "";
  const issuer = String(subscription.paymentMethod || "").replace(/[-0-9•*]+/g, " ").replace(/\s+/g, " ").trim();
  const record = {
    id: subscription.id,
    serviceId: subscription.serviceId || subscription.id,
    subscriptionId: subscription.subscriptionId,
    name: subscription.name,
    plan: subscription.plan || "",
    amount: Number(subscription.grossAmount ?? subscription.amount) || 0,
    billingCycle: subscription.billingCycle || "매월",
    paymentMethod: [issuer, last4].filter(Boolean).join(" "),
    supportUrl: subscription.supportUrl || null,
    cancelledAt: cancelledAt.toISOString(),
    // 해지 확인 루프: 다음 결제일까지 결제가 없는지 지켜본다.
    expectedChargeOn: expectedChargeAfterCancel(subscription, cancelledAt)?.toISOString() || null,
    verification: expectedChargeAfterCancel(subscription, cancelledAt) ? "watching" : null,
  };
  const svcKey = record.serviceId || record.id;
  const subKey = record.subscriptionId;
  const existing = readCancelHistory().filter((item) => {
    if (item.verification !== "watching") return true;
    if (subKey && item.subscriptionId === subKey) return false;
    if (svcKey && (item.serviceId === svcKey || item.id === svcKey)) return false;
    return true;
  });
  writeStoredValue(storageKeys.cancelHistory, [record, ...existing].slice(0, MAX_CANCEL_HISTORY));
};

export const writeCancelHistory = (list) => {
  writeStoredValue(storageKeys.cancelHistory, Array.isArray(list) ? list.slice(0, MAX_CANCEL_HISTORY) : []);
};

export const readEvidenceCases = () => {
  const cases = readStoredValue(storageKeys.evidenceCases, {});
  return cases && typeof cases === "object" && !Array.isArray(cases) ? cases : {};
};

export const saveEvidenceCase = (evidenceCase) => {
  if (!evidenceCase?.id) return;
  const cases = { ...readEvidenceCases(), [evidenceCase.id]: evidenceCase };
  const trimmed = Object.values(cases)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, MAX_EVIDENCE_CASES);
  writeStoredValue(storageKeys.evidenceCases, Object.fromEntries(trimmed.map((item) => [item.id, item])));
};

/**
 * 로컬 계정 데이터 정리 및 게스트 전환 마이그레이션.
 * 기기 내 아이디·비밀번호 로그인 및 하드코딩 테스트 계정 제거:
 * 저장된 로컬 계정의 비밀번호 필드를 삭제하고, 기존 구독 데이터는 게스트 데이터로 보존(손실 금지)한다.
 */
export const migrateLocalUsersToGuest = () => {
  const users = readStoredValue(storageKeys.users, []);
  if (Array.isArray(users) && users.length > 0) {
    let changed = false;
    const sanitized = users.map((u) => {
      if (u.password !== undefined) {
        changed = true;
        const copy = { ...u };
        delete copy.password;
        return copy;
      }
      return u;
    });
    if (changed) {
      writeStoredValue(storageKeys.users, sanitized);
    }
  }

  // 만약 현재 프로필이 로컬 아이디 로그인(provider === "꾸독" or !isGoogle && !guest)이었다면
  // 구독 데이터 손실 없이 게스트 프로필로 승계/보존
  const profile = readStoredValue(storageKeys.profile, null);
  if (profile && profile.provider === "꾸독" && !profile.user_id) {
    writeStoredValue(storageKeys.profile, {
      ...profile,
      provider: "Guest",
      guest: true,
      nickname: profile.nickname || "게스트",
    });
  }
};

