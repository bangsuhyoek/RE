/**
 * 프로모션 크롤링 & 검증 실행기
 *
 *   pnpm crawl:promotions                       전체 점검, 보고서만 작성
 *   pnpm crawl:promotions -- --only=spotify-3m-free,youtube-1m-free
 *   pnpm crawl:promotions -- --apply            확인 결과(verifiedStatus 등)를 앱 데이터에 반영
 *   옵션: --no-browser(단순 fetch), --headful(브라우저 창 표시), --concurrency=4
 *
 * 앱이 보여주는 promotionCatalog(public/catalog/promotions.json)의 각 혜택을
 * 실제 브라우저로 공식 페이지를 열어 확인하고 아래 중 하나로 판정한다.
 *   CONFIRMED     페이지에 같은 혜택 조건이 적혀 있음
 *   CHANGED       같은 종류의 혜택이 다른 조건으로 적혀 있음 (예: 3개월 → 1개월)
 *   EXPIRED       카탈로그에 적힌 캠페인 기간이 이미 끝남
 *   NOT_FOUND     페이지는 열렸지만 혜택 문구가 없음
 *   UNREACHABLE   로그인 필요/봇 차단/404 등으로 내용을 읽지 못함
 *   MANUAL        제휴·로그인 전용 등 자동 확인 대상이 아님
 */

import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseKoreanCampaignPeriod } from "./promotionValidator.js";
import { parseClaim, matchClaim, extractMonthlyPrices, extractDeadline } from "./promotions/offerExtractor.js";
import { createPageFetcher, createCachedQueue, PageState } from "./promotions/pageFetcher.js";
import { getPromotionSource } from "./promotions/sources.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const PROMOTIONS_JSON = path.join(ROOT, "public/catalog/promotions.json");
const APP_DATA_JS = path.join(ROOT, "src/data/subscriptionData.js");
const REPORT_DIR = path.join(ROOT, "outputs/promotion-crawler");

export const Verdict = Object.freeze({
  CONFIRMED: "CONFIRMED",
  CHANGED: "CHANGED",
  EXPIRED: "EXPIRED",
  NOT_FOUND: "NOT_FOUND",
  UNREACHABLE: "UNREACHABLE",
  MANUAL: "MANUAL",
});

function parseArgs(argv) {
  const args = { apply: false, browser: true, headless: true, concurrency: 4, only: null, dumpText: false };
  for (const arg of argv) {
    if (arg === "--apply") args.apply = true;
    else if (arg === "--no-browser") args.browser = false;
    else if (arg === "--headful") args.headless = false;
    else if (arg === "--dump-text") args.dumpText = true;
    else if (arg.startsWith("--concurrency=")) args.concurrency = Math.max(1, Number(arg.split("=")[1]) || 4);
    else if (arg.startsWith("--only=")) args.only = new Set(arg.split("=")[1].split(",").map((s) => s.trim()).filter(Boolean));
  }
  return args;
}

function campaignEnded(promotion, now) {
  try {
    const period = parseKoreanCampaignPeriod(promotion.campaignPeriod ?? "", { now });
    return period.endAt && Date.parse(period.endAt) < now ? period.endAt : null;
  } catch {
    return null;
  }
}

function snippet(text, max = 160) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

/** 페이지에 적힌 마감일(YYYY-MM-DD, 한국 시간 그날 끝)이 지났는지 */
function pageDeadlinePassed(deadline, now) {
  if (!deadline) return false;
  const end = Date.parse(deadline + "T23:59:59.999+09:00");
  return Number.isFinite(end) && end < now;
}

