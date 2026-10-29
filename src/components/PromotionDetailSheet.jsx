import { BottomSheet, Button, ServiceLogo } from "./ui";
import {
  formatDisplayText,
  formatVerifiedDate,
  formatWon,
  getEligibilityNote,
  getLimitedPeriodLabel,
  getVerifiedAt,
  isBundlePromotion,
} from "../lib/promotionFilters";

/** 혜택에 걸린 서비스 로고. 결합 혜택은 멤버십 쪽을 먼저 겹쳐 보여준다(최대 3개). */
export function PromotionLogos({ promotion, serviceCatalog = [], size = 36 }) {
  const ids = promotion?.sourceServiceIds?.length ? [...promotion.sourceServiceIds] : [String(promotion?.id || "").split("-")[0]];
  const ordered = (isBundlePromotion(promotion) ? ids.reverse() : ids.slice(0, 1)).slice(0, 3);
  return (
    <span className="flex shrink-0 items-center">
      {ordered.map((id, index) => {
        const service = serviceCatalog.find((s) => s.id === id);
        return (
          <span
            key={id}
            className={"inline-flex rounded-[25%] ring-2 ring-gray-50" + (index > 0 ? " -ml-1.5" : "")}
          >
            <ServiceLogo serviceId={id} name={service?.name || promotion?.title} monogram={promotion?.monogram} size={size} />
          </span>
        );
      })}
    </span>
  );
}

function SheetRow({ label, children, strong = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="shrink-0 text-[15px] leading-[22px] text-ink-muted">{label}</dt>
      <dd
        className={
          "min-w-0 text-right text-[15px] leading-[22px] tabular-nums break-keep " +
          (strong ? "font-semibold text-ink" : "font-medium text-ink")
        }
      >
        {children}
      </dd>
    </div>
  );
}

/** C2 혜택 상세 시트. 사실을 행으로 나열하고 잉크색 주요 버튼 하나를 둔다. */
export function PromotionDetailSheet({ promotion, serviceCatalog = [], onClose, onOpenPromotion }) {
  if (!promotion) return null;
  const saving = promotion.monthlySaving;
  const verified = formatVerifiedDate(getVerifiedAt(promotion));
  const rawTitle = promotion.subtitle || promotion.title;
  const title = formatDisplayText(rawTitle);
  const kind = promotion.kind && promotion.kind !== rawTitle ? formatDisplayText(promotion.kind) : null;
  const eligibility = promotion.eligibilityNote ?? getEligibilityNote(promotion);
  const period = getLimitedPeriodLabel(promotion);
  const hasPrices = Boolean(saving) && Number(promotion.originalPrice) > 0 && Number.isFinite(Number(promotion.offerPrice));

  return (
    <BottomSheet onClose={onClose} label={title + " 혜택 자세히 보기"}>
      <div className="pt-2">
        <PromotionLogos promotion={promotion} serviceCatalog={serviceCatalog} size={40} />
        <p className="mt-3 text-[13px] font-medium text-ink-tertiary">{formatDisplayText(promotion.title)}</p>
        <h2 className="mt-1 break-keep text-[20px] font-bold leading-[28px] tracking-[-0.03em] text-ink">{title}</h2>
        {promotion.description && (
          <p className="mt-2 break-keep text-[14px] leading-[21px] text-ink-muted">{formatDisplayText(promotion.description)}</p>
        )}
      </div>

      <dl className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
        {kind && <SheetRow label="혜택">{kind}</SheetRow>}
        {eligibility && <SheetRow label="대상">{eligibility}</SheetRow>}
        {period && <SheetRow label="할인 기간">{period}</SheetRow>}
        {hasPrices && <SheetRow label="정가">{"월 " + formatWon(promotion.originalPrice)}</SheetRow>}
        {hasPrices && <SheetRow label="혜택가">{"월 " + formatWon(promotion.offerPrice)}</SheetRow>}
        {saving?.memberships?.map((m) => (
          <SheetRow key={m.id} label="필요한 멤버십">{m.name + " 월 " + formatWon(m.price)}</SheetRow>
        ))}
        {saving && <SheetRow label="매달 아끼는 금액" strong>{formatWon(saving.amount)}</SheetRow>}
        {promotion.benefitPeriod && <SheetRow label="혜택 기간">{formatDisplayText(promotion.benefitPeriod)}</SheetRow>}
        {promotion.campaignPeriod && <SheetRow label="진행 기간">{formatDisplayText(promotion.campaignPeriod)}</SheetRow>}
        {verified && <SheetRow label="확인한 날">{verified + "에 확인"}</SheetRow>}
      </dl>
      {saving?.memberships?.length > 0 && (
        <p className="mt-1 text-[12px] leading-[18px] text-ink-tertiary">멤버십 요금을 뺀 금액이에요.</p>
      )}

      <div className="mt-5">
        {promotion.link ? (
          <Button
            variant="primary"
            size="large"
            fullWidth
            onClick={() => {
              onOpenPromotion?.(promotion);
              onClose?.();
            }}
          >
            혜택 페이지 열기
          </Button>
        ) : (
          <Button variant="secondary" size="large" fullWidth onClick={onClose}>
            닫기
          </Button>
        )}
      </div>
    </BottomSheet>
  );
}

