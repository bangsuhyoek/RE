import test from "node:test";
import assert from "node:assert/strict";
import { clearDeviceData, completeLocalAccountDeletion, requestAccountDeletion } from "../src/lib/accountClient.js";
import {
  clearUserScopedData,
  getActiveOwnerPartition,
  GUEST_PARTITION,
  ownerPartitionId,
  setActiveOwnerPartition,
  storageKeys,
  writePartitionValue,
  writeStoredValue,
} from "../src/lib/storage.js";

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

test("clearDeviceData: preserveKeys에 지정된 재시도 플래그는 보존한다", () => {
  const mockStorage = createMockStorage({
    [storageKeys.subscriptions]: "[]",
    [storageKeys.cancelProofWipePending]: JSON.stringify({ cutoffAt: "2026-11-14T00:00:00.000Z" }),
    "sb-my-token": "secret",
  });

  clearDeviceData(mockStorage, { preserveKeys: [storageKeys.cancelProofWipePending] });

  assert.equal(mockStorage.getItem(storageKeys.subscriptions), null);
  assert.equal(mockStorage.getItem("sb-my-token"), null);
  assert.ok(mockStorage.getItem(storageKeys.cancelProofWipePending));
});

test("completeLocalAccountDeletion: 게스트 탈퇴와 부분 정리 실패 시에도 계속 진행하며 증빙 재시도 플래그를 보존한다", async () => {
  const calls = [];
  const preservedSets = [];

  const guestResult = await completeLocalAccountDeletion({
    userId: null,
    signOutLocal: async () => { calls.push("signOutLocal"); },
    clearProofs: async (owner) => { calls.push("clearProofs:" + owner); return true; },
    cancelNotifications: async () => { calls.push("cancelNotif"); return true; },
    clearBrowserSession: async () => { calls.push("clearBrowser"); },
    clearUserScope: (id) => { calls.push("clearScope:" + id); },
    clearStorage: (_s, opts) => { preservedSets.push(opts?.preserveKeys || []); },
  });

  assert.equal(guestResult.ok, true);
  assert.equal(calls.includes("signOutLocal"), false);
  assert.equal(calls.includes("clearProofs:guest"), true);
  assert.equal(calls.includes("cancelNotif"), true);
  assert.equal(calls.includes("clearBrowser"), true);
  assert.deepEqual(preservedSets[0], []);

  const partialFailResult = await completeLocalAccountDeletion({
    userId: "user-1",
    signOutLocal: async () => { throw new Error("offline"); },
    clearProofs: async () => false,
    cancelNotifications: async () => { throw new Error("notif failed"); },
    clearBrowserSession: async () => {},
    clearUserScope: () => {},
    clearStorage: (_s, opts) => { preservedSets.push(opts?.preserveKeys || []); },
  });

  assert.equal(partialFailResult.ok, false);
  assert.equal(partialFailResult.proofsCleared, false);
  assert.equal(partialFailResult.notificationsCleared, false);
  assert.deepEqual(preservedSets[1], [storageKeys.cancelProofWipePending]);
});

test("completeLocalAccountDeletion: activeOwnerPartition을 guest로 되돌려 탈퇴 후 후속 쓰기가 삭제된 사용자 파티션에 남지 않는다", async () => {
  const mockStorage = createMockStorage();
  const prevWindow = globalThis.window;
  globalThis.window = { localStorage: mockStorage };
  try {
    const userId = "user-deleted-99";
    const partition = ownerPartitionId(userId);
    setActiveOwnerPartition(partition);
    writePartitionValue(storageKeys.subscriptions, partition, [{ subscriptionId: "s1" }]);
    writePartitionValue(storageKeys.notifications, partition, [{ id: "n1" }]);

    await completeLocalAccountDeletion({
      userId,
      clearProofs: async () => true,
      cancelNotifications: async () => true,
      clearBrowserSession: async () => {},
      clearUserScope: clearUserScopedData,
      clearStorage: (_s, opts) => clearDeviceData(mockStorage, opts),
    });

    assert.equal(getActiveOwnerPartition(), GUEST_PARTITION);
    // 탈퇴 직후 후속 상태 쓰기가 일어나도 삭제된 사용자 파티션 키가 생성되지 않아야 한다
    writeStoredValue(storageKeys.notifications, []);

    const leakedKeys = [];
    for (let i = 0; i < mockStorage.length; i++) {
      const key = mockStorage.key(i);
      if (key?.startsWith(`submate-mvp:owner:${partition}:`)) {
        leakedKeys.push(key);
      }
    }
    assert.deepEqual(leakedKeys, []);
  } finally {
    setActiveOwnerPartition(GUEST_PARTITION);
    globalThis.window = prevWindow;
  }
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
