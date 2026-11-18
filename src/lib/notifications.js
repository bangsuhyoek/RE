import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { daysUntilCharge, formatWon, getNextChargeDate, toLocalDateKey } from "./dates.js";
import { readStoredValue, writeStoredValue, storageKeys } from "./storage.js";
import { buildCareNotifications } from "./careFeed.js";
import { getCachedCatalog } from "../data/catalogLoader.js";
import {
  AGENT_INSIGHT_NOTIFICATION_TYPE,
  CANCEL_REMINDER_TYPE,
  MONTHLY_REPORT_TYPE,
  NOTIFICATION_STORAGE_KEY,
  scheduledAt,
  stringHashCode,
} from "./notifications/core.js";
import { buildD3NotificationContent, buildMonthlyReportNotification } from "./notifications/content.js";
import { cancelReminderNotification, readCancelReminders } from "./notifications/cancelReminders.js";

export {
  AGENT_INSIGHT_LAST_NOTIFIED_KEY,
  AGENT_INSIGHT_NOTIFICATION_TYPE,
  CANCEL_REMINDER_TYPE,
  DEFAULT_NOTIFICATION_DURATION,
  MONTHLY_REPORT_NOTIFICATION_ID,
  MONTHLY_REPORT_TYPE,
  NOTIFICATION_SETTINGS_KEY,
  NOTIFICATION_STORAGE_KEY,
  USAGE_CHECK_ACTION_TYPE_ID,
  scheduledAt,
} from "./notifications/core.js";
export {
  buildD3NotificationContent,
  buildMonthlyReportNotification,
  createTestNotification,
  getMonthlyReportScheduleAt,
  getPreviousMonthPaidTotal,
} from "./notifications/content.js";
export {
  addCancelReminder,
  readCancelReminders,
  takeDueCancelReminders,
} from "./notifications/cancelReminders.js";
export {
  checkNotificationPermission,
  initAndroidNotificationChannel,
  registerNotificationActionTypes,
  requestNotificationPermission,
  sendAppNotification,
  sendBrowserNotification,
} from "./notifications/permissions.js";
export { scheduleAgentInsightNotification } from "./notifications/agentInsight.js";

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
