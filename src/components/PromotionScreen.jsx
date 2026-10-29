import { useMemo, useState } from "react";
import { Button, Chip, ListRow, SectionBand, SectionHeader, ServiceLogo } from "./ui";
import { PromotionDetailSheet, PromotionLogos } from "./PromotionDetailSheet";
import { getCachedCatalog } from "../data/catalogLoader";
import {
  buildPromotionCandidates,
  buildPromotionFilters,
  buildSecondaryLine,
  formatDisplayText,
  formatWon,
  isBundlePromotion,
  latestVerifiedDate,
  pickTopPromotion,
  resolveFilter,
  splitPromotionSections,
} from "../lib/promotionFilters";

const normalizeKey = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");

/** 행에 쓰는 제목·보조 줄. 결합 혜택은 혜택 문구를, 단일 서비스는 서비스 이름을 제목으로 쓴다. */
function getRowCopy(promotion) {
  if (isBundlePromotion(promotion)) {
    const title = promotion.subtitle || promotion.title;
    const base = promotion.kind && promotion.kind !== title ? promotion.kind : promotion.title;
    return { title: formatDisplayText(title), subtitle: buildSecondaryLine(promotion, base) };
  }
  const subtitle = promotion.subtitle && promotion.subtitle !== promotion.title ? promotion.subtitle : promotion.kind;
  return { title: formatDisplayText(promotion.title), subtitle: buildSecondaryLine(promotion, subtitle) };
}

function SavingText({ amount }) {
  return (
    <>
      {formatWon(amount)} <span className="font-medium text-ink-muted">절약</span>
    </>
  );
}

function PromotionRow({ promotion, serviceCatalog, onOpen }) {
  const { title, subtitle } = getRowCopy(promotion);
  const serviceId = promotion.sourceServiceIds?.[0] || String(promotion.id || "").split("-")[0];
  const service = serviceCatalog.find((s) => s.id === serviceId);
  return (
    <ListRow
      leading={<ServiceLogo serviceId={serviceId} name={service?.name || promotion.title} monogram={promotion.monogram} />}
      title={title}
      subtitle={subtitle}
      trailingTitle={promotion.monthlySaving ? <SavingText amount={promotion.monthlySaving.amount} /> : null}
      onClick={() => onOpen(promotion)}
    />
  );
}

function TopPick({ promotion, serviceCatalog, onOpenPromotion }) {
  const rawTitle = promotion.subtitle || promotion.title;
  const title = formatDisplayText(rawTitle);
  const detail = promotion.kind && promotion.kind !== rawTitle ? promotion.kind : promotion.description;
  // 제목(혜택 문구)에 서비스 이름이 없으면 사실 줄 앞에 붙여서 어떤 서비스 혜택인지 바로 보이게 한다.
  const serviceName = promotion.title && !rawTitle.includes(promotion.title) ? formatDisplayText(promotion.title) : null;
  // 서비스 이름을 붙이면 혜택 설명(kind)은 제목과 겹치므로 빼고 대상·기간만 남긴다. 설명은 상세 시트에 있다.
  const fact = [serviceName, buildSecondaryLine(promotion, serviceName ? null : detail)].filter(Boolean).join(" · ");
  return (
    <section className="mx-5 mb-6 mt-4 rounded-2xl bg-gray-50 p-5">
      <p className="text-[13px] font-semibold text-ink-muted">가장 많이 아낄 수 있어요</p>
      <div className="mt-2 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="break-keep text-[20px] font-bold leading-[28px] tracking-[-0.03em] text-ink">{title}</h3>
          {fact && <p className="mt-1 line-clamp-2 break-keep text-[14px] leading-5 text-ink-muted">{fact}</p>}
        </div>
        <span className="mt-1">
          <PromotionLogos promotion={promotion} serviceCatalog={serviceCatalog} size={36} />
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3.5 text-[14px] text-ink-muted">
        <span>매달 아끼는 금액</span>
        <b className="font-semibold tabular-nums text-ink">{formatWon(promotion.monthlySaving.amount)}</b>
      </div>
      <Button variant="outline" fullWidth className="mt-4" onClick={() => onOpenPromotion(promotion)}>
        자세히 보기
      </Button>
    </section>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="px-5 py-16 text-center">
      <p className="text-[16px] font-semibold text-ink">{title}</p>
      <p className="mt-1 break-keep text-[14px] leading-[21px] text-ink-tertiary">{body}</p>
    </div>
  );
}

