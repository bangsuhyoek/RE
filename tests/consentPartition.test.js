import test from "node:test";
import assert from "node:assert/strict";

const values = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  },
};

const { readUserConsent, setUserConsent } = await import("../src/lib/consentStore.js");
const {
  GUEST_PARTITION,
  ownerPartitionId,
  setActiveOwnerPartition,
  storageKeys,
} = await import("../src/lib/storage.js");

test("A의 AI 동의는 세션 만료 후 guest에게 상속되지 않고 전역 키도 만들지 않는다", () => {
  values.clear();
  values.set(storageKeys.ownerUserId, JSON.stringify("user-a"));
  setActiveOwnerPartition(ownerPartitionId("user-a"));
  setUserConsent("ignored", "chat", true);
  assert.equal(readUserConsent("ignored", "chat"), true);
  assert.equal(values.has("submate.chatConsent.v1"), false);

  setActiveOwnerPartition(GUEST_PARTITION);
  assert.equal(readUserConsent("ignored", "chat"), false);
  setUserConsent("ignored", "chat", true);
  assert.equal(readUserConsent("ignored", "chat"), true);
  assert.equal(values.has("submate.chatConsent.v1"), false);
});

test("legacy global AI 동의는 확정 owner 파티션으로 한 번만 이동하고 guest에게 노출되지 않는다", () => {
  values.clear();
  values.set(storageKeys.ownerUserId, JSON.stringify("user-a"));
  values.set("submate.chatConsent.v1", "granted");
  setActiveOwnerPartition(GUEST_PARTITION);

  assert.equal(readUserConsent("ignored", "chat"), false);
  assert.equal(values.has("submate.chatConsent.v1"), false);
  assert.equal(
    JSON.parse(values.get("submate.consent.v2:user:user-a:chat")).granted,
    true
  );

  setActiveOwnerPartition(ownerPartitionId("user-a"));
  assert.equal(readUserConsent("ignored", "chat"), true);
});
