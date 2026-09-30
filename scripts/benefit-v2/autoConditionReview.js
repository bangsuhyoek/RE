// Derive a price review only from fresh, registered official pages and a
// separately declared variant scope. No amount, period or scope is invented.
import * as cheerio from "cheerio";
import { assessOfficialConditionReview } from "./conditionReview.js";

const PRICE_FIELDS = new Set(["offer_price", "regular_price", "post_trial_price", "trial_cost"]);
const DIMENSIONS = ["product", "plan", "audience", "signupPath", "eligibility",
  "billingStage", "priceBasis", "paymentMethod", "option"];
const PERIOD = /(20\d{2}-\d{2}-\d{2})\s*[~–—-]\s*(20\d{2}-\d{2}-\d{2})/g;
const MONEY = /(?<![\d-])(?:₩|KRW\s*)([\d,]+)|(?<![\d-])([\d,]+)\s*원/gi;

function units(snapshot) {
  if (snapshot?.html) {
    const $ = cheerio.load(snapshot.html);
    const values = [];
    $("tr, li, p, dt, dd").each((_, element) => {
      const node = $(element);
      if (node.parents("tr, li, p, dt, dd").length) return;
      values.push(node.text().replace(/\s+/g, " ").trim());
    });
    return values;
  }
  return String(snapshot?.text || "").split(/\n|\|/).map((value) => value.replace(/\s+/g, " ").trim());
}

function exactTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${/^\d/.test(term) ? "(?<![\\d,])" : ""}${escaped}${/\d$/.test(term) ? "(?!\\d)" : ""}`, "i").test(text);
}

function sameUrl(a, b) {
  try {
    const x = new URL(a); const y = new URL(b);
    x.hash = ""; y.hash = "";
    return x.protocol === "https:" && x.href === y.href;
  } catch { return false; }
}

export function deriveAutomaticPriceReview(target, {
  snapshots = [], now = Date.now(), allowedOrigins = [], authorityRegistry = [],
  targetServiceId = null,
} = {}) {
  const blocked = { status: "UNVERIFIED_CONTEXT", holdReason: target?.holdReason || null,
    field: target?.field || null, value: null, checks: [], review: null };
  if (!PRICE_FIELDS.has(target?.field) ||
      !/^[A-Z][A-Z0-9_]{4,100}$/.test(target?.holdReason || "") ||
      !Array.isArray(target.sourceUrls) || !target.sourceUrls.length ||
      target.sourceUrls.length > 4 ||
      !DIMENSIONS.every((key) => typeof target.scope?.[key] === "string" &&
        target.scope[key].trim().length >= 2)) return blocked;
  const extras = Object.keys(target.scope).filter((key) => key.startsWith("extra:"));
  if (extras.length > 4 || extras.some((key) =>
    !/^extra:[^:]{1,80}$/.test(key) ||
    typeof target.scope[key] !== "string" || target.scope[key].trim().length < 2)) {
    return blocked;
  }
  const dimensions = [...DIMENSIONS, ...extras];

  const quotes = [];
  for (const url of target.sourceUrls) {
    let origin;
    try { origin = new URL(url).origin; } catch { return blocked; }
    if (!allowedOrigins.includes(origin) || !url.startsWith("https://")) return blocked;
    const snapshot = snapshots.find((item) => sameUrl(item.url, url));
    if (!snapshot?.ok || !sameUrl(snapshot.finalUrl || snapshot.url, url)) return blocked;
    const clauses = units(snapshot).filter((unit) => unit.length >= 15 && unit.length <= 450 &&
      dimensions.every((key) => exactTerm(unit, target.scope[key])));
    if (!clauses.length) return blocked;
    let sourceMatches = 0;
    for (const clause of clauses) {
      const periods = [...clause.matchAll(PERIOD)];
      const amounts = [...clause.matchAll(MONEY)];
      // Two amounts or periods in a clause cannot be assigned to one variant.
      if (periods.length !== 1 || amounts.length !== 1) return blocked;
      const valueEvidence = amounts[0][0];
      const value = Number((amounts[0][1] || amounts[0][2]).replaceAll(",", ""));
      if (!Number.isSafeInteger(value) || value < 0) return blocked;
      quotes.push({ sourceUrl: url, value, valueEvidence,
        scope: { ...target.scope }, evidence: { ...target.scope },
        effectiveFrom: periods[0][1], effectiveTo: periods[0][2],
        periodEvidence: periods[0][0] });
      sourceMatches++;
    }
    if (!sourceMatches) return blocked;
  }
  if (quotes.length > 4) return blocked;
  const review = { field: target.field, holdReason: target.holdReason,
    target: { scope: { ...target.scope } }, quotes };
  const result = assessOfficialConditionReview(review, {
    now, snapshots, allowedOrigins, authorityRegistry, targetServiceId,
  });
  return { ...result, review };
}
