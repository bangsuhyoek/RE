package kr.co.re.subscription.payment;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Transparent, non-interactive 2.5D concierge overlay for a newly detected subscription.
 * The layer images are existing RE character artwork split into transparent PNG planes.
 */
public final class AnimatedConciergeOverlayController {
    private static final String TAG = "REConciergeOverlay";
    public static final long EXPECTED_DURATION_MS = 5500L;
    private static final long SAFETY_REMOVE_MS = 6200L;
    private static final int HEADS_UP_RESERVED_DP = 144;
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    private static WindowManager windowManager;
    private static FrameLayout currentRoot;
    private static AnimatorSet currentAnimator;
    private static List<Bitmap> currentBitmaps = new ArrayList<>();
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
            Log.i(TAG, "skip reason=unsupported_event event=" + eventType);
            return false;
        }

        if (Looper.myLooper() == Looper.getMainLooper()) {
            return showOnMain(app, candidateId, payment, eventType);
        }
        MAIN.post(() -> showOnMain(app, candidateId, payment, eventType));
        return true;
    }

    private static synchronized boolean showOnMain(
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
            return false;
        }

        DisplayMetrics metrics = app.getResources().getDisplayMetrics();
        int screenWidth = metrics.widthPixels;
        int screenHeight = metrics.heightPixels;
        int width = Math.min(dp(app, 180), Math.max(dp(app, 142), Math.round(screenWidth * 0.45f)));
        int height = Math.round(width * 602f / 720f);
        int statusBar = statusBarHeight(app);
        int desiredY = statusBar + dp(app, HEADS_UP_RESERVED_DP);
        int maxY = Math.max(statusBar + dp(app, 112), screenHeight - height - dp(app, 28));
        int y = Math.min(desiredY, maxY);

        FrameLayout root = new FrameLayout(app);
        root.setClipChildren(false);
        root.setClipToPadding(false);
        root.setBackgroundColor(Color.TRANSPARENT);
        root.setAlpha(0f);

        List<Bitmap> bitmaps = new ArrayList<>();
        try {
            ImageView shadow = addLayer(app, root, bitmaps, "shadow.png");
            ImageView hairBack = addLayer(app, root, bitmaps, "hair_back.png");
            ImageView body = addLayer(app, root, bitmaps, "body.png");
            ImageView headFace = addLayer(app, root, bitmaps, "head_face.png");
            ImageView hairFront = addLayer(app, root, bitmaps, "hair_front.png");
            ImageView leftArm = addLayer(app, root, bitmaps, "left_arm.png");
            ImageView rightArm = addLayer(app, root, bitmaps, "right_arm.png");
            ImageView phone = addLayer(app, root, bitmaps, "phone.png");
            ImageView eyes = addLayer(app, root, bitmaps, "eyes.png");

            int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    : WindowManager.LayoutParams.TYPE_PHONE;
            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    width,
                    height,
                    type,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                            | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                            | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                    PixelFormat.TRANSLUCENT);
            params.gravity = Gravity.TOP | Gravity.END;
            params.x = dp(app, 10);
            params.y = y;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                params.layoutInDisplayCutoutMode =
                        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_NEVER;
            }

            wm.addView(root, params);
            windowManager = wm;
            currentRoot = root;
            currentBitmaps = bitmaps;
            animationStartedAt = System.currentTimeMillis();

            AnimatorSet intro = new AnimatorSet();
            intro.playTogether(
                    ObjectAnimator.ofFloat(root, "alpha", 0f, 1f),
                    ObjectAnimator.ofFloat(root, "scaleX", 0.94f, 1f),
                    ObjectAnimator.ofFloat(root, "scaleY", 0.94f, 1f),
                    ObjectAnimator.ofFloat(root, "translationY", dp(app, 12), 0f));
            intro.setDuration(250L);

            AnimatorSet motion = new AnimatorSet();
            AccelerateDecelerateInterpolator ease = new AccelerateDecelerateInterpolator();
            Animator[] motionItems = new Animator[] {
                    ObjectAnimator.ofFloat(headFace, "translationY", 0f, -dp(app, 4), dp(app, 1), 0f),
                    ObjectAnimator.ofFloat(hairFront, "rotation", 0f, -2.5f, 1.4f, 0f),
                    ObjectAnimator.ofFloat(hairBack, "rotation", 0f, 1.6f, -1.0f, 0f),
                    ObjectAnimator.ofFloat(leftArm, "rotation", 0f, -5.5f, 2.0f, 0f),
                    ObjectAnimator.ofFloat(rightArm, "rotation", 0f, 5.5f, -2.0f, 0f),
                    ObjectAnimator.ofFloat(phone, "translationY", 0f, -dp(app, 5), dp(app, 2), 0f),
                    ObjectAnimator.ofFloat(phone, "rotation", 0f, -4.0f, 2.0f, 0f),
                    ObjectAnimator.ofFloat(eyes, "scaleY", 1f, 0.82f, 1f, 1f),
                    ObjectAnimator.ofFloat(body, "translationY", 0f, dp(app, 2), -dp(app, 1), 0f),
                    ObjectAnimator.ofFloat(shadow, "scaleX", 1f, 0.94f, 1.02f, 1f)
            };
            for (Animator animator : motionItems) animator.setInterpolator(ease);
            motion.playTogether(motionItems);
            motion.setDuration(4700L);

            AnimatorSet outro = new AnimatorSet();
            outro.playTogether(
                    ObjectAnimator.ofFloat(root, "alpha", 1f, 0f),
                    ObjectAnimator.ofFloat(root, "translationY", 0f, dp(app, 8)));
            outro.setDuration(550L);

            AnimatorSet sequence = new AnimatorSet();
            sequence.playSequentially(intro, motion, outro);
            sequence.addListener(new AnimatorListenerAdapter() {
                @Override public void onAnimationStart(Animator animation) {
                    Log.i(TAG, "animation_start event=" + eventType + " candidate=" + candidateId);
                }

                @Override public void onAnimationEnd(Animator animation) {
                    if (token == generation) removeCurrent("animation_end");
                }
            });
            currentAnimator = sequence;

            Log.i(TAG, "show event=" + eventType
                    + " candidate=" + candidateId
                    + " service=" + (payment == null ? "" : payment.serviceName)
                    + " durationMs=" + EXPECTED_DURATION_MS
                    + " bounds=x:" + (screenWidth - params.x - width)
                    + ",y:" + y
                    + ",w:" + width
                    + ",h:" + height
                    + " reservedTopPx=" + desiredY
                    + " screen=" + screenWidth + "x" + screenHeight
                    + " statusBar=" + statusBar);

            sequence.start();
            MAIN.postDelayed(() -> {
                if (token == generation) removeCurrent("safety_timeout");
            }, SAFETY_REMOVE_MS);
            return true;
        } catch (Exception error) {
            for (Bitmap bitmap : bitmaps) {
                if (bitmap != null && !bitmap.isRecycled()) bitmap.recycle();
            }
            Log.e(TAG, "overlay_add_failed", error);
            return false;
        }
    }

    private static ImageView addLayer(
            Context context,
            FrameLayout root,
            List<Bitmap> bitmaps,
            String assetName) throws Exception {
        String path = "public/assets/concierge/2_5d/" + assetName;
        Bitmap bitmap;
        try (InputStream input = context.getAssets().open(path)) {
            bitmap = BitmapFactory.decodeStream(input);
        }
        if (bitmap == null) throw new IllegalStateException("asset decode failed: " + path);
        bitmaps.add(bitmap);
        ImageView image = new ImageView(context);
        image.setBackgroundColor(Color.TRANSPARENT);
        image.setImageBitmap(bitmap);
        image.setScaleType(ImageView.ScaleType.FIT_XY);
        root.addView(image, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        return image;
    }

    private static synchronized void removeCurrent(String reason) {
        FrameLayout root = currentRoot;
        WindowManager wm = windowManager;
        AnimatorSet animator = currentAnimator;
        List<Bitmap> bitmaps = currentBitmaps;
        if (root == null || wm == null) return;

        currentRoot = null;
        windowManager = null;
        currentAnimator = null;
        currentBitmaps = new ArrayList<>();
        long elapsed = animationStartedAt > 0L ? System.currentTimeMillis() - animationStartedAt : 0L;
        animationStartedAt = 0L;

        if (animator != null && animator.isRunning()) animator.cancel();
        try {
            wm.removeViewImmediate(root);
        } catch (Exception error) {
            Log.w(TAG, "overlay_remove_failed", error);
        }
        for (int i = 0; i < root.getChildCount(); i++) {
            if (root.getChildAt(i) instanceof ImageView) {
                ((ImageView) root.getChildAt(i)).setImageDrawable(null);
            }
        }
        for (Bitmap bitmap : bitmaps) {
            if (bitmap != null && !bitmap.isRecycled()) bitmap.recycle();
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
