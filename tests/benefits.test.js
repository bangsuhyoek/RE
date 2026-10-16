import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("혜택 데이터셋 정제 및 서비스 매핑 무결성 검증", () => {
  const promotionsPath = path.join(__dirname, "../public/catalog/promotions.json");
  const servicesPath = path.join(__dirname, "../public/catalog/services.json");

  assert.ok(fs.existsSync(promotionsPath), "promotions.json 파일이 존재해야 합니다.");
  assert.ok(fs.existsSync(servicesPath), "services.json 파일이 존재해야 합니다.");

  const promotions = JSON.parse(fs.readFileSync(promotionsPath, "utf8"));
  const services = JSON.parse(fs.readFileSync(servicesPath, "utf8"));

  const serviceIdSet = new Set(services.map((s) => s.id));
  const promoIdSet = new Set(promotions.map((b) => b.id));

  // 1. 모든 혜택 ID가 고유해야 함
  assert.equal(promoIdSet.size, promotions.length, "모든 프로모션 ID는 고유해야 합니다.");

  // 2. 모든 프로모션의 sourceServiceIds는 유효한 94개 서비스 목록에 속해야 함
  for (const promo of promotions) {
    for (const sId of promo.sourceServiceIds || []) {
      assert.ok(
        serviceIdSet.has(sId),
        `연결된 서비스 ID '${sId}'는 유효한 서비스 목록에 존재해야 합니다.`
      );
    }
  }

  // 3. 다중 서비스 제휴 혜택 검증 (예: 넷플릭스-네이버플러스)
  const netflixNaverPromo = promotions.find((p) => p.id === "naverplus-netflix");
  assert.ok(netflixNaverPromo, "naverplus-netflix 프로모션이 존재해야 합니다.");
  assert.ok(netflixNaverPromo.sourceServiceIds.includes("netflix"));
  assert.ok(netflixNaverPromo.sourceServiceIds.includes("naverplus"));
});

test("사용자 등록 구독 기반 혜택 조회 시 제휴 혜택 중복 제거 알고리즘 검증", () => {
  const promotionsPath = path.join(__dirname, "../public/catalog/promotions.json");
  const promotions = JSON.parse(fs.readFileSync(promotionsPath, "utf8"));

  const userSubscribedServiceIds = ["netflix", "naverplus"];

  // 표기 시점 Deduplication 적용
  const deduplicatedMap = new Map();

  for (const promo of promotions) {
    const isRelevant = promo.sourceServiceIds.some((sId) => userSubscribedServiceIds.includes(sId));
    if (isRelevant) {
      if (!deduplicatedMap.has(promo.id)) {
        deduplicatedMap.set(promo.id, promo);
      }
    }
  }

  const finalPersonalizedBenefits = Array.from(deduplicatedMap.values());
  const naverplusNetflixFinal = finalPersonalizedBenefits.filter(
    (b) => b.id === "naverplus-netflix"
  );
  assert.equal(naverplusNetflixFinal.length, 1, "중복 제거 후 최종 혜택 목록에는 1번만 노출되어야 합니다.");
});

test("마스터 카탈로그(promotions-master.json) 분리, 중복 제거, 상시 무료(free_tier) 분리 및 링크 정합성 검증", () => {
  const masterPath = path.join(__dirname, "../public/catalog/promotions-master.json");
  const livePath = path.join(__dirname, "../public/catalog/promotions.json");
  const servicesPath = path.join(__dirname, "../public/catalog/services.json");

  assert.ok(fs.existsSync(masterPath), "promotions-master.json 파일이 존재해야 합니다.");
  const master = JSON.parse(fs.readFileSync(masterPath, "utf8"));
  const live = JSON.parse(fs.readFileSync(livePath, "utf8"));
  const services = JSON.parse(fs.readFileSync(servicesPath, "utf8"));
  const serviceIdSet = new Set(services.map((s) => s.id));

  assert.ok(master.length >= 60, "마스터 카탈로그는 유실되었던 후보군을 포함해 60개 이상이어야 합니다.");
  assert.equal(new Set(master.map((p) => p.id)).size, master.length, "마스터 카탈로그 ID는 고유해야 합니다.");

  for (const promo of master) {
    for (const sId of promo.sourceServiceIds || []) {
      assert.ok(serviceIdSet.has(sId), `마스터의 sourceServiceId '${sId}'가 유효해야 합니다.`);
    }
    assert.ok(
      !["https://support.apple.com", "https://support.apple.com/billing"].includes(promo.link),
      `${promo.id}의 link가 일반 고객센터 URL이면 안 됩니다: ${promo.link}`
    );
  }

  // 중복 쌍이 통합되어 레거시 중복 ID가 제거되었는지 검증
  const removedDuplicateIds = [
    "youtube-1m-free",
    "millie-1plus1",
    "genie-110won",
    "appletv-7d-free",
    "github-student-pack",
  ];
  for (const dupId of removedDuplicateIds) {
    assert.equal(live.some((p) => p.id === dupId), false, `라이브 카탈로그에 중복 ID '${dupId}'가 없어야 합니다.`);
    assert.equal(master.some((p) => p.id === dupId), false, `마스터 카탈로그에 중복 ID '${dupId}'가 없어야 합니다.`);
  }

  // 상시 무료 요금제 3종은 마스터에 isFreeTier: true로 보관되고 라이브에서는 제외되어야 함
  const freeTierIds = ["framer-promo", "zoom-pro-promo", "naver-mybox-promo"];
  for (const ftId of freeTierIds) {
    const inMaster = master.find((p) => p.id === ftId);
    assert.ok(inMaster, `마스터 카탈로그에 '${ftId}'가 보관되어야 합니다.`);
    assert.equal(inMaster.isFreeTier, true, `'${ftId}'는 isFreeTier: true 여야 합니다.`);
    assert.equal(live.some((p) => p.id === ftId), false, `라이브 카탈로그에서 상시 무료 플랜 '${ftId}'는 제외되어야 합니다.`);
  }
});

