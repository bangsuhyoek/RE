import {
  CancellationSupport,
  isAllowedCancellationUrl,
  resolveCancellationGuide,
} from "./cancellationGuideRegistry.js";

export const CancellationGuideStatus = Object.freeze({
  SUPPORTED: "SUPPORTED",
  DEFERRED: "DEFERRED",
  UNKNOWN: "UNKNOWN",
});

export function prepareCancellationGuide(subscription = {}) {
  const resolution = resolveCancellationGuide(subscription);
  const guide = resolution.guide;

  if (!guide) {
    return {
      status: CancellationGuideStatus.UNKNOWN,
      supported: false,
      reason: resolution.reason,
      guide: null,
      cancelUrl: "",
      guideSteps: [],
      nativePayload: null,
    };
  }

  if (guide.support !== CancellationSupport.SUPPORTED) {
    return {
      status: CancellationGuideStatus.DEFERRED,
      supported: false,
      reason: guide.supportReason,
      guide,
      cancelUrl: "",
      guideSteps: [],
      nativePayload: null,
    };
  }

  return {
    status: CancellationGuideStatus.SUPPORTED,
    supported: true,
    reason: guide.supportReason,
    guide,
    cancelUrl: guide.entryUrl,
    guideSteps: guide.steps,
    nativePayload: {
      serviceId: guide.serviceId,
      serviceName: guide.serviceName,
      cancelUrl: guide.entryUrl,
      guideSteps: guide.steps,
      allowedDomains: guide.allowedDomains,
      guideMode: guide.guideMode,
      officialSourceUrl: guide.officialSourceUrl,
      fallbackOfficialUrl: guide.fallbackOfficialUrl,
    },
  };
}

export function isCancellationNavigationAllowed(subscription = {}, url = "") {
  const prepared = prepareCancellationGuide(subscription);
  if (!prepared.supported || !prepared.guide) return false;
  return isAllowedCancellationUrl(prepared.guide, url);
}

export function cancellationGuideAllowsAutoTargeting(subscription = {}) {
  const prepared = prepareCancellationGuide(subscription);
  return Boolean(
    prepared.supported &&
      prepared.guide?.guideMode === "AUTO_SEMANTIC" &&
      prepared.guide?.targetMatchers?.length
  );
}
