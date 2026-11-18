const MAX_SUBSCRIPTIONS = 100;
const MAX_ID_LENGTH = 120;
const MAX_NAME_LENGTH = 120;
const MAX_SHORT_TEXT_LENGTH = 80;
const MAX_USAGE_LENGTH = 80;
const MAX_AMOUNT = 1_000_000_000_000;
const USAGE_STATUSES = new Set(["unused", "used", "unanswered"]);

const isDateString = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const optionalString = (value, maxLength) => {
  if (value === undefined || value === null) return undefined;
  return String(value).trim().slice(0, maxLength) || undefined;
};

const optionalAmount = (value) => {
  if (value === undefined || value === null) return undefined;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT) return undefined;
  return amount;
};

/**
 * Validates the client snapshot and strips fields the chat tools do not use.
 * Alert flags and usage text are strict because the model relies on them as facts.
 */
export function normalizeChatSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { ok: false, error: "유효한 구독 스냅샷이 필요합니다." };
  }
  if (!Array.isArray(snapshot.subscriptions)) {
    return { ok: false, error: "유효한 구독 스냅샷이 필요합니다." };
  }
  if (snapshot.today !== undefined && !isDateString(snapshot.today)) {
    return { ok: false, error: "오늘 날짜 형식(YYYY-MM-DD)이 올바르지 않습니다." };
  }
  if (snapshot.subscriptions.length > MAX_SUBSCRIPTIONS) {
    return { ok: false, error: `구독 개수가 제한(${MAX_SUBSCRIPTIONS}개)을 초과했습니다.` };
  }

  const subscriptions = [];
  for (const raw of snapshot.subscriptions) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, error: "구독 스냅샷 항목의 형식이 올바르지 않습니다." };
    }

    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    if (!id || id.length > MAX_ID_LENGTH) {
      return { ok: false, error: "구독 ID가 없거나 너무 깁니다." };
    }
    if (raw.alertD3 !== undefined && typeof raw.alertD3 !== "boolean") {
      return { ok: false, error: "alertD3는 boolean이어야 합니다." };
    }
    if (raw.alertD1 !== undefined && typeof raw.alertD1 !== "boolean") {
      return { ok: false, error: "alertD1은 boolean이어야 합니다." };
    }
    if (raw.usage !== undefined && raw.usage !== null) {
      if (typeof raw.usage !== "string") {
        return { ok: false, error: "usage는 문자열이어야 합니다." };
      }
      if (raw.usage.length > MAX_USAGE_LENGTH) {
        return { ok: false, error: `usage는 ${MAX_USAGE_LENGTH}자 이하여야 합니다.` };
      }
    }
    if (raw.usageStatus !== undefined && !USAGE_STATUSES.has(raw.usageStatus)) {
      return { ok: false, error: "usageStatus가 올바르지 않습니다." };
    }

    subscriptions.push({
      id,
      name: optionalString(raw.name, MAX_NAME_LENGTH) || "",
      serviceId: optionalString(raw.serviceId, MAX_ID_LENGTH),
      category: optionalString(raw.category, MAX_SHORT_TEXT_LENGTH),
      plan: optionalString(raw.plan, MAX_NAME_LENGTH),
      amount: optionalAmount(raw.amount) ?? 0,
      grossAmount: optionalAmount(raw.grossAmount),
      billingCycle: raw.billingCycle === "매년" ? "매년" : "매월",
      nextChargeDate: isDateString(raw.nextChargeDate) ? raw.nextChargeDate : null,
      paymentMethod: optionalString(raw.paymentMethod, MAX_SHORT_TEXT_LENGTH),
      status: optionalString(raw.status, 30) || "active",
      trialEndDate: isDateString(raw.trialEndDate) ? raw.trialEndDate : undefined,
      cancelUrl: optionalString(raw.cancelUrl, 300),
      alertD3: raw.alertD3,
      alertD1: raw.alertD1,
      usage: raw.usage ?? undefined,
      usageStatus: raw.usageStatus || (raw.usage ? "unused" : "unanswered"),
    });
  }

  return {
    ok: true,
    value: {
      ...(snapshot.today ? { today: snapshot.today } : {}),
      subscriptions,
    },
  };
}

export const CHAT_SNAPSHOT_LIMITS = {
  MAX_SUBSCRIPTIONS,
  MAX_ID_LENGTH,
  MAX_NAME_LENGTH,
  MAX_USAGE_LENGTH,
};
