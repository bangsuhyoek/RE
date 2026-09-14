const Capacitor = window.Capacitor || { isNativePlatform: () => false, Plugins: {} };
const Browser = Capacitor.Plugins?.Browser || { open: async ({ url }) => window.open(url, "_blank", "noopener,noreferrer"), close: async () => {} };
import { summarizeSpending, mapSubscription, projectCharges, toIsoDate } from "./finance.js";
import {
  cancelBillingReminders,
  cancelCustomReminder,
  checkLocalNotificationPermission,
  checkPaymentCapturePermission,
  getPaymentCandidates,
  installNativeDeepLinks,
  openExternalUrl,
  removePaymentCandidate,
  requestLocalNotificationPermission,
  requestPaymentCapturePermission,
  scheduleBillingReminders,
  scheduleCustomReminder,
  setPaymentCandidateNotifications,
} from "./native.js";
import { recognizeReceipt } from "./ocr.js";

const supabaseUrl = "https://ssukvsphufvdaanqlmgj.supabase.co";
const supabaseKey = "sb_publishable_-8ZiIbmg-eWnMei69Q958A_fpDwu3H8";
const configured = /^https:\/\/.+\.supabase\.co$/i.test(supabaseUrl) && supabaseKey.length > 20;
const rememberSessionKey = "re.auth.remember-session";
const pendingLegalKey = "re.auth.pending-legal";
const pendingOAuthModeKey = "re.auth.pending-oauth-mode";
const nativeAuthCallbackUrl = "reapp://auth/callback";
let rememberSession = (() => {
  try { return window.localStorage.getItem(rememberSessionKey) !== "false"; }
  catch (_error) { return true; }
})();

function browserStorage(mode) {
  try { return mode === "persistent" ? window.localStorage : window.sessionStorage; }
  catch (_error) { return null; }
}

function setRememberSession(enabled) {
  rememberSession = Boolean(enabled);
  try { window.localStorage.setItem(rememberSessionKey, String(rememberSession)); }
  catch (_error) {}
}

function pendingAuthStorage() {
  return browserStorage(rememberSession ? "persistent" : "session");
}

function storePendingLegalAcceptance(legal) {
  const terms = legal?.terms;
  const privacy = legal?.privacy;
  const valid = [terms, privacy].every((item) => item && String(item.version || "").trim() && /^\d{4}-\d{2}-\d{2}$/.test(String(item.effectiveDate || "")));
  if (!valid) throw new Error("승인된 약관 정보가 필요합니다.");
  pendingAuthStorage()?.setItem(pendingLegalKey, JSON.stringify({ terms, privacy }));
}

function readPendingLegalAcceptance() {
  const stores = [pendingAuthStorage(), browserStorage("persistent"), browserStorage("session")].filter(Boolean);
  for (const storage of stores) {
    try {
      const value = storage.getItem(pendingLegalKey);
      if (value) return JSON.parse(value);
    } catch (_error) {}
  }
  return null;
}

function clearPendingLegalAcceptance() {
  browserStorage("persistent")?.removeItem(pendingLegalKey);
  browserStorage("session")?.removeItem(pendingLegalKey);
}

function storePendingOAuthMode(mode) {
  pendingAuthStorage()?.setItem(pendingOAuthModeKey, mode === "register" ? "register" : "login");
}

function readPendingOAuthMode() {
  return pendingAuthStorage()?.getItem(pendingOAuthModeKey)
    || browserStorage("persistent")?.getItem(pendingOAuthModeKey)
    || browserStorage("session")?.getItem(pendingOAuthModeKey)
    || "";
}

function clearPendingOAuthMode() {
  browserStorage("persistent")?.removeItem(pendingOAuthModeKey);
  browserStorage("session")?.removeItem(pendingOAuthModeKey);
}

const authStorage = {
  getItem(key) { return browserStorage(rememberSession ? "persistent" : "session")?.getItem(key) || null; },
  setItem(key, value) {
    const selected = browserStorage(rememberSession ? "persistent" : "session");
    const other = browserStorage(rememberSession ? "session" : "persistent");
    selected?.setItem(key, value);
    other?.removeItem(key);
  },
  removeItem(key) {
    browserStorage("persistent")?.removeItem(key);
    browserStorage("session")?.removeItem(key);
  },
};
const supabase = configured ? window.supabase.createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !Capacitor.isNativePlatform(),
    flowType: "pkce",
    storage: authStorage,
  },
}) : null;

const localTermsUrl = "./legal/terms.html";
const localPrivacyUrl = "./legal/privacy.html";
const localLegalVersion = "2026-09";
const localLegalEffectiveDate = "2026-09-12";

window.REConfig = Object.freeze({
  ...(window.REConfig || {}),
  legal: Object.freeze({
    terms: Object.freeze({
      url: window.REConfig?.legal?.terms?.url || localTermsUrl,
      version: window.REConfig?.legal?.terms?.version || localLegalVersion,
      effectiveDate: window.REConfig?.legal?.terms?.effectiveDate || localLegalEffectiveDate,
    }),
    privacy: Object.freeze({
      url: window.REConfig?.legal?.privacy?.url || localPrivacyUrl,
      version: window.REConfig?.legal?.privacy?.version || localLegalVersion,
      effectiveDate: window.REConfig?.legal?.privacy?.effectiveDate || localLegalEffectiveDate,
    }),
  }),
});

