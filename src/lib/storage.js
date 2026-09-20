const KEY_PREFIX = "submate-mvp";
const CONTEST_DEMO_PREFIX = "submate-contest-demo";
export const CONTEST_DEMO_ACTIVE_KEY = "submate-contest-demo:active";

export const isContestDemoActive = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CONTEST_DEMO_ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
};

export const setContestDemoActive = (active) => {
  if (typeof window === "undefined") return;
  try {
    if (active) window.localStorage.setItem(CONTEST_DEMO_ACTIVE_KEY, "1");
    else window.localStorage.removeItem(CONTEST_DEMO_ACTIVE_KEY);
  } catch {}
};

const currentPrefix = () => (isContestDemoActive() ? CONTEST_DEMO_PREFIX : KEY_PREFIX);

export const storageKeys = {
  get subscriptions() { return `${currentPrefix()}:subscriptions`; },
  get profile() { return `${currentPrefix()}:profile`; },
  get users() { return `${currentPrefix()}:users`; },
  get onboardingComplete() { return `${currentPrefix()}:onboarding-complete`; },
  get savedAmount() { return `${currentPrefix()}:saved-amount`; },
};

export const contestDemoStorageKeys = Object.freeze({
  subscriptions: `${CONTEST_DEMO_PREFIX}:subscriptions`,
  profile: `${CONTEST_DEMO_PREFIX}:profile`,
  users: `${CONTEST_DEMO_PREFIX}:users`,
  onboardingComplete: `${CONTEST_DEMO_PREFIX}:onboarding-complete`,
  savedAmount: `${CONTEST_DEMO_PREFIX}:saved-amount`,
});

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

export const resetContestDemoStorage = () => {
  if (typeof window === "undefined") return;
  for (const key of Object.values(contestDemoStorageKeys)) {
    try { window.localStorage.removeItem(key); } catch {}
  }
};

export const removeDemoSubscriptions = (items) =>
  items.filter((subscription) => !String(subscription.subscriptionId || "").startsWith("seed-"));

export const DEFAULT_USERS = [
  {
    accountId: "testuser",
    password: "test1234!",
    nickname: "테스트유저",
    createdAt: "2026-09-16T00:00:00.000Z",
  },
  {
    accountId: "test",
    password: "test1234!",
    nickname: "테스트",
    createdAt: "2026-09-16T00:00:00.000Z",
  },
  {
    accountId: "submate",
    password: "test1234!",
    nickname: "섭메이트",
    createdAt: "2026-09-16T00:00:00.000Z",
  },
];

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
  const found = users.find((u) => u.accountId?.toLowerCase() === accountId?.toLowerCase());
  if (found) return found;
  return DEFAULT_USERS.find((u) => u.accountId?.toLowerCase() === accountId?.toLowerCase()) || null;
};
