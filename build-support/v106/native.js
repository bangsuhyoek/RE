import { localIsoDate, projectedBillingDates } from "./reminder-schedule.js";

const Capacitor = window.Capacitor || { isNativePlatform: () => false, Plugins: {} };
const plugins = Capacitor.Plugins || {};
const App = plugins.App || { addListener: async () => ({ remove: async () => {} }), getLaunchUrl: async () => ({ url: null }) };
const Browser = plugins.Browser || { open: async ({ url }) => window.open(url, "_blank", "noopener,noreferrer"), close: async () => {} };
const LocalNotifications = plugins.LocalNotifications || {
  checkPermissions: async () => ({ display: "unsupported" }),
  requestPermissions: async () => ({ display: "unsupported" }),
  createChannel: async () => ({}),
  getPending: async () => ({ notifications: [] }),
  cancel: async () => ({}),
  schedule: async () => ({}),
};
const PaymentCapture = plugins.PaymentCapture || {
  checkPermission: async () => ({ hasPermission: false }),
  requestPermission: async () => ({ opened: false }),
  setCandidateNotificationsEnabled: async () => ({ saved: false }),
  getCandidates: async () => ({ candidates: [] }),
  consumeCandidate: async () => ({ consumed: false }),
  discardCandidate: async () => ({ discarded: false }),
};
const isNative = Capacitor.isNativePlatform();
const ALLOWED_HOSTS = new Set(window.REConfig?.android?.allowedExternalHosts || []);

function safeHttpsUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:"
    || url.username
    || url.password
    || (url.port && url.port !== "443")
    || !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) throw new Error("EXTERNAL_URL_NOT_ALLOWED");
  return url.href;
}

export async function openExternalUrl(value) {
  const url = safeHttpsUrl(value);
  if (isNative) await Browser.open({ url });
  else window.open(url, "_blank", "noopener,noreferrer");
  return { opened: true };
}

export async function checkPaymentCapturePermission() {
  if (!isNative) return false;
  const result = await PaymentCapture.checkPermission();
  return result.hasPermission === true;
}

export async function requestPaymentCapturePermission() {
  if (!isNative) return { opened: false };
  return PaymentCapture.requestPermission();
}

export async function setPaymentCandidateNotifications(enabled) {
  if (!isNative) return true;
  const result = await PaymentCapture.setCandidateNotificationsEnabled({ enabled: Boolean(enabled) });
  return result.saved === true;
}

export async function getPaymentCandidates() {
  if (!isNative) return [];
  const result = await PaymentCapture.getCandidates();
  return Array.isArray(result.candidates) ? result.candidates : [];
}

export async function removePaymentCandidate(id, consume = false) {
  if (!isNative || !id) return false;
  const result = consume
    ? await PaymentCapture.consumeCandidate({ id })
    : await PaymentCapture.discardCandidate({ id });
  return consume ? result.consumed === true : result.discarded === true;
}

export async function checkLocalNotificationPermission() {
  if (!isNative) return { permission: "unsupported" };
  const current = await LocalNotifications.checkPermissions();
  return { permission: current.display || "prompt" };
}

export async function requestLocalNotificationPermission() {
  if (!isNative) return { permission: "unsupported", channelReady: false };
  const current = await LocalNotifications.checkPermissions();
  const resolved = current.display === "granted" ? current : await LocalNotifications.requestPermissions();
  if (resolved.display !== "granted") return { permission: "denied", channelReady: false };
  await LocalNotifications.createChannel({
    id: "re-billing-reminders",
    name: "결제와 일정 알림",
    description: "사용자가 선택한 결제일과 일정만 알려드려요.",
    importance: 4,
    vibration: true,
  });
  return { permission: "granted", channelReady: true };
}

const BILLING_REMINDER_DAYS = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 14, 30]);

function legacyNotificationId(subscriptionId, days) {
  let hash = 17;
  for (const char of `${subscriptionId}:${days}`) hash = ((hash * 31) + char.charCodeAt(0)) | 0;
  return (hash >>> 0) % 2_000_000_000 || 1;
}

function billingNotificationId(subscriptionId, billingDate, days) {
  let hash = 19;
  for (const char of `billing:${subscriptionId}:${billingDate}:${days}`) hash = ((hash * 31) + char.charCodeAt(0)) | 0;
  return (hash >>> 0) % 2_000_000_000 || 3;
}

