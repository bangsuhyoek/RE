import { useMemo, useState } from "react";
import { ArrowRight, BadgePercent, CircleDollarSign, ExternalLink, ShieldCheck, Sparkles, TrendingDown } from "lucide-react";
import { Button, Chip, ServiceMark, CategoryBadge } from "./ui";
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight text-fg-primary">맞춤 혜택 &amp; 프로모션</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">내 소비 패턴과 구독 서비스 기반으로 엄선한 절약 기회예요.</p>
        </div>
      </div>

      {/* 절약 시뮬레이션 카드 */}
      <section className="mt-5 rounded-[24px] bg-surface-inverse p-5 text-fg-inverse shadow-[0_4px_20px_rgba(34,45,34,0.18)] border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-palette-eucalyptus-sage-400">
            <TrendingDown size={16} />
            <span className="text-[12px] font-semibold">내 구독 기준 절약 시뮬레이션</span>
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-xs">
            실시간 큐레이션
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between border-b border-white/10 pb-4">
          <div>
            <span className="text-[11px] text-white/60">최대 환승 절약 가능</span>
            <strong className="mt-1 block text-[28px] font-extrabold tracking-tight text-white">
              {totalPotentialSaving > 0 ? formatWon(totalPotentialSaving) : formatWon(maxSaving)}
              <span className="text-[13px] font-medium text-white/70"> /월 절약</span>
            </strong>
          </div>
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-3 text-[12px]">
          <div className="rounded-xl bg-white/[0.06] p-2.5">
            <span className="block text-[10px] text-white/60">발견된 혜택</span>
            <strong className="mt-0.5 block text-[14px] font-bold text-white">{filtered.length}개</strong>
          </div>
          <div className="rounded-xl bg-white/[0.06] p-2.5">
            <span className="block text-[10px] text-white/60">최대 할인율</span>
            <strong className="mt-0.5 block text-[14px] font-bold text-palette-eucalyptus-sage-400">최대 99%</strong>
          </div>
        </div>
      </section>

      {/* 탭 필터 */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((item) => (
          <Chip
            key={item.id}
            selected={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Chip>
        ))}
      </div>

      {filtered.length > 0 ? (
        <section className="mt-5 space-y-4">
          {filtered.map((promotion) => {
            const isTargetMatched = promotion.sourceServiceIds.some((id) => ownedIds.includes(id));
            const serviceId = promotion.id.split("-")[0];
            return (
              <article key={promotion.id} className="relative rounded-2xl border border-border-subtle bg-surface-default p-4.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all hover:border-border-default hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-surface-subtle px-2 py-0.5 text-[11px] font-bold text-fg-secondary">{promotion.kind}</span>
                    {isTargetMatched && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface-brand px-2 py-0.5 text-[11px] font-bold text-fg-inverse shadow-2xs">
                        <Sparkles size={11} /> 내 구독 추천
                      </span>
                    )}
                  </div>
                  <span className="rounded-md border border-status-urgent-border bg-status-urgent-bg px-2 py-0.5 text-[11px] font-bold text-status-urgent-fg">
                    D-{promotion.dday}
                  </span>
                </div>

                <div className="mt-4 flex gap-3">
                  <ServiceMark
                    serviceId={serviceId}
                    name={promotion.title}
                    monogram={promotion.monogram || promotion.title.slice(0, 1)}
                    image={promotion.image}
                    category={promotion.category}
                    className="h-12 w-12 rounded-2xl text-[14px]"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[16px] font-bold tracking-tight text-fg-primary">{promotion.title}</h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{promotion.description}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between rounded-xl border border-border-subtle/80 bg-surface-inset px-3.5 py-2.5">
                  <div>
                    <span className="block text-[10px] font-semibold text-fg-subtle">혜택가</span>
                    <strong className="mt-0.5 block text-[16px] font-extrabold tracking-tight text-fg-primary">
                      {promotion.offerPrice === 0 ? "0원 무료" : formatWon(promotion.offerPrice)}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="block text-[11px] text-fg-subtle line-through">{formatWon(promotion.originalPrice)}</span>
                    <strong className="mt-0.5 block text-[13px] font-bold text-fg-brand">
                      {formatWon(promotion.saving)} 절약
                    </strong>
                  </div>
                </div>

                <Button fullWidth variant={isTargetMatched ? "brand" : "primary"} className="mt-3.5" onClick={() => onOpenPromotion(promotion)}>
                  {isTargetMatched ? "혜택 받고 갈아타기" : "혜택 바로보기"} <ArrowRight size={15} />
                </Button>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="mt-16 flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-[24px] bg-surface-subtle text-fg-muted"><BadgePercent size={26} /></span>
          <h2 className="mt-5 text-[18px] font-bold text-fg-primary">선택한 조건의 혜택이 없습니다</h2>
          <p className="mt-2 max-w-[260px] text-[13px] leading-relaxed text-fg-muted">다른 필터를 선택하거나 전체 혜택을 확인해 보세요.</p>
          <Button variant="secondary" size="compact" className="mt-4" onClick={() => setFilter("all")}>전체 혜택 보기</Button>
        </section>
      )}

      <section className="mt-6 flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-inset p-4">
        <ShieldCheck className="shrink-0 text-fg-brand" size={20} />
        <p className="text-[12px] leading-relaxed text-fg-muted">혜택을 이용하기 전 유효 기간과 가입 조건을 한 번 더 확인해 주세요. 공식 제휴 페이지로 안전하게 이동합니다.</p>
      </section>
    </main>
  );
}
