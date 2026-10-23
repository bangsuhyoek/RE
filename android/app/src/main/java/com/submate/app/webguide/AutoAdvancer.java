package com.submate.app.webguide;

import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;

import com.submate.app.webguide.target.GuideInteractionType;
import com.submate.app.webguide.target.GuideStep;
import com.submate.app.webguide.target.GuideTargetSpec;
import com.submate.app.webguide.target.TargetResolution;
import com.submate.app.webguide.target.TargetResolutionStatus;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Handles automatic advancement for intermediate navigation steps in the cancellation flow.
 *
 * Enforces strict safety rules:
 * - TargetResolver remains strictly read-only; AutoAdvancer manages script injection for clicks.
 * - Only runs for intermediate steps (!isUserMustTap(), interactionType == TAP, status == FOUND_VISIBLE).
 * - HARD BLOCK always: 확정, 완료, 탈퇴, 환불, 결제 취소, 결제취소, Finish, Confirm, Delete, Complete.
 * - SOFT keywords: 해지, 취소, cancel, 비활성화, deactivate - allowed only if step.isAutoTapAllowed() == true.
 * - Never click inside dialog/modal (closest('[role=dialog],[role=alertdialog],[aria-modal=true],dialog')).
 * - In executeAutoTap, re-checks all safety preconditions and aborts silently if any condition changed.
 * - Displays a 1.2s interruptible countdown with an explicit opt-out ("직접 할게요") and cancels on user touch.
 * - Loop guard: max 1 auto-tap per (stepId + URL), max 6 per session, and fallback on 3s stall without navigation.
 * - Restricts execution strictly to allowlisted hosts in WebSecurityPolicy and blocks on login/auth URLs.
 */
public class AutoAdvancer {
    public static final int MAX_SESSION_AUTO_TAPS = 6;
    public static final long COUNTDOWN_DURATION_MS = 1200L;
    public static final long STALL_DETECTION_TIMEOUT_MS = 3000L;

    public interface UiDelegate {
        void showAutoAdvanceCountdown(long durationMs, Runnable onCancelOptOut);
        void cancelAutoAdvanceCountdown();
        void onAutoAdvanceComplete(String stepId, int autoTapsCount);
        void onAutoAdvanceBlocked(String stepId, String reason);
        void onAutoAdvanceFallbackToManual(String stepId, String reason);
    }

    public interface EnvironmentStateSupplier {
        boolean isPopupOpen();
        boolean isGuidePaused();
    }

    // Hard block keywords: ALWAYS refused, converted to manual
    // 돈이 나가는 동작(결제·구매·업그레이드·구독 시작/재개)은 해지 이동 중에도 절대 자동 탭하지 않는다.
    // 맨 명사("결제", "구매", "pay")는 "결제 관리", "자동결제 해지", "Payment & billing" 같은
    // 정상 해지 이동 문구까지 막으므로, 동작을 뜻하는 표현만 넣는다.
    public static final List<String> HARD_BLOCK_KEYWORDS = Collections.unmodifiableList(Arrays.asList(
            "확정",
            "완료",
            "탈퇴",
            "환불",
            "결제 취소",
            "결제취소",
            "결제하기",
            "결제 진행",
            "결제 계속",
            "지금 결제",
            "바로 결제",
            "구매하기",
            "구매 진행",
            "지금 구매",
            "업그레이드",
            "구독하기",
            "다시 시작",
            "재구독",
            "플랜 변경",
            "결제 수단 변경",
            "카드 변경",
            "pay now",
            "buy now",
            "purchase now",
            "upgrade",
            "subscribe now",
            "resume subscription",
            "restart subscription",
            "start membership",
            "finish",
            "confirm",
            "delete",
            "complete"
    ));

