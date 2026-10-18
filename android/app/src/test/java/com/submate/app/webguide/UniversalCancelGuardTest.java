package com.submate.app.webguide;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import com.submate.app.webguide.services.universal.UniversalCancelRoute;
import com.submate.app.webguide.services.universal.UniversalCancelRoute.FlowState;
import com.submate.app.webguide.services.universal.UniversalCancelRoute.GuardResult;
import com.submate.app.webguide.state.PageState;

import org.junit.Test;

public class UniversalCancelGuardTest {

    @Test
    public void testTvingSequence() {
        FlowState state = new FlowState();

        // Stage 2 initial cancel entry on account page: never auto-tap, requires user tap (not final)
        GuardResult step1 = UniversalCancelRoute.applyCancelEntryGuard(
                state, 2, "https://www.tving.com/my/membership", "자동결제 해지 신청하기", 4);
        assertTrue("First cancel entry must require user manual tap", step1.userMustTap);
        assertFalse("First cancel entry must NOT allow auto-tap", step1.autoTapAllowed);
        assertFalse(step1.treatedAsFinal);
        assertEquals(2, step1.stepNumber);
        assertEquals(PageState.CANCELLATION_ENTRY, step1.pageState);

        // Stage 2 on subsequent cancel page: must be treated as FINAL
        GuardResult step2 = UniversalCancelRoute.applyCancelEntryGuard(
                state, 2, "https://www.tving.com/my/membership/cancel", "해지 신청하기", 4);
        assertTrue("Second cancel entry on different path must be treated as final", step2.userMustTap);
        assertFalse("Final step must NOT allow auto-tap", step2.autoTapAllowed);
        assertTrue(step2.treatedAsFinal);
        assertEquals(4, step2.stepNumber);
        assertEquals(PageState.FINAL_CANCEL_CONFIRM, step2.pageState);
    }

    @Test
    public void testLaftelSequence() {
        FlowState state = new FlowState();

        // 1. Initial cancel entry on /a: user tap required, not final
        GuardResult step1 = UniversalCancelRoute.applyCancelEntryGuard(
                state, 2, "https://laftel.net/a", "멤버십 해지하기", 4);
        assertTrue(step1.userMustTap);
        assertFalse(step1.autoTapAllowed);
        assertFalse(step1.treatedAsFinal);

        // 2. Same text, same path rescanned (with query/fragment variation): still user tap, not final
        GuardResult rescan = UniversalCancelRoute.applyCancelEntryGuard(
                state, 2, "https://laftel.net/a?tab=overview#section", "  멤버십  해지하기  ", 4);
        assertTrue("Rescanned button on same path requires user tap", rescan.userMustTap);
        assertFalse("Rescanned button on same path must NOT allow auto-tap", rescan.autoTapAllowed);
        assertFalse(rescan.treatedAsFinal);

        // 3. Same text on different path /b: must be treated as FINAL
        GuardResult step3 = UniversalCancelRoute.applyCancelEntryGuard(
                state, 2, "https://laftel.net/b", "멤버십 해지하기", 4);
        assertTrue("Same text on different path /b must be treated as final", step3.userMustTap);
        assertFalse("Final step must NOT allow auto-tap", step3.autoTapAllowed);
        assertTrue(step3.treatedAsFinal);
        assertEquals(4, step3.stepNumber);
        assertEquals(PageState.FINAL_CANCEL_CONFIRM, step3.pageState);
    }

    @Test
    public void testCrunchyrollSequence() {
        FlowState state = new FlowState();

        // 1. Stage 2 "Cancel Membership" on account: user tap required, not final
        GuardResult step1 = UniversalCancelRoute.applyCancelEntryGuard(
                state, 2, "https://www.crunchyroll.com/account/membership", "Cancel Membership", 4);
        assertTrue(step1.userMustTap);
        assertFalse(step1.autoTapAllowed);
        assertFalse(step1.treatedAsFinal);

        // 2. Stage 3 "Cancel Anyway" (retention bypass): auto, does not overwrite stage 2 key
        GuardResult step2 = UniversalCancelRoute.applyCancelEntryGuard(
                state, 3, "https://www.crunchyroll.com/retention", "Cancel Anyway", 4);
        assertFalse(step2.userMustTap);
        assertTrue(step2.autoTapAllowed);
        assertFalse(step2.treatedAsFinal);
        assertEquals(3, step2.stepNumber);

        // 3. Stage 2 "Cancel Subscription" on final screen: must be treated as FINAL
        GuardResult step3 = UniversalCancelRoute.applyCancelEntryGuard(
                state, 2, "https://www.crunchyroll.com/confirm", "Cancel Subscription", 4);
        assertTrue("Second stage 2 button must be treated as final", step3.userMustTap);
        assertFalse("Final step must NOT allow auto-tap", step3.autoTapAllowed);
        assertTrue(step3.treatedAsFinal);
        assertEquals(4, step3.stepNumber);
        assertEquals(PageState.FINAL_CANCEL_CONFIRM, step3.pageState);
    }

