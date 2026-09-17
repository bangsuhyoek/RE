package com.re.cardtest;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

/** Posts the synthetic card notification from the QA package UID. */
public class NotificationPublisher extends BroadcastReceiver {
    private static final String TAG = "REParityPublisher";
    private static final String TARGET = "kr.co.re.subscription";
    private static final String TITLE = "\uC2E0\uD55C\uCE74\uB4DC \uC2B9\uC778";
    private static final String BODY = "Netflix \uC815\uAE30\uACB0\uC81C 17,000\uC6D0 \uC2B9\uC778";

    @Override
    public void onReceive(Context context, Intent intent) {
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            throw new IllegalStateException("test NotificationManager missing");
        }

        String channelId = "re-parity-card-test";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId, "RE parity card test", NotificationManager.IMPORTANCE_HIGH);
            manager.createNotificationChannel(channel);
        }

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(context, channelId)
                : new Notification.Builder(context);
        builder.setSmallIcon(android.R.drawable.stat_notify_more)
               .setContentTitle(TITLE)
               .setContentText(BODY)
               .setPriority(Notification.PRIORITY_HIGH);

        Log.i(TAG, "posting package=" + context.getPackageName()
                + " title=" + TITLE + " body=" + BODY);
        manager.notify(9001, builder.build());
        Log.i(TAG, "posted id=9001");

        // Drive the deep link from the QA app process, not from the target
        // instrumentation process. This matches a real external app/notification
        // tap intent and avoids using the target UID to self-dispatch the link.
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try {
                Intent deep = new Intent(Intent.ACTION_VIEW,
                        Uri.parse("reapp://payment/candidate?id=baseline-smoke&source=parity-external"));
                deep.setPackage(TARGET);
                deep.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                context.startActivity(deep);
                Log.i(TAG, "external deep link started id=baseline-smoke");
            } catch (Throwable error) {
                Log.e(TAG, "external deep link failed", error);
            }
        }, 2500L);
    }
}
