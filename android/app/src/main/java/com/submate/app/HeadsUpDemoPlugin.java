package com.submate.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "HeadsUpDemo")
public class HeadsUpDemoPlugin extends Plugin {
    private static final String CHANNEL_ID = "submate-billing-channel";
    private static final int DEFAULT_DELAY_MS = 2500;

    @PluginMethod
    public void showOnHome(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Android context unavailable");
            return;
        }

        if (!notificationsAllowed(context)) {
            JSObject result = new JSObject();
            result.put("scheduled", false);
            result.put("reason", "PERMISSION_REQUIRED");
            call.resolve(result);
            return;
        }

        String title = call.getString("title", "Netflix 결제가 곧 예정되어 있어요.");
        String body = call.getString("body", "더 저렴하게 이용할 수 있는 혜택을 확인해보세요.");
        Integer requestedDelay = call.getInt("delayMs");
        int delayMs = requestedDelay == null ? DEFAULT_DELAY_MS : Math.max(2000, Math.min(requestedDelay, 3000));

        ensureChannel(context);

        if (getActivity() != null) {
            getActivity().moveTaskToBack(true);
        }

        new Handler(Looper.getMainLooper()).postDelayed(
            () -> dispatchHeadsUp(context.getApplicationContext(), title, body),
            delayMs
        );

        JSObject result = new JSObject();
        result.put("scheduled", true);
        result.put("delayMs", delayMs);
        call.resolve(result);
    }

    private boolean notificationsAllowed(Context context) {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
            return false;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    private void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "꾸독 결제 알림",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("구독 결제일 사전 알림 및 갱신 안내");
        channel.enableVibration(true);
        manager.createNotificationChannel(channel);
    }

    private void dispatchHeadsUp(Context context, String title, String body) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            (int) (System.currentTimeMillis() % 100000),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(pendingIntent);

        NotificationManagerCompat.from(context).notify(
            (int) (System.currentTimeMillis() % 100000),
            builder.build()
        );
    }
}
