import test from "node:test";
import assert from "node:assert/strict";
import { hashForRoute, parseHash, routeForSession } from "../src/lib/navigation.js";

test("신규 사용자는 랜딩에서 시작한다", () => {
  assert.equal(routeForSession({ requestedRoute: null, hasProfile: false, onboardingComplete: false }), "landing");
});

test("로그인 전 앱 내부 딥링크는 로그인으로 보호한다", () => {
  assert.equal(routeForSession({ requestedRoute: "home", hasProfile: false, onboardingComplete: false }), "login");
  assert.equal(routeForSession({ requestedRoute: "settings", hasProfile: false, onboardingComplete: false }), "login");
});

test("기존 사용자는 온보딩 완료 여부를 보존한다", () => {
  assert.equal(routeForSession({ requestedRoute: null, hasProfile: true, onboardingComplete: true }), "home");
  assert.equal(routeForSession({ requestedRoute: null, hasProfile: true, onboardingComplete: false }), "onboarding");
});

test("온보딩 미완료 사용자의 앱 딥링크는 온보딩으로 보호한다", () => {
  assert.equal(routeForSession({ requestedRoute: "detail", hasProfile: true, onboardingComplete: false }), "onboarding");
  assert.equal(routeForSession({ requestedRoute: "settings", hasProfile: true, onboardingComplete: false }), "onboarding");
  assert.equal(routeForSession({ requestedRoute: "onboarding", hasProfile: true, onboardingComplete: false }), "onboarding");
});

test("온보딩 완료 사용자는 설정 화면에 접근할 수 있다", () => {
  assert.equal(routeForSession({ requestedRoute: "settings", hasProfile: true, onboardingComplete: true }), "settings");
});

test("공개 화면은 로그인 전에도 직접 접근할 수 있다", () => {
  assert.equal(routeForSession({ requestedRoute: "register", hasProfile: false, onboardingComplete: false }), "register");
  assert.equal(routeForSession({ requestedRoute: "landing", hasProfile: false, onboardingComplete: false }), "landing");
});

test("해시 라우트의 상세 ID와 쿼리를 보존한다", () => {
  const parsed = parseHash("#/detail/manual-1?highlight=cancel");
  assert.equal(parsed.route, "detail");
  assert.equal(parsed.id, "manual-1");
  assert.equal(parsed.params.get("highlight"), "cancel");
  assert.equal(hashForRoute("detail", "한글 id"), "#/detail/%ED%95%9C%EA%B8%80%20id");
});
