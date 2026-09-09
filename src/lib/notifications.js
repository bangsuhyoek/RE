import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { daysUntilCharge, formatWon, getNextChargeDate } from "./dates.js";
import { readStoredValue, writeStoredValue, storageKeys } from "./storage.js";

export const NOTIFICATION_STORAGE_KEY = "submate-mvp:notifications";
export const NOTIFICATION_SETTINGS_KEY = "submate-mvp:notification-settings";
export const DEFAULT_NOTIFICATION_DURATION = 6000; // 5~7초 사이 자동 사라짐 (6초)

export function getStoredNotifications() {
  return readStoredValue(NOTIFICATION_STORAGE_KEY, []);
}

export function saveStoredNotifications(list) {
  writeStoredValue(NOTIFICATION_STORAGE_KEY, list);
}

/**
 * Generate alert items for subscriptions based on D-3, D-1, and TODAY rules
 */
export function generateSubscriptionAlerts(subscriptions, referenceDate = new Date()) {
  const alerts = [];

  for (const sub of subscriptions) {
    const days = daysUntilCharge(sub, referenceDate);
    const isTrial = Boolean(sub.isTrial || sub.status === "trial");

    // D-1 Alert
    if (days === 1 && sub.alertD1) {
      alerts.push({
        id: `alert-${sub.subscriptionId}-d1`,
        subscriptionId: sub.subscriptionId,
        serviceName: sub.name,
        amount: sub.amount,
        plan: sub.plan,
        monogram: sub.monogram || sub.name?.slice(0, 1) || "S",
        category: sub.category || "기타",
        type: isTrial ? "trial_d1" : "billing_d1",
        badge: isTrial ? "TRIAL D-1" : "D-1",
        title: isTrial
          ? `[체험 만료 D-1] ${sub.name} 무료체험 종료`
          : `[결제 D-1] ${sub.name} 결제 예정`,
        message: isTrial
          ? `내일 ${sub.name} 무료체험이 종료되고 ${formatWon(sub.amount)}이 결제됩니다.`
          : `내일 ${sub.name} ${formatWon(sub.amount)}이 결제될 예정입니다.`,
        timestamp: new Date().toISOString(),
        daysUntil: 1,
        read: false,
      });
    }

    // D-3 Alert
    if (days === 3 && sub.alertD3) {
      alerts.push({
        id: `alert-${sub.subscriptionId}-d3`,
        subscriptionId: sub.subscriptionId,
        serviceName: sub.name,
        amount: sub.amount,
        plan: sub.plan,
        monogram: sub.monogram || sub.name?.slice(0, 1) || "S",
        category: sub.category || "기타",
        type: "billing_d3",
        badge: "D-3",
        title: `[결제 D-3] ${sub.name} 결제 예정`,
        message: `3일 뒤 ${sub.name} ${formatWon(sub.amount)}이 결제될 예정입니다.`,
        timestamp: new Date().toISOString(),
        daysUntil: 3,
        read: false,
      });
    }

    // TODAY Alert
    if (days === 0) {
      alerts.push({
        id: `alert-${sub.subscriptionId}-today`,
        subscriptionId: sub.subscriptionId,
        serviceName: sub.name,
        amount: sub.amount,
        plan: sub.plan,
        monogram: sub.monogram || sub.name?.slice(0, 1) || "S",
        category: sub.category || "기타",
        type: "billing_today",
        badge: "TODAY",
        title: `[결제일] ${sub.name} 오늘 결제일`,
        message: `오늘 ${sub.name} ${formatWon(sub.amount)}이 결제됩니다.`,
        timestamp: new Date().toISOString(),
        daysUntil: 0,
        read: false,
      });
    }
  }

  return alerts;
}

/**
 * Creates a single test notification for a given subscription
 */
export function createTestNotification(subscription, forcedType = "auto") {
  const isTrial = Boolean(subscription.isTrial || subscription.status === "trial");
  const type = forcedType === "auto" ? (isTrial ? "trial_d1" : "billing_d3") : forcedType;

  let badge = "D-3";
  let title = `[결제 D-3] ${subscription.name} 결제 예정`;
  let message = `3일 뒤 ${subscription.name} ${formatWon(subscription.amount)}이 결제될 예정입니다.`;
  let daysUntil = 3;

  if (type === "trial_d1") {
    badge = "TRIAL D-1";
    title = `[체험 만료 D-1] ${subscription.name} 무료체험 종료`;
    message = `내일 ${subscription.name} 무료체험이 종료되고 ${formatWon(subscription.amount)}이 결제됩니다.`;
    daysUntil = 1;
  } else if (type === "billing_d1") {
    badge = "D-1";
    title = `[결제 D-1] ${subscription.name} 결제 예정`;
    message = `내일 ${subscription.name} ${formatWon(subscription.amount)}이 결제될 예정입니다.`;
    daysUntil = 1;
  }

  return {
    id: `test-alert-${subscription.subscriptionId || subscription.id}-${Date.now()}`,
    subscriptionId: subscription.subscriptionId || subscription.id,
    serviceName: subscription.name,
    amount: subscription.amount,
    plan: subscription.plan,
    monogram: subscription.monogram || subscription.name?.slice(0, 1) || "S",
    category: subscription.category || "기타",
    type,
    badge,
    title,
    message,
    timestamp: new Date().toISOString(),
    daysUntil,
    read: false,
    isTest: true,
  };
}

