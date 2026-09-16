import { useMemo, useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { MacroPerkBlock, HanddrawnHatchedDivider } from "./MacroPerkBlock";
import { serviceCatalog } from "../data/subscriptionData";

function getPromoCategories(promotion) {
  const cats = new Set();
  if (promotion.category) cats.add(promotion.category);
  (promotion.sourceServiceIds || []).forEach((sId) => {
    const matchedService = serviceCatalog.find((s) => s.id === sId);
    if (matchedService?.category) cats.add(matchedService.category);
  });
  return cats;
}

function resolveFilter(promotion, filter, userSubscribedServiceIds) {
  if (filter === "all") return true;
  if (filter === "direct") return Boolean(promotion.isDirectMatch);
  if (filter === "100원/무료") return promotion.category === "100원/무료" || promotion.offerPrice === 0 || promotion.offerPrice === 100;
  if (filter === "통신사/결합") return promotion.category === "통신사/결합" || promotion.id.includes("bundle") || promotion.id.includes("nerget") || promotion.id.includes("naver");
  if (filter === "학생/연간") return promotion.category === "학생/연간" || promotion.kind?.includes("연간") || promotion.kind?.includes("학생");
  
  const promoCats = getPromoCategories(promotion);
  return promoCats.has(filter);
}

function getServiceDisplayInfo(promotion) {
  const primaryServiceId = promotion.sourceServiceIds?.[0] || promotion.id.split("-")[0];
  const primaryService = serviceCatalog.find((s) => s.id === primaryServiceId);

  const isPartnership =
    (promotion.sourceServiceIds || []).length > 1 ||
    (promotion.title || "").includes("X") ||
    (promotion.kind || "").includes("제휴") ||
    (promotion.kind || "").includes("결합");

  let serviceName = promotion.title;
  if (!isPartnership && primaryService?.name) {
    serviceName = primaryService.name;
  }

  let solutionTitle = promotion.subtitle;
  if (!solutionTitle || solutionTitle === promotion.title) {
    solutionTitle = promotion.kind || promotion.title;
  }

  return {
    serviceId: primaryServiceId,
    serviceName,
    solutionTitle,
    isPartnership,
  };
}

function getBadgeInfo(promotion, isUserSubscribed) {
  const isPartnership =
    (promotion.sourceServiceIds || []).length > 1 ||
    (promotion.title || "").includes("X") ||
    (promotion.kind || "").includes("제휴") ||
    (promotion.kind || "").includes("결합");

  if (isUserSubscribed && isPartnership) {
    return { text: "제휴 0원 · 결합 혜택", isHighlight: true };
  }
  if (isUserSubscribed && (promotion.kind?.includes("연간") || promotion.category === "학생/연간")) {
    return { text: "내 구독 연간 절약", isHighlight: true };
  }
  if (isUserSubscribed && (promotion.kind?.includes("무료 체험") || promotion.category === "100원/무료")) {
    return { text: "신규 가입 0원 혜택", isHighlight: false };
  }
  if (isUserSubscribed) {
    return { text: "내 구독 전용 혜택", isHighlight: true };
  }
  return { text: promotion.kind || (promotion.category + " 추천"), isHighlight: false };
}

export function PromotionScreen({ subscriptions = [], promotions = [], onOpenPromotion }) {
  const [filter, setFilter] = useState("all");

  const userSubscribedServiceIds = useMemo(() => {
    const ids = new Set();
    subscriptions.forEach((sub) => {
      const sId = sub.service_id || sub.serviceId || sub.id;
      if (sId) ids.add(sId);
      const nameKey = String(sub.name || "").toLowerCase().replace(/\s+/g, "");
      const matched = serviceCatalog.find(
        (s) =>
          s.id === sId ||
          s.name.toLowerCase().replace(/\s+/g, "") === nameKey ||
          (s.aliases || []).some((a) => a.toLowerCase().replace(/\s+/g, "") === nameKey)
      );
      if (matched) {
        ids.add(matched.id);
      }
    });
    return ids;
  }, [subscriptions]);

  const userSubscribedCategories = useMemo(() => {
    const cats = new Set();
    subscriptions.forEach((sub) => {
      const sId = sub.service_id || sub.serviceId || sub.id;
      const nameKey = String(sub.name || "").toLowerCase().replace(/\s+/g, "");
      const matched = serviceCatalog.find(
        (s) =>
          s.id === sId ||
          s.name.toLowerCase().replace(/\s+/g, "") === nameKey ||
          (s.aliases || []).some((a) => a.toLowerCase().replace(/\s+/g, "") === nameKey)
      );
      const cat = matched?.category || sub.category;
      if (cat && cat !== "기타") cats.add(cat);
    });
    return cats;
  }, [subscriptions]);

  const isPersonalized = subscriptions.length > 0;

  const candidatePromotions = useMemo(() => {
    if (!isPersonalized) {
      return promotions.map((p) => ({ ...p, isDirectMatch: false, isCategoryMatch: false }));
    }

    const matched = [];
    const seenIds = new Set();

    for (const promo of promotions) {
      const promoCats = getPromoCategories(promo);
      const isDirectMatch = (promo.sourceServiceIds || []).some((id) =>
        userSubscribedServiceIds.has(id)
      );
      const isCategoryMatch = Array.from(promoCats).some((c) =>
        userSubscribedCategories.has(c)
      );

      if (isDirectMatch || isCategoryMatch) {
        if (!seenIds.has(promo.id)) {
          seenIds.add(promo.id);
          matched.push({
            ...promo,
            isDirectMatch,
            isCategoryMatch,
          });
        }
      }
    }

    matched.sort((a, b) => {
      if (a.isDirectMatch && !b.isDirectMatch) return -1;
      if (!a.isDirectMatch && b.isDirectMatch) return 1;
      return (b.saving || 0) - (a.saving || 0);
    });

    return matched;
  }, [isPersonalized, promotions, userSubscribedServiceIds, userSubscribedCategories]);

  const dynamicFilters = useMemo(() => {
    if (!isPersonalized) {
      return [
        { id: "all", label: "전체" },
        { id: "100원/무료", label: "0원 · 무료" },
        { id: "OTT", label: "OTT 환승" },
        { id: "음악", label: "음악" },
        { id: "통신사/결합", label: "통신사 결합" },
        { id: "학생/연간", label: "학생 · 연간" },
      ];
    }

    const items = [{ id: "all", label: "맞춤 전체" }];

    const hasDirect = candidatePromotions.some((p) => p.isDirectMatch);
    if (hasDirect) {
      items.push({ id: "direct", label: "내 구독 혜택" });
    }

    userSubscribedCategories.forEach((cat) => {
      items.push({ id: cat, label: cat });
    });

    const hasFree = candidatePromotions.some(
      (p) => p.offerPrice === 0 || p.offerPrice === 100 || p.category === "100원/무료"
    );
    if (hasFree) {
      items.push({ id: "100원/무료", label: "0원 · 무료" });
    }

    return items;
  }, [isPersonalized, userSubscribedCategories, candidatePromotions]);

  useEffect(() => {
    const isValid = dynamicFilters.some((f) => f.id === filter);
    if (!isValid) {
      setFilter("all");
    }
  }, [dynamicFilters, filter]);

  const filtered = useMemo(() => {
    return candidatePromotions.filter((promo) =>
      resolveFilter(promo, filter, userSubscribedServiceIds)
    );
  }, [candidatePromotions, filter, userSubscribedServiceIds]);

  const categorySummary = useMemo(() => {
    if (!isPersonalized) return "";
    return Array.from(userSubscribedCategories).join(" · ");
  }, [isPersonalized, userSubscribedCategories]);

  return (
    <main className="px-5 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-4 select-none">
      {/* 1. 상단 타이틀 & 안내 헤더 */}
      <div className="pb-4">
        <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#FF6F0F] tracking-tight">
          <Sparkles size={14} />
          <span>{isPersonalized ? "내 구독 맞춤 혜택 진단" : "AI 숨은 혜택 발굴 진단"}</span>
        </div>
        <h1 className="mt-1 text-[22px] font-black tracking-tight text-[#191F28]">
          놓치고 있던 숨은 혜택
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6B7684] font-medium leading-relaxed">
          {isPersonalized
            ? `회원님이 이용 중인 ${categorySummary} 카테고리 기반으로 놓치고 있던 제휴 및 할인 혜택을 분석했어요.`
            : "구독 중인 서비스가 없어 전체 혜택을 보여드려요. 구독을 추가하시면 딱 맞는 혜택만 골라드려요."}
        </p>
      </div>

      {/* 2. 심플 필터 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-4" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {dynamicFilters.map((item) => {
          const isSelected = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-bold shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#191F28] text-white shadow-xs"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* 3. 손글씨 빗금 구분선 기반 대형 혜택 블록 리스트 */}
      <section className="mt-2 flex flex-col">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[#8B95A1]">
            <p className="text-[15px] font-bold">해당 카테고리의 맞춤 혜택이 없어요.</p>
            <p className="mt-1 text-[13px]">다른 필터를 선택하거나 전체 혜택을 둘러보세요.</p>
          </div>
        ) : (
          filtered.map((promotion, index) => {
            const displayInfo = getServiceDisplayInfo(promotion);
            const badgeInfo = getBadgeInfo(promotion, promotion.isDirectMatch);

            // 통일된 절약 금액 양식 산출
            const savingAmount = Number(promotion.saving) || 0;
            const isAnnual = promotion.kind?.includes("연간") || promotion.category === "학생/연간";
            const savingText = savingAmount > 0
              ? (isAnnual ? `연 ${savingAmount.toLocaleString("ko-KR")}원 절약` : `월 ${savingAmount.toLocaleString("ko-KR")}원 절약`)
              : (promotion.offerPrice === 0 ? "0원 무료" : null);

            const offerPriceText = promotion.offerPrice === 0
              ? "0원 무료"
              : (promotion.offerPrice ? `${Number(promotion.offerPrice).toLocaleString("ko-KR")}원` : null);

            return (
              <div key={promotion.id} className="w-full">
                <MacroPerkBlock
                  serviceId={displayInfo.serviceId}
                  serviceName={displayInfo.serviceName}
                  solutionTitle={displayInfo.solutionTitle}
                  description={promotion.description}
                  savingText={savingText}
                  offerPriceText={offerPriceText}
                  isDirectMatch={badgeInfo.isHighlight}
                  badgeText={badgeInfo.text}
                  onAction={() => onOpenPromotion(promotion)}
                />
                {/* 마지막 아이템 뒤에는 구분선을 두지 않음 */}
                {index < filtered.length - 1 && <HanddrawnHatchedDivider />}
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
