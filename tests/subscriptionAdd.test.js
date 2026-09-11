import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateEqualShare,
  hasRecordedPaymentMethod,
  isDuplicateSubscription,
  normalizePaymentMethod,
  normalizeSubscriptionPlan,
  normalizeSourceType,
  parseSubscriptionAmount,
  resolveSharingFields,
} from "../src/lib/subscriptionAdd.js";

test("결제수단 미인식 fallback 값은 기록된 결제수단으로 취급하지 않는다", () => {
  assert.equal(normalizePaymentMethod(""), "");
  assert.equal(normalizePaymentMethod("카드"), "");
  assert.equal(normalizePaymentMethod("기타 카드"), "");
  assert.equal(hasRecordedPaymentMethod("카드"), false);
  assert.equal(hasRecordedPaymentMethod("신한카드"), true);
  assert.equal(normalizePaymentMethod("  신한카드  "), "신한카드");
});

test("금액 문자열을 안전하게 숫자로 변환한다", () => {
  assert.equal(parseSubscriptionAmount("17,000원"), 17000);
  assert.equal(parseSubscriptionAmount("4250"), 4250);
  assert.equal(parseSubscriptionAmount(""), null);
});

test("공동 이용 균등 분담금을 계산한다", () => {
  assert.equal(calculateEqualShare(17000, 4), 4250);
  assert.equal(calculateEqualShare(14900, 3), 4967);
});

test("공동 이용 ON이면 전체 구독료와 개인 부담금을 분리한다", () => {
  const result = resolveSharingFields({
    grossAmount: 17000,
    personalAmount: 5000,
    sharingEnabled: true,
    shareCount: 4,
  });

  assert.deepEqual(result, {
    grossAmount: 17000,
    amount: 5000,
    sharingEnabled: true,
    shareCount: 4,
  });
});

test("공동 이용 OFF이면 개인 부담금을 전체 구독료로 복원한다", () => {
  const result = resolveSharingFields({
    grossAmount: 17000,
    personalAmount: 4250,
    sharingEnabled: false,
    shareCount: 4,
  });

  assert.deepEqual(result, {
    grossAmount: 17000,
    amount: 17000,
    sharingEnabled: false,
    shareCount: null,
  });
});

test("요금제와 sourceType은 UI에서 값이 없어도 안전하게 정규화된다", () => {
  assert.equal(normalizeSubscriptionPlan(""), "기본 플랜");
  assert.equal(normalizeSubscriptionPlan(" 프리미엄 "), "프리미엄");

  assert.equal(normalizeSourceType("sms"), "sms");
  assert.equal(normalizeSourceType("image"), "image");
  assert.equal(normalizeSourceType("unknown"), "manual");
});

test("요금제가 비어 있어도 중복 구독 검사는 오류 없이 기본 플랜으로 비교한다", () => {
  const existing = [
    {
      name: "Netflix",
      plan: "",
    },
  ];

  assert.equal(
    isDuplicateSubscription(existing, {
      name: " Netflix ",
      plan: undefined,
    }),
    true
  );

  assert.equal(
    isDuplicateSubscription(existing, {
      name: "Netflix",
      plan: "프리미엄",
    }),
    false
  );
});
