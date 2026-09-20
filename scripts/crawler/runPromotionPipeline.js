import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getOfficialBenefitSources } from "./officialBenefitSources.js";
import {
  discoverOfficialBenefits,
  rediscoverCampaign,
} from "./promotionDiscovery.js";
import { validatePromotion } from "./promotionValidator.js";
import { reconcileCatalog } from "./reconcileCatalog.js";
import {
  createBenefitAdminClient,
  expirePastBenefits,
  loadPreviousBenefitState,
  loadTrackedBenefitCandidates,
  publishBenefitOutcomes,
} from "./benefitStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICES_FILE = path.resolve(
  __dirname,
  "../../public/catalog/services.json"
);
const REPORT_DIR = path.resolve(__dirname, "../../outputs/benefit-crawler");
const REPORT_FILE = path.join(REPORT_DIR, "latest-report.json");

function byId(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}
function mergeTrackedWithDiscovery(tracked, discovered) {
  const discoveredById = byId(discovered);
  const merged = [...discovered];

  for (const previous of tracked) {
    if (discoveredById.has(previous.id)) continue;
    const replacement = rediscoverCampaign(previous, discovered);
    if (replacement) {
      merged.push({
        ...replacement,
        id: previous.id,
        campaignFingerprint:
          previous.campaignFingerprint || replacement.campaignFingerprint,
        discoveredAt: previous.discoveredAt || replacement.discoveredAt,
      });
    } else {
      merged.push(previous);
    }
  }

  return [...byId(merged).values()];
}

function previousCatalogState(tracked = []) {
  return {
    active: tracked
      .filter((item) => item.previousStatus === "ACTIVE")
      .map((item) => ({ ...item, status: "ACTIVE" })),
    review: tracked
      .filter((item) => item.previousStatus === "SUSPICIOUS")
      .map((item) => ({ ...item, status: "SUSPICIOUS" })),
    archive: [],
  };
}
export async function runBenefitPromotionPipeline({
  fetchImpl = globalThis.fetch,
  env = process.env,
  now = Date.now(),
} = {}) {
  const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf8"));
  const sources = getOfficialBenefitSources(env);
  const client = createBenefitAdminClient(env);

  const previousById = client
    ? await loadPreviousBenefitState(client)
    : new Map();
  const tracked = client
    ? await loadTrackedBenefitCandidates(client)
    : [];

  const discovery = await discoverOfficialBenefits({
    sources,
    services,
    fetchImpl,
    now,
  });

  const candidates = mergeTrackedWithDiscovery(
    tracked,
    discovery.candidates
  );
  const outcomes = [];

  for (const candidate of candidates) {
    const previous = previousById.get(candidate.id) || null;
    const result = await validatePromotion(candidate, {
      previous,
      now,
      fetchImpl,
    });
    outcomes.push({ candidate, promotion: candidate, result });
  }
  const reconciled = reconcileCatalog(
    previousCatalogState(tracked),
    outcomes
  );

  const expiration = await expirePastBenefits(client, now);
  const publication = await publishBenefitOutcomes(
    client,
    outcomes.map(({ candidate, result }) => ({ candidate, result }))
  );

  const counts = outcomes.reduce(
    (acc, outcome) => {
      acc[outcome.result.status] =
        (acc[outcome.result.status] || 0) + 1;
      return acc;
    },
    { ACTIVE: 0, EXPIRED: 0, SUSPICIOUS: 0 }
  );

  const report = {
    executedAt: new Date(now).toISOString(),
    sourceCount: sources.length,
    discoveredCount: discovery.candidates.length,
    trackedCount: tracked.length,
    candidateCount: candidates.length,
    counts,
    discoveryFailures: discovery.failures,
    publication,
    expiration,
    publicationGuard: reconciled.publication,
    outcomes: outcomes.map(({ candidate, result }) => ({
      id: candidate.id,
      partnerId: candidate.partnerId,
      targetServiceIds: candidate.targetServiceIds,
      sourceUrl: candidate.sourceUrl || candidate.url,
      status: result.status,
      reason: result.reason,
      checkedAt: result.checkedAt,
    })),
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(
    REPORT_FILE,
    JSON.stringify(report, null, 2),
    "utf8"
  );

  return report;
}

if (
  process.argv[1] &&
  process.argv[1].endsWith("runPromotionPipeline.js")
) {
  runBenefitPromotionPipeline()
    .then((report) => {
      console.log(
        `[BenefitPipeline] discovered=${report.discoveredCount}, active=${report.counts.ACTIVE}, suspicious=${report.counts.SUSPICIOUS}, expired=${report.counts.EXPIRED}`
      );
      if (!report.publication.published) {
        console.warn(
          `[BenefitPipeline] Supabase publish skipped: ${report.publication.reason}`
        );
      }
    })
    .catch((error) => {
      console.error("[BenefitPipeline] Fatal:", error);
      process.exitCode = 1;
    });
}
