package com.submate.app.payment;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class PaymentNotificationListener extends NotificationListenerService {

    private static final String TAG = "SubMatePaymentListener";
    public static final String CHANNEL_ID = PaymentNotificationHelper.CHANNEL_ID;
    private static final Map<String, Long> RECENT_EVENTS = new ConcurrentHashMap<>();
    private static final long DEDUP_WINDOW_MS = 24L * 60 * 60 * 1000L; // 24시간 중복 방지
    private static final String DEDUP_PREFS_NAME = "submate_payment_dedup_hashes";
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

        // 중복 방지 (카드사 앱 푸시와 SMS가 동시에 오거나 재부팅/재시작 후 중복 알림 방지 - 24시간 보관)
        String dedupKey = computeDedupHash(parsed.serviceId, parsed.serviceName, parsed.amount, parsed.currency);
        long now = System.currentTimeMillis();

        if (isDuplicateEvent(this, dedupKey, now)) {
            Log.d(TAG, "Duplicate payment alert ignored");
            return;
        }
        recordDedupEvent(this, dedupKey, now);

        Log.i(TAG, "Detected Subscription Payment! Service: " + parsed.serviceName);
        PaymentNotificationHelper.dispatchQuickAddNotification(this, parsed);
    }

    public static String computeDedupHash(String serviceId, String serviceName, int amount, String currency) {
        String base = (serviceId != null ? serviceId : "") + "|"
                + (serviceName != null ? serviceName : "") + "|"
                + amount + "|"
                + (currency != null ? currency : "KRW");
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(base.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return base;
        }
    }

    public static synchronized boolean isDuplicateEvent(Context context, String hashKey, long now) {
        // 1. 메모리 캐시 체크
        Long lastSeen = RECENT_EVENTS.get(hashKey);
        if (lastSeen != null && (now - lastSeen) < DEDUP_WINDOW_MS) {
            return true;
        }
        // 2. SharedPreferences 영구 저장소 체크 (재시작 후에도 24시간 유지)
        if (context != null) {
            SharedPreferences prefs = context.getSharedPreferences(DEDUP_PREFS_NAME, Context.MODE_PRIVATE);
            long storedTime = prefs.getLong(hashKey, 0L);
            if (storedTime > 0 && (now - storedTime) < DEDUP_WINDOW_MS) {
                RECENT_EVENTS.put(hashKey, storedTime);
                return true;
            }
        }
        return false;
    }

    public static synchronized void recordDedupEvent(Context context, String hashKey, long now) {
        RECENT_EVENTS.put(hashKey, now);

        // 메모리 정리
        if (RECENT_EVENTS.size() > 100) {
            RECENT_EVENTS.entrySet().removeIf(entry -> (now - entry.getValue()) >= DEDUP_WINDOW_MS);
        }

        // SharedPreferences에 저장 및 만료 항목 정리
        if (context != null) {
            try {
                SharedPreferences prefs = context.getSharedPreferences(DEDUP_PREFS_NAME, Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                editor.putLong(hashKey, now);

                Map<String, ?> all = prefs.getAll();
                if (all != null && all.size() > 100) {
                    for (Map.Entry<String, ?> entry : all.entrySet()) {
                        Object val = entry.getValue();
                        if (val instanceof Long && (now - (Long) val) >= DEDUP_WINDOW_MS) {
                            editor.remove(entry.getKey());
                        }
                    }
                }
                editor.apply();
            } catch (Exception e) {
                Log.w(TAG, "Failed to persist dedup hash", e);
            }
        }
    }

    private PaymentParser.ParsedPayment extractFromStatusBarNotification(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return null;

        String packageName = sbn.getPackageName();
        // 수집 대상이 아닌 알림은 내용을 읽지 않고 즉시 버림 (개인정보 보호)
        if (!PaymentPackageRegistry.isTargetPackage(this, packageName)) {
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
