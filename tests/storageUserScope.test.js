import test from "node:test";
import assert from "node:assert/strict";

const values = new Map();
globalThis.window = {
  localStorage: {
    get length() {
      return values.size;
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null;
    },
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  },
};

const {
  clearUserScopedData,
  filterRetryQueueForUser,
  GUEST_PARTITION,
  getPartitionStorageKey,
  ownerPartitionId,
  readPartitionValue,
  setActiveOwnerPartition,
  upsertRetryQueueForUser,
  removeRetryQueueItemForUser,
  shouldWipeLocalDataForIncomingUser,
  runLogoutFlow,
  storageKeys,
  writePartitionValue,
} = await import("../src/lib/storage.js");

test("clearUserScopedData는 해당 owner 파티션만 지우고 기기 설정은 유지한다", () => {
  setActiveOwnerPartition(GUEST_PARTITION);
  const partition = ownerPartitionId("user-a");
  const userKeys = [
    storageKeys.subscriptions,
    storageKeys.profile,
    storageKeys.onboardingComplete,
    storageKeys.savedAmount,
    storageKeys.agentApprovals,
    storageKeys.agentMandates,
    storageKeys.cancelHistory,
    storageKeys.evidenceCases,
    storageKeys.evidenceConsent,
    storageKeys.cancelReminders,
    storageKeys.usageAnswers,
    storageKeys.careAcks,
    storageKeys.rotationPlan,
    storageKeys.syncTombstones,
    storageKeys.syncRetryQueue,
    storageKeys.chatHistory,
    storageKeys.notifications,
    storageKeys.agentInsightsDismissed,
    storageKeys.agentInsightsSnoozed,
    storageKeys.agentInsightsLastNotified,
    storageKeys.difficultyConsent,
    storageKeys.difficultySubmitted,
  ];
  const deviceKeys = [
    storageKeys.version,
    storageKeys.notificationSettings,
    storageKeys.users,
    storageKeys.cancelProofWipePending,
    "submate.paymentCaptureSettings.v1",
  ];

  values.clear();
  userKeys.forEach((key) => writePartitionValue(key, partition, { private: "user-a" }));
  values.set(storageKeys.ownerUserId, JSON.stringify("user-a"));
  values.set("submate.consent.v2:user:user-a:chat", "{}");
  values.set("submate:chat-history:user-a", "[]");
  values.set("submate.chatConsent.v1", "granted");
  values.set("submate.cancelAiConsent.v1", "granted");
  deviceKeys.forEach((key) => values.set(key, JSON.stringify({ device: true })));

  clearUserScopedData("user-a");

  for (const key of userKeys) {
    assert.equal(values.has(getPartitionStorageKey(key, partition)), false, key + " should be removed");
  }
  assert.equal(values.has(storageKeys.ownerUserId), false);
  assert.equal(values.has("submate.consent.v2:user:user-a:chat"), false);
  assert.equal(values.has("submate:chat-history:user-a"), false);
  assert.equal(values.has("submate.chatConsent.v1"), false);
  assert.equal(values.has("submate.cancelAiConsent.v1"), false);
  for (const key of deviceKeys) {
    assert.equal(values.has(key), true, `${key} should be kept`);
  }
});

test("A→B 정리는 A 파티션만 지우고 B와 guest 파티션은 보존한다", () => {
  values.clear();
  const a = ownerPartitionId("user-a");
  const b = ownerPartitionId("user-b");
  writePartitionValue(storageKeys.chatHistory, a, [{ id: "a-chat" }]);
  writePartitionValue(storageKeys.chatHistory, b, [{ id: "b-chat" }]);
  writePartitionValue(storageKeys.chatHistory, GUEST_PARTITION, [{ id: "guest-chat" }]);
  values.set("submate.consent.v2:user:user-a:chat", "{}");
  values.set("submate.consent.v2:user:user-b:chat", "{}");
  writePartitionValue(storageKeys.syncRetryQueue, a, [
    { id: "a", type: "upsert", ownerUserId: "user-a" },
  ]);
  writePartitionValue(storageKeys.syncRetryQueue, b, [
    { id: "b", type: "upsert", ownerUserId: "user-b" },
  ]);

  clearUserScopedData("user-a");

  assert.equal(values.has(getPartitionStorageKey(storageKeys.chatHistory, a)), false);
  assert.equal(values.has("submate.consent.v2:user:user-a:chat"), false);
  assert.deepEqual(readPartitionValue(storageKeys.chatHistory, b, []), [{ id: "b-chat" }]);
  assert.deepEqual(readPartitionValue(storageKeys.chatHistory, GUEST_PARTITION, []), [{ id: "guest-chat" }]);
  assert.equal(values.get("submate.consent.v2:user:user-b:chat"), "{}");
  assert.deepEqual(readPartitionValue(storageKeys.syncRetryQueue, b, []), [
    { id: "b", type: "upsert", ownerUserId: "user-b" },
  ]);
});

