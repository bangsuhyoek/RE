package com.submate.app.webguide;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.submate.app.webguide.services.universal.AiNextStepClient;
import com.submate.app.webguide.services.universal.UniversalCancelRoute;
import com.submate.app.webguide.services.universal.UniversalCancelRoute.FlowState;
import com.submate.app.webguide.services.universal.UniversalCancelRoute.GuardResult;
import com.submate.app.webguide.state.GuideState;
import com.submate.app.webguide.state.PageState;

import org.junit.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class AiNextStepTest {

    @Test
    public void testScrubber() {
        String original = "회원 홍길동님 계정 test.user@example.com 전화 01012345678 코드 123456 인증";
        String scrubbed = UniversalCancelRoute.scrubSensitiveText(original);

        assertFalse("Email must be scrubbed", scrubbed.contains("test.user@example.com"));
        assertTrue("Email placeholder must be present", scrubbed.contains("[EMAIL]"));
        assertFalse("Name님 must be scrubbed", scrubbed.contains("홍길동님"));
        assertTrue("OOO님 placeholder must be present", scrubbed.contains("OOO님"));
        assertFalse("4+ digit runs must be scrubbed", scrubbed.contains("01012345678"));
        assertFalse("4+ digit runs must be scrubbed", scrubbed.contains("123456"));
    }

    @Test
    public void testResponseParsing() {
        List<AiNextStepClient.ElementDto> elements = Arrays.asList(
                new AiNextStepClient.ElementDto(0, "구독 관리", "button", "button", false),
                new AiNextStepClient.ElementDto(1, "해지하기", "link", "a", false)
        );

        // 1. Normal response
        String validJson = "{\"index\":1,\"kind\":\"cancel\",\"confidence\":0.95}";
        AiNextStepClient.AiResponse res1 = AiNextStepClient.parseAiResponse(validJson, elements);
        assertEquals(Integer.valueOf(1), res1.index);
        assertEquals("cancel", res1.kind);
        assertEquals(0.95, res1.confidence, 0.001);

        // 2. Bad JSON
        AiNextStepClient.AiResponse resBadJson = AiNextStepClient.parseAiResponse("invalid-json", elements);
        assertEquals("none", resBadJson.kind);
        assertNull(resBadJson.index);

        // 3. Missing fields (e.g. index is null or absent)
        String missingIndex = "{\"kind\":\"login\",\"confidence\":0.8}";
        AiNextStepClient.AiResponse resNoIdx = AiNextStepClient.parseAiResponse(missingIndex, elements);
        assertEquals("login", resNoIdx.kind);
        assertNull(resNoIdx.index);

        // 4. Index not in list -> treated as none
        String unknownIdx = "{\"index\":99,\"kind\":\"cancel\",\"confidence\":0.9}";
        AiNextStepClient.AiResponse resUnknownIdx = AiNextStepClient.parseAiResponse(unknownIdx, elements);
        assertEquals("none", resUnknownIdx.kind);
        assertNull(resUnknownIdx.index);
    }

    @Test
    public void testKindToStageGuardMapping() {
        FlowState flowState = new FlowState();
        List<AiNextStepClient.ElementDto> elements = Arrays.asList(
                new AiNextStepClient.ElementDto(0, "구독 관리", "button", "button", false),
                new AiNextStepClient.ElementDto(1, "멤버십 해지", "button", "button", false),
                new AiNextStepClient.ElementDto(2, "계속 해지", "button", "button", false),
                new AiNextStepClient.ElementDto(3, "해지 완료", "button", "button", false)
        );

        // 1. nav high confidence (>= 0.6) -> stage 1 -> auto-tap allowed
        AiNextStepClient.AiResponse navHigh = new AiNextStepClient.AiResponse(0, "nav", 0.85);
        RouteEvaluation evalNavHigh = UniversalCancelRoute.mapAiResponseToEvaluation(
                navHigh, elements, flowState, "https://example.com/account", "sig", 4);
        assertEquals(GuideState.TALKING, evalNavHigh.getGuideState());
        assertNotNull(evalNavHigh.getStep());
        assertFalse("High confidence nav should allow auto-tap", evalNavHigh.isUserMustTap());
        assertTrue(evalNavHigh.getStep().isAutoTapAllowed());
        assertEquals("[data-kkudok-ai-idx=\"0\"]", evalNavHigh.getStep().getTarget().getSelector());

        // 2. nav low confidence (< 0.6) -> user must tap, non-final
        AiNextStepClient.AiResponse navLow = new AiNextStepClient.AiResponse(0, "nav", 0.45);
        RouteEvaluation evalNavLow = UniversalCancelRoute.mapAiResponseToEvaluation(
                navLow, elements, flowState, "https://example.com/account", "sig", 4);
        assertEquals(GuideState.TALKING, evalNavLow.getGuideState());
        assertNotNull(evalNavLow.getStep());
        assertTrue("Low confidence nav must require user tap", evalNavLow.isUserMustTap());
        assertFalse(evalNavLow.getStep().isAutoTapAllowed());

        // 3. cancel -> stage 2 -> user must tap
        AiNextStepClient.AiResponse cancelResp = new AiNextStepClient.AiResponse(1, "cancel", 0.9);
        RouteEvaluation evalCancel = UniversalCancelRoute.mapAiResponseToEvaluation(
                cancelResp, elements, flowState, "https://example.com/sub", "sig", 4);
        assertEquals(GuideState.TALKING, evalCancel.getGuideState());
        assertNotNull(evalCancel.getStep());
        assertTrue("Cancel (stage 2) must require user tap", evalCancel.isUserMustTap());
        assertFalse(evalCancel.getStep().isAutoTapAllowed());

        // 4. retention_continue -> stage 3 -> auto-tap allowed (unless terminal word like 포기/예약/etc)
        AiNextStepClient.AiResponse retResp = new AiNextStepClient.AiResponse(2, "retention_continue", 0.9);
        RouteEvaluation evalRet = UniversalCancelRoute.mapAiResponseToEvaluation(
                retResp, elements, flowState, "https://example.com/retention", "sig", 4);
        assertEquals(GuideState.TALKING, evalRet.getGuideState());
        assertNotNull(evalRet.getStep());
        assertFalse("Retention continue without terminal words allows auto-tap", evalRet.isUserMustTap());
        assertTrue(evalRet.getStep().isAutoTapAllowed());

        // 5. final -> stage 4 -> final cancel confirm, user must tap
        AiNextStepClient.AiResponse finalResp = new AiNextStepClient.AiResponse(3, "final", 0.99);
        RouteEvaluation evalFinal = UniversalCancelRoute.mapAiResponseToEvaluation(
                finalResp, elements, flowState, "https://example.com/final", "sig", 4);
        assertEquals(GuideState.TALKING, evalFinal.getGuideState());
        assertNotNull(evalFinal.getStep());
        assertTrue("Final must require user tap", evalFinal.isUserMustTap());
        assertFalse(evalFinal.getStep().isAutoTapAllowed());
        assertEquals(PageState.FINAL_CANCEL_CONFIRM, evalFinal.getStep().getLogicalPageState());

        // 6. login -> paused
        AiNextStepClient.AiResponse loginResp = new AiNextStepClient.AiResponse(null, "login", 0.99);
        RouteEvaluation evalLogin = UniversalCancelRoute.mapAiResponseToEvaluation(
                loginResp, elements, flowState, "https://example.com/login", "sig", 4);
        assertEquals(GuideState.PAUSED, evalLogin.getGuideState());
        assertTrue(evalLogin.isLogin());

        // 7. none / null -> hidden
        AiNextStepClient.AiResponse noneResp = new AiNextStepClient.AiResponse(null, "none", 0.0);
        RouteEvaluation evalNone = UniversalCancelRoute.mapAiResponseToEvaluation(
                noneResp, elements, flowState, "https://example.com/unknown", "sig", 4);
        assertEquals(GuideState.HIDDEN, evalNone.getGuideState());
    }

    @Test
    public void testBudgetAndCacheBehavior() {
        FlowState flowState = new FlowState();

        // Check initial state
        assertEquals(0, flowState.getAiCallCount());
        assertFalse(flowState.isAiInFlight());
        assertTrue(flowState.canMakeAiCall());

        // Increment 8 times (allowed budget)
        for (int i = 0; i < 8; i++) {
            assertTrue("Call " + i + " must be allowed", flowState.canMakeAiCall());
            flowState.incrementAiCallCount();
        }
        assertEquals(8, flowState.getAiCallCount());

        // 9th call must be blocked
        assertFalse("9th call must exceed budget and be blocked", flowState.canMakeAiCall());

        // Test in-flight locking
        FlowState flightState = new FlowState();
        assertTrue(flightState.canMakeAiCall());
        flightState.setAiInFlight(true);
        assertFalse("While in-flight, new AI calls must be blocked", flightState.canMakeAiCall());
        flightState.setAiInFlight(false);
        assertTrue(flightState.canMakeAiCall());

        // Test caching by key
        String cacheKey = "example.com/account@headingSig@5";
        RouteEvaluation dummy = RouteEvaluation.hidden("cached-test");
        assertNull(flowState.getCachedEvaluation(cacheKey));
        flowState.putCachedEvaluation(cacheKey, dummy);
        assertEquals(dummy, flowState.getCachedEvaluation(cacheKey));
    }

    @Test
    public void testRawTextPreservedForTargetWhileHistoryScrubbed() {
        FlowState flowState = new FlowState();
        List<AiNextStepClient.ElementDto> elements = Collections.singletonList(
                new AiNextStepClient.ElementDto(0, "OOO님 내 정보", "홍길동님 내 정보", "button", "button", false)
        );

        AiNextStepClient.AiResponse navResp = new AiNextStepClient.AiResponse(0, "nav", 0.9);
        RouteEvaluation eval = UniversalCancelRoute.mapAiResponseToEvaluation(
                navResp, elements, flowState, "https://example.com/my", "sig", 4);

        assertEquals(GuideState.TALKING, eval.getGuideState());
        assertTrue("UI instruction and target matching should use rawText",
                eval.getInstructionText().contains("홍길동님 내 정보"));
        assertEquals(Collections.singletonList("OOO님 내 정보"), flowState.getPressedHistory());
    }

    @Test
    public void testScanScriptIncludesPageSigOnNone() {
        String script = UniversalCancelRoute.buildSemanticScanScript("[]");
        assertTrue("NONE state must include pageSig for SPA cache separation",
                script.contains("{state:'NONE',pageSig:pageSig}"));
    }
}
