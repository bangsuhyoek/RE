import fs from "node:fs";
import path from "node:path";
import { fetchSourceSnapshot } from "./sourceFetcher.js";

const OFFICIAL_HOST_SUFFIXES = [
  "naver.com",
  "spotify.com",
  "disneyplus.com",
  "tworld.co.kr",
  "lguplus.com",
  "kt.com",
  "apple.com",
];

function isOfficialEvidenceUrl(value = "") {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return OFFICIAL_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith("." + suffix)
    );
  } catch {
    return false;
  }
}

export async function verifyGoldEvidence(
  goldSet,
  { fetchImpl = globalThis.fetch } = {}
) {
  const cache = new Map();
  const results = [];
  for (const item of goldSet || []) {
    const evidenceUrl = item.evidenceUrl || item.officialEvidenceUrl || item.evidence_url;
    const terms = Array.isArray(item.evidenceTerms) ? item.evidenceTerms.filter(Boolean) : [];
    if (!evidenceUrl || !isOfficialEvidenceUrl(evidenceUrl)) {
      results.push({
        id: item.id || null,
        evidenceUrl: evidenceUrl || null,
        ok: false,
        reason: "UNAPPROVED_OR_MISSING_OFFICIAL_EVIDENCE_URL",
        missingTerms: terms,
      });
      continue;
    }
    let snapshot = cache.get(evidenceUrl);
    if (!snapshot) {
      snapshot = await fetchSourceSnapshot(evidenceUrl, { fetchImpl });
      cache.set(evidenceUrl, snapshot);
    }
    if (!snapshot.ok) {
      results.push({
        id: item.id || null,
        evidenceUrl,
        ok: false,
        reason: snapshot.reason || "FETCH_FAILED",
        missingTerms: terms,
      });
      continue;
    }
    const text = `${snapshot.title || ""} ${snapshot.text || ""}`.toLowerCase();
    const missingTerms = terms.filter(
      (term) => !text.includes(String(term).toLowerCase())
    );
    results.push({
      id: item.id || null,
      evidenceUrl,
      finalUrl: snapshot.finalUrl || evidenceUrl,
      ok: missingTerms.length === 0,
      reason: missingTerms.length ? "EVIDENCE_TERM_MISSING" : null,
      missingTerms,
    });
  }
  return {
    total: results.length,
    verified: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    uniqueEvidenceUrls: new Set(
      results.map((item) => item.evidenceUrl).filter(Boolean)
    ).size,
    results,
  };
}

async function main() {
  const goldPath = path.resolve(
    process.cwd(),
    process.argv[2] || "tests/benefit-v2-expanded-live-gold.json"
  );
  const raw = fs.readFileSync(goldPath, "utf8").replace(/^\uFEFF/, "");
  const goldSet = JSON.parse(raw);
  const report = await verifyGoldEvidence(goldSet);
  const outPath = path.resolve(
    process.cwd(),
    "outputs/benefit-v2/expanded-gold-evidence-verification.json"
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({
    total: report.total,
    verified: report.verified,
    failed: report.failed,
    uniqueEvidenceUrls: report.uniqueEvidenceUrls,
    failures: report.results.filter((item) => !item.ok),
    output: outPath,
  }, null, 2));
  if (report.failed > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === new URL("file:" + process.argv[1].replace(/\\/g, "/")).href) {
  await main();
}