    // 해지 이동에 해당하는 버튼 글. AI 가 고른 단계는 이 목록에 맞아야 자동 탭 후보가 된다.
    public static final List<String> CANCEL_NAVIGATION_ALLOWLIST = Collections.unmodifiableList(Arrays.asList(
            "해지",
            "해지하기",
            "구독 해지",
            "멤버십 해지",
            "구독 관리",
            "멤버십 관리",
            "정기결제 관리",
            "결제 관리",
            "계정",
            "계정 설정",
            "설정",
            "구독",
            "멤버십",
            "요금제",
            "플랜",
            "cancel",
            "manage",
            "membership",
            "subscription",
            "billing",
            "account",
            "settings",
            "plan"
    ));

    // Soft keywords: allowed ONLY if step.isAutoTapAllowed() == true
    public static final List<String> SOFT_KEYWORDS = Collections.unmodifiableList(Arrays.asList(
            "해지",
            "취소",
            "cancel",
            "비활성화",
            "deactivate"
    ));

    private final WebView webView;
    private final WebSecurityPolicy securityPolicy;
    private final CancelGuideRoute route;
    private final UiDelegate uiDelegate;
    private final EnvironmentStateSupplier envSupplier;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private boolean disabledForSession = false;
    private int sessionAutoTapCount = 0;
    private final Set<String> executedStepUrlPairs = new HashSet<>();
    private final Set<String> stalledStepIds = new HashSet<>();

    private Runnable pendingCountdownRunnable = null;
    private Runnable pendingStallRunnable = null;
    private String scheduledStepId = null;
    private String scheduledUrl = null;
    private GuideStep scheduledStep = null;
    private boolean isCountingDown = false;

    public AutoAdvancer(
            WebView webView,
            WebSecurityPolicy securityPolicy,
            CancelGuideRoute route,
            UiDelegate uiDelegate,
            EnvironmentStateSupplier envSupplier
    ) {
        this.webView = webView;
        this.securityPolicy = securityPolicy != null ? securityPolicy : new WebSecurityPolicy();
        this.route = route;
        this.uiDelegate = uiDelegate;
        this.envSupplier = envSupplier;
    }

    public boolean isDisabledForSession() {
        return disabledForSession;
    }

    public int getSessionAutoTapCount() {
        return sessionAutoTapCount;
    }

    public boolean isCountdownActive() {
        return isCountingDown;
    }

    public void disableForSession(String reason) {
        disabledForSession = true;
        cancelPendingAutoTap("disabled_for_session: " + reason);
    }

    public void cancelPendingAutoTap(String reason) {
        if (pendingCountdownRunnable != null) {
            handler.removeCallbacks(pendingCountdownRunnable);
            pendingCountdownRunnable = null;
        }
        if (pendingStallRunnable != null) {
            handler.removeCallbacks(pendingStallRunnable);
            pendingStallRunnable = null;
        }
        boolean wasCounting = isCountingDown;
        isCountingDown = false;
        String stepId = scheduledStepId;
        scheduledStepId = null;
        scheduledUrl = null;
        scheduledStep = null;

        if (wasCounting && uiDelegate != null) {
            uiDelegate.cancelAutoAdvanceCountdown();
            if (stepId != null) {
                uiDelegate.onAutoAdvanceFallbackToManual(stepId, reason);
            }
        }
    }

