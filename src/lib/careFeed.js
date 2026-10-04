import { formatWon, toLocalDateKey } from "./dates.js";
import { cancelCheckItems, verificationDueAt, cancelCheckNotification } from "./cancelVerification.js";
import { trialGuardItems, trialReminderAt } from "./trialGuard.js";
import { usageCheckItems } from "./usageCheck.js";
import { getSettlementDue, getSharedSubscriptions, buildSettlementRequest } from "./settlement.js";
import { buildRotationPlan, buildRotationReminders, getRotationCandidates } from "./rotationPlanner.js";
import { getNextChargeDate } from "./dates.js";

// 홈 '오늘 챙길 일': 사용자가 결정만 하면 되도록 꾸독이 챙길 항목을 한곳에 모은다.
const DAY_MS = 86_400_000;
const PRIORITY = {
  cancel_ask: 0,
  cancel_charged: 1,
  trial_guard: 2,
  rotation_due: 3,
  settlement: 4,
  usage_suggest: 5,
  usage_ask: 6,
  cancel_verified: 7,
  rotation_suggest: 8,
  cancel_watching: 9,
};
const ROTATION_CATEGORIES = ["OTT", "음악"];

// 해지한 뒤 같은 서비스를 다시 등록했다면 그 결제는 정상이므로 해지 확인을 멈춘다.
export function activeCancelRecords(cancelHistory = [], subscriptions = []) {
  return cancelHistory.filter((record) => {
    if (record.verification !== "watching" && record.verification !== "asking") return true;
    const serviceId = record.serviceId || record.id;
    return !subscriptions.some((subscription) =>
      subscription.status !== "cancelled" &&
      serviceId && (subscription.id === serviceId || subscription.serviceId === serviceId) &&
      (!subscription.createdAt || new Date(subscription.createdAt) >= new Date(record.cancelledAt)));
  });
}

// 저장한 순환 계획으로 일정을 다시 만든다. 해지한 구독은 목록에서 빠지므로 저장 때 남긴 서비스 정보(services)를 먼저 쓴다.
export function rebuildRotationPlan(saved, subscriptions = []) {
  if (!saved?.order?.length) return null;
  const source = Array.isArray(saved.services) && saved.services.length ? saved.services : getRotationCandidates(subscriptions, saved.category);
  const candidates = source.filter((subscription) => saved.order.includes(subscription.subscriptionId || subscription.id));
  const plan = buildRotationPlan({ subscriptions: candidates, order: saved.order, months: saved.months || 6, start: new Date(saved.createdAt) });
  return plan.ok ? plan : null;
}

// 순환 계획에 남길 서비스 정보. 다시 가입할 때 등록 화면을 채우는 데도 쓴다.
export const rotationSnapshot = (subscription) => ({
  subscriptionId: subscription.subscriptionId || subscription.id,
  id: subscription.id,
  name: subscription.name,
  plan: subscription.plan || "",
  amount: subscription.amount,
  category: subscription.category,
  dueDay: subscription.dueDay,
  billingCycle: subscription.billingCycle || "매월",
  paymentMethod: subscription.paymentMethod || "",
  cancelUrl: subscription.cancelUrl || "",
});

export function rotationSuggestion(subscriptions = []) {
  for (const category of ROTATION_CATEGORIES) {
    // 무료체험 중인 구독은 순환 제안에서 뺀다.
    const candidates = getRotationCandidates(subscriptions, category).filter((subscription) => !subscription.isTrial && subscription.status !== "trial");
    if (candidates.length < 2) continue;
    const plan = buildRotationPlan({ subscriptions: candidates, months: 6 });
    if (plan.ok && plan.monthlySaving > 0) return { category, candidates, plan };
  }
  return null;
}

