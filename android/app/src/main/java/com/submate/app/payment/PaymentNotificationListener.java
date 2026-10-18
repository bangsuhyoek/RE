package com.submate.app.payment;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class PaymentNotificationListener extends NotificationListenerService {

    private static final String TAG = "SubMatePaymentListener";
    public static final String CHANNEL_ID = PaymentNotificationHelper.CHANNEL_ID;
    private static final Map<String, Long> RECENT_EVENTS = new ConcurrentHashMap<>();
    private static final long DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5분 내 동일 결제 중복 방지
    private static volatile PaymentNotificationListener activeInstance;

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        activeInstance = this;
    }

    @Override
    public void onListenerDisconnected() {
        if (activeInstance == this) {
            activeInstance = null;
        }
        super.onListenerDisconnected();
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        PaymentParser.ParsedPayment parsed = extractFromStatusBarNotification(sbn);
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

    private PaymentParser.ParsedPayment extractFromStatusBarNotification(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return null;

        String packageName = sbn.getPackageName();
        if (!PaymentPackageRegistry.isTargetPackage(packageName)) {
            return null;
        }

        // SubMate 자체에서 보낸 알림은 루프 방지를 위해 무시
        if (getPackageName().equals(packageName)) {
            return null;
        }

        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;
        if (extras == null) return null;

        String title = extras.getString(Notification.EXTRA_TITLE, "");
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigTextCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);

        String text = textCs != null ? textCs.toString() : "";
        String bigText = bigTextCs != null ? bigTextCs.toString() : "";
        String fullBody = (text + " " + bigText).trim();

        Log.d(TAG, "Notification received from: " + packageName);

        Set<String> installedIds = PaymentPackageRegistry.getInstalledServiceIds(this);
        return PaymentParser.parse(packageName, title, fullBody, installedIds);
    }

    /**
     * 현재 상태바에 남아 있는 모든 활성 알림을 스캔하여 감지된 구독 결제 목록을 반환한다.
     */
    public static List<PaymentParser.ParsedPayment> scanActiveStatusBarNotifications() {
        List<PaymentParser.ParsedPayment> results = new ArrayList<>();
        PaymentNotificationListener listener = activeInstance;
        if (listener == null) return results;
        try {
            StatusBarNotification[] activeList = listener.getActiveNotifications();
            if (activeList == null) return results;
            Set<String> seenKeys = new java.util.HashSet<>();
            for (StatusBarNotification sbn : activeList) {
                PaymentParser.ParsedPayment parsed = listener.extractFromStatusBarNotification(sbn);
                if (parsed != null && parsed.isSubscription) {
                    String key = parsed.serviceId + "_" + parsed.serviceName + "_" + parsed.amount;
                    if (!seenKeys.contains(key)) {
                        seenKeys.add(key);
                        results.add(parsed);
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to scan active notifications", e);
        }
        return results;
    }
}
