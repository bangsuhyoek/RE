// Learn a discriminator from explicit official table rows. Cached rules are
// routing hints only: each run must verify today's price and period afresh.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as cheerio from "cheerio";
import { assessOfficialConditionReview } from "./conditionReview.js";
import { classifySourceAuthority } from "./sourceAuthority.js";

const FIELDS = new Set(["offer_price", "regular_price", "post_trial_price", "trial_cost"]);
const DIMENSIONS = ["product", "plan", "audience", "signupPath", "eligibility",
  "billingStage", "priceBasis", "paymentMethod", "option"];
const LABELS = new Map([
  ["상품", "product"], ["서비스", "product"], ["product", "product"],
  ["요금제", "plan"], ["플랜", "plan"], ["plan", "plan"],
  ["대상", "audience"], ["가입대상", "audience"], ["audience", "audience"],
  ["가입경로", "signupPath"], ["신청경로", "signupPath"],
  ["가입조건", "eligibility"], ["적용조건", "eligibility"],
  ["청구단계", "billingStage"], ["청구시점", "billingStage"],
  ["가격기준", "priceBasis"], ["금액기준", "priceBasis"],
  ["결제수단", "paymentMethod"], ["결제방법", "paymentMethod"],
  ["선택옵션", "option"], ["옵션", "option"],
  ["적용기간", "period"], ["행사기간", "period"],
  ["가격", "price"], ["최종청구액", "price"], ["추가금액", "price"],
]);
const PERIOD = /^(20\d{2}-\d{2}-\d{2})\s*[~–—-]\s*(20\d{2}-\d{2}-\d{2})$/;
const AMOUNT = /^(?:₩|KRW\s*)?([\d,]+)\s*원?$/i;
const MAX_AGE = 7 * 86400_000;
const LESSON_AGE = 90 * 86400_000;

function validLessonFamily(family) {
  return Boolean(family && ["sourceId", "partnerId", "serviceId"]
    .every((key) => typeof family[key] === "string" &&
      /^[a-z][a-z0-9_-]{1,100}$/i.test(family[key])));
}

// A discriminator is usable only when it was independently declared for this
// exact variant. Values found in the disputed page cannot select themselves.
export function independentConditionAnchor(requiredPlan, declared = {}) {
  const anchor = {};
  if (typeof requiredPlan === "string" && requiredPlan.trim()) {
    anchor.plan = requiredPlan.trim();
  }
  for (const field of DIMENSIONS) {
    if (field === "plan") continue;
    if (typeof declared?.[field] === "string" && declared[field].trim().length >= 2) {
      anchor[field] = declared[field].trim();
    }
  }
  for (const [field, value] of Object.entries(declared || {})) {
    if (/^extra:[^:]{1,80}$/.test(field) && typeof value === "string" &&
        value.trim().length >= 2) anchor[field] = value.trim();
  }
  return anchor;
}

export function ruleMatchesIndependentAnchor(rule, anchor = {}) {
  return Boolean(rule?.discriminators?.length &&
    rule.discriminators.every((field) => typeof anchor[field] === "string" &&
      anchor[field] === rule.scope?.[field]));
}

export function isPriceContextHold(reason) {
  const value = String(reason || "");
  return /(?:PRICE|CHARGE|BILLING|TRIAL_CONDITION)/.test(value) &&
    !/(?:ACTION|ENTRYPOINT|REGISTRATION|MODEL|PERCENT|CAP|DISCOUNT|DEPENDENT)/.test(value);
}

function trimmed(value) { return String(value ?? "").replace(/\s+/g, " ").trim(); }
function canonicalUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}
function effectiveDate(date) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(date || "")) return false;
  const time = Date.parse(date + "T00:00:00+09:00");
  return Number.isFinite(time) &&
    new Date(time + 9 * 3600_000).toISOString().slice(0, 10) === date;
}
function identity({ url, variantId, field, holdReason }) {
  return crypto.createHash("sha256").update(JSON.stringify([
    canonicalUrl(url), variantId, field, holdReason,
  ])).digest("hex");
}

