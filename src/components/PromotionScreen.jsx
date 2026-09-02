import { useMemo, useState } from "react";
import { ArrowRight, BadgePercent, CircleDollarSign, ExternalLink, Sparkles, TrendingDown } from "lucide-react";
import { Button, ServiceMark } from "./ui";
import { formatWon } from "../lib/dates";

const filters = [
  { id: "all", label: "전체 혜택" },
  { id: "100원/무료", label: "100원 · 무료체험" },
  { id: "OTT", label: "OTT 환승" },
  { id: "통신사/결합", label: "통신사 결합" },
  { id: "학생/연간", label: "학생 · 연간할인" },
];

function resolveFilter(promotion, filter) {
  if (filter === "all") return true;
  if (filter === "100원/무료") return promotion.category === "100원/무료" || promotion.offerPrice === 0 || promotion.offerPrice === 100;
  if (filter === "OTT") return promotion.category === "OTT" || promotion.id.includes("watcha") || promotion.id.includes("tving") || promotion.id.includes("disney");
  if (filter === "통신사/결합") return promotion.category === "통신사/결합" || promotion.id.includes("bundle");
  if (filter === "학생/연간") return promotion.category === "학생/연간" || promotion.kind.includes("연간") || promotion.kind.includes("학생");
  return true;
}

export function PromotionScreen({ subscriptions, promotions, onOpenPromotion }) {
  const [filter, setFilter] = useState("all");
  const ownedIds = useMemo(() => subscriptions.map((sub) => sub.id), [subscriptions]);

  const maxSaving = useMemo(() => {
    return promotions.reduce((max, promo) => Math.max(max, promo.saving), 0);
  }, [promotions]);

  const totalPotentialSaving = useMemo(() => {
    const matched = promotions.filter((promo) => promo.sourceServiceIds.some((id) => ownedIds.includes(id)));
    return matched.reduce((sum, p) => sum + p.saving, 0);
  }, [ownedIds, promotions]);

  const filtered = useMemo(() => {
    return promotions.filter((promo) => resolveFilter(promo, filter));
  }, [filter, promotions]);

  return (
    <main className="px-5 pb-28 pt-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#71717A]">Curated for you</p>
      <h1 className="mt-1 text-[24px] font-bold tracking-[-0.02em]">맞춤 혜택 &amp; 프로모션</h1>
      <p className="mt-2 text-[13px] leading-5 text-[#71717A]">20대 인기 구독 서비스를 더 저렴하게 이용할 수 있는 실시간 혜택 모음이에요.</p>

      {/* 절약 시뮬레이션 카드 */}
      <section className="mt-5 rounded-2xl bg-[#18181B] p-4 text-white">
        <div className="flex items-center gap-2 text-[#A1A1AA]">
          <TrendingDown size={16} className="text-white" />
          <span className="text-[12px] font-medium">내 구독 기준 예상 절약 효과</span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <span className="text-[11px] text-[#71717A]">최대 환승 절약 가능</span>
            <strong className="mt-0.5 block text-[24px] font-bold text-white">
              {totalPotentialSaving > 0 ? formatWon(totalPotentialSaving) : formatWon(maxSaving)}
              <span className="text-[13px] font-normal text-white/70"> /월</span>
            </strong>
          </div>
          <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white">
            실시간 큐레이션
          </span>
        </div>
      </section>

      {/* 탭 필터 */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`shrink-0 rounded-full border px-3 py-2 text-[12px] font-semibold transition-colors ${
              filter === item.id ? "border-black bg-black text-white" : "border-[#E4E4E7] bg-white text-[#71717A] hover:border-[#A1A1AA]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <section className="mt-5 space-y-4">
          {filtered.map((promotion) => {
            const isTargetMatched = promotion.sourceServiceIds.some((id) => ownedIds.includes(id));
            return (
              <article key={promotion.id} className="relative rounded-2xl border border-[#E4E4E7] bg-white p-4 transition-all hover:border-[#A1A1AA]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-[4px] bg-[#F4F4F5] px-2 py-1 text-[11px] font-bold text-[#71717A]">{promotion.kind}</span>
                    {isTargetMatched && (
                      <span className="rounded-[4px] bg-black px-2 py-1 text-[11px] font-bold text-white">내 구독 추천</span>
                    )}
                  </div>
                  <span className="rounded-[4px] border border-black px-2 py-1 text-[11px] font-bold">D-{promotion.dday}</span>
                </div>

                <div className="mt-4 flex gap-3">
                  <ServiceMark monogram={promotion.monogram || promotion.title.slice(0, 1)} className="h-11 w-11 rounded-xl text-[13px]" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{promotion.title}</h2>
                    <p className="mt-1 text-[13px] leading-5 text-[#71717A]">{promotion.description}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between rounded-xl bg-[#FAFAFA] px-3.5 py-3">
                  <div>
                    <span className="block text-[11px] text-[#71717A]">혜택가</span>
                    <strong className="mt-0.5 block text-[16px] font-bold text-black">{formatWon(promotion.offerPrice)}</strong>
                  </div>
                  <div className="text-right">
                    <span className="block text-[11px] text-[#A1A1AA] line-through">{formatWon(promotion.originalPrice)}</span>
                    <strong className="mt-0.5 block text-[13px] font-semibold text-black">{formatWon(promotion.saving)} 절약</strong>
                  </div>
                </div>

                <Button className="mt-4 w-full" onClick={() => onOpenPromotion(promotion)}>
                  {isTargetMatched ? "혜택 받고 갈아타기" : "혜택 바로보기"} <ArrowRight size={16} />
                </Button>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="mt-16 flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-[24px] bg-[#F4F4F5]"><BadgePercent size={26} /></span>
          <h2 className="mt-5 text-[18px] font-semibold">선택한 조건의 혜택이 없습니다</h2>
          <p className="mt-2 max-w-[260px] text-[13px] leading-5 text-[#71717A]">다른 필터를 선택하거나 전체 혜택을 확인해 보세요.</p>
          <Button variant="secondary" size="compact" className="mt-4" onClick={() => setFilter("all")}>전체 혜택 보기</Button>
        </section>
      )}

      <section className="mt-6 flex gap-3 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] p-4">
        <CircleDollarSign className="mt-0.5 shrink-0" size={19} />
        <p className="text-[12px] leading-5 text-[#71717A]">혜택을 이용하기 전 유효 기간과 가입 조건을 한 번 더 확인해 주세요. 외부 제휴 페이지로 이동할 수 있습니다.</p>
      </section>
    </main>
  );
}
