const KEY_PREFIX = "submate-mvp";

export const storageKeys = {
  subscriptions: `${KEY_PREFIX}:subscriptions`,
  profile: `${KEY_PREFIX}:profile`,
  onboardingComplete: `${KEY_PREFIX}:onboarding-complete`,
  savedAmount: `${KEY_PREFIX}:saved-amount`,
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
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const clearStoredValue = (key) => {
  window.localStorage.removeItem(key);
};
