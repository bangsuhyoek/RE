import path from "node:path";
import {
  auditGoldSetCurrency,
  evaluateGoldSet,
  loadGoldSet,
} from "./qualityMetrics.js";

// An active run must check the independent reference set before the first
// publishable offer is written. A failed check leaves every offer in Shadow.
export function assessActivePublicationReadiness({
  goldSetPath,
  qualitySamples = [],
  now = Date.now(),
  priorErrors = [],
  minimumCases = 52,
} = {}) {
  const reasons = [];
  let goldAudit = null;
  let metrics = null;
  let goldSet = null;

  if (!goldSetPath) {
    reasons.push("INDEPENDENT_GOLD_SET_NOT_CONFIGURED");
  } else {
    try {
      goldSet = loadGoldSet(path.resolve(goldSetPath));
      if (!goldSet || goldSet.length < minimumCases) {
        reasons.push("INDEPENDENT_GOLD_SET_INCOMPLETE");
      } else {
        goldAudit = auditGoldSetCurrency(goldSet, { now });
        metrics = evaluateGoldSet(goldSet, qualitySamples);
        if (goldAudit.status !== "CURRENT") reasons.push("GOLD_SET_REQUIRES_ADJUDICATION");
        if (metrics.details.matched !== goldSet.length ||
            metrics.details.ambiguousMatches !== 0) {
          reasons.push("GOLD_IDENTITIES_NOT_ALL_MATCHED");
        }
        if (metrics.details.misses.length > 0 || metrics.details.falsePublish > 0) {
          reasons.push("GOLD_EXPECTATIONS_MISMATCH");
        }
        if (qualitySamples.filter((item) => item.decision === "PUBLISH").length !==
            metrics.details.actualPublish) {
          reasons.push("PUBLISHABLE_OFFER_OUTSIDE_GOLD_SET");
        }
        if (metrics.details.actualPublish === 0) reasons.push("NO_VERIFIED_PUBLISHABLE_OFFERS");
      }
    } catch {
      // Parse failures and inaccessible paths must not turn into permission to publish.
      reasons.push("INDEPENDENT_GOLD_SET_UNREADABLE");
    }
  }

  if (priorErrors.length > 0) reasons.push("PIPELINE_ERRORS_BEFORE_PUBLICATION");
  return {
    allowed: reasons.length === 0,
    reasons,
    goldAudit,
    goldSetSize: goldSet?.length ?? 0,
    evaluatedPublishCount: metrics?.details?.actualPublish ?? 0,
    goldMissCount: metrics?.details?.misses?.length ?? null,
  };
}

export function persistenceModeForRun(mode, readiness) {
  return mode === "active" && readiness?.allowed === true ? "active" : "shadow";
}
