import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const goldPath = path.resolve(
  process.cwd(),
  process.env.BENEFIT_GOLD_SET_PATH || "tests/benefit-v2-expanded-live-gold.json"
);
const outputPath = path.resolve(
  process.cwd(),
  process.env.BENEFIT_GOLD_AUDIT_OUTPUT ||
    "outputs/benefit-v2/gold-evidence-audit.json"
);

function normalize(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

async function fetchOfficialText(url, {
  timeoutMs = 15000,
  maxBytes = 2_000_000,
} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "KkudokGoldEvidenceAudit/1.0",
      },
    });
    const html = await response.text();
    if (Buffer.byteLength(html, "utf8") > maxBytes) {
      throw new Error("SOURCE_TOO_LARGE");
    }
    const $ = cheerio.load(html || "");
    return {
      ok: response.ok,
      httpStatus: response.status,
      finalUrl: response.url || url,
      text: normalize([
        $("title").first().text(),
        $("body").text(),
      ].filter(Boolean).join(" ")),
    };
  } finally {
    clearTimeout(timer);
  }
}

const gold = JSON.parse(await fs.readFile(goldPath, "utf8"));
const cache = new Map();
const cases = [];

for (const item of gold) {
  const evidenceUrl = item.evidenceUrl || item.officialEvidenceUrl || null;
  if (!evidenceUrl) {
    cases.push({
      id: item.id || null,
      ok: false,
      reason: "EVIDENCE_URL_MISSING",
      evidenceUrl: null,
      missingTerms: item.evidenceTerms || [],
    });
    continue;
  }

  let page = cache.get(evidenceUrl);
  if (!page) {
    try {
      page = await fetchOfficialText(evidenceUrl);
    } catch (error) {
      page = {
        ok: false,
        httpStatus: null,
        finalUrl: evidenceUrl,
        text: "",
        error: error?.name === "AbortError" ? "SOURCE_TIMEOUT" : error.message,
      };
    }
    cache.set(evidenceUrl, page);
  }

  const haystack = page.text.toLowerCase();
  const evidenceTerms = Array.isArray(item.evidenceTerms)
    ? item.evidenceTerms.filter(Boolean)
    : [];
  const missingTerms = evidenceTerms.filter(
    (term) => !haystack.includes(String(term).toLowerCase())
  );

  cases.push({
    id: item.id || null,
    ok: page.ok && missingTerms.length === 0,
    evidenceUrl,
    finalUrl: page.finalUrl,
    httpStatus: page.httpStatus,
    evidenceTerms,
    missingTerms,
    fetchError: page.error || null,
  });
}

const report = {
  auditedAt: new Date().toISOString(),
  goldSetPath: goldPath,
  goldCount: gold.length,
  uniqueEvidenceUrls: cache.size,
  evidencePass: cases.filter((item) => item.ok).length,
  evidenceFail: cases.filter((item) => !item.ok).length,
  cases,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));

if (report.evidenceFail > 0) process.exitCode = 2;
