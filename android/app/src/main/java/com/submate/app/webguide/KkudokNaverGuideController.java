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
import com.submate.app.webguide.target.GuideTargetSpec;
import com.submate.app.webguide.target.TargetResolution;
import com.submate.app.webguide.target.TargetResolutionStatus;
import com.submate.app.webguide.target.TargetRect;
import com.submate.app.webguide.target.TargetResolver;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

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
        default void onLoginStateChanged(boolean isLoginRequired, String message) {}
        default void onStepProgressUpdated(String badge, String instruction, boolean isFinalStep, String matchedTargetText) {}
        default void onManualFallbackRequired(String reason) {}
        default void onFinalTapUnverified(String reason) {}
        default void onUserTapRequired(String targetText) {}
        default void onStepTapFailed(String reason) {}
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
    private boolean successTriggered = false;
    private Runnable pendingEvaluate;
    private Runnable pendingRetry;
    private Runnable pendingTextSuccessCheck;
    private PageState lastPageState;
    private String lastPresentedStepId;
    private RectF lastPresentedRect;
    private GuideStep currentStep;
    private boolean currentStepIsFinal = false;
    private String currentMatchedTargetText = "";
    private boolean lastReportedLoginState = false;
    private String lastReportedUserTapRequiredStepId = null;
    private final Set<String> autoScrolledStepUrls = new HashSet<>();

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
        return currentStepIsFinal;
    }

    public void onPageLoading() {
        invalidatePending();
        successDetector.onPageLoading();
        lastPageState = null;
        lastPresentedStepId = null;
        lastPresentedRect = null;
        currentStep = null;
        currentStepIsFinal = false;
        lastReportedUserTapRequiredStepId = null;
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
        if (destroyed || webView == null || successTriggered) return;
        if (!successDetector.isFinalStepTappedByUser()) return;

        String currentUrl = webView.getUrl();
        if (successDetector.checkUrlSuccess(currentUrl)) {
            triggerSuccess("url", currentUrl);
            return;
        }

        // Check text immediately and schedule another check ~1s later (Requirement 4)
        successDetector.checkTextSuccess(webView, (detectedBy, matchedSignal) -> {
            if (destroyed || successTriggered) return;
            if (detectedBy != null) {
                triggerSuccess(detectedBy, matchedSignal);
            }
        });

        if (pendingTextSuccessCheck != null) {
            handler.removeCallbacks(pendingTextSuccessCheck);
        }
        pendingTextSuccessCheck = () -> {
            pendingTextSuccessCheck = null;
            if (destroyed || webView == null || successTriggered || !successDetector.isFinalStepTappedByUser()) return;
            successDetector.checkTextSuccess(webView, (detectedBy, matchedSignal) -> {
                if (destroyed || successTriggered) return;
                if (detectedBy != null) {
                    triggerSuccess(detectedBy, matchedSignal);
                }
            });
        };
        handler.postDelayed(pendingTextSuccessCheck, 1000L);
    }

    private void triggerSuccess(String detectedBy, String signal) {
        if (successTriggered) return;
        successTriggered = true;
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
                if (!lastReportedLoginState && listener != null) {
                    lastReportedLoginState = true;
                    listener.onLoginStateChanged(true, evaluation.getInstructionText());
                }
            } else {
                overlay.showStandaloneMessage(evaluation.getInstructionText());
                if (lastReportedLoginState && listener != null) {
                    lastReportedLoginState = false;
                    listener.onLoginStateChanged(false, evaluation.getInstructionText());
                }
            }
            applyManualGuidePreference();
            return;
        }

        if (lastReportedLoginState && listener != null) {
            lastReportedLoginState = false;
            listener.onLoginStateChanged(false, "");
        }

        if (evaluation.getGuideState() == GuideState.HIDDEN) {
            showManualFallback(evaluation.getInstructionText());
            if (listener != null) {
                String instr = evaluation.getInstructionText();
                String reason = (instr != null && instr.contains("🌐 브라우저")) ? "blocked" : "hidden";
                listener.onManualFallbackRequired(reason);
            }
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
            lastReportedUserTapRequiredStepId = null;
        }
        currentStep = step;
        boolean isUserTapRequired = step.isUserMustTap()
                && step.getLogicalPageState() != PageState.FINAL_CANCEL_CONFIRM
                && route != null
                && route.getStepNumber(step.getStepId()) < route.getTotalSteps();

        currentStepIsFinal = step.isUserMustTap() && !isUserTapRequired;
        if (currentStepIsFinal || (evaluation.isUserMustTap() && !isUserTapRequired)) {
            successDetector.setFinalStepReached(true);
        }

        stepBadge.setText(evaluation.getBadgeText());
        String dockText = currentStepIsFinal
                ? FINAL_STEP_DOCK_COPY
                : step.getInstruction();
        stepDescription.setText(dockText);
        if (listener != null) {
            listener.onStepProgressUpdated(evaluation.getBadgeText(), dockText, currentStepIsFinal, currentMatchedTargetText);
        }
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

            currentMatchedTargetText = resolution.getMatchedText() != null ? resolution.getMatchedText() : "";

            // Keyword validation: hard keywords or non-permitted soft keywords
            boolean textAllowed = AutoAdvancer.isKeywordAllowed(resolution.getMatchedText(), step.isAutoTapAllowed());
            boolean descAllowed = AutoAdvancer.isKeywordAllowed(resolution.getElementDescriptor(), step.isAutoTapAllowed());

            boolean isUserTapRequired = step.isUserMustTap()
                    && step.getLogicalPageState() != PageState.FINAL_CANCEL_CONFIRM
                    && route != null
                    && route.getStepNumber(step.getStepId()) < route.getTotalSteps();

            GuideStep presentationStep = step;
            if (!textAllowed || !descAllowed || (step.isUserMustTap() && !isUserTapRequired)) {
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
            if (listener != null) {
                String dockMsg = currentStepIsFinal
                        ? FINAL_STEP_DOCK_COPY
                        : presentationStep.getInstruction();
                listener.onStepProgressUpdated(
                        stepBadge.getText() != null ? stepBadge.getText().toString() : "",
                        dockMsg,
                        currentStepIsFinal,
                        currentMatchedTargetText
                );

                if (isUserTapRequired && !presentationStep.getStepId().equals(lastReportedUserTapRequiredStepId)) {
                    lastReportedUserTapRequiredStepId = presentationStep.getStepId();
                    listener.onUserTapRequired(currentMatchedTargetText);
                }
            }

            // Wire AutoAdvancer: request auto-advance for eligible intermediate step
            if (!currentStepIsFinal && !presentationStep.isUserMustTap()) {
                autoAdvancer.requestAutoAdvance(presentationStep, resolution, requestUrl);
            }
            return;
        }

        if (status == TargetResolutionStatus.FOUND_OFFSCREEN) {
            lastPresentedRect = null;
            applyManualGuidePreference();
            TargetRect rawRect = resolution.getRect();
            String scrollKey = step.getStepId() + "@" + (requestUrl == null ? "" : requestUrl);
            if (rawRect != null && !autoScrolledStepUrls.contains(scrollKey)) {
                autoScrolledStepUrls.add(scrollKey);
                float targetCenterY = rawRect.topCssPx + (rawRect.heightCssPx / 2f);
                float viewportCenterY = (rawRect.viewportHeightCssPx > 0 ? rawRect.viewportHeightCssPx : 600f) / 2f;
                int deltaY = Math.round(targetCenterY - viewportCenterY);
                if (Math.abs(deltaY) > 24 && webView != null) {
                    stepDescription.setText("해지 버튼 위치로 화면을 이동하고 있어요…");
                    webView.evaluateJavascript(
                            "(function(){try{window.scrollBy({top:" + deltaY + ",left:0,behavior:'smooth'});}catch(e){window.scrollBy(0," + deltaY + ");}})()",
                            null
                    );
                    scheduleEvaluate(480L);
                    return;
                }
            }
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
            if (listener != null) {
                listener.onManualFallbackRequired("target_not_found");
            }
            return;
        }

        if (status == TargetResolutionStatus.AMBIGUOUS) {
            showManualFallback("같은 이름의 버튼이 여러 개 보여 수동 안내로 전환했어요.");
        } else if (status == TargetResolutionStatus.NOT_FOUND) {
            showManualFallback("현재 화면에서 버튼 위치를 찾지 못해 수동 안내로 전환했어요.");
        } else {
            showManualFallback("자동 위치 안내를 사용할 수 없어 수동 안내로 전환했어요.");
        }
        if (listener != null) {
            listener.onManualFallbackRequired(status.name());
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

    /**
     * 사용자가 꾸독의 무화면 승인 카드에서 [마지막 해지 확정하기]를 직접 눌렀을 때
     * 백그라운드 웹뷰의 최종 해지 버튼에 클릭을 전달하고 해지 완료 검증을 시작한다.
     */
    public void performUserConfirmedFinalTap(Runnable onAfterTap) {
        if (destroyed || webView == null || successTriggered) return;

        GuideTargetSpec spec = currentStep != null ? currentStep.getTarget() : null;
        String clickScript = buildFinalConfirmClickScript(spec, currentMatchedTargetText);
        webView.evaluateJavascript(clickScript, res -> {
            if (onAfterTap != null) onAfterTap.run();
            if (destroyed) return;

            String clickResult = parseFinalConfirmClickResult(res);
            if (!isClickSuccessResult(clickResult)) {
                String reason = "not_found".equals(clickResult) ? "click_not_found" : "click_error";
                if (listener != null) {
                    listener.onFinalTapUnverified(reason);
                }
                return;
            }

            successDetector.setFinalStepReached(true);
            successDetector.markFinalStepTappedByUser();

            long[] pollDelays = {450L, 1100L, 2000L, 3200L, 4500L};
            for (long delay : pollDelays) {
                handler.postDelayed(() -> {
                    if (!destroyed && !successTriggered) {
                        checkSuccessSignals();
                    }
                }, delay);
            }

            handler.postDelayed(() -> {
                if (!destroyed && !successTriggered) {
                    if (listener != null) {
                        listener.onFinalTapUnverified("no_success_signal");
                    }
                }
            }, 5000L);
        });
    }

    /**
     * 사용자가 꾸독의 승인 카드에서 중간 단계 수동 클릭([진행하기])을 직접 눌렀을 때
     * 백그라운드 웹뷰의 해당 버튼에 클릭을 전달하고 다음 단계를 재평가한다.
     * 최종 해지 상태 변경이나 완료 검증은 수행하지 않는다.
     */
    public void performUserConfirmedStepTap() {
        if (destroyed || webView == null) return;

        GuideTargetSpec spec = currentStep != null ? currentStep.getTarget() : null;
        String clickScript = buildFinalConfirmClickScript(spec, currentMatchedTargetText);
        webView.evaluateJavascript(clickScript, res -> {
            if (destroyed) return;

            String clickResult = parseFinalConfirmClickResult(res);
            if (!isClickSuccessResult(clickResult)) {
                String reason = "not_found".equals(clickResult) ? "click_not_found" : "click_error";
                if (listener != null) {
                    listener.onStepTapFailed(reason);
                }
                return;
            }

            scheduleEvaluate(600L);
        });
    }

    static String parseFinalConfirmClickResult(String rawResult) {
        if (rawResult == null) return "error";
        String s = rawResult.trim();
        if ("null".equals(s) || s.isEmpty()) return "error";
        if (s.startsWith("\"") && s.endsWith("\"") && s.length() >= 2) {
            s = s.substring(1, s.length() - 1);
        }
        return s;
    }

    static boolean isClickSuccessResult(String result) {
        return "clicked_id".equals(result)
                || "clicked_exact".equals(result)
                || "clicked_match".equals(result)
                || "clicked_sel".equals(result);
    }

    private static String buildFinalConfirmClickScript(GuideTargetSpec spec, String fallbackText) {
        JSONObject target = new JSONObject();
        try {
            if (spec != null) {
                if (spec.getSelector() != null) target.put("selector", spec.getSelector());
                if (spec.getElementId() != null) target.put("id", spec.getElementId());
                if (spec.getText() != null) target.put("text", spec.getText());
                if (spec.getTextMatches() != null && !spec.getTextMatches().isEmpty()) {
                    JSONArray arr = new JSONArray();
                    for (String tm : spec.getTextMatches()) {
                        if (tm != null && !tm.trim().isEmpty()) arr.put(tm.trim());
                    }
                    target.put("textMatches", arr);
                }
            }
            if (fallbackText != null && !fallbackText.trim().isEmpty()) {
                target.put("fallbackText", fallbackText.trim());
            }
        } catch (Exception ignored) {}

        String jsonLiteral = JSONObject.quote(target.toString());
        return "(function(){"
                + "try{"
                + "var spec=JSON.parse(" + jsonLiteral + ");"
                + "var norm=function(v){return (v||'').replace(/\\s+/g,' ').trim();};"
                + "var nodes=document.querySelectorAll('a,button,[role=button],[role=link],[role=menuitem],[role=tab],input[type=button],input[type=submit]');"
                + "if(spec.id){var byId=document.getElementById(spec.id);if(byId){byId.click();return 'clicked_id';}}"
                + "if(spec.selector&&spec.selector.indexOf('data-kkudok-ai-idx')>=0){var aiEl=document.querySelector(spec.selector);if(aiEl){aiEl.click();return 'clicked_sel';}}"
                + "if(spec.fallbackText){var ft=norm(spec.fallbackText).toLowerCase();for(var i=0;i<nodes.length;i++){var t=norm(nodes[i].innerText||nodes[i].textContent||nodes[i].value).toLowerCase();if(t===ft){nodes[i].click();return 'clicked_exact';}}}"
                + "var tms=spec.textMatches||[];for(var m=0;m<tms.length;m++){var ml=norm(tms[m]).toLowerCase();for(var j=0;j<nodes.length;j++){var tj=norm(nodes[j].innerText||nodes[j].textContent||nodes[j].value).toLowerCase();if(ml&&tj.indexOf(ml)>=0){nodes[j].click();return 'clicked_match';}}}"
                + "if(spec.selector){var sel=document.querySelector(spec.selector);if(sel){sel.click();return 'clicked_sel';}}"
                + "return 'not_found';"
                + "}catch(e){return 'error';}"
                + "})()";
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