/** 한 프로모션 판정 (페이지 수집 함수를 주입받아 테스트 가능) */
export async function verifyPromotion(promotion, { loadPage, now = Date.now() }) {
  const source = getPromotionSource(promotion.id);
  const urls = [...new Set([...(source.urls ?? []), promotion.link].filter(Boolean))];
  const claim = parseClaim(promotion, source.claim ?? {});
  const pages = await Promise.all(urls.map((url) => loadPage(url)));

  const checks = pages.map((page) => {
    const match = page.state === PageState.OK ? matchClaim(claim, page.text) : null;
    return {
      url: page.requestedUrl,
      finalUrl: page.finalUrl,
      status: page.status,
      state: page.state,
      textLength: page.text?.length ?? 0,
      ...(page.error ? { error: page.error } : {}),
      ...(match
        ? {
            confirmed: match.confirmed,
            basis: match.basis,
            evidence: match.evidence && snippet(match.evidence, 240),
            deadline: match.evidence ? extractDeadline(match.evidence, { now }) : null,
            variants: match.variants.map((v) => snippet(v, 240)),
          }
        : {}),
      monthlyPrices: page.state === PageState.OK ? extractMonthlyPrices(page.text).slice(0, 8) : [],
      ...(page.textFile ? { textFile: page.textFile } : {}),
    };
  });

  const linkCheck = checks.find((c) => c.url === promotion.link);
  const confirmedCheck = checks.find((c) => c.confirmed);
  const variantCheck = checks.find((c) => c.variants?.length);
  const readable = checks.filter((c) => c.state === PageState.OK);
  const endedAt = campaignEnded(promotion, now);
  const warnings = [];

  if (linkCheck && [PageState.NOT_FOUND, PageState.LOGIN_REQUIRED].includes(linkCheck.state)) {
    warnings.push(linkCheck.state === PageState.NOT_FOUND ? "앱 링크가 없는 페이지(404)로 연결됨" : "앱 링크가 로그인 페이지로 연결됨");
  }
  const priceSource = confirmedCheck ?? readable[0];
  if (priceSource?.monthlyPrices.length && promotion.originalPrice > 0 && !priceSource.monthlyPrices.includes(promotion.originalPrice)) {
    const near = priceSource.monthlyPrices.filter((p) => Math.abs(p - promotion.originalPrice) / promotion.originalPrice < 0.5);
    if (near.length) warnings.push("정가 " + promotion.originalPrice + "원이 페이지 월 요금(" + near.join(", ") + "원)과 다름");
  }
  if (confirmedCheck?.deadline) warnings.push("페이지에 마감일 표기: " + confirmedCheck.deadline);

  let verdict;
  let reason;
  if (endedAt) {
    verdict = Verdict.EXPIRED;
    reason = "캠페인 종료일 " + endedAt.slice(0, 10) + " 경과";
  } else if (confirmedCheck && pageDeadlinePassed(confirmedCheck.deadline, now)) {
    verdict = Verdict.EXPIRED;
    reason = "페이지에 적힌 마감일 " + confirmedCheck.deadline + " 경과";
  } else if (claim.type === "manual") {
    verdict = Verdict.MANUAL;
    reason = claim.reason === "CLAIM_NOT_MACHINE_CHECKABLE" ? "혜택 문구에 확인 가능한 조건(기간·금액·할인율)이 없음" : claim.reason;
  } else if (confirmedCheck) {
    verdict = Verdict.CONFIRMED;
    reason = "페이지에서 혜택 문구 확인";
  } else if (variantCheck) {
    verdict = Verdict.CHANGED;
    reason = "페이지의 혜택 조건이 카탈로그와 다름";
  } else if (readable.length) {
    verdict = Verdict.NOT_FOUND;
    reason = "페이지는 열렸지만 혜택 문구를 찾지 못함";
  } else {
    verdict = Verdict.UNREACHABLE;
    reason = "읽을 수 있는 페이지 없음 (" + [...new Set(checks.map((c) => c.state))].join(", ") + ")";
  }

  return {
    id: promotion.id,
    title: promotion.title,
    claim: promotion.kind,
    expected: claim.type === "manual" ? null : matchClaim(claim, "").expected,
    verdict,
    reason,
    evidence: confirmedCheck
      ? { url: confirmedCheck.finalUrl ?? confirmedCheck.url, basis: confirmedCheck.basis, text: confirmedCheck.evidence, deadline: confirmedCheck.deadline }
      : null,
    pageSays: !confirmedCheck && variantCheck ? { url: variantCheck.finalUrl ?? variantCheck.url, text: variantCheck.variants } : null,
    linkState: linkCheck?.state ?? null,
    warnings,
    checks,
  };
}

// ---------- 앱 데이터 반영 (--apply) ----------

const CATALOG_START = "export const promotionCatalog = ";

function readAppCatalog() {
  const source = fs.readFileSync(APP_DATA_JS, "utf-8");
  const start = source.indexOf(CATALOG_START);
  if (start === -1) throw new Error("subscriptionData.js에서 promotionCatalog를 찾지 못했습니다.");
  const arrayStart = start + CATALOG_START.length;
  const end = source.indexOf("\n];", arrayStart);
  if (end === -1) throw new Error("promotionCatalog 배열 끝을 찾지 못했습니다.");
  return { source, arrayStart, arrayEnd: end + 2, items: JSON.parse(source.slice(arrayStart, end + 2)) };
}

// 확실한 결과만 상태로 기록한다.
// - CONFIRMED: 공식 페이지에서 혜택 문구를 확인함
// - EXPIRED: 카탈로그/페이지에 적힌 종료일이 지남
// 그 밖의 판정(조건 변경 추정, 문구 없음, 접속 실패, 수동 확인)은 확정 정보가 아니므로
// 새 상태를 만들지 않고, 이전에 남아 있던 확인/만료 표시만 지운다.
const VERIFIED_STATUS = {
  CONFIRMED: "LIVE_CONFIRMED",
  EXPIRED: "EXPIRED",
};

export function applyResult(item, result, checkedAt) {
  if (!result) return item;
  const next = { ...item, lastCheckedAt: checkedAt };
  const status = VERIFIED_STATUS[result.verdict];
  if (status) next.verifiedStatus = status;
  else delete next.verifiedStatus;
  if (result.verdict === Verdict.CONFIRMED) next.lastVerifiedAt = checkedAt;
  return next;
}

