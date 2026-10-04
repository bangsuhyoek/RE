import { getNextChargeDate, formatWon } from "./dates.js";

// 해지 확인 루프: 해지 완료로 표시한 구독의 다음 결제일을 지켜보고, 결제가 없으면 해지를 확정한다.
// 결제 알림 감지를 켠 사용자는 꾸독이 스스로 확인하고, 아니면 결제일이 지난 뒤 한 번만 물어본다.
// 꾸독은 결제를 막거나 되돌리지 않는다. 결제가 찍히면 기존 '해지 후 결제' 경고(증빙·환불 요청)로 넘긴다.

export const VERIFY_GRACE_DAYS = 2;
const DAY_MS = 86_400_000;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// 해지한 날에 이미 결제됐을 수 있으므로 다음 날부터 본 다음 결제일을 지켜본다.
export function expectedChargeAfterCancel(subscription, cancelledAt = new Date()) {
  if (!subscription?.dueDay && !subscription?.nextBillingDate) return null;
  const nextDay = new Date(startOfDay(cancelledAt).getTime() + DAY_MS);
  return getNextChargeDate(subscription, nextDay);
}

export const recordKey = (record) => (record?.subscriptionId || record?.id || "") + "@" + (record?.cancelledAt || "");

export function verificationDueAt(record) {
  if (!record?.expectedChargeOn) return null;
  const base = startOfDay(new Date(record.snoozeUntil || record.expectedChargeOn));
  const days = record.snoozeUntil ? 0 : VERIFY_GRACE_DAYS;
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days, 9, 0, 0, 0);
}

// 시각이 된 확인 대상을 처리한다. captureEnabled면 결제 감지가 없었으므로 확정, 아니면 질문으로 바꾼다.
export function reviewCancelVerifications(history = [], { now = new Date(), captureEnabled = false } = {}) {
  const events = [];
  const next = history.map((record) => {
    if (record.verification !== "watching") return record;
    const dueAt = verificationDueAt(record);
    if (!dueAt || now < dueAt) return record;
    if (captureEnabled) {
      const updated = { ...record, verification: "verified", verifiedBy: "no_payment_detected", verifiedAt: now.toISOString() };
      events.push({ kind: "verified", record: updated });
      return updated;
    }
    const updated = { ...record, verification: "asking", askedAt: now.toISOString() };
    events.push({ kind: "ask", record: updated });
    return updated;
  });
  return { history: next, events };
}

export function answerCancelCheck(history = [], key, answer, now = new Date()) {
  let changed = null;
  const next = history.map((record) => {
    if (recordKey(record) !== key) return record;
    if (answer === "no_charge") changed = { ...record, verification: "verified", verifiedBy: "user", verifiedAt: now.toISOString() };
    else if (answer === "charged") changed = { ...record, verification: "charged", chargedAt: now.toISOString() };
    else if (answer === "later") {
      const tomorrow = new Date(startOfDay(now).getTime() + DAY_MS);
      changed = { ...record, verification: "watching", snoozeUntil: tomorrow.toISOString() };
    } else return record;
    return changed;
  });
  return { history: next, record: changed };
}

// 해지 후 결제가 감지된 기록을 '결제됨'으로 바꾼다.
export function markRecordCharged(history = [], target, chargedAt = new Date()) {
  if (!target) return history;
  const key = recordKey(target);
  return history.map((record) => (recordKey(record) === key && record.verification !== "charged"
    ? { ...record, verification: "charged", chargedAt: chargedAt.toISOString() }
    : record));
}

const shortDate = (date) => (date.getMonth() + 1) + "월 " + date.getDate() + "일";

// 홈 '오늘 챙길 일'에 보여줄 항목. 확정된 기록은 7일 동안만 보여준다.
export function cancelCheckItems(history = [], now = new Date()) {
  const items = [];
  for (const record of history) {
    if (!record.verification || !record.expectedChargeOn) continue;
    const charge = new Date(record.expectedChargeOn);
    const base = { key: recordKey(record), record, serviceName: record.name, amount: record.amount };
    if (record.verification === "watching") {
      const dueAt = verificationDueAt(record);
      items.push({ ...base, type: "cancel_watching", title: record.name + " 해지 확인 중", body: shortDate(charge) + " 결제일까지 결제가 없는지 지켜볼게요.", dueAt });
    } else if (record.verification === "asking") {
      items.push({ ...base, type: "cancel_ask", title: record.name + " 해지됐는지 확인해 주세요", body: shortDate(charge) + " 결제일이 지났어요. " + record.name + " 결제 문자나 알림이 왔나요?" });
    } else if (record.verification === "verified" && now - new Date(record.verifiedAt) < 7 * DAY_MS) {
      items.push({ ...base, type: "cancel_verified", title: record.name + " 해지 확인 완료", body: "결제일이 지나도 결제가 없었어요. 매달 " + formatWon(record.amount) + "을 아끼고 있어요." });
    } else if (record.verification === "charged" && now - new Date(record.chargedAt) < 30 * DAY_MS) {
      items.push({ ...base, type: "cancel_charged", title: record.name + " 해지 후 결제됨", body: "환불 요청 문구와 증빙을 준비해 뒀어요." });
    }
  }
  return items;
}

export function cancelCheckNotification(record) {
  return {
    title: "[해지 확인] " + record.name + " 결제일이 지났어요",
    body: "해지가 잘 됐는지 꾸독에서 확인해 주세요.",
  };
}

