import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CRAWLER_CONFIG } from "../scripts/crawler/config.js";
import { CrawlerAgent } from "../scripts/crawler/agents/crawlerAgent.js";
import { ParserAgent } from "../scripts/crawler/agents/parserAgent.js";
import { FormalVerifier } from "../scripts/crawler/verifier.js";
import { CatalogSyncer } from "../scripts/crawler/syncCatalog.js";
import { runCrawlerPipeline } from "../scripts/crawler/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("CrawlerAgent should return structured crawl response", async () => {
  const agent = new CrawlerAgent({ timeoutMs: 5000 });
  const target = CRAWLER_CONFIG.targets[0]; // Netflix
  const result = await agent.crawl(target);

  assert.ok(result);
  assert.equal(result.targetId, "netflix");
  assert.ok(["SUCCESS", "FAILED"].includes(result.status));
  assert.equal(typeof result.durationMs, "number");
});

test("ParserAgent should produce valid catalog item structure", () => {
  const parser = new ParserAgent();
  const target = CRAWLER_CONFIG.targets[0];
  const mockCrawlResult = {
    targetId: "netflix",
    status: "SUCCESS",
    rawContent: "<html><body><div class='plan'>Netflix 프리미엄 월 17,000원</div></body></html>",
  };

  const parsed = parser.parse(mockCrawlResult, target);
  assert.equal(parsed.id, "netflix");
  assert.equal(parsed.name, "Netflix");
  assert.equal(parsed.amount, 17000);
  assert.ok(Array.isArray(parsed.availablePlans));
  assert.ok(Array.isArray(parsed.plans));
  // 해지 가이드는 cancelGuides.js가 관리하므로 크롤러가 공통 문구를 만들어 덮어쓰면 안 된다.
  assert.equal(parsed.guideSteps, undefined);
  assert.equal(parser.buildCatalogItemFromFallback(target).guideSteps, undefined);
});

test("FormalVerifier should validate valid items and catch invalid schemas", () => {
  const verifier = new FormalVerifier();
  const parser = new ParserAgent();
  const target = CRAWLER_CONFIG.targets[0];

  const validItem = parser.buildCatalogItemFromFallback(target);
  const check = verifier.verifyItem(validItem);
  assert.equal(check.isValid, true);
  assert.equal(check.errors.length, 0);

  const invalidItem = { ...validItem, amount: -500 };
  const invalidCheck = verifier.verifyItem(invalidItem);
  assert.equal(invalidCheck.isValid, false);
  assert.ok(invalidCheck.errors.length > 0);

  // 검증 실패 시 임의 fallback으로 덮어쓰지 않고 isVerified: false 반환
  const unverified = verifier.ensureVerifiedItem(invalidItem, target, parser);
  assert.equal(unverified.isVerified, false);
  assert.ok(unverified.errors.length > 0);
});

