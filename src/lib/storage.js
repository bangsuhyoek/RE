import { expectedChargeAfterCancel } from "./cancelVerification.js";

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
  usageAnswers: `${KEY_PREFIX}:usage-answers`,
  careAcks: `${KEY_PREFIX}:care-acks`,
  rotationPlan: `${KEY_PREFIX}:rotation-plan`,
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
    // 해지 확인 루프: 다음 결제일까지 결제가 없는지 지켜본다.
    expectedChargeOn: expectedChargeAfterCancel(subscription, cancelledAt)?.toISOString() || null,
    verification: expectedChargeAfterCancel(subscription, cancelledAt) ? "watching" : null,
  };
  const svcKey = record.serviceId || record.id;
  const subKey = record.subscriptionId;
  const existing = readCancelHistory().filter((item) => {
    if (item.verification !== "watching") return true;
    if (subKey && item.subscriptionId === subKey) return false;
    if (svcKey && (item.serviceId === svcKey || item.id === svcKey)) return false;
    return true;
  });
  writeStoredValue(storageKeys.cancelHistory, [record, ...existing].slice(0, MAX_CANCEL_HISTORY));
};

export const writeCancelHistory = (list) => {
  writeStoredValue(storageKeys.cancelHistory, Array.isArray(list) ? list.slice(0, MAX_CANCEL_HISTORY) : []);
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

/**
 * 로컬 계정 데이터 정리 및 게스트 전환 마이그레이션.
 * 기기 내 아이디·비밀번호 로그인 및 하드코딩 테스트 계정 제거:
 * 저장된 로컬 계정의 비밀번호 필드를 삭제하고, 기존 구독 데이터는 게스트 데이터로 보존(손실 금지)한다.
 */
export const migrateLocalUsersToGuest = () => {
  const users = readStoredValue(storageKeys.users, []);
  if (Array.isArray(users) && users.length > 0) {
    let changed = false;
    const sanitized = users.map((u) => {
      if (u.password !== undefined) {
        changed = true;
        const { password, ...rest } = u;
        return rest;
      }
      return u;
    });
    if (changed) {
      writeStoredValue(storageKeys.users, sanitized);
    }
  }

  // 만약 현재 프로필이 로컬 아이디 로그인(provider === "꾸독" or !isGoogle && !guest)이었다면
  // 구독 데이터 손실 없이 게스트 프로필로 승계/보존
  const profile = readStoredValue(storageKeys.profile, null);
  if (profile && profile.provider === "꾸독" && !profile.user_id) {
    writeStoredValue(storageKeys.profile, {
      ...profile,
      provider: "Guest",
      guest: true,
      nickname: profile.nickname || "게스트",
    });
  }
};

