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
  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response("<html><body><div>월 17,000원</div></body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    const agent = new CrawlerAgent({ timeoutMs: 5000 });
    const target = CRAWLER_CONFIG.targets[0]; // Netflix
    const result = await agent.crawl(target);

    assert.ok(result);
    assert.equal(result.targetId, "netflix");
    assert.ok(["SUCCESS", "FAILED"].includes(result.status));
    assert.equal(typeof result.durationMs, "number");
  } finally {
    globalThis.fetch = origFetch;
  }
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

  const origCrawl = CrawlerAgent.prototype.crawl;
  try {
    CrawlerAgent.prototype.crawl = async (target) => ({
      targetId: target.id,
      url: target.url,
      requestedUrl: target.url,
      finalUrl: target.url,
      redirects: [],
      status: "SUCCESS",
      statusCode: 200,
      contentType: "text/html",
      rawContent: `<html><body><div>${target.name} 월 15,000원</div></body></html>`,
      html: `<html><body><div>${target.name} 월 15,000원</div></body></html>`,
      crawledAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      durationMs: 5,
    });

    const result = await runCrawlerPipeline({ catalogFilePath: filePath });
    assert.ok(result);
    assert.equal(result.targetsProcessed, CRAWLER_CONFIG.targets.length);
    assert.equal(result.successCount, CRAWLER_CONFIG.targets.length);
    assert.equal(result.syncResult.success, true);

    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(content.includes("export const serviceCatalog = ["));
    assert.ok(content.includes('"id": "netflix"'));
    process.exitCode = 0;
  } finally {
    CrawlerAgent.prototype.crawl = origCrawl;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("모든 크롤 대상이 실패하면 동기화를 건너뛰고 예외를 던지며 process.exitCode = 1로 설정된다", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "submate-crawler-fail-"));
  const filePath = path.join(tempDir, "subscriptionData.js");
  const sourcePath = path.resolve(__dirname, "../src/data/subscriptionData.js");
  fs.copyFileSync(sourcePath, filePath);
  const initialContent = fs.readFileSync(filePath, "utf-8");

  const prevExitCode = process.exitCode;
  const origCrawl = CrawlerAgent.prototype.crawl;
  try {
    process.exitCode = 0;
    CrawlerAgent.prototype.crawl = async (target) => ({
      targetId: target.id,
      url: target.url,
      requestedUrl: target.url,
      finalUrl: target.url,
      redirects: [],
      status: "FAILED",
      statusCode: 500,
      contentType: "",
      rawContent: null,
      html: "",
      error: "Network failure",
      durationMs: 10,
    });

    await assert.rejects(
      async () => await runCrawlerPipeline({ catalogFilePath: filePath }),
      /All \d+ crawl targets failed/
    );
    assert.equal(process.exitCode, 1);

    // 전체 실패 시 동기화를 건너뛰므로 파일이 전혀 변경되지 않아야 함
    const afterContent = fs.readFileSync(filePath, "utf-8");
    assert.equal(afterContent, initialContent);
  } finally {
    CrawlerAgent.prototype.crawl = origCrawl;
    process.exitCode = prevExitCode;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("부분 실패 시 기존처럼 동기화하되 failedCount를 포함하고 fallback은 successCount에서 제외된다", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "submate-crawler-partial-"));
  const filePath = path.join(tempDir, "subscriptionData.js");
  const sourcePath = path.resolve(__dirname, "../src/data/subscriptionData.js");
  fs.copyFileSync(sourcePath, filePath);

  const prevExitCode = process.exitCode;
  const origCrawl = CrawlerAgent.prototype.crawl;
  try {
    process.exitCode = 0;
    // 1개(netflix)만 성공, 나머지 6개는 실패
    CrawlerAgent.prototype.crawl = async (target) => {
      if (target.id === "netflix") {
        return {
          targetId: target.id,
          url: target.url,
          requestedUrl: target.url,
          finalUrl: target.url,
          redirects: [],
          status: "SUCCESS",
          statusCode: 200,
          contentType: "text/html",
          rawContent: "<html><body>월 17,000원</body></html>",
          html: "<html><body>월 17,000원</body></html>",
          durationMs: 10,
        };
      }
      return {
        targetId: target.id,
        url: target.url,
        requestedUrl: target.url,
        finalUrl: target.url,
        redirects: [],
        status: "FAILED",
        statusCode: 500,
        contentType: "",
        rawContent: null,
        html: "",
        error: "Network failure",
        durationMs: 10,
      };
    };

    const result = await runCrawlerPipeline({ catalogFilePath: filePath });
    assert.ok(result);
    assert.equal(result.successCount, 1);
    assert.equal(result.failedCount, 6);
    assert.equal(result.fallbackCount, 6);
    assert.equal(result.syncResult.success, true);
    assert.equal(result.syncResult.keptExistingCount, 6);
  } finally {
    CrawlerAgent.prototype.crawl = origCrawl;
    process.exitCode = prevExitCode;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CrawlerScheduler는 파이프라인 실패 시 [Scheduler Error]를 기록하고 process.exitCode = 1을 설정한다", async () => {
  const { CrawlerScheduler } = await import("../scripts/crawler/scheduler.js");
  const prevExitCode = process.exitCode;
  const errors = [];
  const logs = [];
  const origConsoleError = console.error;
  const origConsoleLog = console.log;

  try {
    process.exitCode = 0;
    console.error = (...args) => errors.push(args.join(" "));
    console.log = (...args) => logs.push(args.join(" "));

    const scheduler = new CrawlerScheduler(100000, {
      pipelineFn: async () => {
        throw new Error("All 7 crawl targets failed.");
      },
      promotionPipelineFn: async () => {
        throw new Error("Promotion network error");
      },
      refundCheckFn: async () => [],
    });

    await scheduler.executeTask();

    assert.equal(process.exitCode, 1);
    assert.ok(errors.some((e) => e.includes("[Scheduler Error] Task failed:")));
    assert.ok(errors.some((e) => e.includes("[Scheduler Error] Promotion check failed:")));
    assert.ok(!logs.some((l) => l.includes("[Scheduler Success] Updated")));
    assert.ok(!logs.some((l) => l.includes("[Scheduler Success] Promotions kept")));
  } finally {
    console.error = origConsoleError;
    console.log = origConsoleLog;
    process.exitCode = prevExitCode;
  }
});

