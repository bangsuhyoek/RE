import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { daysUntilCharge, formatWon, getNextChargeDate } from "./dates.js";
import { readStoredValue, writeStoredValue } from "./storage.js";

export const NOTIFICATION_STORAGE_KEY = "submate-mvp:notifications";
export const NOTIFICATION_SETTINGS_KEY = "submate-mvp:notification-settings";

const toDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const isNative = () => Capacitor.isNativePlatform();

const notificationId = (value) => {
  const text = String(value || "RE.");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 2147483000) + 1;
};

export function getStoredNotifications() {
  const stored = readStoredValue(NOTIFICATION_STORAGE_KEY, []);
  return Array.isArray(stored) ? stored : [];
}

export function saveStoredNotifications(list) {
  writeStoredValue(NOTIFICATION_STORAGE_KEY, Array.isArray(list) ? list : []);
}

/** Generate alert items only from the user's real stored subscriptions. */
export function generateSubscriptionAlerts(subscriptions, referenceDate = new Date()) {
  const alerts = [];

  for (const sub of Array.isArray(subscriptions) ? subscriptions : []) {
    if (!sub?.subscriptionId) continue;
    const days = daysUntilCharge(sub, referenceDate);
    const nextChargeDate = getNextChargeDate(sub, referenceDate);
    const occurrenceKey = toDateKey(nextChargeDate);
    const isTrial = Boolean(sub.isTrial || sub.status === "trial");
    const timestamp = new Date(referenceDate).toISOString();

    if (days === 1 && sub.alertD1) {
      alerts.push({
        id: `alert-${sub.subscriptionId}-${occurrenceKey}-d1`,
        subscriptionId: sub.subscriptionId,
        serviceName: sub.name,
        amount: sub.amount,
        plan: sub.plan,
        monogram: sub.monogram || sub.name?.slice(0, 1) || "S",
        category: sub.category || "기타",
        type: isTrial ? "trial_d1" : "billing_d1",
        badge: isTrial ? "TRIAL D-1" : "D-1",
        title: isTrial ? `[체험 만료 D-1] ${sub.name} 무료체험 종료` : `[결제 D-1] ${sub.name} 결제 예정`,
        message: isTrial ? `내일 ${sub.name} 무료체험이 종료되고 ${formatWon(sub.amount)}이 결제됩니다.` : `내일 ${sub.name} ${formatWon(sub.amount)}이 결제될 예정입니다.`,
        timestamp,
        daysUntil: 1,
        read: false,
      });
    }

    if (days === 3 && sub.alertD3) {
      alerts.push({
        id: `alert-${sub.subscriptionId}-${occurrenceKey}-d3`,
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
        timestamp,
        daysUntil: 3,
        read: false,
      });
    }

    if (days === 0) {
      alerts.push({
        id: `alert-${sub.subscriptionId}-${occurrenceKey}-today`,
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
        timestamp,
        daysUntil: 0,
        read: false,
      });
    }
  }

  return alerts;
}

export async function getNotificationPermission() {
  if (isNative()) {
    try {
      const result = await LocalNotifications.checkPermissions();
      if (result.display === "granted") return "granted";
      if (result.display === "denied") return "denied";
      return "default";
    } catch {
      return "unsupported";
    }
  }

  if (typeof window !== "undefined" && "Notification" in window) return Notification.permission;
  return "unsupported";
}

export async function requestNotificationPermission() {
  if (isNative()) {
    try {
      const current = await LocalNotifications.checkPermissions();
      const result = current.display === "granted" ? current : await LocalNotifications.requestPermissions();
      if (result.display === "granted") return "granted";
      if (result.display === "denied") return "denied";
      return "default";
    } catch {
      return "unsupported";
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

const atNineAM = (date) => {
  const next = new Date(date);
  next.setHours(9, 0, 0, 0);
  return next;
};

const subtractDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
};

export async function syncNativeSubscriptionNotifications(subscriptions, referenceDate = new Date()) {
  if (!isNative()) return { skipped: true, reason: "web" };

  const permission = await getNotificationPermission();
  if (permission !== "granted") return { skipped: true, reason: "permission" };

  try {
    const pending = await LocalNotifications.getPending();
    const ours = (pending.notifications || []).filter((item) => item?.extra?.reSource === "billing-schedule");
    if (ours.length) {
      await LocalNotifications.cancel({ notifications: ours.map((item) => ({ id: item.id })) });
    }

    const now = new Date(referenceDate);
    const scheduled = [];

    for (const sub of Array.isArray(subscriptions) ? subscriptions : []) {
      if (!sub?.subscriptionId || sub.status === "cancelled") continue;
      const nextCharge = getNextChargeDate(sub, now);
      const occurrenceKey = toDateKey(nextCharge);
      const isTrial = Boolean(sub.isTrial || sub.status === "trial");

      const candidates = [
        sub.alertD3 ? { days: 3, badge: "D-3" } : null,
        sub.alertD1 ? { days: 1, badge: "D-1" } : null,
      ].filter(Boolean);

      for (const candidate of candidates) {
        const when = atNineAM(subtractDays(nextCharge, candidate.days));
        if (when.getTime() <= now.getTime()) continue;
        const key = `${sub.subscriptionId}-${occurrenceKey}-${candidate.badge}`;
        scheduled.push({
          id: notificationId(key),
          title: isTrial && candidate.days === 1
            ? `${sub.name} 무료체험 종료 D-1`
            : `${sub.name} 결제 ${candidate.badge}`,
          body: isTrial && candidate.days === 1
            ? `내일 무료체험이 종료되고 ${formatWon(sub.amount)}이 결제될 예정입니다.`
            : `${candidate.days}일 뒤 ${formatWon(sub.amount)}이 결제될 예정입니다.`,
          schedule: { at: when, allowWhileIdle: true },
          extra: {
            reSource: "billing-schedule",
            subscriptionId: sub.subscriptionId,
            badge: candidate.badge,
          },
        });
      }
    }

    if (scheduled.length) await LocalNotifications.schedule({ notifications: scheduled });
    return { skipped: false, count: scheduled.length };
  } catch (error) {
    console.warn("RE. native notification sync skipped:", error?.message || error);
    return { skipped: true, reason: "native-error" };
  }
}