let selectedSubscriptionId = "";
let calendarCursor = new Date();
let cache = { userId: "", subscriptions: null, loadedAt: 0 };
let notificationDetails = new Map();

function unavailable() {
  const error = new Error("서비스 연결을 확인하지 못했어요.");
  error.code = "BACKEND_NOT_CONFIGURED";
  return error;
}

function requireClient() {
  if (!supabase) throw unavailable();
  return supabase;
}

function checked(result) {
  if (result.error) throw result.error;
  return result.data;
}

async function currentUser() {
  const client = requireClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    const failure = error || new Error("로그인이 필요합니다.");
    failure.code = "UNAUTHENTICATED";
    throw failure;
  }
  return data.user;
}

async function subscriptions(force = false) {
  const user = await currentUser();
  if (!force && cache.userId === user.id && Array.isArray(cache.subscriptions) && Date.now() - cache.loadedAt < 15_000) return cache.subscriptions;
  const rows = checked(await supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }));
  cache = { userId: user.id, subscriptions: rows || [], loadedAt: Date.now() };
  return cache.subscriptions;
}

function invalidate() { cache = { userId: "", subscriptions: null, loadedAt: 0 }; }

function allowedExternalUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const hosts = new Set(window.REConfig?.android?.allowedExternalHosts || []);
    const safe = url.protocol === "https:"
      && !url.username
      && !url.password
      && (!url.port || url.port === "443")
      && hosts.has(url.hostname.toLowerCase());
    return safe ? url.href : "";
  } catch (_error) { return ""; }
}

function normalizedEmail(formData, name) {
  return String(formData.get(name) || "").trim().toLowerCase();
}

async function getSession() {
  if (!supabase) return { authenticated: false, reason: "not-configured" };
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const oauthCompliancePending = Boolean(data.session && readPendingOAuthMode());
  const legalConsentRequired = Boolean(data.session) && !oauthCompliancePending
    ? !(await hasCurrentLegalAcceptances(data.session.user))
    : false;
  return {
    authenticated: Boolean(data.session) && !oauthCompliancePending,
    legalConsentRequired,
    user: data.session?.user || null,
    reason: oauthCompliancePending ? "oauth-compliance-pending" : legalConsentRequired ? "legal-consent-required" : undefined,
  };
}

async function login(formData) {
  const client = requireClient();
  setRememberSession(formData.get("remember-session") === "true");
  const data = checked(await client.auth.signInWithPassword({
    email: normalizedEmail(formData, "email"),
    password: String(formData.get("password") || ""),
  }));
  const legalConsentRequired = Boolean(data.session)
    ? !(await hasCurrentLegalAcceptances(data.user || data.session.user))
    : false;
  return { authenticated: Boolean(data.session), legalConsentRequired, user: data.user || null };
}

async function register(formData) {
  const client = requireClient();
  const email = normalizedEmail(formData, "register-email");
  const data = checked(await client.auth.signUp({
    email,
    password: String(formData.get("register-password") || ""),
    options: {
      emailRedirectTo: Capacitor.isNativePlatform() ? nativeAuthCallbackUrl : window.location.origin,
      data: {
        terms_version: String(formData.get("consent-terms-version") || ""),
        terms_effective_date: String(formData.get("consent-terms-effective-date") || ""),
        privacy_version: String(formData.get("consent-privacy-version") || ""),
        privacy_effective_date: String(formData.get("consent-privacy-effective-date") || ""),
      },
    },
  }));
  return {
    registered: Boolean(data.user),
    authenticated: Boolean(data.session),
    message: data.session ? undefined : "확인 이메일 발송을 요청했어요. 수신함과 스팸함을 확인해 주세요.",
  };
}

async function resendConfirmation(email) {
  const client = requireClient();
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) throw new Error("이메일 주소를 확인해 주세요.");
  checked(await client.auth.resend({
    type: "signup",
    email: normalized,
    options: { emailRedirectTo: Capacitor.isNativePlatform() ? nativeAuthCallbackUrl : window.location.origin },
  }));
  return { sent: true };
}

async function provider(providerName, mode, options = {}) {
  if (providerName !== "google") throw new Error("지원하지 않는 로그인 방식입니다.");
  setRememberSession(options.rememberSession !== false);
  const isRegistration = mode === "register";
  storePendingOAuthMode(mode);
  if (isRegistration) storePendingLegalAcceptance(options.legal);
  try {
    const client = requireClient();
    const result = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: Capacitor.isNativePlatform() ? nativeAuthCallbackUrl : window.location.origin,
        skipBrowserRedirect: Capacitor.isNativePlatform(),
      },
    });
    const data = checked(result);
    if (Capacitor.isNativePlatform() && data.url) await Browser.open({ url: data.url });
    return { redirecting: Boolean(data.url) };
  } catch (error) {
    clearPendingOAuthMode();
    if (isRegistration) clearPendingLegalAcceptance();
    throw error;
  }
}

