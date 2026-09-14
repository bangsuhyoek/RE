package com.submate.app.payment;

import android.content.Context;

public final class PaymentCapturePreferences {
    private static final String PREFS = "re_payment_capture_settings";
    private static final String NOTIFY_CANDIDATES = "notify_candidates";

    private PaymentCapturePreferences() {}

    public static boolean candidateNotificationsEnabled(Context context) {
        if (context == null) return true;
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean(NOTIFY_CANDIDATES, true);
    }

    public static void setCandidateNotificationsEnabled(Context context, boolean enabled) {
        if (context == null) return;
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(NOTIFY_CANDIDATES, enabled)
                .apply();
    }
}
