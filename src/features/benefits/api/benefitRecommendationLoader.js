import {
  BenefitFetchStatus,
  BenefitLoadState,
  benefitFetchFailure,
} from "./fetchState.js";
import { buildRecommendationViewModels } from "../presentation/recommendationViewModel.js";
import { selectStagedV2Offers } from "./stagedV2Routing.js";

async function safelyFetch(fetcher, sourceName) {
  if (typeof fetcher !== "function") return null;
  try {
    const result = await fetcher();
    if (!result || !Object.values(BenefitFetchStatus).includes(result.status)) {
      return benefitFetchFailure(
        new Error(`Invalid ${sourceName} fetch result`), sourceName
      );
    }
    if (result.status === BenefitFetchStatus.SUCCESS && !Array.isArray(result.items)) {
      return benefitFetchFailure(
        new Error(`Invalid ${sourceName} items`), sourceName
      );
    }
    return result;
  } catch (error) {
    return benefitFetchFailure(error, sourceName);
  }
}

async function safelyReadFlag(fetcher) {
  if (typeof fetcher !== "function") {
    return { activeVersion: "v1", shadowMode: true, source: "default" };
  }
  try {
    const value = await fetcher();
    return {
      activeVersion: value?.activeVersion === "v2" ? "v2" : "v1",
      shadowMode: value?.shadowMode !== false,
      source: value?.source || "unknown",
    };
  } catch {
    return { activeVersion: "v1", shadowMode: true, source: "fallback" };
  }
}

export async function loadBenefitRecommendations({
  subscriptions = [],
  userContext = {},
  legacyFetcher = null,
  v7Fetcher = null,
  v2Fetcher = null,
  pipelineFlagFetcher = null,
  stagedV2Routes = [],
  activeV2Routes = [],
} = {}) {
  const pipelineFlag = await safelyReadFlag(pipelineFlagFetcher);
  const [legacyResult, v7Result] = await Promise.all([
    safelyFetch(legacyFetcher, "legacy-benefits"),
    safelyFetch(v7Fetcher, "v7-public-offers"),
  ]);
  const attempted = [legacyResult, v7Result].filter(Boolean);
  if (attempted.length === 0) {
    return {
      recommendations: [], legacyBenefits: [], v7Offers: [], v2Offers: [],
      loadState: BenefitLoadState.FETCH_FAILED,
      error: new Error("No baseline benefit source is configured"),
      partial: false, sourceStates: {}, source: "unconfigured", pipelineFlag,
    };
  }

  const failures = attempted.filter((result) => result.status === BenefitFetchStatus.FETCH_FAILED);
  const baselineLegacy = legacyResult?.status === BenefitFetchStatus.SUCCESS ? legacyResult.items : [];
  const baselineV7 = v7Result?.status === BenefitFetchStatus.SUCCESS ? v7Result.items : [];
  const stageRequested = Array.isArray(stagedV2Routes) && stagedV2Routes.length > 0 &&
    pipelineFlag.source === "database" && pipelineFlag.activeVersion === "v1" &&
    pipelineFlag.shadowMode === true;
  const activeRequested = Array.isArray(activeV2Routes) && activeV2Routes.length > 0 &&
    pipelineFlag.source === "database" && pipelineFlag.activeVersion === "v2" &&
    pipelineFlag.shadowMode === false;
  const v2Requested = stageRequested || activeRequested;
  const v2Result = v2Requested && typeof v2Fetcher === "function"
    ? await safelyFetch(v2Fetcher, "benefit-v2-public-offers")
    : null;
  // Only the public projection is eligible. A raw SHADOW_READY fixture or an
  // unavailable baseline cannot displace currently displayed benefits.
  const staged = failures.length === 0 &&
    v2Result?.status === BenefitFetchStatus.SUCCESS &&
    v2Result.source === "benefit_v2_public_offers"
    ? selectStagedV2Offers({
        routes: activeRequested ? activeV2Routes : stagedV2Routes,
        legacyBenefits: baselineLegacy,
        v7Offers: baselineV7,
        v2Offers: v2Result.items,
        subscriptions,
        userContext,
      })
    : { legacyBenefits: baselineLegacy, v7Offers: baselineV7, v2Offers: [], stagedCount: 0 };

  const recommendations = buildRecommendationViewModels({
    subscriptions,
    legacyBenefits: staged.legacyBenefits,
    v7Offers: staged.v7Offers,
    v2Offers: staged.v2Offers,
    userContext,
  });
  const stageFailure = v2Result?.status === BenefitFetchStatus.FETCH_FAILED ? v2Result : null;
  if (stageFailure) failures.push(stageFailure);
  const sourceStates = {};
  if (legacyResult) sourceStates.legacy = legacyResult.status;
  if (v7Result) sourceStates.v7 = v7Result.status;
  if (v2Result) sourceStates.v2 = v2Result.status;

  return {
    recommendations,
    legacyBenefits: staged.legacyBenefits,
    v7Offers: staged.v7Offers,
    v2Offers: staged.v2Offers,
    loadState: recommendations.length
      ? BenefitLoadState.SUCCESS
      : failures.length
        ? BenefitLoadState.FETCH_FAILED
        : BenefitLoadState.SUCCESS_EMPTY,
    error: failures[0]?.error || null,
    partial: failures.length > 0 && recommendations.length > 0,
    sourceStates,
    source: staged.stagedCount > 0
      ? activeRequested ? "active-v2" : "staged-v2"
      : legacyResult && v7Result
        ? "hybrid"
        : v7Result
          ? (v7Result.source || "v7")
          : (legacyResult?.source || "legacy"),
    pipelineFlag,
  };
}
