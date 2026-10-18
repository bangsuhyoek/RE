package com.submate.app.webguide;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Before;
import org.junit.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;

public class SuccessBaselineTrackerTest {

    private List<String> targetPhrases;
    private SuccessBaselineTracker tracker;

    @Before
    public void setUp() {
        targetPhrases = Arrays.asList(
                "해지가 완료",
                "멤버십이 해지",
                "정기결제 해지 완료",
                "해지 예약",
                "Your membership has been cancelled"
        );
        tracker = new SuccessBaselineTracker(true);
    }

    @Test
    public void testPreExistingPhrasesInBaselineDoNotCountAsSuccess() {
        // Pre-final page has notice text: "정기결제 해지 완료 시 잔여 혜택이 즉시 소멸됩니다."
        String preFinalPageText = "네이버플러스 멤버십 안내: 정기결제 해지 완료 시 잔여 혜택이 즉시 소멸됩니다. 주의사항을 확인하세요.";

        // Record baseline on page load
        tracker.recordBaselineFromText(preFinalPageText, targetPhrases);
        assertTrue(tracker.getBaselinePhrases().contains("정기결제 해지 완료"));

        // User advances to final step and clicks confirm
        tracker.setFinalStepReached(true);
        tracker.setFinalActionTaken(true);
        assertTrue(tracker.isTextSuccessAllowed());

        // Evaluation on the exact same page text without changes -> MUST RETURN NULL (not success!)
        String result = tracker.evaluateNewSuccessFromText(preFinalPageText, targetPhrases);
        assertNull("Pre-existing baseline phrase must not count as cancellation success", result);
    }

    @Test
    public void testNewlyAppearingPhraseCountsAsSuccess() {
        // Step 1: Page loads with warning notice containing "정기결제 해지 완료"
        String initialNoticePage = "주의: 정기결제 해지 완료 시 모든 캐시백 혜택이 중단됩니다.";
        tracker.recordBaselineFromText(initialNoticePage, targetPhrases);

        // Step 2: Final step reached and user takes final action (in-bounds click)
        tracker.setFinalStepReached(true);
        tracker.setFinalActionTaken(true);

        // Step 3: Page updates (or DOM changes) to show confirmation banner with "해지가 완료"
        String updatedPage = "주의: 정기결제 해지 완료 시 모든 캐시백 혜택이 중단됩니다. 고객님의 네이버플러스 멤버십 해지가 완료되었습니다.";
        String successPhrase = tracker.evaluateNewSuccessFromText(updatedPage, targetPhrases);

        assertNotNull("Newly appeared phrase must be detected", successPhrase);
        assertEquals("해지가 완료", successPhrase);
    }

    @Test
    public void testNavigationToNewResultPageEvaluatesWithoutBaseline() {
        // Pre-final page has notice text: "정기결제 해지 완료"
        String preFinalPageText = "네이버플러스 멤버십 안내: 정기결제 해지 완료 시 혜택이 중단됩니다.";
        tracker.recordBaselineFromText(preFinalPageText, targetPhrases);
        assertTrue(tracker.getBaselinePhrases().contains("정기결제 해지 완료"));

        // User reaches final step and taps the final button
        tracker.setFinalStepReached(true);
        tracker.setFinalActionTaken(true);

        // Site navigates to a NEW result page (full page load)
        tracker.onPageLoading();
        assertTrue("Baseline must be cleared for new navigation page load", tracker.getBaselinePhrases().isEmpty());

        // New page loads with result phrase (which happened to be in the old page's notice text too)
        String resultPageText = "정기결제 해지 완료 처리되었습니다. 이용해 주셔서 감사합니다.";
        // recordBaseline is called on the new page, but ignored because finalActionTaken is true
        tracker.recordBaselineFromText(resultPageText, targetPhrases);
        assertTrue("New result page phrases are not added to baseline after final action", tracker.getBaselinePhrases().isEmpty());

        // Success phrase on the result page MUST be detected as success!
        String successPhrase = tracker.evaluateNewSuccessFromText(resultPageText, targetPhrases);
        assertNotNull("Phrase on newly loaded result page must count as cancellation success", successPhrase);
        assertEquals("정기결제 해지 완료", successPhrase);
    }

