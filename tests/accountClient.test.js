import test from "node:test";
import assert from "node:assert/strict";
import { clearDeviceData, requestAccountDeletion } from "../src/lib/accountClient.js";
import { storageKeys } from "../src/lib/storage.js";

function createMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(k) {
      return store.get(k) ?? null;
    },
    setItem(k, v) {
      store.set(k, String(v));
    },
    removeItem(k) {
      store.delete(k);
    },
    clear() {
      store.clear();
    },
    key(i) {
      return Array.from(store.keys())[i] ?? null;
    },
    get length() {
      return store.size;
    },
  };
}

test("clearDeviceData: submate 접두어 및 storageKeys 관련 로컬 데이터만 모두 제거한다", () => {
  const mockStorage = createMockStorage({
    [storageKeys.subscriptions]: JSON.stringify([{ id: "s1" }]),
    [storageKeys.profile]: JSON.stringify({ nickname: "테스트" }),
    "submate.cancelAiConsent.v1": "granted",
    "submate:chat-history:user1": "[]",
    "sb-my-token": "supabase-secret",
    "other_app_key": "do_not_touch",
  });

  clearDeviceData(mockStorage);

  assert.equal(mockStorage.getItem(storageKeys.subscriptions), null);
  assert.equal(mockStorage.getItem(storageKeys.profile), null);
  assert.equal(mockStorage.getItem("submate.cancelAiConsent.v1"), null);
  assert.equal(mockStorage.getItem("submate:chat-history:user1"), null);
  assert.equal(mockStorage.getItem("sb-my-token"), null);
  // 다른 앱의 키는 보존되어야 함
  assert.equal(mockStorage.getItem("other_app_key"), "do_not_touch");
});

test("requestAccountDeletion: 토큰이 없으면 AUTH_REQUIRED 에러를 던진다", async () => {
  await assert.rejects(
    async () => {
      await requestAccountDeletion({ token: null });
    },
    (err) => {
      assert.equal(err.code, "AUTH_REQUIRED");
      return true;
    }
  );
});

test("requestAccountDeletion: 서버가 오류를 반환하면 에러를 던진다", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ ok: false, code: "DELETION_FAILED", message: "삭제 실패" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );

  try {
    await assert.rejects(
      async () => {
        await requestAccountDeletion({ token: "test-token", confirmation: "탈퇴" });
      },
      (err) => {
        assert.equal(err.code, "DELETION_FAILED");
        assert.equal(err.message, "삭제 실패");
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestAccountDeletion: 정상 응답 시 ok: true를 반환한다", async () => {
  const originalFetch = globalThis.fetch;
  let fetchBody = null;
  let fetchHeaders = null;

  globalThis.fetch = async (url, options) => {
    fetchBody = JSON.parse(options.body);
    fetchHeaders = options.headers;
    return new Response(
      JSON.stringify({ ok: true, code: "ACCOUNT_DELETED", message: "성공" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const res = await requestAccountDeletion({ token: "my-access-token", confirmation: "탈퇴" });
    assert.equal(res.ok, true);
    assert.equal(fetchBody.confirmation, "탈퇴");
    assert.equal(fetchHeaders.Authorization, "Bearer my-access-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
