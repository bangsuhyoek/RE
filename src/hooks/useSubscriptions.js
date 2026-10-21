import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createMockSubscriptions } from "../data/mockSubscriptions";
import { getCachedCatalog } from "../data/catalogLoader";
import { getMonthKey, isPastDueThisCycle } from "../lib/dates";
import {
  appendCancelRecord,
  clearStoredValue,
  readStoredValue,
  removeDemoSubscriptions,
  storageKeys,
  writeStoredValue,
} from "../lib/storage";
import { readHash } from "./useNavigation";
import { upsertDbSubscription, deleteDbSubscription, fetchUserSubscriptions } from "../lib/supabase";
import { isDuplicateSubscription } from "../lib/subscriptionAdd";
import { createSubscriptionId } from "../lib/ids";
import {
  ensureStorageMigration,
  mergeSubscriptions,
  recordTombstone,
  getRetryQueue,
  enqueueRetry,
  dequeueRetry,
} from "../lib/subscriptionSync";

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

export function useSubscriptions({ currentRoute = "home", catalog = [] } = {}) {
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
    if (raw && (raw.guest || raw.provider === "Guest" || raw.nickname === "민수")) {
      clearStoredValue(storageKeys.profile);
      clearStoredValue(storageKeys.subscriptions);
      clearStoredValue(storageKeys.onboardingComplete);
      clearStoredValue(storageKeys.ownerUserId);
      return null;
    }
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

  const [onboardingComplete, setOnboardingComplete] = useState(() => readStoredValue(storageKeys.onboardingComplete, false));
  const [savedAmount, setSavedAmount] = useState(() => readStoredValue(storageKeys.savedAmount, 0));
  const [selectedOnboarding, setSelectedOnboarding] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [renewalTarget, setRenewalTarget] = useState(null);
  const [completedCancelId, setCompletedCancelId] = useState(null);
  const [pendingRetryCount, setPendingRetryCount] = useState(() => getRetryQueue().length);
  const [syncState, setSyncState] = useState(() => (getRetryQueue().length > 0 ? "error" : "idle"));

  const refreshSyncQueueState = useCallback(() => {
    const queue = getRetryQueue();
    setPendingRetryCount(queue.length);
    setSyncState(queue.length > 0 ? "error" : "idle");
  }, []);

  const safeEnqueueRetryRef = useRef();
  safeEnqueueRetryRef.current = (item) => {
    enqueueRetry(item);
    refreshSyncQueueState();
  };
  const safeEnqueueRetry = useCallback((item) => {
    safeEnqueueRetryRef.current?.(item);
  }, []);

  // Storage sync
  useEffect(() => {
    if (profile) {
      writeStoredValue(storageKeys.profile, profile);
      if (profile.user_id) {
        writeStoredValue(storageKeys.ownerUserId, profile.user_id);
      }
    } else {
      clearStoredValue(storageKeys.profile);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      writeStoredValue(storageKeys.subscriptions, subscriptions);
    }
  }, [subscriptions, profile]);

  useEffect(() => {
    writeStoredValue(storageKeys.onboardingComplete, onboardingComplete);
  }, [onboardingComplete]);

  useEffect(() => {
    writeStoredValue(storageKeys.savedAmount, savedAmount);
  }, [savedAmount]);

  // 재시도 큐 처리 함수 (앱 시작 및 온라인 복귀 시 실행)
  const processRetryQueue = useCallback(async (userId) => {
    if (!userId) return;
    const queue = getRetryQueue();
    if (queue.length === 0) {
      setPendingRetryCount(0);
      setSyncState("idle");
      return;
    }

    setSyncState("syncing");

    for (const item of queue) {
      if (item.type === "upsert" && item.data) {
        const res = await upsertDbSubscription(userId, item.data);
        if (res) {
          dequeueRetry(item.id, item.type);
        } else {
          item.attempts = (item.attempts || 0) + 1;
          enqueueRetry(item);
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
          dequeueRetry(item.id, item.type);
        } else {
          item.attempts = (item.attempts || 0) + 1;
          enqueueRetry(item);
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
    const remaining = getRetryQueue().length;
    setPendingRetryCount(remaining);
    setSyncState(remaining > 0 ? "error" : "idle");
  }, []);

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
    const currentUserId = profile?.user_id;
    if (!currentUserId) {
      lastUserIdRef.current = null;
      return;
    }

    const previousOwner = readStoredValue(storageKeys.ownerUserId, null);
    const isDifferentUser = previousOwner && previousOwner !== currentUserId;

    let active = true;

    // 1) 다른 사용자로 전환된 경우: 이전 로컬 데이터 업로드 금지, 비우고 새 계정 데이터 로드
    if (isDifferentUser) {
      writeStoredValue(storageKeys.ownerUserId, currentUserId);
      setSubscriptions([]);
      writeStoredValue(storageKeys.subscriptions, []);
      clearStoredValue(storageKeys.syncTombstones);
      clearStoredValue(storageKeys.syncRetryQueue);
      setPendingRetryCount(0);
      setSyncState("idle");
    } else {
      writeStoredValue(storageKeys.ownerUserId, currentUserId);
    }

    lastUserIdRef.current = currentUserId;

    // 2) 클라우드 구독 목록 조회 및 양방향 시각 비교 병합
    fetchUserSubscriptions(currentUserId).then(async (cloudSubs) => {
      if (!active) return;
      const cloudList = Array.isArray(cloudSubs) ? cloudSubs : [];
      const tombstones = readStoredValue(storageKeys.syncTombstones, {});

      setSubscriptions((localCurrent) => {
        const { merged, toUpload, toDeleteFromCloud } = mergeSubscriptions({
          localList: localCurrent,
          cloudList,
          tombstones,
        });

        // 클라우드 업로드 필요 항목 처리
        if (toUpload.length > 0) {
          toUpload.forEach((sub) => {
            upsertDbSubscription(currentUserId, sub).then((saved) => {
              if (!saved) {
                safeEnqueueRetry({ id: sub.subscriptionId || sub.id, type: "upsert", data: sub });
              }
            }).catch(() => {
              safeEnqueueRetry({ id: sub.subscriptionId || sub.id, type: "upsert", data: sub });
            });
          });
        }

        // 클라우드 삭제 필요 항목 처리 (오프라인 삭제 톰스톤 반영)
        if (toDeleteFromCloud.length > 0) {
          toDeleteFromCloud.forEach((subId) => {
            deleteDbSubscription(currentUserId, subId).then((deleted) => {
              if (!deleted) {
                safeEnqueueRetry({ id: subId, type: "delete" });
              }
            }).catch(() => {
              safeEnqueueRetry({ id: subId, type: "delete" });
            });
          });
        }

        return merged.length > 0 ? merged : localCurrent;
      });

      if (cloudList.length > 0) {
        setOnboardingComplete(true);
      }

      // 대기열에 있는 작업 재시도
      processRetryQueue(currentUserId);
    });

    return () => {
      active = false;
    };
  }, [profile?.user_id, processRetryQueue, safeEnqueueRetry]);

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
          safeEnqueueRetry({ id: record.subscriptionId, type: "upsert", data: record });
        }
      }).catch((err) => {
        safeEnqueueRetry({ id: record.subscriptionId, type: "upsert", data: record });
        console.error(err);
      });
    }
    setOnboardingComplete(true);
    notify?.(`${record.name}을 내 구독에 추가했어요.`);
    return true;
  }, [subscriptions, profile?.user_id, safeEnqueueRetry]);

  const updateSubscription = useCallback((subscriptionId, update, notify) => {
    const target = subscriptions.find((s) => s.subscriptionId === subscriptionId || s.id === subscriptionId);
    const nowIso = new Date().toISOString();
    const updatedTarget = target ? { ...target, ...update, updatedAt: nowIso } : null;

    if (updatedTarget && profile?.user_id) {
      upsertDbSubscription(profile.user_id, updatedTarget).then((saved) => {
        if (!saved) {
          safeEnqueueRetry({ id: updatedTarget.subscriptionId, type: "upsert", data: updatedTarget });
        }
      }).catch((err) => {
        safeEnqueueRetry({ id: updatedTarget.subscriptionId, type: "upsert", data: updatedTarget });
        console.error(err);
      });
    }
    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.subscriptionId === subscriptionId ? { ...subscription, ...update, updatedAt: nowIso } : subscription
      )
    );
    notify?.("구독 정보를 저장했어요.");
  }, [subscriptions, profile?.user_id, safeEnqueueRetry]);

  const togglePinSubscription = useCallback((subscriptionId, notify) => {
    const target = subscriptions.find((s) => s.subscriptionId === subscriptionId || s.id === subscriptionId);
    if (!target) return;
    const newPinned = !target.isPinned && !target.pinned;
    const nowIso = new Date().toISOString();
    const updatedTarget = { ...target, isPinned: newPinned, pinned: newPinned, updatedAt: nowIso };

    if (profile?.user_id) {
      upsertDbSubscription(profile.user_id, updatedTarget).then((saved) => {
        if (!saved) {
          safeEnqueueRetry({ id: target.subscriptionId, type: "upsert", data: updatedTarget });
        }
      }).catch((err) => {
        safeEnqueueRetry({ id: target.subscriptionId, type: "upsert", data: updatedTarget });
        console.error(err);
      });
    }
    setSubscriptions((current) =>
      current.map((subscription) =>
        (subscription.subscriptionId === target.subscriptionId || subscription.id === target.id)
          ? updatedTarget
          : subscription
      )
    );
    notify?.(newPinned ? `${target.name}을(를) 상단에 고정 강조했어요.` : `${target.name} 고정을 해제했어요.`);
  }, [subscriptions, profile?.user_id, safeEnqueueRetry]);

  const muteSubscription = useCallback((subscriptionId, notify) => {
    const target = subscriptions.find((s) => s.subscriptionId === subscriptionId || s.id === subscriptionId);
    const nowIso = new Date().toISOString();
    const updatedTarget = target ? { ...target, alertD3: false, alertD1: false, updatedAt: nowIso } : null;

    if (updatedTarget && profile?.user_id) {
      upsertDbSubscription(profile.user_id, updatedTarget).then((saved) => {
        if (!saved) {
          safeEnqueueRetry({ id: target.subscriptionId, type: "upsert", data: updatedTarget });
        }
      }).catch((err) => {
        safeEnqueueRetry({ id: target.subscriptionId, type: "upsert", data: updatedTarget });
        console.error(err);
      });
    }
    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.subscriptionId === subscriptionId ? { ...subscription, alertD3: false, alertD1: false, updatedAt: nowIso } : subscription
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
          safeEnqueueRetry({ id: target.subscriptionId, type: "delete" });
        }
      }).catch(() => {
        safeEnqueueRetry({ id: target.subscriptionId, type: "delete" });
      });
    }
    setSavedAmount((amount) => amount + (finalSaved || target.amount));
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
            safeEnqueueRetry({ id: updated.subscriptionId, type: "upsert", data: updated });
          }
        }).catch((err) => {
          safeEnqueueRetry({ id: updated.subscriptionId, type: "upsert", data: updated });
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
            safeEnqueueRetry({ id: renewalSubscription.subscriptionId, type: "delete" });
          }
        }).catch(() => {
          safeEnqueueRetry({ id: renewalSubscription.subscriptionId, type: "delete" });
        });
      }
      setSavedAmount((amount) => amount + renewalSubscription.amount);
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
          safeEnqueueRetry({ id: targetId, type: "delete" });
        }
      }).catch(() => {
        safeEnqueueRetry({ id: targetId, type: "delete" });
      });
    }
  }, [profile?.user_id, subscriptions, safeEnqueueRetry]);

  return {
    profile,
    setProfile,
    subscriptions,
    setSubscriptions,
    onboardingComplete,
    setOnboardingComplete,
    savedAmount,
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
    syncState,
    pendingRetryCount,
    retrySync: () => {
      if (profile?.user_id) {
        return processRetryQueue(profile.user_id);
      }
    },
  };
}
