import test from "node:test";
import assert from "node:assert/strict";

function installStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
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
  return values;
}

const {
  ensureOwnerPartitionMigration,
  getPartitionStorageKey,
  GUEST_PARTITION,
  ownerPartitionId,
  readPartitionValue,
  storageKeys,
} = await import("../src/lib/storage.js");

test("기존 generic 데이터는 ownerUserId 사용자 파티션으로 한 번만 이동한다", () => {
  const values = installStorage({
    [storageKeys.ownerUserId]: JSON.stringify("user-a"),
    [storageKeys.subscriptions]: JSON.stringify([{ subscriptionId: "a-sub" }]),
    [storageKeys.notifications]: JSON.stringify([{ id: "a-note" }]),
    "submate:chat-history:user-a": JSON.stringify([{ id: "a-chat" }]),
    "submate.consent.v2:user-a:chat": JSON.stringify({ granted: true }),
    [storageKeys.notificationSettings]: JSON.stringify({ enabled: true }),
  });
  const partition = ownerPartitionId("user-a");

  ensureOwnerPartitionMigration();
  ensureOwnerPartitionMigration();

  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, partition, []), [
    { subscriptionId: "a-sub" },
  ]);
  assert.deepEqual(readPartitionValue(storageKeys.notifications, partition, []), [
    { id: "a-note" },
  ]);
  assert.deepEqual(readPartitionValue(storageKeys.chatHistory, partition, []), [{ id: "a-chat" }]);
  assert.equal(values.has(getPartitionStorageKey(storageKeys.chatHistory, partition)), true);
  assert.equal(values.get("submate.consent.v2:user:user-a:chat"), JSON.stringify({ granted: true }));
  assert.equal(values.has(storageKeys.subscriptions), false);
  assert.equal(values.has(storageKeys.notifications), false);
  assert.equal(values.has("submate:chat-history:user-a"), false);
  assert.equal(values.get("submate.consent.v2:user-a:chat"), JSON.stringify({ granted: true }));
  assert.equal(values.get(storageKeys.ownerUserId), JSON.stringify("user-a"));
  assert.equal(values.get(storageKeys.notificationSettings), JSON.stringify({ enabled: true }));
});

test("ownerUserId가 없는 기존 generic 데이터는 guest 파티션으로 이동한다", () => {
  const values = installStorage({
    [storageKeys.subscriptions]: JSON.stringify([{ subscriptionId: "guest-sub" }]),
    "submate:chat-history:guest": JSON.stringify([{ id: "guest-chat" }]),
  });

  ensureOwnerPartitionMigration();
  ensureOwnerPartitionMigration();

  assert.deepEqual(readPartitionValue(storageKeys.subscriptions, GUEST_PARTITION, []), [
    { subscriptionId: "guest-sub" },
  ]);
  assert.deepEqual(readPartitionValue(storageKeys.chatHistory, GUEST_PARTITION, []), [
    { id: "guest-chat" },
  ]);
  assert.equal(values.has(storageKeys.subscriptions), false);
  assert.equal(values.has("submate:chat-history:guest"), false);
});
