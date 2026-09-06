import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { serviceMarkToneKey } from "../src/lib/serviceBrand.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("직접 등록은 다음/이전 버튼 없이 같은 화면에서 자동 공개한다", () => {
  const source = read("src/components/AddModal.jsx");
  assert.equal(source.includes("nextManualStep"), false);
  assert.equal(source.includes("previousManualStep"), false);
  assert.ok(source.includes("setManualReveal((current) => Math.max(current, revealLevelFor(next)))"));
  assert.ok(source.includes('disabled={!manualRequiredValid(form)}'));
  for (const field of ["amount", "billing-cycle", "next-billing-date", "optional"]) {
    assert.ok(source.includes(`data-manual-field="${field}"`));
  }
});

test("온보딩은 수련 원본을 사용하고 데스크톱에서도 모바일 폭을 유지한다", () => {
  const brand = read("src/components/REBrand.jsx");
  const onboarding = read("src/components/OnboardingScreen.jsx");
  const shared = read("src/mobile-shared.css");
  assert.ok(brand.includes('/re-assets/bg_plate.jpg'));
  assert.equal(brand.includes('/re-assets/onboarding-lotus-source.png'), false);
  assert.ok(onboarding.includes('<WaterBackground variant="onboarding" />'));
  assert.match(shared, /\.re-onboarding[\s\S]*?width:\s*min\(100%,\s*390px\)/);
  assert.match(shared, /\[aria-label="구독 서비스 선택"\][\s\S]*?repeat\(2,/);
});

test("RELogo는 한 위치에 하나의 완성된 수채화 lockup만 렌더링한다", () => {
  const brand = read("src/components/REBrand.jsx");
  assert.ok(brand.includes('/re-assets/logo-lockup-watercolor.png'));
  assert.ok(brand.includes('/re-assets/logo-stacked-watercolor.png'));
  assert.equal(brand.includes("re-brand-logo__mark"), false);
  assert.equal(brand.includes("re-brand-logo__word"), false);
});

test("한 글자 monogram은 브랜드를 추정하지 않는다", () => {
  assert.equal(serviceMarkToneKey({ name: "Notion", monogram: "N" }), "default");
  assert.equal(serviceMarkToneKey({ name: "YouTrack", monogram: "Y" }), "default");
  assert.equal(serviceMarkToneKey({ id: "netflix", name: "Netflix", monogram: "N" }), "netflix");
  assert.equal(serviceMarkToneKey({ markTone: "youtube", name: "사용자 지정 서비스", monogram: "Y" }), "youtube");
});
