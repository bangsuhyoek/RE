import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { readStoredValue, writeStoredValue, storageKeys } from "../storage.js";
import { formatKoreanDateTime } from "../businessDays.js";
import { CANCEL_REMINDER_TYPE, scheduledAt, stringHashCode } from "./core.js";

// 해지 다시 알림: 어카운트인포처럼 정해진 시간에만 해지되는 곳을 이용시간 밖에 눌렀을 때, 다음 해지 가능 시각에 알린다.
export function readCancelReminders() {
  const list = readStoredValue(storageKeys.cancelReminders, []);
  return Array.isArray(list) ? list : [];
}

export function cancelReminderNotification(reminder) {
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
