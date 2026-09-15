package kr.co.re.subscription.payment;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

public class PaymentNotificationListener extends NotificationListenerService {
    private static final String TAG = "REPaymentListener";
    private static final Map<String, Long> RECENT = new ConcurrentHashMap<>();
    private static final long DEDUP_MS = 5L * 60L * 1000L;
    private static final AtomicBoolean CONNECTED = new AtomicBoolean(false);
    private static volatile long lastConnectedAt = 0L;

    public static boolean isConnected() {
        return CONNECTED.get();
    }

    public static long getLastConnectedAt() {
        return lastConnectedAt;
    }

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        CONNECTED.set(true);
        lastConnectedAt = System.currentTimeMillis();
        Log.i(TAG, "listener connected");
    }

    @Override
    public void onListenerDisconnected() {
        CONNECTED.set(false);
        Log.w(TAG, "listener disconnected");
        super.onListenerDisconnected();
    }

    @Override
    public void onDestroy() {
        CONNECTED.set(false);
        super.onDestroy();
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        String packageName = sbn.getPackageName();
        if (getPackageName().equals(packageName) || !PaymentPackageRegistry.isTargetPackage(packageName)) return;

        Bundle extras = sbn.getNotification().extras;
        if (extras == null) return;

        CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigTextCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        String title = titleCs != null ? titleCs.toString() : "";
        String text = textCs != null ? textCs.toString() : "";
        String bigText = bigTextCs != null ? bigTextCs.toString() : "";
        String body = (text + " " + bigText).trim();

        Log.d(TAG, "received package=" + packageName + " title=" + title + " bodyLength=" + body.length());
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(packageName, title, body);
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
        if (RECENT.size() > 50) {
            RECENT.entrySet().removeIf(entry -> now - entry.getValue() >= DEDUP_MS);
        }

        String candidateId = PaymentCandidateStore.save(this, parsed);
        Log.i(TAG, "detected service=" + parsed.serviceName + " amount=" + parsed.amount + " candidate=" + candidateId);

        // Important: storage/preferences never gate the phone alert.
        PaymentNotificationHelper.dispatch(this, candidateId, parsed);
    }
}
