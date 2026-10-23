import { daysUntilCharge, formatWon, getNextChargeDate, toLocalDateKey } from "./dates.js";
import { toMonthlyAmount } from "./subscriptionMath.js";
import { isTrialSubscription } from "./trialGuard.js";
import { unusedStreak } from "./usageCheck.js";

export const AGENT_INSIGHT_DISMISSED_KEY = "submate-mvp:agent-insights:dismissed";
export const AGENT_INSIGHT_SNOOZED_KEY = "submate-mvp:agent-insights:snoozed";

const SNOOZE_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

function getStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

export function readDismissedInsights() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(AGENT_INSIGHT_DISMISSED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeDismissedInsights(list) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(AGENT_INSIGHT_DISMISSED_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  } catch {
    // 스토리지 접근 실패 시 무시
  }
}

export function dismissInsightId(id) {
  if (!id) return;
  const current = new Set(readDismissedInsights());
  current.add(String(id));
  writeDismissedInsights(Array.from(current));
}

export function isInsightDismissed(id) {
  if (!id) return false;
  const list = readDismissedInsights();
  return list.includes(String(id));
}

export function readSnoozedInsights(now = new Date()) {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(AGENT_INSIGHT_SNOOZED_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
    let changed = false;
    const valid = {};
    for (const [id, until] of Object.entries(parsed)) {
      if (typeof until === "number" && until > nowTime) {
        valid[id] = until;
      } else {
        changed = true;
      }
    }
    if (changed) {
      writeSnoozedInsights(valid);
    }
    return valid;
  } catch {
    return {};
  }
}

export function writeSnoozedInsights(record) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(AGENT_INSIGHT_SNOOZED_KEY, JSON.stringify(record && typeof record === "object" ? record : {}));
  } catch {
    // 스토리지 접근 실패 시 무시
  }
}

export function snoozeInsightId(id, now = new Date()) {
  if (!id) return;
  const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const snoozed = readSnoozedInsights(now);
  snoozed[String(id)] = nowTime + SNOOZE_DURATION_MS;
  writeSnoozedInsights(snoozed);
}

export function isInsightSnoozed(id, now = new Date()) {
  if (!id) return false;
  const snoozed = readSnoozedInsights(now);
  return Boolean(snoozed[String(id)]);
}

export function pruneExpiredSnoozes(now = new Date()) {
  return readSnoozedInsights(now);
}

function getSubKey(sub) {
  return String(sub?.subscriptionId || sub?.id || "");
}

function getSubName(sub) {
  return sub?.name || "구독 서비스";
}

function getSubAmount(sub) {
  return Number(sub?.grossAmount ?? sub?.amount) || 0;
}

function isOttCategory(cat = "") {
  const norm = String(cat).trim().toLowerCase();
  return (
    norm === "ott" ||
    norm === "엔터테인먼트" ||
    norm.includes("ott") ||
    norm.includes("스트리밍") ||
    norm.includes("동영상") ||
    norm.includes("영상")
  );
}

function isMusicCategory(cat = "") {
  const norm = String(cat).trim().toLowerCase();
  return (
    norm === "음악" ||
    norm === "music" ||
    norm.includes("음악") ||
    norm.includes("음원")
  );
}

/**
 * Generate proactive insights from subscriptions.
 *
 * @param {Array} subscriptions List of subscriptions
 * @param {Object} [options]
 * @param {Date} [options.now] Current date (KST reference)
 * @param {Object} [options.usageAnswers] Answer history for usageCheck
 * @returns {Array} List of insight objects sorted by priority (high first) then soonest charge date
 */
