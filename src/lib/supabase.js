import { Browser } from "@capacitor/browser";
import { isNativePlatform } from "./platform.js";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '';
const supabaseAnonKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function signInWithGoogle({ redirectTo } = {}) {
  if (!supabase) throw new Error("Supabase is not configured.");

  if (isNativePlatform()) {
    const callbackUrl = "submate://auth/callback";
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (data?.url) {
      await Browser.open({ url: data.url, windowName: "_self" });
    }
    return { data, error: null };
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo || origin,
    },
  });
}

export async function signOut() {
  if (!supabase) return;
  return supabase.auth.signOut();
}

export function mapDbToSubscription(row) {
  return {
    id: row.service_id || row.subscription_id,
    name: row.service_name,
    plan: row.plan_name,
    amount: row.amount_krw,
    billingCycle: row.billing_cycle || '매월',
    category: row.category || '기타',
    dueDay: row.due_day,
    paymentMethod: row.payment_method || '',
    cancelUrl: row.cancel_url || '',
    status: row.status || 'active',
    subscriptionId: row.subscription_id,
    monogram: row.monogram || (row.service_name ? row.service_name.slice(0, 1).toUpperCase() : ''),
    markTone: row.mark_tone || null,
    alertD3: Boolean(row.alert_d3),
    alertD1: Boolean(row.alert_d1),
    renewalPending: Boolean(row.renewal_pending),
    createdAt: row.created_at,
    nextBillingDate: row.next_billing_date || null,
    renewalReviewedFor: row.renewal_reviewed_for || null,
    isTrial: row.status === 'trial',
  };
}

export function mapSubscriptionToDb(sub, userId) {
  return {
    user_id: userId,
    subscription_id: sub.subscriptionId || sub.id,
    service_id: sub.id && (sub.id.startsWith('manual-') || sub.id.startsWith('custom-')) ? null : sub.id,
    service_name: sub.name,
    plan_name: sub.plan,
    category: sub.category || '기타',
    amount_krw: sub.amount,
    due_day: sub.dueDay || 1,
    billing_cycle: sub.billingCycle || '매월',
    payment_method: sub.paymentMethod || '',
    cancel_url: sub.cancelUrl || '',
    status: sub.status || (sub.isTrial ? 'trial' : 'active'),
    source_type: sub.sourceType || 'manual',
    alert_d3: sub.alertD3 !== false,
    alert_d1: Boolean(sub.alertD1),
    renewal_pending: Boolean(sub.renewalPending),
    monogram: sub.monogram || '',
    mark_tone: sub.markTone || null,
    next_billing_date: sub.nextBillingDate || null,
    renewalReviewedFor: sub.renewalReviewedFor || null,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchUserSubscriptions(userId) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapDbToSubscription);
  } catch (err) {
    console.warn('fetchUserSubscriptions error:', err);
    return [];
  }
}

export async function upsertDbSubscription(userId, sub) {
  if (!supabase || !userId) return null;
  try {
    const row = mapSubscriptionToDb(sub, userId);
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert(row, { onConflict: 'user_id,subscription_id' })
      .select()
      .single();
    if (error) throw error;
    return data ? mapDbToSubscription(data) : null;
  } catch (err) {
    console.warn('upsertDbSubscription error:', err);
    return null;
  }
}

export async function deleteDbSubscription(userId, subscriptionId) {
  if (!supabase || !userId || !subscriptionId) return false;
  try {
    const { error } = await supabase
      .from('subscriptions')
      .delete(
      )
      .eq('user_id', userId)
      .eq('subscription_id', subscriptionId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('deleteDbSubscription error:', err);
    return false;
  }
}
/**
 * 데이터베이스에서 모든 활성 구독 서비스 및 요금제 목록을 조회합니다.
 */
export async function fetchServiceCatalog() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('subscription_services')
      .select(`
        id,
        name,
        aliases,
        category,
        service_plans (
          id,
          name,
          aliases,
          amount_krw,
          billing_cycle
        )
      `)
      .eq('active', true)
      .order('name');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('fetchServiceCatalog error:', err);
    return [];
  }
}

/**
 * 사용자의 검색어(서비스명 또는 별칭)를 바탕으로 매칭되는 서비스 및 요금제를 자동완성 추천합니다.
 */
export function matchServicesFromCatalog(catalog, keyword) {
  if (!Array.isArray(catalog) || !keyword || !keyword.trim()) return [];
  const q = keyword.trim().toLowerCase().replace(/\s+/g, '');

  return catalog.filter((service) => {
    const name = String(service.name || '').toLowerCase().replace(/\s+/g, '');
    if (name.includes(q)) return true;

    const aliases = Array.isArray(service.aliases) ? service.aliases : [];
    return aliases.some((alias) => {
      const a = String(alias).toLowerCase().replace(/\s+/g, '');
      return a.includes(q);
    });
  }).map((service) => ({
    ...service,
    plans: Array.isArray(service.service_plans) ? service.service_plans : (service.plans || []),
  }));
}


