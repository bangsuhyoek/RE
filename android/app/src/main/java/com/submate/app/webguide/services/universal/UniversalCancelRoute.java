package com.submate.app.webguide.services.universal;

import android.net.Uri;
import android.webkit.WebView;

import com.submate.app.webguide.CancelGuideRoute;
import com.submate.app.webguide.RouteEvaluation;
import com.submate.app.webguide.WebSecurityPolicy;
import com.submate.app.webguide.state.PageState;
import com.submate.app.webguide.target.GuideInteractionType;
import com.submate.app.webguide.target.GuideStep;
import com.submate.app.webguide.target.GuideTargetSpec;
import com.submate.app.webguide.target.PointerPlacement;
import com.submate.app.webguide.target.TargetVerificationStatus;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 범용 선언적·시맨틱 해지 자동화 라우트 (Universal Cancel Route)
 * - 카탈로그의 모든 서비스 도메인에 대해 읽기 전용 시맨틱 DOM 분석을 수행하여
 *   1단계(구독/멤버십 관리 진입) -> 2단계(해지/비활성화 진입) -> 3단계(만류/설문 통과) -> 4단계(최종 해지 확인, userMustTap)
 *   흐름을 자동으로 탐색·진행한다.
 * - 최종 해지 확정 버튼(Stage 4 또는 모달 내 해지 확인)은 항상 userMustTap = true로 강제하여
 *   사용자가 직접 누르도록 보호한다.
 */
public final class UniversalCancelRoute implements CancelGuideRoute {
    private static final List<String> KNOWN_SERVICE_DOMAINS = Arrays.asList(
            "naver.com", "netflix.com", "youtube.com", "coupang.com", "tving.com",
            "wavve.com", "disneyplus.com", "watcha.com", "laftel.net", "spotvnow.co.kr",
            "melon.com", "genie.co.kr", "music-flo.com", "bugs.co.kr", "spotify.com",
            "apple.com", "tidal.com", "chatgpt.com", "openai.com", "claude.ai",
            "perplexity.ai", "cursor.com", "github.com", "notion.so", "figma.com",
            "canva.com", "adobe.com", "microsoft.com", "live.com", "dropbox.com",
            "google.com", "millie.co.kr", "ridibooks.com", "welaaa.com", "yes24.com",
            "kyobobook.co.kr", "baemin.com", "yogiyo.co.kr", "kurly.com", "ssg.com",
            "tworld.co.kr", "kt.com", "lguplus.com", "duolingo.com", "usespeak.com",
            "ringleplus.com", "cambly.com", "class101.net", "inflearn.com", "fastcampus.co.kr",
            "coursera.org", "xbox.com", "playstation.com", "nintendo.com", "ea.com",
            "nordaccount.com", "nordvpn.com", "1password.com", "grammarly.com", "deepl.com",
            "zoom.us", "slack.com", "strava.com", "burnfit.io", "payinfo.or.kr",
            "linkedin.com",
            "nytimes.com", "economist.com", "wsj.com", "ft.com", "joongang.co.kr",
            "longblack.co", "scribd.com", "everand.com", "storytel.com", "audible.com",
            "mubi.com", "crunchyroll.com", "dazn.com", "weverse.io", "dearu.com",
            "fromm.fan", "podbbang.com", "todoist.com", "evernote.com", "jetbrains.com",
            "webflow.com", "framer.com", "runwayml.com", "midjourney.com", "vercel.com"
    );

    private static final List<String> SSO_NAVIGATION_DOMAINS = Arrays.asList(
            "accounts.google.com", "kauth.kakao.com", "accounts.kakao.com",
            "appleid.apple.com", "login.microsoftonline.com", "auth.openai.com", "auth0.com"
    );