export function conditionRulePath(directory, identityFields) {
  return path.join(directory, identity(identityFields) + ".json");
}

export function pendingConditionPath(directory, identityFields) {
  return path.join(directory, "pending", identity(identityFields) + ".json");
}

// An unresolved combination is a reusable search hint, never an approved
// rule. It contains no charge and can only be applied after live rechecking.
export function loadPendingConditionInvestigation(directory, candidate) {
  const filename = pendingConditionPath(directory, candidate);
  if (!fs.existsSync(filename)) return null;
  try {
    const record = JSON.parse(fs.readFileSync(filename, "utf8"));
    if (record.schemaVersion !== 1 || record.status !== "NEEDS_PROOF" ||
        record.identity !== identity(candidate) ||
        !Array.isArray(record.proposedCombinations) ||
        !Array.isArray(record.officialSourceUrls) ||
        record.officialSourceUrls.length > 4 ||
        !record.officialSourceUrls.every(canonicalUrl)) return null;
    return { proposedCombinations: record.proposedCombinations.slice(0, 8)
      .filter((item) => Array.isArray(item) && item.length <= 3 &&
        item.every((field) => DIMENSIONS.includes(field) || /^extra:[^:]{1,80}$/.test(field))),
      officialSourceUrls: record.officialSourceUrls,
      observedAt: record.observedAt };
  } catch { return null; }
}

