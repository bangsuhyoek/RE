package com.submate.app.webguide;

import android.graphics.RectF;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Detects cancellation success based on route success signals (URL pattern or on-page text match).
 *
 * CRITICAL SAFETY REQUIREMENT:
 * - Mark the final step as tapped ONLY when a user ACTION_UP touch falls inside
 *   the currently resolved bounding box (mapped rect) of the active userMustTap step.
 * - Text success matches must NOT count when the phrase was already present before the user's final action.
 * - Baseline tracking records success phrases present on page load, and only phrases newly appearing
 *   after the user's final action are counted.
 * - Additionally, if the route has a final-step concept, text success is allowed ONLY once the guide has
 *   reached its final step.
 */
public class SuccessDetector {
    public interface Callback {
        void onDetected(String detectedBy, String matchedSignal);
    }

    private final CancelGuideRoute route;
    private final SuccessBaselineTracker baselineTracker;
    private boolean finalStepTappedByUser = false;

    public SuccessDetector(CancelGuideRoute route) {
        this.route = route;
        boolean hasFinalStep = (route != null && route.getTotalSteps() > 0);
        this.baselineTracker = new SuccessBaselineTracker(hasFinalStep);
    }

    public SuccessBaselineTracker getBaselineTracker() {
        return baselineTracker;
    }

    public void setFinalStepReached(boolean reached) {
        baselineTracker.setFinalStepReached(reached);
    }

    public boolean isFinalStepReached() {
        return baselineTracker.isFinalStepReached();
    }

    public void onPageLoading() {
        baselineTracker.onPageLoading();
    }

    /**
     * Pure hit-test function: checks whether touch falls inside the resolved bounding box.
     */
    public static boolean isTouchInside(float touchX, float touchY, RectF targetRect) {
        if (targetRect == null) return false;
        return isTouchInside(touchX, touchY, targetRect.left, targetRect.top, targetRect.right, targetRect.bottom);
    }

    public static boolean isTouchInside(float touchX, float touchY, float left, float top, float right, float bottom) {
        return touchX >= left && touchX <= right && touchY >= top && touchY <= bottom;
    }

    /**
     * Marks final step tapped only if touch is within bounds of userMustTap target.
     */
    public boolean checkAndMarkFinalStepTapped(float touchX, float touchY, RectF activeFinalTargetRect) {
        if (isTouchInside(touchX, touchY, activeFinalTargetRect)) {
            markFinalStepTappedByUser();
            return true;
        }
        return false;
    }

    public void markFinalStepTappedByUser() {
        this.finalStepTappedByUser = true;
        this.baselineTracker.setFinalActionTaken(true);
    }

    public boolean isFinalStepTappedByUser() {
        return finalStepTappedByUser;
    }

    public void reset() {
        this.finalStepTappedByUser = false;
        this.baselineTracker.reset();
    }

    public boolean checkUrlSuccess(String url) {
        if (!finalStepTappedByUser || url == null || route == null) {
            return false;
        }
        List<Pattern> patterns = route.getSuccessUrlPatterns();
        if (patterns == null || patterns.isEmpty()) {
            return false;
        }
        for (Pattern p : patterns) {
            if (p != null && p.matcher(url).find()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Records the baseline phrases present in the WebView upon page load.
     */
    public void recordPageBaseline(WebView webView) {
        if (webView == null || route == null) return;
        List<String> texts = route.getSuccessTextMatches();
        if (texts == null || texts.isEmpty()) return;

        String currentUrl = webView.getUrl();
        if (currentUrl == null || !route.getSecurityPolicy().isAllowedForInjection(currentUrl)) {
            return;
        }

        String script = buildFindAllPhrasesScript(texts);
        webView.evaluateJavascript(script, raw -> {
            List<String> found = parseJsonStringArray(raw);
            baselineTracker.recordBaseline(found);
        });
    }

    public void checkTextSuccess(WebView webView, Callback callback) {
        if (callback == null) return;
        if (!baselineTracker.isTextSuccessAllowed() || webView == null || route == null) {
            callback.onDetected(null, null);
            return;
        }

        List<String> texts = route.getSuccessTextMatches();
        if (texts == null || texts.isEmpty()) {
            callback.onDetected(null, null);
            return;
        }

        String currentUrl = webView.getUrl();
        if (currentUrl == null || !route.getSecurityPolicy().isAllowedForInjection(currentUrl)) {
            callback.onDetected(null, null);
            return;
        }

        String script = buildFindAllPhrasesScript(texts);
        webView.evaluateJavascript(script, raw -> {
            List<String> found = parseJsonStringArray(raw);
            String newlyAppeared = baselineTracker.evaluateNewSuccessPhrases(found);
            if (newlyAppeared != null) {
                callback.onDetected("text", newlyAppeared);
            } else {
                callback.onDetected(null, null);
            }
        });
    }

    public static List<String> parseJsonStringArray(String raw) {
        List<String> result = new ArrayList<>();
        if (raw == null || raw.trim().isEmpty() || "null".equals(raw.trim())) {
            return result;
        }
        try {
            String json = raw.trim();
            if (json.startsWith("\"") && json.endsWith("\"") && json.length() > 2) {
                json = new JSONObject("{v:" + json + "}").getString("v");
            }
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                String val = arr.optString(i, "");
                if (!val.isEmpty()) {
                    result.add(val);
                }
            }
        } catch (Exception e) {
            String s = raw.trim();
            if (s.startsWith("\"") && s.endsWith("\"") && s.length() > 2) {
                s = s.substring(1, s.length() - 1);
            }
            if (!s.isEmpty() && !"false".equals(s) && !"null".equals(s) && !s.startsWith("[")) {
                result.add(s);
            }
        }
        return result;
    }

    public static String buildFindAllPhrasesScript(List<String> textMatches) {
        JSONArray arr = new JSONArray();
        for (String tm : textMatches) {
            if (tm != null && !tm.trim().isEmpty()) {
                arr.put(tm.trim());
            }
        }
        String targetsJson = JSONObject.quote(arr.toString());

        return "(function(){try{"
                + "var targets=JSON.parse(" + targetsJson + ");"
                + "var body=(document.body?document.body.innerText||document.body.textContent:'');"
                + "var text=body.slice(0,20000).toLowerCase();"
                + "var found=[];"
                + "for(var i=0;i<targets.length;i++){"
                + "  var t=targets[i].toLowerCase();"
                + "  if(t&&text.indexOf(t)>=0)found.push(targets[i]);"
                + "}"
                + "return JSON.stringify(found);"
                + "}catch(e){return '[]';}})()";
    }

    public static String buildSuccessTextScript(List<String> textMatches) {
        JSONArray arr = new JSONArray();
        for (String tm : textMatches) {
            if (tm != null && !tm.trim().isEmpty()) {
                arr.put(tm.trim());
            }
        }
        String targetsJson = JSONObject.quote(arr.toString());

        return "(function(){try{"
                + "var targets=JSON.parse(" + targetsJson + ");"
                + "var body=(document.body?document.body.innerText||document.body.textContent:'');"
                + "var text=body.slice(0,20000).toLowerCase();"
                + "for(var i=0;i<targets.length;i++){"
                + "  var t=targets[i].toLowerCase();"
                + "  if(t&&text.indexOf(t)>=0)return targets[i];"
                + "}"
                + "return false;"
                + "}catch(e){return false;}})()";
    }
}
