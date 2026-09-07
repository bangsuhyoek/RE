import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

export const PAGE_TITLES = {
  home: "SubMate",
  subscriptions: "구독 목록",
  calendar: "결제 캘린더",
  promotions: "혜택",
  detail: "구독 상세",
};

export const readHash = () => {
  if (typeof window === "undefined") {
    return { route: "home", id: null, params: new URLSearchParams() };
  }
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [routeAndId, queryPart] = raw.split("?");
  const parts = (routeAndId || "").split("/");
  const route = parts[0] || "home";
  const id = parts.slice(1).join("/") || null;
  const params = new URLSearchParams(queryPart || "");
  return { route: route || "home", id: id ? decodeURIComponent(id) : null, params };
};

export function useNavigation({ initialRoute = "home", onHashParamAction } = {}) {
  const [screen, setScreen] = useState(() => {
    const initial = readHash();
    if (initial.route) return initial;
    return { route: initialRoute, id: null, params: new URLSearchParams() };
  });

  const [highlightCancelId, setHighlightCancelId] = useState(() => {
    const initial = readHash();
    if (initial.params?.get("highlight") === "cancel") {
      return initial.id || "seed-spotify";
    }
    return null;
  });

  const navigate = useCallback((route, id = null) => {
    const hash = id ? `#/${route}/${encodeURIComponent(id)}` : `#/${route}`;
    if (typeof window !== "undefined") {
      if (window.location.hash === hash) {
        setScreen({ route, id, params: new URLSearchParams() });
      } else {
        window.location.hash = hash;
      }
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const next = readHash();
      if (next.route) setScreen(next);

      if (next.params?.get("highlight") === "cancel") {
        setHighlightCancelId(next.id || "seed-spotify");
      }

      if (onHashParamAction) {
        onHashParamAction(next);
      }
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [onHashParamAction]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [screen]);

  const hasAppChrome = !["login", "register", "onboarding"].includes(screen.route);

  return {
    screen,
    setScreen,
    navigate,
    highlightCancelId,
    setHighlightCancelId,
    hasAppChrome,
    pageTitle: PAGE_TITLES[screen.route] || "SubMate",
  };
}
