import { useEffect, useMemo, useState, useCallback } from "react";
import { createMockSubscriptions, serviceCatalog } from "../data/subscriptionData";
import { getMonthKey, isPastDueThisCycle } from "../lib/dates";
import { readStoredValue, removeDemoSubscriptions, storageKeys, writeStoredValue } from "../lib/storage";
import { readHash } from "./useNavigation";

export const createSubscription = (service, index = 0) => ({
  ...service,
  subscriptionId: `onboard-${service.id}-${Date.now()}-${index}`,
  createdAt: new Date().toISOString(),
  billingCycle: "매월",
  status: service.isTrial ? "trial" : "active",
  alertD3: service.id === "netflix" || service.id === "chatgpt",
  alertD1: service.id === "youtube" || service.id === "spotify",
  renewalPending: false,
});

export function useSubscriptions({ currentRoute = "home" } = {}) {
  const storedProfile = useMemo(() => readStoredValue(storageKeys.profile, null), []);
  const initialHash = useMemo(() => readHash(), []);
  const isGuestOrDirect = !storedProfile && (
    initialHash.route === "home" ||
    initialHash.route === "detail" ||
    initialHash.route === "subscriptions" ||
    initialHash.params?.get("guest") === "1"
  );
  const effectiveProfile = storedProfile || (isGuestOrDirect ? { nickname: "민수", provider: "Guest", guest: true, notificationsAllowed: true } : null);

  const [profile, setProfile] = useState(effectiveProfile);
  const [subscriptions, setSubscriptions] = useState(() => {
    const saved = readStoredValue(storageKeys.subscriptions, null);
    if (Array.isArray(saved) && saved.length > 0) {
      return effectiveProfile?.guest ? saved : removeDemoSubscriptions(saved);
    }
    return effectiveProfile?.guest || isGuestOrDirect ? createMockSubscriptions() : [];
  });

  const [onboardingComplete, setOnboardingComplete] = useState(() => readStoredValue(storageKeys.onboardingComplete, true));
  const [savedAmount, setSavedAmount] = useState(() => readStoredValue(storageKeys.savedAmount, 0));
  const [selectedOnboarding, setSelectedOnboarding] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [renewalTarget, setRenewalTarget] = useState(null);
  const [completedCancelId, setCompletedCancelId] = useState(null);

  // Storage sync
  useEffect(() => {
    writeStoredValue(storageKeys.profile, profile);
  }, [profile]);

  useEffect(() => {
    writeStoredValue(storageKeys.subscriptions, subscriptions);
  }, [subscriptions]);

  useEffect(() => {
    writeStoredValue(storageKeys.onboardingComplete, onboardingComplete);
  }, [onboardingComplete]);

  useEffect(() => {
    writeStoredValue(storageKeys.savedAmount, savedAmount);
  }, [savedAmount]);

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
    const duplicate = subscriptions.some((subscription) =>
      subscription.name.trim().toLowerCase() === data.name.trim().toLowerCase() &&
      subscription.plan.trim().toLowerCase() === data.plan.trim().toLowerCase()
    );
    if (duplicate) {
      notify?.("이미 등록된 구독입니다. 기존 카드에서 정보를 수정해 주세요.");
      return false;
    }
    const matched = serviceCatalog.find((service) =>
      service.name.toLowerCase() === data.name.trim().toLowerCase() || service.id === data.id
    );
    const subId = `manual-${Date.now()}`;
    const record = {
      ...data,
      id: matched?.id || `custom-${Date.now()}`,
      monogram: data.monogram || matched?.monogram || data.name.trim().slice(0, 1).toUpperCase(),
      category: data.category || matched?.category || "기타",
      cancelUrl: data.cancelUrl || matched?.cancelUrl || "https://google.com",
      subscriptionId: subId,
      createdAt: new Date().toISOString(),
      status: data.isTrial ? "trial" : "active",
      alertD3: true,
      alertD1: false,
      renewalPending: false,
    };
    setSubscriptions((current) => [record, ...current]);
    setOnboardingComplete(true);
    notify?.(`${record.name}을 내 구독에 추가했어요.`);
    return true;
  }, [subscriptions]);

  const updateSubscription = useCallback((subscriptionId, update, notify) => {
    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.subscriptionId === subscriptionId ? { ...subscription, ...update } : subscription
      )
    );
    notify?.("구독 정보를 저장했어요.");
  }, []);

  const muteSubscription = useCallback((subscriptionId, notify) => {
    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.subscriptionId === subscriptionId ? { ...subscription, alertD3: false, alertD1: false } : subscription
      )
    );
    notify?.("사전 알림을 모두 껐어요.");
  }, []);

  const startCancellation = useCallback((subscriptionId, promotion = null) => {
    const target = subscriptions.find((subscription) =>
      subscription.subscriptionId === subscriptionId || subscription.id === subscriptionId
    );
    if (!target) return;
    setCancelTarget({ id: target.subscriptionId, subscription: target, promotion });
  }, [subscriptions]);

  const closeCancellation = useCallback(() => {
    setCancelTarget(null);
  }, []);

  const finishCancellation = useCallback((subscriptionId, saved, onComplete) => {
    const target = subscriptions.find((subscription) => subscription.subscriptionId === subscriptionId);
    if (!target) return;
    setSubscriptions((current) => current.filter((subscription) => subscription.subscriptionId !== subscriptionId));
    setSavedAmount((amount) => amount + (saved || target.amount));
    setCompletedCancelId(subscriptionId);
    setCancelTarget(null);
    onComplete?.();
  }, [subscriptions]);

  const handleRenewal = useCallback((keep, notify) => {
    if (!renewalSubscription) return;
    if (keep) {
      setSubscriptions((current) =>
        current.map((subscription) =>
          subscription.subscriptionId === renewalSubscription.subscriptionId
            ? { ...subscription, renewalPending: false, renewalReviewedFor: getMonthKey() }
            : subscription
        )
      );
      notify?.(`${renewalSubscription.name}을 다음 결제 주기로 유지했어요.`);
    } else {
      setSubscriptions((current) =>
        current.filter((subscription) => subscription.subscriptionId !== renewalSubscription.subscriptionId)
      );
      setSavedAmount((amount) => amount + renewalSubscription.amount);
      notify?.(`${renewalSubscription.name}을 목록에서 해지 처리했어요.`);
    }
    setRenewalTarget(null);
  }, [renewalSubscription]);

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
    muteSubscription,
  };
}
