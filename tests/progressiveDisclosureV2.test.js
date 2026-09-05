import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("회원가입은 한 화면에서 조건 충족 시 다음 입력란을 자동 공개한다", () => {
  const source = read("src/components/AuthScreens.jsx");
  for (const marker of [
    "revealedStep",
    "setRevealedStep((current) => Math.max(current, 1))",
    "setRevealedStep((current) => Math.max(current, 2))",
    "setRevealedStep((current) => Math.max(current, 3))",
    "setRevealedStep((current) => Math.max(current, 4))",
    'data-progressive-field="password"',
    'data-progressive-field="password-confirm"',
    'data-progressive-field="nickname"',
  ]) assert.ok(source.includes(marker), `회원가입 Progressive Disclosure 누락: ${marker}`);
});

test("이미 공개된 회원가입 입력란은 앞 단계 값이 다시 잘못돼도 숨기지 않는다", () => {
  const source = read("src/components/AuthScreens.jsx");
  assert.equal(source.includes("{validation.id && <label"), false);
  assert.equal(source.includes("{validation.password && <label"), false);
  assert.equal(source.includes("{validation.matching && <label"), false);
  assert.ok(source.includes("{revealedStep >= 1 && ("));
  assert.ok(source.includes("{revealedStep >= 2 && ("));
  assert.ok(source.includes("{revealedStep >= 3 && ("));
  assert.ok(source.includes('disabled={!canSubmit}'));
});

test("직접 등록도 다음/이전 버튼 없이 같은 화면에서 자동 공개한다", () => {
  const source = read("src/components/AddModal.jsx");
  assert.equal(source.includes("nextManualStep"), false);
  assert.equal(source.includes("previousManualStep"), false);
  assert.ok(source.includes("setManualReveal((current) => Math.max(current, revealLevelFor(next)))"));
  assert.ok(source.includes('disabled={!manualRequiredValid(form)}'));
  for (const field of ["amount", "billing-cycle", "next-billing-date", "optional"]) {
    assert.ok(source.includes(`data-manual-field="${field}"`));
  }
});

test("온보딩은 랜딩 화면 캡처가 아니라 수련 원본 자산을 배경으로 사용한다", () => {
  const brand = read("src/components/REBrand.jsx");
  const onboarding = read("src/components/OnboardingScreen.jsx");
  const theme = read("src/landing-parity-v5.css");
  assert.ok(brand.includes('/re-assets/bg_plate.jpg'));
  assert.equal(brand.includes('/re-assets/onboarding-lotus-source.png'), false);
  assert.ok(onboarding.includes('<WaterBackground variant="onboarding" />'));
  assert.ok(theme.includes(".re-onboarding"));
  assert.ok(theme.includes('url("/re-assets/bg_plate.jpg")'));
});

test("RELogo는 한 위치에 하나의 완성된 수채화 lockup만 렌더링한다", () => {
  const brand = read("src/components/REBrand.jsx");
  const sidebar = read("src/components/WebSidebar.jsx");
  assert.ok(brand.includes('/re-assets/logo-lockup-watercolor.png'));
  assert.ok(brand.includes('/re-assets/logo-stacked-watercolor.png'));
  assert.equal(brand.includes("re-brand-logo__mark"), false);
  assert.equal(brand.includes("re-brand-logo__word"), false);
  assert.ok(sidebar.includes('<RELogo size="sm" />'));
});
