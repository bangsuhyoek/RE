package kr.co.re.subscription.payment;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * v1.0.6 payment listener.
 * Detection/dispatch order deliberately mirrors the team main implementation that was
 * verified on a physical device: package -> parse -> dedup -> notify. Candidate storage
 * is kept for the RE review flow, but confidence/preferences no longer gate dispatch.
 */
public class PaymentNotificationListener extends NotificationListenerService {
    private static final String TAG = "REPaymentListener";
    private static final Map<String, Long> RECENT = new ConcurrentHashMap<>();
    private static final long DEDUP_MS = 5L * 60L * 1000L;

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;
        String packageName = sbn.getPackageName();
        if (getPackageName().equals(packageName) || !PaymentPackageRegistry.isTargetPackage(packageName)) return;

        Bundle extras = sbn.getNotification().extras;
        if (extras == null) return;

        String title = String.valueOf(extras.getCharSequence(Notification.EXTRA_TITLE, ""));
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigTextCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        String text = textCs != null ? textCs.toString() : "";
        String bigText = bigTextCs != null ? bigTextCs.toString() : "";
        String fullBody = (text + " " + bigText).trim();

        Log.d(TAG, "received package=" + packageName + " title=" + title + " bodyLength=" + fullBody.length());
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(packageName, title, fullBody);
        if (parsed == null || !parsed.isSubscription) {
            Log.d(TAG, "ignored: parser rejected notification");
            return;
        }

        long now = System.currentTimeMillis();
        String dedup = parsed.serviceName + ":" + parsed.amount;
        Long previous = RECENT.get(dedup);
        if (previous != null && now - previous < DEDUP_MS) {
            Log.d(TAG, "ignored duplicate=" + dedup);
            return;
        }
        RECENT.put(dedup, now);
        if (RECENT.size() > 50) RECENT.entrySet().removeIf(entry -> now - entry.getValue() >= DEDUP_MS);

        // Storage is for the review screen, not a gate for whether the phone alert appears.
        String candidateId = PaymentCandidateStore.save(this, parsed);
        Log.i(TAG, "detected service=" + parsed.serviceName + " amount=" + parsed.amount + " candidate=" + candidateId);
        PaymentNotificationHelper.dispatch(this, candidateId, parsed);
    }
}