async function recordPendingLegalAcceptances() {
  const pending = readPendingLegalAcceptance();
  if (!pending) return { recorded: false };
  const user = await currentUser();
  const desired = [
    { user_id: user.id, document_type: "terms", document_version: String(pending.terms?.version || "").trim(), effective_date: pending.terms?.effectiveDate },
    { user_id: user.id, document_type: "privacy", document_version: String(pending.privacy?.version || "").trim(), effective_date: pending.privacy?.effectiveDate },
  ].filter((item) => item.document_version && /^\d{4}-\d{2}-\d{2}$/.test(String(item.effective_date || "")));
  if (desired.length !== 2) throw new Error("약관 동의 기록을 확인하지 못했어요.");
  const existing = checked(await supabase.from("legal_acceptances")
    .select("document_type,document_version")
    .eq("user_id", user.id)
    .in("document_type", ["terms", "privacy"])) || [];
  const keys = new Set(existing.map((item) => `${item.document_type}:${item.document_version}`));
  const missing = desired.filter((item) => !keys.has(`${item.document_type}:${item.document_version}`));
  if (missing.length) checked(await supabase.from("legal_acceptances").insert(missing).select("id"));
  clearPendingLegalAcceptance();
  return { recorded: true };
}

function legalAcceptanceFromFormData(formData) {
  return {
    terms: {
      version: String(formData.get("consent-terms-version") || "").trim(),
      effectiveDate: String(formData.get("consent-terms-effective-date") || "").trim(),
    },
    privacy: {
      version: String(formData.get("consent-privacy-version") || "").trim(),
      effectiveDate: String(formData.get("consent-privacy-effective-date") || "").trim(),
    },
  };
}

async function completeSocialConsent(formData) {
  if (!(await currentUser())) {
    const error = new Error("로그인이 필요합니다.");
    error.code = "UNAUTHENTICATED";
    throw error;
  }
  storePendingLegalAcceptance(legalAcceptanceFromFormData(formData));
  await recordPendingLegalAcceptances();
  clearPendingOAuthMode();
  return { authenticated: true };
}

async function hasCurrentLegalAcceptances(userOverride = null) {
  const user = userOverride || await currentUser();
  const legal = window.REConfig?.legal || {};
  const expected = [
    `terms:${String(legal.terms?.version || "").trim()}`,
    `privacy:${String(legal.privacy?.version || "").trim()}`,
  ];
  if (expected.some((key) => key.endsWith(":"))) return false;
  const rows = checked(await supabase.from("legal_acceptances")
    .select("document_type,document_version")
    .eq("user_id", user.id)
    .in("document_type", ["terms", "privacy"])) || [];
  const recorded = new Set(rows.map((item) => `${item.document_type}:${item.document_version}`));
  return expected.every((key) => recorded.has(key));
}

async function requestPasswordReset({ email }) {
  const client = requireClient();
  checked(await client.auth.resetPasswordForEmail(email, {
    redirectTo: Capacitor.isNativePlatform() ? `${nativeAuthCallbackUrl}?mode=recovery` : `${window.location.origin}?screen=login&mode=recovery`,
  }));
  return { requested: true };
}

async function updatePassword({ password }) {
  const value = String(password || "");
  if (!/^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/.test(value)) throw new Error("비밀번호 조건을 확인해 주세요.");
  const data = checked(await requireClient().auth.updateUser({ password: value }));
  window.REPasswordRecoveryPending = false;
  return { updated: Boolean(data.user) };
}

async function deleteAccount({ confirmed }) {
  if (!confirmed) throw new Error("삭제 확인이 필요합니다.");
  const client = requireClient();
  const deleted = checked(await client.rpc("delete_own_account"));
  invalidate();
  await client.auth.signOut({ scope: "local" });
  return { deleted: deleted === true };
}

function mapPromotion(row, servicesById) {
  const service = servicesById.get(row.service_id);
  return {
    id: row.id,
    serviceId: row.service_id,
    serviceName: service?.name || row.service_id,
    brandKey: row.service_id,
    type: "맞춤 혜택",
    label: row.ends_on ? `${row.ends_on}까지` : "공식 혜택",
    title: row.title,
    description: row.summary,
    conditions: row.eligibility,
    startsAt: row.starts_on ? `${row.starts_on}T00:00:00+09:00` : null,
    endsAt: row.ends_on ? `${row.ends_on}T23:59:59+09:00` : null,
    publishedAt: row.published_at,
  };
}