export function buildCareItems({
  subscriptions = [],
  cancelHistory = [],
  usageAnswers = {},
  acks = {},
  rotation = null,
  catalog = [],
  now = new Date(),
} = {}) {
  const items = [];
  items.push(...cancelCheckItems(activeCancelRecords(cancelHistory, subscriptions), now));
  items.push(...trialGuardItems(subscriptions, acks, now));
  items.push(...usageCheckItems(subscriptions, usageAnswers, { now, catalog }));

  for (const request of getSettlementDue(subscriptions, { now, withinDays: 1 })) {
    const key = "settle:" + request.subscriptionId + "@" + toLocalDateKey(request.chargeDate);
    if (acks[key]) continue;
    const subscription = subscriptions.find((item) => (item.subscriptionId || item.id) === request.subscriptionId);
    items.push({
      key,
      type: "settlement",
      subscriptionId: request.subscriptionId,
      serviceName: subscription?.name,
      request,
      title: (subscription?.name || "공동 구독") + " 정산 요청 보낼 날",
      body: request.members + "명이 나눠 내요. 1인 " + formatWon(request.perPerson) + "을 요청할 문구를 만들어 뒀어요.",
    });
  }

  const plan = rebuildRotationPlan(rotation, subscriptions);
  if (plan) {
    const inList = new Set(subscriptions.map((subscription) => subscription.subscriptionId || subscription.id));
    for (const reminder of buildRotationReminders(plan, new Date(now.getTime() - DAY_MS))) {
      if (reminder.at - now > 3 * DAY_MS) continue;
      // 이미 해지해 목록에 없는 구독의 해지 알림, 이미 다시 등록한 구독의 가입 알림은 건너뛴다.
      if (reminder.type === "rotation_cancel" && !inList.has(reminder.subscriptionId)) continue;
      if (reminder.type === "rotation_resume" && inList.has(reminder.subscriptionId)) continue;
      const key = "rotation:" + reminder.id;
      if (acks[key]) continue;
      items.push({ key, type: "rotation_due", reminderType: reminder.type, subscriptionId: reminder.subscriptionId, title: reminder.title, body: reminder.body, at: reminder.at });
    }
  } else if (!acks["rotation_suggest"]) {
    const suggestion = rotationSuggestion(subscriptions);
    if (suggestion) {
      items.push({
        key: "rotation_suggest",
        type: "rotation_suggest",
        category: suggestion.category,
        title: suggestion.category + " " + suggestion.candidates.length + "개, 한 달에 하나만 볼까요?",
        body: "돌려 보면 매달 " + formatWon(suggestion.plan.monthlySaving) + ", 1년이면 " + formatWon(suggestion.plan.yearlySaving) + "을 아껴요.",
      });
    }
  }

  return items
    .filter((item) => !(item.type === "cancel_verified" && acks[item.key]))
    .sort((a, b) => (PRIORITY[a.type] ?? 99) - (PRIORITY[b.type] ?? 99));
}

// 앱 밖 로컬 알림으로 예약할 항목(오전 9시). 결제 사전 알림을 다시 예약할 때 함께 건다.
export function buildCareNotifications({ subscriptions = [], cancelHistory = [], rotation = null, now = new Date() } = {}) {
  const list = [];
  for (const record of activeCancelRecords(cancelHistory, subscriptions)) {
    if (record.verification !== "watching") continue;
    const at = verificationDueAt(record);
    if (!at || at <= now) continue;
    list.push({ key: "cancel-check-" + record.subscriptionId + "-" + record.cancelledAt, at, type: "cancel_check", subscriptionId: record.subscriptionId, ...cancelCheckNotification(record) });
  }
  for (const subscription of subscriptions) {
    const at = trialReminderAt(subscription, now);
    if (!at) continue;
    const charge = getNextChargeDate(subscription, now);
    list.push({
      key: "trial-d2-" + (subscription.subscriptionId || subscription.id) + "-" + toLocalDateKey(charge),
      at,
      type: "trial_d2",
      subscriptionId: subscription.subscriptionId || subscription.id,
      title: "[무료체험 D-2] " + subscription.name + " 곧 유료로 바뀌어요",
      body: "체험만 하려면 지금 해지하세요. 눌러서 해지 화면으로 가요.",
    });
  }
  for (const subscription of getSharedSubscriptions(subscriptions)) {
    const request = buildSettlementRequest(subscription, { now });
    const at = new Date(request.chargeDate.getFullYear(), request.chargeDate.getMonth(), request.chargeDate.getDate(), 9, 0, 0, 0);
    if (at <= now) continue;
    list.push({
      key: "settlement-" + request.subscriptionId + "-" + toLocalDateKey(at),
      at,
      type: "settlement_due",
      subscriptionId: request.subscriptionId,
      title: "[정산] " + subscription.name + " 결제일이에요",
      body: "1인 " + formatWon(request.perPerson) + " 정산 요청을 보내 보세요.",
    });
  }
  const plan = rebuildRotationPlan(rotation, subscriptions);
  if (plan) {
    for (const reminder of buildRotationReminders(plan, now)) {
      list.push({ key: reminder.id, at: reminder.at, type: reminder.type, subscriptionId: reminder.subscriptionId, title: reminder.title, body: reminder.body });
    }
  }
  return list;
}
