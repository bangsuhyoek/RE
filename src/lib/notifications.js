import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { daysUntilCharge, formatWon, getNextChargeDate, toLocalDateKey } from "./dates.js";
import { readStoredValue, writeStoredValue, storageKeys } from "./storage.js";
import { formatKoreanDateTime } from "./businessDays.js";
import { buildCareNotifications } from "./careFeed.js";
import { toMonthlyAmount } from "./subscriptionMath.js";
import { findCheaperPlan, unusedStreak, isUsageThrottled, hasUsageAnswerForCycle } from "./usageCheck.js";
import { getCachedCatalog } from "../data/catalogLoader.js";

export const NOTIFICATION_STORAGE_KEY = storageKeys.notifications;
export const NOTIFICATION_SETTINGS_KEY = storageKeys.notificationSettings;
export const DEFAULT_NOTIFICATION_DURATION = 2500; // 사용자 피드백 반영: 2~3초 내 빠른 자동 사라짐 (2.5초)
export const CANCEL_REMINDER_TYPE = "cancel_reminder";
export const AGENT_INSIGHT_NOTIFICATION_TYPE = "agent_insight";
export const MONTHLY_REPORT_TYPE = "monthly_report";
export const MONTHLY_REPORT_NOTIFICATION_ID = 300000000;

const CARE_CANCEL_TYPES = new Set(["trial_d2", "rotation_cancel"]);
const CARE_HOME_TYPES = new Set(["cancel_check", "settlement_due", "rotation_resume"]);
const BILLING_NOTIFICATION_PATTERN = /^(?:billing|trial)_d[1-9]\d*$/;

/**
 * 로컬 알림의 extra를 화면 이동 동작으로 바꾼다. 알 수 없는 형식은 null을 돌려 아무 동작도 하지 않는다.
 * 알림 종류가 늘어나도 App의 리스너를 고치지 않도록 순수 함수로 유지한다.
 */
export function resolveNotificationRoute(extra = {}) {
  const type = String(extra?.type || "");
  const subscriptionId = extra?.subscriptionId || null;

  if (type === AGENT_INSIGHT_NOTIFICATION_TYPE) {
    return { kind: "agent", insight: extra?.insight || null };
  }
  if (type === MONTHLY_REPORT_TYPE) {
    return { kind: "home" };
  }
  if (type === CANCEL_REMINDER_TYPE && subscriptionId) {
    return { kind: "cancel_reminder", subscriptionId };
  }
  if (CARE_CANCEL_TYPES.has(type)) {
    return { kind: "care_cancel", subscriptionId, extra };
  }
  if (CARE_HOME_TYPES.has(type)) {
    return { kind: "care_home", subscriptionId, extra };
  }
  if (subscriptionId && (type === "usage_check" || type === "usage_cancel_suggest")) {
    return { kind: "usage", subscriptionId, extra };
  }
  if (subscriptionId && (type === "billing_today" || BILLING_NOTIFICATION_PATTERN.test(type))) {
    return { kind: "renewal", subscriptionId };
  }
  return null;
}

/** 매달 1일 09시 요약 시각. 1일 09시 전이면 아직 오지 않은 오늘 09시 알림을 유지한다. */
export function getMonthlyReportScheduleAt(now = new Date()) {
  const todayAtNine = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);
  if (now.getDate() === 1 && now < todayAtNine) return todayAtNine;
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0, 0);
}

/** 요약 예정일의 바로 전 달에 이미 구독 중이던 유료 서비스의 월 환산 예상 결제액. */
export function getPreviousMonthPaidTotal(subscriptions = [], now = new Date()) {
  const scheduledFor = getMonthlyReportScheduleAt(now);
  const reportMonthEnd = new Date(scheduledFor.getFullYear(), scheduledFor.getMonth(), 1);
  return (Array.isArray(subscriptions) ? subscriptions : []).reduce((total, subscription) => {
    if (!subscription || subscription.status === "cancelled") return total;
    if (subscription.isTrial || subscription.status === "trial") return total;
    const createdAt = subscription.createdAt ? new Date(subscription.createdAt) : null;
    if (createdAt && !Number.isNaN(createdAt.getTime()) && createdAt >= reportMonthEnd) {
      return total;
    }
    return total + toMonthlyAmount(subscription);
  }, 0);
}

