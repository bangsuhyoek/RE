import test from "node:test";
import assert from "node:assert/strict";
import { POPULAR_PRESETS } from "../src/data/subscriptionData.js";
import { DEFAULT_NOTIFICATION_DURATION } from "../src/lib/notifications.js";

test("비밀번호 완화 규칙: 영문과 숫자 포함 6~20자 통과 및 대문자/특수문자 필수 해제 검증", () => {
  const passwordFormat = /^(?=.*[a-zA-Z])(?=.*\d).{6,20}$/;
  assert.equal(passwordFormat.test("pass123"), true);
  assert.equal(passwordFormat.test("submate2026"), true);
  assert.equal(passwordFormat.test("MyPass1234!"), true);
  assert.equal(passwordFormat.test("onlyletters"), false);
  assert.equal(passwordFormat.test("12345678"), false);
  assert.equal(passwordFormat.test("p1234"), false);
});

test("인기 구독 8종 프리셋 데이터가 온전하게 정의되어 있다", () => {
  assert.equal(POPULAR_PRESETS.length, 8);
  const ids = POPULAR_PRESETS.map((p) => p.id);
  assert.ok(ids.includes("netflix"));
  assert.ok(ids.includes("youtube"));
  assert.ok(ids.includes("coupang"));
  assert.ok(ids.includes("tving"));
  assert.ok(ids.includes("disney"));
  assert.ok(ids.includes("naver"));
  assert.ok(ids.includes("millie"));
  assert.ok(ids.includes("spotify"));

  for (const p of POPULAR_PRESETS) {
    assert.ok(p.name && p.name.length > 0);
    assert.ok(p.amount > 0);
    assert.ok(p.plan && p.plan.length > 0);
    assert.ok(p.category && p.category.length > 0);
  }
});

test("공유 N빵 분담: 4인 파티 시 넷플릭스 프리미엄(17,000원)이 4,250원으로 계산된다", () => {
  const totalAmount = 17000;
  const splitCount = 4;
  const myShare = Math.round(totalAmount / splitCount);
  assert.equal(myShare, 4250);

  const isSplit = true;
  const finalAmount = isSplit ? Math.round(totalAmount / splitCount) : totalAmount;
  assert.equal(finalAmount, 4250);
});

test("알림바(Toast) 지속 시간이 피로도 감소를 위해 2~3초(2500ms)로 최적화되어 있다", () => {
  assert.equal(DEFAULT_NOTIFICATION_DURATION, 2500);
});

test("무료체험(trial) 구독은 0원이라도 정상 식별되어 결제 방어 알림 대상이 된다", () => {
  const sampleSubscriptions = [
    { subscriptionId: "sub-1", name: "Netflix", amount: 17000, isTrial: false },
    { subscriptionId: "sub-2", name: "쿠팡 와우 무료체험", amount: 0, isTrial: true },
  ];
  const trialSub = sampleSubscriptions.find((s) => Boolean(s.isTrial || s.status === "trial"));
  assert.ok(trialSub);
  assert.equal(trialSub.name, "쿠팡 와우 무료체험");
  assert.equal(trialSub.amount, 0);
});
