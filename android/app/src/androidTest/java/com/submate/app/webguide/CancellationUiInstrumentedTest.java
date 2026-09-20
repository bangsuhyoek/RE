package com.submate.app.webguide;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.app.Activity;
import android.content.Intent;
import android.view.View;
import android.webkit.WebView;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.submate.app.CancelBrowserActivity;
import com.submate.app.R;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
public class CancellationUiInstrumentedTest {

    @Test
    public void blocksUnexpectedMainFrameUrlOnRealActivity() {
        Intent intent = new Intent(
                InstrumentationRegistry.getInstrumentation().getTargetContext(),
                CancelBrowserActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.putExtra("serviceId", "netflix");
        intent.putExtra("serviceName", "Netflix");
        intent.putExtra("cancelUrl", "https://evil.example/cancel");
        intent.putExtra("allowedDomainsJson", "[\"netflix.com\"]");
        intent.putExtra("guideMode", "MANUAL_OFFICIAL");
        intent.putExtra("guideStepsJson", "[]");

        Activity activity = InstrumentationRegistry.getInstrumentation().startActivitySync(intent);
        try {
            TextView badge = activity.findViewById(R.id.tvStepBadge);
            TextView description = activity.findViewById(R.id.tvStepDescription);
            assertEquals("안전 확인", String.valueOf(badge.getText()));
            assertTrue(String.valueOf(description.getText()).contains("공식 사이트 범위를 벗어나"));
        } finally {
            activity.finish();
        }
    }


    @Test
    public void supportedOfficialEntriesOpenInsideAllowedDomains() {
        assertOfficialEntry(
                "naver",
                "Naver Plus",
                "https://nid.naver.com/membership/subscribe",
                "[\"naver.com\"]",
                "AUTO_SEMANTIC");
        assertOfficialEntry(
                "netflix",
                "Netflix",
                "https://www.netflix.com/cancelplan",
                "[\"netflix.com\"]",
                "MANUAL_OFFICIAL");
        assertOfficialEntry(
                "youtube",
                "YouTube Premium",
                "https://www.youtube.com/paid_memberships",
                "[\"youtube.com\",\"accounts.google.com\"]",
                "MANUAL_OFFICIAL");
        assertOfficialEntry(
                "spotify",
                "Spotify",
                "https://www.spotify.com/kr-ko/account/overview/",
                "[\"spotify.com\"]",
                "MANUAL_OFFICIAL");
        assertOfficialEntry(
                "chatgpt",
                "ChatGPT Plus",
                "https://chatgpt.com/",
                "[\"chatgpt.com\",\"auth.openai.com\",\"openai.com\"]",
                "MANUAL_OFFICIAL");
        assertOfficialEntry(
                "coupang",
                "Coupang WOW",
                "https://loyalty.coupang.com/loyalty/management/home",
                "[\"coupang.com\",\"login.coupang.com\",\"loyalty.coupang.com\"]",
                "MANUAL_OFFICIAL");
        assertOfficialEntry(
                "disney",
                "Disney Plus",
                "https://www.disneyplus.com/account/cancel-subscription",
                "[\"disneyplus.com\"]",
                "MANUAL_OFFICIAL");
    }

    private void assertOfficialEntry(
            String serviceId,
            String serviceName,
            String cancelUrl,
            String allowedDomainsJson,
            String guideMode) {
        Intent intent = new Intent(
                InstrumentationRegistry.getInstrumentation().getTargetContext(),
                CancelBrowserActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.putExtra("serviceId", serviceId);
        intent.putExtra("serviceName", serviceName);
        intent.putExtra("cancelUrl", cancelUrl);
        intent.putExtra("allowedDomainsJson", allowedDomainsJson);
        intent.putExtra("guideMode", guideMode);
        intent.putExtra("guideStepsJson",
                "[{\"stepNumber\":1,\"title\":\"Official guide\",\"description\":\"Continue on the official page.\",\"imageUrl\":\"\"}]");

        Activity activity = InstrumentationRegistry.getInstrumentation().startActivitySync(intent);
        try {
            InstrumentationRegistry.getInstrumentation().waitForIdleSync();
            WebView webView = activity.findViewById(R.id.webViewCancel);
            TextView badge = activity.findViewById(R.id.tvStepBadge);
            assertNotNull(webView);
            AtomicReference<String> currentUrl = new AtomicReference<>();
            InstrumentationRegistry.getInstrumentation().runOnMainSync(
                    () -> currentUrl.set(webView.getUrl()));
            assertNotNull(currentUrl.get());
            assertTrue(currentUrl.get().startsWith("https://"));
            assertTrue(!"안전 확인".contentEquals(badge.getText()));
        } finally {
            activity.finish();
            InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        }
    }

    @Test
    public void minimizedConciergeUsesMasterImageAndReopens() throws Exception {
        final GuideOverlayContainer[] holder = new GuideOverlayContainer[1];
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
            GuideOverlayContainer overlay = new GuideOverlayContainer(
                    InstrumentationRegistry.getInstrumentation().getTargetContext());
            overlay.updatePageState(com.submate.app.webguide.state.PageState.LOGIN);
            holder[0] = overlay;
        });

        GuideOverlayContainer overlay = holder[0];
        assertNotNull(overlay);

        Method minimize = GuideOverlayContainer.class.getDeclaredMethod("minimizeGuide");
        minimize.setAccessible(true);
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
            try {
                minimize.invoke(overlay);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });

        Field restoreField = GuideOverlayContainer.class.getDeclaredField("restoreButton");
        restoreField.setAccessible(true);
        ImageView restore = (ImageView) restoreField.get(overlay);
        assertNotNull(restore);
        assertNotNull(restore.getDrawable());
        assertEquals(View.VISIBLE, restore.getVisibility());

        InstrumentationRegistry.getInstrumentation().runOnMainSync(restore::performClick);
        assertEquals(View.GONE, restore.getVisibility());

        Field characterField = GuideOverlayContainer.class.getDeclaredField("characterView");
        characterField.setAccessible(true);
        ImageView character = (ImageView) characterField.get(overlay);
        assertNotNull(character.getDrawable());
        assertEquals(View.VISIBLE, character.getVisibility());
    }
}
