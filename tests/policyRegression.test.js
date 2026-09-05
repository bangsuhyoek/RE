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

test("웹 랜딩의 시작 CTA는 Splash를 거쳐 앱에 진입한다", () => {
  const app = read("src/App.jsx");
  const entry = read("src/components/EntryScreens.jsx");
  assert.ok(app.includes('content = <LandingScreen onContinue={() => navigate("splash")} />'));
  assert.ok(entry.includes("시작하기"));
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

test("버튼 표면 효과는 버튼 자체를 기준으로 배치된다", () => {
  const source = read("src/web-theme.css");
  assert.match(source, /\.re-button\s*\{[\s\S]*?position:\s*relative;/);
});
