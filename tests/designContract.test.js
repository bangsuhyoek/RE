import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("확정 랜딩페이지 원본과 클릭 hotspot 구조를 유지한다", () => {
  const entry = read("src/components/EntryScreens.jsx");
  assert.ok(entry.includes("/re-assets/web/landing-page-reference.png"));
  assert.ok(entry.includes("re-reference-hotspot--hero-start"));
});

test("캐릭터는 브랜드 슬롯 HQ / 상태 슬롯 SD로 분리한다", () => {
  const home = read("src/components/HomeScreen.jsx");
  const sidebar = read("src/components/WebSidebar.jsx");
  const calendar = read("src/components/SubscriptionScreens.jsx");
  const rive = read("src/components/RiveCharacter.jsx");

  assert.ok(home.includes('/re-assets/char_stand.jpg'));
  assert.ok(home.includes('/re-assets/hero.jpg'));
  assert.ok(sidebar.includes('/re-assets/char_stand.jpg'));
  assert.ok(calendar.includes('re-calendar-tip__character re-character-hq'));
  assert.ok(calendar.includes('RiveCharacter state="idle" className="re-calendar-agenda__character"'));
  for (const asset of ["sd/idle.png", "sd/sorry.png", "sd/loading.png", "sd/done.png"]) {
    assert.ok(rive.includes(asset), `상태 캐릭터 fallback 누락: ${asset}`);
  }
});

test("App Shell은 Sidebar/Modal의 fixed positioning을 덮어쓰지 않는다", () => {
  const theme = read("src/landing-parity-v5.css");
  assert.equal(/>\s*\*\s*\{/.test(theme), false);
  assert.match(theme, /\.re-web-sidebar\s*\{[\s\S]*?position:\s*fixed\s*!important/);
  assert.match(theme, /\.sheet-backdrop\s*\{[\s\S]*?position:\s*fixed\s*!important/);
});

test("캘린더는 미니 캘린더의 확장형이며 선택일은 작은 원형이다", () => {
  const source = read("src/components/SubscriptionScreens.jsx");
  const theme = read("src/landing-parity-v5.css");
  for (const marker of ["re-calendar-shell", "re-calendar-main", "re-calendar-summary", "re-calendar-tip", "re-calendar-agenda"]) {
    assert.ok(source.includes(marker), `캘린더 UI 계약 누락: ${marker}`);
  }
  assert.ok(theme.includes(".re-calendar-day.is-selected"));
  assert.ok(theme.includes("border-radius: 50% !important"));
});

test("최종 디자인 레이어는 V6가 V5 뒤에 로드되고 V4는 더 이상 로드하지 않는다", () => {
  const main = read("src/main.jsx");
  const v2 = main.indexOf('./landing-parity-v2.css');
  const v5 = main.indexOf('./landing-parity-v5.css');
  const v6 = main.indexOf('./landing-parity-v6.css');
  assert.ok(v2 >= 0 && v5 > v2 && v6 > v5);
  assert.equal(main.includes('./landing-parity-v4.css'), false);
});
