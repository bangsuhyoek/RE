/**
 * 혜택 탭의 후보·필터·절약 금액 계산 로직.
 * 화면과 테스트가 같은 함수를 쓰도록 UI에서 분리했다.
 */
import { isPromotionExpired } from "./promotionsSync.js";

/** C2 필터 칩. "구독 중 서비스"는 구독이 있을 때만 보여준다. */
export const PROMOTION_FILTERS = [
  { id: "all", label: "전체" },
  { id: "subscribed", label: "구독 중 서비스" },
  { id: "bundle", label: "결합 할인" },
  { id: "trial", label: "무료 체험" },
];

// 한 번만 받는 혜택(체험·첫 달·포인트 등). 매달 아끼는 금액으로 계산하지 않는다.
const ONE_TIME_PATTERN = /체험|트라이얼|첫\s?달|첫\s?구독|첫\s?1개월|1\+1|시험\s?구독|1개월\s*(0원|무료|₩0)|\d+\s?(일|주)\s*(무료|0원)|포인트|쿠폰|2회차/;
// 연·반년 단위로 결제해야 받는 혜택. 데이터의 금액 단위가 섞여 있어 월 금액으로 바꾸지 않는다.
const LONG_BILLING_PATTERN = /연간|1년|12개월|6개월|연\s?\d/;
const MEMBERSHIP_NAME_PATTERN = /멤버십|패스/;

// 특정 대상만 받을 수 있는 혜택. [정규식, 화면에 쓰는 대상 이름]
const ELIGIBILITY_RULES = [
  [/대학생/, "대학생"],
  [/(?<!대)학생/, "학생"],
  [/교사|교육자/, "교사"],
  [/초중고|교육용/, "교육용"],
  [/군인|장병/, "군인"],
  [/비영리/, "비영리 단체"],
  [/신규\s?(가입자|구독자|회원)/, "신규 가입자"],
  [/(카드|통신사)\s?고객/, "제휴 고객"],
];
const LIMITED_PERIOD_RULES = [
  [/첫해|첫\s?1년/, "첫해 한정"],
];

function textOf(promotion) {
  return [promotion?.kind, promotion?.subtitle, promotion?.title].filter(Boolean).join(" ");
}

/** 화면에 보여 줄 문구. "₩0"·"₩11,990" 같은 표기를 "0원"·"11,990원"으로 바꾼다(데이터는 그대로). */
export function formatDisplayText(value) {
  if (value === null || value === undefined) return value;
  return String(value).replace(/₩\s?(\d[\d,]*)/g, "$1원");
}

/** 특정 대상만 받을 수 있으면 "학생·교사 대상" 같은 짧은 조건, 아니면 null. */
export function getEligibilityNote(promotion) {
  if (!promotion) return null;
  const text = [textOf(promotion), promotion.description, ...(promotion.eligibility ? [].concat(promotion.eligibility) : [])]
    .filter(Boolean)
    .join(" ");
  const groups = [];
  for (const [pattern, label] of ELIGIBILITY_RULES) {
    if (pattern.test(text) && !groups.includes(label)) groups.push(label);
  }
  return groups.length ? groups.join("·") + " 대상" : null;
}

/** "첫해 한정"처럼 기간이 정해진 할인이면 그 기간 이름, 아니면 null. */
export function getLimitedPeriodLabel(promotion) {
  if (!promotion) return null;
  const text = textOf(promotion);
  for (const [pattern, label] of LIMITED_PERIOD_RULES) {
    if (pattern.test(text)) return label;
  }
  return null;
}

/** 행 보조 줄: 대상 조건 · 기간 · 혜택 문구. 이미 문구에 들어 있는 기간은 다시 붙이지 않는다. */
export function buildSecondaryLine(promotion, baseText) {
  const base = formatDisplayText(baseText || "");
  const period = getLimitedPeriodLabel(promotion);
  return [promotion?.eligibilityNote ?? getEligibilityNote(promotion), period && !base.includes(period) ? period : null, base]
    .filter(Boolean)
    .join(" · ");
}

function findService(serviceCatalog, id) {
  return (serviceCatalog || []).find((s) => s.id === id) || null;
}

function monthlyPriceOf(service) {
  if (!service) return null;
  const plan = Array.isArray(service.plans) ? service.plans[0] : null;
  const amount = Number(plan?.amount ?? service.amount);
  const cycle = plan?.billingCycle || service.billingCycle || "매월";
  if (!Number.isFinite(amount) || amount <= 0 || cycle !== "매월") return null;
  return amount;
}

