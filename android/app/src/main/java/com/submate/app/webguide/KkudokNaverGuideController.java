package com.submate.app.webguide;

import android.graphics.RectF;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.WebView;
import android.widget.TextView;

import androidx.recyclerview.widget.RecyclerView;

import com.submate.app.webguide.services.naver.NaverMembershipGuide;
import com.submate.app.webguide.services.naver.NaverMonthlyCancelRoute;
import com.submate.app.webguide.services.naver.NaverPageStateResolver;
import com.submate.app.webguide.state.PageState;
import com.submate.app.webguide.target.CoordinateMapper;
import com.submate.app.webguide.target.GuideStep;
import com.submate.app.webguide.target.TargetResolution;
import com.submate.app.webguide.target.TargetResolutionStatus;
import com.submate.app.webguide.target.TargetResolver;

import java.util.Arrays;

/** Hosts the verified NAVER guide runtime inside Kkudok's existing cancel WebView. */
public final class KkudokNaverGuideController {
    private static final long DEBOUNCE_MS = 140L;
    private static final long[] NOT_FOUND_RETRY_MS = {250L, 500L, 1000L};
    private final WebView webView;
    private final GuideOverlayContainer overlay;
    private final TextView stepBadge;
    private final TextView stepDescription;
    private final RecyclerView manualGuide;
    private final TextView manualGuideToggle;
    private final TargetResolver targetResolver;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private long generation = 0L;
    private boolean paused = false;
    private boolean destroyed = false;
    private boolean manualGuideRequested = false;
    private Runnable pendingEvaluate;
    private Runnable pendingRetry;
    private PageState lastPageState;
    private String lastPresentedStepId;
    private RectF lastPresentedRect;

    public KkudokNaverGuideController(
            WebView webView,
            GuideOverlayContainer overlay,
            TextView stepBadge,
            TextView stepDescription,
            RecyclerView manualGuide,
            TextView manualGuideToggle
    ) {
        this.webView = webView;
        this.overlay = overlay;
        this.stepBadge = stepBadge;
        this.stepDescription = stepDescription;
        this.manualGuide = manualGuide;
        this.manualGuideToggle = manualGuideToggle;
        this.targetResolver = new TargetResolver(
                new WebSecurityPolicy(Arrays.asList("naver.com")));
    }
    public void onPageLoading() {
        invalidatePending();
        lastPageState = null;
        lastPresentedStepId = null;
        lastPresentedRect = null;
        overlay.onPageLoading();
        applyManualGuidePreference();
        stepDescription.setText("공식 페이지를 확인하고 있어요.");
    }

    public void onPageFinished() {
        scheduleEvaluate(80L);
    }

    public void onUserInteraction() {
        invalidatePending();
        scheduleEvaluate(DEBOUNCE_MS);
    }

    public void onScroll() {
        invalidatePending();
        scheduleEvaluate(DEBOUNCE_MS);
    }

    public void onLayoutChanged() {
        invalidatePending();
        scheduleEvaluate(DEBOUNCE_MS);
    }

    public void onPopupOpened() {
        paused = true;
        invalidatePending();
        overlay.showStandaloneMessage("로그인을 완료하면 해지 안내를 자동으로 이어갈게요.");
        applyManualGuidePreference();
    }
    public void onPopupClosed() {
        paused = false;
        invalidatePending();
        scheduleEvaluate(180L);
    }

    public void toggleManualGuide() {
        boolean currentlyVisible = manualGuide.getVisibility() == View.VISIBLE;
        manualGuideRequested = !currentlyVisible;
        setManualGuideVisibility(manualGuideRequested);
    }

    private void applyManualGuidePreference() {
        setManualGuideVisibility(manualGuideRequested);
    }

    private void setManualGuideVisibility(boolean visible) {
        int desiredVisibility = visible ? View.VISIBLE : View.GONE;
        if (manualGuide.getVisibility() != desiredVisibility) {
            manualGuide.setVisibility(desiredVisibility);
        }
        if (manualGuideToggle != null) {
            String desiredText = visible ? "가이드 접기" : "단계별 방법";
            if (!desiredText.contentEquals(manualGuideToggle.getText())) {
                manualGuideToggle.setText(desiredText);
            }
        }
    }

    public void destroy() {
        destroyed = true;
        invalidatePending();
    }

    private void scheduleEvaluate(long delayMs) {
        if (destroyed || paused) return;
        if (pendingEvaluate != null) handler.removeCallbacks(pendingEvaluate);
        pendingEvaluate = this::evaluateCurrentState;
        handler.postDelayed(pendingEvaluate, delayMs);
    }

    private void invalidatePending() {
        generation++;
        if (pendingEvaluate != null) handler.removeCallbacks(pendingEvaluate);
        if (pendingRetry != null) handler.removeCallbacks(pendingRetry);
        pendingEvaluate = null;
        pendingRetry = null;
    }

    private void evaluateCurrentState() {
        if (destroyed || paused || webView == null) return;
        pendingEvaluate = null;
        final long requestGeneration = ++generation;
        final String requestUrl = webView.getUrl();
        NaverPageStateResolver.resolve(webView, pageState -> {
            if (!isCurrent(requestGeneration, requestUrl)) return;
            presentPageState(requestGeneration, requestUrl, pageState);
        });
    }
    private void presentPageState(
            long requestGeneration,
            String requestUrl,
            PageState pageState
    ) {
        if (pageState != lastPageState) {
            overlay.updatePageState(pageState);
            lastPageState = pageState;
            lastPresentedStepId = null;
            lastPresentedRect = null;
        }
        GuideStep step = NaverMembershipGuide.currentStep(pageState);
        if (step == null || step.getTarget() == null) {
            presentPassiveState(pageState);
            return;
        }

        int stepNumber = stepNumber(step.getStepId());
        if (stepNumber > 0) stepBadge.setText(stepNumber + "/5단계");
        stepDescription.setText(step.getInstruction());
        applyManualGuidePreference();
        resolveTarget(requestGeneration, requestUrl, step, 0);
    }

