import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createMockSubscriptions } from "../data/mockSubscriptions";
import { getCachedCatalog } from "../data/catalogLoader";
import { getMonthKey, isPastDueThisCycle } from "../lib/dates";
import {
  appendCancelRecord,
  clearUserScopedData,
  filterRetryQueueForUser,
  GUEST_PARTITION,
  getActiveOwnerPartition,
  hasPendingGuestMigration,
  hasOwnerPartition,
  migrateGuestDataToOwner,
  ownerPartitionId,
  upsertRetryQueueForUser,
  removeRetryQueueItemForUser,
  shouldWipeLocalDataForIncomingUser,
  setActiveOwnerPartition,
  writePartitionValue,
  readStoredValue,
  removeDemoSubscriptions,
  storageKeys,
  writeStoredValue,
} from "../lib/storage";
import { readHash } from "./useNavigation";
import { supabase, mapDbToSubscription, upsertDbSubscription, deleteDbSubscription, fetchUserSubscriptions } from "../lib/supabase";
import { cancelScheduledUserNotifications } from "../lib/notifications";
import { clearAllCancelProofs } from "../lib/cancelProof";
import {
  findSubscriptionTarget,
  isDuplicateSubscription,
  matchesSubscriptionTarget,
} from "../lib/subscriptionAdd";
import { createSubscriptionId } from "../lib/ids";
import {
  ensureStorageMigration,
  mergeSubscriptions,
  recordTombstone,
  getRetryQueue,
  getStoredTombstones,
  resolveRetryUpsert,
} from "../lib/subscriptionSync";
import { toMonthlyAmount } from "../lib/subscriptionMath";

const autoMigrationAttemptedUsers = new Set();

export const createSubscription = (service) => ({
  ...service,
  subscriptionId: createSubscriptionId(`onboard-${service.id}`),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  billingCycle: service.billingCycle || "매월",
  status: service.isTrial ? "trial" : "active",
  alertD3: true,
  alertD1: false,
  renewalPending: false,
});

