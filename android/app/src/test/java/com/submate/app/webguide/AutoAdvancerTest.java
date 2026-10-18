package com.submate.app.webguide;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.graphics.RectF;

import com.submate.app.webguide.declarative.DeclarativeCancelRoute;
import com.submate.app.webguide.declarative.DeclarativeStep;
import com.submate.app.webguide.services.naver.NaverCancelGuideRoute;
import com.submate.app.webguide.services.netflix.NetflixCancelRoute;
import com.submate.app.webguide.services.youtube.YouTubeCancelRoute;
import com.submate.app.webguide.state.PageState;
import com.submate.app.webguide.target.PointerPlacement;
import com.submate.app.webguide.target.GuideInteractionType;
import com.submate.app.webguide.target.GuideStep;
import com.submate.app.webguide.target.GuideTargetSpec;
import com.submate.app.webguide.target.TargetRect;
import com.submate.app.webguide.target.TargetResolution;
import com.submate.app.webguide.target.TargetResolutionStatus;
import com.submate.app.webguide.target.TargetVerificationStatus;

import org.junit.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public class AutoAdvancerTest {

    private WebSecurityPolicy createStandardPolicy() {
        return new WebSecurityPolicy(
                Arrays.asList("naver.com", "netflix.com", "youtube.com"),
                Arrays.asList("accounts.google.com")
        );
    }

    private GuideStep createIntermediateStep(String id, boolean autoTapAllowed) {
        return new GuideStep(
                id,
                PageState.CANCELLATION_ENTRY,
                "다음 단계로 이동합니다.",
                new GuideTargetSpec("button.next", null, null, "다음", null, null, null, null, null),
                GuideInteractionType.TAP,
                PointerPlacement.AUTO,
                12,
                "NEXT_STEP",
                TargetVerificationStatus.LIVE_VERIFIED,
                false,
                autoTapAllowed
        );
    }

    private GuideStep createUserMustTapStep(String id) {
        return new GuideStep(
                id,
                PageState.FINAL_CANCEL_CONFIRM,
                "해지하기를 눌러주세요",
                new GuideTargetSpec("button.cancel", null, null, "해지하기", null, null, null, null, null),
                GuideInteractionType.TAP,
                PointerPlacement.AUTO,
                12,
                "COMPLETE",
                TargetVerificationStatus.LIVE_VERIFIED,
                true,
                false
        );
    }

    private TargetResolution createVisibleResolution(String matchedText, String descriptor) {
        return new TargetResolution(
                TargetResolutionStatus.FOUND_VISIBLE,
                new TargetRect(100, 200, 80, 40, 400, 800),
                1,
                matchedText,
                "button.next",
                descriptor,
                ""
        );
    }

    @Test
    public void testHardBlockAlwaysRefused() {
        assertTrue("확정 hard blocked", AutoAdvancer.containsHardBlockKeyword("해지 확정"));
        assertTrue("완료 hard blocked", AutoAdvancer.containsHardBlockKeyword("해지하기 완료"));
        assertTrue("탈퇴 hard blocked", AutoAdvancer.containsHardBlockKeyword("회원 탈퇴"));
        assertTrue("환불 hard blocked", AutoAdvancer.containsHardBlockKeyword("환불 신청"));
        assertTrue("결제 취소 hard blocked", AutoAdvancer.containsHardBlockKeyword("결제 취소"));
        assertTrue("결제취소 hard blocked", AutoAdvancer.containsHardBlockKeyword("결제취소"));
        assertTrue("Finish hard blocked", AutoAdvancer.containsHardBlockKeyword("Finish cancellation"));
        assertTrue("Confirm hard blocked", AutoAdvancer.containsHardBlockKeyword("Confirm"));
        assertTrue("Delete hard blocked", AutoAdvancer.containsHardBlockKeyword("Delete account"));
        assertTrue("Complete hard blocked", AutoAdvancer.containsHardBlockKeyword("Complete Cancellation"));

        assertFalse("Hard block is never allowed even if autoTapAllowed = true",
                AutoAdvancer.isKeywordAllowed("해지 확정", true));
        assertFalse("Hard block is never allowed if autoTapAllowed = false",
                AutoAdvancer.isKeywordAllowed("회원 탈퇴", false));
    }

    @Test
    public void testSoftKeywordsRequireAutoTapAllowed() {
        assertTrue("해지 is soft keyword", AutoAdvancer.containsSoftKeyword("네이버플러스 멤버십 해지하기"));
        assertTrue("취소 is soft keyword", AutoAdvancer.containsSoftKeyword("구독 취소"));
        assertTrue("cancel is soft keyword", AutoAdvancer.containsSoftKeyword("Cancel membership"));
        assertTrue("비활성화 is soft keyword", AutoAdvancer.containsSoftKeyword("멤버십 비활성화"));
        assertTrue("deactivate is soft keyword", AutoAdvancer.containsSoftKeyword("Deactivate account"));

        assertTrue("Soft keyword allowed when autoTapAllowed = true",
                AutoAdvancer.isKeywordAllowed("네이버플러스 멤버십 해지하기", true));
        assertTrue("Soft keyword allowed when autoTapAllowed = true",
                AutoAdvancer.isKeywordAllowed("비활성화", true));

        assertFalse("Soft keyword blocked when autoTapAllowed = false",
                AutoAdvancer.isKeywordAllowed("네이버플러스 멤버십 해지하기", false));
        assertFalse("Soft keyword blocked when autoTapAllowed = false",
                AutoAdvancer.isKeywordAllowed("비활성화", false));
    }

    @Test
    public void testPureHitTestInsideBoundingBox() {
        float left = 100f;
        float top = 200f;
        float right = 300f;
        float bottom = 260f;

        assertTrue("Center point must be inside",
                SuccessDetector.isTouchInside(200f, 230f, left, top, right, bottom));
        assertTrue("Near-top-left point must be inside",
                SuccessDetector.isTouchInside(105f, 205f, left, top, right, bottom));

        assertFalse("Point to the left must be outside",
                SuccessDetector.isTouchInside(50f, 230f, left, top, right, bottom));
        assertFalse("Point to the right must be outside",
                SuccessDetector.isTouchInside(350f, 230f, left, top, right, bottom));
        assertFalse("Point above must be outside",
                SuccessDetector.isTouchInside(200f, 150f, left, top, right, bottom));
        assertFalse("Point below must be outside",
                SuccessDetector.isTouchInside(200f, 300f, left, top, right, bottom));
    }

    @Test
    public void testSuccessMatchingOnlyAfterInBoundsFinalTap() {
        YouTubeCancelRoute route = new YouTubeCancelRoute();
        SuccessDetector detector = new SuccessDetector(route);
        String successUrl = "https://www.youtube.com/paid_memberships?status=cancelled";

        RectF finalButtonRect = new RectF();
        finalButtonRect.left = 100f;
        finalButtonRect.top = 500f;
        finalButtonRect.right = 300f;
        finalButtonRect.bottom = 560f;

        assertFalse("Must not be tapped initially", detector.isFinalStepTappedByUser());
        assertFalse("URL check returns false initially", detector.checkUrlSuccess(successUrl));

        boolean markedOutOfBounds = detector.checkAndMarkFinalStepTapped(50f, 200f, finalButtonRect);
        assertFalse("Out of bounds touch must not mark tapped", markedOutOfBounds);
        assertFalse("Detector remains untapped", detector.isFinalStepTappedByUser());
        assertFalse("URL check still false", detector.checkUrlSuccess(successUrl));

        boolean markedInBounds = detector.checkAndMarkFinalStepTapped(200f, 530f, finalButtonRect);
        assertTrue("In bounds touch marks tapped", markedInBounds);
        assertTrue("Detector is marked tapped", detector.isFinalStepTappedByUser());

        assertTrue("Success URL matches after in-bounds tap", detector.checkUrlSuccess(successUrl));
        assertFalse("Unrelated URL does not match", detector.checkUrlSuccess("https://www.youtube.com/watch?v=123"));

        detector.reset();
        assertFalse(detector.isFinalStepTappedByUser());
        assertFalse(detector.checkUrlSuccess(successUrl));
    }

    @Test
    public void testRecheckAbortConditions() {
        WebSecurityPolicy policy = createStandardPolicy();
        YouTubeCancelRoute route = new YouTubeCancelRoute();
        GuideStep intermediate = createIntermediateStep("STEP_1", true);
        TargetResolution visibleResolution = createVisibleResolution("다음", "button.next");

        assertFalse("Different host/URL from allowed policy fails",
                AutoAdvancer.isEligibleForAutoTap(
                        intermediate, visibleResolution, "https://evil.com/page",
                        policy, route, false, false, false, 0,
                        new HashSet<>(), new HashSet<>()
                ));

        assertFalse("Max session auto-taps exceeded fails",
                AutoAdvancer.isEligibleForAutoTap(
                        intermediate, visibleResolution, "https://www.youtube.com/paid_memberships",
                        policy, route, false, false, false, AutoAdvancer.MAX_SESSION_AUTO_TAPS,
                        new HashSet<>(), new HashSet<>()
                ));

        assertFalse("Guide paused fails",
                AutoAdvancer.isEligibleForAutoTap(
                        intermediate, visibleResolution, "https://www.youtube.com/paid_memberships",
                        policy, route, false, true, false, 0,
                        new HashSet<>(), new HashSet<>()
                ));

        assertFalse("Popup open fails",
                AutoAdvancer.isEligibleForAutoTap(
                        intermediate, visibleResolution, "https://www.youtube.com/paid_memberships",
                        policy, route, true, false, false, 0,
                        new HashSet<>(), new HashSet<>()
                ));
    }

    @Test
    public void testStaleRectResetOnOutOfBoundsTouch() {
        YouTubeCancelRoute route = new YouTubeCancelRoute();
        SuccessDetector detector = new SuccessDetector(route);

        assertFalse("Null target rect must never register final step tap",
                detector.checkAndMarkFinalStepTapped(150f, 250f, null));
        assertFalse("Detector remains untapped when rect is null",
                detector.isFinalStepTappedByUser());

        RectF refreshed = new RectF();
        refreshed.left = 100f; refreshed.top = 200f; refreshed.right = 300f; refreshed.bottom = 260f;
        assertTrue("Touch inside freshly mapped rect marks final step tapped",
                detector.checkAndMarkFinalStepTapped(150f, 230f, refreshed));
        assertTrue(detector.isFinalStepTappedByUser());
    }

    @Test
    public void testRouteSuccessSignalsConfigured() {
        NetflixCancelRoute netflix = new NetflixCancelRoute();
        assertNotNull(netflix.getSuccessUrlPatterns());
        assertFalse("Netflix should have success URL pattern", netflix.getSuccessUrlPatterns().isEmpty());
        assertNotNull(netflix.getSuccessTextMatches());
        assertTrue("Netflix success text matches must contain Korean and English phrases",
                netflix.getSuccessTextMatches().contains("해지가 완료")
                        && netflix.getSuccessTextMatches().contains("Your membership has been cancelled"));

        YouTubeCancelRoute yt = new YouTubeCancelRoute();
        assertNotNull(yt.getSuccessUrlPatterns());
        assertFalse("YouTube should have success URL pattern", yt.getSuccessUrlPatterns().isEmpty());
        assertTrue("YouTube success text matches must contain Korean and English phrases",
                yt.getSuccessTextMatches().contains("해지가 완료")
                        && yt.getSuccessTextMatches().contains("Membership cancelled"));

        NaverCancelGuideRoute naver = new NaverCancelGuideRoute();
        assertNotNull(naver.getSuccessUrlPatterns());
        assertFalse("Naver should have success URL pattern", naver.getSuccessUrlPatterns().isEmpty());
        assertTrue("Naver success text matches must contain Korean and English phrases",
                naver.getSuccessTextMatches().contains("해지가 완료")
                        && naver.getSuccessTextMatches().contains("Your membership has been cancelled"));
    }
}
