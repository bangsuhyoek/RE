/**
 * 94개 구독 서비스 프로모션 전수 크롤링 및 정밀 검증 실행기
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CrawlerAgent } from "./agents/crawlerAgent.js";
import {
  validatePromotion,
  STATUS,
} from "./promotionValidator.js";

// Node.js undici 소켓 비정상 종료 방어
process.on("uncaughtException", (err) => {
  console.warn("[Crawler Warning: Uncaught socket exception suppressed]", err.message);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMOTIONS_94_FILE = path.resolve(__dirname, "../../public/catalog/verified_promotions_94.json");
const SERVICES_FILE = path.resolve(__dirname, "../../public/catalog/services.json");
const OUTPUT_SUMMARY_FILE = path.resolve(__dirname, "../../public/catalog/promotion-crawling-report-94.json");

async function run() {
  console.log("=================================================");
  console.log("🚀 [SubMate Crawler] 94개 서비스 프로모션 전수 크롤링 & 상태 검증");
  console.log("=================================================");

  const targetPromotions = JSON.parse(fs.readFileSync(PROMOTIONS_94_FILE, "utf-8"));
  const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  console.log(`총 ${targetPromotions.length}개 서비스 프로모션 로드 완료.`);

  const crawler = new CrawlerAgent({
    timeoutMs: 3500,
    maxBytes: 1000000,
    maxRedirects: 4,
  });

  const now = Date.now();
  const results = {
    active: [],
    expired: [],
    notFound: [],
    invalidPrice: [],
    suspicious: [],
  };

  const concurrency = 6;
  for (let i = 0; i < targetPromotions.length; i += concurrency) {
    const batch = targetPromotions.slice(i, i + concurrency);
    const batchNum = Math.floor(i / concurrency) + 1;
    const totalBatches = Math.ceil(targetPromotions.length / concurrency);
    console.log(`\n[배치 ${batchNum}/${totalBatches}] 검사 중 (${i + 1} ~ ${Math.min(i + concurrency, targetPromotions.length)})...`);

    const promises = batch.map(async (promo) => {
      const service = serviceMap.get(promo.serviceId);
      const serviceName = promo.serviceName || service?.name || promo.serviceId;
      const link = promo.link || service?.cancelUrl || service?.url;

      const config = {
        id: promo.id,
        serviceId: promo.serviceId,
        url: link,
        allowedOrigins: link && link.startsWith("http") ? [new URL(link).origin] : [],
        serviceKeywords: [serviceName, promo.serviceId, service?.monogram].filter(Boolean),
        allowUndated: true,
        pageSelector: "main, [role=\"main\"], body",
        statusSelector: "h1, h2, h3, [role=\"alert\"], .alert, .notice, .status, .message, p",
      };

      let crawlResult;
      if (!link || !link.startsWith("http")) {
        crawlResult = {
          targetId: promo.id,
          status: "FAILED",
          statusCode: 0,
          error: "유효하지 않은 링크 URL",
          html: "",
          finalUrl: link || "",
          redirects: [],
          fetchedAt: new Date().toISOString(),
        };
      } else {
        try {
          crawlResult = await crawler.crawl({
            id: promo.id,
            url: link,
            allowedOrigins: config.allowedOrigins,
          });
        } catch (crawlErr) {
          crawlResult = {
            targetId: promo.id,
            status: "FAILED",
            statusCode: 0,
            error: crawlErr.message,
            html: "",
            finalUrl: link,
            redirects: [],
            fetchedAt: new Date().toISOString(),
          };
        }
      }

      const candidate = {
        id: promo.id,
        title: serviceName,
        sourceServiceIds: [promo.serviceId],
        originalPrice: promo.originalPrice || 10000,
        offerPrice: promo.offerPrice ?? 0,
        saving: promo.saving || ((promo.originalPrice || 10000) - (promo.offerPrice ?? 0)),
        months: 1,
        priceBasis: "monthly",
        campaignPeriod: promo.note || "상시 진행",
      };

      let validation;
      try {
        validation = validatePromotion({
          crawl: crawlResult,
          candidate,
          config,
          now,
        });
      } catch (valErr) {
        validation = {
          status: STATUS.SUSPICIOUS,
          reasons: [{ code: "VALIDATION_EXCEPTION", evidence: valErr.message }],
        };
      }

      const outcome = {
        id: promo.id,
        serviceId: promo.serviceId,
        serviceName,
        kind: promo.kind,
        status: validation.status,
        reasons: validation.reasons || [],
        checkedUrl: link,
        finalUrl: crawlResult.finalUrl,
        httpStatus: crawlResult.statusCode || crawlResult.status,
        originalPrice: promo.originalPrice,
        offerPrice: promo.offerPrice,
        checkedAt: new Date().toISOString(),
      };

      if (validation.status === STATUS.ACTIVE) {
        results.active.push(outcome);
        console.log(` - [${promo.serviceId}] ${serviceName}: 🟢 ACTIVE (유효)`);
      } else if (validation.status === STATUS.EXPIRED) {
        results.expired.push(outcome);
        console.log(` - [${promo.serviceId}] ${serviceName}: 🛑 EXPIRED (종료: ${validation.reasons?.[0]?.evidence || validation.reasons?.[0]?.code})`);
      } else if (validation.status === STATUS.PAGE_NOT_FOUND) {
        results.notFound.push(outcome);
        console.log(` - [${promo.serviceId}] ${serviceName}: 🔍 404/NOT_FOUND (${validation.reasons?.[0]?.code})`);
      } else if (validation.status === STATUS.INVALID_PRICE) {
        results.invalidPrice.push(outcome);
        console.log(` - [${promo.serviceId}] ${serviceName}: ❌ INVALID_PRICE (${validation.reasons?.[0]?.evidence})`);
      } else {
        results.suspicious.push(outcome);
        console.log(` - [${promo.serviceId}] ${serviceName}: ⚠️ SUSPICIOUS (${validation.reasons?.[0]?.code})`);
      }
    });

    await Promise.all(promises);
  }

  const report = {
    executedAt: new Date().toISOString(),
    totalChecked: targetPromotions.length,
    counts: {
      active: results.active.length,
      expired: results.expired.length,
      notFound: results.notFound.length,
      invalidPrice: results.invalidPrice.length,
      suspicious: results.suspicious.length,
    },
    results,
  };

  fs.writeFileSync(OUTPUT_SUMMARY_FILE, JSON.stringify(report, null, 2), "utf-8");

  console.log("\n=================================================");
  console.log("🏁 94개 서비스 프로모션 전수 크롤링 검증 결과 요약");
  console.log("=================================================");
  console.log(`총 검증 대상: ${targetPromotions.length}개`);
  console.log(`🟢 활성(ACTIVE - 정상 유효): ${results.active.length}개`);
  console.log(`🛑 종료(EXPIRED - 이벤트/판매 마감 감지): ${results.expired.length}개`);
  console.log(`🔍 미존재(PAGE_NOT_FOUND - 404/삭제): ${results.notFound.length}개`);
  console.log(`❌ 가격오류(INVALID_PRICE - 역전/계산불일치): ${results.invalidPrice.length}개`);
  console.log(`⚠️ 검수필요(SUSPICIOUS - 차단/인증필요/JS렌더링): ${results.suspicious.length}개`);
  console.log(`\n📄 상세 결과 보고서: ${OUTPUT_SUMMARY_FILE}`);
  console.log("=================================================\n");
}

run().catch((err) => {
  console.error("크롤링 실행 중 치명적 오류:", err);
  process.exit(1);
});
