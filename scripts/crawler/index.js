/**
 * 구독 서비스 크롤러 메인 파이프라인 (Multi-Agent Crawler Pipeline Index)
 * 
 * 파이프라인 단계:
 * 1. 환경 및 도구 파이프라인 수집 (Crawler Agent)
 * 2. 다중 에이전트 수집/추출 (Parser Agent)
 * 3. 공식 검증 및 자가 치유 재시도 (Formal Verifier & Self-Correction)
 * 4. serviceCatalog 데이터 파일 동기화 (Catalog Syncer)
 */

import { CRAWLER_CONFIG } from "./config.js";
import { CrawlerAgent } from "./agents/crawlerAgent.js";
import { ParserAgent } from "./agents/parserAgent.js";
import { FormalVerifier } from "./verifier.js";
import { CatalogSyncer } from "./syncCatalog.js";

export async function runCrawlerPipeline() {
  console.log("=================================================");
  console.log("[Pipeline Step 1] Initializing Multi-Agent Subscription Crawler...");
  console.log("=================================================");

  const crawler = new CrawlerAgent({ timeoutMs: CRAWLER_CONFIG.timeoutMs });
  const parser = new ParserAgent();
  const verifier = new FormalVerifier();
  const syncer = new CatalogSyncer();

  const verifiedCatalogItems = [];
  let successCount = 0;
  let correctedCount = 0;

  for (const target of CRAWLER_CONFIG.targets) {
    console.log(`\n[Agent Flow] Processing service target: ${target.name} (${target.id})`);

    // 1. 탐색 에이전트 (Crawler Agent) 실행
    console.log(` └─ [CrawlerAgent] Crawling target URL: ${target.url}`);
    const crawlResult = await crawler.crawl(target);
    console.log(`    └─ Crawl Status: ${crawlResult.status} (${crawlResult.durationMs}ms)`);

    // 2. 추출 에이전트 (Parser Agent) 실행
    console.log(` └─ [ParserAgent] Extracting structured plan & pricing data...`);
    const parsedItem = parser.parse(crawlResult, target);
    console.log(`    └─ Primary Plan: ${parsedItem.plan} / Amount: ₩${parsedItem.amount.toLocaleString()}`);

    // 3. 공식 검증 단계 (Formal Verification & Self-Correction)
    console.log(` └─ [FormalVerifier] Running formal verification & integrity check...`);
    const verificationResult = verifier.ensureVerifiedItem(parsedItem, target, parser);

    if (verificationResult.isVerified) {
      verifiedCatalogItems.push(verificationResult.item);
      successCount++;
      if (verificationResult.isCorrected) {
        correctedCount++;
        console.log(`    └─ Verified via Self-Correction Fallback ✅`);
      } else {
        console.log(`    └─ Verified Successfully ✅`);
      }
    }
  }

  // 4. 확장 인프라 동기화 (Sync to serviceCatalog)
  console.log("\n=================================================");
  console.log("[Pipeline Step 4] Synchronizing Verified Data to serviceCatalog...");
  console.log("=================================================");
  const syncResult = syncer.sync(verifiedCatalogItems);

  console.log(`\n🎉 Pipeline Completed!`);
  console.log(` - Total Targets Processed: ${CRAWLER_CONFIG.targets.length}`);
  console.log(` - Verified Items: ${successCount}`);
  console.log(` - Self-Corrected Items: ${correctedCount}`);
  console.log(` - Catalog Sync Status: ${syncResult.success ? "SUCCESS" : "FAILED"}`);
  console.log(` - Synced Items: ${syncResult.updatedCount}`);

  return {
    targetsProcessed: CRAWLER_CONFIG.targets.length,
    successCount,
    correctedCount,
    syncResult,
    catalog: verifiedCatalogItems,
  };
}

// 직접 CLI 실행 시 자동 실행
if (process.argv[1] && process.argv[1].endsWith("index.js")) {
  runCrawlerPipeline().catch((err) => {
    console.error("❌ Crawler Pipeline Fatal Error:", err);
    process.exit(1);
  });
}
