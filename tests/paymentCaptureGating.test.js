import test from "node:test";
import assert from "node:assert/strict";
import {
  readPaymentCaptureConsent,
  setPaymentCaptureConsent,
  revokePaymentCaptureConsent,
  gatedRequestPaymentCapturePermission,
} from "../src/lib/paymentCapture.js";

// Mock localStorage for tests
class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

test("결제 알림 감지 사전 동의 기본값은 미동의(false)이다", () => {
  const storage = new MemoryStorage();
  const consent = readPaymentCaptureConsent(storage, "user-123");
  assert.equal(consent, false);

  const guestConsent = readPaymentCaptureConsent(storage, null);
  assert.equal(guestConsent, false);
});

test("동의 저장 및 조회가 사용자 ID별로 정상 동작한다", () => {
  const storage = new MemoryStorage();
  setPaymentCaptureConsent(true, storage, "user-A");
  assert.equal(readPaymentCaptureConsent(storage, "user-A"), true);
  assert.equal(readPaymentCaptureConsent(storage, "user-B"), false);
  assert.equal(readPaymentCaptureConsent(storage, null), false);

  setPaymentCaptureConsent(true, storage, null);
  assert.equal(readPaymentCaptureConsent(storage, null), true);
});

test("동의 철회 시 미동의(false)로 변경된다", () => {
  const storage = new MemoryStorage();
  setPaymentCaptureConsent(true, storage, "user-A");
  assert.equal(readPaymentCaptureConsent(storage, "user-A"), true);

  revokePaymentCaptureConsent(storage, "user-A");
  assert.equal(readPaymentCaptureConsent(storage, "user-A"), false);
});

test("gatedRequestPaymentCapturePermission: 동의가 없으면 권한 설정을 열지 않고 CONSENT_REQUIRED를 반환한다", async () => {
  const storage = new MemoryStorage();
  let disclosureCalled = false;

  const res = await gatedRequestPaymentCapturePermission({
    userId: "user-test",
    storage,
  });

  assert.equal(res.status, "CONSENT_REQUIRED");
  assert.equal(disclosureCalled, false);
});

test("gatedRequestPaymentCapturePermission: 동의가 없고 onRequireDisclosure가 제공되면 콜백을 호출하고 DISCLOSURE_REQUIRED를 반환한다", async () => {
  const storage = new MemoryStorage();
  let disclosureCalled = false;

  const res = await gatedRequestPaymentCapturePermission({
    userId: "user-test",
    storage,
    onRequireDisclosure: () => {
      disclosureCalled = true;
    },
  });

  assert.equal(res.status, "DISCLOSURE_REQUIRED");
  assert.equal(disclosureCalled, true);
});

test("gatedRequestPaymentCapturePermission: 동의가 있으면 권한 요청을 수행한다 (웹/테스트 환경에서는 UNSUPPORTED 반환)", async () => {
  const storage = new MemoryStorage();
  setPaymentCaptureConsent(true, storage, "user-test");

  let disclosureCalled = false;
  const res = await gatedRequestPaymentCapturePermission({
    userId: "user-test",
    storage,
    onRequireDisclosure: () => {
      disclosureCalled = true;
    },
  });

  assert.equal(disclosureCalled, false);
  // In node/web environment without native platform, requestPermission resolves to UNSUPPORTED
  assert.equal(res.status, "UNSUPPORTED");
});

test("동의 철회 후 다시 호출하면 사전 고지 다이얼로그 요구 상태로 복귀한다", async () => {
  const storage = new MemoryStorage();
  setPaymentCaptureConsent(true, storage, "user-test");

  // 철회
  revokePaymentCaptureConsent(storage, "user-test");

  let disclosureCalled = false;
  const res = await gatedRequestPaymentCapturePermission({
    userId: "user-test",
    storage,
    onRequireDisclosure: () => {
      disclosureCalled = true;
    },
  });

  assert.equal(res.status, "DISCLOSURE_REQUIRED");
  assert.equal(disclosureCalled, true);
});
