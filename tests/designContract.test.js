import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("runtime CSS policy is mobile-only and loads the approved reference last", () => {
  const main = read("src/main.jsx");
  const imports = [...main.matchAll(/import "(.+?\.css)";/g)].map((match) => match[1]);
  assert.deepEqual(imports, [
    "./index.css",
    "./mobile-shared.css",
    "./mobile-final.css",
    "./mobile-final-reference.css",
  ]);
});

test("retired web and landing parity policy files are removed", () => {
  for (const path of [
    "src/web-theme.css",
    "src/dashboard-theme.css",
    "src/final-theme.css",
    "src/landing-parity-v2.css",
    "src/landing-parity-v5.css",
    "src/landing-parity-v6.css",
  ]) {
    assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), false, `retired policy still exists: ${path}`);
  }
});

test("wide desktop preview keeps the same 390px mobile app canvas", () => {
  const shared = read("src/mobile-shared.css");
  const reference = read("src/mobile-final-reference.css");
  assert.match(shared, /\.app-shell\.re-mobile-final-shell[\s\S]*?max-width:\s*390px\s*!important/);
  assert.match(shared, /\.sheet-slide-up[\s\S]*?width:\s*min\(100%,\s*390px\)\s*!important/);
  assert.match(reference, /width:\s*min\(100%,\s*390px\)/);
  assert.doesNotMatch(shared, /@media\s*\(min-width:/);
});

test("active app routes use the mobile final screens rather than legacy web screens", () => {
  const app = read("src/App.jsx");
  assert.match(app, /from "\.\/components\/MobileFinalScreens"/);
  assert.match(app, /from "\.\/components\/MobileAuthScreens"/);
  assert.match(app, /from "\.\/components\/MobileEntryScreens"/);
  assert.doesNotMatch(app, /WebSidebar|<BottomNavigation/);
});

test("shared mobile policy preserves onboarding and bottom-sheet behavior", () => {
  const shared = read("src/mobile-shared.css");
  const ui = read("src/components/ui.jsx");
  const onboarding = read("src/components/OnboardingScreen.jsx");
  assert.match(shared, /\.re-onboarding[\s\S]*?width:\s*min\(100%,\s*390px\)/);
  assert.match(shared, /\.re-onboarding-footer[\s\S]*?max-width:\s*390px\s*!important/);
  assert.match(shared, /\.re-manual-progressive/);
  assert.match(ui, /sheet-slide-up fixed inset-x-0 bottom-0/);
  assert.match(onboarding, /<WaterBackground variant="onboarding" \/>/);
});
