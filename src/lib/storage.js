const KEY_PREFIX = "submate-mvp";

export const storageKeys = {
  subscriptions: `${KEY_PREFIX}:subscriptions`,
  profile: `${KEY_PREFIX}:profile`,
  onboardingComplete: `${KEY_PREFIX}:onboarding-complete`,
  introSeen: `${KEY_PREFIX}:intro-seen`,
  savedAmount: `${KEY_PREFIX}:saved-amount`,
  cancellationHistory: `${KEY_PREFIX}:cancellation-history`,
};

export const readStoredValue = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const writeStoredValue = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const clearStoredValue = (key) => {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

// 이전 개발 버전에서 남아 있을 수 있는 seed 데이터만 마이그레이션 단계에서 제거합니다.
// 새 운영 코드에서는 seed/mock 구독을 생성하지 않습니다.
export const removeDemoSubscriptions = (items) =>
  (Array.isArray(items) ? items : []).filter((subscription) => !String(subscription.subscriptionId || "").startsWith("seed-"));

export const sanitizeCancellationHistory = (items) =>
  (Array.isArray(items) ? items : []).filter((item) => item && !String(item.subscriptionId || "").startsWith("seed-"));
