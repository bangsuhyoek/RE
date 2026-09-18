package kr.co.re.subscription.payment;

import android.Manifest;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;
import androidx.core.content.ContextCompat;

/** Adds the new-subscription overlay after the already-proven candidate + heads-up path. */
public final class PaymentDetectionCoordinator {
    private static final String TAG = "REPaymentCoordinator";
    public static final String EVENT_NEW_SUBSCRIPTION = "NEW_SUBSCRIPTION_DETECTED";
    public static final String EVENT_UNCLASSIFIED = "UNCLASSIFIED";

    public static final class Result {
        public final String candidateId;
        public final String eventType;
        public final boolean headsUpRequested;
        public final boolean overlayRequested;

        Result(String candidateId, String eventType, boolean headsUpRequested, boolean overlayRequested) {
            this.candidateId = candidateId;
            this.eventType = eventType;
            this.headsUpRequested = headsUpRequested;
            this.overlayRequested = overlayRequested;
        }
    }

    private PaymentDetectionCoordinator() {}

    private static boolean canPostVisibleNotification(Context context) {
        if (context == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) return false;
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        return manager != null
                && (Build.VERSION.SDK_INT < Build.VERSION_CODES.N || manager.areNotificationsEnabled());
    }

    public static Result handle(Context context, PaymentParser.ParsedPayment parsed) {
        if (context == null || parsed == null || !parsed.isSubscription) {
            return new Result("", EVENT_UNCLASSIFIED, false, false);
        }

        // Preserve the baseline ordering: persist first, then dispatch the existing
        // candidate heads-up when the user's existing preference allows it.
        String candidateId = PaymentCandidateStore.save(context, parsed);
        boolean headsUpPreference = PaymentCapturePreferences.candidateNotificationsEnabled(context);
        boolean canNotify = canPostVisibleNotification(context);
        boolean headsUpRequested = headsUpPreference && canNotify;
        if (headsUpRequested) {
            PaymentNotificationHelper.dispatch(context, candidateId, parsed);
        } else {
            Log.d(TAG, "heads-up suppressed preference=" + headsUpPreference + " canNotify=" + canNotify);
        }

        boolean snapshotReady = KnownSubscriptionSnapshotStore.isInitialized(context);
        boolean isNew = snapshotReady
                && KnownSubscriptionSnapshotStore.isNewService(context, parsed.serviceId);
        String eventType = isNew ? EVENT_NEW_SUBSCRIPTION : EVENT_UNCLASSIFIED;

        boolean overlayRequested = false;
        if (!snapshotReady) {
            Log.i(TAG, "overlay skip reason=snapshot_uninitialized candidate=" + candidateId);
        } else if (!isNew) {
            Log.i(TAG, "overlay skip reason=not_new_service serviceId=" + parsed.serviceId);
        } else if (!ConciergePreferences.isEnabled(context)) {
            Log.i(TAG, "overlay skip reason=concierge_disabled candidate=" + candidateId);
        } else if (!headsUpRequested) {
            Log.i(TAG, "overlay skip reason=heads_up_unavailable candidate=" + candidateId);
        } else {
            overlayRequested = AnimatedConciergeOverlayController.show(
                    context, candidateId, parsed, eventType);
        }

        Log.i(TAG, "candidate=" + candidateId
                + " event=" + eventType
                + " snapshotReady=" + snapshotReady
                + " headsUp=" + headsUpRequested
                + " overlay=" + overlayRequested);
        return new Result(candidateId, eventType, headsUpRequested, overlayRequested);
    }
}
