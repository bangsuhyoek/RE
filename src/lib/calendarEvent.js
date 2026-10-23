import { getNextChargeDate, formatWon } from "./dates.js";

// 결제일을 사용자의 캘린더 앱에 넣을 일정. 앱은 캘린더 권한 없이 일정 화면만 채워 열고, 저장은 사용자가 한다.
export function buildBillingEvent(subscription, now = new Date()) {
  const charge = getNextChargeDate(subscription, now);
  const yearly = subscription.billingCycle === "매년";
  const isTrial = Boolean(subscription.isTrial || subscription.status === "trial");
  const dueDay = Number(subscription.dueDay) || charge.getDate();
  // 29~31일 결제는 달마다 날짜가 달라져 반복 규칙이 어긋나므로 이번 결제일만 넣는다.
  let rrule = null;
  if (!isTrial) {
    if (yearly) rrule = "FREQ=YEARLY";
    else if (dueDay <= 28) rrule = "FREQ=MONTHLY";
  }
  const amount = formatWon(subscription.amount);
  return {
    title: isTrial ? subscription.name + " 무료체험 종료·첫 결제" : subscription.name + " 결제일 " + amount,
    description: [
      subscription.name + (subscription.plan ? " " + subscription.plan : "") + " " + amount + (yearly ? " (매년)" : " (매월)"),
      "해지하려면 결제일 전에 꾸독에서 해지 가이드를 열어 주세요.",
    ].join("\n"),
    start: new Date(charge.getFullYear(), charge.getMonth(), charge.getDate()),
    allDay: true,
    rrule,
  };
}

const pad = (value) => String(value).padStart(2, "0");
const icsDate = (date) => date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate());
const icsStamp = (date) =>
  date.getUTCFullYear() + pad(date.getUTCMonth() + 1) + pad(date.getUTCDate()) + "T" +
  pad(date.getUTCHours()) + pad(date.getUTCMinutes()) + pad(date.getUTCSeconds()) + "Z";
const icsText = (value) => String(value).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

export function buildIcs(event, { uid, now = new Date() } = {}) {
  const end = new Date(event.start);
  end.setDate(end.getDate() + 1);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SubMate//Billing//KO",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:" + (uid || "submate-" + icsDate(event.start) + "@submate"),
    "DTSTAMP:" + icsStamp(now),
    "DTSTART;VALUE=DATE:" + icsDate(event.start),
    "DTEND;VALUE=DATE:" + icsDate(end),
    "SUMMARY:" + icsText(event.title),
    "DESCRIPTION:" + icsText(event.description),
  ];
  if (event.rrule) lines.push("RRULE:" + event.rrule);
  lines.push(
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:" + icsText(event.title),
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  );
  return lines.join("\r\n") + "\r\n";
}

