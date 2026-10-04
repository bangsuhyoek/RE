import { Capacitor } from "@capacitor/core";
import { buildBillingEvent, buildIcs } from "./calendarEvent.js";
import { SystemIntents } from "./shareIntake.js";

// 결제일을 캘린더에 넣는다. Android는 캘린더 앱의 일정 화면을 채워 열고, 웹은 .ics 파일을 내려받게 한다.
export async function addBillingToCalendar(subscription, now = new Date()) {
  const event = buildBillingEvent(subscription, now);
  if (Capacitor.isNativePlatform()) {
    const end = new Date(event.start);
    end.setDate(end.getDate() + 1);
    try {
      await SystemIntents.addCalendarEvent({
        title: event.title,
        description: event.description,
        beginTime: event.start.getTime(),
        endTime: end.getTime(),
        allDay: true,
        rrule: event.rrule || "",
      });
      return { ok: true, method: "intent" };
    } catch (err) {
      return { ok: false, code: err?.code || "FAILED", message: err?.message || "캘린더를 열지 못했어요." };
    }
  }
  const ics = buildIcs(event, { uid: (subscription.subscriptionId || subscription.id) + "@submate", now });
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = (subscription.name || "subscription") + "-결제일.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ok: true, method: "ics" };
}
