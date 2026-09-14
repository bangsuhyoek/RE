package com.submate.app.payment;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.submate.app.MainActivity;
import com.submate.app.R;

public final class PaymentNotificationHelper {
    private static final String TAG = "REPaymentNotif";
    public static final String CHANNEL_ID = "re_payment_candidates_v106_runtime";

    private PaymentNotificationHelper() {}

    public static void dispatch(Context context, String candidateId, PaymentParser.ParsedPayment payment) {
        if (context == null || payment == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "POST_NOTIFICATIONS not granted");
            return;
        }

        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "RE. 구독 결제 알림",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("구독 결제가 감지되면 RE.가 바로 알려드려요.");
            channel.enableVibration(true);
            manager.createNotificationChannel(channel);
        }

        try {
            String stableId = candidateId == null ? "" : candidateId;
            Uri deepLink = Uri.parse(
                    "reapp://payment/candidate?id=" + Uri.encode(stableId) + "&source=heads-up"
            );

            Intent intent = new Intent(Intent.ACTION_VIEW, deepLink, context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK |
                    Intent.FLAG_ACTIVITY_CLEAR_TOP |
                    Intent.FLAG_ACTIVITY_SINGLE_TOP);

            int requestCode = !stableId.isEmpty()
                    ? stableId.hashCode()
                    : (int) (System.currentTimeMillis() % 100000);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            String amount = String.format("%,d원", payment.amount);
            String title = "결제 내역을 확인했어요";
            String body = payment.serviceName + " · " + amount + " 결제를 RE.가 찾았어요.";

            NotificationCompat.Builder builder =
                    new NotificationCompat.Builder(context, CHANNEL_ID)
                            .setSmallIcon(R.mipmap.ic_launcher)
                            .setContentTitle(title)
                            .setContentText(body)
                            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                            .setPriority(NotificationCompat.PRIORITY_HIGH)
                            .setCategory(NotificationCompat.CATEGORY_EVENT)
                            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
                            .setAutoCancel(true)
                            .setOnlyAlertOnce(false)
                            .setContentIntent(pendingIntent);

            int notificationId = !stableId.isEmpty()
                    ? stableId.hashCode()
                    : (int) (System.currentTimeMillis() % Integer.MAX_VALUE);
            manager.notify(notificationId, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "notification dispatch failed", e);
        }
    }
}
