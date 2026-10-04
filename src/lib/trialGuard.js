import { daysUntilCharge, getNextChargeDate, formatWon, toLocalDateKey } from "./dates.js";

// 무료체험 가드: 체험이 유료로 바뀌기 전에 미리 알리고 해지 화면으로 바로 보낸다.
const TRIAL_TEXT = /(무료\s*체험|무료\s*이용|체험\s*기간|체험판|free\s*trial|trial\s*period|첫\s*(달|\d+\s*개월)\s*(무료|0\s*원)|0\s*원\s*(체험|이용))/i;
const DATE_TEXT = /(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/g;

export const isTrialSubscription = (subscription) => Boolean(subscription?.isTrial || subscription?.status === "trial");

// 공유받은 글에서 무료체험 가입인지와 체험이 끝나는 날을 찾는다. 날짜가 여러 개면 가장 늦은 미래 날짜를 쓴다.
export function detectTrialText(text = "", now = new Date()) {
  const raw = String(text);
  if (!TRIAL_TEXT.test(raw)) return { isTrial: false };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let trialEndsOn = null;
  for (const match of raw.matchAll(DATE_TEXT)) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (Number.isNaN(date.getTime()) || date < today) continue;
    if (!trialEndsOn || date > trialEndsOn) trialEndsOn = date;
  }
  return { isTrial: true, trialEndsOn };
}

export const trialAckKey = (subscription, now = new Date()) =>
  (subscription.subscriptionId || subscription.id) + "@" + toLocalDateKey(getNextChargeDate(subscription, now));

// 홈 '오늘 챙길 일'용: 유료 전환 3일 전부터 보여준다. 사용자가 '계속 쓸게요'를 고르면 이번 전환은 숨긴다.
export function trialGuardItems(subscriptions = [], acks = {}, now = new Date()) {
  return subscriptions
    .filter((subscription) => isTrialSubscription(subscription) && subscription.status !== "cancelled")
    .map((subscription) => ({ subscription, days: daysUntilCharge(subscription, now) }))
    .filter(({ subscription, days }) => days >= 0 && days <= 3 && !acks[trialAckKey(subscription, now)])
    .map(({ subscription, days }) => {
      const date = getNextChargeDate(subscription, now);
      const when = days === 0 ? "오늘" : days === 1 ? "내일" : (date.getMonth() + 1) + "월 " + date.getDate() + "일";
      const price = Number(subscription.amount) > 0 ? formatWon(subscription.amount) + "으로" : "유료로";
      return {
        key: "trial:" + trialAckKey(subscription, now),
        ackKey: trialAckKey(subscription, now),
        type: "trial_guard",
        subscriptionId: subscription.subscriptionId || subscription.id,
        serviceName: subscription.name,
        days,
        title: subscription.name + " 무료체험 " + (days === 0 ? "오늘 끝나요" : "D-" + days),
        body: when + " " + price + " 바뀌어요. 체험만 하려면 지금 해지하세요.",
      };
    });
}

// 앱 밖 알림: 유료 전환 2일 전 오전 9시.
export function trialReminderAt(subscription, now = new Date()) {
  if (!isTrialSubscription(subscription)) return null;
  const date = getNextChargeDate(subscription, now);
  const at = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 2, 9, 0, 0, 0);
  return at > now ? at : null;
}

