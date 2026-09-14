import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
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
  assert.ok(Array.isArray(parsed.guideSteps));
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

test("Full Crawler Pipeline should execute and update subscriptionData.js", async () => {
  const result = await runCrawlerPipeline();
  assert.ok(result);
  assert.equal(result.targetsProcessed, CRAWLER_CONFIG.targets.length);
  assert.equal(result.successCount, CRAWLER_CONFIG.targets.length);
  assert.equal(result.syncResult.success, true);

  // Check subscriptionData.js file content
  const filePath = path.resolve(__dirname, "../src/data/subscriptionData.js");
  const content = fs.readFileSync(filePath, "utf-8");
  assert.ok(content.includes("export const serviceCatalog = ["));
  assert.ok(content.includes('"id": "netflix"'));
});