async function mountScreen({ screen, root }) {
  const user = await currentUser();
  const rows = await subscriptions();
  const mapped = rows.map((row) => mapSubscription(row));
  let payload;

  if (screen === "home") {
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const [eventResult, unreadResult, preferenceResult, reminderResult, candidates] = await Promise.all([
      supabase.from("payment_events").select("amount_krw,paid_at").eq("user_id", user.id).gte("paid_at", monthStart.toISOString()),
      supabase.from("app_notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
      supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_reminders").select("id,subscription_id,title,remind_at").eq("user_id", user.id).eq("enabled", true).gt("remind_at", new Date().toISOString()).order("remind_at").limit(30),
      getPaymentCandidates(),
    ]);
    const events = checked(eventResult);
    if (unreadResult.error) throw unreadResult.error;
    const preferences = checked(preferenceResult) || {};
    const futureReminders = checked(reminderResult) || [];
    const summary = summarizeSpending(rows, events || []);
    const imminent = projectCharges(rows, new Date(), 2).find(({ date }) => (date - new Date()) / 86_400_000 <= 3);
    const priceChange = rows.find((row) => {
      if (!row.promotion_ends_on || !row.price_after_promotion_krw || Number(row.price_after_promotion_krw) <= Number(row.gross_amount_krw || row.amount_krw)) return false;
      const days = (new Date(`${row.promotion_ends_on}T23:59:59`) - new Date()) / 86_400_000;
      return days >= 0 && days <= 14;
    });
    const mismatch = candidates.find((candidate) => {
      const existing = rows.find((row) => candidate.serviceId && row.service_id === candidate.serviceId);
      return existing && Number(existing.gross_amount_krw || existing.amount_krw) !== Number(candidate.amount);
    });
    let characterMessage = { type: "neutral", title: "필요한 건 RE.가 함께 챙길게요", body: "중요한 변화가 있을 때만 조용히 알려드릴게요." };
    if (priceChange) characterMessage = { type: "price_change", title: "다음 금액이 달라질 예정이에요", body: `${priceChange.service_name} 혜택 종료 뒤 ${Number(priceChange.price_after_promotion_krw).toLocaleString("ko-KR")}원으로 바뀔 수 있어요. 편할 때 확인해 주세요.` };
    else if (mismatch) characterMessage = { type: "decision", title: "평소와 다른 결제 금액을 찾았어요", body: `${mismatch.serviceName} 결제가 맞는지 함께 확인해볼까요? 바꾸지 않아도 괜찮아요.` };
    else if (candidates.length) characterMessage = { type: "payment_candidate", title: "확인할 결제 후보가 있어요", body: "저장할 내용이 맞는지 살펴본 뒤 직접 결정할 수 있어요." };
    else if (imminent) characterMessage = { type: "billing", title: "곧 결제될 구독이 있어요", body: `${imminent.subscription.service_name} 결제일이 다가와요. 미리 확인해둘까요? 바꾸지 않아도 괜찮아요.` };
    payload = {
      subscriptions: mapped,
      upcoming: projectCharges(rows, new Date(), 2).slice(0, 4).map(({ subscription, amount, date }) => ({ ...mapSubscription(subscription), amount, billingDate: toIsoDate(date) })),
      summary,
      characterMessage,
      unreadCount: Number(unreadResult.count) || 0,
    };
    if (Capacitor.isNativePlatform()) {
      const billingTasks = mapped.map((item) => preferences.billing_upcoming === false
        ? cancelBillingReminders(item.id)
        : scheduleBillingReminders(item));
      void Promise.allSettled([
        ...billingTasks,
        ...futureReminders.map((item) => scheduleCustomReminder({ id: item.id, subscriptionId: item.subscription_id, title: item.title, remindAt: item.remind_at })),
        setPaymentCandidateNotifications(preferences.billing_complete !== false),
      ]);
    }
  } else if (screen === "subscriptions") {
    payload = { subscriptions: mapped };
  } else if (screen === "subscription-detail") {
    const selectedRow = rows.find((item) => item.id === selectedSubscriptionId) || rows[0];
    let selected = selectedRow ? mapSubscription(selectedRow) : null;
    let cancelUrl = allowedExternalUrl(selectedRow?.cancel_url);
    if (!cancelUrl && selectedRow?.service_id) {
      const service = checked(await supabase.from("subscription_services").select("cancel_url").eq("id", selectedRow.service_id).eq("active", true).maybeSingle());
      cancelUrl = allowedExternalUrl(service?.cancel_url);
    }
    if (selected) selected = { ...selected, hasCancellationSite: Boolean(cancelUrl) };
    payload = { subscription: selected };
  } else if (screen === "calendar") {
    const monthStart = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
    const monthEnd = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
    const [paymentResult, reminderResult] = await Promise.all([
      supabase.from("payment_events").select("id,subscription_id,service_name,amount_krw,paid_at").eq("user_id", user.id).gte("paid_at", monthStart.toISOString()).lt("paid_at", monthEnd.toISOString()).order("paid_at"),
      supabase.from("user_reminders").select("id,subscription_id,title,remind_at,enabled").eq("user_id", user.id).eq("enabled", true).gte("remind_at", monthStart.toISOString()).lt("remind_at", monthEnd.toISOString()).order("remind_at"),
    ]);
    const expectedEvents = projectCharges(rows, monthStart, 1).map(({ subscription, amount, date }) => ({
      id: `expected:${subscription.id}:${toIsoDate(date)}`,
      type: "expected",
      date: toIsoDate(date),
      title: `${subscription.service_name} 결제 예정`,
      serviceName: subscription.service_name,
      subscriptionId: subscription.id,
      serviceId: subscription.service_id || "",
      amount,
    }));
    const paidEvents = (checked(paymentResult) || []).map((event) => ({
      id: event.id,
      type: "paid",
      date: toIsoDate(new Date(event.paid_at)),
      title: `${event.service_name} 결제 완료`,
      serviceName: event.service_name,
      subscriptionId: event.subscription_id || "",
      amount: Number(event.amount_krw),
    }));
    const reminderEvents = (checked(reminderResult) || []).map((reminder) => ({
      id: reminder.id,
      type: "reminder",
      date: toIsoDate(new Date(reminder.remind_at)),
      time: new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(reminder.remind_at)),
      title: reminder.title,
      subscriptionId: reminder.subscription_id || "",
    }));
    const changeEvents = rows.flatMap((subscription) => {
      if (!subscription.promotion_ends_on) return [];
      const endDate = new Date(`${subscription.promotion_ends_on}T12:00:00`);
      const result = [];
      if (endDate >= monthStart && endDate < monthEnd) result.push({
        id: `promotion-expiry:${subscription.id}:${subscription.promotion_ends_on}`,
        type: "promotion_expiry",
        date: subscription.promotion_ends_on,
        title: `${subscription.service_name} 프로모션 종료`,
        serviceName: subscription.service_name,
        subscriptionId: subscription.id,
      });
      if (Number(subscription.price_after_promotion_krw) > Number(subscription.gross_amount_krw || subscription.amount_krw)) {
        const changeDate = new Date(endDate); changeDate.setDate(changeDate.getDate() + 1);
        if (changeDate >= monthStart && changeDate < monthEnd) result.push({
          id: `price-change:${subscription.id}:${toIsoDate(changeDate)}`,
          type: "price_change",
          date: toIsoDate(changeDate),
          title: `${subscription.service_name} 요금 변경 예정`,
          serviceName: subscription.service_name,
          subscriptionId: subscription.id,
          amount: Number(subscription.price_after_promotion_krw),
        });
      }
      return result;
    });
    payload = {
      month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`,
      events: [...expectedEvents, ...paidEvents, ...reminderEvents, ...changeEvents].sort((left, right) => left.date.localeCompare(right.date) || left.type.localeCompare(right.type)),
    };
  } else if (screen === "benefits") {
    const serviceIds = [...new Set(rows.map((row) => row.service_id).filter(Boolean))];
    if (!serviceIds.length) payload = { promotions: [] };
    else {
      const [promotionRows, serviceRows] = await Promise.all([
        supabase.from("promotions").select("*").in("service_id", serviceIds).order("published_at", { ascending: false }),
        supabase.from("subscription_services").select("id,name").in("id", serviceIds),
      ]);
      const promotions = checked(promotionRows) || [];
      const serviceMap = new Map((checked(serviceRows) || []).map((item) => [item.id, item]));
      payload = { promotions: promotions.map((item) => mapPromotion(item, serviceMap)) };
    }
  } else if (screen === "notifications") {
    const serviceIds = [...new Set(rows.map((row) => row.service_id).filter(Boolean))];
    const serviceNameById = new Map(rows.filter((row) => row.service_id).map((row) => [row.service_id, row.service_name]));
    const ownResult = await supabase.from("app_notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60);
    const own = checked(ownResult) || [];
    let updates = [];
    if (serviceIds.length) updates = checked(await supabase.from("service_updates").select("*").in("service_id", serviceIds).order("published_at", { ascending: false }).limit(20)) || [];
    const notificationRecords = [
      ...own.map((item) => ({ id: item.id, type: ["news", "benefit"].includes(item.type) ? item.type : "billing", title: item.title, body: item.body, timeLabel: item.read_at ? "읽음" : "새 소식", serviceId: item.subscription_id || "", serviceName: "RE." })),
      ...updates.map((item) => ({ id: `update:${item.id}`, type: "news", title: item.title, body: `${item.summary}${item.applies_on ? ` · ${item.applies_on} 적용` : ""}`, timeLabel: item.announced_on, serviceId: item.service_id, serviceName: serviceNameById.get(item.service_id) || item.service_id, brandKey: item.service_id })),
    ];
    notificationDetails = new Map(notificationRecords.map((item) => [item.id, item]));
    payload = { notifications: notificationRecords };
  } else if (screen === "my-page") {
    const preferenceResult = await supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle();
    const preferences = checked(preferenceResult) || {};
    payload = {
      account: { email: user.email, displayName: "RE. 사용자" },
      notificationSettings: { billingUpcoming: preferences.billing_upcoming !== false, billingComplete: preferences.billing_complete !== false },
    };
  } else throw new Error("지원하지 않는 화면입니다.");

  return window.RELiveRenderer.mount({ screen, root, payload });
}

async function saveSubscription(payload) {
  const user = await currentUser();
  if (payload.candidateId && payload.existingSubscriptionId) {
    const existing = (await subscriptions()).find((row) => row.id === payload.existingSubscriptionId);
    if (!existing) throw new Error("기존 구독을 찾지 못했어요.");
    const isShared = existing.plan_type === "shared";
    const previousGross = Number(existing.gross_amount_krw || existing.amount_krw) || 0;
    const previousPersonal = Number(existing.personal_share_krw ?? existing.amount_krw) || 0;
    const personalRatio = isShared && previousGross > 0 ? previousPersonal / previousGross : 1;
    const recordedAmount = isShared ? Math.max(1, Math.round(Number(payload.amount) * personalRatio)) : payload.amount;
    if (payload.paymentDecision === "update") {
      const amountUpdate = isShared
        ? { gross_amount_krw: payload.amount, amount_krw: recordedAmount, personal_share_krw: recordedAmount }
        : { gross_amount_krw: payload.amount, amount_krw: payload.amount };
      checked(await supabase.from("subscriptions").update(amountUpdate).eq("id", existing.id).eq("user_id", user.id).select("id").single());
    }
    checked(await supabase.from("payment_events").insert({
      user_id: user.id, subscription_id: existing.id, service_name: payload.serviceName,
      amount_krw: recordedAmount, paid_at: payload.detectedAt || new Date().toISOString(),
      payment_method: payload.paymentMethod || "", source_type: "notification",
    }).select("id").single());
    await removePaymentCandidate(payload.candidateId, true);
    invalidate();
    return { saved: true, id: existing.id };
  }

  let catalogCategory = "";
  if (payload.serviceId) {
    const service = checked(await supabase.from("subscription_services").select("category").eq("id", payload.serviceId).eq("active", true).maybeSingle());
    catalogCategory = service?.category || "";
  }
  const record = {
    user_id: user.id,
    service_id: payload.serviceId || null,
    service_name: payload.serviceName,
    plan_name: payload.planName || "기본 요금제",
    category: catalogCategory || payload.category || "기타",
    amount_krw: payload.planType === "shared" ? payload.myShare : payload.amount,
    gross_amount_krw: payload.grossAmount || payload.amount,
    billing_cycle: payload.billingCycle === "annual" ? "annual" : "monthly",
    due_day: Number(payload.billingDate?.slice(8, 10)) || payload.dueDay,
    next_billing_date: payload.billingDate || null,
    payment_method: payload.paymentMethod || "",
    status: payload.status || "active",
    source_type: payload.sourceType === "image" ? "image" : payload.sourceType === "notification" ? "notification" : "manual",
    plan_type: payload.planType === "shared" ? "shared" : "personal",
    member_count: payload.planType === "shared" ? payload.memberCount : null,
    personal_share_krw: payload.planType === "shared" ? payload.myShare : null,
    reminder_days: Array.isArray(payload.reminderDays) ? payload.reminderDays : [3],
    promotion_ends_on: payload.promotionEndsOn || null,
    price_after_promotion_krw: payload.priceAfterPromotion || null,
    memo: payload.memo || "",
  };
  let data;
  if (payload.id) data = checked(await supabase.from("subscriptions").update(record).eq("id", payload.id).eq("user_id", user.id).select("*").single());
  else data = checked(await supabase.from("subscriptions").insert(record).select("*").single());
  if (payload.candidateId) await removePaymentCandidate(payload.candidateId, true);
  invalidate();
  let remindersScheduled = true;
  if (Capacitor.isNativePlatform()) {
    const notificationPermission = await requestLocalNotificationPermission();
    remindersScheduled = notificationPermission.permission === "granted" && notificationPermission.channelReady === true
      ? await scheduleBillingReminders(mapSubscription(data))
      : false;
  }
  return { saved: true, id: data.id, remindersScheduled };
}

async function preparePaymentCandidate(candidate) {
  const rows = await subscriptions();
  const match = rows.find((row) => (candidate.serviceId && row.service_id === candidate.serviceId) || row.service_name.toLowerCase() === candidate.serviceName.toLowerCase());
  return { ...candidate, existingSubscriptionId: match?.id || "", existingAmount: match ? Number(match.gross_amount_krw || match.amount_krw) : null };
}

async function openLatestCandidate(id = "", source = "in-app") {
  const candidates = await getPaymentCandidates();
  const candidate = candidates.find((item) => item.id === id) || candidates[0];
  if (!candidate) return { ok: false, message: "확인이 필요한 최근 결제가 없어요." };
  const detail = await preparePaymentCandidate(candidate);
  if (source === "heads-up") detail.conciergeHandoff = true;
  window.dispatchEvent(new CustomEvent("re:open-payment-candidate", { detail }));
  return { ok: true, silent: true };
}

const actions = {
  async "open-subscription"({ service }) { selectedSubscriptionId = service; return { ok: true, route: "subscription-detail", silent: true }; },
  "save-subscription": saveSubscription,
  async "delete-subscription"({ id, confirmed }) {
    if (!confirmed) throw new Error("삭제 확인이 필요합니다.");
    const user = await currentUser();
    const existing = checked(await supabase.from("subscriptions").select("id").eq("id", id).eq("user_id", user.id).single());
    const data = checked(await supabase.from("subscriptions").delete().eq("id", id).eq("user_id", user.id).select("id"));
    if (data?.length === 1) await cancelBillingReminders(existing.id);
    invalidate();
    return { deleted: data?.length === 1 };
  },
  async "open-benefit"({ service }) {
    const row = checked(await supabase.from("promotions").select("destination_url").eq("id", service).single());
    const url = allowedExternalUrl(row.destination_url);
    if (!url) return { ok: false, message: "출시 버전에서 승인된 공식 혜택 주소가 아니에요." };
    await openExternalUrl(url);
    return { ok: true };
  },
  async "open-notification"({ service }) {
    const detail = notificationDetails.get(service);
    if (!detail) return { ok: false, message: "알림 내용을 다시 불러와 주세요." };
    if (!service.startsWith("update:")) {
      const user = await currentUser();
      const data = checked(await supabase.from("app_notifications").update({ read_at: new Date().toISOString() }).eq("id", service).eq("user_id", user.id).select("id"));
      if (data?.length !== 1) return { ok: false, message: "알림 읽음 상태를 저장하지 못했어요." };
      detail.timeLabel = "읽음";
      document.querySelector('.app-screen[data-screen="home"]')?.removeAttribute("data-live-status");
    }
    window.dispatchEvent(new CustomEvent("re:open-notification-detail", { detail }));
    return { ok: true, route: "notifications", silent: true };
  },
  async "open-notification-list"() { return { ok: true, route: "notifications", silent: true }; },
  async "open-cancellation-site"({ service }) {
    const user = await currentUser();
    const row = checked(await supabase.from("subscriptions").select("cancel_url,service_id").eq("id", service).eq("user_id", user.id).single());
    let url = allowedExternalUrl(row.cancel_url);
    if (!url && row.service_id) url = allowedExternalUrl(checked(await supabase.from("subscription_services").select("cancel_url").eq("id", row.service_id).eq("active", true).maybeSingle())?.cancel_url);
    if (!url) return { ok: false, message: "확인된 공식 해지 주소가 아직 없어요." };
    await openExternalUrl(url);
    return { ok: true };
  },
  async "open-cancellation-checklist"({ service }) {
    window.dispatchEvent(new CustomEvent("re:open-cancellation-checklist", { detail: { subscriptionId: service } }));
    return { ok: true, silent: true };
  },
  async "configure-billing-alert"({ service, reminderDays }) {
    const user = await currentUser();
    if (Capacitor.isNativePlatform()) {
      const permission = await requestLocalNotificationPermission();
      if (permission.permission !== "granted" || permission.channelReady !== true) {
        return { saved: false, reason: "permission" };
      }
    }
    const current = checked(await supabase.from("subscriptions").select("*").eq("id", service).eq("user_id", user.id).single());
    const previous = mapSubscription(current);
    const next = { ...previous, reminderDays: [Number(reminderDays)] };
    const scheduled = await scheduleBillingReminders(next);
    if (!scheduled) return { saved: false, reason: "schedule" };
    try {
      checked(await supabase.from("subscriptions").update({ reminder_days: next.reminderDays }).eq("id", service).eq("user_id", user.id).select("id").single());
    } catch (error) {
      await scheduleBillingReminders(previous).catch(() => {});
      throw error;
    }
    invalidate();
    return { saved: true };
  },
  async "save-custom-reminder"({ title, remindAt, subscriptionId }) {
    const user = await currentUser();
    const at = new Date(remindAt);
    const cleanTitle = String(title || "").trim().slice(0, 100);
    if (!cleanTitle || Number.isNaN(at.getTime()) || at <= new Date()) throw new Error("미래의 알림 날짜와 내용을 확인해 주세요.");
    if (Capacitor.isNativePlatform()) {
      const permission = await requestLocalNotificationPermission();
      if (permission.permission !== "granted") return { saved: false, reason: "permission" };
    }
    const row = checked(await supabase.from("user_reminders").insert({
      user_id: user.id,
      subscription_id: subscriptionId || null,
      title: cleanTitle,
      remind_at: at.toISOString(),
      enabled: true,
    }).select("id,subscription_id,title,remind_at").single());
    const schedule = await scheduleCustomReminder({ id: row.id, subscriptionId: row.subscription_id, title: row.title, remindAt: row.remind_at });
    if (Capacitor.isNativePlatform() && schedule.scheduled !== true) {
      checked(await supabase.from("user_reminders").delete().eq("id", row.id).eq("user_id", user.id).select("id"));
      throw new Error("기기 알림을 예약하지 못했어요.");
    }
    return { saved: true, scheduled: schedule.scheduled === true };
  },
  async "delete-custom-reminder"({ service }) {
    const user = await currentUser();
    const deleted = checked(await supabase.from("user_reminders").delete().eq("id", service).eq("user_id", user.id).select("id"));
    if (deleted?.length === 1) await cancelCustomReminder(service);
    return { ok: deleted?.length === 1, deleted: deleted?.length === 1, route: "calendar", reload: true, silent: true };
  },
  async "update-notification-setting"({ setting, enabled }) {
    const user = await currentUser();
    if (!new Set(["billing-upcoming", "billing-complete"]).has(setting)) throw new Error("지원하지 않는 알림 설정입니다.");
    const column = setting === "billing-complete" ? "billing_complete" : "billing_upcoming";
    const currentPreference = checked(await supabase.from("notification_preferences").select(column).eq("user_id", user.id).maybeSingle());
    const previousEnabled = currentPreference?.[column] !== false;
    const applyNative = async (value) => setting === "billing-complete"
      ? setPaymentCandidateNotifications(value)
      : (await Promise.all((await subscriptions()).map((item) => value
        ? scheduleBillingReminders(mapSubscription(item))
        : cancelBillingReminders(item.id)))).every(Boolean);
    const nativeApplied = await applyNative(enabled);
    if (!nativeApplied) throw new Error("기기 알림 설정을 적용하지 못했어요.");
    try {
      checked(await supabase.from("notification_preferences").upsert({ user_id: user.id, [column]: enabled }, { onConflict: "user_id" }).select("user_id").single());
    } catch (error) {
      if (previousEnabled !== enabled) await applyNative(previousEnabled).catch(() => {});
      throw error;
    }
    return { saved: true };
  },
  async logout() { checked(await requireClient().auth.signOut()); invalidate(); return { loggedOut: true }; },
  async "open-help"() { return { ok: false, message: "고객지원 주소가 확정되면 연결할게요." }; },
  async "change-calendar-month"({ service }) {
    calendarCursor.setMonth(calendarCursor.getMonth() + (service === "previous" ? -1 : 1));
    document.querySelector('.app-screen[data-screen="calendar"]')?.removeAttribute("data-live-status");
    return { ok: true, route: "calendar", silent: true, reload: true };
  },
  async "search-notifications"() { return { ok: true, route: "notifications", silent: true }; },
  async "open-subscription-filter"() { return { ok: true, route: "subscriptions", silent: true }; },
  async "open-subscription-menu"() {
    const selected = (await subscriptions()).map(mapSubscription).find((item) => item.id === selectedSubscriptionId);
    if (selected) window.dispatchEvent(new CustomEvent("re:edit-subscription", { detail: selected }));
    return { ok: Boolean(selected), silent: true };
  },
  async "open-payment-candidate"({ service }) { return openLatestCandidate(service); },
  async "discard-payment-candidate"({ service }) { return { ok: await removePaymentCandidate(service, false) }; },
  async "enable-payment-capture"() {
    // v1.0.5: discovery permission first. Display permission is requested only
    // after Notification Listener access is granted and the user returns to RE.
    const result = await requestPaymentCapturePermission();
    return {
      ok: result.opened === true,
      message: "기기 설정에서 RE.의 알림 접근을 허용한 뒤 돌아와 주세요.",
    };
  },
  async "check-payment-capture"() { return { ok: true, enabled: await checkPaymentCapturePermission(), candidates: await getPaymentCandidates() }; },
  async "recognize-receipt"({ file }) { return recognizeReceipt(file); },
  async "open-daily-quote"() { return { ok: true, message: "필요한 순간에만, RE.가 곁에서 챙겨드릴게요." }; },
};

window.REIntegrations = {
  auth: { getSession, login, register, resendConfirmation, provider, completeSocialConsent, requestPasswordReset, updatePassword, deleteAccount },
  data: { mountScreen },
  actions,
  notifications: {
    checkPermission: checkLocalNotificationPermission,
    requestPermission: requestLocalNotificationPermission,
  },
  capabilities: { configured, paymentCapture: Capacitor.isNativePlatform(), imageOcr: false },
};

installNativeDeepLinks();
window.addEventListener("re:payment-candidate", (event) => { void openLatestCandidate(event.detail?.id, "heads-up"); });
let nativeOAuthCallbackInFlight = false;
let nativeOAuthCallbackSeenAt = 0;

window.addEventListener("re:auth-callback", async (event) => {
  nativeOAuthCallbackInFlight = true;
  nativeOAuthCallbackSeenAt = Date.now();
  try {
    const url = new URL(event.detail?.url || "");
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
    const oauthErrorCode = url.searchParams.get("error_code") || url.searchParams.get("error") || fragment.get("error_code") || fragment.get("error");
    const oauthError = url.searchParams.get("error_description") || fragment.get("error_description") || oauthErrorCode;
    if (oauthError) {
      const failure = new Error(oauthError);
      failure.code = oauthErrorCode || "oauth_callback_failed";
      throw failure;
    }
    const code = url.searchParams.get("code") || fragment.get("code");
    if (!code) {
      const failure = new Error("Google 로그인 결과를 확인하지 못했어요.");
      failure.code = "oauth_code_missing";
      throw failure;
    }
    checked(await requireClient().auth.exchangeCodeForSession(code));
    const recovery = url.searchParams.get("mode") === "recovery";
    const hasPendingConsent = Boolean(readPendingLegalAcceptance());
    if (!recovery && hasPendingConsent) await recordPendingLegalAcceptances();
    else if (!recovery && !(await hasCurrentLegalAcceptances())) {
      await Browser.close().catch(() => {});
      window.location.replace("?screen=register&socialConsent=required");
      return;
    }
    clearPendingOAuthMode();
    await Browser.close().catch(() => {});
    if (recovery) {
      window.REPasswordRecoveryPending = true;
      window.dispatchEvent(new CustomEvent("re:password-recovery"));
    } else window.location.replace("?screen=home&paymentOnboarding=1");
  } catch (error) {
    await supabase?.auth.signOut({ scope: "local" }).catch(() => {});
    const code = String(error?.code || "oauth_callback_failed").replace(/[^a-z0-9_-]/gi, "").slice(0, 64) || "oauth_callback_failed";
    clearPendingOAuthMode();
    clearPendingLegalAcceptance();
    window.location.replace(`?screen=login&authError=${encodeURIComponent(code)}`);
  } finally {
    nativeOAuthCallbackInFlight = false;
  }
});

window.addEventListener("re:app-resumed", () => {
  if (!Capacitor.isNativePlatform() || !readPendingOAuthMode()) return;
  window.setTimeout(async () => {
    try {
      if (!readPendingOAuthMode()) return;
      if (nativeOAuthCallbackInFlight) return;
      if (nativeOAuthCallbackSeenAt && Date.now() - nativeOAuthCallbackSeenAt < 15000) return;
      const { data } = await requireClient().auth.getSession();
      if (data.session) return;
      await Browser.close().catch(() => {});
      clearPendingOAuthMode();
      clearPendingLegalAcceptance();
      window.location.replace("?screen=login&authError=oauth_return_missing");
    } catch (_error) {}
  }, 10000);
});

supabase?.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    window.REPasswordRecoveryPending = true;
    window.dispatchEvent(new CustomEvent("re:password-recovery"));
  }
  if (event === "SIGNED_IN" && !Capacitor.isNativePlatform() && readPendingOAuthMode()) {
    window.setTimeout(async () => {
      try {
        if (readPendingLegalAcceptance()) await recordPendingLegalAcceptances();
        else if (!(await hasCurrentLegalAcceptances())) {
          window.location.replace("?screen=register&socialConsent=required");
          return;
        }
        clearPendingOAuthMode();
        window.location.replace("?screen=home");
      } catch (_error) {
        await supabase?.auth.signOut({ scope: "local" }).catch(() => {});
        clearPendingOAuthMode();
        clearPendingLegalAcceptance();
        window.location.replace("?screen=login&authError=1");
      }
    }, 0);
  }
});