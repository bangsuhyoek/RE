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

  // Self-Correction test
  const corrected = verifier.ensureVerifiedItem(invalidItem, target, parser);
  assert.equal(corrected.isVerified, true);
  assert.equal(corrected.isCorrected, true);
  assert.ok(corrected.item.amount > 0);
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
