// Compare prices only under identical product, plan, signup, eligibility,
// billing stage, price basis and effective period. Search snippets are leads.
import * as cheerio from "cheerio";
import { classifySourceAuthority } from "./sourceAuthority.js";

const DIMENSIONS = [
  "product", "plan", "signupPath", "eligibility", "billingStage", "priceBasis",
];
const MAX_PRICE_SOURCES = 4;
const MAX_CATALOG_AGE = 7 * 86400_000;

function day(value) {
  if (typeof value !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00+09:00`);
  if (!Number.isFinite(time)) return null;
  const [year, month, date] = value.split("-").map(Number);
  const actual = new Date(time + 9 * 3600_000);
  return actual.getUTCFullYear() === year && actual.getUTCMonth() + 1 === month &&
    actual.getUTCDate() === date ? time : null;
}

function samePage(a, b) {
  try {
    const first = new URL(a);
    const second = new URL(b);
    first.hash = "";
    second.hash = "";
    return first.protocol === "https:" && first.href === second.href;
  } catch {
    return false;
  }
}

function approvedPage(raw, origins = []) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password &&
      origins.includes(url.origin) && !/[\r\n]/.test(raw);
  } catch {
    return false;
  }
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function priceToken(amount) {
  const value = Number(amount);
  return Number.isSafeInteger(value) && value >= 0
    ? new RegExp(`(?<!\\d)(?:${value.toLocaleString("en-US")}|${value})\\s*원(?!\\d)`, "i")
    : null;
}

// A whole page may list many offers. Keep its table rows and small clauses
// separate so a nearby plan cannot be attributed to the wrong price.
function evidenceUnits(snapshot = {}, quote = {}) {
  const units = [];
  if (snapshot.html) {
    const $ = cheerio.load(snapshot.html);
    $("tr, li, p, dt, dd").each((_, element) => {
      const node = $(element);
      if (node.parents("tr, li, p, dt, dd").length) return;
      const value = normalize(node.text());
      if (value.length >= 20 && value.length <= 450) units.push(value);
    });
    // Fetcher flattens the entire body. Never use that text to join two
    // unrelated table rows or clauses when structural HTML is available.
    return [...new Set(units)];
  }
  for (const clause of String(snapshot.text || "").split(/\n|\||(?<=[.!?])\s+(?=\S)/)) {
    const value = normalize(clause);
    if (value.length >= 20 && value.length <= 450) units.push(value);
  }
  const exact = normalize(quote.evidenceSnippet);
  if (exact.length >= 20 && exact.length <= 450 &&
      normalize(snapshot.text).includes(exact)) units.push(exact);
  return [...new Set(units)];
}

function hasCondition(field, value, proof, quote, snapshot) {
  if (!value) return false;
  const explicit = quote.conditionEvidence?.[field];
  if (explicit) return typeof explicit === "string" && explicit.length >= 2 &&
    proof.toLowerCase().includes(explicit.toLowerCase());
  switch (field) {
    case "product": {
      if (value !== "YOUTUBE_PREMIUM" ||
          /유튜브\s*프리미엄\s*라이트|youtube\s*premium\s*lite/i.test(proof)) return false;
      return /유튜브\s*프리미엄(?!\s*라이트)|youtube\s*premium(?!\s*lite)/i
        .test(`${proof} ${snapshot.title || ""}`);
    }
    case "signupPath":
      return value === "UDOC_U_PLUS_PLAN_EXCLUSIVE" &&
        /(?:유독.{0,25}요금제.{0,15}전용|요금제.{0,15}전용.{0,25}유독)/i.test(proof);
    case "eligibility":
      return value === "PREMIUM_PACK_ACTIVE_THROUGH_MONTH_END" &&
        /프리미엄\s*팩/i.test(proof) &&
        /(?:월말.{0,18}유지|유지.{0,18}월말)/i.test(proof);
    case "billingStage":
      return value === "MONTHLY_RENEWAL" &&
        /(?:갱신.{0,12}월|월.{0,12}갱신)/i.test(proof);
    case "priceBasis":
      return value === "FINAL_MONTHLY_ADDITIONAL_CHARGE" &&
        /최종.{0,18}추가.{0,12}(?:청구|금액)/i.test(proof);
    default:
      return false;
  }
}

function observedPlan(proof, review, quote) {
  const known = [...new Set([
    review?.target?.plan,
    ...(Array.isArray(review?.knownPlans) ? review.knownPlans : []),
    quote.plan,
  ].filter(Boolean))];
  const matches = known.filter((plan) => proof.toLowerCase().includes(plan.toLowerCase()));
  if (!matches.length) return null;
  matches.sort((a, b) => b.length - a.length);
  if (matches.some((item) => !matches[0].includes(item))) return null;
  // A verified plan suffix in a carrier table can identify the full
  // service-specific plan label, provided no other known plan matches.
  return review.target.plan.includes(matches[0]) ? review.target.plan : matches[0];
}

function observedPeriod(proof, quote) {
  const ranges = [...proof.matchAll(/(20\d{2}-\d{2}-\d{2})\s*(?:~|–|—|부터|to)\s*(20\d{2}-\d{2}-\d{2})/gi)];
  if (ranges.length === 1 && day(ranges[0][1]) && day(ranges[0][2])) {
    const [from, to] = [ranges[0][1], ranges[0][2]];
    if ((quote.effectiveFrom && quote.effectiveFrom !== from) ||
        (quote.effectiveTo && quote.effectiveTo !== to)) return null;
    return { effectiveFrom: from, effectiveTo: to };
  }
  if (quote.openEndedConfirmed === true && day(quote.effectiveFrom) &&
      proof.includes(quote.effectiveFrom) && quote.ongoingEvidenceTerm &&
      proof.includes(quote.ongoingEvidenceTerm)) {
    return { effectiveFrom: quote.effectiveFrom, effectiveTo: null };
  }
  return null;
}

function verifiedClaim(quote, snapshot, review, now) {
  const observed = Date.parse(snapshot?.observedAt || "");
  if (!snapshot?.ok || !samePage(quote.sourceUrl, snapshot.finalUrl || snapshot.url) ||
      !Number.isFinite(observed) || observed > now || now - observed > 7 * 86400_000) return null;
  const token = priceToken(quote.amount);
  if (!token) return null;
  for (const proof of evidenceUnits(snapshot, quote)) {
    if (!token.test(proof)) continue;
    const plan = observedPlan(proof, review, quote);
    const period = observedPeriod(proof, quote);
    if (!plan || !period || (quote.plan && quote.plan !== plan)) continue;
    const conditions = { ...quote, plan, ...period };
    for (const field of DIMENSIONS) {
      if (field === "plan") continue;
      // Missing seed metadata can be filled only if this exact condition is
      // visible in the price clause. An unknown alternative stays unresolved.
      if (!conditions[field] && hasCondition(field, review.target[field], proof, quote, snapshot)) {
        conditions[field] = review.target[field];
      }
    }
    if (!DIMENSIONS.every((field) => field === "plan" ||
      (hasCondition(field, conditions[field], proof, quote, snapshot) &&
        (conditions[field] === review.target[field] ||
          !hasCondition(field, review.target[field], proof,
            { ...quote, conditionEvidence: undefined }, snapshot))))) continue;
    return { ...conditions, evidenceKind: "LIVE_OFFICIAL_PAGE", proof };
  }
  return null;
}

function missingProof(quote, snapshot, review, now) {
  const observed = Date.parse(snapshot?.observedAt || "");
  if (!snapshot?.ok || !samePage(quote.sourceUrl, snapshot.finalUrl || snapshot.url) ||
      !Number.isFinite(observed) || observed > now || now - observed > 7 * 86400_000) {
    return ["freshOfficialPage"];
  }
  const token = priceToken(quote.amount);
  const clauses = token ? evidenceUnits(snapshot, quote).filter((unit) => token.test(unit)) : [];
  if (!clauses.length) return ["liveAmount"];
  const candidates = clauses.map((unit) => {
    const missing = [];
    if (!observedPlan(unit, review, quote)) missing.push("plan");
    if (!observedPeriod(unit, quote)) missing.push("effectivePeriod");
    for (const field of DIMENSIONS) {
      if (field === "plan") continue;
      const claimed = quote[field] || review.target[field];
      if (!hasCondition(field, claimed, unit, quote, snapshot)) missing.push(field);
    }
    return missing;
  });
  return candidates.sort((a, b) => a.length - b.length)[0].length
    ? candidates[0] : ["ambiguousCondition"];
}

export function assessPriceEvidence(review, { now = Date.now(), snapshot = null, snapshots = [] } = {}) {
  const target = review?.target || {};
  const checks = [];
  const blocked = { status: "UNVERIFIED_CONTEXT", holdReason: "OFFICIAL_PRICE_CONTEXT_UNVERIFIED", offerPrice: null, checks };
  if (!Number.isFinite(now) || DIMENSIONS.some((field) => !target[field])) return blocked;
  const today = day(new Date(now + 9 * 3600_000).toISOString().slice(0, 10));
  if (!today || !Array.isArray(review?.quotes) || review.quotes.length === 0 ||
      review.quotes.length > MAX_PRICE_SOURCES) return blocked;
  const allSnapshots = [...snapshots, snapshot].filter(Boolean);
  const verified = [];
  let unresolved = false;

  for (const quote of review.quotes) {
    const source = allSnapshots.find((page) => samePage(quote.sourceUrl, page.url));
    const proof = verifiedClaim(quote, source, review, now);
    if (!proof) {
      unresolved = true;
      checks.push({ sourceUrl: quote.sourceUrl, amount: quote.amount, status: "UNVERIFIED_CONTEXT",
        missing: missingProof(quote, source, review, now) });
      continue;
    }
    const differentFields = DIMENSIONS.filter((field) => proof[field] !== target[field]);
    const differentTime = day(proof.effectiveFrom) > today ||
      (day(proof.effectiveTo) && day(proof.effectiveTo) < today);
    if (differentTime) differentFields.push("effectivePeriod");
    if (differentFields.length) {
      checks.push({ sourceUrl: quote.sourceUrl, amount: quote.amount, status: "DIFFERENT_CONDITION",
        differingFields: differentFields });
      continue;
    }
    verified.push(Number(quote.amount));
    checks.push({ sourceUrl: quote.sourceUrl, amount: Number(quote.amount), status: "SAME_CURRENT_CONDITION" });
  }
  if (new Set(verified).size > 1) {
    return { status: "SAME_CONTEXT_CONFLICT", holdReason: "OFFICIAL_PRICE_SAME_CONTEXT_CONFLICT", offerPrice: null, checks };
  }
  if (!verified.length || unresolved) return blocked;
  return { status: "VERIFIED_CURRENT_PRICE", holdReason: null, offerPrice: verified[0], checks };
}

function currentOfficialSnapshot(url, snapshots, now, allowedOrigins, authorityRegistry,
  targetServiceId) {
  if (!approvedPage(url, allowedOrigins)) return null;
  const authority = classifySourceAuthority(url,
    { registry: authorityRegistry, targetServiceId });
  if (!["OFFICIAL_SERVICE", "OFFICIAL_PARTNER"].includes(authority.type) ||
      Number(authority.score) < 500) return null;
  const page = snapshots.find((item) => samePage(item.url, url));
  const age = now - Date.parse(page?.observedAt || "");
  return page?.ok && samePage(page.finalUrl || page.url, url) &&
    Number.isFinite(age) && age >= 0 && age <= MAX_CATALOG_AGE && page.html
    ? page : null;
}

function pageBody(page) {
  const $ = cheerio.load(page.html);
  $("script, style, nav, header, footer").remove();
  return normalize($("main").first().length ? $("main").first().text() : $("body").text());
}

// A live catalog can publish one price for a *listed group* of eligible
// plans while its separate official usage guide explains the payable amount.
// Require a current product, guide and plan page. The old indexed plan price
// is only a lead; a current, differently priced plan clause blocks the join.
export function assessCatalogGroupPrice(review, {
  now = Date.now(), snapshots = [], allowedOrigins = [], authorityRegistry = [],
  targetServiceId = null,
} = {}) {
  const join = review?.catalogJoin;
  const blocked = { status: "UNVERIFIED_CONTEXT",
    holdReason: "OFFICIAL_PRICE_CONTEXT_UNVERIFIED", offerPrice: null,
    checks: [{ status: "CATALOG_COMBINATION_UNVERIFIED" }] };
  if (!join || review?.target?.product !== "YOUTUBE_PREMIUM" ||
      review?.target?.signupPath !== "UDOC_U_PLUS_PLAN_EXCLUSIVE" ||
      review?.target?.eligibility !== "PREMIUM_PACK_ACTIVE_THROUGH_MONTH_END" ||
      review?.target?.billingStage !== "MONTHLY_RENEWAL" ||
      review?.target?.priceBasis !== "FINAL_MONTHLY_ADDITIONAL_CHARGE" ||
      !review.target.plan || !join.productTitle || !join.eligiblePlanTerm ||
      !review.target.plan.endsWith(join.eligiblePlanTerm) || !join.productUrl ||
      !join.guideUrl || !join.planUrl || !Number.isFinite(now) ||
      !Array.isArray(review.quotes) || review.quotes.length !== 2 ||
      !samePage(join.guideUrl, review.quotes[1].sourceUrl) ||
      !samePage(join.planUrl, review.quotes[0].sourceUrl)) return blocked;
  const product = currentOfficialSnapshot(join.productUrl, snapshots, now,
    allowedOrigins, authorityRegistry, targetServiceId);
  const guide = currentOfficialSnapshot(join.guideUrl, snapshots, now,
    allowedOrigins, authorityRegistry, targetServiceId);
  const plan = currentOfficialSnapshot(join.planUrl, snapshots, now,
    allowedOrigins, authorityRegistry, targetServiceId);
  if (!product || !guide || !plan) return blocked;
  const $ = cheerio.load(product.html);
  const headings = $("h1").toArray().filter((item) =>
    normalize($(item).text()) === join.productTitle);
  if (headings.length !== 1) return blocked;
  const catalog = pageBody(product);
  const heading = catalog.indexOf(join.productTitle);
  const endMarker = catalog.indexOf("상품정보", heading + join.productTitle.length);
  if (heading < 0 || endMarker < 0 || endMarker - heading > 1200) return blocked;
  const header = catalog.slice(heading, endMarker);
  const listMarker = header.indexOf("가입 가능한 요금제 목록");
  if (listMarker < 0 || !header.slice(listMarker).includes(join.eligiblePlanTerm) ||
      !header.includes("요금제 전용") || !/구독하기/.test(header) ||
      /(?:판매\s*종료|가입\s*종료|행사\s*종료)/.test(header)) return blocked;

  const guideText = pageBody(guide);
  const guideAmounts = [...guideText.matchAll(/월\s*([\d,]+)\s*원\s*추가\s*청구/g)]
    .map((entry) => Number(entry[1].replaceAll(",", "")));
  if (new Set(guideAmounts).size !== 1 || !guideAmounts.length ||
      !guideText.includes("유튜브 프리미엄") ||
      !/유독.{0,35}요금제\s*전용|요금제\s*전용.{0,35}유독/.test(guideText) ||
      !/월말.{0,25}대상\s*요금제.{0,18}유지/.test(guideText)) return blocked;
  const payable = guideAmounts[0];
  const breakdown = guideText.match(/구독료\s*([\d,]+)\s*원\s*중\s*([\d,]+)\s*원을\s*할인/);
  if (!Number.isSafeInteger(payable) || payable < 0 ||
      !breakdown || Number(breakdown[1].replaceAll(",", "")) -
        Number(breakdown[2].replaceAll(",", "")) !== payable) return blocked;
  const regular = Number(breakdown[1].replaceAll(",", ""));
  const catalogPrices = [...header.matchAll(/월\s*([\d,]+)\s*원/g)]
    .map((entry) => Number(entry[1].replaceAll(",", "")));
  if (!catalogPrices.includes(payable) || !catalogPrices.includes(regular) ||
      catalogPrices.some((amount) => amount !== payable && amount !== regular)) return blocked;

  const indexed = review.quotes[0];
  const planBody = pageBody(plan);
  // A live plan-specific amount matching the old index defeats this group
  // claim. The carrier plan's own monthly tariff is not a subscription price.
  if (priceToken(indexed.amount)?.test(planBody) ||
      evidenceUnits(plan, indexed).some((unit) =>
        /유튜브\s*프리미엄/i.test(unit) &&
        /(?:구독료|추가\s*청구)/.test(unit) &&
        [...unit.matchAll(/([\d,]+)\s*원/g)].some((entry) =>
          Number(entry[1].replaceAll(",", "")) !== payable))) return blocked;
  return { status: "VERIFIED_CURRENT_PRICE", holdReason: null,
    offerPrice: payable, evidenceMode: "CURRENT_CATALOG_GROUP_JOIN",
    conditions: ["product", "plan", "signupPath", "eligibility", "billingStage",
      "priceBasis", "currentCatalog", "officialUsageGuide"],
    checks: [
      { sourceUrl: join.productUrl, status: "CURRENT_GROUP_PRICE_AND_ELIGIBLE_PLAN",
        amount: payable },
      { sourceUrl: join.guideUrl, status: "CURRENT_FINAL_MONTHLY_CHARGE",
        amount: payable },
      { sourceUrl: join.planUrl, status: "INDEXED_PRICE_NOT_PROVEN_ON_LIVE_PLAN" },
    ] };
}

// Fetch only explicitly configured official URLs. Every consulted page joins
// the pipeline snapshot log. Redirects or failed pages cannot resolve a price.
export async function reconcileOfficialPriceReview(review, {
  now = Date.now(), primarySnapshot, allowedOrigins = [], authorityRegistry = [],
  targetServiceId = null, loadSnapshot, onSnapshot,
} = {}) {
  if (!review || !Array.isArray(review.quotes) || review.quotes.length < 1 ||
      review.quotes.length > MAX_PRICE_SOURCES) return assessPriceEvidence(review, { now });
  const snapshots = primarySnapshot ? [primarySnapshot] : [];
  for (const url of new Set(review.quotes.map((quote) => quote.sourceUrl))) {
    if (!approvedPage(url, allowedOrigins) || typeof loadSnapshot !== "function") continue;
    const authority = classifySourceAuthority(url, {
      registry: authorityRegistry, targetServiceId,
    });
    if (!["OFFICIAL_PARTNER", "OFFICIAL_SERVICE"].includes(authority.type)) continue;
    if (snapshots.some((item) => samePage(item.url, url))) continue;
    try {
      const page = await loadSnapshot(url);
      if (onSnapshot) await onSnapshot(page);
      snapshots.push(page);
    } catch {
      // Network or snapshot write errors cannot verify a conflicting price.
    }
  }
  const original = assessPriceEvidence(review, { now, snapshots });
  if (original.status !== "UNVERIFIED_CONTEXT" || !review.catalogJoin) return original;
  const joined = assessCatalogGroupPrice(review, { now, snapshots, allowedOrigins,
    authorityRegistry, targetServiceId });
  return joined.status === "VERIFIED_CURRENT_PRICE" ? joined : original;
}
