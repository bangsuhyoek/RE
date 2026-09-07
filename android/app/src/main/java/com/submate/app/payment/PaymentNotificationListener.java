package com.submate.app.payment;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.submate.app.MainActivity;
import com.submate.app.R;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class PaymentNotificationListener extends NotificationListenerService {

    private static final String TAG = "SubMatePaymentListener";
    public static final String CHANNEL_ID = "submate_payment_alerts";
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

        Log.d(TAG, "Notification received from: " + packageName + " | Title: " + title + " | Body: " + fullBody);

        PaymentParser.ParsedPayment parsed = PaymentParser.parse(packageName, title, fullBody);
        if (parsed == null || !parsed.isSubscription) {
            return;
        }

        // 중복 방지 (카드사 앱 푸시와 SMS가 동시에 오는 경우 등)
        String dedupKey = parsed.serviceName + "_" + parsed.amount;
        long now = System.currentTimeMillis();
        Long lastSeen = RECENT_EVENTS.get(dedupKey);
        if (lastSeen != null && (now - lastSeen) < DEDUP_WINDOW_MS) {
            Log.d(TAG, "Duplicate payment alert ignored: " + dedupKey);
            return;
        }
        RECENT_EVENTS.put(dedupKey, now);

        Log.i(TAG, "Detected Subscription Payment! Service: " + parsed.serviceName + " | Amount: " + parsed.amount);
        dispatchQuickAddNotification(parsed);
    }

    public void dispatchQuickAddNotification(PaymentParser.ParsedPayment payment) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "SubMate 결제 감지 알림",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("새로운 구독 결제가 감지되었을 때 즉시 등록 알림을 제공합니다.");
            channel.enableVibration(true);
            nm.createNotificationChannel(channel);
        }

        try {
            String deepLink = "submate://quick-add?name=" + URLEncoder.encode(payment.serviceName, StandardCharsets.UTF_8.name())
                    + "&amount=" + payment.amount
                    + "&plan=" + URLEncoder.encode(payment.plan, StandardCharsets.UTF_8.name())
                    + "&method=" + URLEncoder.encode(payment.paymentMethod, StandardCharsets.UTF_8.name())
                    + "&category=" + URLEncoder.encode(payment.category, StandardCharsets.UTF_8.name())
                    + "&serviceId=" + URLEncoder.encode(payment.serviceId, StandardCharsets.UTF_8.name());

            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(deepLink));
            intent.setClass(this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this,
                    (int) (System.currentTimeMillis() % 100000),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            String formattedAmount = String.format("%,d원", payment.amount);
            String notiTitle = "⚡ " + payment.serviceName + " 결제 감지 (" + formattedAmount + ")";
            String notiText = "방금 결제된 내역을 SubMate에 바로 등록하시겠습니까? 터치하여 입력.";

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(notiTitle)
                    .setContentText(notiText)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(notiText + " (결제수단: " + payment.paymentMethod + ", 요금제: " + payment.plan + ")"))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent);

            nm.notify((int) (System.currentTimeMillis() % 100000), builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Failed to dispatch notification", e);
        }
    }
}
