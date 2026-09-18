package com.submate.app.webguide.services.naver;

import android.net.Uri;
import android.webkit.WebView;

import com.submate.app.webguide.WebSecurityPolicy;
import com.submate.app.webguide.state.PageState;

public final class NaverPageStateResolver {
    public interface Callback {
        void onResolved(PageState pageState);
    }

    private NaverPageStateResolver() {}

    public static void resolve(WebView webView, Callback callback) {
        if (callback == null) return;
        PageState base = resolve(webView == null ? null : webView.getUrl());
        if (webView == null || base != PageState.CANCELLATION_ENTRY) {
            callback.onResolved(base);
            return;
        }

        final String expectedUrl = webView.getUrl();
        String script = "(function(){try{"
                + "var fold=document.getElementById('cancelFoldBtn');"
                + "var finalButton=document.getElementById('cancelBtn');"
                + "if(!fold||!finalButton)return false;"
                + "if(fold.getAttribute('aria-expanded')!=='true')return false;"
                + "var r=finalButton.getBoundingClientRect();var s=getComputedStyle(finalButton);"
                + "return !!(r&&r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&parseFloat(s.opacity||'1')>0);"
                + "}catch(e){return false;}})()";
        webView.evaluateJavascript(script, raw -> {
            if (webView == null || !same(expectedUrl, webView.getUrl())) {
                callback.onResolved(resolve(webView == null ? null : webView.getUrl()));
                return;
            }
            callback.onResolved("true".equals(raw)
                    ? PageState.FINAL_CANCEL_CONFIRM
                    : base);
        });
    }

    public static PageState resolve(String rawUrl) {
        if (rawUrl == null || rawUrl.trim().isEmpty()) return PageState.UNSUPPORTED_PAGE;
        try {
            Uri uri = Uri.parse(rawUrl);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
            String host = WebSecurityPolicy.normalizeHost(uri.getHost());
            String path = uri.getPath() == null ? "" : uri.getPath().toLowerCase();

            if (!"https".equals(scheme)) return PageState.UNSUPPORTED_PAGE;

            if ("help.naver.com".equals(host)
                    && "/service/23168/contents/13775".equals(path)) {
                return PageState.CANCELLATION_HELP;
            }

            if (!"nid.naver.com".equals(host)) return PageState.UNSUPPORTED_PAGE;

            if (path.contains("nidlogin.login") || path.contains("/login") || path.contains("/nidlogin")) {
                return PageState.LOGIN;
            }

            // Live-observed non-subscriber redirect target.
            if ("/membership/join".equals(path)) {
                return PageState.MEMBERSHIP_JOIN;
            }

            // Live-observed subscriber "My Membership" route.
            if ("/membership/my".equals(path)) {
                return PageState.MY_MEMBERSHIP;
            }

            // Live-observed subscriber membership settings route.
            if ("/membership/settings".equals(path)) {
                return PageState.MEMBERSHIP_SETTINGS;
            }

            // Live-observed subscriber membership management and cancellation-check route.
            if ("/membership/subscribe".equals(path)) {
                String mode = uri.getQueryParameter("m");
                if ("checkCancel".equals(mode)) {
                    return PageState.CANCELLATION_ENTRY;
                }
                return PageState.MEMBERSHIP_MANAGEMENT;
            }

            // Other subscriber-only states remain intentionally unclassified until live verification.
            if (path.startsWith("/membership/")) {
                return PageState.MEMBERSHIP;
            }

            return PageState.OTHER_NAVER_PAGE;
        } catch (Exception ignored) {
            return PageState.UNSUPPORTED_PAGE;
        }
    }

    private static boolean same(String left, String right) {
        if (left == null) return right == null;
        return left.equals(right);
    }
}