export function getPromoCategories(promotion, serviceCatalog = []) {
  const cats = new Set();
  if (!promotion) return cats;
  if (promotion.category) cats.add(promotion.category);
  (promotion.sourceServiceIds || []).forEach((sId) => {
    const matchedService = findService(serviceCatalog, sId);
    if (matchedService?.category) cats.add(matchedService.category);
  });
  return cats;
}

/** 여러 서비스를 묶거나 멤버십·통신사와 연동하는 혜택. */
export function isBundlePromotion(promotion) {
  if (!promotion) return false;
  return (
    promotion.category === "통신사/결합" ||
    (promotion.sourceServiceIds || []).length > 1 ||
    /결합|연동/.test(String(promotion.kind || ""))
  );
}

export function isOneTimePromotion(promotion) {
  return Boolean(promotion) && ONE_TIME_PATTERN.test(textOf(promotion));
}

export function isLongBillingPromotion(promotion) {
  return Boolean(promotion) && !isOneTimePromotion(promotion) && LONG_BILLING_PATTERN.test(textOf(promotion));
}

/** 처음 가입할 때 0원(또는 100원대)으로 써 볼 수 있는 혜택. */
export function isFreeTrialPromotion(promotion) {
  if (!promotion || isBundlePromotion(promotion)) return false;
  const price = Number(promotion.offerPrice);
  return isOneTimePromotion(promotion) && Number.isFinite(price) && price <= 110;
}

/** 혜택을 받으려면 따로 가입해야 하는 멤버십(예: 네이버플러스 멤버십). 첫 번째 서비스는 혜택 대상이라 제외한다. */
export function getRequiredMemberships(promotion, serviceCatalog = []) {
  const ids = (promotion?.sourceServiceIds || []).slice(1);
  return ids
    .map((id) => findService(serviceCatalog, id))
    .filter((service) => service && MEMBERSHIP_NAME_PATTERN.test(service.name || ""));
}

/**
 * 매달 아끼는 금액.
 * - 매달 반복되는 혜택만 계산한다(체험·첫 달·연간 결제 혜택은 null).
 * - 금액은 데이터의 saving, 없으면 정가 - 혜택가.
 * - 따로 가입해야 하는 멤버십이 있고 아직 구독 중이 아니면 그 멤버십 월 요금을 뺀다.
 *   멤버십 요금을 모르면 금액을 확정할 수 없어 null.
 * 반환: { amount, gross, memberships: [{ id, name, price }] } 또는 null.
 */
export function computeMonthlySaving(promotion, { serviceCatalog = [], subscribedServiceIds = new Set() } = {}) {
  if (!promotion || isOneTimePromotion(promotion) || isLongBillingPromotion(promotion)) return null;
  const saving = Number(promotion.saving);
  const original = Number(promotion.originalPrice);
  const offer = Number(promotion.offerPrice);
  let gross = Number.isFinite(saving) && saving > 0 ? saving : null;
  if (gross === null && Number.isFinite(original) && Number.isFinite(offer) && original > offer) {
    gross = original - offer;
  }
  if (!gross) return null;

  const memberships = [];
  let amount = gross;
  for (const service of getRequiredMemberships(promotion, serviceCatalog)) {
    if (subscribedServiceIds.has(service.id)) continue;
    const price = monthlyPriceOf(service);
    if (price === null) return null;
    memberships.push({ id: service.id, name: service.name, price });
    amount -= price;
  }
  if (amount <= 0) return null;
  return { amount, gross, memberships };
}

/** 내 구독과 직접 연결(서비스 일치)되거나 같은 카테고리인 혜택인지. */
export function isMatchedCandidate(promotion) {
  return Boolean(promotion && (promotion.isDirectMatch || promotion.isCategoryMatch));
}

/**
 * 만료된 혜택을 빼고, 구독과의 관계와 매달 아끼는 금액을 붙인다.
 * 정렬: 직접 매칭 → 카테고리 매칭 → 나머지, 같은 묶음 안에서는 매달 아끼는 금액이 큰 순(모르면 뒤).
 */