    private void presentPassiveState(PageState pageState) {
        applyManualGuidePreference();
        if (pageState == PageState.LOGIN) {
            stepBadge.setText("로그인");
            stepDescription.setText("로그인을 완료하면 자동으로 안내를 이어갈게요.");
        } else if (pageState == PageState.CANCEL_COMPLETE) {
            stepBadge.setText("완료");
            stepDescription.setText("해지 완료 여부를 확인한 뒤 상단의 해지 완료를 눌러주세요.");
        } else if (pageState == PageState.UNSUPPORTED_PAGE) {
            showManualFallback("현재 페이지에서는 자동 위치 안내를 사용할 수 없어요.");
        } else {
            stepDescription.setText(NaverMembershipGuide.messageFor(pageState));
        }
    }
    private void resolveTarget(
            long requestGeneration,
            String requestUrl,
            GuideStep step,
            int retryIndex
    ) {
        if (!isCurrent(requestGeneration, requestUrl)) return;
        targetResolver.resolve(webView, step.getTarget(), resolution -> {
            if (!isCurrent(requestGeneration, requestUrl)) return;
            handleResolution(requestGeneration, requestUrl, step, retryIndex, resolution);
        });
    }

    private void handleResolution(
            long requestGeneration,
            String requestUrl,
            GuideStep step,
            int retryIndex,
            TargetResolution resolution
    ) {
        TargetResolutionStatus status = resolution.getStatus();
        if (status == TargetResolutionStatus.FOUND_VISIBLE) {
            RectF mapped = CoordinateMapper.toOverlayRect(webView, overlay, resolution.getRect());
            if (mapped == null) {
                showManualFallback("버튼 위치를 화면에 맞추지 못했어요.");
                return;
            }
            applyManualGuidePreference();
            if (!samePresentation(step.getStepId(), mapped)) {
                overlay.showResolvedTarget(mapped, step);
                lastPresentedStepId = step.getStepId();
                lastPresentedRect = new RectF(mapped);
            }
            return;
        }

        if (status == TargetResolutionStatus.FOUND_OFFSCREEN) {
            applyManualGuidePreference();
            overlay.showTargetStatus(step, status, resolution.getRect());
            stepDescription.setText("버튼이 화면 밖에 있어요. 안내 방향으로 스크롤해주세요.");
            return;
        }
        if (status == TargetResolutionStatus.NOT_FOUND
                && retryIndex < NOT_FOUND_RETRY_MS.length) {
            long delay = NOT_FOUND_RETRY_MS[retryIndex];
            if (pendingRetry != null) handler.removeCallbacks(pendingRetry);
            pendingRetry = () -> {
                pendingRetry = null;
                resolveTarget(requestGeneration, requestUrl, step, retryIndex + 1);
            };
            handler.postDelayed(pendingRetry, delay);
            return;
        }

        if (status == TargetResolutionStatus.AMBIGUOUS) {
            showManualFallback("같은 이름의 버튼이 여러 개 보여 수동 안내로 전환했어요.");
        } else if (status == TargetResolutionStatus.NOT_FOUND) {
            showManualFallback("현재 화면에서 버튼 위치를 찾지 못해 수동 안내로 전환했어요.");
        } else {
            showManualFallback("자동 위치 안내를 사용할 수 없어 수동 안내로 전환했어요.");
        }
    }

    private void showManualFallback(String message) {
        overlay.setVisibility(View.GONE);
        stepDescription.setText(message);
        lastPresentedStepId = null;
        lastPresentedRect = null;
        // Fallback must not resize the WebView automatically. The user can still
        // expand the manual guide explicitly with the existing toggle.
        applyManualGuidePreference();
    }

    private boolean samePresentation(String stepId, RectF rect) {
        if (stepId == null || rect == null || lastPresentedStepId == null || lastPresentedRect == null) {
            return false;
        }
        if (!stepId.equals(lastPresentedStepId)) return false;
        final float tolerancePx = 1.0f;
        return Math.abs(lastPresentedRect.left - rect.left) <= tolerancePx
                && Math.abs(lastPresentedRect.top - rect.top) <= tolerancePx
                && Math.abs(lastPresentedRect.right - rect.right) <= tolerancePx
                && Math.abs(lastPresentedRect.bottom - rect.bottom) <= tolerancePx;
    }

    private boolean isCurrent(long expectedGeneration, String expectedUrl) {
        if (destroyed || paused || expectedGeneration != generation || webView == null) return false;
        String current = webView.getUrl();
        return expectedUrl == null ? current == null : expectedUrl.equals(current);
    }

    private int stepNumber(String stepId) {
        if (stepId == null) return 0;
        if (NaverMonthlyCancelRoute.STEP_SETTINGS.equals(stepId)) return 1;
        if (NaverMonthlyCancelRoute.STEP_MANAGE.equals(stepId)) return 2;
        if (NaverMonthlyCancelRoute.STEP_CANCEL_ENTRY.equals(stepId)) return 3;
        if (NaverMonthlyCancelRoute.STEP_RECURRING_CANCEL.equals(stepId)) return 4;
        if (NaverMonthlyCancelRoute.STEP_FINAL_CONFIRM.equals(stepId)) return 5;
        return 0;
    }
}