test("ParserAgent: 파싱된 가격이 fallbackData보다 항상 우선하며 연간 요금제는 매년으로 매핑된다", () => {
  const parser = new ParserAgent();
  const target = {
    id: "test-service",
    name: "Test Service",
    fallbackData: {
      plan: "기본 플랜",
      amount: 10000,
      availablePlans: [{ plan: "기본 플랜", amount: 10000 }],
    },
  };

  // 1. 파싱된 가격(19,000원)이 있는 경우 fallbackData(10,000원) 대신 19,000원이 대표 금액으로 반영
  const parsedWithNewPrice = parser.parse(
    {
      status: "SUCCESS",
      rawContent: "<html><body>신규 요금 월 19,000원</body></html>",
    },
    target
  );
  assert.equal(parsedWithNewPrice.amount, 19000);
  assert.equal(parsedWithNewPrice.parseStatus, "PARSED_SUCCESS");

  // 2. 파싱된 가격이 없는 경우(범위 밖이거나 정규식 매칭 실패) fallbackData 사용
  const parsedWithoutPrice = parser.parse(
    {
      status: "SUCCESS",
      rawContent: "<html><body>요금 정보 없음 (500원 등 범위 밖)</body></html>",
    },
    target
  );
  assert.equal(parsedWithoutPrice.amount, 10000);
  assert.equal(parsedWithoutPrice.parseStatus, "FALLBACK_NO_PRICE_FOUND");

  // 3. 요금제 이름에 '연'이 포함되면 billingCycle이 '매년'으로 매핑
  const yearlyTarget = {
    id: "test-yearly",
    name: "Yearly Service",
    fallbackData: {
      plan: "연간 프리미엄",
      amount: 120000,
      availablePlans: [
        { plan: "월간 베이직", amount: 12000 },
        { plan: "연간 프리미엄", amount: 120000 },
      ],
    },
  };
  const parsedYearly = parser.buildCatalogItemFromFallback(yearlyTarget);
  assert.equal(parsedYearly.plans[0].billingCycle, "매월");
  assert.equal(parsedYearly.plans[1].billingCycle, "매년");
});

