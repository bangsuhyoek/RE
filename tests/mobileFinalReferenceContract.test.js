import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

test("approved 12-screen reference layer is the final visual owner", () => {
  const main = read("src/main.jsx");
  const css = read("src/mobile-final-reference.css");
  assert.ok(main.lastIndexOf('import "./mobile-final-reference.css";') > main.lastIndexOf('import "./mobile-final.css";'));
  assert.match(css, /width:\s*min\(100%,\s*390px\)/);
  assert.match(css, /Strict final-reference fidelity corrections/);
});

test("opening sequence uses the approved splash and brand-intro artwork without extra visible CTA chrome", () => {
  const entry = read("src/components/MobileEntryScreens.jsx");
  assert.ok(entry.includes("splash-final.webp"));
  assert.ok(entry.includes("brand-intro-final.webp"));
  assert.ok(entry.includes("re-ref-static-landing__tap"));
  assert.equal(entry.includes("re-ref-static-landing__actions"), false);
});

test("final mobile screens no longer reuse the old generic character assets", () => {
  const files = [
    "src/components/MobileEntryScreens.jsx",
    "src/components/MobileAuthScreens.jsx",
    "src/components/MobileFinalScreens.jsx",
  ];
  for (const file of files) {
    const source = read(file);
    assert.equal(source.includes("char_stand.jpg"), false, `${file} still reuses char_stand.jpg`);
    assert.equal(source.includes("/sd/idle.png"), false, `${file} still reuses sd/idle.png`);
  }
  const css = read("src/mobile-final-reference.css");
  assert.match(css, /Never crop final reference characters/);
  assert.match(css, /object-fit:\s*contain\s*!important/);
});

test("service intro uses the approved illustrated feature art and approved copy", () => {
  const entry = read("src/components/MobileEntryScreens.jsx");
  for (const marker of [
    "intro-feature-search.webp",
    "intro-feature-alert.webp",
    "intro-feature-checklist.webp",
    "나도 모르게 결제되고 있는 숨은 구독까지 한눈에 확인해요.",
    "다음 결제일을 미리 알려드려 불필요한 지출을 막을 수 있어요.",
    "해지 전 꼭 확인할 것들을 정리해 더 현명한 선택을 할 수 있어요.",
  ]) assert.ok(entry.includes(marker), `intro reference marker missing: ${marker}`);
});

test("known services use approved logo crops while unknown services keep the neutral metadata fallback", () => {
  const source = read("src/components/MobileFinalScreens.jsx");
  assert.ok(source.includes("serviceLogoKey"));
  assert.ok(source.includes("/services/${logo}.webp"));
  assert.ok(source.includes("<ServiceMark name="));
  for (const file of ["netflix.webp", "youtube.webp", "spotify.webp", "disney.webp"]) {
    assert.ok(exists(`public/re-assets/mobile-final/services/${file}`), `${file} missing`);
  }
});

test("final-reference raster assets exist and are non-empty", () => {
  const required = [
    "splash-final.webp",
    "brand-intro-final.webp",
    "character-avatar.webp",
    "character-banner.webp",
    "character-detail.webp",
    "character-intro.webp",
    "character-login.webp",
    "character-notification-footer.webp",
    "character-notifications.webp",
    "character-register.webp",
    "character-settings-banner.webp",
    "character-subscriptions.webp",
    "frame-left.webp",
    "frame-right.webp",
    "intro-feature-search.webp",
    "intro-feature-alert.webp",
    "intro-feature-checklist.webp",
    "social/google.webp",
    "social/naver.webp",
  ];
  for (const file of required) {
    const url = new URL(`../public/re-assets/mobile-final/${file}`, import.meta.url);
    assert.ok(existsSync(url), `missing ${file}`);
    assert.ok(statSync(url).size > 500, `empty/suspicious ${file}`);
  }
});

