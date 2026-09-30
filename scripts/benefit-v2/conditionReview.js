// An opt-in review for one ambiguous field of one official offer variant.
// Configured quotes are leads, not evidence: the live official page must
// repeat the value, every relevant condition and its effective period in one
// short clause or table row. Unknown claims keep the offer on hold.
import * as cheerio from "cheerio";
import { classifySourceAuthority } from "./sourceAuthority.js";

const REVIEWABLE_FIELDS = new Set([
  "offer_price", "regular_price", "post_trial_price", "trial_cost",
  "trial_duration_days", "target_plan", "audience", "required_plan",
  "new_user_rule", "auto_renewal",
]);
const PRICE_FIELDS = new Set(["offer_price", "regular_price", "post_trial_price", "trial_cost"]);
const CORE_DIMENSIONS = ["product", "plan", "audience", "signupPath", "eligibility", "billingStage"];
const PRICE_DIMENSIONS = ["priceBasis", "paymentMethod", "option"];
const MAX_QUOTES = 4;
const MAX_AGE_MS = 7 * 86400_000;

function normalized(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function containsTerm(unit, term) {
  const needle = normalized(term);
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefix = /^\d/.test(needle) ? "(?<![\\d,])" : "";
  const suffix = /\d$/.test(needle) ? "(?!\\d)" : "";
  return new RegExp(`${prefix}${escaped}${suffix}`, "i").test(unit);
}

function sameUrl(a, b) {
  try {
    const first = new URL(a);
    const second = new URL(b);
    first.hash = "";
    second.hash = "";
    return first.protocol === "https:" && first.href === second.href;
  } catch { return false; }
}

function approvedUrl(url, origins) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password &&
      origins.includes(parsed.origin) && !/[\r\n]/.test(url);
  } catch { return false; }
}

