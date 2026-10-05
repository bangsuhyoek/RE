import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { daysUntilCharge, formatWon, getNextChargeDate } from "./dates.js";
import { readStoredValue, writeStoredValue, storageKeys } from "./storage.js";
import { formatKoreanDateTime } from "./businessDays.js";
import { buildCareNotifications } from "./careFeed.js";

export const NOTIFICATION_STORAGE_KEY = "submate-mvp:notifications";
export const NOTIFICATION_SETTINGS_KEY = "submate-mvp:notification-settings";
export const DEFAULT_NOTIFICATION_DURATION = 2500; // 사용자 피드백 반영: 2~3초 내 빠른 자동 사라짐 (2.5초)
export const CANCEL_REMINDER_TYPE = "cancel_reminder";

/**
 * 예약 알림 필드. 오전 9시 안내라 분 단위 정확도는 필요 없으므로 부정확 알람을 쓴다.
 * - isExactNotification: false — 기본값(true)이면 Android 12+에서 정확한 알람 권한이 없을 때
 *   플러그인이 예약할 때마다 시스템 '알람 및 리마인더' 설정 화면을 연다(앱 실행마다 재예약됨).
 * - allowWhileIdle: true — 없으면 기기를 깨우지 않는 AlarmManager.set(RTC)이 되어
 *   절전(Doze) 중에는 화면을 켤 때까지 밀린다. 켜면 setAndAllowWhileIdle로 최대 1시간 안에 울린다.
 */
export function scheduledAt(at) {
  return { schedule: { at, allowWhileIdle: true }, isExactNotification: false };
}

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
            ...(options.at ? scheduledAt(options.at) : {}),
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

// 해지 다시 알림: 어카운트인포처럼 정해진 시간에만 해지되는 곳을 이용시간 밖에 눌렀을 때, 다음 해지 가능 시각에 알린다.
export function readCancelReminders() {
  const list = readStoredValue(storageKeys.cancelReminders, []);
  return Array.isArray(list) ? list : [];
}

function cancelReminderNotification(reminder) {
  return {
    id: Math.abs(stringHashCode(reminder.id)) % 100000000,
    title: `[해지 가능] ${reminder.serviceName} 지금 해지할 수 있어요`,
    body: `${reminder.routeLabel || "해지"} 이용시간이 시작됐어요. 눌러서 해지를 이어가세요.`,
    channelId: "submate-billing-channel",
    ...scheduledAt(new Date(reminder.at)),
    extra: { subscriptionId: reminder.subscriptionId, type: CANCEL_REMINDER_TYPE },
  };
}

export async function addCancelReminder({ subscription, at, routeLabel = "어카운트인포" }) {
  const subscriptionId = subscription.subscriptionId || subscription.id;
  const reminder = {
    id: `cancel-reminder-${subscriptionId}-${new Date(at).getTime()}`,
    subscriptionId,
    serviceName: subscription.name,
    routeLabel,
    at: new Date(at).toISOString(),
  };
  // 같은 구독의 다시 알림은 하나만 둔다.
  const others = readCancelReminders().filter((item) => item.subscriptionId !== subscriptionId);
  writeStoredValue(storageKeys.cancelReminders, [...others, reminder]);

  let scheduled = false;
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") {
        const requested = await LocalNotifications.requestPermissions();
        if (requested.display !== "granted") return { reminder, scheduled: false };
      }
      await LocalNotifications.schedule({ notifications: [cancelReminderNotification(reminder)] });
      scheduled = true;
    } catch (err) {
      console.warn("cancel reminder schedule error:", err);
    }
  }
  return { reminder, scheduled };
}

// 시각이 지난 다시 알림을 꺼내 알림 센터 항목으로 바꾸고 저장소에서 지운다.
export function takeDueCancelReminders(now = new Date()) {
  const list = readCancelReminders();
  const due = list.filter((item) => new Date(item.at) <= now);
  if (due.length === 0) return [];
  writeStoredValue(storageKeys.cancelReminders, list.filter((item) => new Date(item.at) > now));
  return due.map((item) => ({
    id: item.id,
    subscriptionId: item.subscriptionId,
    serviceName: item.serviceName,
    monogram: item.serviceName?.slice(0, 1) || "S",
    type: CANCEL_REMINDER_TYPE,
    badge: "해지 가능",
    title: `[해지 가능] ${item.serviceName} 지금 해지할 수 있어요`,
    message: `${formatKoreanDateTime(new Date(item.at))}부터 ${item.routeLabel || "해지"} 이용시간이에요.`,
    timestamp: item.at,
    read: false,
  }));
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
            ...scheduledAt(d3Date),
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
            ...scheduledAt(d1Date),
            extra: { subscriptionId: sub.subscriptionId || sub.id, type: isTrial ? "trial_d1" : "billing_d1" },
          });
        }
      }
    }

    // 위에서 대기 알림을 모두 지웠으므로 아직 오지 않은 해지 다시 알림을 다시 건다.
    for (const reminder of readCancelReminders()) {
      if (new Date(reminder.at) > now) scheduledList.push(cancelReminderNotification(reminder));
    }

    // 오늘 챙길 일: 해지 확인, 무료체험 D-2, 정산일, 구독 순환 알림
    const careList = buildCareNotifications({
      subscriptions,
      cancelHistory: readStoredValue(storageKeys.cancelHistory, []),
      rotation: readStoredValue(storageKeys.rotationPlan, null),
      now,
    });
    for (const item of careList) {
      scheduledList.push({
        // 결제 사전 알림(1억 미만)과 겹치지 않게 1억부터 쓴다.
        id: 100000000 + (Math.abs(stringHashCode(item.key)) % 100000000),
        title: item.title,
        body: item.body,
        channelId: "submate-billing-channel",
        ...scheduledAt(item.at),
        extra: { subscriptionId: item.subscriptionId, type: item.type },
      });
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