export function generateAgentInsights(subscriptions = [], options = {}) {
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return [];
  }

  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const usageAnswers = options.usageAnswers || {};

  // Exclude cancelled subscriptions
  const activeSubs = subscriptions.filter((sub) => sub && sub.status !== "cancelled");
  if (activeSubs.length === 0) return [];

  const insights = [];

  // Helper map to quickly find charge date & days for sorting
  const subMeta = new Map();
  for (const sub of activeSubs) {
    const chargeDate = getNextChargeDate(sub, now);
    const days = daysUntilCharge(sub, now);
    const dateKey = toLocalDateKey(chargeDate);
    subMeta.set(sub, { chargeDate, days, dateKey });
  }

  // Rule a: trial_ending
  // Trial ends within 3 days (days >= 0 && days <= 3). Priority high if <= 1 day, else normal.
  for (const sub of activeSubs) {
    if (!isTrialSubscription(sub)) continue;
    const { days, dateKey, chargeDate } = subMeta.get(sub);
    if (days < 0 || days > 3) continue;

    const subId = getSubKey(sub);
    const id = "trial_ending:" + subId + ":" + dateKey;
    const priority = days <= 1 ? "high" : "normal";
    const amountStr = formatWon(getSubAmount(sub));
    const title = getSubName(sub) + " 무료체험이 " + (days === 0 ? "오늘" : days + "일 뒤") + " 끝나요";
    const message = days === 0
      ? "무료체험이 오늘 끝나요. 이후 " + amountStr + "이 결제돼요."
      : "무료체험이 " + days + "일 뒤 끝나요. 이후 " + amountStr + "이 결제돼요.";

    insights.push({
      id,
      kind: "trial_ending",
      title,
      message,
      subscriptionId: subId,
      quickReplies: ["해지 방법 알려줘", "계속 쓰면 1년에 얼마야?"],
      priority,
      _sortDays: days,
      _sortDate: chargeDate,
    });
  }

  // Rule b: annual_renewal
  // 매년 plan renewing within 7 days (days >= 0 && days <= 7). High if <= 2 days, else normal.
  for (const sub of activeSubs) {
    if (sub.billingCycle !== "매년") continue;
    if (isTrialSubscription(sub)) continue;
    const { days, dateKey, chargeDate } = subMeta.get(sub);
    if (days < 0 || days > 7) continue;

    const subId = getSubKey(sub);
    const id = "annual_renewal:" + subId + ":" + dateKey;
    const priority = days <= 2 ? "high" : "normal";
    const amountStr = formatWon(getSubAmount(sub));
    const title = getSubName(sub) + " 연간 구독이 " + (days === 0 ? "오늘" : days + "일 뒤") + " 갱신돼요";
    const message = days === 0
      ? "연간 구독이 오늘 갱신돼요. " + amountStr + "이 결제될 예정이에요."
      : "연간 구독이 " + days + "일 뒤 갱신돼요. " + amountStr + "이 결제될 예정이에요.";

    insights.push({
      id,
      kind: "annual_renewal",
      title,
      message,
      subscriptionId: subId,
      quickReplies: ["연간 구독 해지할래", "월간으로 변경할 수 있어?"],
      priority,
      _sortDays: days,
      _sortDate: chargeDate,
    });
  }

  // Rule c: unused_renewal
  // subscription flagged unused/unconfirmed by usageCheck renewing within 5 days (days >= 0 && days <= 5). Priority high.
  // Flagged unused: answer === 'unused' or unusedStreak > 0
  // Unconfirmed: no answer record for the current/upcoming cycle
  for (const sub of activeSubs) {
    if (isTrialSubscription(sub)) continue;
    if (sub.billingCycle === "매년") continue;
    const { days, dateKey, chargeDate } = subMeta.get(sub);
    if (days < 0 || days > 5) continue;

    const subId = getSubKey(sub);
    const cycleKey = subId + "@" + dateKey;
    const answer = usageAnswers[cycleKey]?.answer;
    const streak = unusedStreak(usageAnswers, sub);

    let isFlagged = false;
    let isUnconfirmed = false;

    if (answer === "unused" || streak > 0) {
      isFlagged = true;
    } else if (!answer) {
      isUnconfirmed = true;
    }

    if (isFlagged || isUnconfirmed) {
      const id = "unused_renewal:" + subId + ":" + dateKey;
      const amountStr = formatWon(getSubAmount(sub));
      const title = isFlagged
        ? "거의 안 쓴 " + getSubName(sub) + " 결제일이 다가와요"
        : getSubName(sub) + " 이번 달 잘 쓰셨나요?";
      const message = isFlagged
        ? "최근 잘 쓰지 않는다고 답하신 " + getSubName(sub) + "이 " + (days === 0 ? "오늘" : days + "일 뒤") + " 결제돼요 (" + amountStr + "). 해지할까요?"
        : (days === 0 ? "오늘" : days + "일 뒤") + " " + getSubName(sub) + " " + amountStr + "이 결제돼요. 계속 이용하시나요?";

      insights.push({
        id,
        kind: "unused_renewal",
        title,
        message,
        subscriptionId: subId,
        quickReplies: ["지금 해지할래", "계속 쓸게"],
        priority: "high",
        _sortDays: days,
        _sortDate: chargeDate,
      });
    }
  }

  // Rule d: duplicate_category
  // 2+ active subscriptions in the same category among OTT or music (normal priority).
  // Mention names and combined monthly amount.
  const ottSubs = [];
  const musicSubs = [];

  for (const sub of activeSubs) {
    if (isOttCategory(sub.category)) {
      ottSubs.push(sub);
    } else if (isMusicCategory(sub.category)) {
      musicSubs.push(sub);
    }
  }

  const checkDuplicateGroup = (groupSubs, catLabel, catKey) => {
    if (groupSubs.length < 2) return;
    const names = groupSubs.map(getSubName).join(", ");
    const combinedAmount = groupSubs.reduce((sum, s) => {
      return sum + toMonthlyAmount(s);
    }, 0);
    const amountStr = formatWon(combinedAmount);

    const ids = groupSubs.map(getSubKey).sort().join("-");
    const id = "duplicate_category:" + catKey + ":" + ids;

    let earliestDays = Infinity;
    let earliestDate = null;
    for (const sub of groupSubs) {
      const { days, chargeDate } = subMeta.get(sub);
      if (days < earliestDays) {
        earliestDays = days;
        earliestDate = chargeDate;
      }
    }

    insights.push({
      id,
      kind: "duplicate_category",
      title: catLabel + " 구독이 " + groupSubs.length + "개 있어요",
      message: names + "을 함께 이용 중이에요. 월 총 " + amountStr + "이 나가고 있어요.",
      subscriptionId: getSubKey(groupSubs[0]),
      quickReplies: ["하나만 남기고 정리할래", "구독 순환 계획 세워줘"],
      priority: "normal",
      _sortDays: earliestDays === Infinity ? 999 : earliestDays,
      _sortDate: earliestDate || now,
    });
  };

  checkDuplicateGroup(ottSubs, "OTT", "ott");
  checkDuplicateGroup(musicSubs, "음악", "music");

  // Rule e: price_changed
  // Only if subscriptions carry price history/originalAmount vs amount.
  for (const sub of activeSubs) {
    const original = sub?.originalAmount != null ? Number(sub.originalAmount) : null;
    const current = Number(sub?.grossAmount ?? sub?.amount) || 0;

    if (original !== null && !Number.isNaN(original) && original !== current && original > 0) {
      const { days, dateKey, chargeDate } = subMeta.get(sub);
      const subId = getSubKey(sub);
      const diff = current - original;
      const isIncrease = diff > 0;
      const id = "price_changed:" + subId + ":" + dateKey;
      const title = isIncrease
        ? getSubName(sub) + " 요금이 올랐어요"
        : getSubName(sub) + " 요금이 내렸어요";
      const message = isIncrease
        ? "기존 " + formatWon(original) + "에서 " + formatWon(current) + "으로 " + formatWon(diff) + " 인상되었어요."
        : "기존 " + formatWon(original) + "에서 " + formatWon(current) + "으로 " + formatWon(Math.abs(diff)) + " 인하되었어요.";

      insights.push({
        id,
        kind: "price_changed",
        title,
        message,
        subscriptionId: subId,
        quickReplies: isIncrease ? ["다른 요금제 있어?", "해지 방법 알려줘"] : ["요금제 확인해줘"],
        priority: isIncrease ? "high" : "normal",
        _sortDays: days,
        _sortDate: chargeDate,
      });
    }
  }

  // Sort: high first, then soonest date (_sortDays ascending)
  insights.sort((a, b) => {
    if (a.priority === "high" && b.priority !== "high") return -1;
    if (a.priority !== "high" && b.priority === "high") return 1;
    if (a._sortDays !== b._sortDays) return a._sortDays - b._sortDays;
    return a.id.localeCompare(b.id);
  });

  // Clean up private sort fields
  for (const insight of insights) {
    delete insight._sortDays;
    delete insight._sortDate;
  }

  return insights;
}
