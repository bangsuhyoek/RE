package com.submate.app.webguide;

import android.webkit.WebView;

import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Common contract for cancellation guide routes (e.g. verified Naver route and declarative routes).
 */
public interface CancelGuideRoute {
    interface EvaluationCallback {
        void onEvaluated(RouteEvaluation evaluation);
    }

    String getServiceId();

    WebSecurityPolicy getSecurityPolicy();

    int getTotalSteps();

    int getStepNumber(String stepId);

    boolean isGracefulFallbackOnTargetNotFound();

    void evaluate(WebView webView, EvaluationCallback callback);

    default boolean isLoginUrl(String url) {
        return false;
    }

    default List<Pattern> getSuccessUrlPatterns() {
        return Collections.emptyList();
    }

    default List<String> getSuccessTextMatches() {
        return Collections.emptyList();
    }
}
