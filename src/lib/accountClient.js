import { getApiEndpoint } from "./apiBase.js";
import { storageKeys } from "./storage.js";

/**
 * 기기에 보관된 로컬 캐시, 설정, 세션 데이터를 모두 영구 삭제합니다.
 */
export function clearDeviceData(storage = null) {
  const store = storage || (typeof window !== "undefined" ? window.localStorage : null);
  if (store) {
    try {
      const keysToRemove = new Set(Object.values(storageKeys));

      // 접두어로 시작하는 모든 로컬 스토리지 키 식별
      if (typeof store.length === "number") {
        for (let i = 0; i < store.length; i++) {
          const key = store.key(i);
          if (
            key &&
            (key.startsWith("submate") ||
              key.startsWith("sb-") ||
              key.includes("submate"))
          ) {
            keysToRemove.add(key);
          }
        }
      }

      for (const key of keysToRemove) {
        try {
          store.removeItem(key);
        } catch {
          // 개별 키 삭제 실패 무시
        }
      }
    } catch (err) {
      console.warn("clearDeviceData warning:", err);
    }
  }

  // sessionStorage 정리
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.clear();
    } catch {
      // 무시
    }
  }
}

/**
 * 서버에 회원 탈퇴 요청을 보냅니다 (POST /api/account-delete)
 */
export async function requestAccountDeletion({ token, confirmation = "탈퇴" } = {}) {
  if (!token) {
    const err = new Error("인증 토큰이 필요합니다.");
    err.code = "AUTH_REQUIRED";
    throw err;
  }

  const endpoint = getApiEndpoint("/api/account-delete");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ confirmation }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const err = new Error(data.message || "회원 탈퇴 요청이 실패했습니다.");
    err.code = data.code || `HTTP_${response.status}`;
    err.status = response.status;
    throw err;
  }

  return { ok: true, message: data.message };
}