/** 매달 1일 09시에 지난달 예상 결제액과 누적 절약액을 알리는 고정 ID 알림. */
export function buildMonthlyReportNotification(subscriptions = [], savedAmount = 0, now = new Date()) {
  const paidTotal = getPreviousMonthPaidTotal(subscriptions, now);
  const safeSavedAmount = Number.isFinite(Number(savedAmount)) ? Math.max(0, Number(savedAmount)) : 0;
  const scheduledFor = getMonthlyReportScheduleAt(now);
  return {
    id: MONTHLY_REPORT_NOTIFICATION_ID,
    title: "꾸독 월간 요약",
    body: `지난달 예상 결제액은 ${formatWon(paidTotal)}, 지금까지 아낀 금액은 ${formatWon(safeSavedAmount)}이에요.`,
    channelId: "submate-billing-channel",
    ...scheduledAt(scheduledFor),
    extra: { type: MONTHLY_REPORT_TYPE },
  };
}
export const USAGE_CHECK_ACTION_TYPE_ID = "usage_check";

/**
 * 결제 3일 전(D-3) 알림 내용 생성:
 * 1. 2회 이상 연속 미사용(unusedStreak >= 2) -> 해지 권유 알림 (눌러서 해지 상세로 이동)
 * 2. 최근 2회 연속 '잘 썼어요'(isUsageThrottled) -> 기존 안내형 D-3 알림
 * 3. 이번 주기 답변 이미 존재 -> 기존 안내형 D-3 알림
 * 4. 연간/비월간 구독 또는 2회차(cycle > 1) 또는 무료체험 -> 기존 안내형 알림
 * 5. 그 외 -> 사용 여부를 묻는 액션 버튼 알림
 */
export function buildD3NotificationContent({
  subscription,
  chargeDate,
  cycleIndex = 0,
  answers = {},
  catalog = [],
}) {
  const name = subscription.name || "구독";
  const isTrial = Boolean(subscription.isTrial || subscription.status === "trial");
  const isMonthly = (subscription.billingCycle || "매월") !== "매년";
  const subKey = subscription.subscriptionId || subscription.id;
  const cycleNumber = cycleIndex + 1;
  const cycleDateKey = chargeDate ? toLocalDateKey(chargeDate) : toLocalDateKey(new Date());

  // 기존 안내형 D-3 폴백
  const informational = {
    title: `[결제 D-3] ${name} 결제 예정`,
    body: `3일 뒤 ${name} ${formatWon(subscription.amount)}이 결제될 예정입니다.`,
    extra: { subscriptionId: subKey, cycle: cycleNumber, type: "billing_d3", cycleKey: cycleDateKey },
    actionTypeId: undefined,
  };

  // 월간 정기 구독의 1회차 주기(cycle 1)에만 질문/권유 로직 적용
  if (cycleIndex !== 0 || isTrial || !isMonthly) {
    return informational;
  }

  const streak = unusedStreak(answers, subscription, cycleDateKey);
  if (streak >= 2) {
    const monthlyAmount = toMonthlyAmount(subscription);
    const cheaper = findCheaperPlan(subscription, catalog);
    const title = `${name} ${streak}달째 거의 안 쓰셨어요`;
    let body = `그동안 ${formatWon(streak * monthlyAmount)} 나갔어요. 3일 뒤 또 결제돼요. 눌러서 해지를 확인하세요.`;
    if (cheaper) {
      body += ` 더 싼 ${cheaper.name}(${formatWon(cheaper.amount)})도 있어요.`;
    }
    return {
      title,
      body,
      extra: { subscriptionId: subKey, cycle: cycleNumber, type: "usage_cancel_suggest", cycleKey: cycleDateKey },
      actionTypeId: undefined,
    };
  }

  if (isUsageThrottled(answers, subscription) || hasUsageAnswerForCycle(answers, subscription, chargeDate)) {
    return informational;
  }

  return {
    title: `${name}, 3일 뒤 ${formatWon(subscription.amount)}`,
    body: `이번 달 ${name} 잘 쓰셨어요? 알림을 내려서 바로 답해 주세요.`,
    extra: { subscriptionId: subKey, cycle: cycleNumber, type: "usage_check", cycleKey: cycleDateKey },
    actionTypeId: USAGE_CHECK_ACTION_TYPE_ID,
  };
}

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

