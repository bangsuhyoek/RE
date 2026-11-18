import { getApiEndpoint } from "./apiBase.js";
import { GUEST_PARTITION, setActiveOwnerPartition, storageKeys } from "./storage.js";

/**
 * 기기에 보관된 로컬 캐시, 설정, 세션 데이터를 모두 영구 삭제합니다.
 */
export function clearDeviceData(storage = null, { preserveKeys = [] } = {}) {
  const preserve = new Set(Array.isArray(preserveKeys) ? preserveKeys : []);
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
        if (preserve.has(key)) continue;
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
 * 서버 탈퇴 성공(또는 게스트 탈퇴) 후 기기 내 민감 데이터·세션·알림을 정리합니다.
 * 일부 로컬 정리가 실패해도 예외를 전파하지 않고 로그인 화면 복귀를 보장하며,
 * IndexedDB 증빙 삭제 실패 시 cancelProofWipePending을 보존해 다음 실행에서 재정리합니다.
 */
export async function completeLocalAccountDeletion({
  userId = null,
  signOutLocal = null,
  clearProofs,
  cancelNotifications,
  clearBrowserSession,
  clearUserScope,
  clearStorage = clearDeviceData,
  resetActivePartition = () => setActiveOwnerPartition(GUEST_PARTITION),
} = {}) {
  if (userId && typeof signOutLocal === "function") {
    try {
      await signOutLocal();
    } catch (err) {
      console.warn("Local signOut during account deletion failed:", err);
    }
  }

  const [proofResult, notifResult, browserResult] = await Promise.allSettled([
    typeof clearProofs === "function" ? clearProofs(userId || "guest") : Promise.resolve(true),
    typeof cancelNotifications === "function" ? cancelNotifications() : Promise.resolve(true),
    typeof clearBrowserSession === "function" ? clearBrowserSession() : Promise.resolve(),
  ]);

  const proofsCleared = proofResult.status === "fulfilled" && proofResult.value === true;
  const notificationsCleared = notifResult.status === "fulfilled" && notifResult.value !== false;
  const browserCleared = browserResult.status === "fulfilled";

  if (!proofsCleared) console.warn("Could not clear all local cancel proofs during account deletion.");
  if (!notificationsCleared) console.warn("Could not cancel all local notifications during account deletion.");
  if (!browserCleared) console.warn("Could not clear cancel browser session during account deletion.");

  if (typeof resetActivePartition === "function") {
    try {
      resetActivePartition();
    } catch (err) {
      console.warn("resetActivePartition failed during account deletion:", err);
    }
  }

  if (userId && typeof clearUserScope === "function") {
    try {
      clearUserScope(userId);
    } catch (err) {
      console.warn("clearUserScope failed during account deletion:", err);
    }
  }

  clearStorage(null, {
    preserveKeys: proofsCleared ? [] : [storageKeys.cancelProofWipePending],
  });

  return {
    ok: proofsCleared && notificationsCleared && browserCleared,
    proofsCleared,
    notificationsCleared,
    browserCleared,
  };
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
