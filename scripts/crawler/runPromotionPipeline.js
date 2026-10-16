/**
 * 프로모션 크롤링 & 검증 실행기
 *
 *   pnpm crawl:promotions                       전체 점검, 보고서만 작성
 *   pnpm crawl:promotions -- --only=spotify-3m-free,youtube-1m-free
 *   pnpm crawl:promotions -- --apply            확인 결과(verifiedStatus 등)를 앱 데이터에 반영
 *                                               + 확인되지 않은 혜택(LIVE_CONFIRMED가 아닌 항목)은 앱 데이터에서 삭제
 *   옵션: --no-browser(단순 fetch), --headful(브라우저 창 표시), --concurrency=4
 *         --force-prune(삭제 대상이 절반을 넘어도 삭제 진행)
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
import { extractOfferWithAi } from "./promotions/aiExtractor.js";
import { syncPromotionsToSupabase } from "./promotions/supabaseSync.js";
import { createPageFetcher, createCachedQueue, PageState } from "./promotions/pageFetcher.js";
import { getPromotionSource } from "./promotions/sources.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const PROMOTIONS_MASTER_JSON = path.join(ROOT, "public/catalog/promotions-master.json");
const PROMOTIONS_JSON = path.join(ROOT, "public/catalog/promotions.json");
const PROMOTIONS_REVIEW_JSON = path.join(ROOT, "public/catalog/promotions-review.json");
const APP_DATA_JS = path.join(ROOT, "src/data/subscriptionData.js");
const REPORT_DIR = path.join(ROOT, "outputs/promotion-crawler");
export const SOFT_DEGRADATION_MS = 48 * 3600 * 1000;

export const Verdict = Object.freeze({
  CONFIRMED: "CONFIRMED",
  CHANGED: "CHANGED",
  EXPIRED: "EXPIRED",
  NOT_FOUND: "NOT_FOUND",
  UNREACHABLE: "UNREACHABLE",
  MANUAL: "MANUAL",
});

function parseArgs(argv) {
  const args = { apply: false, syncDb: false, browser: true, headless: true, concurrency: 4, only: null, dumpText: false, forcePrune: false };
  for (const arg of argv) {
    if (arg === "--apply") args.apply = true;
    else if (arg === "--sync-db") args.syncDb = true;
    else if (arg === "--force-prune") args.forcePrune = true;
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

/** 한 프로모션 판정 (페이지 수집 함수 및 선택적 AI 추출 함수를 주입받아 테스트 가능) */
export async function verifyPromotion(promotion, { loadPage, aiExtract = null, now = Date.now() }) {
  const source = getPromotionSource(promotion.id);
  const urls = [...new Set([...(source.urls ?? []), promotion.link].filter(Boolean))];
  const claim = parseClaim(promotion, source.claim ?? {});
  const fetchHints = source.fetch;
  const pages = await Promise.all(urls.map((url) => loadPage(url, fetchHints)));
  // 요금만 대조하는 페이지 (혜택 문구 판정에는 쓰지 않음). 예: 제휴 혜택의 정가는 원 서비스 요금표에 있다.
  const priceUrls = (source.priceUrls ?? []).filter((url) => !urls.includes(url));
  const pricePages = await Promise.all(priceUrls.map((url) => loadPage(url, fetchHints)));

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
  // 읽은 모든 공식 페이지의 월 요금 중 하나라도 정가와 같으면 정상으로 본다 (요금표가 링크 페이지에만 있는 경우 등)
  const pagePrices = [
    ...new Set([
      ...readable.flatMap((c) => c.monthlyPrices),
      ...pricePages.filter((p) => p.state === PageState.OK).flatMap((p) => extractMonthlyPrices(p.text)),
    ]),
  ].sort((a, b) => a - b);
  if (pagePrices.length && promotion.originalPrice > 0 && !pagePrices.includes(promotion.originalPrice)) {
    const near = pagePrices.filter((p) => Math.abs(p - promotion.originalPrice) / promotion.originalPrice < 0.5);
    if (near.length) warnings.push("정가 " + promotion.originalPrice + "원이 페이지 월 요금(" + near.join(", ") + "원)과 다름");
  }
  if (confirmedCheck?.deadline) warnings.push("페이지에 마감일 표기: " + confirmedCheck.deadline);

  let verdict;
  let reason;
  let autoUpdated = false;
  let updatedOffer = null;
  let aiEvidence = null;

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

  // 하이브리드 2차 검증: CHANGED 또는 NOT_FOUND 상태이고 읽을 수 있는 페이지가 있을 때 AI 추출기 폴백 실행
  if ((verdict === Verdict.CHANGED || verdict === Verdict.NOT_FOUND) && readable.length > 0 && typeof aiExtract === "function") {
    const targetUrl = variantCheck?.url ?? readable[0].url;
    const targetPage = pages.find((p) => p.requestedUrl === targetUrl && p.state === PageState.OK) ?? pages.find((p) => p.state === PageState.OK);
    if (targetPage?.text) {
      const aiResult = await aiExtract(promotion, targetPage.text, { now });
      if (aiResult?.confirmed && aiResult?.updatedOffer) {
        verdict = Verdict.CONFIRMED;
        reason = "페이지 혜택 조건 변경 확인 및 자동 갱신";
        autoUpdated = true;
        updatedOffer = aiResult.updatedOffer;
        aiEvidence = {
          url: targetPage.finalUrl ?? targetPage.requestedUrl,
          basis: aiResult.basis ?? "ai_hybrid",
          text: snippet(aiResult.evidenceQuote, 240),
          deadline: aiResult.updatedOffer.deadline ?? null,
        };
      }
    }
  }

  return {
    id: promotion.id,
    title: promotion.title,
    claim: promotion.kind,
    expected: claim.type === "manual" ? null : matchClaim(claim, "").expected,
    verdict,
    reason,
    ...(autoUpdated ? { autoUpdated: true, updatedOffer } : {}),
    evidence: confirmedCheck
      ? { url: confirmedCheck.finalUrl ?? confirmedCheck.url, basis: confirmedCheck.basis, text: confirmedCheck.evidence, deadline: confirmedCheck.deadline }
      : aiEvidence,
    pageSays: !confirmedCheck && !aiEvidence && variantCheck ? { url: variantCheck.finalUrl ?? variantCheck.url, text: variantCheck.variants } : null,
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

const VERIFIED_STATUS = {
  CONFIRMED: "LIVE_CONFIRMED",
  EXPIRED: "EXPIRED",
};

export const KEEP_STATUS = "LIVE_CONFIRMED";
export const MAX_PRUNE_RATIO = 0.5;

export function applyResult(item, result, checkedAt) {
  if (!result) return item;
  const next = { ...item, lastCheckedAt: checkedAt };

  // 일시적 접속 장애(UNREACHABLE) 시 직전 검증 시각(또는 유예 시작 시각)으로부터 48시간 이내면 LIVE_CONFIRMED 유지
  if (result.verdict === Verdict.UNREACHABLE && item.verifiedStatus === KEEP_STATUS) {
    const refTime = Date.parse(item.lastVerifiedAt ?? item.softDegradedSince ?? "");
    const nowMs = Date.parse(checkedAt);
    if (Number.isFinite(refTime) && Number.isFinite(nowMs) && nowMs >= refTime && nowMs - refTime <= SOFT_DEGRADATION_MS) {
      next.verifiedStatus = KEEP_STATUS;
      next.softDegradedSince = item.softDegradedSince ?? checkedAt;
      return next;
    }
  }

  delete next.softDegradedSince;
  const status = VERIFIED_STATUS[result.verdict];
  if (status) next.verifiedStatus = status;
  else delete next.verifiedStatus;

  if (result.verdict === Verdict.CONFIRMED) {
    next.lastVerifiedAt = checkedAt;
    if (result.autoUpdated && result.updatedOffer) {
      Object.assign(next, result.updatedOffer, { autoUpdatedAt: checkedAt });
    }
  }
  return next;
}

export function planCatalogUpdate(items, byId, checkedAt, { forcePrune = false, maxPruneRatio = MAX_PRUNE_RATIO } = {}) {
  const masterUpdated = items.map((p) => applyResult(p, byId.get(p.id), checkedAt));
  const kept = masterUpdated.filter((p) => p.verifiedStatus === KEEP_STATUS && !p.isFreeTier);
  const removed = masterUpdated.filter((p) => p.verifiedStatus !== KEEP_STATUS && !p.isFreeTier);

  // 기존에 LIVE_CONFIRMED였던 항목 중 이번에 탈락하는 비율이 절반을 넘으면 서킷 브레이커 작동
  const previouslyLive = items.filter((p) => p.verifiedStatus === KEEP_STATUS && !p.isFreeTier);
  const droppedFromLive = previouslyLive.filter((p) => {
    const updatedItem = masterUpdated.find((u) => u.id === p.id);
    return updatedItem?.verifiedStatus !== KEEP_STATUS;
  });

  if (!forcePrune && previouslyLive.length > 0 && droppedFromLive.length / previouslyLive.length > maxPruneRatio) {
    throw new Error(
      "확인되지 않은 혜택이 " + droppedFromLive.length + "/" + previouslyLive.length + "개로 절반을 넘어 삭제를 중단했습니다. " +
        "점검 실패(네트워크·차단)가 아닌지 보고서를 확인한 뒤, 정말 지우려면 --force-prune을 붙여 다시 실행하세요. 파일은 바뀌지 않았습니다."
    );
  }

  const review = [];
  for (const item of items) {
    const res = byId.get(item.id);
    if (res?.verdict === Verdict.CHANGED) {
      review.push({
        id: item.id,
        title: item.title,
        currentKind: item.kind,
        reason: res.reason,
        pageSays: res.pageSays,
        checkedAt,
      });
    }
  }

  return { masterUpdated, kept, removed, review };
}

function readMasterCatalog() {
  const target = fs.existsSync(PROMOTIONS_MASTER_JSON) ? PROMOTIONS_MASTER_JSON : PROMOTIONS_JSON;
  return JSON.parse(fs.readFileSync(target, "utf-8"));
}

function applyToAppData(results, checkedAt, { forcePrune = false } = {}) {
  const byId = new Map(results.map((r) => [r.id, r]));

  const masterItems = readMasterCatalog();
  const plan = planCatalogUpdate(masterItems, byId, checkedAt, { forcePrune });
  const nextMasterJson = JSON.stringify(plan.masterUpdated, null, 2) + "\n";
  const nextLiveJson = JSON.stringify(plan.kept, null, 2) + "\n";

  const app = readAppCatalog();
  const nextArray = JSON.stringify(plan.kept, null, 2);
  const nextSource = app.source.slice(0, app.arrayStart) + nextArray + app.source.slice(app.arrayEnd);
  const check = nextSource.slice(app.arrayStart, app.arrayStart + nextArray.length);
  if (JSON.parse(check).length !== plan.kept.length) throw new Error("promotionCatalog 갱신 결과 검증 실패 — 파일을 쓰지 않았습니다.");

  const writeAtomic = (file, content) => {
    const tmp = file + ".tmp-" + process.pid;
    fs.writeFileSync(tmp, content, "utf-8");
    fs.renameSync(tmp, file);
  };
  writeAtomic(PROMOTIONS_MASTER_JSON, nextMasterJson);
  writeAtomic(PROMOTIONS_JSON, nextLiveJson);
  writeAtomic(APP_DATA_JS, nextSource);
  if (plan.review.length > 0) {
    writeAtomic(PROMOTIONS_REVIEW_JSON, JSON.stringify(plan.review, null, 2) + "\n");
  }

  return {
    masterUpdated: plan.masterUpdated,
    kept: plan.kept.length,
    reviewCount: plan.review.length,
    removed: plan.removed.map((p) => ({ id: p.id, reason: byId.get(p.id)?.reason ?? "이전부터 확인 상태 없음" })),
  };
}

// ---------- 실행 ----------

export async function runPromotionPipeline(options = {}) {
  const args = { ...parseArgs([]), ...options };
  const now = Date.now();
  const checkedAt = new Date(now).toISOString();
  let promotions = readMasterCatalog();
  if (args.only) promotions = promotions.filter((p) => args.only.has(p.id));
  const aiExtract = args.aiExtract ?? (process.env.GEMINI_API_KEY ? extractOfferWithAi : null);

  const fetcher = await createPageFetcher({ useBrowser: args.browser, headless: args.headless });
  console.log("프로모션 " + promotions.length + "개 점검 시작 (수집 방식: " + fetcher.mode + ")");
  if (fetcher.fallbackReason && args.browser) console.warn("브라우저를 띄우지 못해 단순 fetch로 진행합니다: " + fetcher.fallbackReason);

  const pagesDir = path.join(REPORT_DIR, "pages");
  const fetchAndMaybeDump = async (url, hints) => {
    const page = await fetcher.fetchPage(url, hints);
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
          result = await verifyPromotion(promotion, { loadPage, aiExtract, now });
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

  function formatDbSyncSummary(dbSync) {
    if (!dbSync) return "Supabase 동기화: 결과 없음";
    const invalidCount = dbSync.invalid?.length ?? 0;
    const unknownList = dbSync.unknownServiceIds?.length ? `[${dbSync.unknownServiceIds.join(", ")}]` : "0개";
    const errorCount = dbSync.errors?.length ?? 0;
    const errorText = errorCount > 0
      ? `${errorCount}건 (${dbSync.errors.map((e) => e.message || String(e)).join("; ")})`
      : "0건";
    if (dbSync.skipped) {
      return `Supabase 동기화 건너뜀 (사유: ${dbSync.reason ?? "알 수 없음"}) · 무효 ${invalidCount}개 · 미등록 서비스 ${unknownList} · 오류 ${errorText}`;
    }
    return `Supabase 동기화: 혜택 ${dbSync.benefitsUpserted ?? 0}건 · 매핑 ${dbSync.mappingsUpserted ?? 0}건 · 무효 ${invalidCount}개 · 미등록 서비스 ${unknownList} · 오류 ${errorText}`;
  }

  if (args.apply) {
    if (args.only) console.log("--only와 함께 실행해 해당 항목만 반영합니다.");
    const applied = applyToAppData(results, checkedAt, { forcePrune: args.forcePrune });
    console.log("앱 데이터(promotions-master.json, promotions.json, subscriptionData.js)에 확인 상태를 반영했습니다. 남은 혜택 " + applied.kept + "개");
    if (applied.removed.length) {
      console.log("확인되지 않아 라이브에서 제외한 혜택 " + applied.removed.length + "개:");
      for (const r of applied.removed) console.log(" - " + r.id + ": " + r.reason);
    }
    const dbSync = await syncPromotionsToSupabase(applied.masterUpdated, { updatedAt: checkedAt }).catch((err) => ({
      skipped: true,
      reason: err?.message ?? String(err),
      benefitsUpserted: 0,
      mappingsUpserted: 0,
      invalid: [],
      unknownServiceIds: [],
      errors: [{ message: err?.message ?? String(err), code: null }],
    }));
    report.applied = { kept: applied.kept, reviewCount: applied.reviewCount, removed: applied.removed, dbSync };
    console.log(formatDbSyncSummary(dbSync));
  } else if (args.syncDb) {
    const dbSync = await syncPromotionsToSupabase(readMasterCatalog(), { updatedAt: checkedAt }).catch((err) => ({
      skipped: true,
      reason: err?.message ?? String(err),
      benefitsUpserted: 0,
      mappingsUpserted: 0,
      invalid: [],
      unknownServiceIds: [],
      errors: [{ message: err?.message ?? String(err), code: null }],
    }));
    report.dbSync = dbSync;
    console.log(formatDbSyncSummary(dbSync));
    if ((dbSync.errors && dbSync.errors.length > 0) || (dbSync.skipped && dbSync.reason !== "SUPABASE_NOT_CONFIGURED")) {
      process.exitCode = 1;
    }
  }
  return report;
}

async function main() {
  await runPromotionPipeline(parseArgs(process.argv.slice(2)));
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
