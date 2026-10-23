package com.submate.app.webguide.services.naver;

import android.webkit.WebView;

import com.submate.app.webguide.CancelGuideRoute;
import com.submate.app.webguide.RouteEvaluation;
import com.submate.app.webguide.WebSecurityPolicy;
import com.submate.app.webguide.state.GuideState;
import com.submate.app.webguide.state.PageState;
import com.submate.app.webguide.target.GuideStep;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;

public final class NaverCancelGuideRoute implements CancelGuideRoute {
    private final WebSecurityPolicy securityPolicy;
    private final List<Pattern> successUrlPatterns;
    private final List<String> successTextMatches;

    public NaverCancelGuideRoute() {
        this.securityPolicy = new WebSecurityPolicy(Arrays.asList("naver.com"));
        this.successUrlPatterns = Collections.unmodifiableList(Arrays.asList(
                Pattern.compile("^https?://(?:nid|help)\\.naver\\.com/membership/.*(?:cancel.*complete|done).*", Pattern.CASE_INSENSITIVE)
        ));
        this.successTextMatches = Collections.unmodifiableList(Arrays.asList(
                "해지가 완료",
                "멤버십이 해지",
                "정기결제 해지 완료",
                "해지 예약",
                "Your membership has been cancelled",
                "cancellation is complete",
                "Membership cancelled"
        ));
    }

    @Override
    public String getServiceId() {
        return "naverplus";
    }

    @Override
    public WebSecurityPolicy getSecurityPolicy() {
        return securityPolicy;
    }

    @Override
    public int getTotalSteps() {
        return 5;
    }

    @Override
    public int getStepNumber(String stepId) {
        if (stepId == null) return 0;
        if (NaverMonthlyCancelRoute.STEP_SETTINGS.equals(stepId)) return 1;
        if (NaverMonthlyCancelRoute.STEP_MANAGE.equals(stepId)) return 2;
        if (NaverMonthlyCancelRoute.STEP_CANCEL_ENTRY.equals(stepId)) return 3;
        if (NaverMonthlyCancelRoute.STEP_RECURRING_CANCEL.equals(stepId)) return 4;
        if (NaverMonthlyCancelRoute.STEP_FINAL_CONFIRM.equals(stepId)) return 5;
        return 0;
    }

    @Override
    public boolean isGracefulFallbackOnTargetNotFound() {
        return false; // Preserve Naver's existing strict live verification behavior
    }

    @Override
    public List<Pattern> getSuccessUrlPatterns() {
        return successUrlPatterns;
    }

    @Override
    public List<String> getSuccessTextMatches() {
        return successTextMatches;
    }

    @Override
    public boolean isLoginUrl(String url) {
        if (url == null) return false;
        String u = url.toLowerCase();
        return u.contains("nidlogin.login") || u.contains("/login") || u.contains("/nidlogin");
    }

    @Override
    public void evaluate(WebView webView, EvaluationCallback callback) {
        if (callback == null) return;
        NaverPageStateResolver.resolve(webView, pageState -> {
            GuideState guideState = NaverMembershipGuide.guideStateFor(pageState);
            GuideStep step = NaverMembershipGuide.currentStep(pageState);
            if (guideState == GuideState.PAUSED) {
                if (pageState == PageState.LOGIN) {
                    callback.onEvaluated(RouteEvaluation.fromNaver(pageState, null, "로그인", "로그인을 완료하면 자동으로 안내를 이어갈게요."));
                } else {
                    callback.onEvaluated(RouteEvaluation.fromNaver(pageState, null, "", NaverMembershipGuide.messageFor(pageState)));
                }
                return;
            }
            if (pageState == PageState.CANCEL_COMPLETE) {
                callback.onEvaluated(RouteEvaluation.fromNaver(pageState, null, "완료", "해지 완료 여부를 확인한 뒤 상단의 해지 완료를 눌러주세요."));
                return;
            }
            if (pageState == PageState.UNSUPPORTED_PAGE || guideState == GuideState.HIDDEN) {
                callback.onEvaluated(RouteEvaluation.hidden("현재 페이지에서는 자동 위치 안내를 사용할 수 없어요."));
                return;
            }
            if (step != null) {
                int num = getStepNumber(step.getStepId());
                String badge = num > 0 ? num + "/5단계" : "";
                callback.onEvaluated(RouteEvaluation.fromNaver(pageState, step, badge, step.getInstruction()));
                return;
            }
            callback.onEvaluated(RouteEvaluation.fromNaver(pageState, null, "", NaverMembershipGuide.messageFor(pageState)));
        });
    }
}
