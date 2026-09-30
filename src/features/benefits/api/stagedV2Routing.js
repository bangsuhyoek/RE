import {
  buildV2RecommendationViewModel,
  RecommendationDisplayStatus,
  RecommendationTrustStatus,
} from "../presentation/recommendationViewModel.js";
import { V2Eligibility } from "../domain/v2OfferEvaluation.js";

function validString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validIds(value) {
  return Array.isArray(value) && value.every(validString) &&
    new Set(value).size === value.length;
}

function validRoute(route) {
  return route && validString(route.offerId) && validString(route.offerVersion) &&
    validString(route.serviceId) && validString(route.targetPlan) &&
    /^https:\/\//i.test(route.evidenceUrl || "") &&
    validIds(route.legacyBenefitIds) && validIds(route.v7OfferIds) &&
    (route.mode === "ADD_WHEN_NO_BASELINE"
      ? route.legacyBenefitIds.length + route.v7OfferIds.length === 0
      : route.mode === "REPLACE_EXACT" &&
        route.legacyBenefitIds.length + route.v7OfferIds.length > 0);
}

function validateRoutes(routes) {
  if (!Array.isArray(routes) || routes.length > 20 || !routes.every(validRoute)) {
    return false;
  }
  const identities = new Set();
  const replaced = new Set();
  for (const route of routes) {
    const identity = `${route.offerId}\u0000${route.offerVersion}`;
    if (identities.has(identity)) return false;
    identities.add(identity);
    for (const id of route.legacyBenefitIds.map((value) => `legacy:${value}`)
      .concat(route.v7OfferIds.map((value) => `v7:${value}`))) {
      if (replaced.has(id)) return false;
      replaced.add(id);
    }
  }
  return true;
}

export function readPreviewStagedV2Routes(env = {}) {
  if (env?.VITE_VERCEL_ENV !== "preview" ||
      env?.VITE_BENEFIT_V2_STAGE_ENABLED !== "true") return [];
  try {
    const parsed = JSON.parse(env?.VITE_BENEFIT_V2_STAGE_ROUTES || "[]");
    return validateRoutes(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Production routes must be reviewed by offer ID and version. Changing the
// database flag alone does not authorize an arbitrary public offer to replace
// an existing benefit.
export function readActiveV2Routes(env = {}) {
  if (env?.VITE_VERCEL_ENV !== "production" ||
      env?.VITE_BENEFIT_V2_ACTIVE_ENABLED !== "true") return [];
  try {
    const parsed = JSON.parse(env?.VITE_BENEFIT_V2_ACTIVE_ROUTES || "[]");
    return validateRoutes(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Every old row being replaced must be explicitly reviewed and named.
export function selectStagedV2Offers({
  routes = [],
  legacyBenefits = [],
  v7Offers = [],
  v2Offers = [],
  subscriptions = [],
  userContext = {},
} = {}) {
  const untouched = { legacyBenefits, v7Offers, v2Offers: [], stagedCount: 0 };
  if (!routes.length || !validateRoutes(routes)) return untouched;

  const selected = [];
  const legacyIds = new Set();
  const v7Ids = new Set();
  for (const route of routes) {
    const matches = v2Offers.filter((offer) =>
      offer.offerId === route.offerId && offer.offerVersion === route.offerVersion
    );
    if (matches.length !== 1) continue;
    const offer = matches[0];
    if (offer.serviceId !== route.serviceId ||
      offer.canonical?.target_plan !== route.targetPlan ||
      offer.freshnessStatus !== "FRESH" ||
      !Array.isArray(offer.evidenceUrls) ||
      !offer.evidenceUrls.includes(route.evidenceUrl)) continue;

    const legacyMatches = route.legacyBenefitIds.map((id) =>
      legacyBenefits.filter((benefit) => benefit.id === id)
    );
    const v7Matches = route.v7OfferIds.map((id) =>
      v7Offers.filter((item) => item.serviceOfferId === id)
    );
    if (legacyMatches.some((items) => items.length !== 1 ||
      !items[0].targetServiceIds?.includes(route.serviceId)) ||
      v7Matches.some((items) => items.length !== 1 ||
        items[0].linkedServiceId !== route.serviceId)) continue;
    if (route.mode === "ADD_WHEN_NO_BASELINE" &&
      (legacyBenefits.some((item) => item.targetServiceIds?.includes(route.serviceId)) ||
       v7Offers.some((item) => item.linkedServiceId === route.serviceId))) continue;

    const model = buildV2RecommendationViewModel(subscriptions, offer, userContext);
    if (model.trustStatus !== RecommendationTrustStatus.VERIFIED ||
      ![RecommendationDisplayStatus.PRIMARY, RecommendationDisplayStatus.FREE_TRIAL]
        .includes(model.displayStatus) ||
      model.v2Assessment?.eligibility !== V2Eligibility.ELIGIBLE) continue;

    selected.push(offer);
    route.legacyBenefitIds.forEach((id) => legacyIds.add(id));
    route.v7OfferIds.forEach((id) => v7Ids.add(id));
  }

  return {
    legacyBenefits: legacyBenefits.filter((item) => !legacyIds.has(item.id)),
    v7Offers: v7Offers.filter((item) => !v7Ids.has(item.serviceOfferId)),
    v2Offers: selected,
    stagedCount: selected.length,
  };
}
