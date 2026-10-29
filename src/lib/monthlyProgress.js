import { dateForDueDay, getLastDate, getNextChargeDate, parseLocalDate } from "./dates.js";
import { isPromotionExpired } from "./promotionsSync.js";
import { isTrialSubscription } from "./trialGuard.js";

export const DEFAULT_CAROUSEL_PROMO_IDS = [
  "naverplus-netflix",
  "youtube-promo",
  "disney-bundle-37",
];

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** 두 달력 날짜 사이의 "개월" 차이 (일자는 무시하고 연·월만 본다). */
function monthsBetween(fromDate, toDate) {
  return (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth());
}

function getSubscriptionChargeAmount(subscription) {
  if (!subscription) return 0;
  const candidates = [
    subscription.amount,
    subscription.regularAmount,
    subscription.expectedAmount,
    subscription.normalAmount,
    subscription.grossAmount,
  ];
  for (const raw of candidates) {
    const num = Number(raw);
    if (Number.isFinite(num) && num > 0) {
      return num;
    }
  }
  return 0;
}

function resolveDueDay(subscription, fallbackDate = null) {
  const rawDue = Number(subscription?.dueDay);
  if (Number.isFinite(rawDue) && rawDue >= 1) {
    return Math.min(31, Math.max(1, Math.trunc(rawDue)));
  }
  if (fallbackDate instanceof Date && !Number.isNaN(fallbackDate.getTime())) {
    return fallbackDate.getDate();
  }
  return 1;
}

/**
 * 이번 달(달력 기준) 구독의 결제 예정/완료 일자를 계산한다.
 * - 취소된 구독은 null 반환
 * - 무료체험(trial)은 유료 전환일이 이번 달인 경우에만 해당 전환일 반환
 * - 연간(매년) 구독은 결제월이 이번 달인 경우에만 이번 달 결제일 반환
 * - 월간 구독은 말일 보정(예: 30일 달의 31일 -> 30일)을 적용한 이번 달 결제일 반환
 * - 결제를 마치면 nextBillingDate가 다음 주기로 넘어간다. 한 주기(월간 1개월, 연간 1년) 앞이면
 *   이번 달 결제는 완료된 것으로 보고 이번 달 결제일을 반환한다. 그보다 더 앞이면 null을 반환한다.
 * - 이번 달 결제일 이후에 등록된(createdAt) 구독은 이번 달에 결제되지 않았으므로 null을 반환한다.
 */
export function getChargeDateInCurrentMonth(subscription, reference = new Date()) {
  if (!subscription || subscription.status === "cancelled") return null;

  const refDate = reference instanceof Date ? reference : new Date(reference);
  const today = startOfDay(refDate);
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDay = getLastDate(year, month);

  const explicitNext = subscription.nextBillingDate
    ? parseLocalDate(subscription.nextBillingDate)
    : null;
  const trialEnd = subscription.trialEndDate
    ? parseLocalDate(subscription.trialEndDate)
    : subscription.trialEndsOn
      ? parseLocalDate(subscription.trialEndsOn)
      : null;
  const createdDate = subscription.createdAt
    ? parseLocalDate(subscription.createdAt)
    : null;

  if (isTrialSubscription(subscription)) {
    const conversionBase = explicitNext || trialEnd;
    if (conversionBase) {
      const convDay = startOfDay(conversionBase);
      if (convDay.getFullYear() !== year || convDay.getMonth() !== month) {
        return null;
      }
      const clampedDay = Math.min(convDay.getDate(), lastDay);
      return new Date(year, month, clampedDay);
    }

    if (Number.isFinite(Number(subscription.dueDay)) && Number(subscription.dueDay) >= 1) {
      return dateForDueDay(year, month, resolveDueDay(subscription));
    }

    const nextCharge = getNextChargeDate(subscription, today);
    if (
      nextCharge &&
      nextCharge.getFullYear() === year &&
      nextCharge.getMonth() === month
    ) {
      return startOfDay(nextCharge);
    }
    return null;
  }

  const isYearly = subscription.billingCycle === "매년";
  if (isYearly) {
    const anchor = explicitNext || createdDate;
    if (!anchor) return null;
    // nextBillingDate가 1년 넘게 앞이면 이번 달 결제는 없다.
    // 정확히 1년 앞이면 작년 같은 달 결제를 마치고 다음 주기로 넘어간 것이므로 이번 달 결제는 완료된 것으로 본다.
    if (explicitNext && monthsBetween(new Date(year, month, 1), explicitNext) > 12) return null;
    if (anchor.getMonth() !== month) return null;
    const dueDay = resolveDueDay(subscription, anchor);
    const chargeDate = dateForDueDay(year, month, dueDay);
    // 결제일 이후에 등록된 구독은 이번 달에 결제되지 않았다.
    if (createdDate && startOfDay(createdDate) > chargeDate) return null;
    return chargeDate;
  }

  // 결제 후 nextBillingDate는 다음 주기(한 달 뒤)로 넘어간다.
  // 정확히 한 주기 앞이면 이번 달 결제는 완료된 것이고, 두 주기 이상 앞이면 이번 달 결제가 없다.
  if (explicitNext && monthsBetween(new Date(year, month, 1), explicitNext) >= 2) {
    return null;
  }

  const dueDay = resolveDueDay(subscription, explicitNext || createdDate);
  const chargeDate = dateForDueDay(year, month, dueDay);
  if (createdDate && startOfDay(createdDate) > chargeDate) return null;
  return chargeDate;
}

