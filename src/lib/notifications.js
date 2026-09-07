import { daysUntilCharge, formatWon } from "./dates.js";
import { readStoredValue, writeStoredValue, storageKeys } from "./storage.js";

export const NOTIFICATION_STORAGE_KEY = "submate-mvp:notifications";
export const NOTIFICATION_SETTINGS_KEY = "submate-mvp:notification-settings";

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
export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
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