    @Test
    public void testStage1AndStage4Behavior() {
        FlowState state = new FlowState();

        // Stage 1 (manage menu): auto allowed
        GuardResult s1 = UniversalCancelRoute.applyCancelEntryGuard(
                state, 1, "https://example.com/account", "구독 관리", 4);
        assertFalse(s1.userMustTap);
        assertTrue(s1.autoTapAllowed);
        assertEquals(1, s1.stepNumber);
        assertEquals(PageState.CANCELLATION_ENTRY, s1.pageState);

        // Stage 4 (final): userMustTap always true
        GuardResult s4 = UniversalCancelRoute.applyCancelEntryGuard(
                state, 4, "https://example.com/cancel/confirm", "해지 완료", 4);
        assertTrue(s4.userMustTap);
        assertFalse(s4.autoTapAllowed);
        assertTrue(s4.treatedAsFinal);
        assertEquals(4, s4.stepNumber);
        assertEquals(PageState.FINAL_CANCEL_CONFIRM, s4.pageState);
    }

    @Test
    public void testSpaPageSigSeparation() {
        FlowState state = new FlowState();
        String path = "https://laftel.net/membership";
        String text = "멤버십 해지하기";

        // 1. Initial entry on account view with heading "멤버십 정보": user tap required, not final
        GuardResult first = UniversalCancelRoute.applyCancelEntryGuard(
                state, 2, path, text, "멤버십 정보", 4);
        assertTrue("First entry must require user tap", first.userMustTap);
        assertFalse("First entry must NOT allow auto-tap", first.autoTapAllowed);
        assertFalse(first.treatedAsFinal);

        // 2. Same path, same text, same pageSig -> still user tap, not final
        GuardResult rescan = UniversalCancelRoute.applyCancelEntryGuard(
                state, 2, path, text, "멤버십 정보", 4);
        assertTrue("Same path, same text, same pageSig must require user tap", rescan.userMustTap);
        assertFalse("Same path, same text, same pageSig must NOT allow auto-tap", rescan.autoTapAllowed);
        assertFalse(rescan.treatedAsFinal);

        // 3. Same path, same text, different pageSig -> final
        GuardResult finalStep = UniversalCancelRoute.applyCancelEntryGuard(
                state, 2, path, text, "정말 해지하시겠어요?|dlg", 4);
        assertTrue("Same path, same text, different pageSig must be treated as final", finalStep.userMustTap);
        assertFalse("Final step must NOT allow auto-tap", finalStep.autoTapAllowed);
        assertTrue(finalStep.treatedAsFinal);
        assertEquals(4, finalStep.stepNumber);
        assertEquals(PageState.FINAL_CANCEL_CONFIRM, finalStep.pageState);
    }