export function buildPromotionCandidates(
  promotions = [],
  {
    personalized = true,
    serviceCatalog = [],
    subscribedServiceIds = new Set(),
    subscribedCategories = new Set(),
    now = Date.now(),
  } = {}
) {
  const list = Array.isArray(promotions) ? promotions : [];
  const seenIds = new Set();
  const decorated = [];

  for (const promo of list) {
    if (!promo || !promo.id || seenIds.has(promo.id)) continue;
    seenIds.add(promo.id);
    if (isPromotionExpired(promo, now)) continue;
    // 이미 구독 중인 서비스의 신규 가입 체험·첫 달 혜택은 받을 수 없으니 뺀다.
    const targetId = promo.sourceServiceIds?.[0];
    if (personalized && targetId && subscribedServiceIds.has(targetId) && isOneTimePromotion(promo)) continue;
    const isDirectMatch = personalized && (promo.sourceServiceIds || []).some((id) => subscribedServiceIds.has(id));
    const isCategoryMatch =
      personalized && Array.from(getPromoCategories(promo, serviceCatalog)).some((c) => subscribedCategories.has(c));
    const monthlySaving = computeMonthlySaving(promo, { serviceCatalog, subscribedServiceIds });
    const eligibilityNote = getEligibilityNote(promo);
    decorated.push({ ...promo, isDirectMatch, isCategoryMatch, monthlySaving, eligibilityNote });
  }

  const rank = (p) => (p.isDirectMatch ? 0 : p.isCategoryMatch ? 1 : 2);
  decorated.sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    return (b.monthlySaving?.amount || 0) - (a.monthlySaving?.amount || 0);
  });
  return decorated;
}

/** 필터 칩 판정. 모든 칩은 만료되지 않은 전체 후보를 대상으로 한다. */
export function resolveFilter(promotion, filter) {
  if (!promotion) return false;
  if (filter === "subscribed") return Boolean(promotion.isDirectMatch);
  if (filter === "bundle") return isBundlePromotion(promotion);
  if (filter === "trial") return isFreeTrialPromotion(promotion);
  return true;
}

export function buildPromotionFilters({ personalized = false } = {}) {
  return PROMOTION_FILTERS.filter((item) => personalized || item.id !== "subscribed").map((item) => ({ ...item }));
}

/**
 * 가장 많이 아낄 수 있는 혜택 하나. 매달 아끼는 금액을 계산할 수 있는 것만 고른다.
 * 학생·신규 가입자처럼 대상이 정해진 혜택은 고르지 않는다.
 * 구독이 있으면 직접 매칭 → 카테고리 매칭 순으로 먼저 찾고, 없으면 전체에서 찾는다.
 */
export function pickTopPromotion(candidates = []) {
  const withSaving = candidates.filter(
    (p) => p.monthlySaving?.amount > 0 && !(p.eligibilityNote ?? getEligibilityNote(p))
  );
  const best = (list) =>
    list.reduce((top, p) => (!top || p.monthlySaving.amount > top.monthlySaving.amount ? p : top), null);
  return (
    best(withSaving.filter((p) => p.isDirectMatch)) ||
    best(withSaving.filter((p) => p.isCategoryMatch)) ||
    best(withSaving)
  );
}

/** 목록을 "구독 중인 서비스 혜택"과 "새로 시작하면 좋은 혜택"으로 나눈다. */
export function splitPromotionSections(candidates = []) {
  const subscribed = [];
  const discover = [];
  candidates.forEach((p) => (p.isDirectMatch ? subscribed : discover).push(p));
  return { subscribed, discover };
}

/** 원 단위 금액 표기. */
export function formatWon(value) {
  return Number(value).toLocaleString("ko-KR") + "원";
}

/** 확인 날짜(ISO)를 한국 시간 "M월 D일"로. 날짜가 없거나 잘못되면 null. */
export function formatVerifiedDate(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  const kst = new Date(ms + 9 * 60 * 60 * 1000);
  return (kst.getUTCMonth() + 1) + "월 " + kst.getUTCDate() + "일";
}

export function getVerifiedAt(promotion) {
  return promotion?.lastVerifiedAt || promotion?.last_verified_at || promotion?.lastCheckedAt || null;
}

/** 목록에서 가장 최근 확인 날짜. */
export function latestVerifiedDate(candidates = []) {
  let latest = null;
  for (const p of candidates) {
    const ms = Date.parse(getVerifiedAt(p) || "");
    if (Number.isFinite(ms) && (latest === null || ms > latest)) latest = ms;
  }
  return latest === null ? null : formatVerifiedDate(new Date(latest).toISOString());
}

