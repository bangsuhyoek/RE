package com.re.cardtest;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/** Posts synthetic external payment notifications from the QA package UID. */
public class NotificationPublisher extends BroadcastReceiver {
    private static final String TAG = "REParityPublisher";
    private static final String DEFAULT_TITLE = "\uC2E0\uD55C\uCE74\uB4DC \uC2B9\uC778";
    private static final String DEFAULT_BODY = "Netflix \uC815\uAE30\uACB0\uC81C 17,000\uC6D0 \uC2B9\uC778";

    @Override
    public void onReceive(Context context, Intent intent) {
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) throw new IllegalStateException("test NotificationManager missing");

        String title = intent != null ? intent.getStringExtra("title") : null;
        String body = intent != null ? intent.getStringExtra("body") : null;
        int id = intent != null ? intent.getIntExtra("id", 9001) : 9001;
        if (title == null || title.isEmpty()) title = DEFAULT_TITLE;
        if (body == null || body.isEmpty()) body = DEFAULT_BODY;

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
               .setContentTitle(title)
               .setContentText(body)
               .setStyle(new Notification.BigTextStyle().bigText(body))
               .setPriority(Notification.PRIORITY_HIGH)
               .setCategory(Notification.CATEGORY_EVENT);

        Log.i(TAG, "posting package=" + context.getPackageName()
                + " title=" + title + " body=" + body + " id=" + id);
        manager.notify(id, builder.build());
        Log.i(TAG, "posted id=" + id);
    }
}