// 부정확 알람은 예정 시각보다 최대 1시간(절전 중에는 더) 늦게 온다. 그 사이 다시 예약하면서 대기 알림을
// 모두 지우면, 시각이 지났지만 아직 오지 않은 알림이 사라진다. 이런 알림은 곧바로 다시 건다.
export const OVERDUE_REARM_WINDOW_MS = 2 * 60 * 60 * 1000;

/** 대기 중 알림 가운데 시각이 지났지만 아직 오지 않았고, 구독이 남아 있는 것을 고른다. */
export function selectOverdueToRearm(pendingNotifications = [], subscriptions = [], now = new Date()) {
  const liveIds = new Set(
    subscriptions.filter((sub) => sub.status !== "cancelled").map((sub) => String(sub.subscriptionId || sub.id))
  );
  return pendingNotifications.filter((notification) => {
    const at = new Date(notification?.schedule?.at).getTime();
    if (!Number.isFinite(at)) return false;
    const overdueMs = now.getTime() - at;
    if (overdueMs < 0 || overdueMs > OVERDUE_REARM_WINDOW_MS) return false;
    return liveIds.has(String(notification?.extra?.subscriptionId));
  });
}

export function getStoredNotifications() {
  return readStoredValue(NOTIFICATION_STORAGE_KEY, []);
}

export function saveStoredNotifications(list) {
  writeStoredValue(NOTIFICATION_STORAGE_KEY, list);
}

/** 12시간제 오전/오후 및 시간 문자열을 24시간제 정수(0~23)로 변환 */
export function parseAlertTimeTo24Hours(ampm = "오전", hour = "09") {
  let h = Number(hour) || 9;
  if (ampm === "오후") {
    if (h < 12) h += 12;
  } else if (ampm === "오전") {
    if (h === 12) h = 0;
  }
  return h;
}

/**
 * Generate alert items for subscriptions based on D-3, D-1, and TODAY rules
 */
