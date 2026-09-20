import {
  BenefitFetchStatus,
  BenefitLoadState,
  benefitFetchFailure,
} from "./fetchState.js";
import { buildRecommendationViewModels } from "../presentation/recommendationViewModel.js";

async function safelyFetch(fetcher, sourceName) {
  if (typeof fetcher !== "function") return null;
  try {
    const result = await fetcher();
    if (!result || !Object.values(BenefitFetchStatus).includes(result.status)) {
      return benefitFetchFailure(
        new Error(`Invalid ${sourceName} fetch result`),
        sourceName
      );
    }
    return result;
  } catch (error) {
    return benefitFetchFailure(error, sourceName);
  }
}

export async function loadBenefitRecommendations({
  subscriptions = [],
  userContext = {},
  legacyFetcher = null,
  v7Fetcher = null,
} = {}) {
  const [legacyResult, v7Result] = await Promise.all([
    safelyFetch(legacyFetcher, "legacy-benefits"),
    safelyFetch(v7Fetcher, "v7-public-offers"),
  ]);

  const attempted = [legacyResult, v7Result].filter(Boolean);
  if (attempted.length === 0) {
    return {
      recommendations: [],
      legacyBenefits: [],
      v7Offers: [],
      loadState: BenefitLoadState.FETCH_FAILED,
      error: new Error("No benefit source is configured"),
      partial: false,
      sourceStates: {},
      source: "unconfigured",
    };
  }

  const failures = attempted.filter(
    (result) => result.status === BenefitFetchStatus.FETCH_FAILED
  );
  const legacyBenefits =
    legacyResult?.status === BenefitFetchStatus.SUCCESS
      ? legacyResult.items
      : [];
  const v7Offers =
    v7Result?.status === BenefitFetchStatus.SUCCESS
      ? v7Result.items
      : [];

  const recommendations = buildRecommendationViewModels({
    subscriptions,
    legacyBenefits,
    v7Offers,
    userContext,
  });

  let loadState;
  if (recommendations.length > 0) {
    loadState = BenefitLoadState.SUCCESS;
  } else if (failures.length > 0) {
    loadState = BenefitLoadState.FETCH_FAILED;
  } else {
    loadState = BenefitLoadState.SUCCESS_EMPTY;
  }

  const sourceStates = {};
  if (legacyResult) sourceStates.legacy = legacyResult.status;
  if (v7Result) sourceStates.v7 = v7Result.status;

  return {
    recommendations,
    legacyBenefits,
    v7Offers,
    loadState,
    error: failures[0]?.error || null,
    partial: failures.length > 0 && recommendations.length > 0,
    sourceStates,
    source:
      legacyResult && v7Result
        ? "hybrid"
        : v7Result
          ? (v7Result.source || "v7")
          : (legacyResult?.source || "legacy"),
  };
}
