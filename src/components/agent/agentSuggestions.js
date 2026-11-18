import { daysUntilCharge, formatWon, getNextChargeDate } from "../../lib/dates.js";
import { activeCancelRecords } from "../../lib/careFeed.js";
import { cancelCheckItems } from "../../lib/cancelVerification.js";
import { toMonthlyAmount } from "../../lib/subscriptionMath.js";

const WEEK_DAYS = 7;
const MAX_TASKS = 3;
const key = (sub) => sub?.subscriptionId || sub?.id || null;
const monthDay = (date) => date.getMonth() + 1 + "월 " + date.getDate() + "일";

/**
 * 처음 열었을 때의 "지금 챙길 일"과 질문 예시를 실제 데이터로 만든다.
 * 예시 질문에는 사용자가 구독하지 않는 서비스 이름을 넣지 않는다.
 */
export function buildAgentSuggestions({ subscriptions = [], cancelHistory = [], now = new Date() } = {}) {
  const active = subscriptions.filter((sub) => sub && sub.status !== "cancelled");
  const tasks = [];
  const cancellingKeys = new Set();

  const cancelItems = cancelCheckItems(activeCancelRecords(cancelHistory, subscriptions), now)
    .filter((item) => item.type === "cancel_watching" || item.type === "cancel_ask");
  for (const item of cancelItems) {
    const record = item.record || {};
    const sub = subscriptions.find((s) => key(s) && (key(s) === record.subscriptionId || s.id === record.id)) || null;
    [record.subscriptionId, record.serviceId, record.id].filter(Boolean).forEach((k) => cancellingKeys.add(k));
    const charge = record.expectedChargeOn ? new Date(record.expectedChargeOn) : null;
    tasks.push({
      key: "cancel-" + item.key,
      serviceId: sub?.serviceId || sub?.id || record.serviceId || record.id || null,
      name: record.name,
      monogram: sub?.monogram || null,
      title: record.name + " 해지 확인하기",
      subtitle: item.type === "cancel_ask"
        ? "결제일이 지났어요 · 결제됐는지 확인"
        : "해지 확인 중" + (charge && !Number.isNaN(charge.getTime()) ? " · " + monthDay(charge) + " 결제일" : ""),
      prompt: record.name + " 해지됐는지 확인해줘",
    });
  }

  const withDays = active
    .map((sub) => ({ sub, days: daysUntilCharge(sub, now) }))
    .filter((entry) => Number.isFinite(entry.days) && entry.days >= 0)
    .sort((a, b) => a.days - b.days);

  for (const { sub, days } of withDays) {
    if (days > 3) break;
    if (cancellingKeys.has(key(sub)) || cancellingKeys.has(sub.id) || cancellingKeys.has(sub.serviceId)) continue;
    tasks.push({
      key: "due-" + key(sub),
      serviceId: sub.serviceId || sub.id || null,
      name: sub.name,
      monogram: sub.monogram || null,
      title: sub.name + " 결제 확인하기",
      subtitle: monthDay(getNextChargeDate(sub, now)) + " " + formatWon(sub.amount) + " 결제 예정",
      urgentText: days === 0 ? "오늘" : "D-" + days,
      prompt: sub.name + " 결제일 알려줘",
    });
  }

  const thisWeek = withDays.filter((entry) => entry.days <= WEEK_DAYS);
  const trimmed = tasks.slice(0, thisWeek.length > 0 ? MAX_TASKS - 1 : MAX_TASKS);
  if (thisWeek.length > 0) {
    const last = thisWeek[thisWeek.length - 1];
    const total = thisWeek.reduce((sum, entry) => sum + Number(entry.sub.amount || 0), 0);
    trimmed.push({
      key: "week",
      icon: "calendar",
      title: "이번 주 결제 " + thisWeek.length + "건 보기",
      subtitle: monthDay(getNextChargeDate(last.sub, now)) + "까지 " + formatWon(total),
      prompt: "다음 주에 나갈 돈 알려줘",
    });
  }

  const prompts = [];
  if (active.length > 0) {
    prompts.push("한 달 구독료 얼마 나가?");
    prompts.push("안 쓰는 구독 있어?");
    const mentioned = new Set(trimmed.map((task) => task.name).filter(Boolean));
    const top = [...active]
      .filter((sub) => !mentioned.has(sub.name))
      .sort((a, b) => toMonthlyAmount(b) - toMonthlyAmount(a))[0];
    prompts.push(top ? top.name + " 해지해줘" : "가장 비싼 구독이 뭐야?");
  }

  return { tasks: trimmed, prompts, hasSubscriptions: active.length > 0 };
}

