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

test("체험 프로모션 절약 문구: 1회성/무료 체험 프로모션은 '월' 문구 없이 '체험 혜택'으로 표시된다", () => {
  const resolveSavingText = (promotion) => {
    const savingAmount = Number(promotion.saving) || 0;
    const isAnnual = promotion.kind?.includes("연간") || promotion.category === "학생/연간";
    const isTrial = Boolean(promotion.kind?.includes("무료") || promotion.kind?.includes("체험"));
    if (isAnnual) {
      return savingAmount > 0
        ? `연 ${savingAmount.toLocaleString("ko-KR")}원 절약`
        : (promotion.offerPrice === 0 ? "0원 무료" : null);
    }
    if (isTrial) {
      return "체험 혜택";
    }
    if (savingAmount > 0) {
      return `월 ${savingAmount.toLocaleString("ko-KR")}원 절약`;
    }
    return promotion.offerPrice === 0 ? "0원 무료" : null;
  };

  const nintendoTrial = {
    id: "nintendo-7d-free",
    kind: "7일 무료 체험권",
    category: "100원/무료",
    saving: 2000,
    offerPrice: 0,
  };
  const savingText = resolveSavingText(nintendoTrial);
  assert.equal(savingText, "체험 혜택");
  assert.equal(savingText.includes("월"), false);

  const speakTrial = {
    id: "speak-7d-free",
    kind: "7일 무료 체험",
    category: "100원/무료",
    saving: 7250,
    offerPrice: 0,
  };
  assert.equal(resolveSavingText(speakTrial), "체험 혜택");

  const annualPromo = {
    id: "disney-annual-16",
    kind: "연간 결제 16% 할인 (2개월 무료 효과)",
    category: "학생/연간",
    saving: 19800,
    offerPrice: 99000,
  };
  assert.equal(resolveSavingText(annualPromo), "연 19,800원 절약");

  const regularMonthly = {
    id: "regular-discount",
    kind: "첫 달 50% 할인",
    category: "OTT",
    saving: 5000,
    offerPrice: 5000,
  };
  assert.equal(resolveSavingText(regularMonthly), "월 5,000원 절약");
});
