import { useMemo, useState } from "react";
import { ArrowRight, BadgePercent, CircleDollarSign } from "lucide-react";
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
  if (filter === "OTT") return promotion.category === "OTT";
  if (filter === "통신사/결합") return promotion.category === "통신사/결합";
  if (filter === "학생/연간") return promotion.category === "학생/연간" || String(promotion.kind || "").includes("연간") || String(promotion.kind || "").includes("학생");
  return true;
}

export function PromotionScreen({ subscriptions, promotions = [], onOpenPromotion }) {
  const [filter, setFilter] = useState("all");
  const ownedIds = useMemo(() => subscriptions.map((subscription) => subscription.id), [subscriptions]);
  const eligible = useMemo(
    () => promotions.filter((promotion) => promotion.sourceServiceIds?.some((id) => ownedIds.includes(id))),
    [ownedIds, promotions]
  );
  const filtered = useMemo(() => eligible.filter((promotion) => resolveFilter(promotion, filter)), [eligible, filter]);
  const totalPotentialSaving = useMemo(
    () => eligible.reduce((sum, promotion) => sum + Number(promotion.saving || 0), 0),
    [eligible]
  );

  return (
    <main className="px-5 pb-28 pt-6">
      <p className="re-eyebrow">BENEFITS</p>
      <h1 className="mt-1 text-[24px] font-bold tracking-[-0.02em] text-[#1B2A8C]">맞춤 혜택 &amp; 프로모션</h1>
      <p className="mt-2 text-[13px] leading-5 text-[#71717A]">등록한 구독과 연결되는 유효한 혜택만 보여드려요.</p>

      {eligible.length > 0 && (
        <section className="re-summary-card mt-5 rounded-2xl bg-[#18181B] p-4 text-white">
          <span className="text-[12px] font-medium text-white/70">현재 연결된 혜택 기준 예상 절약</span>
          <strong className="mt-2 block text-[24px] font-bold text-white">{formatWon(totalPotentialSaving)}</strong>
          <p className="mt-1 text-[11px] text-white/60">실제 적용 금액과 조건은 혜택 상세에서 다시 확인해 주세요.</p>
        </section>
      )}

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`shrink-0 rounded-full border px-3 py-2 text-[12px] font-semibold transition-colors ${filter === item.id ? "border-black bg-black text-white" : "border-[#E4E4E7] bg-white text-[#71717A] hover:border-[#A1A1AA]"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <section className="mt-5 space-y-4">
          {filtered.map((promotion) => (
            <article key={promotion.id} className="re-surface-card relative rounded-2xl border border-[#E4E4E7] bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-1.5"><span className="rounded-[4px] bg-[#F4F4F5] px-2 py-1 text-[11px] font-bold text-[#71717A]">{promotion.kind || "혜택"}</span><span className="rounded-[4px] bg-black px-2 py-1 text-[11px] font-bold text-white">내 구독 추천</span></div>
                {Number.isFinite(Number(promotion.dday)) && <span className="rounded-[4px] border border-black px-2 py-1 text-[11px] font-bold">D-{promotion.dday}</span>}
              </div>

              <div className="mt-4 flex gap-3">
                <ServiceMark monogram={promotion.monogram || promotion.title?.slice(0, 1)} className="h-11 w-11 rounded-xl text-[13px]" />
                <div className="min-w-0 flex-1"><h2 className="text-[16px] font-semibold tracking-[-0.01em]">{promotion.title}</h2><p className="mt-1 text-[13px] leading-5 text-[#71717A]">{promotion.description}</p></div>
              </div>

              {(promotion.offerPrice !== undefined || promotion.saving !== undefined) && (
                <div className="mt-4 flex items-end justify-between rounded-xl bg-[#FAFAFA] px-3.5 py-3">
                  <div><span className="block text-[11px] text-[#71717A]">혜택가</span><strong className="mt-0.5 block text-[16px] font-bold text-black">{formatWon(promotion.offerPrice || 0)}</strong></div>
                  <div className="text-right">{promotion.originalPrice !== undefined && <span className="block text-[11px] text-[#A1A1AA] line-through">{formatWon(promotion.originalPrice)}</span>}{promotion.saving !== undefined && <strong className="mt-0.5 block text-[13px] font-semibold text-black">{formatWon(promotion.saving)} 절약</strong>}</div>
                </div>
              )}

              <Button className="mt-4 w-full" onClick={() => onOpenPromotion(promotion)}>혜택 보기 <ArrowRight size={16} /></Button>
            </article>
          ))}
        </section>
      ) : (
        <section className="re-surface-card mt-12 flex flex-col items-center rounded-[24px] border border-[#E4E4E7] bg-white px-6 py-10 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-[24px] bg-[#F4F4F5]"><BadgePercent size={26} /></span>
          <h2 className="mt-5 text-[18px] font-semibold text-[#1B2A8C]">현재 연결된 혜택이 없어요</h2>
          <p className="mt-2 max-w-[280px] text-[13px] leading-5 text-[#71717A]">실제 프로모션 데이터가 연결되면, 구독 중인 서비스와 일치하는 유효한 혜택만 여기에 표시돼요.</p>
          {filter !== "all" && <Button variant="secondary" size="compact" className="mt-4" onClick={() => setFilter("all")}>전체 혜택 보기</Button>}
        </section>
      )}

      <section className="mt-6 flex gap-3 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] p-4">
        <CircleDollarSign className="mt-0.5 shrink-0" size={19} />
        <p className="text-[12px] leading-5 text-[#71717A]">혜택이 표시되더라도 유효 기간, 가입 조건, 실제 결제 금액은 외부 공식 페이지에서 다시 확인해 주세요.</p>
      </section>
    </main>
  );
}
