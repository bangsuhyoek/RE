const UNKNOWN_PAYMENT_METHODS = new Set([
  "",
  "카드",
  "결제수단",
  "결제 수단",
  "기타카드",
  "기타 카드",
]);

export function normalizePaymentMethod(value = "") {
  const raw = String(value ?? "").trim();
  const normalized = raw.toLowerCase().replace(/\s+/g, "");

  if (!raw) return "";

  const isUnknown = [...UNKNOWN_PAYMENT_METHODS].some(
    (candidate) =>
      candidate.toLowerCase().replace(/\s+/g, "") === normalized
  );

  return isUnknown ? "" : raw;
}

export function hasRecordedPaymentMethod(value = "") {
  return normalizePaymentMethod(value) !== "";
}

export function parseSubscriptionAmount(value) {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");

  if (digits === "") return null;

  const amount = Number(digits);

  if (!Number.isFinite(amount) || amount < 0) return null;

  return amount;
}

export function calculateEqualShare(grossAmount, shareCount) {
  const gross = Number(grossAmount);
  const count = Number(shareCount);

  if (!Number.isFinite(gross) || gross < 0) return 0;
  if (!Number.isInteger(count) || count < 2) return gross;

  return Math.round(gross / count);
}

export function resolveSharingFields({
  grossAmount,
  personalAmount,
  sharingEnabled,
  shareCount,
}) {
  const gross = Number(grossAmount) || 0;

  if (!sharingEnabled) {
    return {
      grossAmount: gross,
      amount: gross,
      sharingEnabled: false,
      shareCount: null,
    };
  }

  const count = Number(shareCount);

  if (!Number.isInteger(count) || count < 2) {
    return {
      grossAmount: gross,
      amount: gross,
      sharingEnabled: false,
      shareCount: null,
    };
  }

  const fallbackAmount = calculateEqualShare(gross, count);
  const requestedAmount = Number(personalAmount);

  return {
    grossAmount: gross,
    amount:
      Number.isFinite(requestedAmount) && requestedAmount >= 0
        ? requestedAmount
        : fallbackAmount,
    sharingEnabled: true,
    shareCount: count,
  };
}

export function normalizeSubscriptionPlan(value = "") {
  const plan = String(value ?? "").trim();
  return plan || "기본 플랜";
}

export function normalizeSourceType(value = "") {
  return ["manual", "image", "sms", "onboarding"].includes(value)
    ? value
    : "manual";
}
