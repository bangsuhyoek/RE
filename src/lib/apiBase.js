/**
 * API Base URL resolution for Web and Hybrid App (Capacitor)
 * - In Web: VITE_API_BASE_URL is optional (defaults to empty string, same-origin relative URL '/api/...')
 * - In Mobile App: Capacitor runs on capacitor://localhost or https://localhost,
 *   so it MUST point to the deployed backend URL (e.g. https://submate.vercel.app).
 */
import { Capacitor } from "@capacitor/core";

export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export function isNativePlatform() {
  try {
    return typeof Capacitor !== "undefined" && typeof Capacitor.isNativePlatform === "function" && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getApiEndpoint(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE_URL) {
    if (isNativePlatform()) {
      console.warn("[꾸독] 모바일 앱 환경에서 VITE_API_BASE_URL이 비어 있습니다. 배포된 백엔드 서버 URL이 필요합니다.");
    }
    return normalizedPath;
  }
  return `${API_BASE_URL}${normalizedPath}`;
}
