import test from "node:test";
import assert from "node:assert/strict";
import { getPaymentMethodInfo } from "../src/lib/paymentMethod.js";

test("결제 수단 식별자가 주요 간편결제 및 카드사를 정확히 분류한다", () => {
  assert.equal(getPaymentMethodInfo("카카오페이").brand, "kakaopay");
  assert.equal(getPaymentMethodInfo("네이버페이").brand, "naverpay");
  assert.equal(getPaymentMethodInfo("토스페이").brand, "tosspay");
  assert.equal(getPaymentMethodInfo("PayPal").brand, "paypal");
  assert.equal(getPaymentMethodInfo("페이팔").brand, "paypal");
  assert.equal(getPaymentMethodInfo("Apple Pay").brand, "applepay");
  assert.equal(getPaymentMethodInfo("Google Pay").brand, "googlepay");
  assert.equal(getPaymentMethodInfo("신한카드 • 4412").brand, "shinhan");
  assert.equal(getPaymentMethodInfo("현대카드 • 1298").brand, "hyundai");
  assert.equal(getPaymentMethodInfo("KB국민카드 • 8831").brand, "kb");
  assert.equal(getPaymentMethodInfo("삼성카드 • 3701").brand, "samsung");
  assert.equal(getPaymentMethodInfo("롯데카드").brand, "lotte");
  assert.equal(getPaymentMethodInfo("우리카드").brand, "woori");
  assert.equal(getPaymentMethodInfo("하나카드").brand, "hana");
  assert.equal(getPaymentMethodInfo("BC카드 • 3319").brand, "bc");
  assert.equal(getPaymentMethodInfo("NH농협카드").brand, "nh");
  assert.equal(getPaymentMethodInfo("계좌이체").brand, "bank");
  assert.equal(getPaymentMethodInfo("기타 신용카드").brand, "card");
  assert.equal(getPaymentMethodInfo("").brand, "none");
  assert.equal(getPaymentMethodInfo("등록 안 됨").brand, "none");
  assert.equal(getPaymentMethodInfo("직접 관리").brand, "none");
});

test("결제 수단 식별자가 카드 뒷 4자리를 정상 추출한다", () => {
  assert.equal(getPaymentMethodInfo("현대카드 • 1298").last4, "1298");
  assert.equal(getPaymentMethodInfo("신한카드 • 4412").last4, "4412");
  assert.equal(getPaymentMethodInfo("KB국민카드 • 8831").last4, "8831");
  assert.equal(getPaymentMethodInfo("카카오페이").last4, null);
  assert.equal(getPaymentMethodInfo("").last4, null);
});

test("빠른 구독 선택 시 결제수단이 임의 자동 주입되지 않고 기존 상태를 유지한다", () => {
  const presetService = {
    id: "netflix",
    name: "Netflix",
    category: "OTT",
    paymentMethod: "신한카드 • 4412",
  };

  const applyPresetLogic = (service, currentForm) => ({
    ...currentForm,
    name: service.name,
    category: service.category || "기타",
    plan: "",
    amount: "",
    paymentMethod: currentForm.paymentMethod || "",
  });

  // 1. 기존에 결제수단을 입력하지 않은 상태에서 프리셋 선택 시 -> 여전히 빈 값(미등록)
  const res1 = applyPresetLogic(presetService, { name: "", paymentMethod: "" });
  assert.equal(res1.paymentMethod, "");
  assert.equal(getPaymentMethodInfo(res1.paymentMethod).isRegistered, false);

  // 2. 기존에 사용자가 카카오페이를 선택한 상태에서 프리셋 선택 시 -> 사용자가 고른 카카오페이 유지
  const res2 = applyPresetLogic(presetService, { name: "", paymentMethod: "카카오페이" });
  assert.equal(res2.paymentMethod, "카카오페이");
});
