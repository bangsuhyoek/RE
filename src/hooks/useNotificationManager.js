import { useEffect, useMemo, useState, useCallback } from "react";
import { createMockSubscriptions } from "../data/subscriptionData";
import {
  generateSubscriptionAlerts,
  createTestNotification,
  getStoredNotifications,
  saveStoredNotifications,
  requestNotificationPermission,
  initAndroidNotificationChannel,
  sendAppNotification,
  scheduleSubscriptionNotifications,
  takeDueCancelReminders,
  sendBrowserNotification,
} from "../lib/notifications";
import { Capacitor } from "@capacitor/core";
import { readHash } from "./useNavigation";

export function useNotificationManager({ subscriptions = [] } = {}) {
  const [notifications, setNotifications] = useState(() => {
    const stored = getStoredNotifications();
    if (stored.length > 0) return stored;
    return subscriptions.length > 0 ? generateSubscriptionAlerts(subscriptions) : [];
  });

  const [notificationCenterOpen, setNotificationCenterOpen] = useState(() => {
    const initial = readHash();
    return initial.params?.get("notifications") === "1";
  });

  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "unsupported";
  });

  // Persist notifications
  useEffect(() => {
    initAndroidNotificationChannel();
  }, []);

  useEffect(() => {
    if (notifications.length > 0) {
      saveStoredNotifications(notifications);
    }
  }, [notifications]);

  // Auto-generate alerts when subscriptions update
  useEffect(() => {
    if (!subscriptions || subscriptions.length === 0) return;
    const generated = generateSubscriptionAlerts(subscriptions);
    if (generated.length > 0) {
      setNotifications((current) => {
        const existingIds = new Set(current.map((n) => n.id));
        const newItems = generated.filter((n) => !existingIds.has(n.id));
        if (newItems.length === 0) return current;
        return [...newItems, ...current];
      });
    }
    scheduleSubscriptionNotifications(subscriptions).catch(() => {});
  }, [subscriptions]);

  // 해지 다시 알림이 시각을 지나면 알림 센터에 넣는다. 웹은 예약 알림이 없어 열려 있는 동안 브라우저 알림도 보낸다.
  useEffect(() => {
    const collect = () => {
      const due = takeDueCancelReminders();
      if (due.length === 0) return;
      if (!Capacitor.isNativePlatform()) {
        due.forEach((item) => sendBrowserNotification(item.title, { body: item.message }));
      }
      setNotifications((current) => {
        const existingIds = new Set(current.map((n) => n.id));
        return [...due.filter((n) => !existingIds.has(n.id)), ...current];
      });
    };
    collect();
    const timer = window.setInterval(collect, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleTriggerTestNotification = useCallback((targetSub = null, notify = null) => {
    const sub = targetSub || subscriptions.find((s) => s.id === "spotify") || subscriptions.find((s) => s.id === "netflix") || subscriptions[0];
    if (!sub) {
      notify?.("등록된 구독이 없어 알림을 생성할 수 없습니다.");
      return;
    }
    const alertItem = createTestNotification(sub, "auto");
    setNotifications((current) => [alertItem, ...current]);
    // 알림을 누르면 이 구독의 갱신 승인 카드가 열리도록 구독 id와 종류를 함께 보낸다.
    sendAppNotification(alertItem.title, {
      body: alertItem.message,
      extra: { subscriptionId: alertItem.subscriptionId, type: alertItem.type },
    });
    notify?.(`${alertItem.badge} 푸시 알림을 발송했어요.`);
  }, [subscriptions]);

  const handleOpenDetailFromNotification = useCallback((subId, onNavigate) => {
    setNotifications((current) =>
      current.map((n) => (n.subscriptionId === subId ? { ...n, read: true } : n))
    );
    setNotificationCenterOpen(false);
    onNavigate?.(subId);
  }, []);

  const handleRequestPermission = useCallback(async (onProfileUpdate = null, notify = null) => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === "granted") {
      onProfileUpdate?.(true);
      notify?.("브라우저 알림 권한이 허용되었습니다.");
    } else {
      onProfileUpdate?.(false);
      notify?.("알림 권한이 거부되었습니다.");
    }
  }, []);

  const handleTogglePermissionFromHome = useCallback(async (profile, onProfileUpdate = null, notify = null) => {
    if (profile?.notificationsAllowed === false) {
      const perm = await requestNotificationPermission();
      setNotificationPermission(perm);
      onProfileUpdate?.(true);
      notify?.("결제 사전 알림이 켜졌어요.");
    } else {
      onProfileUpdate?.(false);
      notify?.("결제 사전 알림을 껐어요.");
    }
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((curr) => curr.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    setNotifications,
    activeBanner: null,
    setActiveBanner: () => {},
    notificationCenterOpen,
    setNotificationCenterOpen,
    notificationPermission,
    unreadCount,
    handleTriggerTestNotification,
    handleOpenDetailFromNotification,
    handleRequestPermission,
    handleTogglePermissionFromHome,
    markAllRead,
    clearAll,
  };
}
