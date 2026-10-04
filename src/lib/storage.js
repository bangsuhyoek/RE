const KEY_PREFIX = "submate-mvp";

export const storageKeys = {
  subscriptions: `${KEY_PREFIX}:subscriptions`,
  profile: `${KEY_PREFIX}:profile`,
  users: `${KEY_PREFIX}:users`,
  onboardingComplete: `${KEY_PREFIX}:onboarding-complete`,
  savedAmount: `${KEY_PREFIX}:saved-amount`,
  agentApprovals: `${KEY_PREFIX}:agent-approvals`,
  agentMandates: `${KEY_PREFIX}:agent-mandates`,
  cancelHistory: `${KEY_PREFIX}:cancel-history`,
  evidenceCases: `${KEY_PREFIX}:evidence-cases`,
  evidenceConsent: `${KEY_PREFIX}:evidence-consent`,
  cancelReminders: `${KEY_PREFIX}:cancel-reminders`,
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

const MAX_CANCEL_HISTORY = 50;
const MAX_EVIDENCE_CASES = 50;

export const readCancelHistory = () => {
  const list = readStoredValue(storageKeys.cancelHistory, []);
  return Array.isArray(list) ? list : [];
};

/** 해지 완료로 처리한 구독을 남긴다. 해지 뒤에 같은 서비스 결제가 감지되면 증빙으로 쓴다. 카드번호는 끝 4자리만 남긴다. */
export const appendCancelRecord = (subscription, cancelledAt = new Date()) => {
  if (!subscription) return;
  const last4 = String(subscription.paymentMethod || "").match(/\d{4}/g)?.pop() || "";
  const issuer = String(subscription.paymentMethod || "").replace(/[\d•*\-]+/g, " ").replace(/\s+/g, " ").trim();
  const record = {
    id: subscription.id,
    serviceId: subscription.serviceId || subscription.id,
    subscriptionId: subscription.subscriptionId,
    name: subscription.name,
    plan: subscription.plan || "",
    amount: Number(subscription.grossAmount ?? subscription.amount) || 0,
    paymentMethod: [issuer, last4].filter(Boolean).join(" "),
    supportUrl: subscription.supportUrl || null,
    cancelledAt: cancelledAt.toISOString(),
  };
  writeStoredValue(storageKeys.cancelHistory, [record, ...readCancelHistory()].slice(0, MAX_CANCEL_HISTORY));
};

export const readEvidenceCases = () => {
  const cases = readStoredValue(storageKeys.evidenceCases, {});
  return cases && typeof cases === "object" && !Array.isArray(cases) ? cases : {};
};

export const saveEvidenceCase = (evidenceCase) => {
  if (!evidenceCase?.id) return;
  const cases = { ...readEvidenceCases(), [evidenceCase.id]: evidenceCase };
  const trimmed = Object.values(cases)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, MAX_EVIDENCE_CASES);
  writeStoredValue(storageKeys.evidenceCases, Object.fromEntries(trimmed.map((item) => [item.id, item])));
};

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
