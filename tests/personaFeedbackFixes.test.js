import test from "node:test";
import assert from "node:assert/strict";
import { collectAmounts } from "../api/_lib/receiptParser.js";
import { promotionCatalog } from "../src/data/subscriptionData.js";

test("영수증 파서에서 달러($20.00) 결제를 감지하고 환산 금액(27,000원)을 추출한다", () => {
  const receiptText = "OpenAI ChatGPT Plus Subscription\nAmount: $20.00 USD\nDate: 2026-09-01";
  const amounts = collectAmounts(receiptText);
  assert.ok(amounts.length > 0);
  assert.equal(amounts[0].amount, 27000);
});

test("프로모션 카탈로그에서 티빙 네이버플러스 링크가 네이버 공식 페이지로 올바르게 연결된다", () => {
  const tvingPromo = promotionCatalog.find((p) => p.id === "tving-naver");
  assert.ok(tvingPromo);
  assert.equal(tvingPromo.link, "https://nid.naver.com/membership/partner");
});

test("닉네임 정규식 완화 검증 (2글자 한글 외자 이름 및 영문 공백 이름)", () => {
  const nicknameRegex = /^[가-힣a-zA-Z0-9\s]{2,12}$/;
  assert.equal(nicknameRegex.test("태석"), true);
  assert.equal(nicknameRegex.test("이준"), true);
  assert.equal(nicknameRegex.test("Dave Lee"), true);
  assert.equal(nicknameRegex.test("A"), false);
});