test("unimplemented product capabilities remain visually honest", () => {
  const auth = read("src/components/MobileAuthScreens.jsx");
  const settings = read("src/components/MobileFinalScreens.jsx");
  assert.ok(auth.includes('aria-disabled="true"'));
  assert.ok(auth.includes("둘러보기는 준비 중이에요."));
  assert.equal(auth.includes("실제 소셜 인증"), false);
  assert.ok(settings.includes("결제 완료 알림"));
  assert.ok(settings.includes("준비 중인 기능이에요."));
  assert.equal(settings.includes("fake"), false);
});


test("login and register keep the approved final-reference writing", () => {
  const auth = read("src/components/MobileAuthScreens.jsx");
  for (const marker of [
    "다시 만나서",
    "반가워요. 🌸",
    "오늘도,",
    "더 좋은 나를 만들어가요.",
    "아이디 또는 이메일",
    "로그인 상태 유지",
    "비밀번호 찾기 ›",
    "Google",
    "네이버",
    'suffix = "로그인"',
    "회원가입 🌸",
    "RE.와 함께, 더 가벼운 오늘을 시작해요.",
    "비밀번호 확인",
    "닉네임",
  ]) assert.ok(auth.includes(marker), `auth reference copy missing: ${marker}`);
});

test("home, subscription, calendar and detail keep the approved information hierarchy", () => {
  const mobile = read("src/components/MobileFinalScreens.jsx");
  for (const marker of [
    "좋은 하루예요. 🌸",
    "이번 달 구독 총액",
    "구독 개수",
    "결제 예정",
    "이번 달 절약 예정액",
    "다가오는 결제",
    "내 구독 서비스",
    "내 구독",
    "구독 서비스 검색하기...",
    "구독 추가하기",
    "구독 상세",
    "공식 해지 사이트",
    "해지 체크리스트",
    "해지 가이드",
    "이번 달 결제 예정",
  ]) assert.ok(mobile.includes(marker), `mobile reference hierarchy missing: ${marker}`);
});

test("notification, benefit and settings screens keep final-reference headings without fake sample data", () => {
  const mobile = read("src/components/MobileFinalScreens.jsx");
  for (const marker of [
    "알림 🌸",
    "소중한 구독 생활을,",
    "결제 알림",
    "서비스 소식",
    "혜택·이벤트",
    "맞춤 혜택 & 프로모션 🎁",
    "언제나 고마워요. 🌸",
    "서비스 소개 다시 보기",
    "개인정보 및 데이터 안내",
    "로그아웃",
  ]) assert.ok(mobile.includes(marker), `reference heading missing: ${marker}`);
  assert.doesNotMatch(mobile, /128,400|52,000|17,000|14,900/);
});

test("reference CSS avoids the old wide 460px mobile canvas and destructive hero cropping", () => {
  const css = read("src/mobile-final-reference.css");
  assert.equal(css.includes("width: min(100%, 460px)"), false);
  assert.match(css, /width:\s*min\(100%,\s*390px\)/);
  assert.match(css, /\.re-ref-character-window--login[\s\S]*?width:\s*265px/);
  assert.match(css, /\.re-ref-hero-art img[\s\S]*?object-fit:\s*contain/);
});

test("v3 visual review keeps approved geometry visible at 390px without clipping key CTAs", () => {
  const css = read("src/mobile-final-reference.css");
  const marker = "Final-reference v3 geometry corrections";
  assert.ok(css.includes(marker));
  const v3 = css.slice(css.lastIndexOf(marker));
  assert.match(v3, /\.re-ref-mini-calendar, \.re-ref-mini-agenda \{ height:\s*120px; min-height:\s*120px;/);
  assert.match(v3, /\.re-ref-subscription-card__main \{ min-height:\s*62px;/);
  assert.match(v3, /\.re-ref-add-subscription \{ min-height:\s*43px;/);
  assert.match(v3, /\.re-ref-character-window--login \{ right:\s*-4px; top:\s*18px; width:\s*230px; height:\s*300px;/);
  assert.match(v3, /\.re-ref-calendar-grid > button, \.re-ref-calendar-grid > span \{ height:\s*28px; aspect-ratio:\s*auto;/);
});