/**
 * 이번 달 결제 진행 현황(결제 완료 금액, 남은 예정 금액, 진행률 등)을 계산한다.
 *
 * @param {Array} subscriptions 구독 목록
 * @param {Date|string|number} [reference=new Date()] 기준 일자 (시간대 독립적 로컬 날짜)
 */
export function calculateMonthlyProgress(subscriptions = [], reference = new Date()) {
  const refDate = reference instanceof Date ? reference : new Date(reference);
  const today = startOfDay(refDate);
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDay = today.getDate();
  const lastDay = getLastDate(year, month);

  let completedAmount = 0;
  let remainingAmount = 0;
  let completedCount = 0;
  let remainingCount = 0;
  const items = [];

  if (!Array.isArray(subscriptions)) {
    return {
      year,
      month: month + 1,
      todayDay,
      lastDay,
      completedAmount: 0,
      remainingAmount: 0,
      paidAmount: 0,
      upcomingAmount: 0,
      totalAmount: 0,
      progressPercent: 0,
      completedCount: 0,
      remainingCount: 0,
      items: [],
    };
  }

  for (const sub of subscriptions) {
    if (!sub || sub.status === "cancelled") continue;

    const chargeDate = getChargeDateInCurrentMonth(sub, today);
    if (!chargeDate) continue;

    const amount = getSubscriptionChargeAmount(sub);
    if (amount <= 0) continue;

    const billingDay = chargeDate.getDate();
    const isCompleted = billingDay <= todayDay;

    if (isCompleted) {
      completedAmount += amount;
      completedCount += 1;
    } else {
      remainingAmount += amount;
      remainingCount += 1;
    }

    items.push({
      subscriptionId: sub.subscriptionId || sub.id,
      name: sub.name,
      amount,
      billingDay,
      chargeDate,
      status: isCompleted ? "completed" : "remaining",
      isCompleted,
    });
  }

  const totalAmount = completedAmount + remainingAmount;
  const progressPercent =
    totalAmount > 0
      ? Math.min(100, Math.max(0, Math.round((completedAmount / totalAmount) * 100)))
      : 0;

  return {
    year,
    month: month + 1,
    todayDay,
    lastDay,
    completedAmount,
    remainingAmount,
    paidAmount: completedAmount,
    upcomingAmount: remainingAmount,
    totalAmount,
    progressPercent,
    completedCount,
    remainingCount,
    items,
  };
}

function normalizeServiceKey(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, "");
}

function collectSubscribedServiceIds(subscriptions = []) {
  const ids = new Set();
  if (!Array.isArray(subscriptions)) return ids;

  const aliasMap = {
    넷플릭스: "netflix",
    netflix: "netflix",
    유튜브: "youtube",
    유튜브프리미엄: "youtube",
    youtubepremium: "youtube",
    youtube: "youtube",
    디즈니: "disney",
    "디즈니+": "disney",
    디즈니플러스: "disney",
    "disney+": "disney",
    disney: "disney",
    티빙: "tving",
    tving: "tving",
    웨이브: "wavve",
    wavve: "wavve",
    스포티파이: "spotify",
    spotify: "spotify",
    네이버플러스: "naverplus",
    네이버플러스멤버십: "naverplus",
    naver: "naverplus",
    naverplus: "naverplus",
    어도비: "adobe",
    adobe: "adobe",
    노션: "notion",
    notion: "notion",
    피그마: "figma",
    figma: "figma",
    캔바: "canva",
    canva: "canva",
  };

  for (const sub of subscriptions) {
    if (!sub || sub.status === "cancelled") continue;
    for (const rawId of [sub.serviceId, sub.service_id, sub.id]) {
      if (rawId) {
        const norm = normalizeServiceKey(rawId);
        ids.add(norm);
        if (aliasMap[norm]) ids.add(aliasMap[norm]);
      }
    }
    if (sub.name) {
      const normName = normalizeServiceKey(sub.name);
      if (aliasMap[normName]) ids.add(aliasMap[normName]);
      for (const [key, mapped] of Object.entries(aliasMap)) {
        if (normName.includes(key)) ids.add(mapped);
      }
    }
  }
  return ids;
}

