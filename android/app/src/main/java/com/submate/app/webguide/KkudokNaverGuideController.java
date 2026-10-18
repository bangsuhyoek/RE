package com.submate.app.webguide;

import android.graphics.RectF;
import android.os.Handler;
import android.os.Looper;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.WebView;
import android.widget.TextView;

import androidx.recyclerview.widget.RecyclerView;

import com.submate.app.webguide.services.naver.NaverCancelGuideRoute;
import com.submate.app.webguide.state.GuideState;
import com.submate.app.webguide.state.PageState;
import com.submate.app.webguide.target.CoordinateMapper;
import com.submate.app.webguide.target.GuideStep;
import com.submate.app.webguide.target.TargetResolution;
import com.submate.app.webguide.target.TargetResolutionStatus;
import com.submate.app.webguide.target.TargetResolver;

/**
 * Hosts the cancel guide runtime (Naver verified guide and declarative assist routes)
 * inside Kkudok's cancel WebView.
 *
 * Integrates AutoAdvancer for safe intermediate auto-taps and SuccessDetector for
 * automatic cancellation completion detection.
 */
public final class KkudokNaverGuideController {
    public interface Listener {
        void onAutoAdvanceCountdownStarted(long durationMs, Runnable onCancelOptOut);
        void onAutoAdvanceCountdownCancelled();
        void onCancellationSuccessDetected(String detectedBy, String matchedSignal);
    }

    public static final String FINAL_STEP_DOCK_COPY = "마지막 버튼은 직접 눌러 주세요. 누르면 해지가 진행돼요.";
    private static final long DEBOUNCE_MS = 140L;
    private static final long[] NOT_FOUND_RETRY_MS = {250L, 500L, 1000L};

    private final CancelGuideRoute route;
    private final WebView webView;
    private final GuideOverlayContainer overlay;
    private final TextView stepBadge;
    private final TextView stepDescription;
    private final RecyclerView manualGuide;
    private final TextView manualGuideToggle;
    private final TargetResolver targetResolver;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private final AutoAdvancer autoAdvancer;
    private final SuccessDetector successDetector;
    private Listener listener;

    private long generation = 0L;
    private boolean paused = false;
    private boolean popupOpen = false;
    private boolean destroyed = false;
    private boolean manualGuideRequested = false;
    private Runnable pendingEvaluate;
    private Runnable pendingRetry;
    private Runnable pendingTextSuccessCheck;
    private PageState lastPageState;
    private String lastPresentedStepId;
    private RectF lastPresentedRect;
    private GuideStep currentStep;
    private boolean currentStepIsFinal = false;

    public KkudokNaverGuideController(
            WebView webView,
            GuideOverlayContainer overlay,
            TextView stepBadge,
            TextView stepDescription,
            RecyclerView manualGuide,
            TextView manualGuideToggle
    ) {
        this(new NaverCancelGuideRoute(), webView, overlay, stepBadge, stepDescription, manualGuide, manualGuideToggle);
    }

