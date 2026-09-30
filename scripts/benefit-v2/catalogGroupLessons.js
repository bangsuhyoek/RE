// Remember how a current official catalog and guide were combined, never
// their amount or a decision to publish. Reusing a route still requires the
// original price validator to fetch and verify all three pages again.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { classifySourceAuthority } from "./sourceAuthority.js";

const FIELDS = ["product", "signupPath", "eligibility", "billingStage", "priceBasis"];
const AGE_LIMIT = 90 * 86400_000;
const VALIDATOR = "LGUPLUS_YOUTUBE_CATALOG_GROUP_V1";

function canonicalUrl(input, origins) {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password ||
        !origins.includes(url.origin) || /[\r\n]/.test(input)) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}

function keyOf(family, target) {
  if (!["sourceId", "partnerId", "serviceId"].every((field) =>
    typeof family?.[field] === "string" &&
    /^[a-z][a-z0-9_-]{1,100}$/i.test(family[field])) ||
    !FIELDS.every((field) => typeof target?.[field] === "string" &&
      target[field].length >= 2 && target[field].length <= 120)) return null;
  return crypto.createHash("sha256").update(JSON.stringify([
    ...["sourceId", "partnerId", "serviceId"].map((field) => family[field]),
    ...FIELDS.map((field) => target[field]), VALIDATOR,
  ])).digest("hex");
}

function routeOk(join, review, options) {
  if (!join || !review?.target?.plan || !Array.isArray(review.quotes) ||
      review.quotes.length !== 2 ||
      review.target.product !== "YOUTUBE_PREMIUM" ||
      review.target.signupPath !== "UDOC_U_PLUS_PLAN_EXCLUSIVE" ||
      review.target.eligibility !== "PREMIUM_PACK_ACTIVE_THROUGH_MONTH_END" ||
      review.target.billingStage !== "MONTHLY_RENEWAL" ||
      review.target.priceBasis !== "FINAL_MONTHLY_ADDITIONAL_CHARGE" ||
      join.productTitle !== "유튜브 프리미엄 (U+요금제 전용)" ||
      join.eligiblePlanTerm !== review.target.plan.replace(/^유튜브프리미엄\s*/, "") ||
      !join.eligiblePlanTerm ||
      !canonicalUrl(join.productUrl, options.allowedOrigins || []) ||
      !canonicalUrl(join.guideUrl, options.allowedOrigins || []) ||
      !canonicalUrl(join.planUrl, options.allowedOrigins || []) ||
      canonicalUrl(join.guideUrl, options.allowedOrigins || []) !==
        canonicalUrl(review.quotes[1].sourceUrl, options.allowedOrigins || []) ||
      canonicalUrl(join.planUrl, options.allowedOrigins || []) !==
        canonicalUrl(review.quotes[0].sourceUrl, options.allowedOrigins || [])) return false;
  const origin = new URL(join.productUrl).origin;
  if (origin !== new URL(join.guideUrl).origin ||
      origin !== new URL(join.planUrl).origin) return false;
  return [join.productUrl, join.guideUrl, join.planUrl].every((url) => {
    const authority = classifySourceAuthority(url, {
      registry: options.authorityRegistry,
      targetServiceId: options.targetServiceId,
    });
    return ["OFFICIAL_PARTNER", "OFFICIAL_SERVICE"].includes(authority.type) &&
      authority.score >= 500;
  });
}

export function catalogGroupLessonPath(directory, family, target) {
  const key = keyOf(family, target);
  return key ? path.join(directory, "catalog-group", `${key}.json`) : null;
}

export function saveCatalogGroupLesson(directory, family, review, result, offer, gate,
  options = {}) {
  const now = options.now ?? Date.now();
  const destination = catalogGroupLessonPath(directory, family, review?.target);
  const price = offer?.fields?.offer_price;
  if (!destination || !Number.isFinite(now) ||
      result?.status !== "VERIFIED_CURRENT_PRICE" ||
      result.evidenceMode !== "CURRENT_CATALOG_GROUP_JOIN" ||
      !Number.isSafeInteger(result.offerPrice) || result.offerPrice < 0 ||
      price?.state !== "VERIFIED" || Number(price.value) !== result.offerPrice ||
      !(price.evidence || []).some((item) => Number(item.authorityScore) >= 500) ||
      !["PUBLISH", "DO_NOT_PUBLISH"].includes(gate?.decision) ||
      (gate.failures || []).some((failure) => failure.startsWith("offer_price:") ||
        failure === "PARTNERSHIP_PRICE_NOT_MONETARY" ||
        failure.includes("OFFICIAL_PRICE_CONTEXT_UNVERIFIED") ||
        (failure.startsWith("UNRESOLVED_CONFLICT:") &&
          failure.slice("UNRESOLVED_CONFLICT:".length).split(",").includes("offer_price"))) ||
      !routeOk(review.catalogJoin, review, options) ||
      result.checks?.length !== 3 ||
      !["CURRENT_GROUP_PRICE_AND_ELIGIBLE_PLAN", "CURRENT_FINAL_MONTHLY_CHARGE",
        "INDEXED_PRICE_NOT_PROVEN_ON_LIVE_PLAN"].every((status, index) =>
        result.checks[index]?.status === status)) return false;
  const rule = { schemaVersion: 1, validator: VALIDATOR, status: "ROUTE_ONLY",
    key: keyOf(family, review.target), family,
    target: Object.fromEntries(FIELDS.map((field) => [field, review.target[field]])),
    productUrl: review.catalogJoin.productUrl,
    guideUrl: review.catalogJoin.guideUrl,
    productTitle: review.catalogJoin.productTitle,
    verifiedAt: new Date(now).toISOString(),
  };
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temp = destination + "." + crypto.randomBytes(6).toString("hex") + ".tmp";
  try {
    fs.writeFileSync(temp, JSON.stringify(rule, null, 2) + "\n",
      { flag: "wx", mode: 0o600 });
    fs.renameSync(temp, destination);
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  return true;
}

export function loadCatalogGroupLesson(directory, family, review, options = {}) {
  const now = options.now ?? Date.now();
  const filename = catalogGroupLessonPath(directory, family, review?.target);
  if (!filename || !Number.isFinite(now) || review?.catalogJoin) return null;
  let rule;
  try {
    const stat = fs.lstatSync(filename);
    if (!stat.isFile() || stat.size > 4096) return null;
    rule = JSON.parse(fs.readFileSync(filename, "utf8"));
  } catch { return null; }
  const age = now - Date.parse(rule?.verifiedAt || "");
  if (rule?.schemaVersion !== 1 || rule.validator !== VALIDATOR ||
      rule.status !== "ROUTE_ONLY" ||
      rule.key !== keyOf(family, review.target) ||
      !FIELDS.every((field) => rule.target?.[field] === review.target[field]) ||
      !["sourceId", "partnerId", "serviceId"].every((field) =>
        rule.family?.[field] === family[field]) ||
      !Number.isFinite(age) || age < 0 || age > AGE_LIMIT ||
      !Array.isArray(review.quotes) || review.quotes.length !== 2 ||
      canonicalUrl(rule.guideUrl, options.allowedOrigins || []) !==
        canonicalUrl(review.quotes[1].sourceUrl, options.allowedOrigins || [])) return null;
  const join = { productUrl: rule.productUrl, productTitle: rule.productTitle,
    eligiblePlanTerm: review.target.plan.replace(/^유튜브프리미엄\s*/, ""),
    guideUrl: rule.guideUrl, planUrl: review.quotes[0].sourceUrl };
  return routeOk(join, review, options) ? { lessonId: rule.key, catalogJoin: join } : null;
}
