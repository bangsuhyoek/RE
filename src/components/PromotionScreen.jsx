import { useMemo, useState, useRef } from "react";
import { ArrowRight, ChevronRight, ExternalLink, Sparkles, TrendingDown } from "lucide-react";
import { Button, Chip, ServiceMark } from "./ui";
import { formatWon } from "../lib/dates";

const filters = [
  { id: "all", label: "전체" },
  { id: "100원/무료", label: "100원 · 무료" },
  { id: "OTT", label: "OTT 환승" },
  { id: "통신사/결합", label: "통신사 결합" },
  { id: "학생/연간", label: "학생 · 연간" },
];

function resolveFilter(promotion, filter) {
  if (filter === "all") return true;
  if (filter === "100원/무료") return promotion.category === "100원/무료" || promotion.offerPrice === 0 || promotion.offerPrice === 100;
  if (filter === "OTT") return promotion.category === "OTT" || promotion.id.includes("watcha") || promotion.id.includes("tving") || promotion.id.includes("disney");
  if (filter === "통신사/결합") return promotion.category === "통신사/결합" || promotion.id.includes("bundle") || promotion.id.includes("nerget");
  if (filter === "학생/연간") return promotion.category === "학생/연간" || promotion.kind.includes("연간") || promotion.kind.includes("학생");
  return true;
}