export function generateSubscriptionAlerts(subscriptions, referenceDate = new Date(), options = {}) {
  const alerts = [];
  const answers = options.usageAnswers || readStoredValue(storageKeys.usageAnswers, {});
  const catalog = options.catalog || getCachedCatalog()?.serviceCatalog || [];

  for (const sub of subscriptions) {
    if (sub.status === "cancelled") continue;
    if (sub.alertEnabled === false) continue;
    const days = daysUntilCharge(sub, referenceDate);
    const isTrial = Boolean(sub.isTrial || sub.status === "trial");
    const subId = sub.subscriptionId || sub.id;
    const nextCharge = getNextChargeDate(sub, referenceDate);
    const cycleKey = nextCharge ? toLocalDateKey(nextCharge) : toLocalDateKey(referenceDate);
    const hasAlertDDay = sub.alertDDay !== undefined && sub.alertDDay !== null;
    const targetDDay = hasAlertDDay ? Number(sub.alertDDay) : null;

    // D-1 Alert
    const shouldAlertD1 = hasAlertDDay ? targetDDay === 1 : (isTrial || sub.alertD1);
    if (days === 1 && shouldAlertD1) {
      alerts.push({
        id: `alert-${subId}-${cycleKey}-d1`,
        subscriptionId: sub.subscriptionId || sub.id,
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
    const shouldAlertD3 = hasAlertDDay ? targetDDay === 3 : (sub.alertD3 !== false);
    if (days === 3 && shouldAlertD3) {
      if (!isTrial) {
        const content = buildD3NotificationContent({
          subscription: sub,
          chargeDate: nextCharge || referenceDate,
          cycleIndex: 0,
          answers,
          catalog,
        });
        alerts.push({
          id: `alert-${subId}-${cycleKey}-d3`,
          subscriptionId: sub.subscriptionId || sub.id,
          serviceName: sub.name,
          amount: sub.amount,
          plan: sub.plan,
          monogram: sub.monogram || sub.name?.slice(0, 1) || "S",
          category: sub.category || "기타",
          type: content.extra.type,
          badge: "D-3",
          title: content.title,
          message: content.body,
          timestamp: new Date().toISOString(),
          daysUntil: 3,
          read: false,
        });
      } else {
      alerts.push({
        id: `alert-${subId}-${cycleKey}-d3`,
        subscriptionId: sub.subscriptionId || sub.id,
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
    }

    // Custom D-day Alert when targetDDay is not 1 and not 3 (e.g. D-2, D-5)
    if (hasAlertDDay && targetDDay !== 1 && targetDDay !== 3 && days === targetDDay) {
      alerts.push({
        id: `alert-${subId}-${cycleKey}-d${targetDDay}`,
        subscriptionId: sub.subscriptionId || sub.id,
        serviceName: sub.name,
        amount: sub.amount,
        plan: sub.plan,
        monogram: sub.monogram || sub.name?.slice(0, 1) || "S",
        category: sub.category || "기타",
        type: isTrial ? `trial_d${targetDDay}` : `billing_d${targetDDay}`,
        badge: isTrial ? `TRIAL D-${targetDDay}` : `D-${targetDDay}`,
        title: isTrial
          ? `[체험 만료 D-${targetDDay}] ${sub.name} 무료체험 종료`
          : `[결제 D-${targetDDay}] ${sub.name} 결제 예정`,
        message: isTrial
          ? `${targetDDay}일 뒤 ${sub.name} 무료체험이 종료되고 ${formatWon(sub.amount)}이 결제됩니다.`
          : `${targetDDay}일 뒤 ${sub.name} ${formatWon(sub.amount)}이 결제될 예정입니다.`,
        timestamp: new Date().toISOString(),
        daysUntil: targetDDay,
        read: false,
      });
    }

    // TODAY Alert
    if (days === 0) {
      alerts.push({
        id: `alert-${subId}-${cycleKey}-today`,
        subscriptionId: sub.subscriptionId || sub.id,
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
    title: reminder.title || `[해지 가능] ${reminder.serviceName} 지금 해지할 수 있어요`,
    body: reminder.body || `${reminder.routeLabel || "해지"} 이용시간이 시작됐어요. 눌러서 해지를 이어가세요.`,
    channelId: "submate-billing-channel",
    ...scheduledAt(new Date(reminder.at)),
    extra: { subscriptionId: reminder.subscriptionId, type: CANCEL_REMINDER_TYPE },
  };
}

// title/body/badge를 넘기면 어카운트인포 이용시간 문구 대신 그 문구로 알린다(결제일 전날·갱신 7일 전 알림 등).
export async function addCancelReminder({ subscription, at, routeLabel = "어카운트인포", title, body, badge }) {
  const subscriptionId = subscription.subscriptionId || subscription.id;
  const reminder = {
    id: `cancel-reminder-${subscriptionId}-${new Date(at).getTime()}`,
    subscriptionId,
    serviceName: subscription.name,
    routeLabel,
    at: new Date(at).toISOString(),
    ...(title ? { title } : {}),
    ...(body ? { body } : {}),
    ...(badge ? { badge } : {}),
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
    badge: item.badge || "해지 가능",
    title: item.title || `[해지 가능] ${item.serviceName} 지금 해지할 수 있어요`,
    message: item.body || `${formatKoreanDateTime(new Date(item.at))}부터 ${item.routeLabel || "해지"} 이용시간이에요.`,
    timestamp: item.at,
    read: false,
  }));
}

/**
 * 향후 30~60일간의 결제 사전 알림(D-3, D-1)을 네이티브 로컬 알림 큐에 배치 스케줄링
 */
export async function scheduleSubscriptionNotifications(subscriptions = [], now = new Date(), options = {}) {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const savedAmount = options.savedAmount ?? readStoredValue(storageKeys.savedAmount, 0);
    const answers = options.usageAnswers || readStoredValue(storageKeys.usageAnswers, {});
    const catalog = options.catalog || getCachedCatalog()?.serviceCatalog || [];
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return false;

    const pending = await LocalNotifications.getPending();
    const overdue = selectOverdueToRearm(pending?.notifications || [], subscriptions, now);
    if (pending?.notifications?.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const scheduledList = [];

    for (const sub of subscriptions) {
      if (sub.status === "cancelled") continue;
      if (sub.alertEnabled === false) continue;
      const isTrial = Boolean(sub.isTrial || sub.status === "trial");
      const subKey = sub.subscriptionId || sub.id;

      // 향후 2회차 결제일 계산 (무료체험은 단발성 전환이므로 1회차만 예약)
      const chargeDates = [];
      const firstCharge = getNextChargeDate(sub, now);
      if (firstCharge) {
        chargeDates.push(firstCharge);
        if (!isTrial) {
          const nextCycleRef = new Date(firstCharge.getFullYear(), firstCharge.getMonth(), firstCharge.getDate() + 1);
          const secondCharge = getNextChargeDate(sub, nextCycleRef);
          if (secondCharge && secondCharge > firstCharge) {
            chargeDates.push(secondCharge);
          }
        }
      }

      const hasAlertDDay = sub.alertDDay !== undefined && sub.alertDDay !== null;
      const targetHour = parseAlertTimeTo24Hours(sub.alertAmpm, sub.alertHour);

      for (let cycleIndex = 0; cycleIndex < chargeDates.length; cycleIndex++) {
        const chargeDate = chargeDates[cycleIndex];
        const cycleKey = toLocalDateKey(chargeDate);

        if (hasAlertDDay) {
          const dday = Number(sub.alertDDay);
          const alertDate = new Date(chargeDate);
          alertDate.setDate(alertDate.getDate() - dday);
          alertDate.setHours(targetHour, 0, 0, 0);

          if (alertDate > now) {
            const notifId = Math.abs(stringHashCode(`${subKey}-${cycleKey}-d${dday}`));
            if (dday === 3 && !isTrial) {
              const content = buildD3NotificationContent({
                subscription: sub,
                chargeDate,
                cycleIndex,
                answers,
                catalog,
              });
              scheduledList.push({
                id: notifId % 100000000,
                title: content.title,
                body: content.body,
                channelId: "submate-billing-channel",
                ...(content.actionTypeId ? { actionTypeId: content.actionTypeId } : {}),
                ...scheduledAt(alertDate),
                extra: content.extra,
              });
            } else {
            const type = isTrial ? `trial_d${dday}` : `billing_d${dday}`;
            const title = isTrial
              ? (dday === 1 ? `[체험 만료 D-1] ${sub.name} 무료체험 종료` : `[체험 만료 D-${dday}] ${sub.name} 무료체험 종료`)
              : (dday === 1 ? `[결제 D-1] ${sub.name} 결제 예정` : `[결제 D-${dday}] ${sub.name} 결제 예정`);
            const body = isTrial
              ? (dday === 1
                  ? `내일 ${sub.name} 무료체험이 종료되고 ${formatWon(sub.amount)}이 결제됩니다.`
                  : `${dday}일 뒤 ${sub.name} 무료체험이 종료되고 ${formatWon(sub.amount)}이 결제됩니다.`)
              : (dday === 1
                  ? `내일 ${sub.name} ${formatWon(sub.amount)}이 결제될 예정입니다.`
                  : `${dday}일 뒤 ${sub.name} ${formatWon(sub.amount)}이 결제될 예정입니다.`);

            scheduledList.push({
              id: notifId % 100000000,
              title,
              body,
              channelId: "submate-billing-channel",
              ...scheduledAt(alertDate),
              extra: { subscriptionId: subKey, cycle: cycleIndex + 1, type },
            });
            }
          }
        } else {
          // D-3 예약 (기본 시각)
          if (sub.alertD3 !== false) {
            const d3Date = new Date(chargeDate);
            d3Date.setDate(d3Date.getDate() - 3);
            d3Date.setHours(targetHour, 0, 0, 0);

            if (d3Date > now) {
              const notifId = Math.abs(stringHashCode(`${subKey}-${cycleKey}-d3`));
              const content = buildD3NotificationContent({
                subscription: sub,
                chargeDate,
                cycleIndex,
                answers,
                catalog,
              });
              scheduledList.push({
                id: notifId % 100000000,
                title: content.title,
                body: content.body,
                channelId: "submate-billing-channel",
                ...(content.actionTypeId ? { actionTypeId: content.actionTypeId } : {}),
                ...scheduledAt(d3Date),
                extra: content.extra,
              });
            }
          }

          // D-1 예약 (기본 시각)
          if (isTrial || sub.alertD1) {
            const d1Date = new Date(chargeDate);
            d1Date.setDate(d1Date.getDate() - 1);
            d1Date.setHours(targetHour, 0, 0, 0);

            if (d1Date > now) {
              const notifId = Math.abs(stringHashCode(`${subKey}-${cycleKey}-d1`));
              scheduledList.push({
                id: notifId % 100000000,
                title: isTrial ? `[체험 만료 D-1] ${sub.name} 무료체험 종료` : `[결제 D-1] ${sub.name} 결제 예정`,
                body: isTrial
                  ? `내일 ${sub.name} 무료체험이 종료되고 ${formatWon(sub.amount)}이 결제됩니다.`
                  : `내일 ${sub.name} ${formatWon(sub.amount)}이 결제될 예정입니다.`,
                channelId: "submate-billing-channel",
                ...scheduledAt(d1Date),
                extra: { subscriptionId: subKey, cycle: cycleIndex + 1, type: isTrial ? "trial_d1" : "billing_d1" },
              });
            }
          }
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

    // 매달 1일 아침 요약도 같은 재예약 주기에 포함해 고정 ID로 한 번만 남긴다.
    scheduledList.push(buildMonthlyReportNotification(subscriptions, savedAmount, now));

    // 시각이 지났지만 아직 오지 않은 알림은 5초 뒤로 다시 건다(같은 id가 새로 잡혀 있으면 그쪽을 쓴다).
    const rearmAt = new Date(now.getTime() + 5000);
    for (const notification of overdue) {
      if (scheduledList.some((item) => item.id === notification.id)) continue;
      scheduledList.push({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        channelId: "submate-billing-channel",
        ...scheduledAt(rearmAt),
        extra: notification.extra || {},
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

/** 로그아웃·계정 전환 시 이전 사용자의 예약 알림과 알림 센터에 남은 네이티브 알림을 지운다. */
export async function cancelScheduledUserNotifications() {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending?.notifications?.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
    if (typeof LocalNotifications.removeAllDeliveredNotifications === "function") {
      await LocalNotifications.removeAllDeliveredNotifications();
    }
    return true;
  } catch (err) {
    console.warn("cancelScheduledUserNotifications error:", err);
    return false;
  }
}



// ============================================================================
// Agent Proactive Insight Notification Support
// ============================================================================
export const AGENT_INSIGHT_LAST_NOTIFIED_KEY = storageKeys.agentInsightsLastNotified;

/**
 * Schedule or send at most one local notification per KST day for the top high-priority insight.
 * Dedupe by insight id and KST day key.
 * Uses ID range 200,000,000 ~ 299,999,999 (billing alert is <100M, care is 100M~200M).
 */
export async function scheduleAgentInsightNotification(insight, now = new Date()) {
  if (!insight || insight.priority !== "high") return false;
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return false;

    // Check if already notified today in KST
    const todayKey = toLocalDateKey(now);
    const lastNotified = readStoredValue(AGENT_INSIGHT_LAST_NOTIFIED_KEY, null);
    if (lastNotified && (lastNotified.dateKey === todayKey || lastNotified.insightId === insight.id)) {
      return false;
    }

    const notifId = 200000000 + (Math.abs(stringHashCode(insight.id)) % 100000000);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifId,
          title: "꾸독",
          body: insight.message || insight.title || "",
          channelId: "submate-billing-channel",
          extra: {
            insightId: insight.id,
            subscriptionId: insight.subscriptionId || null,
            type: AGENT_INSIGHT_NOTIFICATION_TYPE,
            insight,
          },
        },
      ],
    });

    writeStoredValue(AGENT_INSIGHT_LAST_NOTIFIED_KEY, {
      dateKey: todayKey,
      insightId: insight.id,
      timestamp: now.toISOString(),
    });
    return true;
  } catch (err) {
    console.warn("scheduleAgentInsightNotification error:", err);
    return false;
  }
}