    public KkudokNaverGuideController(
            CancelGuideRoute route,
            WebView webView,
            GuideOverlayContainer overlay,
            TextView stepBadge,
            TextView stepDescription,
            RecyclerView manualGuide,
            TextView manualGuideToggle
    ) {
        this.route = route != null ? route : new NaverCancelGuideRoute();
        this.webView = webView;
        this.overlay = overlay;
        this.stepBadge = stepBadge;
        this.stepDescription = stepDescription;
        this.manualGuide = manualGuide;
        this.manualGuideToggle = manualGuideToggle;
        this.targetResolver = new TargetResolver(this.route.getSecurityPolicy());

        this.autoAdvancer = new AutoAdvancer(
                this.webView,
                this.route.getSecurityPolicy(),
                this.route,
                new AutoAdvancer.UiDelegate() {
                    @Override
                    public void showAutoAdvanceCountdown(long durationMs, Runnable onCancelOptOut) {
                        stepDescription.setText("꾸독이 다음 화면으로 넘기는 중…");
                        if (listener != null) {
                            listener.onAutoAdvanceCountdownStarted(durationMs, onCancelOptOut);
                        }
                    }

                    @Override
                    public void cancelAutoAdvanceCountdown() {
                        if (currentStep != null) {
                            String dockText = (currentStepIsFinal || currentStep.isUserMustTap())
                                    ? FINAL_STEP_DOCK_COPY
                                    : currentStep.getInstruction();
                            stepDescription.setText(dockText);
                        }
                        if (listener != null) {
                            listener.onAutoAdvanceCountdownCancelled();
                        }
                    }

                    @Override
                    public void onAutoAdvanceComplete(String stepId, int autoTapsCount) {
                        if (listener != null) {
                            listener.onAutoAdvanceCountdownCancelled();
                        }
                        scheduleEvaluate(180L);
                    }

                    @Override
                    public void onAutoAdvanceBlocked(String stepId, String reason) {
                        // Hard block or modal element -> convert to manual with strong userMustTap-style highlight
                        currentStepIsFinal = true;
                        stepDescription.setText(FINAL_STEP_DOCK_COPY);
                        if (currentStep != null && lastPresentedRect != null) {
                            GuideStep manualStep = new GuideStep(
                                    currentStep.getStepId(),
                                    currentStep.getLogicalPageState(),
                                    FINAL_STEP_DOCK_COPY,
                                    currentStep.getTarget(),
                                    currentStep.getInteractionType(),
                                    currentStep.getPreferredPlacement(),
                                    currentStep.getOffsetDp(),
                                    currentStep.getExpectedNextStepId(),
                                    currentStep.getVerificationStatus(),
                                    true, // userMustTap: true
                                    false
                            );
                            overlay.showResolvedTarget(lastPresentedRect, manualStep);
                        }
                        if (listener != null) {
                            listener.onAutoAdvanceCountdownCancelled();
                        }
                    }

                    @Override
                    public void onAutoAdvanceFallbackToManual(String stepId, String reason) {
                        if (currentStep != null) {
                            String dockText = (currentStepIsFinal || currentStep.isUserMustTap())
                                    ? FINAL_STEP_DOCK_COPY
                                    : currentStep.getInstruction();
                            stepDescription.setText(dockText);
                        }
                        if (listener != null) {
                            listener.onAutoAdvanceCountdownCancelled();
                        }
                    }
                },
                new AutoAdvancer.EnvironmentStateSupplier() {
                    @Override
                    public boolean isPopupOpen() {
                        return popupOpen;
                    }

                    @Override
                    public boolean isGuidePaused() {
                        return paused;
                    }
                }
        );

        this.successDetector = new SuccessDetector(this.route);
    }

    public void setListener(Listener listener) {
        this.listener = listener;
    }

    public AutoAdvancer getAutoAdvancer() {
        return autoAdvancer;
    }

    public SuccessDetector getSuccessDetector() {
        return successDetector;
    }

    public CancelGuideRoute getRoute() {
        return route;
    }

    public RectF getLastPresentedRect() {
        return lastPresentedRect;
    }

    public boolean isCurrentStepFinal() {
        return currentStepIsFinal || (currentStep != null && currentStep.isUserMustTap());
    }

    public void onPageLoading() {
        invalidatePending();
        successDetector.onPageLoading();
        lastPageState = null;
        lastPresentedStepId = null;
        lastPresentedRect = null;
        currentStep = null;
        currentStepIsFinal = false;
        overlay.onPageLoading();
        applyManualGuidePreference();
        stepDescription.setText("공식 페이지를 확인하고 있어요.");
    }

    public void onPageFinished() {
        successDetector.recordPageBaseline(webView);
        checkSuccessSignals();
        scheduleEvaluate(80L);
    }

    public void onTouch(MotionEvent event) {
        if (event == null) return;
        int action = event.getActionMasked();

        if (action == MotionEvent.ACTION_DOWN) {
            if (autoAdvancer.isCountdownActive()) {
                autoAdvancer.cancelPendingAutoTap("user_touch_down");
            }
        } else if (action == MotionEvent.ACTION_UP) {
            float touchX = event.getX();
            float touchY = event.getY();

            // SuccessDetector: mark final step as tapped ONLY when ACTION_UP touch falls inside mapped rect of userMustTap step
            if (isCurrentStepFinal() && lastPresentedRect != null) {
                successDetector.checkAndMarkFinalStepTapped(touchX, touchY, lastPresentedRect);
            }

            if (autoAdvancer.isCountdownActive()) {
                autoAdvancer.cancelPendingAutoTap("user_touch_up");
            }
            onUserInteraction();
        }
    }