export function useSubscriptions({ currentRoute = "home", catalog = [], onAccountScopeChange = null } = {}) {
  const catalogRef = useRef(catalog);
  useEffect(() => {
    catalogRef.current = catalog;
  }, [catalog]);
  // 스토리지 스키마 마이그레이션 v1 -> v2 수행
  useEffect(() => {
    ensureStorageMigration();
  }, []);

  const storedProfile = useMemo(() => {
    const raw = typeof window !== "undefined" ? readStoredValue(storageKeys.profile, null) : null;
    return raw;
  }, []);

  const initialHash = useMemo(() => readHash(), []);
  const isGuestParam = !storedProfile && initialHash.params?.get("guest") === "1";
  const effectiveProfile = storedProfile || (isGuestParam ? { nickname: "체험 사용자", provider: "Guest", guest: true, notificationsAllowed: true } : null);

  const [profile, setProfile] = useState(effectiveProfile);
  const [subscriptions, setSubscriptions] = useState(() => {
    ensureStorageMigration();
    const saved = readStoredValue(storageKeys.subscriptions, null);
    if (Array.isArray(saved) && saved.length > 0) {
      return effectiveProfile?.guest ? saved : removeDemoSubscriptions(saved);
    }
    return effectiveProfile?.guest || isGuestParam ? createMockSubscriptions() : [];
  });
  const subscriptionsRef = useRef(subscriptions);
  subscriptionsRef.current = subscriptions;
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const [onboardingComplete, setOnboardingComplete] = useState(() => readStoredValue(storageKeys.onboardingComplete, false));
  const [savedAmount, setSavedAmount] = useState(() => readStoredValue(storageKeys.savedAmount, 0));
  const [selectedOnboarding, setSelectedOnboarding] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [renewalTarget, setRenewalTarget] = useState(null);
  const [completedCancelId, setCompletedCancelId] = useState(null);
  const initialRetryQueue = filterRetryQueueForUser(getRetryQueue(), profile?.user_id || null);
  const [pendingRetryCount, setPendingRetryCount] = useState(() => initialRetryQueue.length);
  const [syncState, setSyncState] = useState(() => (initialRetryQueue.length > 0 ? "error" : "idle"));
  const [migrationError, setMigrationError] = useState(() =>
    Boolean(profile?.user_id && hasPendingGuestMigration(profile.user_id))
  );
  const previousAccountIdRef = useRef(profile?.user_id || null);

  useEffect(() => {
    const currentUserId = profile?.user_id || null;
    if (previousAccountIdRef.current && !currentUserId) {
      setSavedAmount(0);
      setOnboardingComplete(false);
    }
    previousAccountIdRef.current = currentUserId;
  }, [profile?.user_id]);

  const refreshSyncQueueState = useCallback(() => {
    const queue = filterRetryQueueForUser(getRetryQueue(), profileRef.current?.user_id || null);
    setPendingRetryCount(queue.length);
    setSyncState(queue.length > 0 ? "error" : "idle");
  }, []);

  const safeEnqueueRetryRef = useRef();
  safeEnqueueRetryRef.current = (item, ownerUserId = profileRef.current?.user_id || null) => {
    if (!ownerUserId) return;
    writeStoredValue(
      storageKeys.syncRetryQueue,
      upsertRetryQueueForUser(getRetryQueue(), item, ownerUserId)
    );
    refreshSyncQueueState();
  };
  const safeEnqueueRetry = useCallback((item) => {
    safeEnqueueRetryRef.current?.(item);
  }, []);

  // Storage sync
  useEffect(() => {
    if (profile) {
      const partition = profile.user_id ? ownerPartitionId(profile.user_id) : GUEST_PARTITION;
      writePartitionValue(storageKeys.profile, partition, profile);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      writeStoredValue(storageKeys.subscriptions, subscriptions);
    }
  }, [subscriptions, profile]);

  useEffect(() => {
    if (profile) {
      writeStoredValue(storageKeys.onboardingComplete, onboardingComplete);
    }
  }, [onboardingComplete, profile]);

  useEffect(() => {
    if (profile) {
      writeStoredValue(storageKeys.savedAmount, savedAmount);
    }
  }, [savedAmount, profile]);

  // 재시도 큐 처리 함수 (앱 시작 및 온라인 복귀 시 실행)
  const processRetryQueue = useCallback(async (userId) => {
    if (!userId) return;
    const storedQueue = getRetryQueue();
    const queueWithOwners = storedQueue.filter((item) => item?.ownerUserId);
    if (queueWithOwners.length !== storedQueue.length) {
      writeStoredValue(storageKeys.syncRetryQueue, queueWithOwners);
    }
    const queue = filterRetryQueueForUser(queueWithOwners, userId);
    if (queue.length === 0) {
      setPendingRetryCount(0);
      setSyncState("idle");
      return;
    }

    setSyncState("syncing");

    for (const item of queue) {
      if (item.type === "upsert") {
        // 데이터가 없는 깨진 upsert 항목은 resolveRetryUpsert가 drop으로 돌려 대기열에서 지운다.
        // 저장소에는 병합이 끝난 최신 목록이 먼저 기록되므로 이 값과 비교한다.
        const storedList = readStoredValue(storageKeys.subscriptions, []);
        const plan = resolveRetryUpsert(item, {
          localList: Array.isArray(storedList) ? storedList : subscriptionsRef.current || [],
          tombstones: getStoredTombstones(),
        });
        if (plan.action === "drop") {
          writeStoredValue(
            storageKeys.syncRetryQueue,
            removeRetryQueueItemForUser(getRetryQueue(), item, userId)
          );
          continue;
        }
        const res = await upsertDbSubscription(userId, plan.data);
        if (res) {
          writeStoredValue(
            storageKeys.syncRetryQueue,
            removeRetryQueueItemForUser(getRetryQueue(), item, userId)
          );
        } else {
          item.attempts = (item.attempts || 0) + 1;
          writeStoredValue(
            storageKeys.syncRetryQueue,
            upsertRetryQueueForUser(getRetryQueue(), item, userId)
          );
          if (item.attempts >= 3) {
            window.dispatchEvent(
              new CustomEvent("submate-sync-error", {
                detail: { message: `[${item.data.name || "구독"}] 서버 저장에 실패했습니다. DB 제약 조건이나 네트워크를 확인해 주세요.` },
              })
            );
          }
        }
      } else if (item.type === "delete") {
        const ok = await deleteDbSubscription(userId, item.id);
        if (ok) {
          writeStoredValue(
            storageKeys.syncRetryQueue,
            removeRetryQueueItemForUser(getRetryQueue(), item, userId)
          );
        } else {
          item.attempts = (item.attempts || 0) + 1;
          writeStoredValue(
            storageKeys.syncRetryQueue,
            upsertRetryQueueForUser(getRetryQueue(), item, userId)
          );
          if (item.attempts >= 3) {
            window.dispatchEvent(
              new CustomEvent("submate-sync-error", {
                detail: { message: `구독 삭제 동기화에 반복 실패했습니다.` },
              })
            );
          }
        }
      }
    }
    const remaining = filterRetryQueueForUser(getRetryQueue(), userId).length;
    setPendingRetryCount(remaining);
    setSyncState(remaining > 0 ? "error" : "idle");
  }, []);

  const fetchLatestCloudSubscriptions = useCallback(async (userId) => {
    if (!supabase) {
      const list = await fetchUserSubscriptions(userId);
      if (!Array.isArray(list)) throw new Error("구독 목록 응답이 올바르지 않습니다.");
      return list;
    }
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const activeCatalog = catalogRef.current?.length ? catalogRef.current : null;
    return (data || []).map((row) => mapDbToSubscription(row, activeCatalog));
  }, []);

  // 목록 새로고침 버튼: 캐시를 그대로 보여주지 않고 클라우드에서 다시 읽어 병합한다.
  const refreshSubscriptions = useCallback(async () => {
    const userId = profileRef.current?.user_id;
    if (!userId) return { ok: false, reason: "not_signed_in" };
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setSyncState("error");
      return { ok: false, reason: "offline" };
    }

    setSyncState("syncing");
    try {
      const cloudList = await fetchLatestCloudSubscriptions(userId);
      if (profileRef.current?.user_id !== userId) {
        return { ok: false, reason: "account_changed" };
      }

      const tombstones = readStoredValue(storageKeys.syncTombstones, {});
      const { merged, toUpload, toDeleteFromCloud } = mergeSubscriptions({
        localList: subscriptionsRef.current || [],
        cloudList,
        tombstones,
      });

      subscriptionsRef.current = merged;
      setSubscriptions(merged);
      writeStoredValue(storageKeys.subscriptions, merged);

      let writeFailed = false;
      for (const sub of toUpload) {
        const saved = await upsertDbSubscription(userId, sub);
        if (!saved) {
          writeFailed = true;
          safeEnqueueRetry({ id: sub.subscriptionId || sub.id, type: "upsert", data: sub }, userId);
        }
      }
      for (const subId of toDeleteFromCloud) {
        const deleted = await deleteDbSubscription(userId, subId);
        if (!deleted) {
          writeFailed = true;
          safeEnqueueRetry({ id: subId, type: "delete" }, userId);
        }
      }

      if (cloudList.length > 0) setOnboardingComplete(true);
      await processRetryQueue(userId);
      const hasPendingRetry = filterRetryQueueForUser(getRetryQueue(), userId).length > 0;
      setSyncState(writeFailed || hasPendingRetry ? "error" : "idle");
      if (writeFailed || hasPendingRetry) {
        return { ok: false, reason: "sync_incomplete", count: merged.length };
      }
      return { ok: true, count: merged.length };
    } catch (error) {
      console.warn("refreshSubscriptions error:", error);
      setSyncState("error");
      return { ok: false, reason: "sync_failed", error };
    }
  }, [fetchLatestCloudSubscriptions, processRetryQueue, safeEnqueueRetry]);

  const retryFirstLoginMigration = useCallback(async () => {
    const userId = profileRef.current?.user_id;
    if (!userId) return false;
    if (!hasPendingGuestMigration(userId)) {
      setMigrationError(false);
      return true;
    }

    setSyncState("syncing");
    const migrated = migrateGuestDataToOwner(userId);
    if (!migrated) {
      setMigrationError(true);
      // 동기화 자체는 계속 진행되므로 상태 표시기는 idle로 되돌리고 migration 배너로만 알린다.
      setSyncState("idle");
      return false;
    }

    setMigrationError(false);
    const merged = readStoredValue(storageKeys.subscriptions, []);
    subscriptionsRef.current = Array.isArray(merged) ? merged : [];
    setSubscriptions(subscriptionsRef.current);
    await cancelScheduledUserNotifications();
    if (onAccountScopeChange) {
      onAccountScopeChange();
    } else {
      await processRetryQueue(userId);
    }
    return true;
  }, [onAccountScopeChange, processRetryQueue]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === storageKeys.syncRetryQueue) {
        refreshSyncQueueState();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refreshSyncQueueState]);

  // 온라인 복귀 리스너 등록
  useEffect(() => {
    const handleOnline = () => {
      if (profile?.user_id) {
        processRetryQueue(profile.user_id);
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [profile?.user_id, processRetryQueue, safeEnqueueRetry]);

  // 계정 전환 및 클라우드 동기화 (수정시각 비교, tombstone 오프라인 삭제, 실패 재시도 대기열)
  const lastUserIdRef = useRef(profile?.user_id || null);

  useEffect(() => {
    const currentUserId = profile?.user_id || null;
    const desiredPartition = currentUserId ? ownerPartitionId(currentUserId) : GUEST_PARTITION;
    const activePartition = getActiveOwnerPartition();
    let active = true;

    const switchPartition = async () => {
      const previousOwner = readStoredValue(storageKeys.ownerUserId, null);
      const previousKnownUserId = lastUserIdRef.current;
      const departingUserId = previousKnownUserId && previousKnownUserId !== currentUserId
        ? previousKnownUserId
        : previousOwner && previousOwner !== currentUserId
          ? previousOwner
          : null;
      const isDifferentUser = Boolean(
        departingUserId && shouldWipeLocalDataForIncomingUser(departingUserId, currentUserId)
      );

      if (currentUserId && isDifferentUser) {
        clearUserScopedData(departingUserId);
        const proofsCleared = await clearAllCancelProofs(departingUserId);
        if (!proofsCleared) console.warn("Could not clear cancel proofs on account switch.");
      } else if (currentUserId) {
        const pendingMigration = hasPendingGuestMigration(currentUserId);
        const needsFirstLoginMigration =
          pendingMigration ||
          (!previousOwner && !hasOwnerPartition(desiredPartition));
        if (needsFirstLoginMigration) {
          if (autoMigrationAttemptedUsers.has(currentUserId)) {
            setMigrationError(pendingMigration);
          } else {
            autoMigrationAttemptedUsers.add(currentUserId);
            const migrated = migrateGuestDataToOwner(currentUserId);
            if (!migrated) {
              console.warn("First-login guest migration is incomplete; continuing with the cloud partition.");
              setMigrationError(true);
            } else {
              setMigrationError(false);
            }
          }
        }
      }

      const profilePartition = profileRef.current?.user_id
        ? ownerPartitionId(profileRef.current.user_id)
        : GUEST_PARTITION;
      if (profileRef.current) {
        writePartitionValue(storageKeys.profile, profilePartition, profileRef.current);
      }
      await cancelScheduledUserNotifications();
      if (currentUserId && isDifferentUser) {
        // App 화면 상태 정리가 끝난 뒤 A 파티션에 남은 빈 키까지 다시 제거한다.
        clearUserScopedData(departingUserId);
      }
      setActiveOwnerPartition(desiredPartition);
      lastUserIdRef.current = currentUserId;
      if (!active) return;
      onAccountScopeChange?.();
    };

    if (activePartition !== desiredPartition) {
      switchPartition().catch((error) => {
        console.warn("account partition switch error:", error);
        if (active) setSyncState("error");
      });
      return () => {
        active = false;
      };
    }

    if (!currentUserId) {
      lastUserIdRef.current = null;
      return undefined;
    }

    const syncAccount = async () => {
      lastUserIdRef.current = currentUserId;

      // 2) 클라우드 구독 목록 조회 및 양방향 시각 비교 병합
      const cloudSubs = await fetchLatestCloudSubscriptions(currentUserId);
      if (!active) return;
      const cloudList = Array.isArray(cloudSubs) ? cloudSubs : [];
      const tombstones = readStoredValue(storageKeys.syncTombstones, {});

      const localList = subscriptionsRef.current || [];
      const { merged, toUpload, toDeleteFromCloud } = mergeSubscriptions({
        localList,
        cloudList,
        tombstones,
      });

      setSubscriptions(merged);
      writeStoredValue(storageKeys.subscriptions, merged);
      writeStoredValue(storageKeys.ownerUserId, currentUserId);

      if (!active) return;

      // 클라우드 업로드 필요 항목 처리
      if (toUpload.length > 0) {
        toUpload.forEach((sub) => {
          upsertDbSubscription(currentUserId, sub).then((saved) => {
            if (!saved) {
              safeEnqueueRetry({ id: sub.subscriptionId || sub.id, type: "upsert", data: sub }, currentUserId);
            }
          }).catch(() => {
            safeEnqueueRetry({ id: sub.subscriptionId || sub.id, type: "upsert", data: sub }, currentUserId);
          });
        });
      }

      // 클라우드 삭제 필요 항목 처리 (오프라인 삭제 톰스톤 반영)
      if (toDeleteFromCloud.length > 0) {
        toDeleteFromCloud.forEach((subId) => {
          deleteDbSubscription(currentUserId, subId).then((deleted) => {
            if (!deleted) {
              safeEnqueueRetry({ id: subId, type: "delete" }, currentUserId);
            }
          }).catch(() => {
            safeEnqueueRetry({ id: subId, type: "delete" }, currentUserId);
          });
        });
      }

      if (cloudList.length > 0) {
        setOnboardingComplete(true);
      }

      // 대기열에 있는 작업 재시도
      await processRetryQueue(currentUserId);
    };

    syncAccount().catch((error) => {
      console.warn("account sync error:", error);
      if (active) setSyncState("error");
    });

    return () => {
      active = false;
    };
  }, [
    profile?.user_id,
    processRetryQueue,
    safeEnqueueRetry,
    onAccountScopeChange,
    fetchLatestCloudSubscriptions,
  ]);

  // Check past-due renewal for current month on home route
  useEffect(() => {
    if (currentRoute !== "home") return;
    const currentMonth = getMonthKey();
    const pastDue = subscriptions.find((subscription) =>
      isPastDueThisCycle(subscription) && subscription.renewalReviewedFor !== currentMonth
    );
    if (pastDue) {
      setRenewalTarget(pastDue.subscriptionId);
    }
  }, [currentRoute, subscriptions]);

  const renewalSubscription = useMemo(
    () => subscriptions.find((subscription) => subscription.subscriptionId === renewalTarget) || null,
    [renewalTarget, subscriptions]
  );

  const cancelSubscription = useMemo(
    () => subscriptions.find((subscription) => subscription.subscriptionId === cancelTarget?.id) || cancelTarget?.subscription || null,
    [cancelTarget, subscriptions]
  );

  const getSubscriptionById = useCallback((id) => {
    if (!id) return null;
    return subscriptions.find((subscription) =>
      subscription.subscriptionId === id ||
      subscription.id === id ||
      String(subscription.subscriptionId) === String(id) ||
      subscription.name.toLowerCase() === id.toLowerCase()
    ) || null;
  }, [subscriptions]);

  const handleAddSubscription = useCallback((data, notify) => {
    const duplicate = isDuplicateSubscription(
      subscriptions,
      data
    );
    if (duplicate) {
      notify?.("이미 등록된 구독입니다. 기존 카드에서 정보를 수정해 주세요.");
      return false;
    }
    const queryName = (data.name || "").trim().toLowerCase().replace(/\s+/g, "");
    const activeCatalog = (catalogRef.current && catalogRef.current.length > 0) ? catalogRef.current : (getCachedCatalog()?.serviceCatalog || []);
    const matched = activeCatalog.find((service) => {
      if (data.id && service.id === data.id) return true;
      if (service.name.toLowerCase().replace(/\s+/g, "") === queryName) return true;
      if ((service.aliases || []).some((a) => a.toLowerCase().replace(/\s+/g, "") === queryName)) return true;
      return false;
    });
    const subId = createSubscriptionId("manual");
    const nowIso = new Date().toISOString();
    const record = {
      ...data,
      id: matched?.id || createSubscriptionId("custom"),
      serviceId: matched?.id || data.serviceId || data.id,
      monogram: data.monogram || matched?.monogram || data.name.trim().slice(0, 1).toUpperCase(),
      category: data.category || matched?.category || "기타",
      cancelUrl: data.cancelUrl || matched?.cancelUrl || "https://google.com",
      subscriptionId: subId,
      createdAt: nowIso,
      updatedAt: nowIso,
      status: data.isTrial ? "trial" : "active",
      alertD3: true,
      alertD1: false,
      renewalPending: false,
    };
    setSubscriptions((current) => [record, ...current]);
    if (profile?.user_id) {
      upsertDbSubscription(profile.user_id, record).then((saved) => {
        if (!saved) {
          safeEnqueueRetry({ id: record.subscriptionId, type: "upsert", data: record }, profile?.user_id);
        }
      }).catch((err) => {
        safeEnqueueRetry({ id: record.subscriptionId, type: "upsert", data: record }, profile?.user_id);
        console.error(err);
      });
    }
    setOnboardingComplete(true);
    notify?.(`${record.name}을 내 구독에 추가했어요.`);
    return true;
  }, [subscriptions, profile?.user_id, safeEnqueueRetry]);

  const updateSubscription = useCallback((subscriptionId, update, notify) => {
    const target = findSubscriptionTarget(subscriptions, subscriptionId);
    if (!target) return;
    const nowIso = new Date().toISOString();
    const updatedTarget = { ...target, ...update, updatedAt: nowIso };
    const retryId = updatedTarget.subscriptionId || updatedTarget.id;

    if (profile?.user_id) {
      upsertDbSubscription(profile.user_id, updatedTarget).then((saved) => {
        if (!saved) {
          safeEnqueueRetry({ id: retryId, type: "upsert", data: updatedTarget }, profile?.user_id);
        }
      }).catch((err) => {
        safeEnqueueRetry({ id: retryId, type: "upsert", data: updatedTarget }, profile?.user_id);
        console.error(err);
      });
    }
    setSubscriptions((current) =>
      current.map((subscription) =>
        matchesSubscriptionTarget(subscription, target)
          ? updatedTarget
          : subscription
      )
    );
    notify?.("구독 정보를 저장했어요.");
  }, [subscriptions, profile?.user_id, safeEnqueueRetry]);

  const togglePinSubscription = useCallback((subscriptionId, notify) => {
    const target = findSubscriptionTarget(subscriptions, subscriptionId);
    if (!target) return;
    const newPinned = !target.isPinned && !target.pinned;
    const nowIso = new Date().toISOString();
    const updatedTarget = { ...target, isPinned: newPinned, pinned: newPinned, updatedAt: nowIso };
    const retryId = target.subscriptionId || target.id;

    if (profile?.user_id) {
      upsertDbSubscription(profile.user_id, updatedTarget).then((saved) => {
        if (!saved) {
          safeEnqueueRetry({ id: retryId, type: "upsert", data: updatedTarget }, profile?.user_id);
        }
      }).catch((err) => {
        safeEnqueueRetry({ id: retryId, type: "upsert", data: updatedTarget }, profile?.user_id);
        console.error(err);
      });
    }
    setSubscriptions((current) =>
      current.map((subscription) =>
        matchesSubscriptionTarget(subscription, target)
          ? updatedTarget
          : subscription
      )
    );
    notify?.(newPinned ? `${target.name}을(를) 상단에 고정 강조했어요.` : `${target.name} 고정을 해제했어요.`);
  }, [subscriptions, profile?.user_id, safeEnqueueRetry]);

  const muteSubscription = useCallback((subscriptionId, notify) => {
    const target = findSubscriptionTarget(subscriptions, subscriptionId);
    if (!target) return;
    const nowIso = new Date().toISOString();
    const updatedTarget = { ...target, alertD3: false, alertD1: false, updatedAt: nowIso };
    const retryId = target.subscriptionId || target.id;

    if (profile?.user_id) {
      upsertDbSubscription(profile.user_id, updatedTarget).then((saved) => {
        if (!saved) {
          safeEnqueueRetry({ id: retryId, type: "upsert", data: updatedTarget }, profile?.user_id);
        }
      }).catch((err) => {
        safeEnqueueRetry({ id: retryId, type: "upsert", data: updatedTarget }, profile?.user_id);
        console.error(err);
      });
    }
    setSubscriptions((current) =>
      current.map((subscription) =>
        matchesSubscriptionTarget(subscription, target)
          ? updatedTarget
          : subscription
      )
    );
    notify?.("사전 알림을 모두 껐어요.");
  }, [subscriptions, profile?.user_id, safeEnqueueRetry]);

  const startCancellation = useCallback((subscriptionId, promotion = null, options = {}) => {
    const target = subscriptions.find((subscription) =>
      subscription.subscriptionId === subscriptionId || subscription.id === subscriptionId
    );
    if (!target) return;
    setCancelTarget({
      id: target.subscriptionId,
      subscription: target,
      promotion,
      autoOpen: Boolean(options?.autoOpen),
    });
  }, [subscriptions]);

  const closeCancellation = useCallback(() => {
    setCancelTarget(null);
  }, []);

  const finishCancellation = useCallback((subscriptionId, saved, onComplete) => {
    const subId = typeof subscriptionId === "object" && subscriptionId !== null
      ? (subscriptionId.subscriptionId || subscriptionId.id)
      : subscriptionId;
    const target = subscriptions.find((subscription) =>
      subscription.subscriptionId === subId || subscription.id === subId
    );
    if (!target) return;
    const finalSaved = saved ?? (typeof subscriptionId === "object" ? subscriptionId.amount : target.amount);
    appendCancelRecord(target);
    recordTombstone(target.subscriptionId);
    setSubscriptions((current) => current.filter((subscription) => subscription.subscriptionId !== target.subscriptionId));
    if (profile?.user_id) {
      deleteDbSubscription(profile.user_id, target.subscriptionId).then((ok) => {
        if (!ok) {
          safeEnqueueRetry({ id: target.subscriptionId, type: "delete" }, profile?.user_id);
        }
      }).catch(() => {
        safeEnqueueRetry({ id: target.subscriptionId, type: "delete" }, profile?.user_id);
      });
    }
    const rawSaved = finalSaved != null ? finalSaved : target.amount;
    const monthlySaved = toMonthlyAmount({
      ...target,
      ...(typeof subscriptionId === "object" && subscriptionId !== null ? subscriptionId : {}),
      amount: rawSaved,
    });
    setSavedAmount((amount) => amount + monthlySaved);
    setCompletedCancelId(target.subscriptionId);
    setCancelTarget(null);
    onComplete?.();
  }, [subscriptions, profile?.user_id, safeEnqueueRetry]);

  const handleRenewal = useCallback((keep, notify) => {
    if (!renewalSubscription) return;
    if (keep) {
      const nowIso = new Date().toISOString();
      const updated = {
        ...renewalSubscription,
        renewalPending: false,
        renewalReviewedFor: getMonthKey(),
        updatedAt: nowIso,
      };
      if (profile?.user_id) {
        upsertDbSubscription(profile.user_id, updated).then((saved) => {
          if (!saved) {
            safeEnqueueRetry({ id: updated.subscriptionId, type: "upsert", data: updated }, profile?.user_id);
          }
        }).catch((err) => {
          safeEnqueueRetry({ id: updated.subscriptionId, type: "upsert", data: updated }, profile?.user_id);
          console.error(err);
        });
      }
      setSubscriptions((current) =>
        current.map((subscription) =>
          subscription.subscriptionId === renewalSubscription.subscriptionId
            ? updated
            : subscription
        )
      );
      notify?.(`${renewalSubscription.name}을 다음 결제 주기로 유지했어요.`);
    } else {
      appendCancelRecord(renewalSubscription);
      recordTombstone(renewalSubscription.subscriptionId);
      setSubscriptions((current) =>
        current.filter((subscription) => subscription.subscriptionId !== renewalSubscription.subscriptionId)
      );
      if (profile?.user_id) {
        deleteDbSubscription(profile.user_id, renewalSubscription.subscriptionId).then((ok) => {
          if (!ok) {
            safeEnqueueRetry({ id: renewalSubscription.subscriptionId, type: "delete" }, profile?.user_id);
          }
        }).catch(() => {
          safeEnqueueRetry({ id: renewalSubscription.subscriptionId, type: "delete" }, profile?.user_id);
        });
      }
      setSavedAmount((amount) => amount + toMonthlyAmount(renewalSubscription));
      notify?.(`${renewalSubscription.name}을 목록에서 해지 처리했어요.`);
    }
    setRenewalTarget(null);
  }, [renewalSubscription, profile?.user_id, safeEnqueueRetry]);

  const deleteSubscription = useCallback((subscriptionId) => {
    const target = subscriptions.find((sub) => (sub.subscriptionId || sub.id) === subscriptionId);
    if (!target) return;
    const targetId = target.subscriptionId || target.id;
    recordTombstone(targetId);
    setSubscriptions((current) => current.filter((sub) => (sub.subscriptionId || sub.id) !== subscriptionId));
    if (profile?.user_id) {
      deleteDbSubscription(profile.user_id, targetId).then((ok) => {
        if (!ok) {
          safeEnqueueRetry({ id: targetId, type: "delete" }, profile?.user_id);
        }
      }).catch(() => {
        safeEnqueueRetry({ id: targetId, type: "delete" }, profile?.user_id);
      });
    }
  }, [profile?.user_id, subscriptions, safeEnqueueRetry]);

  // 프로필은 새 계정으로 바뀌었지만 effect가 로컬 목록을 비우기 전인 한 렌더에서도 이전 목록을 노출하지 않는다.
  const durableOwnerUserId = profile?.user_id
    ? readStoredValue(storageKeys.ownerUserId, null)
    : null;
  const desiredPartition = profile?.user_id
    ? ownerPartitionId(profile.user_id)
    : GUEST_PARTITION;
  const isAccountSwitching = Boolean(
    getActiveOwnerPartition() !== desiredPartition ||
    (profile?.user_id &&
      ((lastUserIdRef.current && profile.user_id !== lastUserIdRef.current) ||
        (durableOwnerUserId && profile.user_id !== durableOwnerUserId)))
  );

  return {
    profile,
    setProfile,
    subscriptions: isAccountSwitching ? [] : subscriptions,
    setSubscriptions,
    onboardingComplete: isAccountSwitching ? false : onboardingComplete,
    setOnboardingComplete,
    savedAmount: isAccountSwitching ? 0 : savedAmount,
    setSavedAmount,
    selectedOnboarding,
    setSelectedOnboarding,
    cancelTarget,
    setCancelTarget,
    cancelSubscription,
    startCancellation,
    closeCancellation,
    finishCancellation,
    renewalTarget,
    setRenewalTarget,
    renewalSubscription,
    handleRenewal,
    completedCancelId,
    getSubscriptionById,
    handleAddSubscription,
    updateSubscription,
    togglePinSubscription,
    muteSubscription,
    deleteSubscription,
    refreshSubscriptions,
    retryFirstLoginMigration,
    migrationError,
    syncState,
    pendingRetryCount,
    retrySync: () => {
      if (profile?.user_id) {
        return processRetryQueue(profile.user_id);
      }
    },
  };
}
