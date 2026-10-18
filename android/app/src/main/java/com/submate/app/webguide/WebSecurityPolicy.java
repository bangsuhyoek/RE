package com.submate.app.webguide;

import android.net.Uri;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

public final class WebSecurityPolicy {
    public static final List<String> DEFAULT_INJECTION_DOMAINS =
            Collections.unmodifiableList(Arrays.asList("naver.com", "netflix.com", "youtube.com"));

    public static final List<String> DEFAULT_NAVIGATION_ONLY_DOMAINS =
            Collections.unmodifiableList(Arrays.asList("accounts.google.com"));

    private final List<String> allowedDomains;
    private final List<String> navigationOnlyDomains;

    public WebSecurityPolicy() {
        this(DEFAULT_INJECTION_DOMAINS, DEFAULT_NAVIGATION_ONLY_DOMAINS);
    }

    public WebSecurityPolicy(List<String> allowedDomains) {
        this(allowedDomains, Collections.emptyList());
    }

    public WebSecurityPolicy(List<String> allowedDomains, List<String> navigationOnlyDomains) {
        this.allowedDomains = allowedDomains != null ? new ArrayList<>(allowedDomains) : new ArrayList<>();
        this.navigationOnlyDomains = navigationOnlyDomains != null ? new ArrayList<>(navigationOnlyDomains) : new ArrayList<>();
    }

    public boolean isAllowedHttpUrl(Uri uri) {
        if (uri == null) return false;
        try {
            return isAllowedHttpUrl(uri.toString());
        } catch (Exception ignored) {
            return isAllowedForInjection(safeLower(uri.getScheme()), normalizeHost(uri.getHost()));
        }
    }

    public boolean isAllowedHttpUrl(String url) {
        return isAllowedForInjection(url);
    }

    public boolean isAllowedForInjection(Uri uri) {
        if (uri == null) return false;
        try {
            return isAllowedForInjection(uri.toString());
        } catch (Exception ignored) {
            return isAllowedForInjection(safeLower(uri.getScheme()), normalizeHost(uri.getHost()));
        }
    }

    public boolean isAllowedForInjection(String url) {
        if (url == null) return false;
        String scheme = extractScheme(url);
        String host = normalizeHost(url);
        return isAllowedForInjection(scheme, host);
    }

    private boolean isAllowedForInjection(String scheme, String host) {
        if (!"https".equals(scheme)) return false;
        return matchesDomainList(host, allowedDomains);
    }

    public boolean isAllowedHost(Uri uri) {
        if (uri == null) return false;
        try {
            return isAllowedHost(uri.toString());
        } catch (Exception ignored) {
            return isAllowedHost(normalizeHost(uri.getHost()));
        }
    }

    public boolean isAllowedHost(String hostOrUrl) {
        if (hostOrUrl == null) return false;
        String host = normalizeHost(hostOrUrl);
        return matchesDomainList(host, allowedDomains) || matchesDomainList(host, navigationOnlyDomains);
    }

    public boolean isNavigationOnly(Uri uri) {
        if (uri == null) return false;
        try {
            return isNavigationOnly(uri.toString());
        } catch (Exception ignored) {
            return isNavigationOnly(normalizeHost(uri.getHost()));
        }
    }

    public boolean isNavigationOnly(String hostOrUrl) {
        if (hostOrUrl == null) return false;
        String host = normalizeHost(hostOrUrl);
        return !matchesDomainList(host, allowedDomains) && matchesDomainList(host, navigationOnlyDomains);
    }

    private static boolean matchesDomainList(String host, List<String> domainList) {
        if (host == null || host.isEmpty() || domainList == null) return false;
        for (String allowed : domainList) {
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

    public boolean isHttpOrHttps(String url) {
        if (url == null) return false;
        String scheme = extractScheme(url);
        return "http".equals(scheme) || "https".equals(scheme);
    }

    public static String normalizeHost(String host) {
        if (host == null) return "";
        String value = host.trim().toLowerCase(Locale.ROOT);
        if (value.startsWith("https://")) value = value.substring(8);
        if (value.startsWith("http://")) value = value.substring(7);
        int slash = value.indexOf('/');
        if (slash >= 0) value = value.substring(0, slash);
        int colon = value.indexOf(':');
        if (colon >= 0) value = value.substring(0, colon);
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

    public static String safeOriginLabel(String url) {
        if (url == null) return "unknown";
        String scheme = extractScheme(url);
        String host = normalizeHost(url);
        if (host.isEmpty()) return scheme.isEmpty() ? "unknown" : scheme + ":";
        return scheme + "://" + host;
    }

    private static String extractScheme(String url) {
        if (url == null) return "";
        int colon = url.indexOf(':');
        if (colon > 0) return url.substring(0, colon).trim().toLowerCase(Locale.ROOT);
        return "";
    }

    private static String safeLower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }
}