    public void onUserInteraction() {
        invalidatePending();
        scheduleEvaluate(DEBOUNCE_MS);
    }

    public void onScroll() {
        lastPresentedRect = null;
        if (autoAdvancer.isCountdownActive()) {
            autoAdvancer.cancelPendingAutoTap("user_scroll");
        }
        invalidatePending();
        scheduleEvaluate(DEBOUNCE_MS);
    }

    public void onLayoutChanged() {
        invalidatePending();
        scheduleEvaluate(DEBOUNCE_MS);
    }

    public void onPopupOpened() {
        popupOpen = true;
        paused = true;
        if (autoAdvancer.isCountdownActive()) {
            autoAdvancer.cancelPendingAutoTap("popup_opened");
        }
        invalidatePending();
        overlay.showStandaloneMessage("로그인을 완료하면 해지 안내를 자동으로 이어갈게요.");
        applyManualGuidePreference();
    }

    public void onPopupClosed() {
        popupOpen = false;
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
        autoAdvancer.destroy();
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
        if (pendingTextSuccessCheck != null) handler.removeCallbacks(pendingTextSuccessCheck);
        pendingEvaluate = null;
        pendingRetry = null;
        pendingTextSuccessCheck = null;
    }

    private void evaluateCurrentState() {
        if (destroyed || paused || webView == null) return;
        pendingEvaluate = null;
        final long requestGeneration = ++generation;
        final String requestUrl = webView.getUrl();
        route.evaluate(webView, evaluation -> {
            if (!isCurrent(requestGeneration, requestUrl)) return;
            presentEvaluation(requestGeneration, requestUrl, evaluation);
        });
    }

    private void checkSuccessSignals() {
        if (destroyed || webView == null) return;
        if (!successDetector.isFinalStepTappedByUser()) return;

        String currentUrl = webView.getUrl();
        if (successDetector.checkUrlSuccess(currentUrl)) {
            triggerSuccess("url", currentUrl);
            return;
        }

        // Check text immediately and schedule another check ~1s later (Requirement 4)
        successDetector.checkTextSuccess(webView, (detectedBy, matchedSignal) -> {
            if (destroyed) return;
            if (detectedBy != null) {
                triggerSuccess(detectedBy, matchedSignal);
            }
        });

        if (pendingTextSuccessCheck != null) {
            handler.removeCallbacks(pendingTextSuccessCheck);
        }
        pendingTextSuccessCheck = () -> {
            pendingTextSuccessCheck = null;
            if (destroyed || webView == null || !successDetector.isFinalStepTappedByUser()) return;
            successDetector.checkTextSuccess(webView, (detectedBy, matchedSignal) -> {
                if (destroyed) return;
                if (detectedBy != null) {
                    triggerSuccess(detectedBy, matchedSignal);
                }
            });
        };
        handler.postDelayed(pendingTextSuccessCheck, 1000L);
    }

    private void triggerSuccess(String detectedBy, String signal) {
        if (listener != null) {
            listener.onCancellationSuccessDetected(detectedBy, signal);
        }
    }