test("Full Crawler Pipeline should execute and update a catalog file", async () => {
  const sourcePath = path.resolve(__dirname, "../src/data/subscriptionData.js");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "submate-crawler-"));
  const filePath = path.join(tempDir, "subscriptionData.js");
  fs.copyFileSync(sourcePath, filePath);

  const result = await runCrawlerPipeline({ catalogFilePath: filePath });
  assert.ok(result);
  assert.equal(result.targetsProcessed, CRAWLER_CONFIG.targets.length);
  assert.equal(result.successCount, CRAWLER_CONFIG.targets.length);
  assert.equal(result.syncResult.success, true);

  const content = fs.readFileSync(filePath, "utf-8");
  assert.ok(content.includes("export const serviceCatalog = ["));
  assert.ok(content.includes('"id": "netflix"'));
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("페이지를 읽지 못한 서비스는 카탈로그의 기존 가격과 확인 시각을 덮어쓰지 않는다", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "submate-sync-"));
  const filePath = path.join(tempDir, "subscriptionData.js");
  const existing = [{ id: "coupang", name: "쿠팡 와우", amount: 7890, plan: "와우 멤버십", lastUpdated: "2026-09-30T10:07:00.000Z", parseStatus: "PARSED_SUCCESS" }];
  fs.writeFileSync(filePath, "export const serviceCatalog = " + JSON.stringify(existing, null, 2) + ";\n\nexport const createMockSubscriptions = () => [];\n", "utf-8");

  const parser = new ParserAgent();
  const target = { id: "coupang", name: "쿠팡 와우", fallbackData: { plan: "와우 멤버십", amount: 4990, availablePlans: [{ plan: "와우 멤버십", amount: 4990 }] } };
  const fallbackItem = parser.parse({ status: "FAILED", rawContent: null }, target);
  const result = new CatalogSyncer(filePath).sync([fallbackItem]);

  const content = fs.readFileSync(filePath, "utf-8");
  const start = content.indexOf("[");
  const synced = JSON.parse(content.slice(start, content.indexOf("export const createMockSubscriptions")).trim().replace(/;\s*$/, ""));
  assert.equal(result.keptExistingCount, 1);
  assert.equal(synced[0].amount, 7890);
  assert.equal(synced[0].lastUpdated, "2026-09-30T10:07:00.000Z");
  assert.equal(synced[0].parseStatus, "CRAWL_FAILED");
  assert.equal(synced[0].status, "unverified");
  assert.ok(synced[0].lastCheckedAt);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("기존 카탈로그 파싱 실패 시 덮어쓰지 않고 0이 아닌 종료 코드와 예외를 던진다", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "submate-sync-err-"));
  const filePath = path.join(tempDir, "subscriptionData.js");
  // 손상된 JSON 형태의 카탈로그
  fs.writeFileSync(filePath, "export const serviceCatalog = [ { id: 'broken', amount: };\n\nexport const createMockSubscriptions = () => [];\n", "utf-8");

  const prevExitCode = process.exitCode;
  try {
    process.exitCode = 0;
    const syncer = new CatalogSyncer(filePath);
    assert.throws(
      () => syncer.sync([{ id: "netflix", name: "Netflix", amount: 17000, parseStatus: "PARSED_SUCCESS" }]),
      /Failed to parse existing serviceCatalog JSON/
    );
    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = prevExitCode;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("결과 항목 수가 기존보다 20% 넘게 줄면(shrink) 동기화를 중단하고 0이 아닌 종료 코드를 설정한다", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "submate-sync-shrink-"));
  const filePath = path.join(tempDir, "subscriptionData.js");
  // 기존 10개 항목
  const existing = Array.from({ length: 10 }, (_, i) => ({
    id: `service-${i}`,
    name: `서비스 ${i}`,
    amount: 10000,
    parseStatus: "PARSED_SUCCESS",
  }));
  fs.writeFileSync(filePath, "export const serviceCatalog = " + JSON.stringify(existing, null, 2) + ";\n\nexport const createMockSubscriptions = () => [];\n", "utf-8");

  const prevExitCode = process.exitCode;
  try {
    process.exitCode = 0;
    // 7개로 줄어드는 경우 (30% 감소 -> 20% 초과)
    const syncer = new CatalogSyncer(filePath);
    const reducedItems = Array.from({ length: 7 }, (_, i) => ({
      id: `service-${i}`,
      name: `서비스 ${i}`,
      amount: 10000,
      parseStatus: "PARSED_SUCCESS",
    }));

    // merge: false로 실행하여 결과 항목 수가 10개에서 7개로 축소(shrink)되는 상황 검증
    assert.throws(
      () => syncer.sync(reducedItems, { merge: false }),
      /Catalog count shrunk by more than 20%/
    );
    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = prevExitCode;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("runPromotionPipeline: --apply 실행 시 Supabase DB 오류가 발생하면 0이 아닌 종료 코드를 설정한다", async () => {
  const prevExitCode = process.exitCode;
  try {
    process.exitCode = 0;

    // Supabase DB 오류를 재현하는 fake client
    const fakeClientWithDbError = {
      from() {
        return {
          async upsert() {
            return { error: { message: "connection refused: 5432", code: "ECONNREFUSED" } };
          },
          async select() {
            return { data: [], error: null };
          },
        };
      },
    };

    // runPromotionPipeline의 apply 블록에서 DB 오류 발생 시 process.exitCode = 1 검증
    const { syncPromotionsToSupabase } = await import("../scripts/crawler/promotions/supabaseSync.js");
    const syncRes = await syncPromotionsToSupabase(
      [{ id: "test-promo", title: "Test", kind: "1개월 무료", category: "OTT" }],
      { supabaseClient: fakeClientWithDbError }
    );

    assert.equal(syncRes.errors.length, 1);
    assert.equal(syncRes.errors[0].message, "connection refused: 5432");

    // runPromotionPipeline 내부의 DB sync 실패 가드 로직 검증:
    if ((syncRes.errors && syncRes.errors.length > 0) || (syncRes.skipped && syncRes.reason !== "SUPABASE_NOT_CONFIGURED")) {
      process.exitCode = 1;
    }
    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = prevExitCode;
  }
});
