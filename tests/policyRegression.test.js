import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("운영 프론트엔드에서 cancel_pending 상태를 다시 사용하지 않는다", () => {
  const files = [
    "src/App.jsx",
    "src/components/CancelModal.jsx",
    "src/components/SubscriptionScreens.jsx",
    "src/components/HomeScreen.jsx",
    "src/data/subscriptionData.js",
  ];
  for (const file of files) {
    assert.equal(read(file).includes("cancel_pending"), false, `${file}에 cancel_pending 정책이 다시 들어갔습니다.`);
  }
});

test("App의 저장 effect는 값을 cleanup으로 반환하지 않는다", () => {
  const source = read("src/App.jsx");
  assert.equal(source.includes("useEffect(() => writeStoredValue"), false);
  assert.equal(source.includes("useEffect(() => saveStoredNotifications"), false);
});

test("승인한 랜딩 이미지는 원본 비율 contain으로 표시하고 시작 CTA는 Splash를 거친다", () => {
  const app = read("src/App.jsx");
  const entry = read("src/components/EntryScreens.jsx");
  const theme = read("src/dashboard-theme.css");
  assert.ok(app.includes('<LandingScreen onContinue={() => navigate("splash")} onLogin='));
  assert.ok(entry.includes('/re-assets/web/landing-page-reference.png'));
  assert.match(theme, /\.re-reference-landing__image[\s\S]*?object-fit:\s*contain;/);
  assert.ok(entry.includes('re-reference-hotspot--hero-start'));
});

test("직접 등록은 단계형 Progressive Disclosure를 유지한다", () => {
  const source = read("src/components/AddModal.jsx");
  for (const marker of ["MANUAL_STEPS", "manualStep", "nextManualStep", "previousManualStep", "다음 결제일은 언제인가요?"]) {
    assert.ok(source.includes(marker), `직접 등록 단계 기능 누락: ${marker}`);
  }
});

test("해지 완료 CTA는 모든 확인 단계 이후에만 나타난다", () => {
  const source = read("src/components/CancelModal.jsx");
  assert.ok(source.includes("const allChecked = checked.every(Boolean)"));
  assert.ok(source.includes("{allChecked ? ("));
  assert.ok(source.includes("해지 완료했습니다"));
});

test("해지 완료는 활성 구독 제거와 별도 이력 보존을 함께 수행한다", () => {
  const app = read("src/App.jsx");
  const storage = read("src/lib/storage.js");
  assert.ok(app.includes("setCancellationHistory"));
  assert.ok(app.includes("cancellationRecord"));
  assert.ok(storage.includes("cancellationHistory"));
  assert.ok(app.includes("current.filter((subscription) => subscription.subscriptionId !== subscriptionId)"));
});

test("대시보드는 승인 시안의 주요 실제 기능 블록을 제공한다", () => {
  const source = read("src/components/HomeScreen.jsx");
  for (const marker of [
    "이번 달 구독 예상액",
    "구독 개수",
    "결제 예정",
    "이번 달 줄인 금액",
    "결제 예정 구독",
    "내 구독 서비스",
    "무료체험",
    "해지됨",
    "전체 일정 보기",
  ]) {
    assert.ok(source.includes(marker), `대시보드 기능 누락: ${marker}`);
  }
});

test("버튼 표면 효과는 버튼 자체를 기준으로 배치된다", () => {
  const source = read("src/web-theme.css");
  assert.match(source, /\.re-button\s*\{[\s\S]*?position:\s*relative;/);
});