function VisualPromoCarousel({ promotions, onOpenPromotion }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  const heroPromo = promotions.find((p) => p.id === "lgu-nerget") || promotions[0];
  const promo1 = promotions.find((p) => p.kind === "경쟁사 프로모" || p.id === "youtube-promo") || promotions[1] || promotions[0];
  const promo2 = promotions.find((p) => p.kind === "연간 전환 팁" || p.id === "spotify-annual") || promotions[2] || promotions[1];

  const slides = [
    {
      id: "lgu-nerget",
      promo: heroPromo,
      tag: "LG U+ 너겟 요금제",
      title: "통신비 줄이고,\nOTT는 무료로!",
      btnText: "혜택 받아가기",
      bgGradient: "from-blue-50/50 via-white to-white border-blue-100/80",
      btnColor: "bg-[#3182F6] text-white hover:bg-blue-600",
      visual: (
        <div className="relative mx-auto h-20 w-52 flex items-center justify-center select-none">
          <div style={{ backgroundColor: "#001D38" }} className="absolute top-4 left-3 w-26 h-14 rounded-xl border border-blue-400/40 text-white p-2 shadow-md -rotate-12 flex items-center justify-center">
            <span className="text-[11px] font-black tracking-wider text-blue-200">Disney+</span>
          </div>
          <div style={{ backgroundColor: "#FF153C" }} className="absolute top-0 right-3 w-26 h-14 rounded-xl text-white p-2 shadow-lg rotate-6 flex items-center justify-center">
            <span className="text-[13px] font-black tracking-tight">TVING</span>
          </div>
          <div className="absolute -top-1 left-9 h-6 w-6 rounded-full bg-[#3182F6] text-white flex items-center justify-center shadow-xs text-[11px] font-bold">✓</div>
          <div className="absolute bottom-0 right-7 h-5 w-5 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-xs text-[9px] font-black">%</div>
          <div className="absolute top-3 left-1 h-5 w-5 rounded-full bg-amber-300 text-amber-900 flex items-center justify-center shadow-2xs text-[11px]">😊</div>
        </div>
      ),
    },
    {
      id: "youtube-promo",
      promo: promo1,
      tag: "경쟁사 환승 특가",
      title: "광고 없이 몰입하고,\n첫 3개월 ₩100!",
      btnText: "100원으로 시작하기",
      bgGradient: "from-red-50/50 via-white to-white border-red-100/80",
      btnColor: "bg-[#E50914] text-white hover:bg-red-700 shadow-xs",
      visual: (
        <div className="relative mx-auto h-20 w-52 flex items-center justify-center select-none">
          <div style={{ backgroundColor: "#141414" }} className="absolute top-4 left-3 w-26 h-14 rounded-xl border border-gray-700 text-white p-2 shadow-md -rotate-12 flex items-center justify-center">
            <span className="text-[11px] font-black tracking-wider text-[#E50914]">NETFLIX</span>
          </div>
          <div style={{ backgroundColor: "#FF0000" }} className="absolute top-0 right-3 w-26 h-14 rounded-xl text-white p-2 shadow-lg rotate-6 flex items-center justify-center">
            <span className="text-[12px] font-black tracking-tight text-white flex items-center gap-1">▶ YouTube</span>
          </div>
          <div className="absolute -top-1 left-9 h-6 w-6 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-xs text-[9px] font-black">₩100</div>
          <div className="absolute bottom-0 right-7 h-5 w-5 rounded-full bg-black text-white flex items-center justify-center shadow-xs text-[8px] font-black">HOT</div>
          <div className="absolute top-3 left-1 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs text-[10px] font-bold">3달</div>
        </div>
      ),
    },
    {
      id: "spotify-annual",
      promo: promo2,
      tag: "연간 멤버십 전환 팁",
      title: "매월 내지 말고,\n1년에 2달 공짜로!",
      btnText: "연간 혜택 받기",
      bgGradient: "from-emerald-50/50 via-white to-white border-emerald-100/80",
      btnColor: "bg-[#1DB954] text-white hover:bg-emerald-600 shadow-xs",
      visual: (
        <div className="relative mx-auto h-20 w-52 flex items-center justify-center select-none">
          <div style={{ backgroundColor: "#121212" }} className="absolute top-4 left-3 w-26 h-14 rounded-xl border border-emerald-500/40 text-white p-2 shadow-md -rotate-12 flex items-center justify-center">
            <span className="text-[11px] font-black tracking-wider text-[#1DB954]">MUSIC</span>
          </div>
          <div style={{ backgroundColor: "#1DB954" }} className="absolute top-0 right-3 w-26 h-14 rounded-xl text-black p-2 shadow-lg rotate-6 flex items-center justify-center">
            <span className="text-[12px] font-black tracking-tight text-black">Spotify</span>
          </div>
          <div className="absolute -top-1 left-9 h-6 w-6 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-xs text-[8px] font-black">FREE</div>
          <div className="absolute bottom-0 right-7 h-5 w-5 rounded-full bg-black text-white flex items-center justify-center shadow-xs text-[8px] font-black">2달</div>
          <div className="absolute top-3 left-1 h-5 w-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-2xs text-[11px]">🎧</div>
        </div>
      ),
    },
  ];

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.clientWidth;
    if (width > 0) {
      const newIdx = Math.round(scrollLeft / width);
      setActiveIndex(newIdx);
    }
  };

  const scrollToSlide = (idx) => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({
      left: idx * width,
      behavior: "smooth",
    });
    setActiveIndex(idx);
  };

  return (
    <div className="w-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-2xl"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {slides.map((s) => (
          <div
            key={s.id}
            className={`w-full shrink-0 snap-center rounded-2xl border bg-gradient-to-b ${s.bgGradient} p-4 sm:p-5 text-center flex flex-col items-center justify-between shadow-2xs`}
            style={{ minHeight: "245px" }}
          >
            <div>
              {s.visual}
              <span className="text-[12px] font-extrabold text-[#3182F6] block tracking-tight mt-1">
                {s.tag}
              </span>
              <h3 className="mt-0.5 text-[18px] font-black text-black tracking-tight leading-snug whitespace-pre-line">
                {s.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onOpenPromotion?.(s.promo)}
              className={`mt-2.5 inline-flex items-center justify-center rounded-full px-5 py-2 text-[13px] font-bold shadow-xs cursor-pointer active:scale-95 transition-all ${s.btnColor}`}
            >
              {s.btnText}
            </button>
          </div>
        ))}
      </div>

      {/* Dots Indicator */}
      <div className="flex items-center justify-center gap-1.5 mt-2.5">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => scrollToSlide(idx)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              activeIndex === idx ? "w-5 bg-[#3182F6]" : "w-1.5 bg-gray-200"
            }`}
            aria-label={`슬라이드 ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export function PromotionScreen({ subscriptions, promotions, onOpenPromotion }) {
  const [filter, setFilter] = useState("all");
  const ownedIds = useMemo(() => subscriptions.map((sub) => sub.id), [subscriptions]);

  const filtered = useMemo(() => {
    return promotions.filter((promo) => resolveFilter(promo, filter));
  }, [filter, promotions]);

  return (
    <main className="px-5 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-3 select-none">
      {/* 1. 상단 텍스트 */}
      <div className="pb-3.5">
        <p className="text-[13px] text-gray-500 font-medium">
          내 구독 패턴에 맞춘 알뜰 환승 프로모션과 엄선 제휴 혜택이에요
        </p>
      </div>

      {/* 2. 최상단 히어로 시각화 스와이프 캐러셀 */}
      <div className="mb-6">
        <VisualPromoCarousel
          promotions={promotions}
          onOpenPromotion={onOpenPromotion}
        />
      </div>

      {/* 3. 심플 필터 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none mb-3" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {filters.map((item) => {
          const isSelected = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#111827] text-white shadow-xs"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* 4. 열린 에디토리얼 프로모션 리스트 (박스형 카드 제거, 깔끔한 헤어라인 리스트) */}
      <section className="divide-y divide-gray-100/80 border-t border-gray-100/80">
        {filtered.map((promotion) => {
          const isTargetMatched = promotion.sourceServiceIds?.some((id) => ownedIds.includes(id));
          const promoId = promotion.id.toLowerCase();
          const targetService =
            promoId.includes("youtube") ? "youtube" :
            promoId.includes("spotify") ? "spotify" :
            promoId.includes("watcha") ? "watcha" :
            promoId.includes("tving") ? "tving" :
            promoId.includes("disney") ? "disney" :
            promoId.includes("millie") ? "millie" :
            promoId.includes("adobe") ? "adobe" :
            promoId.includes("flo") ? "flo" :
            promoId.includes("nerget") || promoId.includes("lgu") ? "uplus" :
            promotion.sourceServiceIds?.[0] || promotion.id.split("-")[0];

          return (
            <div
              key={promotion.id}
              onClick={() => onOpenPromotion(promotion)}
              className="py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/40 transition-colors"
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                <ServiceMark
                  serviceId={targetService}
                  name={targetService}
                  monogram={promotion.monogram || promotion.title.slice(0, 1)}
                  category={promotion.category}
                  className="h-11 w-11 rounded-full"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-sm">
                      {promotion.kind}
                    </span>
                    {isTargetMatched && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-sm">
                        <Sparkles size={10} /> 추천
                      </span>
                    )}
                  </div>
                  <h3 className="text-[15px] font-bold text-black tracking-tight mt-0.5 truncate">
                    {promotion.title}
                  </h3>
                  <p className="text-[12px] text-gray-400 mt-0.5 truncate leading-tight">
                    {promotion.description}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <strong className="block text-[15px] font-black text-[#111827] tracking-tight">
                  {promotion.offerPrice === 0 ? "0원 무료" : formatWon(promotion.offerPrice)}
                </strong>
                <span className="block text-[11px] font-bold text-[#3182F6] mt-0.5">
                  {formatWon(promotion.saving)} 절약
                </span>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