    public static boolean containsHardBlockKeyword(String text) {
        if (text == null || text.trim().isEmpty()) return false;
        String normalized = text.replaceAll("\\s+", " ").trim().toLowerCase(Locale.ROOT);
        for (String kw : HARD_BLOCK_KEYWORDS) {
            if (normalized.contains(kw.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    public static boolean containsSoftKeyword(String text) {
        if (text == null || text.trim().isEmpty()) return false;
        String normalized = text.replaceAll("\\s+", " ").trim().toLowerCase(Locale.ROOT);
        for (String kw : SOFT_KEYWORDS) {
            if (normalized.contains(kw.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    public static boolean isKeywordAllowed(String text, boolean autoTapAllowed) {
        if (containsHardBlockKeyword(text)) {
            return false;
        }
        if (containsSoftKeyword(text)) {
            return autoTapAllowed;
        }
        return true;
    }

    public static boolean containsCancelNavigationKeyword(String text) {
        if (text == null || text.trim().isEmpty()) return false;
        String normalized = text.replaceAll("\\s+", " ").trim().toLowerCase(Locale.ROOT);
        for (String kw : CANCEL_NAVIGATION_ALLOWLIST) {
            if (normalized.contains(kw.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    /**
     * 자동 탭 최종 판정: 차단어에 걸리지 않고, 해지 이동 표현에 맞을 때만 허용한다.
     * AI 가 해지 단계로 골랐더라도 버튼 글이 결제·구매 쪽이면 강조만 하고 누르지 않는다.
     */
    public static boolean isAutoTapCandidate(String text, boolean autoTapAllowed) {
        if (!isKeywordAllowed(text, autoTapAllowed)) {
            return false;
        }
        return containsCancelNavigationKeyword(text);
    }

    public static String makePairKey(String stepId, String url) {
        String sId = stepId != null ? stepId : "";
        String u = url != null ? url : "";
        return sId + "@" + u;
    }

    public static boolean isEligibleForAutoTap(
            GuideStep step,
            TargetResolution resolution,
            String currentUrl,
            WebSecurityPolicy policy,
            CancelGuideRoute route,
            boolean isPopupOpen,
            boolean isGuidePaused,
            boolean disabledForSession,
            int sessionAutoTapCount,
            Set<String> executedStepUrlPairs,
            Set<String> stalledStepIds
    ) {
        if (step == null || resolution == null || currentUrl == null || policy == null) {
            return false;
        }
        if (disabledForSession) return false;
        if (isPopupOpen || isGuidePaused) return false;
        if (sessionAutoTapCount >= MAX_SESSION_AUTO_TAPS) return false;
        if (step.isUserMustTap()) return false;
        if (step.getInteractionType() != GuideInteractionType.TAP) return false;
        if (resolution.getStatus() != TargetResolutionStatus.FOUND_VISIBLE) return false;

        // Security check
        if (!policy.isAllowedForInjection(currentUrl)) return false;
        if (route != null && route.isLoginUrl(currentUrl)) return false;

        // Keyword validation: hard-block vs soft-keyword with autoTapAllowed, and cancel-navigation allowlist
        boolean textAllowed = isAutoTapCandidate(resolution.getMatchedText(), step.isAutoTapAllowed());
        boolean descAllowed = isAutoTapCandidate(resolution.getElementDescriptor(), step.isAutoTapAllowed());
        if (!textAllowed || !descAllowed) {
            return false;
        }

        // Loop guard check
        String pairKey = makePairKey(step.getStepId(), currentUrl);
        if (executedStepUrlPairs != null && executedStepUrlPairs.contains(pairKey)) {
            return false;
        }
        if (stalledStepIds != null && stalledStepIds.contains(step.getStepId())) {
            return false;
        }

        return true;
    }

    public boolean requestAutoAdvance(
            GuideStep step,
            TargetResolution resolution,
            String currentUrl
    ) {
        boolean popup = envSupplier != null && envSupplier.isPopupOpen();
        boolean paused = envSupplier != null && envSupplier.isGuidePaused();

        if (!isEligibleForAutoTap(
                step, resolution, currentUrl, securityPolicy, route,
                popup, paused, disabledForSession, sessionAutoTapCount,
                executedStepUrlPairs, stalledStepIds
        )) {
            return false;
        }

        if (isCountingDown) {
            cancelPendingAutoTap("superseded");
        }

        scheduledStepId = step.getStepId();
        scheduledUrl = currentUrl;
        scheduledStep = step;
        isCountingDown = true;

        if (uiDelegate != null) {
            uiDelegate.showAutoAdvanceCountdown(COUNTDOWN_DURATION_MS, () -> {
                disableForSession("user_opt_out");
            });
        }

        final String stepId = step.getStepId();
        final String tapUrl = currentUrl;
        final GuideStep tapStep = step;

        pendingCountdownRunnable = () -> {
            pendingCountdownRunnable = null;
            isCountingDown = false;
            executeAutoTap(stepId, tapUrl, tapStep);
        };
        handler.postDelayed(pendingCountdownRunnable, COUNTDOWN_DURATION_MS);
        return true;
    }

    private void executeAutoTap(String stepId, String scheduledUrl, GuideStep step) {
        if (disabledForSession || webView == null || step == null) {
            return;
        }

        String currentUrl = webView.getUrl();

        // RE-CHECK ALL CONDITIONS (Requirement 2):
        // 1. Same step id
        if (scheduledStepId == null || !scheduledStepId.equals(stepId)) return;
        // 2. Same URL as when scheduled
        if (scheduledUrl == null || !scheduledUrl.equals(currentUrl)) return;
        // 3. Guide not paused
        if (envSupplier != null && envSupplier.isGuidePaused()) return;
        // 4. No popup open
        if (envSupplier != null && envSupplier.isPopupOpen()) return;
        // 5. Not login URL
        if (route != null && route.isLoginUrl(currentUrl)) return;
        // 6. Host allowed by WebSecurityPolicy
        if (!securityPolicy.isAllowedForInjection(currentUrl)) return;
        // 7. Opt-out not set
        if (disabledForSession) return;
        // 8. Budget not exceeded
        if (sessionAutoTapCount >= MAX_SESSION_AUTO_TAPS) return;

        executedStepUrlPairs.add(makePairKey(stepId, currentUrl));
        sessionAutoTapCount++;

        String script = buildClickScript(step.getTarget(), step.isAutoTapAllowed());
        webView.evaluateJavascript(script, rawResult -> {
            String result = parseScriptResult(rawResult);
            if ("blocked".equalsIgnoreCase(result)) {
                // Convert step to manual with strong userMustTap-style highlight
                if (uiDelegate != null) {
                    uiDelegate.onAutoAdvanceBlocked(stepId, "js_keyword_or_modal_blocked");
                }
                return;
            }
            if ("clicked".equalsIgnoreCase(result)) {
                if (uiDelegate != null) {
                    uiDelegate.onAutoAdvanceComplete(stepId, sessionAutoTapCount);
                }
                scheduleStallCheck(stepId, currentUrl);
            } else {
                if (uiDelegate != null) {
                    uiDelegate.onAutoAdvanceFallbackToManual(stepId, "not_found");
                }
            }
        });
    }

    private String parseScriptResult(String raw) {
        if (raw == null || raw.equals("null") || raw.isEmpty()) return "not_found";
        String s = raw.trim();
        if (s.startsWith("\"") && s.endsWith("\"") && s.length() >= 2) {
            s = s.substring(1, s.length() - 1);
        }
        return s;
    }

    private void scheduleStallCheck(String stepId, String initialUrl) {
        if (pendingStallRunnable != null) {
            handler.removeCallbacks(pendingStallRunnable);
        }
        pendingStallRunnable = () -> {
            pendingStallRunnable = null;
            if (webView == null) return;
            String currentUrl = webView.getUrl();
            if (initialUrl != null && initialUrl.equals(currentUrl)) {
                stalledStepIds.add(stepId);
                if (uiDelegate != null) {
                    uiDelegate.onAutoAdvanceFallbackToManual(stepId, "stall_detected_no_navigation");
                }
            }
        };
        handler.postDelayed(pendingStallRunnable, STALL_DETECTION_TIMEOUT_MS);
    }

    public static String buildClickScript(GuideTargetSpec spec, boolean autoTapAllowed) {
        JSONObject target = new JSONObject();
        try {
            if (spec != null) {
                if (spec.getSelector() != null && !spec.getSelector().trim().isEmpty()) {
                    target.put("selector", spec.getSelector().trim());
                }
                if (spec.getElementId() != null && !spec.getElementId().trim().isEmpty()) {
                    target.put("id", spec.getElementId().trim());
                }
                if (spec.getClassName() != null && !spec.getClassName().trim().isEmpty()) {
                    target.put("className", spec.getClassName().trim());
                }
                if (spec.getText() != null && !spec.getText().trim().isEmpty()) {
                    target.put("text", spec.getText().trim());
                }
                if (spec.getAriaLabel() != null && !spec.getAriaLabel().trim().isEmpty()) {
                    target.put("ariaLabel", spec.getAriaLabel().trim());
                }
                if (spec.getRole() != null && !spec.getRole().trim().isEmpty()) {
                    target.put("role", spec.getRole().trim());
                }
                if (spec.getHrefContains() != null && !spec.getHrefContains().trim().isEmpty()) {
                    target.put("hrefContains", spec.getHrefContains().trim());
                }
                if (spec.getDataAttributeName() != null && !spec.getDataAttributeName().trim().isEmpty()) {
                    target.put("dataName", spec.getDataAttributeName().trim());
                }
                if (spec.getDataAttributeValue() != null && !spec.getDataAttributeValue().trim().isEmpty()) {
                    target.put("dataValue", spec.getDataAttributeValue().trim());
                }
                if (spec.getTextMatches() != null && !spec.getTextMatches().isEmpty()) {
                    JSONArray arr = new JSONArray();
                    for (String tm : spec.getTextMatches()) {
                        if (tm != null && !tm.trim().isEmpty()) arr.put(tm.trim());
                    }
                    if (arr.length() > 0) target.put("textMatches", arr);
                }
            }
        } catch (Exception ignored) {}

        String targetJsonLiteral = JSONObject.quote(target.toString());

        return "(function(){"
                + "try{"
                + "var spec=JSON.parse(" + targetJsonLiteral + ");"
                + "var autoTapAllowed=" + (autoTapAllowed ? "true" : "false") + ";"
                + "var norm=function(v){return (v||'').replace(/\\s+/g,' ').trim();};"
                + "var pool=[];var seen=[];"
                + "var push=function(el){if(!el||el.nodeType!==1)return;if(seen.indexOf(el)>=0)return;seen.push(el);pool.push(el);};"
                + "var addAll=function(list){for(var i=0;i<list.length;i++)push(list[i]);};"
                + "if(spec.selector){try{addAll(document.querySelectorAll(spec.selector));}catch(e){return 'not_found';}}"
                + "if(spec.id){var byId=document.getElementById(spec.id);if(byId)push(byId);}"
                + "if(spec.className){try{addAll(document.getElementsByClassName(spec.className));}catch(e){}}"
                + "var clickables=document.querySelectorAll('a,button,[role=button],[role=link],[onclick],[tabindex],input[type=button],input[type=submit]');"
                + "if(spec.text){for(var i=0;i<clickables.length;i++){if(norm(clickables[i].innerText||clickables[i].textContent)===norm(spec.text))push(clickables[i]);}}"
                + "var textMatchesList=(spec.textMatches&&Array.isArray(spec.textMatches))?spec.textMatches:[];"
                + "var hasTextMatch=function(t){if(!t)return false;var nl=norm(t).toLowerCase();for(var m=0;m<textMatchesList.length;m++){if(textMatchesList[m]&&nl.indexOf(norm(textMatchesList[m]).toLowerCase())>=0)return true;}return false;};"
                + "if(textMatchesList.length>0){for(var i=0;i<clickables.length;i++){if(hasTextMatch(clickables[i].innerText||clickables[i].textContent))push(clickables[i]);}}"
                + "if(spec.ariaLabel){var aria=document.querySelectorAll('[aria-label]');for(var i=0;i<aria.length;i++){if(norm(aria[i].getAttribute('aria-label'))===norm(spec.ariaLabel))push(aria[i]);}}"
                + "if(spec.role){var roles=document.querySelectorAll('[role]');for(var i=0;i<roles.length;i++){if(norm(roles[i].getAttribute('role'))===norm(spec.role))push(roles[i]);}}"
                + "if(spec.hrefContains){var links=document.querySelectorAll('a[href]');for(var i=0;i<links.length;i++){if((links[i].getAttribute('href')||'').indexOf(spec.hrefContains)>=0)push(links[i]);}}"
                + "if(spec.dataName&&/^data-[a-zA-Z0-9_-]+$/.test(spec.dataName)){var dataEls=document.querySelectorAll('['+spec.dataName+']');for(var i=0;i<dataEls.length;i++){if(!spec.dataValue||norm(dataEls[i].getAttribute(spec.dataName))===norm(spec.dataValue))push(dataEls[i]);}}"
                + "var matches=[];"
                + "for(var i=0;i<pool.length;i++){"
                + "var el=pool[i];"
                + "if(spec.selector){try{if(!el.matches(spec.selector))continue;}catch(e){continue;}}"
                + "if(spec.id&&el.id!==spec.id)continue;"
                + "if(spec.className&&!el.classList.contains(spec.className))continue;"
                + "if(spec.text&&norm(el.innerText||el.textContent)!==norm(spec.text))continue;"
                + "if(textMatchesList.length>0&&!hasTextMatch(el.innerText||el.textContent))continue;"
                + "if(spec.ariaLabel&&norm(el.getAttribute('aria-label'))!==norm(spec.ariaLabel))continue;"
                + "if(spec.role&&norm(el.getAttribute('role'))!==norm(spec.role))continue;"
                + "if(spec.hrefContains&&String(el.getAttribute('href')||'').indexOf(spec.hrefContains)<0)continue;"
                + "if(spec.dataName&&spec.dataValue&&norm(el.getAttribute(spec.dataName))!==norm(spec.dataValue))continue;"
                + "var r=el.getBoundingClientRect();var s=window.getComputedStyle(el);"
                + "if(!r||r.width<=0||r.height<=0||s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity||'1')===0)continue;"
                + "matches.push(el);"
                + "}"
                + "if(matches.length===0)return 'not_found';"
                + "var target=matches[0];"
                + "if(target.closest('[role=dialog],[role=alertdialog],[aria-modal=true],dialog'))return 'blocked';"
                + "var checkText=(norm(target.innerText||target.textContent)+' '+norm(target.getAttribute('aria-label'))+' '+norm(target.value)).toLowerCase();"
                + "var hardKeywords=['확정','완료','탈퇴','환불','결제 취소','결제취소','결제하기','결제 진행','결제 계속','지금 결제','바로 결제','구매하기','구매 진행','지금 구매','업그레이드','구독하기','다시 시작','재구독','플랜 변경','결제 수단 변경','카드 변경','pay now','buy now','purchase now','upgrade','subscribe now','resume subscription','restart subscription','start membership','finish','confirm','delete','complete'];"
                + "for(var h=0;h<hardKeywords.length;h++){if(checkText.indexOf(hardKeywords[h])>=0)return 'blocked';}"
                + "var softKeywords=['해지','취소','cancel','비활성화','deactivate'];"
                + "for(var sk=0;sk<softKeywords.length;sk++){if(checkText.indexOf(softKeywords[sk])>=0){if(!autoTapAllowed)return 'blocked';}}"
                + "var cancelNav=['해지','해지하기','구독 해지','멤버십 해지','구독 관리','멤버십 관리','정기결제 관리','결제 관리','계정','설정','구독','멤버십','요금제','플랜','cancel','manage','membership','subscription','billing','account','settings','plan'];"
                + "var navOk=false;"
                + "for(var nv=0;nv<cancelNav.length;nv++){if(checkText.indexOf(cancelNav[nv])>=0){navOk=true;break;}}"
                + "if(!navOk)return 'blocked';"
                + "target.click();"
                + "return 'clicked';"
                + "}catch(e){return 'not_found';}"
                + "})()";
    }

    public void destroy() {
        cancelPendingAutoTap("destroy");
        executedStepUrlPairs.clear();
        stalledStepIds.clear();
    }
}
