package com.submate.app.webguide;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.net.Uri;

import com.submate.app.webguide.declarative.DeclarativeCancelRoute;
import com.submate.app.webguide.declarative.DeclarativeStep;
import com.submate.app.webguide.services.naver.NaverCancelGuideRoute;
import com.submate.app.webguide.services.naver.NaverMonthlyCancelRoute;
import com.submate.app.webguide.services.netflix.NetflixCancelRoute;
import com.submate.app.webguide.services.universal.UniversalCancelRoute;
import com.submate.app.webguide.services.youtube.YouTubeCancelRoute;
import com.submate.app.webguide.state.GuideState;
import com.submate.app.webguide.state.PageState;
import com.submate.app.webguide.target.GuideStep;
import com.submate.app.webguide.target.TargetResolver;

import org.junit.Test;

import java.util.concurrent.atomic.AtomicReference;

public class DeclarativeRouteTest {

    @Test
    public void testRegistryLookup() {
        CancelGuideRoute netflix = CancelRouteRegistry.findRoute("netflix", "Netflix");
        assertNotNull("Netflix route must be registered", netflix);
        assertEquals("netflix", netflix.getServiceId());

        CancelGuideRoute youtube = CancelRouteRegistry.findRoute("youtube", "YouTube Premium");
        assertNotNull("YouTube route must be registered", youtube);
        assertEquals("youtube", youtube.getServiceId());

        CancelGuideRoute naverplus = CancelRouteRegistry.findRoute("naverplus", "네이버플러스 멤버십");
        assertNotNull("NaverPlus route must be registered", naverplus);
        assertEquals("naverplus", naverplus.getServiceId());

        CancelGuideRoute naver = CancelRouteRegistry.findRoute("naver", "네이버");
        assertNotNull("Naver route alias must be registered", naver);

        CancelGuideRoute unsupported = CancelRouteRegistry.findRoute("spotify", "Spotify");
        assertNull("Unregistered service must return null route", unsupported);

        // resolveRoute must return UniversalCancelRoute for any service in the catalog
        String stepsJson = "[{\"stepNumber\":1,\"title\":\"계정\",\"description\":\"[구독 관리]에서 [구독 취소]를 누르세요.\"}]";
        CancelGuideRoute universalSpotify = CancelRouteRegistry.resolveRoute(
                "spotify", "Spotify", "https://www.spotify.com/kr-ko/account/subscription/", stepsJson);
        assertNotNull("resolveRoute must return UniversalCancelRoute for Spotify", universalSpotify);
        assertEquals("spotify", universalSpotify.getServiceId());
        assertTrue(universalSpotify.getSecurityPolicy().isAllowedForInjection("https://www.spotify.com/kr-ko/account/subscription/"));
        assertTrue(universalSpotify instanceof UniversalCancelRoute);
        UniversalCancelRoute uRoute = (UniversalCancelRoute) universalSpotify;
        assertTrue(uRoute.getCustomStepHints().contains("구독 관리"));
        assertTrue(uRoute.getCustomStepHints().contains("구독 취소"));
    }

    @Test
    public void testNetflixUrlMatchingPicksRightStep() {
        NetflixCancelRoute route = new NetflixCancelRoute();

        DeclarativeStep step = route.matchStep("https://www.netflix.com/cancelplan");
        assertNotNull("Netflix cancelplan URL should match final step", step);
        assertEquals(NetflixCancelRoute.STEP_FINAL, step.getId());
        assertTrue("Netflix final step must have userMustTap = true", step.isUserMustTap());
        assertTrue("Text matches must contain Korean and English variants",
                step.getTextMatches().contains("멤버십 해지 완료") && step.getTextMatches().contains("Finish Cancellation"));

        // Korean locale path
        DeclarativeStep koStep = route.matchStep("https://www.netflix.com/kr/cancelplan");
        assertNotNull(koStep);
        assertEquals(NetflixCancelRoute.STEP_FINAL, koStep.getId());

        // Unrelated URL should not match
        DeclarativeStep browse = route.matchStep("https://www.netflix.com/browse");
        assertNull(browse);
    }

    @Test
    public void testYouTubeUrlMatchingPicksRightSteps() {
        YouTubeCancelRoute route = new YouTubeCancelRoute();

        // Step 1: Manage
        DeclarativeStep step1 = route.matchStep("https://www.youtube.com/paid_memberships");
        assertNotNull("YouTube entry should match step 1", step1);
        assertEquals(YouTubeCancelRoute.STEP_MANAGE, step1.getId());
        assertFalse("Step 1 should not have userMustTap", step1.isUserMustTap());

        // Step 2: Deactivate
        DeclarativeStep step2 = route.matchStep("https://www.youtube.com/paid_memberships?action=deactivate");
        assertNotNull("Deactivate URL should match step 2", step2);
        assertEquals(YouTubeCancelRoute.STEP_DEACTIVATE, step2.getId());
        assertFalse("Step 2 should not have userMustTap", step2.isUserMustTap());

        // Step 3: Confirm final cancel
        DeclarativeStep step3 = route.matchStep("https://www.youtube.com/paid_memberships?action=confirm");
        assertNotNull("Confirm URL should match step 3", step3);
        assertEquals(YouTubeCancelRoute.STEP_CONFIRM, step3.getId());
        assertTrue("YouTube final step must have userMustTap = true", step3.isUserMustTap());
    }

