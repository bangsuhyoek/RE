import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { serviceMarkToneKey } from "../src/lib/serviceBrand.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("V6 final-reference layer is loaded last", () => {
  const main = read("src/main.jsx");
  const v5 = main.indexOf('./landing-parity-v5.css');
  const v6 = main.indexOf('./landing-parity-v6.css');
  assert.ok(v5 >= 0 && v6 > v5);
});

test("one-letter monograms never identify a brand", () => {
  assert.equal(serviceMarkToneKey({ name: "Notion", monogram: "N" }), "default");
  assert.equal(serviceMarkToneKey({ name: "YouTrack", monogram: "Y" }), "default");
  assert.equal(serviceMarkToneKey({ id: "netflix", name: "Netflix", monogram: "N" }), "netflix");
  assert.equal(serviceMarkToneKey({ markTone: "youtube", name: "사용자 지정 서비스", monogram: "Y" }), "youtube");
});

test("legacy black ServiceMark fallback is visually neutralized without overriding explicit metadata tones", () => {
  const css = read("src/landing-parity-v6.css");
  assert.ok(css.includes('[class*="bg-[#18181B]"]:not([class*="!bg-"])'));
  assert.match(css, /background:\s*#edf4ff\s*!important/);
});

test("mobile Home hides the duplicate RE. title and promotes the watercolor lockup", () => {
  const css = read("src/landing-parity-v6.css");
  assert.match(css, /data-screen="home"[\s\S]*?logo-lockup-watercolor\.png/);
  assert.match(css, /data-screen="home"[\s\S]*?\.text-\\\[17px\\\][\s\S]*?display:\s*none\s*!important/);
});

test("Mini Calendar clamps selected day when month changes", () => {
  const home = read("src/components/HomeScreen.jsx");
  assert.match(home, /const moveMonth = \(delta\)/);
  assert.match(home, /new Date\(nextDate\.getFullYear\(\), nextDate\.getMonth\(\) \+ 1, 0\)\.getDate\(\)/);
  assert.match(home, /setSelectedDay\(\(current\) => Math\.min\(current, lastDay\)\)/);
});

test("Home matches the final reference blocks without injecting sample user data", () => {
  const home = read("src/components/HomeScreen.jsx");
  for (const marker of [
    "좋은 하루예요.",
    "작은 변화가,",
    "더 여유로운 내일을 만들어요.",
    "이번 달 구독 총액",
    "이번 달 절약 예정액",
    "re-dashboard-library-toolbar",
    "re-subscription-grid-card__more",
    "re-mini-calendar__agenda-date",
    "오늘의 한마디",
    "작은 구독 정리가",
  ]) assert.ok(home.includes(marker), `final reference marker missing: ${marker}`);
  assert.doesNotMatch(home, /128,400|52,000|Netflix Premium|17,000/);
});

test("Sidebar final reference keeps single lockup, active accent and HQ portrait profile", () => {
  const sidebar = read("src/components/WebSidebar.jsx");
  const css = read("src/landing-parity-v6.css");
  assert.match(sidebar, /<RELogo size="sm"/);
  assert.match(sidebar, /char_stand\.jpg/);
  assert.match(sidebar, /언제나, 너와 함께\./);
  assert.match(css, /\.re-web-sidebar__item\.is-active::before/);
});

test("Mini Calendar schedule is grouped by real billing dates and known marks remain metadata-toned", () => {
  const home = read("src/components/HomeScreen.jsx");
  assert.match(home, /agendaGroups/);
  assert.match(home, /getChargeDateInMonth/);
  assert.match(home, /serviceMarkToneKey/);
  assert.match(home, /serviceMarkToneClass\(subscription\)/);
});
