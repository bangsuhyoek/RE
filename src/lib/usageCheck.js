import { daysUntilCharge, getNextChargeDate, formatWon, toLocalDateKey } from "./dates.js";

// 한 줄 사용 체크: 결제 1~3일 전에 "이번 달 잘 썼어요?"만 묻는다. 앱 사용 기록 권한 없이 안 쓰는 구독을 찾는다.
export const usageCycleKey = (subscription, now = new Date()) =>
  (subscription.subscriptionId || subscription.id) + "@" + toLocalDateKey(getNextChargeDate(subscription, now));

export function answerUsage(answers = {}, subscription, answer, now = new Date()) {
  return { ...answers, [usageCycleKey(subscription, now)]: { answer, answeredAt: now.toISOString(), subscriptionId: subscription.subscriptionId || subscription.id } };
}

// 같은 구독에서 '거의 안 썼어요'가 연달아 몇 번인지 센다.
export function unusedStreak(answers = {}, subscription) {
  const id = subscription.subscriptionId || subscription.id;
  const list = Object.entries(answers)
    .filter(([key, value]) => value?.subscriptionId === id && key.startsWith(id + "@"))
    .sort(([a], [b]) => (a < b ? 1 : -1));
  let streak = 0;
  for (const [, value] of list) {
    if (value.answer !== "unused") break;
    streak += 1;
  }
  return streak;
}

// 카탈로그에서 지금보다 싼 요금제를 찾는다. 같은 이름이거나 금액이 같으면 제외한다.
export function findCheaperPlan(subscription, catalog = []) {
  const amount = Number(subscription.grossAmount ?? subscription.amount) || 0;
  const service = catalog.find((item) => item.id === subscription.id);
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