test("세션 만료 후 B 로그인은 durable owner A를 기준으로 A 데이터를 먼저 지우고, A 재로그인은 보존한다", () => {
  values.clear();
  setActiveOwnerPartition(GUEST_PARTITION);
  const a = ownerPartitionId("user-a");
  const b = ownerPartitionId("user-b");
  values.set(storageKeys.ownerUserId, JSON.stringify("user-a"));
  writePartitionValue(storageKeys.subscriptions, a, [{ subscriptionId: "a-sub" }]);
  writePartitionValue(storageKeys.cancelHistory, a, [{ id: "a-cancel" }]);
  writePartitionValue(storageKeys.notifications, a, [{ id: "a-notification" }]);
  writePartitionValue(storageKeys.chatHistory, a, [{ id: "a-chat" }]);
  writePartitionValue(storageKeys.syncRetryQueue, a, [
    { id: "a-upsert", type: "upsert", ownerUserId: "user-a", data: { subscriptionId: "a-sub" } },
  ]);

  // Session expiry switches to guest without touching A's partition.
  setActiveOwnerPartition(GUEST_PARTITION);
  assert.equal(readPartitionValue(storageKeys.subscriptions, GUEST_PARTITION, []).length, 0);
  writePartitionValue(storageKeys.subscriptions, GUEST_PARTITION, [{ subscriptionId: "guest-sub" }]);
  setActiveOwnerPartition(a);
  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, a, []), [{ subscriptionId: "a-sub" }]);

  assert.equal(shouldWipeLocalDataForIncomingUser("user-a", "user-b"), true);
  clearUserScopedData("user-a");
  setActiveOwnerPartition(b);

  assert.equal(values.has(storageKeys.ownerUserId), false);
  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, a, []), []);
  assert.deepEqual(readPartitionValue(storageKeys.cancelHistory, a, []), []);
  assert.deepEqual(readPartitionValue(storageKeys.notifications, a, []), []);
  assert.deepEqual(readPartitionValue(storageKeys.chatHistory, a, []), []);
  assert.deepEqual(readPartitionValue(storageKeys.syncRetryQueue, a, []), []);
  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, b, []), []);
  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, GUEST_PARTITION, []), [
    { subscriptionId: "guest-sub" },
  ]);
});

test("재시도 큐는 현재 사용자 소유 항목만 남기고 다른 사용자·소유자 없는 항목은 버린다", () => {
  const queue = [
    { id: "a-upsert", type: "upsert", ownerUserId: "user-a" },
    { id: "b-delete", type: "delete", ownerUserId: "user-b" },
    { id: "legacy", type: "upsert" },
  ];
  assert.deepEqual(filterRetryQueueForUser(queue, "user-a"), [queue[0]]);
  assert.deepEqual(filterRetryQueueForUser(queue, "user-b"), [queue[1]]);
  assert.deepEqual(filterRetryQueueForUser(queue, null), []);
});

test("재시도 큐 갱신은 다른 사용자의 대기 항목을 보존한다", () => {
  const other = { id: "a-upsert", type: "upsert", ownerUserId: "user-a", attempts: 2 };
  const current = { id: "b-delete", type: "delete", ownerUserId: "user-b" };
  const inserted = upsertRetryQueueForUser([other], current, "user-b");
  assert.equal(inserted.length, 2);
  assert.deepEqual(inserted.find((item) => item.ownerUserId === "user-a"), other);

  const removed = removeRetryQueueItemForUser(inserted, current, "user-b");
  assert.deepEqual(removed, [other]);
});

test("명시적 로그아웃은 세션이 제거됐으면 오류 응답과 무관하게 한 번만 정리한다", async () => {
  let remoteClears = 0;
  let localClears = 0;
  const sessionRemoved = await runLogoutFlow({
    isRemoteUser: true,
    signOut: async () => ({ error: new Error("offline") }),
    getSession: async () => null,
    clearRemoteData: async () => { remoteClears += 1; },
    clearLocalSession: async () => { localClears += 1; },
  });
  assert.equal(sessionRemoved.ok, true);
  assert.equal(remoteClears, 1);
  assert.equal(localClears, 0);

  remoteClears = 0;
  const sessionPresent = await runLogoutFlow({
    isRemoteUser: true,
    signOut: async () => ({ error: new Error("offline") }),
    getSession: async () => ({ user: { id: "user-a" } }),
    clearRemoteData: async () => { remoteClears += 1; },
    clearLocalSession: async () => { localClears += 1; },
  });
  assert.equal(sessionPresent.ok, false);
  assert.equal(remoteClears, 0);
  assert.equal(localClears, 0);

  remoteClears = 0;
  const thrown = await runLogoutFlow({
    isRemoteUser: true,
    signOut: async () => { throw new Error("network down"); },
    getSession: async () => ({ user: { id: "user-a" } }),
    clearRemoteData: async () => { remoteClears += 1; },
    clearLocalSession: async () => { localClears += 1; },
  });
  assert.equal(thrown.ok, false);
  assert.equal(remoteClears, 0);

  const order = [];
  const succeeded = await runLogoutFlow({
    isRemoteUser: true,
    signOut: async () => { order.push("signOut"); return { error: null }; },
    getSession: async () => null,
    clearRemoteData: async () => { order.push("clear"); },
    clearLocalSession: async () => { order.push("local"); },
  });
  assert.equal(succeeded.ok, true);
  assert.deepEqual(order, ["signOut", "clear"]);

  remoteClears = 0;
  localClears = 0;
  const guest = await runLogoutFlow({
    isRemoteUser: false,
    signOut: async () => { throw new Error("must not sign out guest"); },
    getSession: async () => { throw new Error("must not check guest session"); },
    clearRemoteData: async () => { remoteClears += 1; },
    clearLocalSession: async () => { localClears += 1; },
  });
  assert.equal(guest.ok, true);
  assert.equal(remoteClears, 0);
  assert.equal(localClears, 1);
});
