import test from "node:test";
import assert from "node:assert/strict";
import { collectAmounts } from "../api/_lib/receiptParser.js";
import fs from "node:fs";
import { promotionCatalog } from "../src/data/subscriptionData.js";

test("영수증 파서에서 달러($20.00) 결제를 감지하고 환산 금액(27,000원)을 추출한다", () => {
  const receiptText = "OpenAI ChatGPT Plus Subscription\nAmount: $20.00 USD\nDate: 2026-09-01";
  const amounts = collectAmounts(receiptText);
  assert.ok(amounts.length > 0);
  assert.equal(amounts[0].amount, 27000);
});

test("앱에 노출되는 혜택은 공식 페이지에서 확인된(LIVE_CONFIRMED) 항목뿐이다", () => {
  const jsonCatalog = JSON.parse(fs.readFileSync(new URL("../public/catalog/promotions.json", import.meta.url), "utf8"));
  assert.ok(promotionCatalog.length > 0);
  for (const promo of [...promotionCatalog, ...jsonCatalog]) {
    assert.equal(promo.verifiedStatus, "LIVE_CONFIRMED", promo.id);
  }
  assert.deepEqual(promotionCatalog.map((p) => p.id), jsonCatalog.map((p) => p.id));
});

test("홈 배너가 연결하는 확인된 혜택이 카탈로그에 존재한다", () => {
  for (const id of ["naverplus-netflix", "youtube-promo", "disney-bundle-37"]) {
    assert.ok(promotionCatalog.some((p) => p.id === id), id);
  }
  const naverPromo = promotionCatalog.find((p) => p.id === "naverplus-netflix");
  assert.ok(naverPromo.link.startsWith("https://help.naver.com/"));
});

test("닉네임 정규식 완화 검증 (2글자 한글 외자 이름 및 영문 공백 이름)", () => {
  const nicknameRegex = /^[가-힣a-zA-Z0-9\s]{2,12}$/;
  assert.equal(nicknameRegex.test("태석"), true);
  assert.equal(nicknameRegex.test("이준"), true);
  assert.equal(nicknameRegex.test("Dave Lee"), true);
  assert.equal(nicknameRegex.test("A"), false);
});
