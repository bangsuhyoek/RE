package com.submate.app.webguide;

import com.submate.app.webguide.services.naver.NaverCancelGuideRoute;
import com.submate.app.webguide.services.netflix.NetflixCancelRoute;
import com.submate.app.webguide.services.youtube.YouTubeCancelRoute;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public final class CancelRouteRegistry {
    private static final Map<String, CancelGuideRoute> ROUTES = new HashMap<>();

    static {
        CancelGuideRoute naver = new NaverCancelGuideRoute();
        CancelGuideRoute netflix = new NetflixCancelRoute();
        CancelGuideRoute youtube = new YouTubeCancelRoute();

        ROUTES.put("naverplus", naver);
        ROUTES.put("naver", naver);
        ROUTES.put("netflix", netflix);
        ROUTES.put("youtube", youtube);
    }

    private CancelRouteRegistry() {}

    public static CancelGuideRoute getRoute(String serviceId) {
        if (serviceId == null) return null;
        return ROUTES.get(serviceId.trim().toLowerCase());
    }

    public static CancelGuideRoute findRoute(String serviceId, String serviceName) {
        String sid = serviceId == null ? "" : serviceId.trim().toLowerCase();
        if (ROUTES.containsKey(sid)) {
            return ROUTES.get(sid);
        }
        String sname = serviceName == null ? "" : serviceName.replace(" ", "").toLowerCase();
        if (sid.contains("netflix") || sname.contains("넷플릭스")) {
            return ROUTES.get("netflix");
        }
        if (sid.contains("youtube") || sname.contains("유튜브")) {
            return ROUTES.get("youtube");
        }
        if (sid.contains("naver") || sname.contains("네이버")) {
            return ROUTES.get("naverplus");
        }
        return null;
    }

    public static boolean isSupported(String serviceId, String serviceName) {
        return findRoute(serviceId, serviceName) != null;
    }

    public static Map<String, CancelGuideRoute> getAllRoutes() {
        return Collections.unmodifiableMap(ROUTES);
    }
}

