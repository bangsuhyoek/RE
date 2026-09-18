package kr.co.re.subscription.payment;

import android.content.Context;

/** Native mirror of the existing RE concierge on/off state. */
public final class ConciergePreferences {
    private static final String PREFS = "re_concierge_native";
    private static final String ENABLED = "animated_concierge_enabled";

    private ConciergePreferences() {}

    public static boolean isEnabled(Context context) {
        if (context == null) return true;
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean(ENABLED, true);
    }

    public static void setEnabled(Context context, boolean enabled) {
        if (context == null) return;
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(ENABLED, enabled)
                .apply();
    }
}
