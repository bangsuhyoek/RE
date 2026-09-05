import { useMemo, useState } from "react";
import { ArrowRight, CircleDollarSign } from "lucide-react";
import { Button, ServiceMark } from "./ui";
import { RiveCharacter } from "./RiveCharacter";
import { formatWon } from "../lib/dates";
import { serviceMarkToneClass } from "../lib/serviceBrand";

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
    <main className="re-benefit-page px-5 pb-28 pt-6">
      <header className="re-section-heading re-benefit-heading">
        <div>
          <p className="re-eyebrow">BENEFITS</p>
          <h1>맞춤 혜택 &amp; 프로모션</h1>
          <p>등록한 구독과 연결되는 유효한 혜택만 보여드려요.</p>
        </div>
      </header>

      {eligible.length > 0 && (
        <section className="re-benefit-summary re-summary-card mt-5 rounded-2xl p-4">
          <span>현재 연결된 혜택 기준 예상 절약</span>
          <strong>{formatWon(totalPotentialSaving)}</strong>
          <p>실제 적용 금액과 조건은 혜택 상세에서 다시 확인해 주세요.</p>
        </section>
      )}

      <div className="re-benefit-filters mt-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={filter === item.id ? "is-active" : ""}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <section className="re-benefit-grid mt-5">
          {filtered.map((promotion) => (
            <article key={promotion.id} className="re-benefit-card re-surface-card relative rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="re-benefit-chip">{promotion.kind || "혜택"}</span>
                  <span className="re-benefit-chip is-recommended">내 구독 추천</span>
                </div>
                {Number.isFinite(Number(promotion.dday)) && <span className="re-benefit-dday">D-{promotion.dday}</span>}
              </div>

              <div className="mt-4 flex gap-3">
                <ServiceMark monogram={promotion.monogram || promotion.title?.slice(0, 1)} className={`h-11 w-11 rounded-full text-[13px] ${serviceMarkToneClass(promotion)}`} />
                <div className="min-w-0 flex-1"><h2>{promotion.title}</h2><p>{promotion.description}</p></div>
              </div>

              {(promotion.offerPrice !== undefined || promotion.saving !== undefined) && (
                <div className="re-benefit-price mt-4 flex items-end justify-between rounded-xl px-3.5 py-3">
                  <div><span>혜택가</span><strong>{formatWon(promotion.offerPrice || 0)}</strong></div>
                  <div className="text-right">{promotion.originalPrice !== undefined && <span className="line-through">{formatWon(promotion.originalPrice)}</span>}{promotion.saving !== undefined && <strong>{formatWon(promotion.saving)} 절약</strong>}</div>
                </div>
              )}

              <Button className="mt-4 w-full" onClick={() => onOpenPromotion(promotion)}>혜택 보기 <ArrowRight size={16} /></Button>
            </article>
          ))}
        </section>
      ) : (
        <section className="re-benefit-empty re-surface-card mt-8 flex flex-col items-center rounded-[26px] px-6 py-10 text-center">
          <RiveCharacter state="idle" className="re-benefit-empty__character" />
          <h2>현재 연결된 혜택이 없어요</h2>
          <p>실제 프로모션이 연결되면, 지금 구독 중인 서비스와 맞는 유효한 혜택만 보여드릴게요.</p>
          {filter !== "all" && <Button variant="secondary" size="compact" className="mt-4" onClick={() => setFilter("all")}>전체 혜택 보기</Button>}
        </section>
      )}

      <section className="re-benefit-note mt-6 flex gap-3 rounded-2xl p-4">
        <CircleDollarSign className="mt-0.5 shrink-0" size={19} />
        <p>혜택이 표시되더라도 유효 기간, 가입 조건, 실제 결제 금액은 외부 공식 페이지에서 다시 확인해 주세요.</p>
      </section>
    </main>
  );
}
