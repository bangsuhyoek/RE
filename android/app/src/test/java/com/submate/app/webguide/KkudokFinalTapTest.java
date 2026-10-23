package com.submate.app.webguide;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.submate.app.webguide.target.TargetResolver;

import org.junit.Test;

import java.util.concurrent.atomic.AtomicReference;

public class KkudokFinalTapTest {

    @Test
    public void testParseFinalConfirmClickResult() {
        assertEquals("clicked_id", KkudokNaverGuideController.parseFinalConfirmClickResult("\"clicked_id\""));
        assertEquals("clicked_exact", KkudokNaverGuideController.parseFinalConfirmClickResult("\"clicked_exact\""));
        assertEquals("clicked_match", KkudokNaverGuideController.parseFinalConfirmClickResult("\"clicked_match\""));
        assertEquals("clicked_sel", KkudokNaverGuideController.parseFinalConfirmClickResult("\"clicked_sel\""));
        assertEquals("not_found", KkudokNaverGuideController.parseFinalConfirmClickResult("\"not_found\""));
        assertEquals("error", KkudokNaverGuideController.parseFinalConfirmClickResult("\"error\""));
        assertEquals("error", KkudokNaverGuideController.parseFinalConfirmClickResult(null));
        assertEquals("error", KkudokNaverGuideController.parseFinalConfirmClickResult("null"));
        assertEquals("error", KkudokNaverGuideController.parseFinalConfirmClickResult("   "));
        assertEquals("clicked_exact", KkudokNaverGuideController.parseFinalConfirmClickResult("clicked_exact"));
    }

    @Test
    public void testIsClickSuccessResult() {
        assertTrue(KkudokNaverGuideController.isClickSuccessResult("clicked_id"));
        assertTrue(KkudokNaverGuideController.isClickSuccessResult("clicked_exact"));
        assertTrue(KkudokNaverGuideController.isClickSuccessResult("clicked_match"));
        assertTrue(KkudokNaverGuideController.isClickSuccessResult("clicked_sel"));

        assertFalse(KkudokNaverGuideController.isClickSuccessResult("not_found"));
        assertFalse(KkudokNaverGuideController.isClickSuccessResult("error"));
        assertFalse(KkudokNaverGuideController.isClickSuccessResult("unknown"));
        assertFalse(KkudokNaverGuideController.isClickSuccessResult(null));
    }

    @Test
    public void testTargetResolverAmbiguousRestoration() {
        String script = TargetResolver.getInjectedScriptForTesting("{}");
        assertTrue("Must return AMBIGUOUS when visible.length > 1",
                script.contains("else if(visible.length>1){return JSON.stringify({status:'AMBIGUOUS',candidateCount:matches.length});}"));
        assertTrue("Must return AMBIGUOUS when visible.length == 0 and matches.length > 1",
                script.contains("else{return JSON.stringify({status:'AMBIGUOUS',candidateCount:matches.length});}"));
        assertTrue("Must keep hit-test contains check",
                script.contains("!hit.contains(el)"));
    }

    @Test
    public void testListenerDefaultMethodCompatibility() {
        AtomicReference<String> unverifiedReason = new AtomicReference<>();
        AtomicReference<String> userTapRequiredTarget = new AtomicReference<>();
        AtomicReference<String> stepTapFailedReason = new AtomicReference<>();
        KkudokNaverGuideController.Listener listener = new KkudokNaverGuideController.Listener() {
            @Override
            public void onAutoAdvanceCountdownStarted(long durationMs, Runnable onCancelOptOut) {}

            @Override
            public void onAutoAdvanceCountdownCancelled() {}

            @Override
            public void onCancellationSuccessDetected(String detectedBy, String matchedSignal) {}

            @Override
            public void onFinalTapUnverified(String reason) {
                unverifiedReason.set(reason);
            }

            @Override
            public void onUserTapRequired(String targetText) {
                userTapRequiredTarget.set(targetText);
            }

            @Override
            public void onStepTapFailed(String reason) {
                stepTapFailedReason.set(reason);
            }
        };

        listener.onFinalTapUnverified("click_not_found");
        assertEquals("click_not_found", unverifiedReason.get());

        listener.onFinalTapUnverified("click_error");
        assertEquals("click_error", unverifiedReason.get());

        listener.onFinalTapUnverified("no_success_signal");
        assertEquals("no_success_signal", unverifiedReason.get());

        listener.onUserTapRequired("해지하기");
        assertEquals("해지하기", userTapRequiredTarget.get());

        listener.onStepTapFailed("click_not_found");
        assertEquals("click_not_found", stepTapFailedReason.get());
    }
}
