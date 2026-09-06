import { serviceCatalog } from "../data/subscriptionData";
import { supabase, supabaseConfigured } from "./supabaseClient";

const catalogServiceIds = new Set(serviceCatalog.map((service) => String(service.id)));

const asDateOrNull = (value) => {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

async function currentUser() {
  if (!supabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) return null;
  return data.user;
}

const validServiceId = (value) => {
  const id = String(value || "").trim();
  return id && catalogServiceIds.has(id) ? id : null;
};

const subscriptionToRow = (userId, item) => ({
  user_id: userId,
  subscription_id: String(item.subscriptionId),
  service_id: validServiceId(item.id),
  service_name: item.name || "",
  plan_name: item.plan || "",
  category: item.category || "기타",
  amount_krw: Math.round(Number(item.amount || 0)),
  billing_cycle: item.billingCycle || "매월",
  due_day: Number(item.dueDay || 1),
  next_billing_date: asDateOrNull(item.nextBillingDate),
  payment_method: item.paymentMethod || "",
  cancel_url: item.cancelUrl || "",
  status: item.status || (item.isTrial ? "trial" : "active"),
  alert_d3: item.alertD3 !== false,
  alert_d1: item.alertD1 !== false,
  renewal_pending: Boolean(item.renewalPending),
  renewal_reviewed_for: item.renewalReviewedFor || null,
  monogram: item.monogram || null,
  mark_tone: item.markTone || null,
  created_at: item.createdAt || new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const rowToSubscription = (row) => ({
  subscriptionId: row.subscription_id,
  id: row.service_id || `custom-${row.id}`,
  name: row.service_name,
  monogram: row.monogram,
  markTone: row.mark_tone,
  plan: row.plan_name || "",
  category: row.category || "기타",
  amount: Number(row.amount_krw || 0),
  billingCycle: row.billing_cycle || "매월",
  dueDay: Number(row.due_day || 1),
  nextBillingDate: row.next_billing_date || "",
  paymentMethod: row.payment_method || "",
  cancelUrl: row.cancel_url || "",
  status: row.status || "active",
  alertD3: row.alert_d3 !== false,
  alertD1: row.alert_d1 !== false,
  isTrial: row.status === "trial",
  renewalPending: Boolean(row.renewal_pending),
  renewalReviewedFor: row.renewal_reviewed_for || undefined,
  createdAt: row.created_at,
});

const cancellationToRow = (userId, item) => ({
  user_id: userId,
  history_id: String(item.historyId),
  subscription_id: item.subscriptionId || null,
  service_id: item.id || null,
  name: item.name || "",
  monogram: item.monogram || null,
  plan: item.plan || null,
  category: item.category || null,
  amount: Number(item.amount || 0),
  billing_cycle: item.billingCycle || "매월",
  cancelled_at: item.cancelledAt || new Date().toISOString(),
  source: item.source || "guide",
});

const rowToCancellation = (row) => ({
  historyId: row.history_id,
  subscriptionId: row.subscription_id,
  id: row.service_id,
  name: row.name,
  monogram: row.monogram,
  plan: row.plan || "",
  category: row.category || "기타",
  amount: Number(row.amount || 0),
  billingCycle: row.billing_cycle || "매월",
  cancelledAt: row.cancelled_at,
  source: row.source || "guide",
});

const notificationToRow = (userId, item) => ({
  user_id: userId,
  notification_id: String(item.id),
  subscription_id: item.subscriptionId || null,
  service_name: item.serviceName || null,
  amount: item.amount == null ? null : Number(item.amount),
  plan: item.plan || null,
  monogram: item.monogram || null,
  category: item.category || null,
  type: item.type || "system",
  badge: item.badge || null,
  title: item.title || "",
  message: item.message || "",
  occurred_at: item.timestamp || new Date().toISOString(),
  days_until: item.daysUntil == null ? null : Number(item.daysUntil),
  is_read: Boolean(item.read),
});

const rowToNotification = (row) => ({
  id: row.notification_id,
  subscriptionId: row.subscription_id,
  serviceName: row.service_name,
  amount: row.amount == null ? undefined : Number(row.amount),
  plan: row.plan,
  monogram: row.monogram,
  category: row.category,
  type: row.type,
  badge: row.badge,
  title: row.title,
  message: row.message,
  timestamp: row.occurred_at,
  daysUntil: row.days_until == null ? undefined : Number(row.days_until),
  read: Boolean(row.is_read),
});

export async function loadRemoteSnapshot() {
  const user = await currentUser();
  if (!user) return null;

  const [profileResult, subscriptionsResult, historyResult, notificationsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("cancellation_history").select("*").eq("user_id", user.id).order("cancelled_at", { ascending: false }),
    supabase.from("notifications").select("*").eq("user_id", user.id).order("occurred_at", { ascending: false }),
  ]);

  const firstError = [profileResult.error, subscriptionsResult.error, historyResult.error, notificationsResult.error].find(Boolean);
  if (firstError) {
    console.warn("RE. remote snapshot load skipped:", firstError.message);
    return null;
  }

  const p = profileResult.data;
  return {
    profile: p ? {
      nickname: p.nickname || "",
      provider: p.provider || "RE.",
      guest: false,
      notificationsAllowed: p.notifications_allowed !== false,
    } : null,
    onboardingComplete: p?.onboarding_complete,
    introSeen: p?.intro_seen,
    savedAmount: p == null ? undefined : Number(p.saved_amount || 0),
    subscriptions: (subscriptionsResult.data || []).map(rowToSubscription),
    cancellationHistory: (historyResult.data || []).map(rowToCancellation),
    notifications: (notificationsResult.data || []).map(rowToNotification),
  };
}

async function replaceUserRows(table, userId, keyColumn, rows) {
  const keys = rows.map((row) => row[keyColumn]).filter(Boolean);
  if (rows.length) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: `user_id,${keyColumn}` });
    if (error) throw error;
  }

  const { data: existing, error: listError } = await supabase.from(table).select(keyColumn).eq("user_id", userId);
  if (listError) throw listError;
  const keep = new Set(keys.map(String));
  const stale = (existing || [])
    .map((row) => row[keyColumn])
    .filter((value) => value && !keep.has(String(value)));
  if (stale.length) {
    const { error: deleteError } = await supabase.from(table).delete().eq("user_id", userId).in(keyColumn, stale);
    if (deleteError) throw deleteError;
  }
}