export function PromotionScreen({ catalog = null, subscriptions = [], promotions = [], onOpenPromotion }) {
  const isPersonalized = subscriptions.length > 0;
  const serviceCatalog = useMemo(() => catalog || getCachedCatalog()?.serviceCatalog || [], [catalog]);
  const [filter, setFilter] = useState("all");
  const [openedPromotion, setOpenedPromotion] = useState(null);

  // 내 구독을 카탈로그 서비스 id 와 카테고리로 바꾼다(이름·별칭으로도 찾는다).
  const { subscribedServiceIds, subscribedCategories } = useMemo(() => {
    const ids = new Set();
    const cats = new Set();
    subscriptions.forEach((sub) => {
      const sId = sub.service_id || sub.serviceId || sub.id;
      if (sId) ids.add(sId);
      const nameKey = normalizeKey(sub.name);
      const matched = serviceCatalog.find(
        (s) =>
          s.id === sId ||
          normalizeKey(s.name) === nameKey ||
          (s.aliases || []).some((a) => normalizeKey(a) === nameKey)
      );
      if (matched) ids.add(matched.id);
      const cat = matched?.category || sub.category;
      if (cat && cat !== "기타") cats.add(cat);
    });
    return { subscribedServiceIds: ids, subscribedCategories: cats };
  }, [subscriptions, serviceCatalog]);

  const candidates = useMemo(
    () =>
      buildPromotionCandidates(promotions, {
        personalized: isPersonalized,
        serviceCatalog,
        subscribedServiceIds,
        subscribedCategories,
      }),
    [isPersonalized, promotions, serviceCatalog, subscribedServiceIds, subscribedCategories]
  );

  const filters = useMemo(() => buildPromotionFilters({ personalized: isPersonalized }), [isPersonalized]);
  const activeFilter = filters.some((f) => f.id === filter) ? filter : "all";

  const filtered = useMemo(
    () => candidates.filter((promo) => resolveFilter(promo, activeFilter)),
    [candidates, activeFilter]
  );
  const topPick = useMemo(() => pickTopPromotion(filtered), [filtered]);
  const { subscribed, discover } = useMemo(
    () => splitPromotionSections(filtered.filter((p) => p !== topPick)),
    [filtered, topPick]
  );
  const verifiedDate = useMemo(() => latestVerifiedDate(filtered), [filtered]);
  const showsAmount = filtered.some((p) => p.monthlySaving);

  return (
    <main className="select-none bg-white pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <p className="px-5 pt-1 text-[15px] leading-[22px] text-ink-muted">
        {isPersonalized ? "지금 쓰는 구독에 맞춰 골랐어요" : "구독을 추가하면 맞춰서 골라 드려요"}
      </p>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1 pt-4" role="group" aria-label="혜택 필터">
        {filters.map((item) => (
          <Chip
            key={item.id}
            selected={activeFilter === item.id}
            aria-pressed={activeFilter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Chip>
        ))}
      </div>

      {candidates.length === 0 ? (
        <EmptyState
          title="지금 확인된 혜택이 없어요"
          body="기간이 끝났거나 아직 확인하고 있는 혜택이에요. 새로 확인되면 여기에 보여 드릴게요."
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="이 조건에 맞는 혜택이 없어요" body="다른 필터를 눌러 보세요." />
      ) : (
        <>
          {topPick ? (
            <TopPick promotion={topPick} serviceCatalog={serviceCatalog} onOpenPromotion={setOpenedPromotion} />
          ) : (
            <div className="h-4" aria-hidden="true" />
          )}

          {subscribed.length > 0 && (
            <>
              <SectionBand />
              <SectionHeader title="구독 중인 서비스 혜택" />
              {subscribed.map((promotion) => (
                <PromotionRow
                  key={promotion.id}
                  promotion={promotion}
                  serviceCatalog={serviceCatalog}
                  onOpen={setOpenedPromotion}
                />
              ))}
            </>
          )}

          {discover.length > 0 && (
            <>
              <SectionBand className={subscribed.length > 0 ? "mt-3" : ""} />
              <SectionHeader title="새로 시작하면 좋은 혜택" />
              {discover.map((promotion) => (
                <PromotionRow
                  key={promotion.id}
                  promotion={promotion}
                  serviceCatalog={serviceCatalog}
                  onOpen={setOpenedPromotion}
                />
              ))}
            </>
          )}

          {(showsAmount || verifiedDate) && (
            <p className="px-5 pt-4 text-[12px] leading-[18px] text-ink-tertiary">
              {showsAmount && "정가 기준으로 계산했어요. "}
              {verifiedDate && verifiedDate + "에 혜택 내용을 확인했어요."}
            </p>
          )}
        </>
      )}

      {openedPromotion && (
        <PromotionDetailSheet
          promotion={openedPromotion}
          serviceCatalog={serviceCatalog}
          onClose={() => setOpenedPromotion(null)}
          onOpenPromotion={onOpenPromotion}
        />
      )}
    </main>
  );
}

