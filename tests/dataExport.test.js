import test from "node:test";
import assert from "node:assert/strict";
import { buildExportPayload, exportUserData } from "../src/lib/dataExport.js";
import { setActiveOwnerPartition, ownerPartitionId, GUEST_PARTITION } from "../src/lib/storage.js";
import { grantChatConsent } from "../src/lib/chatClient.js";
import { setCancelAiConsent } from "../src/lib/cancelBrowser.js";

test("buildExportPayload: 구독, 해지 기록, 증빙 요약, 동의 내역이 JSON 페이로드에 포함된다", () => {
  const dummySubs = [{ id: "sub-1", name: "넷플릭스", amount: 14900 }];
  const dummyHistory = [{ id: "hist-1", name: "왓챠", amount: 7900 }];
  const dummyCases = { "case-1": { id: "case-1", kind: "price_increase" } };

  const payload = buildExportPayload({
    userId: "user-abc-123",
    profile: { nickname: "테스터" },
    subscriptions: dummySubs,
    cancelHistory: dummyHistory,
    evidenceCases: dummyCases,
  });

  assert.equal(payload.version, "1.0.0");
  assert.equal(payload.user.userId, "user-abc-123");
  assert.equal(payload.user.nickname, "테스터");
  assert.equal(payload.user.isGuest, false);
  assert.deepEqual(payload.subscriptions, dummySubs);
  assert.deepEqual(payload.cancellationHistory, dummyHistory);
  assert.deepEqual(payload.evidenceCases, dummyCases);

  // 동의 내역 필드 확인
  assert.ok("evidenceConsent" in payload.consents);
  assert.ok("difficultyConsent" in payload.consents);
  assert.ok("cancelAiConsent" in payload.consents);
  assert.ok("chatConsent" in payload.consents);
  assert.ok("agentMandates" in payload.consents);
  assert.ok("approvalRequests" in payload.consents);
});

test("buildExportPayload: 게스트 사용자도 로컬 데이터를 정상적으로 내보낼 수 있다", () => {
  const dummySubs = [{ id: "guest-sub-1", name: "유튜브 프리미엄", amount: 14900 }];

  const payload = buildExportPayload({
    userId: null,
    profile: null,
    subscriptions: dummySubs,
    cancelHistory: [],
    evidenceCases: {},
  });

  assert.equal(payload.user.userId, null);
  assert.equal(payload.user.isGuest, true);
  assert.equal(payload.subscriptions.length, 1);
  assert.equal(payload.subscriptions[0].name, "유튜브 프리미엄");
});

test("exportUserData: 헤드리스/테스트 환경에서 payload 및 JSON 문자열을 반환한다", async () => {
  const res = await exportUserData({
    userId: "user-export-test",
    subscriptions: [{ id: "s1", name: "스포티파이" }],
  });

  assert.equal(res.ok, true);
  assert.ok(typeof res.jsonString === "string");
  const parsed = JSON.parse(res.jsonString);
  assert.equal(parsed.subscriptions[0].name, "스포티파이");
});

test("buildExportPayload: 계정별 AI 동의와 객체형 에이전트 기록 기본값을 반영한다", () => {
  const store = new Map();
  const prevWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      get length() { return store.size; },
      key: (i) => Array.from(store.keys())[i] ?? null,
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
    },
  };
  try {
    setActiveOwnerPartition(ownerPartitionId("user-consent-1"));
    grantChatConsent("user-consent-1");
    setCancelAiConsent(true, null, "user-consent-1");

    const payload = buildExportPayload({ userId: "user-consent-1", subscriptions: [] });
    assert.equal(payload.consents.chatConsent, true);
    assert.equal(payload.consents.cancelAiConsent, true);
    assert.deepEqual(payload.consents.agentMandates, {});
    assert.deepEqual(payload.consents.approvalRequests, {});
  } finally {
    setActiveOwnerPartition(GUEST_PARTITION);
    globalThis.window = prevWindow;
  }
});
