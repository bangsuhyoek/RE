package com.submate.app.webguide.declarative;

import android.webkit.WebView;

import com.submate.app.webguide.CancelGuideRoute;
import com.submate.app.webguide.RouteEvaluation;
import com.submate.app.webguide.WebSecurityPolicy;
import com.submate.app.webguide.services.universal.UniversalCancelRoute;
import com.submate.app.webguide.target.GuideStep;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;

public class DeclarativeCancelRoute implements CancelGuideRoute {
    private final String serviceId;
    private final WebSecurityPolicy securityPolicy;
    private final List<Pattern> loginUrlPatterns;
    private final List<DeclarativeStep> steps;
    private final List<Pattern> successUrlPatterns;
    private final List<String> successTextMatches;
    private final UniversalCancelRoute.FlowState flowState = new UniversalCancelRoute.FlowState();

    public DeclarativeCancelRoute(
            String serviceId,
            List<String> injectionDomains,
            List<String> navigationOnlyDomains,
            List<String> loginUrlPatterns,
            List<DeclarativeStep> steps
    ) {
        this(serviceId, injectionDomains, navigationOnlyDomains, loginUrlPatterns, steps, Collections.emptyList(), Collections.emptyList());
    }

    public DeclarativeCancelRoute(
            String serviceId,
            List<String> injectionDomains,
            List<String> navigationOnlyDomains,
            List<String> loginUrlPatterns,
            List<DeclarativeStep> steps,
            List<String> successUrlPatternRegexes,
            List<String> successTextMatches
    ) {
        this.serviceId = serviceId == null ? "" : serviceId.trim();
        this.securityPolicy = new WebSecurityPolicy(injectionDomains, navigationOnlyDomains);
        this.loginUrlPatterns = new ArrayList<>();
        if (loginUrlPatterns != null) {
            for (String pat : loginUrlPatterns) {
                if (pat != null && !pat.trim().isEmpty()) {
                    this.loginUrlPatterns.add(Pattern.compile(pat.trim(), Pattern.CASE_INSENSITIVE));
                }
            }
        }
        this.steps = steps != null ? new ArrayList<>(steps) : new ArrayList<>();
        this.successUrlPatterns = new ArrayList<>();
        if (successUrlPatternRegexes != null) {
            for (String pat : successUrlPatternRegexes) {
                if (pat != null && !pat.trim().isEmpty()) {
                    this.successUrlPatterns.add(Pattern.compile(pat.trim(), Pattern.CASE_INSENSITIVE));
                }
            }
        }
        this.successTextMatches = new ArrayList<>();
        if (successTextMatches != null) {
            for (String tm : successTextMatches) {
                if (tm != null && !tm.trim().isEmpty()) {
                    this.successTextMatches.add(tm.trim());
                }
            }
        }
    }

    @Override
    public String getServiceId() {
        return serviceId;
    }

    @Override
    public WebSecurityPolicy getSecurityPolicy() {
        return securityPolicy;
    }

    @Override
    public int getTotalSteps() {
        return steps.size();
    }

    @Override
    public int getStepNumber(String stepId) {
        if (stepId == null) return 0;
        for (int i = 0; i < steps.size(); i++) {
            if (stepId.equals(steps.get(i).getId())) {
                return i + 1;
            }
        }
        return 0;
    }

    @Override
    public boolean isGracefulFallbackOnTargetNotFound() {
        return true;
    }

    public List<DeclarativeStep> getSteps() {
        return Collections.unmodifiableList(steps);
    }

    @Override
    public List<Pattern> getSuccessUrlPatterns() {
        return Collections.unmodifiableList(successUrlPatterns);
    }

    @Override
    public List<String> getSuccessTextMatches() {
        return Collections.unmodifiableList(successTextMatches);
    }

    @Override
    public boolean isLoginUrl(String url) {
        if (url == null || url.trim().isEmpty()) return false;
        for (Pattern pattern : loginUrlPatterns) {
            if (pattern.matcher(url).find()) {
                return true;
            }
        }
        return false;
    }

    public DeclarativeStep matchStep(String url) {
        if (url == null || url.trim().isEmpty()) return null;
        for (int i = steps.size() - 1; i >= 0; i--) {
            DeclarativeStep step = steps.get(i);
            if (step.matchesUrl(url)) {
                return step;
            }
        }
        return null;
    }

    @Override
    public void evaluate(WebView webView, EvaluationCallback callback) {
        if (callback == null) return;
        if (webView == null) {
            callback.onEvaluated(RouteEvaluation.hidden("공식 페이지를 확인하고 있어요."));
            return;
        }

        String currentUrl = webView.getUrl();
        if (currentUrl == null || currentUrl.trim().isEmpty()) {
            callback.onEvaluated(RouteEvaluation.hidden("공식 페이지를 확인하고 있어요."));
            return;
        }

        if (isLoginUrl(currentUrl)) {
            callback.onEvaluated(RouteEvaluation.paused(
                    "로그인",
                    "로그인이 끝나면 이어서 안내할게요",
                    true,
                    false
            ));
            return;
        }

        DeclarativeStep matchedStep = matchStep(currentUrl);
        if (matchedStep != null) {
            int stepNumber = getStepNumber(matchedStep.getId());
            String badge = stepNumber + "/" + steps.size() + "단계";
            String instruction = matchedStep.isUserMustTap()
                    ? "마지막 해지 버튼은 직접 눌러 주세요"
                    : matchedStep.getInstruction();
            GuideStep guideStep = matchedStep.toGuideStep(stepNumber, steps.size());
            callback.onEvaluated(RouteEvaluation.talking(guideStep, badge, instruction, matchedStep.isUserMustTap()));
            return;
        }

        UniversalCancelRoute.evaluateDom(
                webView,
                currentUrl,
                securityPolicy,
                Collections.emptyList(),
                Math.max(3, steps.size()),
                flowState,
                callback
        );
    }
}