export async function saveRemoteSnapshot(snapshot) {
  const user = await currentUser();
  if (!user) return { skipped: true, reason: "no-auth-session" };

  const profile = snapshot.profile || {};
  const { error: profileError } = await supabase.from("profiles").upsert({
    user_id: user.id,
    nickname: profile.nickname || "",
    provider: profile.provider || "RE.",
    notifications_allowed: profile.notificationsAllowed !== false,
    onboarding_complete: Boolean(snapshot.onboardingComplete),
    intro_seen: Boolean(snapshot.introSeen),
    saved_amount: Number(snapshot.savedAmount || 0),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (profileError) throw profileError;

  await replaceUserRows(
    "subscriptions",
    user.id,
    "subscription_id",
    (snapshot.subscriptions || []).filter((item) => item?.subscriptionId).map((item) => subscriptionToRow(user.id, item)),
  );
  await replaceUserRows(
    "cancellation_history",
    user.id,
    "history_id",
    (snapshot.cancellationHistory || []).filter((item) => item?.historyId).map((item) => cancellationToRow(user.id, item)),
  );
  await replaceUserRows(
    "notifications",
    user.id,
    "notification_id",
    (snapshot.notifications || []).filter((item) => item?.id).map((item) => notificationToRow(user.id, item)),
  );

  return { skipped: false };
}
