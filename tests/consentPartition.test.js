import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const values = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  },
};

const { CURRENT_POLICY_VERSION, readUserConsent, setUserConsent } = await import("../src/lib/consentStore.js");
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

test("legacy global AI 동의는 이전 버전으로만 이동해 재동의를 요구한다", () => {
  values.clear();
  values.set(storageKeys.ownerUserId, JSON.stringify("user-a"));
  values.set("submate.chatConsent.v1", "granted");
  setActiveOwnerPartition(GUEST_PARTITION);

  assert.equal(readUserConsent("ignored", "chat"), false);
  assert.equal(values.has("submate.chatConsent.v1"), false);
  const migrated = JSON.parse(values.get("submate.consent.v2:user:user-a:chat"));
  assert.equal(migrated.granted, true);
  assert.notEqual(migrated.policyVersion, CURRENT_POLICY_VERSION);

  setActiveOwnerPartition(ownerPartitionId("user-a"));
  assert.equal(readUserConsent("ignored", "chat"), false);
  setUserConsent("ignored", "chat", true);
  assert.equal(readUserConsent("ignored", "chat"), true);
});

test("정책 버전이 바뀌면 기존 동의는 무효가 되어 다시 동의해야 한다", () => {
  assert.equal(CURRENT_POLICY_VERSION, "2026-10-30");
  values.clear();
  setActiveOwnerPartition(GUEST_PARTITION);

  setUserConsent("ignored", "chat", true, { version: "2025-01-01" });
  assert.equal(readUserConsent("ignored", "chat"), false);

  setUserConsent("ignored", "chat", true);
  assert.equal(readUserConsent("ignored", "chat"), true);
});

test("AI 동의 화면은 사용 체크 답변과 알림 설정 전송을 고지한다", () => {
  const source = readFileSync(new URL("../src/components/agent/ConsentCard.jsx", import.meta.url), "utf8");
  assert.match(source, /사용 체크 답변/);
  assert.match(source, /알림 설정/);
});