    @Test
    public void testTenUnsafeLabelsBlockedFromAutoTap() {
        // 1. ridiselect "구독 해지 예약" (stage 4 -> final)
        GuardResult r1 = UniversalCancelRoute.applyCancelEntryGuard(new FlowState(), 2, "https://ridibooks.com", "구독 해지 예약", 4);
        assertFalse("ridiselect must not auto-tap", r1.autoTapAllowed);
        assertTrue(r1.userMustTap);
        assertTrue(r1.treatedAsFinal);
        assertEquals(PageState.FINAL_CANCEL_CONFIRM, r1.pageState);

        // 2. flo "해지예약" (stage 4 -> final)
        GuardResult r2 = UniversalCancelRoute.applyCancelEntryGuard(new FlowState(), 2, "https://music.flo.co.kr", "해지예약", 4);
        assertFalse("flo must not auto-tap", r2.autoTapAllowed);
        assertTrue(r2.userMustTap);
        assertTrue(r2.treatedAsFinal);
        assertEquals(PageState.FINAL_CANCEL_CONFIRM, r2.pageState);

        // 3. bugs "해지하기" (stage 2 -> user tap, not final)
        GuardResult r3 = UniversalCancelRoute.applyCancelEntryGuard(new FlowState(), 2, "https://music.bugs.co.kr", "해지하기", 4);
        assertFalse("bugs must not auto-tap", r3.autoTapAllowed);
        assertTrue(r3.userMustTap);
        assertFalse(r3.treatedAsFinal);

        // 4. welaaa "해지하기" (stage 2 -> user tap, not final)
        GuardResult r4 = UniversalCancelRoute.applyCancelEntryGuard(new FlowState(), 2, "https://welaaa.com", "해지하기", 4);
        assertFalse("welaaa must not auto-tap", r4.autoTapAllowed);
        assertTrue(r4.userMustTap);
        assertFalse(r4.treatedAsFinal);

        // 5. applemusic "구독 취소" (stage 2 -> user tap, not final)
        GuardResult r5 = UniversalCancelRoute.applyCancelEntryGuard(new FlowState(), 2, "https://music.apple.com", "구독 취소", 4);
        assertFalse("applemusic must not auto-tap", r5.autoTapAllowed);
        assertTrue(r5.userMustTap);
        assertFalse(r5.treatedAsFinal);

        // 6. perplexity-pro "Cancel subscription" (stage 2 -> user tap, not final)
        GuardResult r6 = UniversalCancelRoute.applyCancelEntryGuard(new FlowState(), 2, "https://perplexity.ai", "Cancel subscription", 4);
        assertFalse("perplexity-pro must not auto-tap", r6.autoTapAllowed);
        assertTrue(r6.userMustTap);
        assertFalse(r6.treatedAsFinal);

        // 7. evernote "Cancel subscription" (stage 2 -> user tap, not final)
        GuardResult r7 = UniversalCancelRoute.applyCancelEntryGuard(new FlowState(), 2, "https://evernote.com", "Cancel subscription", 4);
        assertFalse("evernote must not auto-tap", r7.autoTapAllowed);
        assertTrue(r7.userMustTap);
        assertFalse(r7.treatedAsFinal);

        // 8. nyt-digital "Cancel subscription" (stage 2 -> user tap, not final)
        GuardResult r8 = UniversalCancelRoute.applyCancelEntryGuard(new FlowState(), 2, "https://nytimes.com", "Cancel subscription", 4);
        assertFalse("nyt-digital must not auto-tap", r8.autoTapAllowed);
        assertTrue(r8.userMustTap);
        assertFalse(r8.treatedAsFinal);

        // 9. primevideo "내 멤버십 종료" (stage 1 with terminal word / stage 4 word -> final)
        GuardResult r9 = UniversalCancelRoute.applyCancelEntryGuard(new FlowState(), 1, "https://primevideo.com", "내 멤버십 종료", 4);
        assertFalse("primevideo must not auto-tap", r9.autoTapAllowed);
        assertTrue(r9.userMustTap);
        assertTrue(r9.treatedAsFinal);
        assertEquals(PageState.FINAL_CANCEL_CONFIRM, r9.pageState);

        // 10. melon "혜택 포기…" (stage 3 with '포기' -> user tap, not final)
        GuardResult r10 = UniversalCancelRoute.applyCancelEntryGuard(new FlowState(), 3, "https://melon.com", "혜택 포기", 4);
        assertFalse("melon must not auto-tap", r10.autoTapAllowed);
        assertTrue(r10.userMustTap);
        assertFalse(r10.treatedAsFinal);

        // Explicit retention bypass like "해지 계속하기" and "Cancel Anyway" must still allow auto-tap
        GuardResult ret1 = UniversalCancelRoute.applyCancelEntryGuard(new FlowState(), 3, "https://example.com", "해지 계속하기", 4);
        assertTrue("Retention bypass '해지 계속하기' must auto-tap", ret1.autoTapAllowed);
        assertFalse(ret1.userMustTap);

        GuardResult ret2 = UniversalCancelRoute.applyCancelEntryGuard(new FlowState(), 3, "https://example.com", "Cancel Anyway", 4);
        assertTrue("Retention bypass 'Cancel Anyway' must auto-tap", ret2.autoTapAllowed);
        assertFalse(ret2.userMustTap);
    }

    @Test
    public void testExpandedKeywordsAndDomainCleanliness() {
        String script = UniversalCancelRoute.buildSemanticScanScript("[]");
        assertTrue(script.contains("'마이페이지'"));
        assertTrue(script.contains("'멤버십 취소'"));
        assertTrue(script.contains("'반복 청구 끄기'"));
        assertTrue(script.contains("'billing'"));

        GuardResult xboxFinal = UniversalCancelRoute.applyCancelEntryGuard(
                new FlowState(), 2, "https://account.microsoft.com/services", "반복 청구 끄기", 4);
        assertTrue(xboxFinal.userMustTap);
        assertFalse(xboxFinal.autoTapAllowed);
        assertTrue(xboxFinal.treatedAsFinal);
        assertEquals(PageState.FINAL_CANCEL_CONFIRM, xboxFinal.pageState);
    }
}