function isBundlePromotion(promo) {
  if (!promo) return false;
  const serviceCount = Array.isArray(promo.sourceServiceIds) ? promo.sourceServiceIds.length : 0;
  const text = [promo.id || "", promo.category || "", promo.kind || "", promo.title || ""].join(" ").toLowerCase();
  return (
    serviceCount > 1 ||
    promo.category === "통신사/결합" ||
    text.includes("bundle") ||
    text.includes("결합") ||
    text.includes("제휴") ||
    text.includes("연동") ||
    text.includes("패밀리") ||
    text.includes(" x ")
  );
}

/**
 * 홈 화면 VisualPromoCarousel에 노출할 프로모션을 동적으로 선택한다.
 * - 만료된 혜택 및 상시 무료 요금제 제외
 * - 현재 구독을 대체할 수 있는 결합/번들 혜택 또는 아직 구독하지 않은 서비스 혜택 우선
 * - 최대 maxCount(기본 5개) 반환, 후보가 없으면 기본 3개 ID로 폴백
 */
export function selectCarouselPromotions(
  promotions = [],
  subscriptions = [],
  {
    maxCount = 5,
    now = Date.now(),
    fallbackIds = DEFAULT_CAROUSEL_PROMO_IDS,
  } = {}
) {
  if (!Array.isArray(promotions) || promotions.length === 0) return [];

  const nowMs = now instanceof Date ? now.getTime() : Number(now) || Date.now();
  const subscribedIds = collectSubscribedServiceIds(subscriptions);

  const validPromos = [];
  const seenIds = new Set();

  for (const promo of promotions) {
    if (!promo || !promo.id || seenIds.has(promo.id)) continue;
    if (promo.isFreeTier === true || promo.verified_status === "free_tier") continue;
    if (isPromotionExpired(promo, nowMs)) continue;
    seenIds.add(promo.id);
    validPromos.push(promo);
  }

  if (validPromos.length === 0) {
    return fallbackIds
      .map((id) => promotions.find((p) => p && p.id === id && !isPromotionExpired(p, nowMs)))
      .filter(Boolean)
      .slice(0, maxCount);
  }

  const scored = validPromos.map((promo, index) => {
    const serviceIds = (promo.sourceServiceIds || []).map((id) => normalizeServiceKey(id));
    const overlapCount = serviceIds.filter((id) => subscribedIds.has(id)).length;
    const unsubscribedCount = serviceIds.filter((id) => !subscribedIds.has(id)).length;
    const isBundle = isBundlePromotion(promo);
    const isDefaultFeatured = fallbackIds.includes(promo.id);

    let priority;
    if (subscribedIds.size > 0) {
      if (isBundle && overlapCount > 0 && unsubscribedCount > 0) {
        // 현재 구독 중인 서비스를 더 저렴한 결합/제휴로 대체 가능
        priority = 4;
      } else if (isBundle && overlapCount > 0) {
        // 현재 구독 중인 서비스를 묶는 번들
        priority = 3;
      } else if (overlapCount === 0) {
        // 아직 구독하지 않은 서비스의 신규/결합 혜택
        priority = isBundle ? 2.5 : 2;
      } else {
        // 이미 단독 구독 중인 서비스의 일반 할인
        priority = 1;
      }
    } else {
      priority = isBundle ? 2 : 1.5;
    }

    const featuredBonus = isDefaultFeatured ? 0.3 : 0;
    const savingScore = Math.min(Number(promo.saving) || 0, 50000) / 100000;

    return {
      promo,
      score: priority + featuredBonus + savingScore,
      index,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  const selected = scored.slice(0, maxCount).map((entry) => entry.promo);
  if (selected.length > 0) {
    return selected;
  }

  return fallbackIds
    .map((id) => validPromos.find((p) => p.id === id))
    .filter(Boolean)
    .slice(0, maxCount);
}
