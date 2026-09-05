import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("기존 회원가입 입력·검증·비밀번호 표시 기능을 유지한다", () => {
  const source = read("src/components/AuthScreens.jsx");
  for (const marker of ["accountId", "passwordConfirm", "nickname", "showPassword", "showConfirm", "ValidationHint"]) {
    assert.ok(source.includes(marker), `회원가입 호환 기능 누락: ${marker}`);
  }
});

test("기존 직접 등록 필드를 유지한다", () => {
  const source = read("src/components/AddModal.jsx");
  for (const marker of ["name", "plan", "amount", "billingCycle", "nextBillingDate", "paymentMethod", "isTrial"]) {
    assert.ok(source.includes(marker), `직접 등록 필드 누락: ${marker}`);
  }
});

test("구독 카드의 상세·해지·알림 끄기 기능을 유지한다", () => {
  const source = read("src/components/ui.jsx");
  for (const marker of ["onOpen", "onCancel", "onMute", "알림 끄기", "해지"]) {
    assert.ok(source.includes(marker), `구독 카드 기능 누락: ${marker}`);
  }
});

test("구독 상세의 공식 사이트·알림·해지 기능을 유지한다", () => {
  const source = read("src/components/SubscriptionScreens.jsx");
  for (const marker of ["공식 웹사이트 열기", "결제 전 알림", "구독 해지하기", "해지 계속하기"]) {
    assert.ok(source.includes(marker), `구독 상세 기능 누락: ${marker}`);
  }
});

test("랜딩·스플래시·인트로 화면을 독립 구성으로 제공한다", () => {
  const source = read("src/components/EntryScreens.jsx");
  for (const marker of ["LandingScreen", "SplashScreen", "IntroScreen"]) assert.ok(source.includes(marker));
});
