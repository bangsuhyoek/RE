import { Capacitor } from "@capacitor/core";

let installed = false;

export function installApiBaseFetchBridge() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const base = String(import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (!base || !Capacitor.isNativePlatform()) return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      return originalFetch(`${base}${input}`, init);
    }
    if (input instanceof Request) {
      const url = new URL(input.url, window.location.href);
      if (url.pathname.startsWith("/api/") && url.origin === window.location.origin) {
        const target = new Request(`${base}${url.pathname}${url.search}`, input);
        return originalFetch(target, init);
      }
    }
    return originalFetch(input, init);
  };
}
