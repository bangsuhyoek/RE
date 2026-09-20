export const BenefitFetchStatus = Object.freeze({
  SUCCESS: "SUCCESS",
  FETCH_FAILED: "FETCH_FAILED",
});

export const BenefitLoadState = Object.freeze({
  IDLE: "IDLE",
  LOADING: "LOADING",
  SUCCESS: "SUCCESS",
  SUCCESS_EMPTY: "SUCCESS_EMPTY",
  FETCH_FAILED: "FETCH_FAILED",
});

export function benefitFetchSuccess(items = [], source = "unknown") {
  return {
    status: BenefitFetchStatus.SUCCESS,
    items: Array.isArray(items) ? items : [],
    source,
    error: null,
  };
}

export function benefitFetchFailure(error, source = "unknown") {
  return {
    status: BenefitFetchStatus.FETCH_FAILED,
    items: [],
    source,
    error: error || new Error("Benefit source unavailable"),
  };
}

export function classifyBenefitFetchResult(result) {
  if (result?.status === BenefitFetchStatus.FETCH_FAILED) {
    return BenefitLoadState.FETCH_FAILED;
  }
  return Array.isArray(result?.items) && result.items.length > 0
    ? BenefitLoadState.SUCCESS
    : BenefitLoadState.SUCCESS_EMPTY;
}