/**
 * Request browser Web Notification permission
 */
/**
 * Unified notification permission requester for both Web & Native (Capacitor)
 */
export async function checkNotificationPermission() {
  if (typeof window === "undefined") {
    return "unsupported";
  }
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      return status.display === "granted" ? "granted" : status.display === "denied" ? "denied" : "default";
    } catch {
      return "denied";
    }
  }
  if (!("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function initAndroidNotificationChannel() {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
    try {
      await LocalNotifications.createChannel({
        id: "submate-billing-channel",
        name: "꾸독 결제 알림",
        description: "구독 결제일 사전 알림 및 갱신 안내",
        importance: 4,
        visibility: 1,
        vibration: true,
      });
    } catch (e) {
      console.warn("Failed to create Android notification channel:", e);
    }
  }
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined") {
    return "unsupported";
  }

  // Native App (Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === "granted" ? "granted" : "denied";
    } catch (e) {
      console.warn("Native notification permission request failed:", e);
      return "denied";
    }
  }

  // Web Browser
  if (!("Notification" in window)) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return "denied";
  }
}

/**
 * Send native browser Notification if supported and allowed
 */
export function sendBrowserNotification(title, options = {}) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Unified notification sender for both Web and Native (Capacitor)
 */
export async function sendAppNotification(title, options = {}) {
  if (typeof window === "undefined") return false;

  if (Capacitor.isNativePlatform()) {
    try {
      const notifId = Math.floor(Math.random() * 1000000) + 1;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body: options.body || options.message || "",
            channelId: "submate-billing-channel",
            schedule: options.at ? { at: options.at } : undefined,
            extra: options.extra || {},
          },
        ],
      });
      return true;
    } catch (err) {
      console.warn("LocalNotifications.schedule error:", err);
      return false;
    }
  }

  return sendBrowserNotification(title, options);
}

function stringHashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * 향후 30~60일간의 결제 사전 알림(D-3, D-1)을 네이티브 로컬 알림 큐에 배치 스케줄링
 */
export async function scheduleSubscriptionNotifications(subscriptions = []) {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return false;

    const pending = await LocalNotifications.getPending();
    if (pending?.notifications?.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const scheduledList = [];
    const now = new Date();

    for (const sub of subscriptions) {
      if (sub.status === "cancelled") continue;
      const isTrial = Boolean(sub.isTrial || sub.status === "trial");

      // D-3 예약 (오전 9시)
      if (sub.alertD3 !== false) {
        const nextCharge = getNextChargeDate(sub, now);
        const d3Date = new Date(nextCharge);
        d3Date.setDate(d3Date.getDate() - 3);
        d3Date.setHours(9, 0, 0, 0);

        if (d3Date > now) {
          const notifId = Math.abs(stringHashCode(`${sub.subscriptionId || sub.id}-d3-${d3Date.getMonth()}`));
          scheduledList.push({
            id: notifId % 100000000,
            title: `[결제 D-3] ${sub.name} 결제 예정`,
            body: `3일 뒤 ${sub.name} ${formatWon(sub.amount)}이 결제될 예정입니다.`,
            channelId: "submate-billing-channel",
            schedule: { at: d3Date },
            extra: { subscriptionId: sub.subscriptionId || sub.id, type: "billing_d3" },
          });
        }
      }

      // D-1 예약 (오전 9시)
      if (sub.alertD1) {
        const nextCharge = getNextChargeDate(sub, now);
        const d1Date = new Date(nextCharge);
        d1Date.setDate(d1Date.getDate() - 1);
        d1Date.setHours(9, 0, 0, 0);

        if (d1Date > now) {
          const notifId = Math.abs(stringHashCode(`${sub.subscriptionId || sub.id}-d1-${d1Date.getMonth()}`));
          scheduledList.push({
            id: notifId % 100000000,
            title: isTrial ? `[체험 만료 D-1] ${sub.name} 무료체험 종료` : `[결제 D-1] ${sub.name} 결제 예정`,
            body: isTrial
              ? `내일 ${sub.name} 무료체험이 종료되고 ${formatWon(sub.amount)}이 결제됩니다.`
              : `내일 ${sub.name} ${formatWon(sub.amount)}이 결제될 예정입니다.`,
            channelId: "submate-billing-channel",
            schedule: { at: d1Date },
            extra: { subscriptionId: sub.subscriptionId || sub.id, type: isTrial ? "trial_d1" : "billing_d1" },
          });
        }
      }
    }

    if (scheduledList.length > 0) {
      await LocalNotifications.schedule({ notifications: scheduledList });
    }
    return true;
  } catch (err) {
    console.warn("scheduleSubscriptionNotifications error:", err);
    return false;
  }
}

