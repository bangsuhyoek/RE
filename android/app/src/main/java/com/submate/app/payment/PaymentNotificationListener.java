package com.submate.app.payment;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class PaymentNotificationListener extends NotificationListenerService {

    private static final String TAG = "SubMatePaymentListener";
    public static final String CHANNEL_ID = PaymentNotificationHelper.CHANNEL_ID;
    private static final Map<String, Long> RECENT_EVENTS = new ConcurrentHashMap<>();
    private static final long DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5분 내 동일 결제 중복 방지

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        String packageName = sbn.getPackageName();
        if (!PaymentPackageRegistry.isTargetPackage(packageName)) {
            return;
        }

        // SubMate 자체에서 보낸 알림은 루프 방지를 위해 무시
        if (getPackageName().equals(packageName)) {
            return;
        }

        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;
        if (extras == null) return;

        String title = extras.getString(Notification.EXTRA_TITLE, "");
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigTextCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);

        String text = textCs != null ? textCs.toString() : "";
        String bigText = bigTextCs != null ? bigTextCs.toString() : "";
        String fullBody = (text + " " + bigText).trim();

        Log.d(TAG, "Notification received from: " + packageName);

        PaymentParser.ParsedPayment parsed = PaymentParser.parse(packageName, title, fullBody);
        if (parsed == null || !parsed.isSubscription) {
            return;
        }

        // 중복 방지 (카드사 앱 푸시와 SMS가 동시에 오는 경우 등)
        String dedupKey = parsed.serviceName + "_" + parsed.amount;
        long now = System.currentTimeMillis();

        // 만료된 이벤트 캐시 정리 (메모리 누수 방지)
        if (RECENT_EVENTS.size() > 50) {
            RECENT_EVENTS.entrySet().removeIf(entry -> (now - entry.getValue()) >= DEDUP_WINDOW_MS);
        }

        Long lastSeen = RECENT_EVENTS.get(dedupKey);
        if (lastSeen != null && (now - lastSeen) < DEDUP_WINDOW_MS) {
            Log.d(TAG, "Duplicate payment alert ignored");
            return;
        }
        RECENT_EVENTS.put(dedupKey, now);

        Log.i(TAG, "Detected Subscription Payment! Service: " + parsed.serviceName);
        PaymentNotificationHelper.dispatchQuickAddNotification(this, parsed);
    }
}
