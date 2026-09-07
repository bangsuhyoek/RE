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