    private static final List<Pattern> LOGIN_URL_PATTERNS = Arrays.asList(
            Pattern.compile("^https?://accounts\\.google\\.com/.*", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^https?://(?:kauth|accounts)\\.kakao\\.com/.*", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^https?://appleid\\.apple\\.com/.*", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^https?://login\\.microsoftonline\\.com/.*", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^https?://[^/]+/(?:[a-z]{2}(?:-[a-z]{2})?/)?(?:login|signin|sign-in|nidlogin|auth/login|member/login)(?:[/?#].*)?$", Pattern.CASE_INSENSITIVE)
    );

    private static final List<Pattern> SUCCESS_URL_PATTERNS = Arrays.asList(
            Pattern.compile("^https?://[^/]+/.*(?:cancel[-_]?confirm|cancel[-_]?complete|cancellation[-_]?complete|unsubscribe[-_]?success|status=cancelled|status=canceled).*", Pattern.CASE_INSENSITIVE)
    );

    private static final List<String> SUCCESS_TEXT_MATCHES = Arrays.asList(
            "해지가 완료",
            "멤버십이 해지",
            "정기결제 해지 완료",
            "구독이 해지",
            "구독이 취소",
            "해지 신청이 완료",
            "해지 처리되었",
            "해지 예약",
            "자동결제가 해지",
            "Your membership has been cancelled",
            "Your subscription has been canceled",
            "Your subscription has been cancelled",
            "cancellation is complete",
            "Membership cancelled",
            "Subscription cancelled",
            "Subscription canceled"
    );

    private static final Pattern BRACKET_TOKEN_PATTERN = Pattern.compile("\\[([^\\]\\r\\n]{2,30})\\]");

    private final String serviceId;
    private final String serviceName;
    private final WebSecurityPolicy securityPolicy;
    private final List<String> customStepHints;
    private final int totalSteps;
    private final FlowState flowState = new FlowState();
    private final AiNextStepClient aiClient;

    private static final List<String> STAGE_4_WORDS = Arrays.asList(
            "해지 완료", "해지 확정", "최종 해지", "멤버십 해지 완료", "정기결제 해지 완료",
            "구독 해지 완료", "해지 신청 완료", "해지할게요", "혜택 포기하고 해지", "즉시 해지",
            "해지 예약", "해지예약", "구독 해지 예약", "중도해지", "중도 해지",
            "멤버십 종료", "내 멤버십 종료",
            "반복 청구 끄기", "갱신 정지", "취소 확인", "해지 확인", "구독 취소 확인",
            "정기 구독 취소 확인", "플랜 취소 확정", "구독 취소 완료", "disney+ 취소 완료",
            "finish cancellation", "confirm cancellation", "complete cancellation", "yes, cancel",
            "end membership", "finish canceling", "downgrade to starter"
    );

    private static final List<String> TERMINAL_WORDS = Arrays.asList(
            "해지", "취소", "종료", "탈퇴", "해제", "포기", "예약",
            "cancel", "end", "terminate", "downgrade", "unsubscribe"
    );

    // 결제·구매·업그레이드·구독 시작/재개는 해지 흐름에서 절대 자동 탭하지 않는다.
    // "결제 관리", "자동결제 해지" 같은 정상 해지 이동을 막지 않도록 동작 표현만 넣는다.
    private static final List<String> PAYMENT_ACTION_WORDS = Arrays.asList(
            "결제하기", "결제 진행", "결제 계속", "지금 결제", "바로 결제",
            "구매하기", "구매 진행", "지금 구매", "업그레이드", "구독하기", "다시 시작",
            "재구독", "플랜 변경", "결제 수단 변경", "카드 변경",
            "pay now", "buy now", "purchase now", "upgrade", "subscribe now",
            "resume subscription", "restart subscription", "start membership"
    );

    public static final class FlowState {
        public static final int MAX_AI_CALLS_PER_FLOW = 8;
        private int aiCallCount = 0;
        private boolean aiInFlight = false;
        private EvaluationCallback pendingAiCallback = null;
        private final Map<String, RouteEvaluation> aiEvaluationCache = new HashMap<>();
        private final List<String> pressedHistory = new ArrayList<>();

        public synchronized int getAiCallCount() { return aiCallCount; }
        public synchronized boolean isAiInFlight() { return aiInFlight; }
        public synchronized void setAiInFlight(boolean inFlight) { this.aiInFlight = inFlight; }
        public synchronized boolean canMakeAiCall() { return aiCallCount < MAX_AI_CALLS_PER_FLOW && !aiInFlight; }
        public synchronized boolean hasAiBudget() { return aiCallCount < MAX_AI_CALLS_PER_FLOW; }
        public synchronized void setPendingAiCallback(EvaluationCallback cb) { this.pendingAiCallback = cb; }
        public synchronized EvaluationCallback consumePendingAiCallback() {
            EvaluationCallback cb = this.pendingAiCallback;
            this.pendingAiCallback = null;
            return cb;
        }
        public synchronized void incrementAiCallCount() { aiCallCount++; }
        public synchronized RouteEvaluation getCachedEvaluation(String cacheKey) { return aiEvaluationCache.get(cacheKey); }
        public synchronized void putCachedEvaluation(String cacheKey, RouteEvaluation eval) { aiEvaluationCache.put(cacheKey, eval); }
        public synchronized List<String> getPressedHistory() { return new ArrayList<>(pressedHistory); }
        public synchronized void recordPressedHistory(String text) {
            if (text == null || text.trim().isEmpty()) return;
            String clean = text.trim();
            if (!pressedHistory.isEmpty() && pressedHistory.get(pressedHistory.size() - 1).equals(clean)) return;
            pressedHistory.add(clean);
            if (pressedHistory.size() > 10) {
                pressedHistory.remove(0);
            }
        }
        public String firstCancelEntryKey;

        public FlowState() {}

        public FlowState(String firstCancelEntryKey) {
            this.firstCancelEntryKey = firstCancelEntryKey;
        }

        public void reset() {
            this.firstCancelEntryKey = null;
        }
    }

    public static final class GuardResult {
        public final boolean userMustTap;
        public final boolean autoTapAllowed;
        public final int stepNumber;
        public final PageState pageState;
        public final boolean treatedAsFinal;

        public GuardResult(boolean userMustTap, boolean autoTapAllowed, int stepNumber, PageState pageState, boolean treatedAsFinal) {
            this.userMustTap = userMustTap;
            this.autoTapAllowed = autoTapAllowed;
            this.stepNumber = stepNumber;
            this.pageState = pageState;
            this.treatedAsFinal = treatedAsFinal;
        }
    }

    public FlowState getFlowState() {
        return flowState;
    }

    public UniversalCancelRoute(String serviceId, String serviceName, String cancelUrl, String guideStepsJson) {
        this(serviceId, serviceName, cancelUrl, guideStepsJson, null, null);
    }

    public UniversalCancelRoute(String serviceId, String serviceName, String cancelUrl, String guideStepsJson, String aiEndpoint, String aiAuthToken) {
        this.serviceId = serviceId == null || serviceId.trim().isEmpty() ? "universal" : serviceId.trim().toLowerCase(Locale.ROOT);
        this.serviceName = serviceName == null ? "" : serviceName.trim();

        Set<String> allowed = new LinkedHashSet<>(KNOWN_SERVICE_DOMAINS);
        String dynamicDomain = extractRegistrableDomain(cancelUrl);
        if (!dynamicDomain.isEmpty()) {
            allowed.add(dynamicDomain);
        }
        String fullHost = WebSecurityPolicy.normalizeHost(cancelUrl);
        if (!fullHost.isEmpty()) {
            allowed.add(fullHost);
        }
        this.securityPolicy = new WebSecurityPolicy(new ArrayList<>(allowed), SSO_NAVIGATION_DOMAINS);
        this.customStepHints = extractHintsFromStepsJson(guideStepsJson);
        this.totalSteps = Math.max(3, Math.min(6, customStepHints.isEmpty() ? 4 : customStepHints.size()));
        this.aiClient = new AiNextStepClient(aiEndpoint, aiAuthToken);
    }

    public static String extractRegistrableDomain(String url) {
        String host = WebSecurityPolicy.normalizeHost(url);
        if (host.isEmpty()) return "";
        String[] parts = host.split("\\.");
        if (parts.length <= 2) return host;
        String lastTwo = parts[parts.length - 2] + "." + parts[parts.length - 1];
        if ("co.kr".equals(lastTwo) || "or.kr".equals(lastTwo) || "ne.kr".equals(lastTwo)
                || "ac.kr".equals(lastTwo) || "co.jp".equals(lastTwo) || "co.uk".equals(lastTwo)) {
            if (parts.length >= 3) {
                return parts[parts.length - 3] + "." + lastTwo;
            }
        }
        return lastTwo;
    }

    public static List<String> extractHintsFromStepsJson(String guideStepsJson) {
        if (guideStepsJson == null || guideStepsJson.trim().isEmpty()) {
            return Collections.emptyList();
        }
        Set<String> hints = new LinkedHashSet<>();
        Matcher m = BRACKET_TOKEN_PATTERN.matcher(guideStepsJson);
        while (m.find()) {
            String token = m.group(1) != null ? m.group(1).trim() : "";
            if (token.length() >= 2 && !token.contains("\"") && !token.contains("{") && !"로그인".equals(token)) {
                hints.add(token);
            }
        }
        return new ArrayList<>(hints);
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
        return totalSteps;
    }

    @Override
    public int getStepNumber(String stepId) {
        if (stepId == null) return 1;
        if (stepId.contains("STAGE_1")) return 1;
        if (stepId.contains("STAGE_2")) return 2;
        if (stepId.contains("STAGE_3")) return Math.max(2, totalSteps - 1);
        if (stepId.contains("STAGE_4") || stepId.contains("FINAL")) return totalSteps;
        return 1;
    }

    @Override
    public boolean isGracefulFallbackOnTargetNotFound() {
        return true;
    }

    @Override
    public List<Pattern> getSuccessUrlPatterns() {
        return SUCCESS_URL_PATTERNS;
    }

    @Override
    public List<String> getSuccessTextMatches() {
        return SUCCESS_TEXT_MATCHES;
    }

    @Override
    public boolean isLoginUrl(String url) {
        if (url == null || url.trim().isEmpty()) return false;
        for (Pattern pat : LOGIN_URL_PATTERNS) {
            if (pat.matcher(url).find()) return true;
        }
        return false;
    }

    public List<String> getCustomStepHints() {
        return Collections.unmodifiableList(customStepHints);
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
        evaluateDom(webView, currentUrl, securityPolicy, customStepHints, totalSteps, flowState, serviceName, aiClient, callback);
    }

    public static void evaluateDom(
            WebView webView,
            String currentUrl,
            WebSecurityPolicy policy,
            List<String> stepHints,
            int totalSteps,
            EvaluationCallback callback
    ) {
        evaluateDom(webView, currentUrl, policy, stepHints, totalSteps, new FlowState(), callback);
    }

    public static void evaluateDom(
            WebView webView,
            String currentUrl,
            WebSecurityPolicy policy,
            List<String> stepHints,
            int totalSteps,
            FlowState flowState,
            EvaluationCallback callback
    ) {
        evaluateDom(webView, currentUrl, policy, stepHints, totalSteps, flowState, "", null, callback);
    }

    public static void evaluateDom(
            WebView webView,
            String currentUrl,
            WebSecurityPolicy policy,
            List<String> stepHints,
            int totalSteps,
            FlowState flowState,
            String serviceName,
            AiNextStepClient aiClient,
            EvaluationCallback callback
    ) {
        if (callback == null) return;
        if (webView == null || policy == null || !policy.isAllowedForInjection(currentUrl)) {
            callback.onEvaluated(RouteEvaluation.hidden("화면의 안내에 따라 해지 메뉴를 선택해 주세요."));
            return;
        }

        JSONArray hintsJson = new JSONArray();
        if (stepHints != null) {
            for (String h : stepHints) {
                if (h != null && !h.trim().isEmpty()) hintsJson.put(h.trim());
            }
        }

        String script = buildSemanticScanScript(hintsJson.toString());
        webView.evaluateJavascript(script, rawValue -> {
            try {
                String jsonStr = unwrapJsString(rawValue);
                if (jsonStr == null || jsonStr.isEmpty() || "null".equals(jsonStr)) {
                    callback.onEvaluated(RouteEvaluation.hidden("화면에서 멤버십/구독 관리 메뉴를 찾고 있어요."));
                    return;
                }
                JSONObject obj = new JSONObject(jsonStr);
                String state = obj.optString("state", "NONE");
                if ("LOGIN".equals(state)) {
                    callback.onEvaluated(RouteEvaluation.paused(
                            "로그인",
                            "로그인이 끝나면 이어서 안내할게요",
                            true,
                            false
                    ));
                    return;
                }
                if ("BLOCKED".equals(state)) {
                    callback.onEvaluated(RouteEvaluation.hidden(
                            "보안 확인이나 접근 제한 화면이에요. 오른쪽 위 [🌐 브라우저]를 눌러 평소 쓰는 브라우저에서 이어서 해지해 주세요."
                    ));
                    return;
                }
                if (!"FOUND".equals(state)) {
                    if (aiClient != null && aiClient.isEnabled() && flowState != null) {
                        if (flowState.isAiInFlight()) {
                            flowState.setPendingAiCallback(callback);
                            callback.onEvaluated(RouteEvaluation.waiting("다음 버튼을 찾고 있어요."));
                            return;
                        }
                        String pageSig = obj.optString("pageSig", "").trim();
                        if (flowState.hasAiBudget() || !flowState.aiEvaluationCache.isEmpty()) {
                            executeAiNextStepFlow(webView, currentUrl, serviceName, aiClient, flowState, pageSig, totalSteps, callback);
                            return;
                        }
                    }
                    callback.onEvaluated(RouteEvaluation.hidden("화면에서 해지 관련 버튼을 찾지 못했어요. 아래 단계별 가이드를 참고해 주세요."));
                    return;
                }

                int stage = obj.optInt("stage", 2);
                String matchedText = obj.optString("matchedText", "").trim();
                String selector = obj.optString("selector", "a,button,[role=button],[role=link],input[type=button],input[type=submit]").trim();
                String pageSig = obj.optString("pageSig", "").trim();
                boolean rawUserMustTap = obj.optBoolean("userMustTap", stage >= 4);

                GuardResult guard = applyCancelEntryGuard(flowState, stage, currentUrl, matchedText, pageSig, totalSteps);
                boolean userMustTap = rawUserMustTap || guard.userMustTap;
                boolean autoTapAllowed = !userMustTap && guard.autoTapAllowed;

                int stepNum = guard.stepNumber;
                String stepId = "UNIVERSAL_STAGE_" + (guard.treatedAsFinal ? "FINAL" : stage) + "_" + Math.abs(matchedText.hashCode() % 10000);
                String badge = stepNum + "/" + Math.max(stepNum, totalSteps) + "단계";
                String instruction = guard.treatedAsFinal
                        ? "마지막 해지 버튼은 직접 눌러 주세요"
                        : (userMustTap
                                ? "[" + matchedText + "] 버튼을 직접 눌러 주세요."
                                : "[" + matchedText + "] 버튼을 눌러 진행해요.");
                PageState logicalState = guard.pageState;

                GuideTargetSpec spec = new GuideTargetSpec(
                        selector,
                        Collections.singletonList(matchedText)
                );
                GuideStep step = new GuideStep(
                        stepId,
                        logicalState,
                        instruction,
                        spec,
                        GuideInteractionType.TAP,
                        PointerPlacement.AUTO,
                        12,
                        "",
                        TargetVerificationStatus.LIVE_VERIFIED,
                        userMustTap,
                        autoTapAllowed
                );
                callback.onEvaluated(RouteEvaluation.talking(step, badge, instruction, userMustTap));
            } catch (Exception e) {
                callback.onEvaluated(RouteEvaluation.hidden("화면의 안내에 따라 해지 메뉴를 선택해 주세요."));
            }
        });
    }

    public static GuardResult applyCancelEntryGuard(FlowState state, int stage, String url, String matchedText) {
        return applyCancelEntryGuard(state, stage, url, matchedText, "", 4);
    }

    public static GuardResult applyCancelEntryGuard(FlowState state, int stage, String url, String matchedText, String pageSig) {
        return applyCancelEntryGuard(state, stage, url, matchedText, pageSig, 4);
    }

    public static GuardResult applyCancelEntryGuard(FlowState state, int stage, String url, String matchedText, int totalSteps) {
        return applyCancelEntryGuard(state, stage, url, matchedText, "", totalSteps);
    }

    public static GuardResult applyCancelEntryGuard(FlowState state, int stage, String url, String matchedText, String pageSig, int totalSteps) {
        int safeTotalSteps = totalSteps > 0 ? totalSteps : 4;
        String normText = normalizeText(matchedText);
        String lowerText = normText.toLowerCase(Locale.ROOT);

        // 돈이 나가는 동작은 해지 흐름의 어느 단계에서도 자동 탭 후보로 만들지 않는다.
        for (String w : PAYMENT_ACTION_WORDS) {
            if (lowerText.contains(w)) {
                return new GuardResult(true, false, Math.max(1, Math.min(stage, safeTotalSteps)), PageState.CANCELLATION_ENTRY, false);
            }
        }

        for (String w : STAGE_4_WORDS) {
            if (lowerText.contains(w.toLowerCase(Locale.ROOT))) {
                return new GuardResult(true, false, safeTotalSteps, PageState.FINAL_CANCEL_CONFIRM, true);
            }
        }

        if (stage == 3) {
            if (lowerText.contains("예약") || lowerText.contains("종료") || lowerText.contains("완료") || lowerText.contains("확정")) {
                return new GuardResult(true, false, safeTotalSteps, PageState.FINAL_CANCEL_CONFIRM, true);
            }
            if (lowerText.contains("포기")) {
                int stepNum = Math.max(2, safeTotalSteps - 1);
                return new GuardResult(true, false, stepNum, PageState.CANCELLATION_ENTRY, false);
            }
            int stepNum = Math.max(2, safeTotalSteps - 1);
            return new GuardResult(false, true, stepNum, PageState.CANCELLATION_ENTRY, false);
        }

        if (stage == 4) {
            return new GuardResult(true, false, safeTotalSteps, PageState.FINAL_CANCEL_CONFIRM, true);
        }

        int effectiveStage = stage;
        if (stage == 1) {
            boolean hasTerminal = false;
            for (String tw : TERMINAL_WORDS) {
                if (lowerText.contains(tw)) {
                    hasTerminal = true;
                    break;
                }
            }
            if (hasTerminal) {
                effectiveStage = 2;
            } else {
                return new GuardResult(false, true, 1, PageState.CANCELLATION_ENTRY, false);
            }
        }

        if (effectiveStage == 2) {
            String safePageSig = pageSig == null ? "" : pageSig.trim();
            String key = extractHostAndPath(url) + "|" + safePageSig + "|" + normText;
            if (state == null) {
                return new GuardResult(true, false, 2, PageState.CANCELLATION_ENTRY, false);
            }
            if (state.firstCancelEntryKey == null) {
                state.firstCancelEntryKey = key;
                return new GuardResult(true, false, 2, PageState.CANCELLATION_ENTRY, false);
            }
            if (key.equals(state.firstCancelEntryKey)) {
                return new GuardResult(true, false, 2, PageState.CANCELLATION_ENTRY, false);
            }
            return new GuardResult(true, false, safeTotalSteps, PageState.FINAL_CANCEL_CONFIRM, true);
        }

        return new GuardResult(false, true, 1, PageState.CANCELLATION_ENTRY, false);
    }

    public static String extractHostAndPath(String url) {
        if (url == null || url.trim().isEmpty()) return "";
        String clean = url.trim();
        int q = clean.indexOf('?');
        if (q >= 0) clean = clean.substring(0, q);
        int h = clean.indexOf('#');
        if (h >= 0) clean = clean.substring(0, h);
        try {
            Uri uri = Uri.parse(clean);
            String host = uri.getHost();
            String path = uri.getPath();
            if (host != null && !host.isEmpty()) {
                return host.toLowerCase(Locale.ROOT) + (path != null ? path : "");
            }
            if (path != null && !path.isEmpty()) {
                return path;
            }
        } catch (Exception ignored) {}
        clean = clean.replaceFirst("^[a-zA-Z]+://", "");
        return clean.toLowerCase(Locale.ROOT);
    }

    public static String normalizeText(String text) {
        if (text == null) return "";
        return text.replaceAll("\s+", " ").trim();
    }

    private static void executeAiNextStepFlow(
            WebView webView,
            String currentUrl,
            String serviceName,
            AiNextStepClient aiClient,
            FlowState flowState,
            String pageSig,
            int totalSteps,
            EvaluationCallback callback
    ) {
        flowState.setAiInFlight(true);
        flowState.setPendingAiCallback(callback);
        callback.onEvaluated(RouteEvaluation.waiting("다음 버튼을 찾고 있어요."));

        String collectScript = buildElementCollectionScript();
        webView.evaluateJavascript(collectScript, rawValue -> {
            try {
                String jsonStr = unwrapJsString(rawValue);
                if (jsonStr == null || jsonStr.trim().isEmpty() || "null".equals(jsonStr)) {
                    flowState.setAiInFlight(false);
                    EvaluationCallback cb = flowState.consumePendingAiCallback();
                    if (cb == null) cb = callback;
                    cb.onEvaluated(RouteEvaluation.hidden("화면에서 해지 관련 버튼을 찾지 못했어요. 아래 단계별 가이드를 참고해 주세요."));
                    return;
                }
                JSONObject colObj = new JSONObject(jsonStr);
                String pageTitle = colObj.optString("pageTitle", "");
                String host = colObj.optString("host", "");
                JSONArray elemArr = colObj.optJSONArray("elements");
                List<AiNextStepClient.ElementDto> elements = new ArrayList<>();
                if (elemArr != null) {
                    for (int i = 0; i < elemArr.length(); i++) {
                        JSONObject eo = elemArr.getJSONObject(i);
                        int idx = eo.optInt("i", i);
                        String rawText = eo.optString("text", "");
                        String text = scrubSensitiveText(rawText);
                        String role = eo.optString("role", "");
                        String tag = eo.optString("tag", "");
                        boolean inDialog = eo.optBoolean("inDialog", false);
                        elements.add(new AiNextStepClient.ElementDto(idx, text, rawText, role, tag, inDialog));
                    }
                }

                if (elements.isEmpty()) {
                    flowState.setAiInFlight(false);
                    EvaluationCallback cb = flowState.consumePendingAiCallback();
                    if (cb == null) cb = callback;
                    cb.onEvaluated(RouteEvaluation.hidden("화면에서 해지 관련 버튼을 찾지 못했어요. 아래 단계별 가이드를 참고해 주세요."));
                    return;
                }

                String hostAndPath = extractHostAndPath(currentUrl);
                String cacheKey = hostAndPath + "@" + pageSig + "@" + elements.size();

                RouteEvaluation cached = flowState.getCachedEvaluation(cacheKey);
                if (cached != null) {
                    flowState.setAiInFlight(false);
                    EvaluationCallback cb = flowState.consumePendingAiCallback();
                    if (cb == null) cb = callback;
                    cb.onEvaluated(cached);
                    return;
                }

                if (!flowState.hasAiBudget()) {
                    flowState.setAiInFlight(false);
                    EvaluationCallback cb = flowState.consumePendingAiCallback();
                    if (cb == null) cb = callback;
                    cb.onEvaluated(RouteEvaluation.hidden("화면에서 해지 관련 버튼을 찾지 못했어요. 아래 단계별 가이드를 참고해 주세요."));
                    return;
                }

                flowState.incrementAiCallCount();

                List<String> history = flowState.getPressedHistory();
                String scrubbedTitle = scrubSensitiveText(pageTitle);

                AiNextStepClient.RequestDto req = new AiNextStepClient.RequestDto(
                        serviceName,
                        host,
                        scrubbedTitle,
                        history,
                        elements
                );

                aiClient.requestNextStep(req, aiResp -> {
                    flowState.setAiInFlight(false);
                    EvaluationCallback cb = flowState.consumePendingAiCallback();
                    if (cb == null) cb = callback;
                    RouteEvaluation eval = mapAiResponseToEvaluation(aiResp, elements, flowState, currentUrl, pageSig, totalSteps);
                    flowState.putCachedEvaluation(cacheKey, eval);
                    cb.onEvaluated(eval);
                });
            } catch (Exception e) {
                flowState.setAiInFlight(false);
                EvaluationCallback cb = flowState.consumePendingAiCallback();
                if (cb == null) cb = callback;
                cb.onEvaluated(RouteEvaluation.hidden("화면에서 해지 관련 버튼을 찾지 못했어요. 아래 단계별 가이드를 참고해 주세요."));
            }
        });
    }

    public static String buildElementCollectionScript() {
        return "(function(){"
                + "try{"
                + "var norm=function(v){return (v||'').replace(/\\s+/g,' ').trim();};"
                + "var title=norm(document.title).slice(0,80);"
                + "var host=(location&&location.hostname)?location.hostname:'';"
                + "var vw=window.innerWidth||document.documentElement.clientWidth||0;"
                + "var vh=window.innerHeight||document.documentElement.clientHeight||0;"
                + "var sel=\"a,button,[role='button'],[role='link'],input[type='button'],input[type='submit'],[role='menuitem'],[role='tab']\";"
                + "var nodes=document.querySelectorAll(sel);"
                + "var inView=[];var outView=[];"
                + "for(var i=0;i<nodes.length;i++){"
                + "var el=nodes[i];"
                + "var r=el.getBoundingClientRect();var s=window.getComputedStyle(el);"
                + "if(!r||r.width<10||r.height<10||s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity||'1')===0)continue;"
                + "if(el.disabled||el.getAttribute('aria-disabled')==='true')continue;"
                + "var text=norm(el.innerText||el.value||el.getAttribute('aria-label')||el.textContent||'').slice(0,60);"
                + "if(!text)continue;"
                + "var role=el.getAttribute('role')||'';"
                + "var tag=el.tagName?el.tagName.toLowerCase():'';"
                + "var inDialog=!!el.closest(\"[role='dialog'],[role='alertdialog'],[aria-modal='true'],dialog,[class*='modal'],[class*='dialog'],[class*='popup'],[class*='layer']\");"
                + "var visible=(r.right>0&&r.bottom>0&&r.left<vw&&r.top<vh);"
                + "var item={el:el,text:text,role:role,tag:tag,inDialog:inDialog};"
                + "if(visible)inView.push(item);else outView.push(item);"
                + "}"
                + "var combined=inView.concat(outView).slice(0,60);"
                + "var elements=[];"
                + "for(var j=0;j<combined.length;j++){"
                + "var it=combined[j];"
                + "it.el.setAttribute('data-kkudok-ai-idx',String(j));"
                + "elements.push({i:j,text:it.text,role:it.role,tag:it.tag,inDialog:it.inDialog});"
                + "}"
                + "return JSON.stringify({pageTitle:title,host:host,elements:elements});"
                + "}catch(e){return JSON.stringify({pageTitle:'',host:'',elements:[]});}"
                + "})()";
    }

    public static String scrubSensitiveText(String text) {
        if (text == null || text.isEmpty()) return "";
        String scrubbed = text.replaceAll("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", "[EMAIL]");
        scrubbed = scrubbed.replaceAll("([가-힣]{1,4})님", "OOO님");
        scrubbed = scrubbed.replaceAll("\\d{4,}", "****");
        return scrubbed;
    }

    public static RouteEvaluation mapAiResponseToEvaluation(
            AiNextStepClient.AiResponse aiResp,
            List<AiNextStepClient.ElementDto> elements,
            FlowState flowState,
            String currentUrl,
            String pageSig,
            int totalSteps
    ) {
        if (aiResp == null) {
            return RouteEvaluation.hidden("화면에서 해지 관련 버튼을 찾지 못했어요. 아래 단계별 가이드를 참고해 주세요.");
        }
        String kind = aiResp.kind != null ? aiResp.kind.trim() : "none";
        if ("login".equalsIgnoreCase(kind)) {
            return RouteEvaluation.paused(
                    "로그인",
                    "로그인이 끝나면 이어서 안내할게요",
                    true,
                    false
            );
        }
        if ("none".equalsIgnoreCase(kind) || aiResp.index == null) {
            return RouteEvaluation.hidden("화면에서 해지 관련 버튼을 찾지 못했어요. 아래 단계별 가이드를 참고해 주세요.");
        }

        AiNextStepClient.ElementDto chosen = null;
        if (elements != null) {
            for (AiNextStepClient.ElementDto el : elements) {
                if (el != null && el.i == aiResp.index.intValue()) {
                    chosen = el;
                    break;
                }
            }
        }
        if (chosen == null) {
            return RouteEvaluation.hidden("화면에서 해지 관련 버튼을 찾지 못했어요. 아래 단계별 가이드를 참고해 주세요.");
        }

        int stage;
        if ("nav".equalsIgnoreCase(kind)) {
            stage = 1;
        } else if ("cancel".equalsIgnoreCase(kind)) {
            stage = 2;
        } else if ("retention_continue".equalsIgnoreCase(kind)) {
            stage = 3;
        } else if ("final".equalsIgnoreCase(kind)) {
            stage = 4;
        } else {
            return RouteEvaluation.hidden("화면에서 해지 관련 버튼을 찾지 못했어요. 아래 단계별 가이드를 참고해 주세요.");
        }

        String matchedText = (chosen.rawText != null && !chosen.rawText.trim().isEmpty())
                ? chosen.rawText.trim()
                : (chosen.text != null ? chosen.text.trim() : "");
        GuardResult guard = applyCancelEntryGuard(flowState, stage, currentUrl, matchedText, pageSig, totalSteps);

        boolean userMustTap = guard.userMustTap;
        boolean autoTapAllowed = !userMustTap && guard.autoTapAllowed;

        if ("nav".equalsIgnoreCase(kind)) {
            if (aiResp.confidence < 0.6) {
                userMustTap = true;
                autoTapAllowed = false;
            }
        }

        int stepNum = guard.stepNumber;
        String stepId = "UNIVERSAL_STAGE_" + (guard.treatedAsFinal ? "FINAL" : stage) + "_" + Math.abs(matchedText.hashCode() % 10000);
        String badge = stepNum + "/" + Math.max(stepNum, totalSteps) + "단계";
        String instruction = guard.treatedAsFinal
                ? "마지막 해지 버튼은 직접 눌러 주세요"
                : (userMustTap
                        ? "[" + matchedText + "] 버튼을 직접 눌러 주세요."
                        : "[" + matchedText + "] 버튼을 눌러 진행해요.");
        PageState logicalState = guard.pageState;

        String selector = "[data-kkudok-ai-idx=\"" + chosen.i + "\"]";
        GuideTargetSpec spec = new GuideTargetSpec(
                selector,
                Collections.singletonList(matchedText)
        );
        GuideStep step = new GuideStep(
                stepId,
                logicalState,
                instruction,
                spec,
                GuideInteractionType.TAP,
                PointerPlacement.AUTO,
                12,
                "",
                TargetVerificationStatus.LIVE_VERIFIED,
                userMustTap,
                autoTapAllowed
        );

        if (flowState != null) {
            flowState.recordPressedHistory(scrubSensitiveText(matchedText));
        }

        return RouteEvaluation.talking(step, badge, instruction, userMustTap);
    }


    private static String unwrapJsString(String rawValue) throws Exception {
        if (rawValue == null || "null".equals(rawValue)) return null;
        if (rawValue.startsWith("\"") && rawValue.endsWith("\"")) {
            Object val = new JSONTokener(rawValue).nextValue();
            return val == null ? null : val.toString();
        }
        return rawValue;
    }

    public static String buildSemanticScanScript(String hintsArrayJson) {
        String safeHints = (hintsArrayJson == null || hintsArrayJson.trim().isEmpty()) ? "[]" : hintsArrayJson;
        return "(function(){"
                + "try{"
                + "var norm=function(v){return (v||'').replace(/\\s+/g,' ').trim();};"
                + "var pwInputs=document.querySelectorAll('input[type=\"password\"]');"
                + "for(var p=0;p<pwInputs.length;p++){var pr=pwInputs[p].getBoundingClientRect();var ps=window.getComputedStyle(pwInputs[p]);if(pr&&pr.width>10&&pr.height>10&&ps.display!=='none'&&ps.visibility!=='hidden'){return JSON.stringify({state:'LOGIN'});}}"
                + "var cfEl=document.querySelector('#challenge-running,#challenge-form,#cf-wrapper,.cf-error-details,iframe[src*=\"challenges.cloudflare.com\"]');"
                + "var ttl=norm(document.title||'').toLowerCase();"
                + "var btxt=norm(document.body?(document.body.innerText||''):'').slice(0,500).toLowerCase();"
                + "if(cfEl||ttl.indexOf('just a moment')>=0||ttl.indexOf('attention required')>=0||btxt.indexOf('verify you are human')>=0||btxt.indexOf('403 forbidden')>=0||btxt.indexOf('disallowed_useragent')>=0){return JSON.stringify({state:'BLOCKED'});}"
                + "var hints=" + safeHints + ";"
                + "var rejectWords=['혜택 유지','계속 이용','멤버십 유지','구독 유지','유지하기','일시중지하기','해지 안 함','취소 안 함','돌아가기','창 닫기','keep membership','keep subscription','stay','never mind'];"
                + "var stage4Words=['해지 완료','해지 확정','최종 해지','멤버십 해지 완료','정기결제 해지 완료','구독 해지 완료','해지 신청 완료','해지할게요','혜택 포기하고 해지','즉시 해지','해지 예약','해지예약','구독 해지 예약','중도해지','중도 해지','멤버십 종료','내 멤버십 종료','반복 청구 끄기','갱신 정지','취소 확인','해지 확인','구독 취소 확인','정기 구독 취소 확인','플랜 취소 확정','구독 취소 완료','disney+ 취소 완료','end membership','finish canceling','finish cancellation','confirm cancellation','complete cancellation','yes, cancel','downgrade to starter'];"
                + "var stage3Words=['계속 해지','해지 계속','해지 계속하기','취소하려면 계속','취소 계속 진행','취소 계속하기','그대로 취소','그대로 해지','혜택 포기','할인 안 받고','일시중지 안 함','다음 단계','다음으로','continue to cancel','continue canceling','proceed to cancel','cancel anyway','no thanks, cancel','downgrade to free','continue to downgrade'];"
                + "var stage2Words=['네이버플러스 멤버십 해지하기','멤버십 해지하기','구독 해지하기','지금 바로 해지하기','정기결제 해지하기','정기결제 해지','정기 결제 취소','자동결제 해지','자동결제 관리/해지','멤버십 해지','멤버십 취소','구독 해지','구독 취소','이용권 해지','내 플랜 취소','구독을 해지하고 싶어요','해지 신청하기','해지 신청','해지신청','해지하기','변경/해지','비활성화','자동 갱신 끄기','cancel your subscription','cancel membership','cancel subscription','cancel plan','cancel auto-renewal','manage plan cancellation','deactivate','turn off auto-renew'];"
                + "var stage1Words=['네이버플러스 멤버십 관리','멤버십 관리','구독 관리','이용권 관리','이용권/캐시 내역','이용권 / 결제 관리','이용권/결제 관리','수강권/결제 관리','이모티콘 플러스 관리','컬리멤버스 관리','정기결제 관리','결제 및 정기 결제','구독 및 결제','구매 항목 및 멤버십','내 멤버십','마이 멤버십','나의 이용권','구독 플랜','플랜 관리','요금제 관리','구독 정보','결제 내역','마이페이지','내 계정','내 정보','내 강의실','설정','manage membership','manage subscription','manage plan','manage account','subscription overview','membership plan','plans & billing','payment & billing','account settings','account details','my account','your account','my purchases','subscription','billing','settings'];"
                + "var nodes=document.querySelectorAll('a,button,[role=\"button\"],[role=\"link\"],input[type=\"button\"],input[type=\"submit\"]');"
                + "var best=null;"
                + "for(var i=0;i<nodes.length;i++){"
                + "var el=nodes[i];"
                + "var r=el.getBoundingClientRect();var s=window.getComputedStyle(el);"
                + "if(!r||r.width<16||r.height<14||s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity||'1')===0)continue;"
                + "if(el.disabled||el.getAttribute('aria-disabled')==='true')continue;"
                + "var rawText=norm(el.innerText||el.textContent||el.value||el.getAttribute('aria-label')||'');"
                + "if(!rawText||rawText.length>45)continue;"
                + "var lower=rawText.toLowerCase();"
                + "var rejected=false;for(var rj=0;rj<rejectWords.length;rj++){if(lower.indexOf(rejectWords[rj])>=0){rejected=true;break;}}if(rejected)continue;"
                + "var inDialog=!!el.closest(\"[role='dialog'],[role='alertdialog'],[aria-modal='true'],dialog,[class*='modal'],[class*='dialog'],[class*='popup'],[class*='layer']\");"
                + "var stage=0;var score=0;var userMustTap=false;var matchedPhrase=rawText;"
                + "for(var w4=0;w4<stage4Words.length;w4++){if(lower.indexOf(stage4Words[w4])>=0){stage=4;score=400+(lower===stage4Words[w4]?50:0);userMustTap=true;break;}}"
                + "if(stage===0&&inDialog&&(lower.indexOf('해지')>=0||lower.indexOf('취소')>=0||lower==='확인'||lower.indexOf('cancel')>=0||lower.indexOf('confirm')>=0)){stage=4;score=380;userMustTap=true;}"
                + "if(stage===0){for(var w3=0;w3<stage3Words.length;w3++){if(lower.indexOf(stage3Words[w3])>=0){if(lower.indexOf('예약')>=0||lower.indexOf('종료')>=0||lower.indexOf('완료')>=0||lower.indexOf('확정')>=0){stage=4;score=400;userMustTap=true;}else if(lower.indexOf('포기')>=0){stage=3;score=300;userMustTap=true;}else{stage=3;score=300+(lower===stage3Words[w3]?40:0);}break;}}}"
                + "if(stage===0){for(var w2=0;w2<stage2Words.length;w2++){if(lower.indexOf(stage2Words[w2])>=0){stage=2;score=200+(lower===stage2Words[w2]?40:0);break;}}}"
                + "if(stage===0){for(var h=0;h<hints.length;h++){var ht=norm(hints[h]).toLowerCase();if(ht&&lower.indexOf(ht)>=0){stage=2;score=220+(lower===ht?40:0);break;}}}"
                + "if(stage===0){for(var w1=0;w1<stage1Words.length;w1++){if(lower.indexOf(stage1Words[w1])>=0){var termWords=['해지','취소','종료','탈퇴','해제','포기','예약','cancel','end','terminate','downgrade','unsubscribe'];var hasTerm=false;for(var tw=0;tw<termWords.length;tw++){if(lower.indexOf(termWords[tw])>=0){hasTerm=true;break;}}if(hasTerm){stage=2;score=200;}else{stage=1;score=100+(lower===stage1Words[w1]?30:0);}break;}}}"
                + "if(stage===0)continue;"
                + "var vw=window.innerWidth||document.documentElement.clientWidth||0;var vh=window.innerHeight||document.documentElement.clientHeight||0;"
                + "var visible=(r.right>0&&r.bottom>0&&r.left<vw&&r.top<vh);"
                + "if(visible)score+=15;"
                + "if(!best||score>best.score){best={stage:stage,score:score,matchedText:matchedPhrase,userMustTap:userMustTap,autoTapAllowed:!userMustTap,selector:el.tagName.toLowerCase()};}"
                + "}"
                + "var findH=function(sel){var els=document.querySelectorAll(sel);for(var k=0;k<els.length;k++){var er=els[k].getBoundingClientRect();var es=window.getComputedStyle(els[k]);if(er&&er.width>0&&er.height>0&&es.display!=='none'&&es.visibility!=='hidden'){var t=norm(els[k].innerText||els[k].textContent||'').slice(0,60);if(t)return t;}}return '';};"
                + "var hSig=findH('h1')||findH('h2')||findH('[role=heading]');"
                + "var hasDlg=false;var dlgs=document.querySelectorAll('[role=dialog],[role=alertdialog],[aria-modal=true],dialog');"
                + "for(var d=0;d<dlgs.length;d++){var dr=dlgs[d].getBoundingClientRect();var ds=window.getComputedStyle(dlgs[d]);if(dr&&dr.width>0&&dr.height>0&&ds.display!=='none'&&ds.visibility!=='hidden'){hasDlg=true;break;}}"
                + "var pageSig=hSig+(hasDlg?'|dlg':'');"
                + "if(!best)return JSON.stringify({state:'NONE',pageSig:pageSig});"
                + "return JSON.stringify({state:'FOUND',stage:best.stage,matchedText:best.matchedText,selector:best.selector,userMustTap:best.userMustTap,autoTapAllowed:best.autoTapAllowed,pageSig:pageSig});"
                + "}catch(e){return JSON.stringify({state:'ERROR'});}"
                + "})()";
    }
}
