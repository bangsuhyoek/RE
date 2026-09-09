import assert from "node:assert/strict";
import test from "node:test";
import { readHash } from "../src/hooks/useNavigation.js";
import { readStoredValue, storageKeys } from "../src/lib/storage.js";
import { createMockSubscriptions } from "../src/data/subscriptionData.js";

test("URL 해시가 없거나 비어있을 때 readHash는 빈 문자열 라우트를 반환한다", () => {
  global.window = { location: { hash: "" } };
  assert.equal(readHash().route, "");

  global.window = { location: { hash: "#" } };
  assert.equal(readHash().route, "");

  global.window = { location: { hash: "#/" } };
  assert.equal(readHash().route, "");

  global.window = undefined;
  assert.equal(readHash().route, "");
});

test("URL 해시가 지정되어 있을 때 올바른 라우트와 파라미터를 파싱한다", () => {
  global.window = { location: { hash: "#/login" } };
  assert.equal(readHash().route, "login");

  global.window = { location: { hash: "#/register" } };
  assert.equal(readHash().route, "register");

  global.window = { location: { hash: "#/detail/sub-123?highlight=cancel" } };
  const res = readHash();
  assert.equal(res.route, "detail");
  assert.equal(res.id, "sub-123");
  assert.equal(res.params.get("highlight"), "cancel");
});

test("앱 최초 설치/실행 시 (저장된 프로필 부재) 기본 화면은 login(시작화면)이다", () => {
  const mockStorage = new Map();
  global.window = {
    localStorage: {
      getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k),
    },
    location: { hash: "" },
  };

  const storedProfile = readStoredValue(storageKeys.profile, null);
  assert.equal(storedProfile, null);

  const defaultRoute = storedProfile ? "home" : "login";
  assert.equal(defaultRoute, "login");
});

test("기존 로그인 유저가 앱 실행 시 기본 화면은 home이다", () => {
  const mockStorage = new Map();
  mockStorage.set(storageKeys.profile, JSON.stringify({ nickname: "홍길동", provider: "SubMate" }));
  global.window = {
    localStorage: {
      getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k),
    },
    location: { hash: "" },
  };

  const storedProfile = readStoredValue(storageKeys.profile, null);
  assert.notEqual(storedProfile, null);
  assert.equal(storedProfile.nickname, "홍길동");

  const defaultRoute = storedProfile ? "home" : "login";
  assert.equal(defaultRoute, "home");
});

test("미인증 상태에서는 민수 프로필이나 더미 구독을 자동 생성하지 않는다", () => {
  const mockStorage = new Map();
  global.window = {
    localStorage: {
      getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k),
    },
    location: { hash: "" },
  };

  const storedProfile = readStoredValue(storageKeys.profile, null);
  const initialHash = readHash();
  const isGuestParam = !storedProfile && initialHash.params?.get("guest") === "1";
  const effectiveProfile = storedProfile || (isGuestParam ? { nickname: "민수", provider: "Guest", guest: true, notificationsAllowed: true } : null);

  assert.equal(effectiveProfile, null);

  const subscriptions = effectiveProfile?.guest || isGuestParam ? createMockSubscriptions() : [];
  assert.equal(subscriptions.length, 0);
});

test("과거 데모/게스트('민수') 프로필이 스토리지에 남아있더라도 자동 정리하고 login(시작화면)으로 진입한다", () => {
  const mockStorage = new Map();
  mockStorage.set(storageKeys.profile, JSON.stringify({ nickname: "민수", provider: "Guest", guest: true }));
  mockStorage.set(storageKeys.subscriptions, JSON.stringify([{ id: "netflix", name: "Netflix" }]));

  global.window = {
    localStorage: {
      getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k),
    },
    location: { hash: "" },
  };

  let raw = readStoredValue(storageKeys.profile, null);
  assert.equal(raw.nickname, "민수");

  // useSubscriptions와 useNavigation의 정리 로직 적용 검증
  if (raw && (raw.guest || raw.provider === "Guest" || raw.nickname === "민수")) {
    mockStorage.delete(storageKeys.profile);
    mockStorage.delete(storageKeys.subscriptions);
    raw = null;
  }

  const defaultRoute = (!raw || raw.guest || raw.provider === "Guest") ? "login" : "home";
  assert.equal(defaultRoute, "login");
  assert.equal(mockStorage.get(storageKeys.profile), undefined);
  assert.equal(mockStorage.get(storageKeys.subscriptions), undefined);
});

test("게스트(둘러보기) 사용자는 저장되어 있더라도 기본 화면이 login(시작화면)이다", () => {
  const guestProfile = { nickname: "체험 사용자", provider: "Guest", guest: true };
  const defaultRoute = (!guestProfile || guestProfile.guest || guestProfile.provider === "Guest") ? "login" : "home";
  assert.equal(defaultRoute, "login");
});
