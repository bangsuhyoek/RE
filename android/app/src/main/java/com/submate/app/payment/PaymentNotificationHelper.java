package com.submate.app.payment;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.submate.app.MainActivity;
import com.submate.app.R;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

public class PaymentNotificationHelper {

    private static final String TAG = "PaymentNotifHelper";
    public static final String CHANNEL_ID = "submate_payment_alerts";
    public static final String PREF_NAME_NONCE = "submate_quick_add_nonces";
    public static final long NONCE_TTL_MS = 5 * 60 * 1000L; // 5분 유효기간

    /**
     * SharedPreferences 인스턴스를 직접 전달받아 nonce를 발급한다 (단위 테스트 및 내부용).
     */
    public static synchronized String generateNonceWithPrefs(SharedPreferences prefs) {
        if (prefs == null) return UUID.randomUUID().toString();
        cleanupExpiredNonces(prefs);

        String nonce = UUID.randomUUID().toString();
        long expiresAt = System.currentTimeMillis() + NONCE_TTL_MS;
        prefs.edit().putLong(nonce, expiresAt).apply();
        return nonce;
    }

    /**
     * 일회용 quick-add nonce를 생성하고 SharedPreferences에 저장한다.
     * @param context
     * @return 발급된 nonce 문자열
     */
    public static synchronized String generateNonce(Context context) {
        if (context == null) return UUID.randomUUID().toString();
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME_NONCE, Context.MODE_PRIVATE);
        return generateNonceWithPrefs(prefs);
    }

    /**
     * SharedPreferences 인스턴스를 직접 전달받아 nonce를 검증하고 소비한다 (단위 테스트 및 내부용).
     */
    public static synchronized boolean verifyAndConsumeNonceWithPrefs(SharedPreferences prefs, String nonce) {
        if (prefs == null || nonce == null || nonce.trim().isEmpty()) {
            return false;
        }
        long expiresAt = prefs.getLong(nonce, 0L);
        if (expiresAt == 0L) {
            return false;
        }
        // 사용 즉시 소비 (재사용 방지)
        prefs.edit().remove(nonce).apply();

        long now = System.currentTimeMillis();
        return now <= expiresAt;
    }

    /**
     * quick-add nonce가 유효한지 확인하고 즉시 소비(삭제)한다.
     * 1회용이며 만료되었거나 이미 사용된 경우 false를 반환한다.
     * @param context
     * @param nonce
     * @return 유효 여부
     */
    public static synchronized boolean verifyAndConsumeNonce(Context context, String nonce) {
        if (context == null || nonce == null || nonce.trim().isEmpty()) {
            return false;
        }
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME_NONCE, Context.MODE_PRIVATE);
        return verifyAndConsumeNonceWithPrefs(prefs, nonce);
    }


    private static void cleanupExpiredNonces(SharedPreferences prefs) {
        try {
            long now = System.currentTimeMillis();
            Map<String, ?> all = prefs.getAll();
            SharedPreferences.Editor editor = prefs.edit();
            boolean changed = false;
            for (Map.Entry<String, ?> entry : all.entrySet()) {
                if (entry.getValue() instanceof Long) {
                    long exp = (Long) entry.getValue();
                    if (now > exp) {
                        editor.remove(entry.getKey());
                        changed = true;
                    }
                }
            }
            if (changed) {
                editor.apply();
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to clean up expired nonces", e);
        }
    }

    public static void dispatchQuickAddNotification(Context context, PaymentParser.ParsedPayment payment) {
        if (context == null || payment == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS)
                    != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "POST_NOTIFICATIONS permission not granted. Skip notification.");
                return;
            }
        }

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "꾸독 결제 감지 알림",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("새로운 구독 결제가 감지되었을 때 즉시 등록 알림을 제공합니다.");
            channel.enableVibration(true);
            nm.createNotificationChannel(channel);
        }

        try {
            String nonce = generateNonce(context);
            String deepLink = "submate://quick-add?name=" + URLEncoder.encode(payment.serviceName, StandardCharsets.UTF_8.name())
                    + "&amount=" + payment.amount
                    + "&plan=" + URLEncoder.encode(payment.plan, StandardCharsets.UTF_8.name())
                    + "&method=" + URLEncoder.encode(payment.paymentMethod, StandardCharsets.UTF_8.name())
                    + "&category=" + URLEncoder.encode(payment.category, StandardCharsets.UTF_8.name())
                    + "&serviceId=" + URLEncoder.encode(payment.serviceId, StandardCharsets.UTF_8.name())
                    + "&detectedAt=" + System.currentTimeMillis()
                    + "&dueDay=" + java.util.Calendar.getInstance().get(java.util.Calendar.DAY_OF_MONTH)
                    + "&nonce=" + URLEncoder.encode(nonce, StandardCharsets.UTF_8.name());

            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(deepLink));
            intent.setClass(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context,
                    (int) (System.currentTimeMillis() % 100000),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            String formattedAmount = String.format("%,d원", payment.amount);
            String notiTitle = "⚡ " + payment.serviceName + " 결제 감지 (" + formattedAmount + ")";
            String notiText = "방금 결제된 구독 정보를 꾸독에서 확인할 수 있어요. 터치해서 확인해 주세요.";

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
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


