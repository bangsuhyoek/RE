package kr.co.re.subscription.payment;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import kr.co.re.subscription.MainActivity;
import kr.co.re.subscription.R;

public final class PaymentNotificationHelper {
    // New channel id avoids stale importance state left by earlier experimental channels.
    public static final String CHANNEL_ID = "re_payment_candidates_v106";
    private PaymentNotificationHelper() {}

    public static void dispatch(Context context, String candidateId, PaymentParser.ParsedPayment payment) {
        if (context == null || payment == null) return;
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "구독 결제 확인", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("구독 결제가 감지되면 RE. 컨시어지가 바로 알려드려요.");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 140, 80, 140});
            manager.createNotificationChannel(channel);
        }

        Uri deepLink = (candidateId != null && !candidateId.isEmpty())
            ? Uri.parse("reapp://payment/candidate?id=" + Uri.encode(candidateId) + "&source=heads-up")
            : Uri.parse("reapp://payment/candidate?source=heads-up");
        Intent intent = new Intent(Intent.ACTION_VIEW, deepLink, context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int requestCode = (candidateId == null || candidateId.isEmpty()) ? (int)(System.currentTimeMillis() % 100000) : candidateId.hashCode();
        PendingIntent pending = PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String amount = String.format("%,d원", payment.amount);
        String title = "결제 내역을 확인했어요";
        String body = payment.serviceName + " · " + amount + " 결제를 RE.가 찾았어요.";

        RemoteViews headsUp = new RemoteViews(context.getPackageName(), R.layout.notification_re_concierge_heads_up);
        headsUp.setTextViewText(R.id.re_heads_up_title, title);
        headsUp.setTextViewText(R.id.re_heads_up_body, body);
        headsUp.setImageViewResource(R.id.re_heads_up_character, R.drawable.re_heads_up_character);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_re)
            .setLargeIcon(BitmapFactory.decodeResource(context.getResources(), R.drawable.re_heads_up_character))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(headsUp)
            .setCustomHeadsUpContentView(headsUp)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_EVENT)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)
            .setContentIntent(pending);

        int notificationId = (candidateId == null || candidateId.isEmpty()) ? (int)(System.currentTimeMillis() % Integer.MAX_VALUE) : candidateId.hashCode();
        manager.notify(notificationId, builder.build());
    }
}