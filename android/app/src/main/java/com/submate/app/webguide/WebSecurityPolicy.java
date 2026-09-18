package com.submate.app.webguide;

import android.net.Uri;

import java.util.List;
import java.util.Locale;

public final class WebSecurityPolicy {
    private final List<String> allowedDomains;

    public WebSecurityPolicy(List<String> allowedDomains) {
        this.allowedDomains = allowedDomains;
    }

    public boolean isAllowedHttpUrl(Uri uri) {
        if (uri == null) return false;
        String scheme = safeLower(uri.getScheme());
        if (!"https".equals(scheme)) return false;
        return isAllowedHost(uri);
    }

    public boolean isAllowedHost(Uri uri) {
        if (uri == null) return false;
        String host = normalizeHost(uri.getHost());
        if (host.isEmpty()) return false;
        for (String allowed : allowedDomains) {
            String normalized = normalizeHost(allowed);
            if (host.equals(normalized) || host.endsWith("." + normalized)) {
                return true;
            }
        }
        return false;
    }

    public boolean isHttpOrHttps(Uri uri) {
        if (uri == null) return false;
        String scheme = safeLower(uri.getScheme());
        return "http".equals(scheme) || "https".equals(scheme);
    }

    public static String normalizeHost(String host) {
        if (host == null) return "";
        String value = host.trim().toLowerCase(Locale.ROOT);
        if (value.startsWith("https://")) value = value.substring(8);
        if (value.startsWith("http://")) value = value.substring(7);
        int slash = value.indexOf('/');
        if (slash >= 0) value = value.substring(0, slash);
        while (value.endsWith(".")) value = value.substring(0, value.length() - 1);
        return value;
    }

    public static String safeOriginLabel(Uri uri) {
        if (uri == null) return "unknown";
        String scheme = safeLower(uri.getScheme());
        String host = normalizeHost(uri.getHost());
        if (host.isEmpty()) return scheme.isEmpty() ? "unknown" : scheme + ":";
        return scheme + "://" + host;
    }

    private static String safeLower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }
}