    private void presentEvaluation(
            long requestGeneration,
            String requestUrl,
            RouteEvaluation evaluation
    ) {
        if (evaluation == null) return;

        if (evaluation.isComplete() && successDetector.isFinalStepTappedByUser()) {
            triggerSuccess("state", "CANCEL_COMPLETE");
            return;
        }

        PageState pageState = evaluation.getPageState();
        if (pageState != lastPageState) {
            overlay.updatePageState(pageState);
            lastPageState = pageState;
            lastPresentedStepId = null;
            lastPresentedRect = null;
        }

        if (evaluation.getGuideState() == GuideState.PAUSED) {
            stepBadge.setText(evaluation.getBadgeText());
            stepDescription.setText(evaluation.getInstructionText());
            if (evaluation.isLogin()) {
                overlay.updatePageState(PageState.LOGIN);
            } else {
                overlay.showStandaloneMessage(evaluation.getInstructionText());
            }
            applyManualGuidePreference();
            return;
        }

        if (evaluation.getGuideState() == GuideState.HIDDEN) {
            showManualFallback(evaluation.getInstructionText());
            return;
        }

        GuideStep step = evaluation.getStep();
        if (step == null || step.getTarget() == null) {
            stepBadge.setText(evaluation.getBadgeText());
            stepDescription.setText(evaluation.getInstructionText());
            applyManualGuidePreference();
            overlay.hideTargetHighlight();
            return;
        }

        if (currentStep == null || !currentStep.getStepId().equals(step.getStepId())) {
            lastPresentedStepId = null;
            lastPresentedRect = null;
        }
        currentStep = step;
        currentStepIsFinal = step.isUserMustTap();
        if (currentStepIsFinal || evaluation.isUserMustTap()) {
            successDetector.setFinalStepReached(true);
        }

        stepBadge.setText(evaluation.getBadgeText());
        String dockText = currentStepIsFinal
                ? FINAL_STEP_DOCK_COPY
                : step.getInstruction();
        stepDescription.setText(dockText);
        applyManualGuidePreference();
        resolveTarget(requestGeneration, requestUrl, step, 0);
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
                if (route.isGracefulFallbackOnTargetNotFound()) {
                    handleGracefulFallback(step);
                } else {
                    showManualFallback("버튼 위치를 화면에 맞추지 못했어요.");
                }
                return;
            }

            // Keyword validation: hard keywords or non-permitted soft keywords
            boolean textAllowed = AutoAdvancer.isKeywordAllowed(resolution.getMatchedText(), step.isAutoTapAllowed());
            boolean descAllowed = AutoAdvancer.isKeywordAllowed(resolution.getElementDescriptor(), step.isAutoTapAllowed());

            GuideStep presentationStep = step;
            if (!textAllowed || !descAllowed || step.isUserMustTap()) {
                currentStepIsFinal = true;
                if (!step.isUserMustTap()) {
                    presentationStep = new GuideStep(
                            step.getStepId(),
                            step.getLogicalPageState(),
                            FINAL_STEP_DOCK_COPY,
                            step.getTarget(),
                            step.getInteractionType(),
                            step.getPreferredPlacement(),
                            step.getOffsetDp(),
                            step.getExpectedNextStepId(),
                            step.getVerificationStatus(),
                            true, // userMustTap: true
                            false
                    );
                }
                stepDescription.setText(FINAL_STEP_DOCK_COPY);
            }

            applyManualGuidePreference();
            if (!samePresentation(presentationStep.getStepId(), mapped)) {
                overlay.showResolvedTarget(mapped, presentationStep);
                lastPresentedStepId = presentationStep.getStepId();
            }
            lastPresentedRect = new RectF(mapped);

            // Wire AutoAdvancer: request auto-advance for eligible intermediate step
            if (!currentStepIsFinal && !presentationStep.isUserMustTap()) {
                autoAdvancer.requestAutoAdvance(presentationStep, resolution, requestUrl);
            }
            return;
        }

        if (status == TargetResolutionStatus.FOUND_OFFSCREEN) {
            lastPresentedRect = null;
            applyManualGuidePreference();
            overlay.showTargetStatus(step, status, resolution.getRect());
            stepDescription.setText("버튼이 화면 밖에 있어요. 안내 방향으로 스크롤해주세요.");
            return;
        }

        if (status == TargetResolutionStatus.NOT_FOUND) {
            lastPresentedRect = null;
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

        if (route.isGracefulFallbackOnTargetNotFound()) {
            handleGracefulFallback(step);
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

    private void handleGracefulFallback(GuideStep step) {
        overlay.hideTargetHighlight();
        lastPresentedStepId = null;
        lastPresentedRect = null;
        String dockText = (step != null && (step.isUserMustTap() || currentStepIsFinal))
                ? FINAL_STEP_DOCK_COPY
                : (step != null ? step.getInstruction() : "");
        if (!dockText.isEmpty()) {
            stepDescription.setText(dockText);
        }
        applyManualGuidePreference();
    }

    private void showManualFallback(String message) {
        overlay.setVisibility(View.GONE);
        stepDescription.setText(message);
        lastPresentedStepId = null;
        lastPresentedRect = null;
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
}