    @Test
    public void testFinalStepHasUserMustTap() {
        NetflixCancelRoute netflix = new NetflixCancelRoute();
        DeclarativeStep netflixFinal = netflix.getSteps().get(netflix.getSteps().size() - 1);
        assertTrue("Netflix final step must have userMustTap", netflixFinal.isUserMustTap());

        YouTubeCancelRoute yt = new YouTubeCancelRoute();
        DeclarativeStep ytFinal = yt.getSteps().get(yt.getSteps().size() - 1);
        assertTrue("YouTube final step must have userMustTap", ytFinal.isUserMustTap());

        // Naver monthly final confirm step must NOT be userMustTap (keeps original behavior & text)
        GuideStep naverFinal = NaverMonthlyCancelRoute.currentStep(PageState.FINAL_CANCEL_CONFIRM);
        assertNotNull(naverFinal);
        assertFalse("Naver final confirm step must NOT have userMustTap", naverFinal.isUserMustTap());
        assertEquals("\uD574\uC9C0\uD558\uAE30\uB97C \uB204\uB974\uC138\uC694.", naverFinal.getInstruction());
    }

    @Test
    public void testDeclarativeStepLogicalStateAllowsRestore() {
        NetflixCancelRoute netflix = new NetflixCancelRoute();
        DeclarativeStep netflixFinal = netflix.getSteps().get(0);
        GuideStep guideStep = netflixFinal.toGuideStep(1, 1);
        assertNotNull("DeclarativeStep must assign a logical PageState", guideStep.getLogicalPageState());
        assertFalse("Logical PageState must not be UNSUPPORTED_PAGE",
                guideStep.getLogicalPageState() == PageState.UNSUPPORTED_PAGE);
        assertEquals(GuideState.TALKING,
                com.submate.app.webguide.services.naver.NaverMembershipGuide.guideStateFor(guideStep.getLogicalPageState()));
    }

    @Test
    public void testLoginUrlDetectionPausesGuide() {
        NetflixCancelRoute netflix = new NetflixCancelRoute();
        assertTrue("Netflix login URL must be recognized",
                netflix.isLoginUrl("https://www.netflix.com/login"));
        assertTrue("Netflix localized login URL must be recognized",
                netflix.isLoginUrl("https://www.netflix.com/kr/login"));

        YouTubeCancelRoute yt = new YouTubeCancelRoute();
        assertTrue("Google accounts login must be recognized",
                yt.isLoginUrl("https://accounts.google.com/signin/v2/identifier"));
        assertTrue("YouTube signin URL must be recognized",
                yt.isLoginUrl("https://www.youtube.com/signin?action=handle_signin"));
        assertFalse("Regular video URL is not login",
                yt.isLoginUrl("https://www.youtube.com/watch?v=12345"));
    }

    @Test
    public void testStaticCheckNoClickOrDispatchEventInInjectedScript() {
        String script = TargetResolver.getInjectedScriptForTesting("{}");
        assertNotNull("Injected script should be generated", script);
        assertFalse("Injected script MUST NEVER call click()", script.contains("click("));
        assertFalse("Injected script MUST NEVER call dispatchEvent()", script.contains("dispatchEvent"));
    }


    @Test
    public void testGracefulFallbackFlag() {
        NetflixCancelRoute netflix = new NetflixCancelRoute();
        assertTrue("Declarative routes must enable graceful fallback when target not found",
                netflix.isGracefulFallbackOnTargetNotFound());

        YouTubeCancelRoute yt = new YouTubeCancelRoute();
        assertTrue("YouTube declarative route must enable graceful fallback",
                yt.isGracefulFallbackOnTargetNotFound());

        NaverCancelGuideRoute naver = new NaverCancelGuideRoute();
        assertFalse("Naver verified route maintains strict live verification without graceful unverified fallback",
                naver.isGracefulFallbackOnTargetNotFound());
    }

    @Test
    public void testStepCountsAndNumbering() {
        NetflixCancelRoute netflix = new NetflixCancelRoute();
        assertEquals(1, netflix.getTotalSteps());
        assertEquals(1, netflix.getStepNumber(NetflixCancelRoute.STEP_FINAL));
        assertEquals(0, netflix.getStepNumber("UNKNOWN_STEP"));

        YouTubeCancelRoute yt = new YouTubeCancelRoute();
        assertEquals(3, yt.getTotalSteps());
        assertEquals(1, yt.getStepNumber(YouTubeCancelRoute.STEP_MANAGE));
        assertEquals(2, yt.getStepNumber(YouTubeCancelRoute.STEP_DEACTIVATE));
        assertEquals(3, yt.getStepNumber(YouTubeCancelRoute.STEP_CONFIRM));

        NaverCancelGuideRoute naver = new NaverCancelGuideRoute();
        assertEquals(5, naver.getTotalSteps());
    }

    @Test
    public void testWebSecurityPolicyDomainIsolation() {
        WebSecurityPolicy policy = new WebSecurityPolicy();

        // Service domains allowed for injection
        assertTrue("naver.com allowed for injection",
                policy.isAllowedForInjection("https://nid.naver.com/membership/my"));
        assertTrue("netflix.com allowed for injection",
                policy.isAllowedForInjection("https://www.netflix.com/cancelplan"));
        assertTrue("youtube.com allowed for injection",
                policy.isAllowedForInjection("https://www.youtube.com/paid_memberships"));

        // accounts.google.com allowed for navigation/login ONLY - NO injection
        assertTrue("accounts.google.com allowed as host for login detection",
                policy.isAllowedHost("https://accounts.google.com/signin"));
        assertFalse("accounts.google.com strictly BLOCKS script injection",
                policy.isAllowedForInjection("https://accounts.google.com/signin"));
        assertTrue("accounts.google.com is classified as navigation only",
                policy.isNavigationOnly("https://accounts.google.com/signin"));

        // Untrusted domain blocked from both
        assertFalse("untrusted domain blocked from injection",
                policy.isAllowedForInjection("https://evil.attacker.com"));
        assertFalse("untrusted domain blocked from host allowlist",
                policy.isAllowedHost("https://evil.attacker.com"));
    }
}

