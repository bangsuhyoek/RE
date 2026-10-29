import { daysUntilCharge, getNextChargeDate, formatWon, toLocalDateKey } from "./dates.js";

// 한 줄 사용 체크: 결제 1~3일 전에 "이번 달 잘 썼어요?"만 묻는다. 앱 사용 기록 권한 없이 안 쓰는 구독을 찾는다.
export const usageCycleKey = (subscription, now = new Date(), cycleDateKey = null) => {
  const id = subscription.subscriptionId || subscription.id;
  if (cycleDateKey && typeof cycleDateKey === "string") {
    return id + "@" + cycleDateKey;
  }
  if (typeof now === "string") {
    return id + "@" + now;
  }
  return id + "@" + toLocalDateKey(getNextChargeDate(subscription, now));
};

export function answerUsage(answers = {}, subscription, answer, now = new Date(), cycleDateKey = null) {
  const id = subscription.subscriptionId || subscription.id;
  const resolvedNow = typeof now === "string" ? new Date() : now;
  const dateKey = typeof now === "string" ? now : (cycleDateKey || null);
  const key = usageCycleKey(subscription, resolvedNow, dateKey);
  return {
    ...answers,
    [key]: {
      answer,
      answeredAt: resolvedNow.toISOString(),
      subscriptionId: id,
    },
  };
}

// 같은 구독에서 '거의 안 썼어요'가 연달아 몇 번인지 센다.
export function unusedStreak(answers = {}, subscription, beforeDateKey = null) {
  const id1 = subscription.subscriptionId;
  const id2 = subscription.id;
  const matchId = (k, v) =>
    (id1 && (v?.subscriptionId === id1 || k.startsWith(id1 + "@"))) ||
    (id2 && (v?.subscriptionId === id2 || k.startsWith(id2 + "@")));
  const getDate = (k) => k.split("@")[1] || k;

  const list = Object.entries(answers)
    .filter(([key, value]) => matchId(key, value))
    .filter(([key]) => (beforeDateKey ? getDate(key) < beforeDateKey : true))
    .sort(([a], [b]) => (getDate(a) < getDate(b) ? 1 : -1));
  let streak = 0;
  for (const [, value] of list) {
    if (value?.answer !== "unused") break;
    streak += 1;
  }
  return streak;
}

// 같은 구독에서 최근 2회의 사용 체크 답변이 모두 '잘 썼어요'인지 확인한다.
export function isUsageThrottled(answers = {}, subscription) {
  const id1 = subscription.subscriptionId;
  const id2 = subscription.id;
  const matchId = (k, v) =>
    (id1 && (v?.subscriptionId === id1 || k.startsWith(id1 + "@"))) ||
    (id2 && (v?.subscriptionId === id2 || k.startsWith(id2 + "@")));
  const getDate = (k) => k.split("@")[1] || k;

  const list = Object.entries(answers)
    .filter(([key, value]) => matchId(key, value))
    .sort(([a], [b]) => (getDate(a) < getDate(b) ? 1 : -1));
  if (list.length < 2) return false;
  return list[0][1]?.answer === "used" && list[1][1]?.answer === "used";
}

// 특정 결제 주기(chargeDate)에 대해 사용 체크 답변이 이미 기록되어 있는지 확인한다.
export function hasUsageAnswerForCycle(answers = {}, subscription, chargeDate) {
  if (!chargeDate) return false;
  const cycleKey = toLocalDateKey(chargeDate);
  const id1 = subscription.subscriptionId;
  const id2 = subscription.id;
  if (id1 && answers?.[id1 + "@" + cycleKey]?.answer) return true;
  if (id2 && answers?.[id2 + "@" + cycleKey]?.answer) return true;
  return false;
}

// 카탈로그에서 지금보다 싼 요금제를 찾는다. 같은 이름이거나 금액이 같으면 제외한다.
export function findCheaperPlan(subscription, catalog = []) {
  const amount = Number(subscription.grossAmount ?? subscription.amount) || 0;
  const serviceId = subscription.id || subscription.serviceId;
  const service = (catalog || []).find((item) => item.id === serviceId);
  const plans = (service?.availablePlans || service?.plans || [])
    .map((plan) => ({ name: plan.plan || plan.name, amount: Number(plan.amount) || 0 }))
    .filter((plan) => plan.amount > 0 && plan.amount < amount && plan.name && plan.name !== subscription.plan);
  plans.sort((a, b) => a.amount - b.amount);
  return plans[0] || null;
}

export function usageCheckItems(subscriptions = [], answers = {}, { now = new Date(), catalog = [] } = {}) {
  const items = [];
  for (const subscription of subscriptions) {
    if (subscription.status === "cancelled" || subscription.isTrial || subscription.status === "trial") continue;
    if (subscription.billingCycle === "매년") continue;
    const days = daysUntilCharge(subscription, now);
    if (days < 1 || days > 3) continue;
    const key = usageCycleKey(subscription, now);
    const answer = answers[key]?.answer;
    const base = { subscriptionId: subscription.subscriptionId || subscription.id, serviceName: subscription.name, days };
    const date = getNextChargeDate(subscription, now);
    if (!answer) {
      items.push({
        ...base,
        key: "usage:" + key,
        type: "usage_ask",
        title: "이번 달 " + subscription.name + " 잘 썼어요?",
        body: (date.getMonth() + 1) + "월 " + date.getDate() + "일에 " + formatWon(subscription.amount) + "이 결제돼요.",
      });
    } else if (answer === "unused") {
      const cheaper = findCheaperPlan(subscription, catalog);
      const streak = unusedStreak(answers, subscription);
      items.push({
        ...base,
        key: "usage:" + key,
        type: "usage_suggest",
        cheaper,
        streak,
        title: streak >= 2 ? subscription.name + " " + streak + "달째 거의 안 썼어요" : subscription.name + " 이번 결제 전에 정리할까요?",
        body: cheaper
          ? cheaper.name + "(" + formatWon(cheaper.amount) + ")로 바꾸면 매달 " + formatWon((Number(subscription.grossAmount ?? subscription.amount) || 0) - cheaper.amount) + " 아껴요. 아예 안 쓴다면 해지가 가장 커요."
          : "결제 전에 해지하면 이번 달 " + formatWon(subscription.amount) + "을 아껴요.",
      });
    }
  }
  return items;
}

