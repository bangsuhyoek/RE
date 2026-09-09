const KEY_PREFIX = "submate-mvp";

export const storageKeys = {
  subscriptions: `${KEY_PREFIX}:subscriptions`,
  profile: `${KEY_PREFIX}:profile`,
  users: `${KEY_PREFIX}:users`,
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

export const removeDemoSubscriptions = (items) =>
  items.filter((subscription) => !String(subscription.subscriptionId || "").startsWith("seed-"));

export const getStoredUsers = () => {
  return readStoredValue(storageKeys.users, []);
};

export const saveUser = (user) => {
  const users = getStoredUsers();
  const existsIndex = users.findIndex((u) => u.accountId?.toLowerCase() === user.accountId?.toLowerCase());
  if (existsIndex >= 0) {
    users[existsIndex] = { ...users[existsIndex], ...user, updatedAt: new Date().toISOString() };
  } else {
    users.push({ ...user, createdAt: new Date().toISOString() });
  }
  writeStoredValue(storageKeys.users, users);
  return user;
};

export const findUser = (accountId) => {
  const users = getStoredUsers();
  return users.find((u) => u.accountId?.toLowerCase() === accountId?.toLowerCase()) || null;
};
