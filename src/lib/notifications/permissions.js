import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { USAGE_CHECK_ACTION_TYPE_ID, scheduledAt } from "./core.js";

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
  await registerNotificationActionTypes();
}

export async function registerNotificationActionTypes() {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: USAGE_CHECK_ACTION_TYPE_ID,
            actions: [
              { id: "used", title: "잘 썼어요" },
              { id: "unused", title: "거의 안 썼어요" },
            ],
          },
        ],
      });
    } catch (e) {
      console.warn("Failed to register notification action types:", e);
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
