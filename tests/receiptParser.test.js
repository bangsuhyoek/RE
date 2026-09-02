import test from "node:test";
import assert from "node:assert/strict";
import { parseReceiptText } from "../api/_lib/receiptParser.js";

test("상품명 표현과 금액으로 티빙 스탠다드를 채운다", () => {
  const result = parseReceiptText(`
    상품명: TVING
    결제 금액: 13,500원
    결제일시: 2026-09-09 09:30
    결제 수단: 네이버페이
  `);

  assert.equal(result.ok, true);
  assert.deepEqual(result.data, {
    serviceId: "tving",
    name: "티빙",
    plan: "스탠다드",
    amount: 13500,
    dueDay: 9,
    billingCycle: "매월",
    paymentMethod: "네이버페이",
  });
  assert.equal(result.fieldSources.plan, "exact-service-amount");
});

test("결제 문자에 서비스명과 금액이 있으면 요금제를 매칭한다", () => {
  const result = parseReceiptText("13,500원 결제완료 티빙 09/10 네이버페이");
  assert.equal(result.data.serviceId, "tving");
  assert.equal(result.data.plan, "스탠다드");
  assert.equal(result.data.amount, 13500);
  assert.equal(result.data.dueDay, 10);
});

test("서비스를 모르면 금액만으로 요금제를 추정하지 않는다", () => {
  const result = parseReceiptText("상품 구매 완료\n결제금액 13,500원\n2026-09-09");
  assert.equal(result.data.name, "");
  assert.equal(result.data.plan, "");
  assert.equal(result.needsReview, true);
});

test("할인 금액이 요금제표와 다르면 플랜을 임의 입력하지 않는다", () => {
  const result = parseReceiptText("서비스명 티빙\n프로모션 결제금액 10,000원\n다음 결제일 10월 12일");
  assert.equal(result.data.name, "티빙");
  assert.equal(result.data.amount, 10000);
  assert.equal(result.data.plan, "");
  assert.equal(result.fieldSources.plan, "unmatched-amount");
});

test("명시된 플랜명은 금액보다 우선해 인식한다", () => {
  const result = parseReceiptText("서비스명 Netflix\n요금제 Premium\n청구 금액 17,000원\n다음 결제일 2026-10-15");
  assert.equal(result.data.name, "Netflix");
  assert.equal(result.data.plan, "프리미엄");
  assert.equal(result.data.dueDay, 15);
  assert.equal(result.fieldSources.plan, "labeled-plan");
});

test("텍스트가 없으면 인식 실패를 반환한다", () => {
  const result = parseReceiptText("  ");
  assert.equal(result.ok, false);
  assert.equal(result.code, "NO_TEXT");
});