export function savePendingConditionInvestigation(directory, candidate, analysis, {
  now = Date.now(),
} = {}) {
  if (!FIELDS.has(candidate?.field) || !candidate?.variantId ||
      !analysis?.officialSourceUrls?.length ||
      !analysis.officialSourceUrls.every(canonicalUrl) ||
      !Array.isArray(analysis.proposedCombinations) ||
      !Number.isFinite(now)) return false;
  const filename = pendingConditionPath(directory, candidate);
  const record = { schemaVersion: 1, status: "NEEDS_PROOF",
    identity: identity(candidate), observedAt: new Date(now).toISOString(),
    officialSourceUrls: analysis.officialSourceUrls.slice(0, 4),
    proposedCombinations: analysis.proposedCombinations.slice(0, 8),
    newConditionCandidates: (analysis.newConditionCandidates || []).slice(0, 4),
    missingIndependentConditions: (analysis.missingIndependentConditions || []).slice(0, 12),
    missingStructuredConditions: (analysis.missingStructuredConditions || []).slice(0, 12),
    // Store neither amounts nor a claim that an unresolved offer is active.
  };
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = filename + "." + crypto.randomBytes(6).toString("hex") + ".tmp";
  try {
    fs.writeFileSync(temporary, JSON.stringify(record, null, 2) + "\n",
      { flag: "wx", mode: 0o600 });
    fs.renameSync(temporary, filename);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  return true;
}

export function loadSolvedConditionRule(directory, candidate) {
  const filename = conditionRulePath(directory, candidate);
  if (!fs.existsSync(filename)) return null;
  let rule;
  try { rule = JSON.parse(fs.readFileSync(filename, "utf8")); } catch { return null; }
  if (rule?.schemaVersion !== 1 || rule.status !== "SOLVED" ||
      rule.identity !== identity(candidate) || rule.field !== candidate.field ||
      rule.holdReason !== candidate.holdReason ||
      canonicalUrl(rule.url) !== canonicalUrl(candidate.url) ||
      rule.variantId !== candidate.variantId ||
      !DIMENSIONS.every((key) => typeof rule.scope?.[key] === "string" && rule.scope[key]) ||
      !Array.isArray(rule.sourceUrls) || rule.sourceUrls.length < 1 ||
      rule.sourceUrls.length > 4 || !rule.sourceUrls.every(canonicalUrl) ||
      !Array.isArray(rule.discriminators) || !rule.discriminators.length ||
      !rule.discriminators.every((key) => DIMENSIONS.includes(key) ||
        /^extra:[^:]{1,80}$/.test(key)) ||
      Object.keys(rule.scope).filter((key) => key.startsWith("extra:")).length > 4 ||
      Object.keys(rule.scope).filter((key) => key.startsWith("extra:"))
        .some((key) => !/^extra:[^:]{1,80}$/.test(key) ||
          typeof rule.scope[key] !== "string" || !rule.scope[key]) ||
      (rule.lessonFamily != null && !validLessonFamily(rule.lessonFamily))) return null;
  return { field: rule.field, holdReason: rule.holdReason, scope: rule.scope,
    sourceUrls: rule.sourceUrls, discriminators: rule.discriminators,
    ruleId: rule.identity, ruleOrigin: "CACHE",
    lessonFamily: rule.lessonFamily || null };
}

export function saveSolvedConditionRule(directory, candidate, proposed, {
  result, gate, fieldResolved = false, now = Date.now(),
} = {}) {
  const independentFailures = Array.isArray(gate?.failures) && gate.failures.length > 0 &&
    gate.failures.every((failure) => failure !== `VERIFICATION_HOLD:${proposed?.holdReason}` &&
      !failure.startsWith(`${proposed?.field}:`) &&
      !(failure.startsWith("UNRESOLVED_CONFLICT:") &&
        failure.slice("UNRESOLVED_CONFLICT:".length).split(",").includes(proposed?.field)));
  if (result?.status !== "VERIFIED_CURRENT_CONDITION" || !result.evidence ||
      !(gate?.decision === "PUBLISH" ||
        (fieldResolved && gate?.decision === "DO_NOT_PUBLISH" && independentFailures)) ||
      !FIELDS.has(proposed?.field) ||
      proposed.field !== candidate.field || proposed.holdReason !== candidate.holdReason ||
      !Array.isArray(proposed.discriminators) || proposed.discriminators.length < 1 ||
      !DIMENSIONS.every((key) => typeof proposed.scope?.[key] === "string" && proposed.scope[key]) ||
      proposed.discriminators.some((key) => !DIMENSIONS.includes(key) &&
        !/^extra:[^:]{1,80}$/.test(key)) ||
      proposed.discriminators.some((key) =>
        typeof proposed.scope[key] !== "string" || !proposed.scope[key]) ||
      Object.keys(proposed.scope).filter((key) => key.startsWith("extra:")).length > 4) {
    return false;
  }
  const filename = conditionRulePath(directory, candidate);
  const rule = { schemaVersion: 1, status: "SOLVED", identity: identity(candidate),
    url: candidate.url, variantId: candidate.variantId, field: candidate.field,
    holdReason: candidate.holdReason, scope: proposed.scope,
    sourceUrls: proposed.sourceUrls, discriminators: proposed.discriminators,
    ...(validLessonFamily(candidate.lessonFamily)
      ? { lessonFamily: candidate.lessonFamily } : {}),
    verifiedAt: new Date(now).toISOString(),
    // Intentionally omit the amount. Current official evidence is mandatory.
    evidenceUrl: result.evidence.sourceUrl };
  fs.mkdirSync(directory, { recursive: true });
  const temporary = filename + "." + crypto.randomBytes(6).toString("hex") + ".tmp";
  try {
    fs.writeFileSync(temporary, JSON.stringify(rule, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    fs.renameSync(temporary, filename);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return true;
}

// Reuse only the *route* and discriminating conditions of a verified result.
// A family lesson contains no reusable amount, eligibility or publication
// decision. Every page and every claim must pass the current run's validators.
export function findReusableConditionLessons(directory, {
  lessonFamily, url, variantId, field, holdReason, requiredPlan,
  independentProduct,
  allowedOrigins = [], authorityRegistry = [], targetServiceId = null,
  now = Date.now(), limit = 2,
} = {}) {
  if (!validLessonFamily(lessonFamily) || !canonicalUrl(url) ||
      !FIELDS.has(field) || !isPriceContextHold(holdReason) ||
      typeof requiredPlan !== "string" || !requiredPlan ||
      typeof independentProduct !== "string" || !independentProduct.trim() ||
      !Number.isFinite(now) || !Number.isInteger(limit) || limit < 1) return [];
  let names;
  try { names = fs.readdirSync(directory).filter((name) => /^[a-f0-9]{64}\.json$/.test(name)); }
  catch { return []; }
  // A malformed or unexpectedly large store must not turn a weekly run into
  // an unbounded search over local files.
  if (names.length > 500) return [];
  const originalOrigin = new URL(url).origin;
  const lessons = [];
  for (const name of names) {
    let item;
    try {
      const filename = path.join(directory, name);
      const stat = fs.lstatSync(filename);
      if (!stat.isFile() || stat.size > 24_000) continue;
      item = JSON.parse(fs.readFileSync(filename, "utf8"));
    } catch { continue; }
    const age = now - Date.parse(item?.verifiedAt || "");
    if (!item?.lessonFamily || !validLessonFamily(item.lessonFamily) ||
        !["sourceId", "partnerId", "serviceId"].every((key) =>
          item.lessonFamily[key] === lessonFamily[key]) ||
        item.field !== field || item.holdReason !== holdReason ||
        item.variantId === variantId ||
        !Number.isFinite(age) || age < 0 || age > LESSON_AGE) continue;
    const rule = loadSolvedConditionRule(directory, item);
    if (!rule || !rule.lessonFamily || !Array.isArray(rule.sourceUrls) ||
        !rule.sourceUrls.length || rule.scope?.product !== independentProduct) continue;
    const allowed = rule.sourceUrls.every((sourceUrl) => {
      const canonical = canonicalUrl(sourceUrl);
      if (!canonical || !allowedOrigins.includes(new URL(canonical).origin) ||
          new URL(canonical).origin !== originalOrigin) return false;
      const authority = classifySourceAuthority(sourceUrl,
        { registry: authorityRegistry, targetServiceId });
      return ["OFFICIAL_SERVICE", "OFFICIAL_PARTNER"].includes(authority.type) &&
        authority.score >= 500;
    });
    if (!allowed) continue;
    lessons.push({ lessonId: rule.ruleId, sourceUrls: rule.sourceUrls,
      preferredCombinations: [rule.discriminators], productTerm: rule.scope.product,
      verifiedAt: item.verifiedAt });
  }
  return lessons.sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt) ||
    a.lessonId.localeCompare(b.lessonId)).slice(0, Math.min(limit, 3));
}

// HTML <tr><th>조건</th><td>값</td>... pairs are explicit scope assertions.
// A prose paragraph or separate rows cannot silently fill a missing field.
function rowsFromOfficial(snapshot) {
  const $ = cheerio.load(snapshot.html || "");
  const out = [];
  const incomplete = [];
  $("tr").each((_, tr) => {
    const cells = $(tr).children("th,td").toArray();
    if (cells.length < 4 || cells.length % 2) return;
    const fields = {};
    let invalid = false;
    for (let i = 0; i < cells.length; i += 2) {
      if (cells[i].name !== "th" || cells[i + 1].name !== "td") { invalid = true; break; }
      const label = trimmed($(cells[i]).text()).replace(/\s+/g, "");
      const key = LABELS.get(label) || `extra:${label}`;
      const value = trimmed($(cells[i + 1]).text());
      if (!label || label.length > 80 || value.length > 160 ||
          Object.hasOwn(fields, key)) { invalid = true; break; }
      fields[key] = value;
    }
    if (invalid) {
      if (fields.price || /[\d,]+\s*원/.test($(tr).text())) incomplete.push(fields);
      return;
    }
    if (fields.price && (!fields.period ||
        !DIMENSIONS.every((key) => fields[key]?.length >= 2))) {
      incomplete.push(fields);
      return;
    }
    if (!fields.price) return;
    const dates = PERIOD.exec(fields.period);
    const price = AMOUNT.exec(fields.price);
    if (!dates || !price || !effectiveDate(dates[1]) || !effectiveDate(dates[2])) {
      incomplete.push(fields);
      return;
    }
    const amount = Number(price[1].replaceAll(",", ""));
    if (!Number.isSafeInteger(amount) || amount < 0) {
      incomplete.push(fields);
      return;
    }
    out.push({ fields, value: amount, sourceUrl: snapshot.url,
      evidenceText: trimmed($(tr).text()),
      valueEvidence: fields.price, periodEvidence: fields.period,
      effectiveFrom: dates[1], effectiveTo: dates[2] });
  });
  return { rows: out, incomplete };
}

function minimalCombinations(row, others, fields, prior = []) {
  const varying = fields.filter((key) => others.some((other) =>
    other.fields[key] !== row.fields[key]));
  const groups = [];
  for (let length = 1; length <= Math.min(3, varying.length); length++) {
    function visit(start, selected) {
      if (selected.length === length) {
        if (others.every((other) => selected.some((key) =>
          other.fields[key] !== row.fields[key]))) groups.push(selected);
        return;
      }
      for (let i = start; i < varying.length; i++) visit(i + 1, [...selected, varying[i]]);
    }
    visit(0, []);
    if (groups.length) break;
  }
  return groups.sort((a, b) => {
    const oldA = prior.some((keys) => JSON.stringify(keys) === JSON.stringify(a));
    const oldB = prior.some((keys) => JSON.stringify(keys) === JSON.stringify(b));
    return Number(oldB) - Number(oldA) || a.join("|").localeCompare(b.join("|"));
  }).slice(0, 8);
}

function diagnosticAnalysis({ officialSourceUrls = [], rows = [], incomplete = [],
  unstructuredPriceUrls = [],
  matches = [], relevant = [], extras = [], plans = [], anchor = {} } = {}) {
  const proposedCombinations = [...new Map(plans.flatMap((plan) =>
    plan.combinations.map((keys) => [keys.join("|"), keys]))).values()].slice(0, 8);
  const missingIndependentConditions = [...new Set(plans.flatMap((plan) =>
    plan.combinations.length ? plan.combinations[0]
      .filter((key) => !Object.hasOwn(anchor, key)) : []))];
  const missingStructuredConditions = [...new Set(incomplete.flatMap((row) =>
    [...DIMENSIONS, "period", "price"].filter((key) => !row.fields[key])) )];
  if (!rows.length) missingStructuredConditions.push("completePriceRow");
  const candidateExtras = [...new Set([...extras, ...incomplete.flatMap((row) =>
    Object.keys(row.fields).filter((key) => key.startsWith("extra:")))])];
  return { officialSourceUrls, structuredRows: rows.length,
    partialRows: incomplete.length,
    unstructuredPriceUrls,
    proposedCombinations,
    missingIndependentConditions,
    missingStructuredConditions: [...new Set(missingStructuredConditions)],
    newConditionCandidates: candidateExtras.slice(0, 4).map((key) => ({
      field: key, label: key.slice(6),
      sourceUrls: [...new Set([...relevant, ...matches, ...incomplete]
        .filter((row) => row.fields[key]).map((row) => row.sourceUrl))].slice(0, 4),
      independentValueRequired: !Object.hasOwn(anchor, key),
    })),
  };
}

export function discoverOfficialPriceConditions({
  candidate, snapshots = [], allowedOrigins = [], authorityRegistry = [],
  targetServiceId = null, now = Date.now(), previous = null,
} = {}) {
  const blocked = (reason) => ({ status: reason, target: null, result: null,
    discriminators: [], checkedRows: 0, analysis: null });
  if (!FIELDS.has(candidate?.field) ||
      !/^[A-Z][A-Z0-9_]{4,100}$/.test(candidate?.holdReason || "") ||
      !candidate?.variantId || !candidate?.anchor?.plan || !candidate?.url) {
    return blocked("INDEPENDENT_TARGET_MISSING");
  }
  const urls = [...new Set(candidate.sourceUrls || [candidate.url])];
  if (!urls.length || urls.length > 4) return blocked("SOURCE_BOUNDARY_UNVERIFIED");
  const rows = [];
  const incomplete = [];
  const verifiedSourceUrls = [];
  const unstructuredPriceUrls = [];
  const rowSourceUrls = [];
  for (const url of urls) {
    const canonical = canonicalUrl(url);
    const authority = classifySourceAuthority(url, {
      registry: authorityRegistry, targetServiceId,
    });
    if (!canonical || !allowedOrigins.includes(new URL(canonical).origin) ||
        !["OFFICIAL_SERVICE", "OFFICIAL_PARTNER"].includes(authority.type) ||
        authority.score < 500) return blocked("SOURCE_BOUNDARY_UNVERIFIED");
    const page = snapshots.find((item) => canonicalUrl(item.url) === canonical);
    const age = now - Date.parse(page?.observedAt || "");
    if (!page?.ok || canonicalUrl(page.finalUrl || page.url) !== canonical ||
        !Number.isFinite(age) || age < 0 || age > MAX_AGE) return blocked("SOURCE_NOT_CURRENT");
    const parsed = rowsFromOfficial(page);
    verifiedSourceUrls.push(canonical);
    if (parsed.rows.length) rowSourceUrls.push(canonical);
    if (!parsed.rows.length && !parsed.incomplete.length &&
        /(?:₩|KRW\s*)[\d,]+|[\d,]+\s*원/i.test(page.text || page.html || "")) {
      unstructuredPriceUrls.push(canonical);
    }
    rows.push(...parsed.rows);
    incomplete.push(...parsed.incomplete.map((fields) => ({ fields, sourceUrl: url })));
  }
  const diagnostics = (details = {}) => diagnosticAnalysis({
    officialSourceUrls: verifiedSourceUrls, rows, incomplete, unstructuredPriceUrls,
    anchor: candidate.anchor, ...details,
  });
  if (!rows.length) return { ...blocked("NO_COMPLETE_OFFICIAL_ROWS"),
    analysis: diagnostics() };
  if (rows.length > 4) return { ...blocked("TOO_MANY_PRICE_ROWS"),
    analysis: diagnostics() };
  const planMatches = rows.filter((row) => row.fields.plan === candidate.anchor.plan);
  if (!planMatches.length) return { ...blocked("TARGET_PLAN_NOT_IN_ROWS"),
    analysis: diagnostics() };
  const matches = planMatches.filter((row) => !candidate.anchor.product ||
    row.fields.product === candidate.anchor.product);
  if (!matches.length) return { ...blocked("TARGET_PRODUCT_MISMATCH"),
    analysis: diagnostics({ matches: planMatches }) };
  if (!candidate.anchor.product && new Set(matches.map((row) => row.fields.product)).size > 1) {
    return { ...blocked("INDEPENDENT_PRODUCT_NEEDED"),
      analysis: diagnostics({ matches }) };
  }
  const first = matches[0];
  if (unstructuredPriceUrls.length) return {
    ...blocked("UNSCOPED_COMPETING_PRICE_PAGE"),
    analysis: diagnostics({ matches }) };
  if (incomplete.some((row) => row.fields.product === first.fields.product ||
      row.fields.plan === candidate.anchor.plan)) {
    return { ...blocked("INCOMPLETE_COMPETING_ROW"),
      analysis: diagnostics({ matches }) };
  }
  const relevant = rows.filter((row) => row.fields.product === first.fields.product);
  const today = new Date(now + 9 * 3600_000).toISOString().slice(0, 10);
  if (!relevant.every((row) => row.effectiveFrom <= today && row.effectiveTo >= today)) {
    return { ...blocked("CURRENT_PERIOD_UNVERIFIED"),
      analysis: diagnostics({ matches, relevant }) };
  }
  const extras = new Set(relevant.flatMap((row) =>
    Object.keys(row.fields).filter((key) => key.startsWith("extra:"))));
  if (relevant.some((row) => [...extras].some((key) => !row.fields[key]))) {
    return { ...blocked("UNMAPPED_CONDITION"),
      analysis: diagnostics({ matches, relevant, extras: [...extras] }) };
  }
  const fields = [...DIMENSIONS, ...extras];
  const contexts = new Map();
  for (const row of relevant) {
    const signature = JSON.stringify(fields.map((key) => row.fields[key]));
    if (!contexts.has(signature)) contexts.set(signature, []);
    contexts.get(signature).push(row);
  }
  if ([...contexts.values()].some((group) =>
    group.some((row) => row.value !== group[0].value))) {
    return { ...blocked("SAME_CONTEXT_CONFLICT"), checkedRows: relevant.length,
      analysis: diagnostics({ matches, relevant, extras: [...extras] }) };
  }
  const uniqueRows = [...contexts.values()].map((group) => group[0]);
  const plans = uniqueRows.filter((row) => row.fields.plan === candidate.anchor.plan)
    .map((row) => ({ row,
    combinations: uniqueRows.length === 1 ? [["plan"]]
      : minimalCombinations(row, uniqueRows.filter((item) => item !== row),
        fields, previous?.proposedCombinations || []),
  }));
  const analysis = diagnostics({ matches, relevant, extras: [...extras], plans });
  if (plans.some((item) => !item.combinations.length)) {
    return { ...blocked("SAME_CONTEXT_CONFLICT"), checkedRows: relevant.length,
      analysis };
  }
  const selections = plans.flatMap((item) => item.combinations
    .filter((keys) => keys.every((key) =>
      Object.hasOwn(candidate.anchor, key) &&
      item.row.fields[key] === candidate.anchor[key]))
    .map((keys) => ({ row: item.row, keys })));
  const selectedRows = [...new Set(selections.map((item) => item.row))];
  if (selectedRows.length > 1) return { ...blocked("TARGET_VARIANT_AMBIGUOUS"),
    checkedRows: relevant.length, analysis };
  if (!selectedRows.length) {
    const partial = plans.some((item) => item.combinations.some((keys) =>
      keys.every((key) => !Object.hasOwn(candidate.anchor, key) ||
        item.row.fields[key] === candidate.anchor[key])));
    const reason = partial ? matches.length > 1 ? "TARGET_VARIANT_AMBIGUOUS"
      : "INDEPENDENT_CONDITION_NEEDED" : "TARGET_CONDITION_MISMATCH";
    return { ...blocked(reason), discriminators: analysis.proposedCombinations[0] || [],
      checkedRows: relevant.length, analysis };
  }
  const selectedRow = selectedRows[0];
  const discriminators = selections.find((item) => item.row === selectedRow).keys;
  const scope = Object.fromEntries(fields.map((key) => [key, selectedRow.fields[key]]));
  const review = { field: candidate.field, holdReason: candidate.holdReason,
    target: { scope }, quotes: relevant.map((row) => ({
      sourceUrl: row.sourceUrl, scope: Object.fromEntries(fields.map((key) =>
        [key, row.fields[key]])), evidence: Object.fromEntries(DIMENSIONS.map((key) =>
        [key, row.fields[key]]).concat([...extras].map((key) =>
          [key, row.fields[key]]))), value: row.value, valueEvidence: row.valueEvidence,
      periodEvidence: row.periodEvidence, effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
    })) };
  const result = assessOfficialConditionReview(review, {
    now, snapshots, allowedOrigins, authorityRegistry, targetServiceId,
  });
  return { status: result.status, target: {
    field: candidate.field, holdReason: candidate.holdReason, scope,
    sourceUrls: rowSourceUrls, discriminators,
  }, result: { ...result, review }, discriminators, checkedRows: relevant.length,
  analysis };
}
