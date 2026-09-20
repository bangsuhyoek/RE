import test from "node:test";
import assert from "node:assert/strict";
import {
  detectPaymentNotification,
  PaymentDecision,
  PAYMENT_PARSER_CONTRACT_VERSION,
} from "../src/features/payment/paymentDetection.js";
import {
  DEMO_PAYMENT_FIXTURES,
  getDemoPaymentFixture,
} from "../src/features/payment/paymentFixtures.js";

test("Web production payment parser uses the Android contract version", () => {
  assert.match(PAYMENT_PARSER_CONTRACT_VERSION, /^android-payment-parser-/);
});

for (const fixture of DEMO_PAYMENT_FIXTURES) {
  test(`[Web production contract] ${fixture.label}`, () => {
    const result = detectPaymentNotification(fixture.rawEvent);
    assert.equal(result.decision, fixture.expected.decision);
    if (fixture.expected.decision === PaymentDecision.MATCH) {
      assert.equal(result.candidate.serviceId, fixture.expected.serviceId);
      assert.equal(result.candidate.amount, fixture.expected.amount);
      assert.equal(result.candidate.paymentMethod, fixture.expected.paymentMethod);
      assert.equal(result.candidate.autoDetected, true);
      assert.equal(result.candidate.sourceType, "sms");
    } else {
      assert.equal(result.reasonCode, fixture.expected.reasonCode);
    }
  });
}

test("Raw demo fixture contains no precomputed registration result", () => {
  const fixture = getDemoPaymentFixture("netflix-shinhan");
  assert.equal(Object.hasOwn(fixture.rawEvent, "serviceName"), false);
  assert.equal(Object.hasOwn(fixture.rawEvent, "amount"), false);
  assert.equal(Object.hasOwn(fixture.rawEvent, "paymentMethod"), false);
  assert.equal(Object.hasOwn(fixture.rawEvent, "plan"), false);
});

test("Raw Event -> actual Quick Add candidate mapping", () => {
  const fixture = getDemoPaymentFixture("netflix-shinhan");
  const result = detectPaymentNotification(fixture.rawEvent);
  assert.equal(result.decision, PaymentDecision.MATCH);
  assert.deepEqual(
    {
      name: result.candidate.name,
      amount: result.candidate.amount,
      plan: result.candidate.plan,
      paymentMethod: result.candidate.paymentMethod,
      category: result.candidate.category,
      serviceId: result.candidate.serviceId,
      sourceType: result.candidate.sourceType,
      autoDetected: result.candidate.autoDetected,
    },
    {
      name: "Netflix",
      amount: 17000,
      plan: "프리미엄",
      paymentMethod: "신한카드",
      category: "OTT",
      serviceId: "netflix",
      sourceType: "sms",
      autoDetected: true,
    }
  );
});
