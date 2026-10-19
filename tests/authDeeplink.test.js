import assert from "node:assert/strict";
import test from "node:test";
import { parseDeepLink, verifyAndConsumeNonce } from "../src/lib/deepLinks.js";
import {
  readUserConsent,
  setUserConsent,
  revokeUserConsent,
  getUserConsentRecord,
  migrateLegacyConsentIfNeeded,
  CURRENT_POLICY_VERSION,
} from "../src/lib/consentStore.js";
import { interpretWithAi } from "../src/lib/agentClient.js";

test("딥링크 파싱: PKCE OAuth 콜백은 submate://auth/callback?code=... 일 때만 code를 추출한다", () => {
  // 정상 네이티브 콜백
  const valid = parseDeepLink("submate://auth/callback?code=pkce-auth-code-1234");
  assert.equal(valid.type, "auth_callback");
  assert.equal(valid.code, "pkce-auth-code-1234");

  // 해시 토큰 주입 시도 -> 콜백 거부
  const hashInjected = parseDeepLink("submate://auth/callback#access_token=evil_token&refresh_token=evil_refresh");
  assert.equal(hashInjected.type, "auth_callback");
  assert.equal(hashInjected.code, undefined);
  assert.equal(hashInjected.error, "NO_CODE");

  // 다른 경로에 code= 가 들어간 악성 링크 거부
  const malicious = parseDeepLink("submate://other/path?code=stolen_code");
  assert.equal(malicious.type, "unknown");

  // 일반 웹 URL 거부
  const webUrl = parseDeepLink("https://submate.app/auth/callback?code=123");
  assert.equal(webUrl.type, "unknown");
});

test("딥링크 파싱: quick-add 파싱 및 nonce 추출", () => {
  const raw = "submate://quick-add?name=Netflix&amount=17000&plan=%ED%94%84%EB%A6%AC%EB%AF%B8%EC%97%84&method=%EC%8B%A0%ED%95%9C%EC%B9%B4%EB%93%9C&category=OTT&dueDay=8&detectedAt=1788831000000&nonce=nonce-uuid-5678";
  const parsed = parseDeepLink(raw);
  assert.equal(parsed.type, "quick_add");
  assert.equal(parsed.nonce, "nonce-uuid-5678");
  assert.equal(parsed.quickAdd.name, "Netflix");
  assert.equal(parsed.quickAdd.amount, 17000);
  assert.equal(parsed.quickAdd.plan, "프리미엄");
  assert.equal(parsed.quickAdd.nonce, "nonce-uuid-5678");
});

test("quick-add 일회용 nonce 검증 및 소비", async () => {
  const consumedNonces = new Set();
  const validNonces = new Map([
    ["nonce-valid-1", { expiresAt: Date.now() + 60000 }],
    ["nonce-expired", { expiresAt: Date.now() - 1000 }],
  ]);

  const mockValidator = async (nonce) => {
    if (!validNonces.has(nonce)) return false;
    if (consumedNonces.has(nonce)) return false;
    const entry = validNonces.get(nonce);
    if (Date.now() > entry.expiresAt) return false;
    consumedNonces.add(nonce);
    return true;
  };

  // 1. 유효한 nonce 첫 번째 호출 -> 성공 및 소비
  const res1 = await verifyAndConsumeNonce("nonce-valid-1", mockValidator);
  assert.equal(res1, true);

  // 2. 동일한 nonce 재사용 시도 (Replay Attack) -> 실패
  const res2 = await verifyAndConsumeNonce("nonce-valid-1", mockValidator);
  assert.equal(res2, false);

  // 3. 만료된 nonce -> 실패
  const resExpired = await verifyAndConsumeNonce("nonce-expired", mockValidator);
  assert.equal(resExpired, false);

  // 4. 없는 nonce -> 실패
  const resEmpty = await verifyAndConsumeNonce("", mockValidator);
  assert.equal(resEmpty, false);
});

test("계정별 동의 저장: 사용자 ID별(비로그인 guest)로 동의 시각 및 방침 버전과 함께 저장", () => {
  const mockStore = new Map();
  const storage = {
    getItem: (k) => (mockStore.has(k) ? mockStore.get(k) : null),
    setItem: (k, v) => mockStore.set(k, String(v)),
    removeItem: (k) => mockStore.delete(k),
  };

  const userA = "user-a";
  const userB = "user-b";

  // 기본 상태는 미동의 (false)
  assert.equal(readUserConsent(userA, "chat", storage), false);
  assert.equal(readUserConsent(userB, "chat", storage), false);

  // User A만 동의
  setUserConsent(userA, "chat", true, { version: CURRENT_POLICY_VERSION }, storage);
  assert.equal(readUserConsent(userA, "chat", storage), true);
  assert.equal(readUserConsent(userB, "chat", storage), false); // User B에는 넘어가지 않음

  const recordA = getUserConsentRecord(userA, "chat", storage);
  assert.notEqual(recordA, null);
  assert.equal(recordA.granted, true);
  assert.equal(recordA.policyVersion, CURRENT_POLICY_VERSION);
  assert.ok(recordA.agreedAt);

  // 비로그인 guest 동의
  assert.equal(readUserConsent(null, "chat", storage), false);
  setUserConsent(null, "chat", true, { version: CURRENT_POLICY_VERSION }, storage);
  assert.equal(readUserConsent("guest", "chat", storage), true);

  // 철회 시 상태 확인
  revokeUserConsent(userA, "chat", storage);
  assert.equal(readUserConsent(userA, "chat", storage), false);
});

test("기존 기기 단위 동의 마이그레이션: 현재 사용자 것으로 1회 이전 후 레거시 키 삭제", () => {
  const mockStore = new Map();
  const storage = {
    getItem: (k) => (mockStore.has(k) ? mockStore.get(k) : null),
    setItem: (k, v) => mockStore.set(k, String(v)),
    removeItem: (k) => mockStore.delete(k),
  };

  // 과거 기기 단위 동의 플래그 주입
  mockStore.set("submate.chatConsent.v1", "granted");
  mockStore.set("submate.cancelAiConsent.v1", "granted");

  // 마이그레이션 수행
  migrateLegacyConsentIfNeeded("migrated-user", storage);

  // 이전된 사용자에게 동의가 저장되어야 함
  assert.equal(readUserConsent("migrated-user", "chat", storage), true);
  assert.equal(readUserConsent("migrated-user", "cancel", storage), true);

  // 레거시 키는 삭제되어야 함
  assert.equal(storage.getItem("submate.chatConsent.v1"), null);
  assert.equal(storage.getItem("submate.cancelAiConsent.v1"), null);
});

test("간단 모드 (동의 없음/철회): /api/agent 절대 호출 안 함 (null 즉시 반환)", async () => {
  let serverCalled = false;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    serverCalled = true;
    return { ok: true, json: async () => ({ ok: true, intent: "cancel" }) };
  };

  try {
    // 동의가 false 인 상태
    const mockConsentChecker = () => false;
    const res = await interpretWithAi("넷플릭스 해지해줘", [{ id: "netflix", name: "Netflix" }], "user-no-consent", mockConsentChecker);

    assert.equal(res, null);
    assert.equal(serverCalled, false, "AI 동의가 없으면 서버를 절대 호출하지 않아야 합니다.");
  } finally {
    global.fetch = originalFetch;
  }
});
