import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const main = read("src/main.jsx");
const css = read("src/landing-parity-v5.css");
const cssV6 = read("src/landing-parity-v6.css");
const home = read("src/components/HomeScreen.jsx");
const subscription = read("src/components/SubscriptionScreens.jsx");
const settings = read("src/components/SettingsScreen.jsx");
const add = read("src/components/AddModal.jsx");
const notifications = read("src/components/NotificationComponents.jsx");
const benefits = read("src/components/PromotionScreen.jsx");
const serviceBrand = read("src/lib/serviceBrand.js");
const serviceData = read("src/data/subscriptionData.js");
const onboarding = read("src/components/OnboardingScreen.jsx");

test("V6 final-reference theme loads after V5 and the broken V4 override stays removed", () => {
  assert.match(main, /landing-parity-v5\.css[\s\S]*landing-parity-v6\.css/);
  assert.doesNotMatch(main, /landing-parity-v4\.css/);
});

test("app shell never changes every direct child into a positioned element", () => {
  assert.doesNotMatch(css, />\s*\*\s*\{/);
  assert.match(css, /> \.re-page-transition/);
});

test("desktop sidebar and overlay roots keep fixed positioning", () => {
  assert.match(css, /\.re-web-sidebar\s*\{[\s\S]*?position:\s*fixed\s*!important/);
  assert.match(css, /\.sheet-backdrop\s*\{[\s\S]*?position:\s*fixed\s*!important/);
  assert.match(css, /z-index:\s*1000\s*!important/);
});

test("Home brand slots use high-quality character assets and state empty uses SD/Rive", () => {
  assert.match(home, /re-concierge-card__character re-character-hq[\s\S]*?sd\/idle\.png/);
  assert.match(home, /re-dashboard-guide-banner[\s\S]*?hero\.jpg/);
  assert.match(home, /re-dashboard-greeting__aside[\s\S]*?char_stand\.jpg/);
  assert.match(home, /re-dashboard-empty-state__character/);
});

test("Calendar brand tip is HQ while empty agenda stays SD/Rive", () => {
  assert.match(subscription, /re-calendar-tip__character re-character-hq/);
  assert.match(subscription, /char_stand\.jpg/);
  assert.match(subscription, /RiveCharacter state="idle" className="re-calendar-agenda__character"/);
});

test("service cards use metadata-backed colored rounded monograms instead of the old uniform black mark", () => {
  assert.match(serviceData, /markTone: "youtube"/);
  assert.match(serviceBrand, /youtube[\s\S]*?!bg-\[#FF0033\]/);
  assert.match(home, /serviceMarkToneClass/);
  assert.match(subscription, /serviceMarkToneClass/);
  assert.match(onboarding, /serviceMarkToneClass/);
  assert.match(subscription, /rounded-full/);
  assert.ok(cssV6.includes('[class*="bg-[#18181B]"]:not([class*="!bg-"])'));
  assert.match(cssV6, /background:\s*#edf4ff\s*!important/);
});

test("settings does not expose mock or fixture implementation language", () => {
  assert.doesNotMatch(settings, /가짜 구독 데이터 없음/);
  assert.doesNotMatch(settings, /fixture/i);
  assert.match(settings, /데이터 및 개인정보/);
});

test("manual add is same-page progressive disclosure without next/previous wizard buttons", () => {
  assert.match(add, /re-manual-progressive/);
  assert.match(add, /manualReveal >= 1/);
  assert.match(add, /manualReveal >= 4/);
  assert.doesNotMatch(add, /<Button[^>]*>\s*다음(?:\s|<)/);
  assert.doesNotMatch(add, /<Button[^>]*>\s*이전(?:\s|<)/);
  assert.match(add, /OCR/);
  assert.match(add, /결제 문자/);
  assert.match(add, /직접 입력/);
});

test("onboarding uses the lotus artwork itself rather than a captured landing screenshot", () => {
  assert.match(read("src/components/REBrand.jsx"), /variant === "onboarding"[\s\S]*?bg_plate\.jpg/);
  assert.doesNotMatch(read("src/components/REBrand.jsx"), /onboarding-lotus-source\.png/);
});

test("notification and benefit empty states use SD/Rive and preserve actual-data-only behavior", () => {
  assert.match(notifications, /re-notification-empty__character/);
  assert.match(benefits, /re-benefit-empty__character/);
  assert.match(benefits, /promotions\.filter/);
  assert.doesNotMatch(benefits, /Netflix|Spotify|Disney\+/);
});
