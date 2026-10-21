import { getNextChargeDate, daysUntilCharge } from "./dates.js";
import { resolvePaymentChannel } from "./cancelRoutes.js";

function isValidDate(d) {
  return d instanceof Date && !isNaN(d.getTime());
}

function formatKoreanDate(date) {
  if (!isValidDate(date)) return "";
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/**
 * 해지 타이밍 엔진 (Termination Timing Engine)
 *
 * @param {Object} params
 * @param {Object} params.subscription
 * @param {Object|null} [params.policy]
 * @param {Date} [params.now]
 * @returns {{
 *   kind: "keep_until" | "prorated_refund" | "immediate_loss" | "penalty" | "trial" | "unknown",
 *   accessUntil: Date | null,
 *   daysLeft: number | null,
 *   headline: string,
 *   detail: string | null,
 *   reminderAt: Date | null,
 *   reminderLabel: string | null,
 *   sourceUrl: string | null,
 *   checkedAt: string | null
 * }}
 */
export function getCancelTimingAdvice({ subscription = {}, policy = null, now = new Date() }) {
  const channel = resolvePaymentChannel(subscription);
  const isStore = channel === "google_play" || channel === "app_store";

  // Effective cancel type:
  // if resolvePaymentChannel(subscription) is 'google_play' or 'app_store' -> period_end
  // else policy?.cancelType; if no policy -> 'unknown'
  let effectiveType;
  if (isStore) {
    effectiveType = "period_end";
  } else if (policy?.cancelType) {
    effectiveType = policy.cancelType;
  } else {
    effectiveType = "unknown";
  }

  const isTrial = Boolean(subscription.isTrial || subscription.status === "trial");

  // Guard against dueDay null/0/"" producing bogus last-day-of-previous-month dates
  const hasValidDueDay =
    subscription?.dueDay !== null &&
    subscription?.dueDay !== undefined &&
    subscription?.dueDay !== "" &&
    !isNaN(Number(subscription.dueDay)) &&
    Number(subscription.dueDay) >= 1 &&
    Number(subscription.dueDay) <= 31;

  const hasValidNextBillingDate =
    Boolean(subscription?.nextBillingDate) &&
    isValidDate(new Date(subscription.nextBillingDate));

  const hasKnownBillingDate = hasValidDueDay || hasValidNextBillingDate;

  // Next charge date computation
  let nextDate = null;
  let daysLeft = null;
  if (hasKnownBillingDate) {
    const dateParts = typeof subscription?.nextBillingDate === "string"
      ? subscription.nextBillingDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
      : null;
    const derivedDay = dateParts ? Number(dateParts[3]) : (hasValidNextBillingDate ? new Date(subscription.nextBillingDate).getDate() : null);
    const subForDate = (!hasValidDueDay && derivedDay)
      ? { ...subscription, dueDay: derivedDay }
      : subscription;
  try {
      const candidate = getNextChargeDate(subForDate, now);
    if (isValidDate(candidate)) {
      nextDate = candidate;
        const days = daysUntilCharge(subForDate, now);
      daysLeft = typeof days === "number" && !isNaN(days) ? days : null;
    }
  } catch {
    nextDate = null;
    daysLeft = null;
  }
  }

  // sourceUrl: store subscriptions sourceUrl null unless policy provides one
  const sourceUrl = policy?.sourceUrl || null;
  const checkedAt = policy?.checkedAt || null;
  const detail = policy?.summary || (isStore ? "스토어 결제 구독은 해지해도 남은 기간 끝까지 이용할 수 있어요." : null);

  let kind;
  let headline;
  let reminderAt = null;
  let reminderLabel = null;

  if (isTrial) {
    kind = "trial";
    headline = "무료체험이 끝나기 전에 해지하면 첫 결제가 진행되지 않아요.";
    reminderAt = null;
    reminderLabel = null;
  } else if (effectiveType === "period_end") {
    kind = "keep_until";
    if (daysLeft === 0) {
      headline = "오늘이 결제일이에요. 이미 결제됐다면 다음 결제일까지 이용할 수 있어요";
    } else if (nextDate) {
      headline = `지금 해지해도 ${formatKoreanDate(nextDate)}까지 이용할 수 있어요`;
    } else {
      headline = "지금 해지해도 이용 기간 끝까지 유지돼요";
    }
    reminderAt = null;
    reminderLabel = null;
  } else if (effectiveType === "immediate_prorated") {
    kind = "prorated_refund";
    headline = "지금 해지하면 이용이 바로 종료되고 남은 기간은 일할 계산되어 환불돼요.";
    reminderAt = null;
    reminderLabel = null;
  } else if (effectiveType === "immediate_loss") {
    kind = "immediate_loss";
    if (daysLeft === 0) {
      headline = "오늘이 결제일이에요. 결제 전이라면 지금 해지해야 다음 결제를 막을 수 있어요";
      reminderAt = null;
      reminderLabel = null;
    } else if (daysLeft !== null && daysLeft !== undefined) {
      headline = `지금 해지하면 남은 ${daysLeft}일 이용권이 환불 없이 즉시 종료돼요.`;
      if (nextDate) {
        reminderAt = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate() - 1, 9, 0, 0);
        reminderLabel = "결제일 전날 오전 9시에 알려드릴게요";
      }
    } else {
      headline = "지금 해지하면 남은 이용권이 환불 없이 즉시 종료돼요.";
    }
  } else if (effectiveType === "contract_penalty") {
    kind = "penalty";
    headline = "약정 기간 중 해지 시 위약금이 발생할 수 있어요.";
    if (nextDate) {
      reminderAt = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate() - 7, 9, 0, 0);
      reminderLabel = "갱신 7일 전 오전 9시에 알려드릴게요";
    }
  } else {
    // unknown
    kind = "unknown";
    headline = "해지 시점의 이용 기간 유지나 환불 규정을 확인해 주세요.";
    if (subscription.billingCycle === "매년" && nextDate) {
      reminderAt = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate() - 7, 9, 0, 0);
      reminderLabel = "갱신 7일 전 오전 9시에 알려드릴게요";
    }
  }

  // Conditional policies: when policy.headline is present and effective type comes from policy
  // (not store override, not trial), use policy.headline instead of the generated one.
  if (!isTrial && !isStore && policy?.headline && typeof policy.headline === "string") {
    headline = policy.headline;
  }

  // If reminderAt <= now, set reminderAt null
  if (reminderAt && reminderAt.getTime() <= now.getTime()) {
    reminderAt = null;
    reminderLabel = null;
  }

  const accessUntil = (kind === "keep_until" && daysLeft > 0) ? nextDate : null;

  return {
    kind,
    accessUntil,
    daysLeft,
    headline,
    detail,
    reminderAt,
    reminderLabel,
    sourceUrl,
    checkedAt,
  };
}