function reminderNotificationId(reminderId) {
  let hash = 29;
  for (const char of `reminder:${reminderId}`) hash = ((hash * 31) + char.charCodeAt(0)) | 0;
  return (hash >>> 0) % 2_000_000_000 || 2;
}

export async function cancelBillingReminders(subscriptionId) {
  if (!isNative || !subscriptionId) return true;
  const ids = new Set(BILLING_REMINDER_DAYS.map((days) => legacyNotificationId(subscriptionId, days)));
  try {
    const pending = await LocalNotifications.getPending();
    (pending.notifications || []).forEach((notification) => {
      if (notification.extra?.kind === "billing" && notification.extra?.subscriptionId === subscriptionId) ids.add(notification.id);
    });
  } catch (_error) {}
  await LocalNotifications.cancel({
    notifications: [...ids].map((id) => ({ id })),
  });
  return true;
}

export async function scheduleBillingReminders(subscription) {
  if (!isNative) return true;
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted") return false;
  const reminders = Array.isArray(subscription.reminderDays) ? subscription.reminderDays : [3];
  await cancelBillingReminders(subscription.id);
  const now = new Date();
  const notifications = projectedBillingDates(subscription).flatMap((billingDate) => reminders.flatMap((daysValue) => {
    const days = Number(daysValue);
    if (!BILLING_REMINDER_DAYS.includes(days)) return [];
    const at = new Date(billingDate);
    at.setDate(at.getDate() - days);
    if (at <= now) return [];
    const billingDateKey = localIsoDate(billingDate);
    return [{
      id: billingNotificationId(subscription.id, billingDateKey, days),
      channelId: "re-billing-reminders",
      title: `${subscription.serviceName} 결제 일정을 살펴볼까요?`,
      body: days === 0 ? `오늘 ${subscription.amount.toLocaleString("ko-KR")}원 결제 예정이에요.` : `${days}일 뒤 결제 예정이에요. 필요할 때 천천히 확인해 주세요.`,
      schedule: { at },
      extra: { subscriptionId: subscription.id, billingDate: billingDateKey, kind: "billing" },
    }];
  }));
  if (notifications.length) await LocalNotifications.schedule({ notifications });
  return true;
}

export async function scheduleCustomReminder(reminder) {
  if (!isNative) return { scheduled: false, reason: "unsupported" };
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted") return { scheduled: false, reason: "permission" };
  const at = new Date(reminder.remindAt);
  if (Number.isNaN(at.getTime()) || at <= new Date()) return { scheduled: false, reason: "past" };
  const id = reminderNotificationId(reminder.id);
  await LocalNotifications.cancel({ notifications: [{ id }] });
  await LocalNotifications.schedule({ notifications: [{
    id,
    channelId: "re-billing-reminders",
    title: reminder.title,
    body: "정해둔 구독 확인 시간이에요. 편할 때 천천히 살펴보세요.",
    schedule: { at },
    extra: { reminderId: reminder.id, subscriptionId: reminder.subscriptionId || "", kind: "custom-reminder" },
  }] });
  return { scheduled: true, id };
}

export async function cancelCustomReminder(reminderId) {
  if (!isNative || !reminderId) return true;
  await LocalNotifications.cancel({ notifications: [{ id: reminderNotificationId(reminderId) }] });
  return true;
}

export function installNativeDeepLinks() {
  if (!isNative) return;
  const dispatchDeepLink = (url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "reapp:" && parsed.hostname === "payment" && parsed.pathname === "/candidate") {
        window.dispatchEvent(new CustomEvent("re:payment-candidate", { detail: { id: parsed.searchParams.get("id") || "" } }));
      }
      if (parsed.protocol === "reapp:" && parsed.hostname === "auth" && parsed.pathname === "/callback") {
        window.dispatchEvent(new CustomEvent("re:auth-callback", { detail: { url } }));
      }
    } catch (_error) {}
  };
  void App.addListener("appUrlOpen", ({ url }) => dispatchDeepLink(url));
  void App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) window.dispatchEvent(new CustomEvent("re:app-resumed"));
  });
  void App.getLaunchUrl().then((result) => {
    if (result?.url) window.queueMicrotask(() => dispatchDeepLink(result.url));
  }).catch(() => {});
}

export { isNative };