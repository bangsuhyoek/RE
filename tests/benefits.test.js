import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { filterActivePromotions } from "../src/lib/promotionsSync.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readCatalog(name) {
  const filePath = path.join(__dirname, "../public/catalog", name);
  assert.ok(fs.existsSync(filePath), `${name} 파일이 존재해야 합니다.`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const services = readCatalog("services.json");
const serviceIdSet = new Set(services.map((s) => s.id));

test("라이브 혜택 카탈로그는 ID가 고유하고 모든 항목이 유효한 서비스에 연결된다", () => {
  const promotions = readCatalog("promotions.json");

  assert.equal(new Set(services.map((s) => s.id)).size, services.length, "서비스 ID는 고유해야 합니다.");
  assert.equal(new Set(promotions.map((p) => p.id)).size, promotions.length, "프로모션 ID는 고유해야 합니다.");

  for (const promo of promotions) {
    assert.ok(promo.id, "모든 프로모션은 ID가 있어야 합니다.");
    assert.ok((promo.sourceServiceIds || []).length > 0, `${promo.id}는 연결된 서비스가 있어야 합니다.`);
    for (const sId of promo.sourceServiceIds) {
      assert.ok(serviceIdSet.has(sId), `${promo.id}의 서비스 ID '${sId}'는 서비스 목록에 존재해야 합니다.`);
    }
  }
});

test("filterActivePromotions는 캐시와 번들이 겹쳐도 제휴 혜택을 한 번만 노출한다", () => {
  const promotions = readCatalog("promotions.json");
  const once = filterActivePromotions(promotions);
  const twice = filterActivePromotions([...promotions, ...promotions]);

  assert.deepEqual(twice.map((p) => p.id), once.map((p) => p.id));
  assert.equal(new Set(twice.map((p) => p.id)).size, twice.length);

  const multiService = { id: "bundle-x", sourceServiceIds: ["a", "b"], verifiedStatus: "LIVE_CONFIRMED" };
  const merged = filterActivePromotions([multiService, { ...multiService }, { id: "free", isFreeTier: true, sourceServiceIds: ["a"] }]);
  assert.deepEqual(merged.map((p) => p.id), ["bundle-x"]);
});

test("마스터 카탈로그는 ID가 고유하고, 라이브 카탈로그는 마스터의 부분집합이며 상시 무료 항목을 노출하지 않는다", () => {
  const master = readCatalog("promotions-master.json");
  const live = readCatalog("promotions.json");
  const masterById = new Map(master.map((p) => [p.id, p]));

  assert.equal(masterById.size, master.length, "마스터 카탈로그 ID는 고유해야 합니다.");

  for (const promo of master) {
    for (const sId of promo.sourceServiceIds || []) {
      assert.ok(serviceIdSet.has(sId), `마스터의 sourceServiceId '${sId}'가 유효해야 합니다.`);
    }
    assert.ok(
      !["https://support.apple.com", "https://support.apple.com/billing"].includes(promo.link),
      `${promo.id}의 link가 일반 고객센터 URL이면 안 됩니다: ${promo.link}`
    );
  }

  for (const promo of live) {
    assert.ok(masterById.has(promo.id), `라이브 항목 '${promo.id}'는 마스터 카탈로그에 있어야 합니다.`);
    assert.notEqual(promo.isFreeTier, true, `라이브 카탈로그에 상시 무료 플랜 '${promo.id}'가 있으면 안 됩니다.`);
    assert.notEqual(masterById.get(promo.id).isFreeTier, true, `마스터에서 상시 무료인 '${promo.id}'는 라이브에서 제외되어야 합니다.`);
  }
});
