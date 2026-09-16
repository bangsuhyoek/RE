package kr.co.re.subscription.payment;

import android.animation.Animator;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import com.airbnb.lottie.LottieAnimationView;
import com.airbnb.lottie.LottieDrawable;
import kr.co.re.subscription.MainActivity;

public final class AnimatedConciergeOverlayController {
    private static final String TAG = "REConciergeOverlay";
    public static final long EXPECTED_DURATION_MS = 5500L;
    private static final long SAFETY_REMOVE_MS = 6200L;
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    private static WindowManager windowManager;
    private static FrameLayout currentRoot;
    private static long shownAt;
    private static long animationStartedAt;
    private static int generation;

    private AnimatedConciergeOverlayController() {}

    public static boolean hasOverlayPermission(Context context) {
        if (context == null) return false;
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context);
    }

    public static boolean show(
            Context context,
            String candidateId,
            PaymentParser.ParsedPayment payment,
            String eventType) {
        if (context == null) return false;
        final Context app = context.getApplicationContext();
        if (!ConciergePreferences.isEnabled(app)) {
            Log.i(TAG, "skip reason=concierge_disabled event=" + eventType);
            return false;
        }
        if (!hasOverlayPermission(app)) {
            Log.i(TAG, "skip reason=overlay_permission_missing event=" + eventType);
            return false;
        }
        if (!PaymentDetectionCoordinator.EVENT_NEW_SUBSCRIPTION.equals(eventType)) {
            Log.i(TAG, "skip reason=unsupported_poc_event event=" + eventType);
            return false;
        }

        if (Looper.myLooper() == Looper.getMainLooper()) {
            showOnMain(app, candidateId, payment, eventType);
        } else {
            MAIN.post(() -> showOnMain(app, candidateId, payment, eventType));
        }
        return true;
    }

    private static synchronized void showOnMain(
            Context app,
            String candidateId,
            PaymentParser.ParsedPayment payment,
            String eventType) {
        removeCurrent("replace");
        generation++;
        final int token = generation;

        WindowManager wm = (WindowManager) app.getSystemService(Context.WINDOW_SERVICE);
        if (wm == null) {
            Log.w(TAG, "skip reason=no_window_manager");
            return;
        }

        DisplayMetrics metrics = app.getResources().getDisplayMetrics();
        int screenWidth = metrics.widthPixels;
        int screenHeight = metrics.heightPixels;
        int width = Math.min(dp(app, 172), Math.max(dp(app, 132), (int) (screenWidth * 0.44f)));
        int height = Math.round(width * 602f / 720f);
        int statusBar = statusBarHeight(app);
        int topGap = dp(app, 108);
        int bottomSafety = dp(app, 32);
        int y = Math.max(statusBar + topGap, dp(app, 112));
        y = Math.min(y, Math.max(statusBar + dp(app, 72), screenHeight - height - bottomSafety));

        FrameLayout root = new FrameLayout(app);
        root.setClipChildren(false);
        root.setClipToPadding(false);

        LottieAnimationView lottie = new LottieAnimationView(app);
        lottie.setAnimation("concierge/new_subscription_detected.json");
        lottie.setImageAssetsFolder("concierge/images/");
        lottie.setRepeatCount(0);
        lottie.setRepeatMode(LottieDrawable.RESTART);
        lottie.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
        lottie.setFailureListener(error -> {
            Log.e(TAG, "lottie_load_failed", error);
            if (token == generation) removeCurrent("lottie_failure");
        });
        root.addView(lottie, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        root.setOnClickListener(view -> {
            try {
                Uri deepLink = Uri.parse("reapp://payment/candidate?id="
                        + Uri.encode(candidateId == null ? "" : candidateId)
                        + "&source=animated-concierge");
                Intent intent = new Intent(Intent.ACTION_VIEW, deepLink, app, MainActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                app.startActivity(intent);
            } catch (Exception error) {
                Log.w(TAG, "candidate deep link failed", error);
            }
        });

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                width,
                height,
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.END;
        params.x = dp(app, 10);
        params.y = y;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            params.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_NEVER;
        }

        try {
            wm.addView(root, params);
            windowManager = wm;
            currentRoot = root;
            shownAt = System.currentTimeMillis();
            animationStartedAt = 0L;
            Log.i(TAG, "show event=" + eventType
                    + " candidate=" + candidateId
                    + " durationMs=" + EXPECTED_DURATION_MS
                    + " bounds=x:" + (screenWidth - params.x - width)
                    + ",y:" + y
                    + ",w:" + width
                    + ",h:" + height
                    + " screen=" + screenWidth + "x" + screenHeight
                    + " statusBar=" + statusBar);

            lottie.addAnimatorListener(new Animator.AnimatorListener() {
                @Override public void onAnimationStart(Animator animation) {
                    animationStartedAt = System.currentTimeMillis();
                    Log.i(TAG, "animation_start event=" + eventType);
                    MAIN.postDelayed(() -> {
                        if (token == generation) removeCurrent("safety_timeout");
                    }, SAFETY_REMOVE_MS);
                }
                @Override public void onAnimationEnd(Animator animation) {
                    if (token == generation) removeCurrent("animation_end");
                }
                @Override public void onAnimationCancel(Animator animation) {}
                @Override public void onAnimationRepeat(Animator animation) {}
            });
            lottie.playAnimation();
        } catch (Exception error) {
            currentRoot = null;
            windowManager = null;
            Log.e(TAG, "overlay_add_failed", error);
        }
    }

    private static synchronized void removeCurrent(String reason) {
        FrameLayout root = currentRoot;
        WindowManager wm = windowManager;
        if (root == null || wm == null) return;
        currentRoot = null;
        windowManager = null;
        long base = animationStartedAt > 0L ? animationStartedAt : shownAt;
        long elapsed = base > 0L ? System.currentTimeMillis() - base : 0L;
        animationStartedAt = 0L;
        try {
            wm.removeViewImmediate(root);
        } catch (Exception error) {
            Log.w(TAG, "overlay_remove_failed", error);
        }
        Log.i(TAG, "removed reason=" + reason + " elapsedMs=" + elapsed);
    }

    private static int dp(Context context, int value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }

    private static int statusBarHeight(Context context) {
        int id = context.getResources().getIdentifier("status_bar_height", "dimen", "android");
        return id > 0 ? context.getResources().getDimensionPixelSize(id) : 0;
    }
}
