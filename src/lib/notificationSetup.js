export const NOTIFICATION_SETUP_STORAGE_KEY = "submate-mvp:notification-setup:v1";
export const NOTIFICATION_SETUP_SESSION_PREFIX = "submate-mvp:notification-setup-seen:";

export function getNotificationSetupIdentity(profile = {}) {
  if (profile?.user_id) return `google:${profile.user_id}`;
  if (profile?.accountId) return `local:${String(profile.accountId).trim().toLowerCase()}`;
  if (profile?.provider && profile?.nickname) {
    return `${String(profile.provider).toLowerCase()}:${String(profile.nickname).trim().toLowerCase()}`;
  }
  return "";
}

function readSetupMap() {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(NOTIFICATION_SETUP_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readNotificationSetup(profile) {
  const identity = getNotificationSetupIdentity(profile);
  if (!identity) return null;
  return readSetupMap()[identity] || null;
}

export function writeNotificationSetup(profile, patch = {}) {
  const identity = getNotificationSetupIdentity(profile);
  if (!identity || typeof window === "undefined") return null;
  const map = readSetupMap();
  const next = {
    ...(map[identity] || {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  map[identity] = next;
  try {
    window.localStorage.setItem(NOTIFICATION_SETUP_STORAGE_KEY, JSON.stringify(map));
  } catch {}
  return next;
}

export function wasNotificationSetupSeenThisSession(profile) {
  const identity = getNotificationSetupIdentity(profile);
  if (!identity || typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(NOTIFICATION_SETUP_SESSION_PREFIX + identity) === "1";
  } catch {
    return false;
  }
}

export function markNotificationSetupSeenThisSession(profile) {
  const identity = getNotificationSetupIdentity(profile);
  if (!identity || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(NOTIFICATION_SETUP_SESSION_PREFIX + identity, "1");
  } catch {}
}

export function clearNotificationSetupSeenThisSession(profile) {
  const identity = getNotificationSetupIdentity(profile);
  if (!identity || typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(NOTIFICATION_SETUP_SESSION_PREFIX + identity);
  } catch {}
}

export function shouldShowNotificationSetup({
  profile,
  permission,
  record,
  seenThisSession = false,
} = {}) {
  if (!profile || profile.guest || profile.contestDemo || seenThisSession) return false;
  if (!record?.completed) return true;
  if (permission === "default" || permission === "denied") return true;
  return false;
}
