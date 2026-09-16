package kr.co.re.subscription.payment;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.UUID;

public final class PaymentCandidateStore {
    private static final String PREFS = "re_payment_candidates";
    private static final String KEY = "normalized_candidates";
    private static final long MAX_AGE_MS = 7L * 24L * 60L * 60L * 1000L;

    private PaymentCandidateStore() {}

    public static synchronized String save(Context context, PaymentParser.ParsedPayment payment) {
        if (context == null || payment == null) return "";
        JSONArray items = readValid(context);
        String id = UUID.randomUUID().toString();
        try {
            JSONObject item = new JSONObject();
            item.put("id", id);
            item.put("serviceId", payment.serviceId);
            item.put("serviceName", payment.serviceName);
            item.put("category", payment.category);
            item.put("planName", payment.plan);
            item.put("amount", payment.amount);
            item.put("paymentMethod", payment.paymentMethod);
            item.put("detectedAt", System.currentTimeMillis());
            items.put(item);
            write(context, items);
            return id;
        } catch (Exception ignored) {
            return "";
        }
    }

    public static synchronized JSONArray list(Context context) {
        if (context == null) return new JSONArray();
        JSONArray items = readValid(context);
        write(context, items);
        return items;
    }

    public static synchronized boolean remove(Context context, String id) {
        if (context == null || id == null || id.isEmpty()) return false;
        JSONArray items = readValid(context);
        JSONArray next = new JSONArray();
        boolean removed = false;
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            if (id.equals(item.optString("id"))) {
                removed = true;
            } else {
                next.put(item);
            }
        }
        write(context, next);
        return removed;
    }

    private static JSONArray readValid(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONArray raw;
        try {
            raw = new JSONArray(prefs.getString(KEY, "[]"));
        } catch (Exception ignored) {
            raw = new JSONArray();
        }
        JSONArray valid = new JSONArray();
        long cutoff = System.currentTimeMillis() - MAX_AGE_MS;
        for (int i = 0; i < raw.length(); i++) {
            JSONObject item = raw.optJSONObject(i);
            if (item != null && item.optLong("detectedAt", 0L) >= cutoff) {
                valid.put(item);
            }
        }
        return valid;
    }

    private static void write(Context context, JSONArray items) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY, items.toString())
                .apply();
    }
}