    @Test
    public void testPageRefreshResetsBaselineAndDoesNotTriggerSuccess() {
        String preFinalPage = "안내: 해지 예약 후 다음 결제일에 서비스가 종료됩니다.";

        // Initial load
        tracker.recordBaselineFromText(preFinalPage, targetPhrases);
        assertTrue(tracker.getBaselinePhrases().contains("해지 예약"));

        // Page refresh occurs before user final action
        tracker.onPageLoading();
        assertEquals("onPageLoading must clear baseline before final action", 0, tracker.getBaselinePhrases().size());

        tracker.recordBaselineFromText(preFinalPage, targetPhrases);
        assertTrue(tracker.getBaselinePhrases().contains("해지 예약"));

        // Even if someone checked text, without final action and final step it fails
        assertFalse(tracker.isTextSuccessAllowed());
        assertNull(tracker.evaluateNewSuccessFromText(preFinalPage, targetPhrases));
    }

    @Test
    public void testFinalStepGatingBlocksTextSuccessBeforeFinalStep() {
        // Guide is at step 2 of 5 (intermediate step)
        tracker.setFinalStepReached(false);
        tracker.setFinalActionTaken(true); // even if a tap occurred

        assertFalse("Text success is blocked if final step has not been reached", tracker.isTextSuccessAllowed());

        String text = "고객님의 멤버십 해지가 완료되었습니다.";
        String result = tracker.evaluateNewSuccessFromText(text, targetPhrases);
        assertNull("Must not evaluate success when final step is not reached", result);
    }

    @Test
    public void testFinalStepReachedAllowsSuccessAfterAction() {
        tracker.setFinalStepReached(true);
        assertFalse("Final action still required even if final step reached", tracker.isTextSuccessAllowed());

        tracker.setFinalActionTaken(true);
        assertTrue("Both final step reached and action taken -> allowed", tracker.isTextSuccessAllowed());

        String text = "Your membership has been cancelled successfully.";
        String result = tracker.evaluateNewSuccessFromText(text, targetPhrases);
        assertEquals("Your membership has been cancelled", result);
    }

    @Test
    public void testRouteWithoutFinalStepConcept() {
        // Route without final step concept (e.g. single-page or unstepped route)
        SuccessBaselineTracker openTracker = new SuccessBaselineTracker(false);
        assertFalse(openTracker.hasFinalStepConcept());

        // Requires only finalActionTaken
        assertFalse(openTracker.isTextSuccessAllowed());
        openTracker.setFinalActionTaken(true);
        assertTrue(openTracker.isTextSuccessAllowed());

        String text = "멤버십이 해지되었습니다.";
        assertEquals("멤버십이 해지", openTracker.evaluateNewSuccessFromText(text, targetPhrases));
    }

    @Test
    public void testCaseInsensitiveAndWhitespaceHandling() {
        String pageText = "  YOUR MEMBERSHIP HAS BEEN CANCELLED  ";
        tracker.recordBaselineFromText(pageText, targetPhrases);
        assertTrue(tracker.getBaselinePhrases().contains("your membership has been cancelled"));

        tracker.setFinalStepReached(true);
        tracker.setFinalActionTaken(true);

        // Same phrase with different casing is in baseline
        assertNull(tracker.evaluateNewSuccessFromText("your membership has been cancelled", targetPhrases));

        // New phrase
        String newText = "정기결제 해지 완료";
        assertEquals("정기결제 해지 완료", tracker.evaluateNewSuccessFromText(newText, targetPhrases));
    }

    @Test
    public void testFindPresentPhrasesHelper() {
        String text = "첫번째 줄: 해지 예약 관련 안내문구. 두번째 줄: 정기결제 해지 완료 시 안내.";
        Set<String> found = SuccessBaselineTracker.findPresentPhrases(text, targetPhrases);

        assertEquals(2, found.size());
        assertTrue(found.contains("해지 예약"));
        assertTrue(found.contains("정기결제 해지 완료"));
        assertFalse(found.contains("해지가 완료"));
    }
}
