// 구독 데이터 동기화 알고리즘: 수정 시각(updated_at) 비교 병합, tombstone 오프라인 삭제, 실패 재시도 대기열

import { readStoredValue, writeStoredValue, storageKeys, STORAGE_SCHEMA_VERSION } from "./storage.js";

/**
 * 타임스탬프 파싱 (ISO 문자열 또는 밀리초 숫자)
 */
export function parseTimestamp(val) {
  if (!val) return 0;
  if (typeof val === "number") return val;
  const t = new Date(val).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * 두 구독의 최신 수정 시각을 비교하여 최신 버전(클라우드 vs 로컬)을 선택한다.
 * - server.updated_at 과 local.updatedAt(또는 createdAt) 비교
 * - 로컬 수정 시각이 서버보다 더 최신이면 로컬 변경사항(클라우드에 아직 안 올라간 상태)을 유지하고 반환
 * - 서버 수정 시각이 더 최신이거나 같으면 서버 데이터를 선택
 */
export function resolveSubscriptionMerge(localSub, cloudSub) {
  if (!localSub) return cloudSub;
  if (!cloudSub) return localSub;

  const localTime = parseTimestamp(localSub.updatedAt || localSub.createdAt);
  const cloudTime = parseTimestamp(cloudSub.updatedAt || cloudSub.createdAt);

  if (localTime > cloudTime) {
    // 로컬이 더 최신: 로컬 데이터를 유지하되 서버에만 있는 필드가 있다면 보존
    return { ...cloudSub, ...localSub };
  }
  // 클라우드가 더 최신이거나 같음:
  // 서버 행의 필드가 null/undefined/비어있고 로컬에 값이 존재하는 경우 로컬 값 보존 (손실 방지)
  const merged = { ...localSub, ...cloudSub };
  const preserveWhenCloudNull = ["memo", "alertDDay", "alertHour", "alertAmpm"];
  for (const key of preserveWhenCloudNull) {
    if (cloudSub[key] == null && localSub[key] != null) {
      merged[key] = localSub[key];
    }
  }
  return merged;
}

/**
 * 클라우드 목록과 로컬 목록, 톰스톤 목록을 결합하여 최신 병합 목록과 업로드 필요 대상을 도출한다.
 * @param {Array} localList
 * @param {Array} cloudList
 * @param {Object} tombstones { [subId]: deletedAtMs }
 * @returns {{ merged: Array, toUpload: Array, toDeleteFromCloud: Array }}
 */
export function mergeSubscriptions({ localList = [], cloudList = [], tombstones = {} } = {}) {
  const mergedMap = new Map();
  const toUpload = [];
  const toDeleteFromCloud = [];

  const localById = new Map();
  for (const sub of localList) {
    const id = sub.subscriptionId || sub.id;
    if (id) localById.set(id, sub);
  }

  const cloudById = new Map();
  for (const sub of cloudList) {
    const id = sub.subscriptionId || sub.id;
    if (id) cloudById.set(id, sub);
  }

  // 1. 클라우드 아이템 처리
  for (const [id, cloudSub] of cloudById.entries()) {
    const deletedAt = tombstones[id] ? parseTimestamp(tombstones[id]) : 0;
    const cloudTime = parseTimestamp(cloudSub.updatedAt || cloudSub.createdAt);

    if (deletedAt && deletedAt >= cloudTime) {
      // 로컬에서 오프라인 중 삭제된 항목이 클라우드에 아직 남아있음 -> 클라우드에서도 삭제 필요
      toDeleteFromCloud.push(id);
      continue;
    }

    const localSub = localById.get(id);
    if (!localSub) {
      // 로컬에 없음 (클라우드 신규)
      mergedMap.set(id, cloudSub);
    } else {
      // 양쪽 모두 존재: 시각 비교
      const resolved = resolveSubscriptionMerge(localSub, cloudSub);
      mergedMap.set(id, resolved);
      if (resolved === localSub || parseTimestamp(localSub.updatedAt) > cloudTime) {
        // 로컬이 더 최신이므로 클라우드에 업로드 필요
        toUpload.push(resolved);
      }
    }
  }

  // 2. 로컬에만 있는 아이템 (클라우드에 없음)
  for (const [id, localSub] of localById.entries()) {
    if (mergedMap.has(id)) continue;
    if (localSub.isDemo || String(id || "").startsWith("seed-") || String(localSub.subscriptionId || "").startsWith("seed-")) continue; // 데모 데이터는 클라우드 동기화 제외

    const deletedAt = tombstones[id] ? parseTimestamp(tombstones[id]) : 0;
    const localTime = parseTimestamp(localSub.updatedAt || localSub.createdAt);

    if (deletedAt && deletedAt >= localTime) {
      // 삭제된 항목
      continue;
    }

    // 클라우드에 신규 업로드 필요
    mergedMap.set(id, localSub);
    toUpload.push(localSub);
  }

  return {
    merged: Array.from(mergedMap.values()),
    toUpload,
    toDeleteFromCloud,
  };
}

/**
 * 톰스톤 읽기 및 쓰기
 */
export function getStoredTombstones() {
  return readStoredValue(storageKeys.syncTombstones, {});
}

export function recordTombstone(subscriptionId) {
  if (!subscriptionId) return;
  const current = getStoredTombstones();
  current[subscriptionId] = new Date().toISOString();
  writeStoredValue(storageKeys.syncTombstones, current);
}

export function clearTombstone(subscriptionId) {
  const current = getStoredTombstones();
  if (current[subscriptionId]) {
    delete current[subscriptionId];
    writeStoredValue(storageKeys.syncTombstones, current);
  }
}

/**
 * 재시도 대기열 (Retry Queue)
 * 항목 구조: { id: string, type: 'upsert'|'delete', data?: object, attempts: number, lastError?: string, timestamp: number }
 */
export function getRetryQueue() {
  const q = readStoredValue(storageKeys.syncRetryQueue, []);
  return Array.isArray(q) ? q : [];
}

export function enqueueRetry(item) {
  const q = getRetryQueue();
  const existingIdx = q.findIndex((i) => i.id === item.id && i.type === item.type);
  if (existingIdx >= 0) {
    q[existingIdx] = { ...q[existingIdx], ...item, attempts: q[existingIdx].attempts || 0 };
  } else {
    q.push({ ...item, attempts: 0, timestamp: Date.now() });
  }
  writeStoredValue(storageKeys.syncRetryQueue, q);
}

export function dequeueRetry(id, type) {
  const q = getRetryQueue();
  const filtered = q.filter((i) => !(i.id === id && i.type === type));
  writeStoredValue(storageKeys.syncRetryQueue, filtered);
}

/**
 * 로컬 저장소 스토리지 버전 및 마이그레이션
 * 기존 로컬 데이터는 손실 없이 v2 형식으로 자동 이전된다.
 */
export function ensureStorageMigration() {
  const version = readStoredValue(storageKeys.version, 1);
  if (version < 2) {
    // v1 -> v2 마이그레이션:
    // 기존 subscriptions 배열 읽기
    const oldSubs = readStoredValue(storageKeys.subscriptions, null);
    if (Array.isArray(oldSubs)) {
      // 1) 각 아이템에 isPinned, updatedAt 기본값 채우기
      const migratedSubs = oldSubs.map((sub) => ({
        ...sub,
        isPinned: Boolean(sub.isPinned || sub.pinned),
        updatedAt: sub.updatedAt || sub.createdAt || new Date().toISOString(),
      }));
      // 저장
      writeStoredValue(storageKeys.subscriptions, migratedSubs);
    }
    // 버전 키 업데이트
    writeStoredValue(storageKeys.version, STORAGE_SCHEMA_VERSION);
  }
}
