import test from "node:test";
import assert from "node:assert/strict";

const values = new Map();
let failingKey = null;
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
      if (failingKey && key === failingKey) throw new Error("quota");
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  },
};

const {
  clearOwnerPartition,
  clearUserScopedData,
  GUEST_PARTITION,
  getPartitionStorageKey,
  hasOwnerPartition,
  hasPendingGuestMigration,
  migrateGuestDataToOwner,
  ownerPartitionId,
  readPartitionValue,
  setActiveOwnerPartition,
  storageKeys,
  writePartitionValue,
} = await import("../src/lib/storage.js");

test("A 세션 만료 후 guest와 B는 A 데이터를 보지 못하고 A 재로그인 시 A 데이터만 돌아온다", () => {
  values.clear();
  const a = ownerPartitionId("user-a");
  const b = ownerPartitionId("user-b");
  setActiveOwnerPartition(a);
  values.set(storageKeys.ownerUserId, JSON.stringify("user-a"));
  writePartitionValue(storageKeys.subscriptions, a, [{ subscriptionId: "a-sub" }]);
  writePartitionValue(storageKeys.cancelHistory, a, [{ id: "a-cancel" }]);
  writePartitionValue(storageKeys.notifications, a, [{ id: "a-note" }]);
  writePartitionValue(storageKeys.chatHistory, a, [{ id: "a-chat" }]);

  setActiveOwnerPartition(GUEST_PARTITION);
  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, GUEST_PARTITION, []), []);
  writePartitionValue(storageKeys.subscriptions, GUEST_PARTITION, [{ subscriptionId: "guest-sub" }]);
  writePartitionValue(storageKeys.chatHistory, GUEST_PARTITION, [{ id: "guest-chat" }]);

  setActiveOwnerPartition(a);
  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, a, []), [{ subscriptionId: "a-sub" }]);
  assert.equal(readPartitionValue(storageKeys.subscriptions, a, []).some((s) => s.subscriptionId === "guest-sub"), false);

  clearUserScopedData("user-a");
  setActiveOwnerPartition(b);
  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, a, []), []);
  assert.deepEqual(readPartitionValue(storageKeys.notifications, a, []), []);
  assert.deepEqual(readPartitionValue(storageKeys.chatHistory, a, []), []);
  assert.deepEqual(readPartitionValue(storageKeys.cancelHistory, a, []), []);
  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, GUEST_PARTITION, []), [
    { subscriptionId: "guest-sub" },
  ]);
  assert.deepEqual(readPartitionValue(storageKeys.chatHistory, GUEST_PARTITION, []), [
    { id: "guest-chat" },
  ]);
  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, b, []), []);
});

test("최초 로그인에서만 guest의 사용자 데이터가 새 owner로 이동하고 채팅·동의는 guest에 남는다", () => {
  values.clear();
  clearOwnerPartition(ownerPartitionId("user-new"));
  setActiveOwnerPartition(GUEST_PARTITION);
  writePartitionValue(storageKeys.subscriptions, GUEST_PARTITION, [{ subscriptionId: "guest-sub" }]);
  writePartitionValue(storageKeys.notifications, GUEST_PARTITION, [{ id: "guest-note" }]);
  writePartitionValue(storageKeys.chatHistory, GUEST_PARTITION, [{ id: "guest-chat" }]);
  writePartitionValue(storageKeys.syncRetryQueue, GUEST_PARTITION, [
    { id: "guest-upsert", type: "upsert", ownerUserId: "guest", data: { subscriptionId: "guest-sub" } },
  ]);
  values.set("submate.consent.v2:guest:chat", JSON.stringify({ granted: true }));

  const target = ownerPartitionId("user-new");
  assert.equal(hasOwnerPartition(target), false);
  migrateGuestDataToOwner("user-new");

  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, target, []), [
    { subscriptionId: "guest-sub" },
  ]);
  assert.deepEqual(readPartitionValue(storageKeys.notifications, target, []), [{ id: "guest-note" }]);
  assert.deepEqual(readPartitionValue(storageKeys.syncRetryQueue, target, []), [
    { id: "guest-upsert", type: "upsert", ownerUserId: "user-new", data: { subscriptionId: "guest-sub" } },
  ]);
  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, GUEST_PARTITION, []), []);
  assert.deepEqual(readPartitionValue(storageKeys.chatHistory, GUEST_PARTITION, []), [
    { id: "guest-chat" },
  ]);
  assert.deepEqual(readPartitionValue(storageKeys.chatHistory, target, []), []);
  assert.equal(values.get("submate.consent.v2:guest:chat"), JSON.stringify({ granted: true }));
});

test("최초 로그인 migration write 실패 시 guest 원본을 보존하고 다음 시도에서 이어서 완료한다", () => {
  values.clear();
  failingKey = null;
  setActiveOwnerPartition(GUEST_PARTITION);
  const target = ownerPartitionId("user-resume");
  writePartitionValue(storageKeys.subscriptions, GUEST_PARTITION, [{ subscriptionId: "guest-sub" }]);
  writePartitionValue(storageKeys.notifications, GUEST_PARTITION, [{ id: "guest-note" }]);
  failingKey = getPartitionStorageKey(storageKeys.notifications, target);

  assert.equal(migrateGuestDataToOwner("user-resume"), false);
  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, target, []), [
    { subscriptionId: "guest-sub" },
  ]);
  assert.deepEqual(readPartitionValue(storageKeys.notifications, GUEST_PARTITION, []), [
    { id: "guest-note" },
  ]);
  assert.equal(hasOwnerPartition(target), false);

  failingKey = null;
  assert.equal(migrateGuestDataToOwner("user-resume"), true);
  assert.deepEqual(readPartitionValue(storageKeys.notifications, target, []), [
    { id: "guest-note" },
  ]);
  assert.deepEqual(readPartitionValue(storageKeys.notifications, GUEST_PARTITION, []), []);
  assert.equal(hasOwnerPartition(target), true);
});

test("migration 실패 후에도 A 파티션의 클라우드 데이터를 사용하고 수동 재시도에서 guest를 병합한다", () => {
  values.clear();
  failingKey = null;
  setActiveOwnerPartition(GUEST_PARTITION);
  const target = ownerPartitionId("user-cloud");
  writePartitionValue(storageKeys.subscriptions, GUEST_PARTITION, [{ subscriptionId: "guest-sub" }]);
  failingKey = getPartitionStorageKey(storageKeys.subscriptions, target);
  assert.equal(migrateGuestDataToOwner("user-cloud"), false);
  assert.equal(hasPendingGuestMigration("user-cloud"), true);
  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, GUEST_PARTITION, []), [
    { subscriptionId: "guest-sub" },
  ]);

  // Failure still allows using A's cloud partition.
  setActiveOwnerPartition(target);
  failingKey = null;
  writePartitionValue(storageKeys.subscriptions, target, [{ subscriptionId: "cloud-sub" }]);
  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, target, []), [
    { subscriptionId: "cloud-sub" },
  ]);

  // Manual retry merges guest data into the already populated cloud partition.
  assert.equal(migrateGuestDataToOwner("user-cloud"), true);
  const merged = readPartitionValue(storageKeys.subscriptions, target, []);
  assert.deepEqual(new Set(merged.map((item) => item.subscriptionId)), new Set(["cloud-sub", "guest-sub"]));
  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, GUEST_PARTITION, []), []);
  assert.equal(hasPendingGuestMigration("user-cloud"), false);
});
