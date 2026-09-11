import { useEffect, useState, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { readStoredValue, storageKeys } from "../lib/storage.js";

export const PAGE_TITLES = {
  home: "꾸독",
  landing: "꾸독",
  subscriptions: "구독 목록",
  calendar: "결제 캘린더",
  promotions: "혜택",
  detail: "구독 상세",
};

export const readHash = () => {
  if (typeof window === "undefined") {
    return { route: "", id: null, params: new URLSearchParams() };
  }
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [routeAndId, queryPart] = raw.split("?");
  const parts = (routeAndId || "").split("/");
  const route = parts[0] || "";
  const id = parts.slice(1).join("/") || null;
  const params = new URLSearchParams(queryPart || "");
  return { route, id: id ? decodeURIComponent(id) : null, params };
};

export function useNavigation({ initialRoute, onHashParamAction } = {}) {
  const getFallbackRoute = useCallback(() => {
    const storedProfile = typeof window !== "undefined" ? readStoredValue(storageKeys.profile, null) : null;
    if (!storedProfile || storedProfile.guest || storedProfile.provider === "Guest") {
      return "login";
    }
    return "home";
  }, []);

  const [screen, setScreen] = useState(() => {
    const initial = readHash();
    if (initial.route) return initial;
    const defaultRoute = initialRoute || getFallbackRoute();
    return { route: defaultRoute, id: null, params: new URLSearchParams() };
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

  const actionRef = useRef(onHashParamAction);
  actionRef.current = onHashParamAction;

  useEffect(() => {
    const onHashChange = () => {
      const next = readHash();
      if (next.route) {
        setScreen(next);
      } else {
        setScreen({ route: getFallbackRoute(), id: null, params: next.params });
      }

      if (next.params?.get("highlight") === "cancel") {
        setHighlightCancelId(next.id || "seed-spotify");
      }

      if (actionRef.current) {
        actionRef.current(next);
      }
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [getFallbackRoute]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [screen]);

  const hasAppChrome = !["login", "register", "onboarding", "landing"].includes(screen.route);

  return {
    screen,
    setScreen,
    navigate,
    highlightCancelId,
    setHighlightCancelId,
    hasAppChrome,
    pageTitle: PAGE_TITLES[screen.route] || "꾸독",
  };
}