function day(value) {
  if (typeof value !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return null;
  const millis = Date.parse(`${value}T00:00:00+09:00`);
  if (!Number.isFinite(millis)) return null;
  return new Date(millis + 9 * 3600_000).toISOString().slice(0, 10) === value
    ? millis : null;
}

function units(snapshot) {
  if (snapshot.html) {
    const $ = cheerio.load(snapshot.html);
    const fragments = [];
    $("tr, li, p, dt, dd").each((_, element) => {
      const node = $(element);
      if (node.parents("tr, li, p, dt, dd").length) return;
      const value = normalized(node.text());
      if (value.length >= 15 && value.length <= 450) fragments.push(value);
    });
    return [...new Set(fragments)];
  }
  return [...new Set(String(snapshot.text || "").split(/\n|\||(?<=[.!?])\s+(?=\S)/)
    .map(normalized).filter((value) => value.length >= 15 && value.length <= 450))];
}

function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

function requiredDimensions(field, review) {
  const extras = Object.keys(review?.target?.scope || {})
    .filter((key) => /^extra:[^:]{1,80}$/.test(key)).sort();
  return [...CORE_DIMENSIONS, ...(PRICE_FIELDS.has(field) ? PRICE_DIMENSIONS : []),
    ...extras];
}

function moneyValue(text) {
  const match = String(text).match(/(?:₩|KRW)\s*([\d,]+)|([\d,]+)\s*원/i);
  if (!match) return null;
  const numeric = Number((match[1] || match[2]).replaceAll(",", ""));
  return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null;
}

function validConfig(review) {
  if (!REVIEWABLE_FIELDS.has(review?.field) ||
      !Array.isArray(review?.quotes) || review.quotes.length < 1 ||
      review.quotes.length > MAX_QUOTES || !review.target ||
      !review.holdReason || !/^[A-Z][A-Z0-9_]{4,100}$/.test(review.holdReason)) return false;
  if (Object.keys(review.target.scope || {}).filter((key) => key.startsWith("extra:")).length > 4) {
    return false;
  }
  const dimensions = requiredDimensions(review.field, review);
  const validScope = (scope) => dimensions.every((dim) =>
    typeof scope?.[dim] === "string" && normalized(scope[dim]).length > 0);
  return validScope(review.target.scope) && review.quotes.every((quote) =>
    quote && quote.sourceUrl && validScope(quote.scope) &&
    quote.value !== null && quote.value !== undefined && quote.value !== "" &&
    typeof quote.valueEvidence === "string" && normalized(quote.valueEvidence).length >= 2 &&
    dimensions.every((dim) => typeof quote.evidence?.[dim] === "string" &&
      normalized(quote.evidence[dim]).length >= 2) &&
    day(quote.effectiveFrom) && day(quote.effectiveTo) &&
    day(quote.effectiveFrom) <= day(quote.effectiveTo) &&
    typeof quote.periodEvidence === "string" && quote.periodEvidence.includes(quote.effectiveFrom) &&
    quote.periodEvidence.includes(quote.effectiveTo) &&
    (!PRICE_FIELDS.has(review.field) ||
      (Number.isSafeInteger(quote.value) && quote.value >= 0 &&
        moneyValue(quote.valueEvidence) === quote.value)));
}

function proofFor(quote, snapshot, review, now) {
  const observed = Date.parse(snapshot?.observedAt || "");
  if (!snapshot?.ok || !sameUrl(quote.sourceUrl, snapshot.finalUrl || snapshot.url) ||
      !Number.isFinite(observed) || observed > now || now - observed > MAX_AGE_MS) return null;
  const dimensions = requiredDimensions(review.field, review);
  const terms = [quote.valueEvidence, quote.periodEvidence,
    ...dimensions.map((dim) => quote.evidence[dim])];
  return units(snapshot).find((unit) => {
    if (!terms.every((term) => containsTerm(unit, term))) return false;
    // A paragraph listing two products, options or prices cannot assign a
    // quoted amount to one variant merely because both words appear nearby.
    return !review.quotes.some((other) => {
      if (other === quote) return false;
      if (!equal(other.value, quote.value) &&
          containsTerm(unit, other.valueEvidence)) return true;
      if (other.periodEvidence !== quote.periodEvidence &&
          containsTerm(unit, other.periodEvidence)) return true;
      return dimensions.some((dim) => other.scope[dim] !== quote.scope[dim] &&
        containsTerm(unit, other.evidence[dim]));
    });
  }) || null;
}

export function assessOfficialConditionReview(review, {
  now = Date.now(), snapshots = [], allowedOrigins = [], authorityRegistry = [],
  targetServiceId = null,
} = {}) {
  const checks = [];
  const blocked = { field: review?.field || null, status: "UNVERIFIED_CONTEXT",
    holdReason: review?.holdReason || "OFFICIAL_CONDITION_CONTEXT_UNVERIFIED",
    value: null, evidence: null, checks };
  if (!Number.isFinite(now) || !validConfig(review)) return blocked;
  const today = day(new Date(now + 9 * 3600_000).toISOString().slice(0, 10));
  const eligible = [];
  let unresolved = false;
  for (const quote of review.quotes) {
    const sourceUrl = quote.sourceUrl;
    const authority = classifySourceAuthority(sourceUrl, {
      registry: authorityRegistry, targetServiceId,
    });
    if (!approvedUrl(sourceUrl, allowedOrigins) ||
        !["OFFICIAL_PARTNER", "OFFICIAL_SERVICE"].includes(authority.type) ||
        Number(authority.score) < 500) {
      unresolved = true;
      checks.push({ sourceUrl, status: "UNVERIFIED_CONTEXT", missing: ["approvedOfficialSource"] });
      continue;
    }
    const page = snapshots.find((item) => sameUrl(item.url, sourceUrl));
    const proof = proofFor(quote, page, review, now);
    if (!proof) {
      unresolved = true;
      checks.push({ sourceUrl, status: "UNVERIFIED_CONTEXT", missing: ["sameClauseValueAndConditionsAndPeriod"] });
      continue;
    }
    const differentConditions = requiredDimensions(review.field, review).filter((dim) =>
      quote.scope[dim] !== review.target.scope[dim]);
    if (today < day(quote.effectiveFrom) || today > day(quote.effectiveTo)) {
      differentConditions.push("effectivePeriod");
    }
    if (differentConditions.length) {
      checks.push({ sourceUrl, status: "DIFFERENT_CONDITION", differingFields: differentConditions });
      continue;
    }
    eligible.push({ value: quote.value, sourceUrl, proof, authority });
    checks.push({ sourceUrl, status: "SAME_CURRENT_CONDITION", value: quote.value });
  }
  if (eligible.some((item) => !equal(item.value, eligible[0].value))) {
    return { ...blocked, status: "SAME_CONTEXT_CONFLICT" };
  }
  if (!eligible.length || unresolved) return blocked;
  const chosen = eligible[0];
  return { field: review.field, status: "VERIFIED_CURRENT_CONDITION", holdReason: null,
    value: chosen.value, evidence: {
      sourceUrl: chosen.sourceUrl, evidenceText: chosen.proof,
      authorityType: chosen.authority.type, authorityScore: chosen.authority.score,
    }, checks };
}

// Only explicitly registered official URLs are fetched. A page failure never
// becomes a verified claim, and every fetched page joins the snapshot log.
export async function reconcileOfficialConditionReview(review, {
  now = Date.now(), primarySnapshot, allowedOrigins = [], authorityRegistry = [],
  targetServiceId = null, loadSnapshot, onSnapshot,
} = {}) {
  const snapshots = primarySnapshot ? [primarySnapshot] : [];
  if (validConfig(review)) {
    for (const url of new Set(review.quotes.map((item) => item.sourceUrl))) {
      if (!approvedUrl(url, allowedOrigins) ||
          snapshots.some((item) => sameUrl(item.url, url))) continue;
      const authority = classifySourceAuthority(url, { registry: authorityRegistry, targetServiceId });
      if (!["OFFICIAL_PARTNER", "OFFICIAL_SERVICE"].includes(authority.type) ||
          Number(authority.score) < 500 || typeof loadSnapshot !== "function") continue;
      try {
        const page = await loadSnapshot(url);
        if (onSnapshot) await onSnapshot(page);
        snapshots.push(page);
      } catch { /* Failed source or snapshot write retains the hold. */ }
    }
  }
  return assessOfficialConditionReview(review, {
    now, snapshots, allowedOrigins, authorityRegistry, targetServiceId,
  });
}

export function applyOfficialConditionReview(observations = [], review, result, now = Date.now()) {
  if (!REVIEWABLE_FIELDS.has(review?.field)) return observations;
  const retained = observations.filter((item) => item.field !== review.field);
  if (result?.status !== "VERIFIED_CURRENT_CONDITION" || !result.evidence) return retained;
  return [...retained, {
    field: review.field, value: result.value, state: "EXTRACTED",
    observedAt: new Date(now).toISOString(), extractor: "OFFICIAL_CONDITION_REVIEW",
    sourceUrl: result.evidence.sourceUrl, evidenceText: result.evidence.evidenceText,
    authorityType: result.evidence.authorityType,
    authorityScore: result.evidence.authorityScore,
  }];
}
