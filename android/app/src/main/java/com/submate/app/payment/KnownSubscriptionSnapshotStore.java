package kr.co.re.subscription.payment;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSArray;
import java.util.HashSet;
import java.util.Set;

/**
 * Minimal native snapshot of service ids already registered by the signed-in user.
 * The WebView syncs this after reading the existing subscriptions table. Until the
 * first sync completes, the overlay fails closed and ordinary candidate handling
 * continues unchanged.
 */
public final class KnownSubscriptionSnapshotStore {
    private static final String PREFS = "re_subscription_snapshot";
    private static final String SERVICE_IDS = "service_ids";
    private static final String INITIALIZED = "initialized";
    private static final String UPDATED_AT = "updated_at";

    private KnownSubscriptionSnapshotStore() {}

    public static void sync(Context context, JSArray ids) {
        if (context == null) return;
        Set<String> values = new HashSet<>();
        if (ids != null) {
            for (int i = 0; i < ids.length(); i++) {
                String value = ids.optString(i, "").trim().toLowerCase();
                if (!value.isEmpty() && !"unknown".equals(value)) values.add(value);
            }
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putStringSet(SERVICE_IDS, values)
                .putBoolean(INITIALIZED, true)
                .putLong(UPDATED_AT, System.currentTimeMillis())
                .apply();
    }

    public static boolean isInitialized(Context context) {
        return context != null && context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean(INITIALIZED, false);
    }

    public static boolean isNewService(Context context, String serviceId) {
        if (!isInitialized(context)) return false;
        String normalized = serviceId == null ? "" : serviceId.trim().toLowerCase();
        if (normalized.isEmpty() || "unknown".equals(normalized)) return false;
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Set<String> values = prefs.getStringSet(SERVICE_IDS, new HashSet<>());
        return !values.contains(normalized);
    }

    public static long getUpdatedAt(Context context) {
        if (context == null) return 0L;
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getLong(UPDATED_AT, 0L);
    }
}
