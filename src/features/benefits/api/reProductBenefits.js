import { fetchBenefitPipelineFlag, fetchPublishedV2Offers } from "./v2PublishedOffers.js";
import { buildRecommendationViewModels, recommendationConditionLabels } from "../presentation/recommendationViewModel.js";

function httpsUrl(value) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

export function selectREProductBenefits({ offers = [], legacy = [], subscriptions = [], userContext = {}, now = Date.now() } = {}) {
  const latest = new Map();
  for (const offer of offers) {
    if (!offer.offerId || offer.freshnessStatus !== "FRESH" || !httpsUrl(offer.actionUrl) ||
        !offer.evidenceUrls?.some(httpsUrl) || !Number.isFinite(Date.parse(offer.nextVerifyAt)) ||
        Date.parse(offer.nextVerifyAt) <= now || !Number.isFinite(Date.parse(offer.lastVerifiedAt)) ||
        Date.parse(offer.lastVerifiedAt) > now) continue;
    const start = offer.validFrom ? Date.parse(`${offer.validFrom.slice(0, 10)}T00:00:00Z`) : -Infinity;
    const end = offer.validTo ? Date.parse(`${offer.validTo.slice(0, 10)}T23:59:59.999Z`) : Infinity;
    if (Number.isNaN(start) || Number.isNaN(end) || start > now || end < now) continue;
    const previous = latest.get(offer.offerId);
    if (!previous || Date.parse(offer.lastVerifiedAt) > Date.parse(previous.lastVerifiedAt)) latest.set(offer.offerId, offer);
  }
  const recommendations = buildRecommendationViewModels({ v2Offers: [...latest.values()], subscriptions, userContext })
    .filter((item) => item.displayStatus !== "HIDDEN");
  const byId = latest;
  const v2 = recommendations.map((item) => {
    const offer = byId.get(item.id);
    const conditions = recommendationConditionLabels(item);
    const rawPrice = offer.canonical?.offer_price ?? offer.canonical?.trial_cost;
    const price = rawPrice == null ? NaN : Number(rawPrice);
    return {
      id: item.id, title: item.serviceName, subtitle: item.title, kind: item.title,
      category: offer.category === "NEW_USER_FREE_TRIAL" ? "100원/무료" : "통신사/결합",
      sourceServiceIds: [offer.serviceId], targetServiceIds: [offer.serviceId],
      description: [item.description, ...conditions].join(" · "),
      // Existing home/detail totals must not add conditional V2 savings.
      saving: 0, offerPrice: Number.isFinite(price) ? price : null,
      link: httpsUrl(item.sourceUrl), pipelineV2: true,
      savingText: item.savings?.isConfirmed && item.savings.amount > 0
        ? `예상 ${item.savings.period === "MONTHLY_RECURRING" ? "월 " : ""}${Math.round(item.savings.amount).toLocaleString("ko-KR")}원 절약 가능`
        : "조건 확인 필요",
      badgeText: "공식 출처 검증", evidenceUrls: offer.evidenceUrls.map(httpsUrl).filter(Boolean),
      conditions, lastVerifiedAt: offer.lastVerifiedAt, validTo: offer.validTo,
    };
  });
  // Replace only an identical official action, never every benefit of a service.
  const replaced = new Set(v2.map((item) => httpsUrl(item.link)));
  return [...v2, ...legacy.filter((item) => !replaced.has(httpsUrl(item.link)))];
}

export async function loadREProductBenefits({ client, legacy = [], subscriptions = [], userContext = {}, now } = {}) {
  const flag = await fetchBenefitPipelineFlag(client);
  if (flag.source !== "database" || flag.activeVersion !== "v2" || flag.shadowMode !== false) {
    return { promotions: legacy, source: "legacy", reason: "V2_NOT_ACTIVE" };
  }
  const result = await fetchPublishedV2Offers(client);
  if (result.status !== "SUCCESS" || result.source !== "benefit_v2_public_offers") {
    return { promotions: legacy, source: "legacy", reason: "V2_FETCH_FAILED" };
  }
  const promotions = selectREProductBenefits({ offers: result.items, legacy, subscriptions, userContext, now });
  return { promotions, source: promotions.some((item) => item.pipelineV2) ? "v2" : "legacy", reason: result.items.length ? null : "V2_EMPTY" };
}
