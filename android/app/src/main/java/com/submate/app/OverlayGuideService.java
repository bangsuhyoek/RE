package com.submate.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class OverlayGuideService extends Service {
    public static final String ACTION_STOP = "com.submate.app.ACTION_STOP";
    public static final String ACTION_COMPLETE = "com.submate.app.ACTION_COMPLETE";

    private WindowManager windowManager;
    private View bubbleView;
    private View cardView;
    private WindowManager.LayoutParams bubbleParams;
    private WindowManager.LayoutParams cardParams;

    private final List<CancelBrowserActivity.GuideStepItem> stepList = new ArrayList<>();
    private int currentStepIndex = 0;
    private String serviceName = "구독";

    private final ExecutorService executor = Executors.newFixedThreadPool(2);
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        startForegroundNotification();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        if (ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String sName = intent.getStringExtra("serviceName");
        if (sName != null && !sName.isEmpty()) {
            serviceName = sName;
        }
        String stepsJson = intent.getStringExtra("guideStepsJson");
        parseSteps(stepsJson);

        if (bubbleView == null) {
            initBubbleView();
            initCardView();
        }

        showBubble();
        return START_STICKY;
    }

    private void initBubbleView() {
        bubbleView = LayoutInflater.from(this).inflate(R.layout.layout_floating_bubble, null);

        int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        bubbleParams = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
        );

        bubbleParams.gravity = Gravity.TOP | Gravity.START;
        bubbleParams.x = 24;
        bubbleParams.y = 350;

        bubbleView.setOnTouchListener(new View.OnTouchListener() {
            private int initialX, initialY;
            private float initialTouchX, initialTouchY;
            private long touchStartTime;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        touchStartTime = System.currentTimeMillis();
                        initialX = bubbleParams.x;
                        initialY = bubbleParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        bubbleParams.x = initialX + (int) (event.getRawX() - initialTouchX);
                        bubbleParams.y = initialY + (int) (event.getRawY() - initialTouchY);
                        if (bubbleView.isAttachedToWindow()) {
                            windowManager.updateViewLayout(bubbleView, bubbleParams);
                        }
                        return true;

                    case MotionEvent.ACTION_UP:
                        long duration = System.currentTimeMillis() - touchStartTime;
                        float deltaX = Math.abs(event.getRawX() - initialTouchX);
                        float deltaY = Math.abs(event.getRawY() - initialTouchY);

                        if (duration < 250 && deltaX < 15 && deltaY < 15) {
                            showCard();
                        } else {
                            snapBubbleToEdge();
                        }
                        return true;
                }
                return false;
            }
        });
    }

    private void snapBubbleToEdge() {
        int screenWidth = getResources().getDisplayMetrics().widthPixels;
        int bubbleWidth = bubbleView.getWidth() > 0 ? bubbleView.getWidth() : 160;
        if (bubbleParams.x < (screenWidth / 2)) {
            bubbleParams.x = 24;
        } else {
            bubbleParams.x = screenWidth - bubbleWidth - 24;
        }
        if (bubbleView.isAttachedToWindow()) {
            windowManager.updateViewLayout(bubbleView, bubbleParams);
        }
    }

    private void initCardView() {
        cardView = LayoutInflater.from(this).inflate(R.layout.layout_floating_card, null);

        int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        cardParams = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
        );
        cardParams.gravity = Gravity.CENTER;

        cardView.findViewById(R.id.btnMinimize).setOnClickListener(v -> showBubble());
        cardView.findViewById(R.id.btnCloseCard).setOnClickListener(v -> stopSelf());

        Button btnPrev = cardView.findViewById(R.id.btnPrevStep);
        Button btnNext = cardView.findViewById(R.id.btnNextStep);

        btnPrev.setOnClickListener(v -> {
            if (currentStepIndex > 0) {
                currentStepIndex--;
                bindStepData();
            }
        });

        btnNext.setOnClickListener(v -> {
            if (currentStepIndex < stepList.size() - 1) {
                currentStepIndex++;
                bindStepData();
            }
        });

        cardView.findViewById(R.id.btnCardComplete).setOnClickListener(v -> handleCompleteAndReturn());
    }

    private void showBubble() {
        if (cardView != null && cardView.isAttachedToWindow()) {
            windowManager.removeView(cardView);
        }
        if (bubbleView != null && !bubbleView.isAttachedToWindow()) {
            windowManager.addView(bubbleView, bubbleParams);
        }
        updateBadge();
    }

    private void showCard() {
        if (bubbleView != null && bubbleView.isAttachedToWindow()) {
            windowManager.removeView(bubbleView);
        }
        bindStepData();
        if (cardView != null && !cardView.isAttachedToWindow()) {
            windowManager.addView(cardView, cardParams);
        }
    }

    private void updateBadge() {
        if (bubbleView != null) {
            TextView tvBadge = bubbleView.findViewById(R.id.tvBubbleBadge);
            if (tvBadge != null) {
                tvBadge.setText(String.valueOf(currentStepIndex + 1));
            }
        }
    }

    private void bindStepData() {
        if (cardView == null) return;

        TextView tvTitle = cardView.findViewById(R.id.tvCardServiceName);
        tvTitle.setText(serviceName + " 해지 가이드");

        TextView tvStepTitle = cardView.findViewById(R.id.tvCardStepTitle);
        TextView tvStepDesc = cardView.findViewById(R.id.tvCardStepDesc);
        TextView tvCounter = cardView.findViewById(R.id.tvStepCounter);
        ImageView ivThumb = cardView.findViewById(R.id.ivStepThumb);

        if (stepList.isEmpty()) {
            tvStepTitle.setText("해지 가이드");
            tvStepDesc.setText("공식 사이트에서 멤버십/계정 관리로 이동하여 해지를 완료하세요.");
            tvCounter.setText("1 / 1");
            return;
        }

        CancelBrowserActivity.GuideStepItem item = stepList.get(currentStepIndex);
        tvStepTitle.setText(item.stepNumber + "단계: " + item.title);
        tvStepDesc.setText(item.description);
        tvCounter.setText((currentStepIndex + 1) + " / " + stepList.size());

        if (item.imageUrl != null && !item.imageUrl.isEmpty()) {
            loadThumbnail(item.imageUrl, ivThumb);
        } else {
            ivThumb.setImageDrawable(null);
        }

        updateBadge();
    }

    private void loadThumbnail(String imageUrl, ImageView targetView) {
        executor.execute(() -> {
            try {
                URL url = new URL(imageUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                conn.setDoInput(true);
                conn.connect();
                InputStream is = conn.getInputStream();
                Bitmap bmp = BitmapFactory.decodeStream(is);
                is.close();
                conn.disconnect();
                if (bmp != null) {
                    mainHandler.post(() -> targetView.setImageBitmap(bmp));
                }
            } catch (Exception ignored) {
            }
        });
    }

    private void handleCompleteAndReturn() {
        try {
            Intent appIntent = new Intent(this, MainActivity.class);
            appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            startActivity(appIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }

        Intent broadcast = new Intent(ACTION_COMPLETE);
        broadcast.setPackage(getPackageName());
        broadcast.putExtra("serviceName", serviceName);
        sendBroadcast(broadcast);

        stopSelf();
    }

    private void startForegroundNotification() {
        String channelId = "submate_cancel_guide";
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
            NotificationChannel channel = new NotificationChannel(
                    channelId, "해지 가이드 도우미", NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("외부 브라우저 해지 시 플로팅 가이드를 지원합니다.");
            nm.createNotificationChannel(channel);
        }

        Intent stopIntent = new Intent(this, OverlayGuideService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPending = PendingIntent.getService(
                this, 0, stopIntent, PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new NotificationCompat.Builder(this, channelId)
                .setContentTitle("SubMate 해지 도우미 실행 중")
                .setContentText("화면의 버블을 탭하여 단계별 가이드를 확인하세요.")
                .setSmallIcon(R.mipmap.ic_launcher)
                .addAction(R.drawable.ic_close, "가이드 닫기", stopPending)
                .setOngoing(true)
                .build();

        startForeground(1001, notification);
    }

    private void parseSteps(String jsonStr) {
        stepList.clear();
        if (jsonStr == null || jsonStr.trim().isEmpty()) return;
        try {
            JSONArray arr = new JSONArray(jsonStr);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                stepList.add(new CancelBrowserActivity.GuideStepItem(
                        obj.optInt("stepNumber", i + 1),
                        obj.optString("title", "단계 " + (i + 1)),
                        obj.optString("description", ""),
                        obj.optString("imageUrl", "")
                ));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onDestroy() {
        if (bubbleView != null && bubbleView.isAttachedToWindow()) {
            windowManager.removeView(bubbleView);
        }
        if (cardView != null && cardView.isAttachedToWindow()) {
            windowManager.removeView(cardView);
        }
        executor.shutdownNow();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