function applyToAppData(results, checkedAt) {
  const byId = new Map(results.map((r) => [r.id, r]));

  // 두 파일 모두 먼저 계산·검증한 뒤에 쓴다. 중간에 실패하면 어느 파일도 바뀌지 않는다.
  const jsonItems = JSON.parse(fs.readFileSync(PROMOTIONS_JSON, "utf-8"));
  const nextJson = JSON.stringify(jsonItems.map((p) => applyResult(p, byId.get(p.id), checkedAt)), null, 2) + "\n";

  const app = readAppCatalog();
  const updated = app.items.map((p) => applyResult(p, byId.get(p.id), checkedAt));
  const nextArray = JSON.stringify(updated, null, 2);
  const nextSource = app.source.slice(0, app.arrayStart) + nextArray + app.source.slice(app.arrayEnd);
  const check = nextSource.slice(app.arrayStart, app.arrayStart + nextArray.length);
  if (JSON.parse(check).length !== app.items.length) throw new Error("promotionCatalog 갱신 결과 검증 실패 — 파일을 쓰지 않았습니다.");

  const writeAtomic = (file, content) => {
    const tmp = file + ".tmp-" + process.pid;
    fs.writeFileSync(tmp, content, "utf-8");
    fs.renameSync(tmp, file);
  };
  writeAtomic(PROMOTIONS_JSON, nextJson);
  writeAtomic(APP_DATA_JS, nextSource);
}

// ---------- 실행 ----------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = Date.now();
  const checkedAt = new Date(now).toISOString();
  let promotions = JSON.parse(fs.readFileSync(PROMOTIONS_JSON, "utf-8"));
  if (args.only) promotions = promotions.filter((p) => args.only.has(p.id));

  const fetcher = await createPageFetcher({ useBrowser: args.browser, headless: args.headless });
  console.log("프로모션 " + promotions.length + "개 점검 시작 (수집 방식: " + fetcher.mode + ")");
  if (fetcher.fallbackReason && args.browser) console.warn("브라우저를 띄우지 못해 단순 fetch로 진행합니다: " + fetcher.fallbackReason);

  const pagesDir = path.join(REPORT_DIR, "pages");
  const fetchAndMaybeDump = async (url) => {
    const page = await fetcher.fetchPage(url);
    if (args.dumpText && page.text) {
      fs.mkdirSync(pagesDir, { recursive: true });
      const name = crypto.createHash("sha1").update(url).digest("hex").slice(0, 12) + ".txt";
      fs.writeFileSync(path.join(pagesDir, name), url + "\n" + page.finalUrl + "\n\n" + page.text, "utf-8");
      page.textFile = path.relative(ROOT, path.join(pagesDir, name));
    }
    return page;
  };
  const loadPage = createCachedQueue(fetchAndMaybeDump, { limit: args.concurrency });
  const results = [];
  try {
    let done = 0;
    await Promise.all(
      promotions.map(async (promotion) => {
        let result;
        try {
          result = await verifyPromotion(promotion, { loadPage, now });
        } catch (error) {
          result = { id: promotion.id, title: promotion.title, claim: promotion.kind, verdict: Verdict.UNREACHABLE, reason: "점검 중 오류: " + (error?.message ?? error), warnings: [], checks: [] };
        }
        results.push(result);
        done += 1;
        console.log("[" + String(done).padStart(2) + "/" + promotions.length + "] " + result.verdict.padEnd(11) + " " + promotion.id + " — " + result.reason);
      })
    );
  } finally {
    await fetcher.close();
  }

  const order = new Map(promotions.map((p, i) => [p.id, i]));
  results.sort((a, b) => order.get(a.id) - order.get(b.id));
  const summary = Object.fromEntries(Object.values(Verdict).map((v) => [v, results.filter((r) => r.verdict === v).length]));
  const report = { checkedAt, mode: fetcher.mode, total: results.length, summary, results };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = checkedAt.replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(REPORT_DIR, "latest-report.json"), JSON.stringify(report, null, 2), "utf-8");
  fs.writeFileSync(path.join(REPORT_DIR, "report-" + stamp + ".json"), JSON.stringify(report, null, 2), "utf-8");

  console.log("\n요약: " + Object.entries(summary).map(([k, v]) => k + " " + v).join(" · "));
  for (const r of results.filter((x) => x.verdict === Verdict.CHANGED || x.verdict === Verdict.EXPIRED)) {
    console.log(" - " + r.id + ": " + r.reason + (r.pageSays ? " → 페이지: " + r.pageSays.text[0] : ""));
  }
  console.log("보고서: " + path.relative(ROOT, path.join(REPORT_DIR, "latest-report.json")));

  if (args.apply) {
    if (args.only) console.log("--only와 함께 실행해 해당 항목만 반영합니다.");
    applyToAppData(results, checkedAt);
    console.log("앱 데이터(promotions.json, subscriptionData.js)에 확인 상태를 반영했습니다.");
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