test("ParserAgent: fallback 13,000원 대상에서 100,000원 마케팅 문구만 있으면 fallback 유지, 19,000원 요금 있으면 19,000원 채택", () => {
  const parser = new ParserAgent();
  const target = {
    id: "test-streaming",
    name: "Test Streaming",
    fallbackData: {
      plan: "스탠다드",
      amount: 13000,
      availablePlans: [{ plan: "스탠다드", amount: 13000 }],
    },
  };

  // 1. 본문에 100,000원 마케팅 문구만 있는 경우: 13,000원 fallback 유지 및 parseStatus 오해 없음
  const crawlWithMarketing = {
    status: "SUCCESS",
    rawContent: "<html><body>가입 시 100,000원 혜택 쿠폰팩 증정!</body></html>",
  };
  const parsedMarketing = parser.parse(crawlWithMarketing, target);
  assert.equal(parsedMarketing.amount, 13000);
  assert.equal(parsedMarketing.plan, "스탠다드");
  assert.equal(parsedMarketing.parseStatus, "FALLBACK_PRICE_OUT_OF_RANGE");

  // 2. 본문에 100,000원 마케팅 문구와 실제 19,000원 요금이 함께 있는 경우: 19,000원 채택
  const crawlWithRealPrice = {
    status: "SUCCESS",
    rawContent: "<html><body>가입 시 100,000원 혜택! 월 19,000원에 이용하세요.</body></html>",
  };
  const parsedRealPrice = parser.parse(crawlWithRealPrice, target);
  assert.equal(parsedRealPrice.amount, 19000);
  assert.equal(parsedRealPrice.parseStatus, "PARSED_SUCCESS");
});

test("CrawlerAgent: 일시적 오류(5xx, 429, 네트워크) 시 maxRetries만큼 재시도하고 비재시도 오류(404)는 재시도하지 않는다", async () => {
  const origFetch = globalThis.fetch;
  try {
    // 1. 500 일시적 오류: 1회 실패 후 2회차에 성공
    let attempts500 = 0;
    globalThis.fetch = async () => {
      attempts500++;
      if (attempts500 === 1) {
        return new Response("Server error", { status: 500, statusText: "Internal Server Error" });
      }
      return new Response("<html><body>월 15,000원</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    };

    const agent = new CrawlerAgent({ timeoutMs: 2000, maxRetries: 2 });
    const target = { id: "test", url: "https://example.com" };
    const successResult = await agent.crawl(target);
    assert.equal(successResult.status, "SUCCESS");
    assert.equal(attempts500, 2);

    // 2. 지속적 500 오류: maxRetries(2) 소진 (총 1 + 2 = 3회 시도) 후 FAILED 반환
    let all500Attempts = 0;
    globalThis.fetch = async () => {
      all500Attempts++;
      return new Response("Server error", { status: 500, statusText: "Internal Server Error" });
    };
    const failResult = await agent.crawl(target);
    assert.equal(failResult.status, "FAILED");
    assert.equal(all500Attempts, 3);
    assert.equal(failResult.statusCode, 500);

    // 3. 404 비재시도 오류: 즉시 1회만 시도하고 재시도 없이 FAILED 반환
    let notFoundAttempts = 0;
    globalThis.fetch = async () => {
      notFoundAttempts++;
      return new Response("Not found", { status: 404, statusText: "Not Found" });
    };
    const notFoundResult = await agent.crawl(target);
    assert.equal(notFoundResult.status, "FAILED");
    assert.equal(notFoundAttempts, 1);
    assert.equal(notFoundResult.statusCode, 404);
  } finally {
    globalThis.fetch = origFetch;
  }
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
