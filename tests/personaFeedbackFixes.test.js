import test from "node:test";
import assert from "node:assert/strict";
import { collectAmounts } from "../api/_lib/receiptParser.js";
import fs from "node:fs";
import { promotionCatalog, serviceCatalog } from "../src/data/subscriptionData.js";

test("영수증 파서에서 달러($20.00) 결제를 감지하고 환산 금액(27,000원)을 추출한다", () => {
  const receiptText = "OpenAI ChatGPT Plus Subscription\nAmount: $20.00 USD\nDate: 2026-09-01";
  const amounts = collectAmounts(receiptText);
  assert.ok(amounts.length > 0);
  assert.equal(amounts[0].amount, 27000);
});

test("앱에 노출되는 혜택은 공식 페이지에서 확인된(LIVE_CONFIRMED) 항목뿐이고 ID와 서비스 참조가 유효하다", () => {
  const jsonCatalog = JSON.parse(fs.readFileSync(new URL("../public/catalog/promotions.json", import.meta.url), "utf8"));
  const serviceIds = new Set(serviceCatalog.map((s) => s.id));
  assert.ok(promotionCatalog.length > 0);
  for (const catalog of [promotionCatalog, jsonCatalog]) {
    assert.equal(new Set(catalog.map((p) => p.id)).size, catalog.length, "혜택 ID는 고유해야 합니다.");
  }
  // 수집 스크립트가 두 파일을 함께 갱신하고 앱은 내장 목록을 예비로 쓰므로 ID 집합이 같아야 한다.
  assert.deepEqual(
    [...new Set(promotionCatalog.map((p) => p.id))].sort(),
    [...new Set(jsonCatalog.map((p) => p.id))].sort(),
    "앱 내장 혜택 목록과 promotions.json의 ID 집합이 같아야 합니다."
  );
  for (const promo of [...promotionCatalog, ...jsonCatalog]) {
    assert.equal(promo.verifiedStatus, "LIVE_CONFIRMED", promo.id);
  }
  for (const promo of promotionCatalog) {
    for (const sId of promo.sourceServiceIds || []) {
      assert.ok(serviceIds.has(sId), `${promo.id}의 서비스 ID '${sId}'가 서비스 카탈로그에 있어야 합니다.`);
    }
  }
});

test("홈 배너가 연결하는 확인된 혜택이 카탈로그에 존재한다", () => {
  for (const id of ["naverplus-netflix", "youtube-promo", "disney-bundle-37"]) {
    assert.ok(promotionCatalog.some((p) => p.id === id), id);
  }
  const naverPromo = promotionCatalog.find((p) => p.id === "naverplus-netflix");
  assert.ok(naverPromo.link.startsWith("https://help.naver.com/"));
});

test("연간이 아닌 프로모션은 saving이 originalPrice를 초과하지 않는다", () => {
  for (const promo of promotionCatalog) {
    const isAnnual = promo.kind?.includes("연간") || promo.category === "학생/연간";
    if (!isAnnual) {
      assert.ok(
        promo.saving <= promo.originalPrice,
        `${promo.id} saving(${promo.saving})이 originalPrice(${promo.originalPrice})를 초과합니다`
      );
      if (promo.offerPrice > 0) {
        assert.equal(
          promo.saving,
          promo.originalPrice - promo.offerPrice,
          `${promo.id} saving(${promo.saving})이 originalPrice(${promo.originalPrice}) - offerPrice(${promo.offerPrice})와 일치하지 않습니다`
        );
      }
    }
  }
});
