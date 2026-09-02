import { useMemo, useState } from "react";
import { ArrowRight, BadgePercent, CircleDollarSign, Sparkles } from "lucide-react";
import { Button, ServiceMark } from "./ui";
import { formatWon } from "../lib/dates";

const filters = [
  { id: "all", label: "전체 혜택" },
  { id: "OTT", label: "OTT 환승" },
  { id: "annual", label: "연간 할인" },
  { id: "bundle", label: "통신사 결합" },
];

function resolveFilter(promotion, filter) {
  if (filter === "all") return true;
  if (filter === "OTT") return promotion.category === "OTT" && promotion.kind === "환승 특가";
  if (filter === "annual") return promotion.kind === "연간 할인";
  return promotion.category === "통신사 결합";
}

export function PromotionScreen({ subscriptions, promotions, onOpenPromotion }) {
  const [filter, setFilter] = useState("all");
  const ownedIds = subscriptions.map((subscription) => subscription.id);
  const matched = useMemo(() => promotions.filter((promotion) => promotion.sourceServiceIds.some((id) => ownedIds.includes(id))).filter((promotion) => resolveFilter(promotion, filter)), [filter, ownedIds, promotions]);

  return (
    <main className="px-5 pb-28 pt-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#71717A]">Curated for you</p>
      <h1 className="mt-1 text-[24px] font-bold tracking-[-0.02em]">맞춤 혜택 &amp; 프로모션</h1>
      <p className="mt-3 text-[14px] leading-6 text-[#71717A]">현재 쓰는 구독을 기준으로 더 저렴한 대안과 유효한 혜택만 모았어요.</p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((item) => <button type="button" key={item.id} onClick={() => setFilter(item.id)} className={`shrink-0 rounded-full border px-3 py-2 text-[12px] font-semibold transition-colors ${filter === item.id ? "border-black bg-black text-white" : "border-[#E4E4E7] bg-white text-[#71717A] hover:border-[#A1A1AA]"}`}>{item.label}</button>)}
      </div>

      {subscriptions.length === 0 ? (
        <section className="mt-16 flex flex-col items-center text-center"><span className="grid h-16 w-16 place-items-center rounded-[24px] bg-[#F4F4F5]"><Sparkles size={27} /></span><h2 className="mt-5 text-[18px] font-semibold">아직 맞춤 혜택이 없어요</h2><p className="mt-2 max-w-[260px] text-[13px] leading-5 text-[#71717A]">구독 서비스를 등록하면 관련 프로모션을 정확하게 찾아드릴게요.</p></section>
      ) : matched.length ? (
        <section className="mt-6 space-y-4">
          {matched.map((promotion) => <article key={promotion.id} className="rounded-2xl border border-[#E4E4E7] bg-white p-4">
            <div className="flex items-start justify-between gap-4"><span className="rounded-[4px] bg-[#F4F4F5] px-2 py-1 text-[11px] font-bold text-[#71717A]">{promotion.kind}</span><span className="rounded-[4px] border border-black px-2 py-1 text-[11px] font-bold">D-{promotion.dday}</span></div>
            <div className="mt-4 flex gap-3"><ServiceMark monogram={promotion.monogram} className="h-11 w-11 rounded-xl text-[13px]" /><div className="min-w-0 flex-1"><h2 className="text-[17px] font-semibold tracking-[-0.01em]">{promotion.title}</h2><p className="mt-1 text-[13px] leading-5 text-[#71717A]">{promotion.description}</p></div></div>
            <div className="mt-5 flex items-end justify-between rounded-xl bg-[#FAFAFA] px-3 py-3"><span><span className="block text-[11px] text-[#71717A]">혜택가</span><strong className="mt-0.5 block text-[16px]">{formatWon(promotion.offerPrice)}</strong></span><span className="text-right"><span className="block text-[11px] text-[#71717A] line-through">{formatWon(promotion.originalPrice)}</span><strong className="mt-1 block text-[13px]">{formatWon(promotion.saving)} 절약</strong></span></div>
            <Button className="mt-4 w-full" onClick={() => onOpenPromotion(promotion)}>혜택 받고 갈아타기 <ArrowRight size={16} /></Button>
          </article>)}
        </section>
      ) : (
        <section className="mt-16 flex flex-col items-center text-center"><span className="grid h-16 w-16 place-items-center rounded-[24px] bg-[#F4F4F5]"><BadgePercent size={26} /></span><h2 className="mt-5 text-[18px] font-semibold">진행 중인 혜택이 없습니다</h2><p className="mt-2 max-w-[260px] text-[13px] leading-5 text-[#71717A]">현재 필터 조건에 맞는 프로모션을 찾지 못했어요. 곧 다시 확인해볼게요.</p></section>
      )}

      <section className="mt-6 flex gap-3 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] p-4"><CircleDollarSign className="mt-0.5 shrink-0" size={19} /><p className="text-[12px] leading-5 text-[#71717A]">혜택을 이용하기 전에는 유효 기간과 가입 조건을 한 번 더 확인해 주세요. 외부 제휴 페이지로 이동할 수 있어요.</p></section>
    </main>
  );
}
