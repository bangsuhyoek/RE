import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("확정 랜딩페이지 원본을 변경하지 않고 사용한다", () => {
  const entry = read("src/components/EntryScreens.jsx");
  assert.ok(entry.includes("/re-assets/web/landing-page-reference.png"));
  assert.ok(entry.includes("re-reference-hotspot--hero-start"));
});

test("한 번의 리프레시 화면 뒤 랜딩을 보여주고 CTA Splash는 중복 표시하지 않는다", () => {
  const entry = read("src/components/EntryScreens.jsx");
  assert.ok(entry.includes("refreshShownThisLoad"));
  assert.ok(entry.includes("if (instant) return null"));
  assert.ok(entry.includes("if (showRefresh) return <RefreshBrand />"));
});

test("인트로와 서비스 내부는 고퀄리티 캐릭터를 상태 UI로 사용하지 않는다", () => {
  const entry = read("src/components/EntryScreens.jsx");
  const rive = read("src/components/RiveCharacter.jsx");
  const home = read("src/components/HomeScreen.jsx");
  const sidebar = read("src/components/WebSidebar.jsx");

  const introStart = entry.indexOf("export function IntroScreen");
  assert.ok(introStart >= 0);
  const intro = entry.slice(introStart);

  assert.equal(intro.includes("/re-assets/hero.jpg"), false);
  assert.equal(intro.includes("char_stand.jpg"), false);
  assert.equal(rive.includes("char_stand.jpg"), false);
  assert.equal(home.includes("char_stand.jpg"), false);
  assert.equal(sidebar.includes("/re-assets/sd_idle.jpg"), false);

  assert.ok(home.includes("/re-assets/sd/idle.png"));
  assert.ok(sidebar.includes("/re-assets/sd/idle.png"));

  for (const asset of ["sd/idle.png", "sd/sorry.png", "sd/loading.png", "sd/done.png"]) {
    assert.ok(rive.includes(asset), `SD 캐릭터 fallback 누락: ${asset}`);
  }
});

test("캘린더는 랜딩 미니 캘린더의 확장형 UI를 사용한다", () => {
  const source = read("src/components/SubscriptionScreens.jsx");
  const theme = read("src/final-theme.css");
  for (const marker of [
    "re-calendar-shell",
    "re-calendar-main",
    "re-calendar-summary",
    "re-calendar-tip",
    "re-calendar-agenda",
  ]) {
    assert.ok(source.includes(marker), `캘린더 UI 계약 누락: ${marker}`);
  }
  assert.ok(theme.includes(".re-calendar-day.is-selected"));
  assert.equal(source.includes('isSelected ? "bg-black font-bold text-white"'), false);
});

test("구독관리와 상세는 랜딩 기능 UI의 확장형 컴포넌트를 사용한다", () => {
  const source = read("src/components/SubscriptionScreens.jsx");
  for (const marker of [
    "re-subscription-toolbar",
    "re-final-tabs",
    "re-desktop-subscription-grid",
    "re-library-card",
    "re-detail-grid",
    "결제 전 알림 설정",
    "공식 웹사이트 열기",
    "구독 해지하기",
  ]) {
    assert.ok(source.includes(marker), `기능 UI 계약 누락: ${marker}`);
  }
});

test("최종 디자인 레이어는 마지막에 로드된다", () => {
  const main = read("src/main.jsx");
  const dashboard = main.indexOf('./dashboard-theme.css');
  const finalTheme = main.indexOf('./final-theme.css');
  assert.ok(dashboard >= 0 && finalTheme > dashboard);
});
