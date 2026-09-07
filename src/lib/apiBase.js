/**
 * API Base URL resolution for Web and Hybrid App (Capacitor)
 * - In Web: VITE_API_BASE_URL is optional (defaults to empty string, same-origin relative URL '/api/...')
 * - In Mobile App: Capacitor runs on capacitor://localhost or https://localhost,
 *   so it MUST point to the deployed backend URL (e.g. https://submate.vercel.app).
 */

export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export function getApiEndpoint(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE_URL) {
    return normalizedPath;
  }
  return `${API_BASE_URL}${normalizedPath}`;
}
