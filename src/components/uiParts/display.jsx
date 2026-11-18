import { ChevronRight, Pin } from "lucide-react";

import { getCachedCatalog } from "../../data/catalogLoader";
import { daysUntilCharge, formatWonText } from "../../lib/dates";
import { cx } from "./cx";
import { ServiceMark } from "./logo";

// D-day 규칙(C2): 배지 없이 글자로만 쓴다. 3일 이내(오늘 포함)는 빨강, 그 외는 회색.
// 알림 센터는 이 톤을 그대로 가져다 쓴다(테두리는 투명).
export const DDAY_BADGE_TONE = {
  urgent: "border-transparent bg-transparent text-danger",
  normal: "border-transparent bg-transparent text-ink-tertiary",
};

export function getDDayLabel(subscription) {
  const days = daysUntilCharge(subscription);
  const isTrial = subscription.isTrial || subscription.status === "trial";
  return {
    days,
    urgent: days <= 3,
    label: (isTrial ? "무료 " : "") + (days === 0 ? "오늘" : "D-" + days),
  };
}

export function DDayText({ subscription, className = "" }) {
  const { urgent, label } = getDDayLabel(subscription);
  return (
    <span
      className={cx(
        "inline-block shrink-0 whitespace-nowrap text-[13px] leading-[18px] tabular-nums tracking-tight",
        urgent ? "font-semibold text-danger" : "font-normal text-ink-tertiary",
        className,
      )}
    >
      {label}
    </span>
  );
}

/** 예전 이름. 이제 배지가 아니라 글자로 그린다. */
export function DDayBadge({ subscription, className = "" }) {
  return <DDayText subscription={subscription} className={className} />;
}

/**
 * C2 섹션 머리말. 18px 굵은 제목 + 오른쪽 회색 텍스트 버튼(선택).
 */
export function SectionHeader({ title, actionLabel, onAction, trailing = null, className = "" }) {
  return (
    <div className={cx("flex items-center justify-between px-5 pb-1 pt-6", className)}>
      <h2 className="text-[18px] font-bold leading-[26px] tracking-[-0.025em] text-ink">{title}</h2>
      {trailing}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="relative -mr-1 inline-flex min-h-[44px] items-center gap-0.5 px-1 text-[14px] font-medium text-ink-tertiary hover:text-ink-secondary"
        >
          {actionLabel}
          <ChevronRight size={16} strokeWidth={2} className="text-ink-subtle" />
        </button>
      )}
    </div>
  );
}

/** C2 구획 띠. 큰 묶음 사이를 12px 회색 면으로 나눈다(토스·당근 방식). */
export function SectionBand({ className = "" }) {
  // 너비를 고정하지 않아서 시트 안에서 -mx-5 를 주면 좌우 끝까지 닿는다.
  return <div className={cx("block h-3 bg-gray-100", className)} aria-hidden="true" />;
}

/**
 * C2 리스트 행. 왼쪽 로고(40px), 가운데 제목 16 + 보조 13, 오른쪽 금액 16 굵게 + 보조 13.
 * onClick 이 있으면 버튼으로 그리고 withArrow 로 화살표를 붙일 수 있다.
 */
export function ListRow({
  leading = null,
  title,
  titleAccessory = null,
  subtitle = null,
  trailingTitle = null,
  trailingSubtitle = null,
  withArrow = false,
  onClick,
  className = "",
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cx(
        "flex min-h-[68px] w-full items-center gap-3.5 px-5 py-3 text-left",
        onClick && "cursor-pointer transition-colors hover:bg-gray-50 active:bg-gray-100",
        className,
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {/* 큰 글씨에서도 뜻이 보이도록 제목은 두 줄까지 단어 단위로 줄바꿈한다. */}
          <span className="line-clamp-2 break-keep text-[16px] font-medium leading-[22px] tracking-tight text-ink">{title}</span>
          {titleAccessory}
        </div>
        {subtitle && (
          <div className="mt-0.5 truncate text-[13px] leading-[18px] tracking-tight text-ink-tertiary">{subtitle}</div>
        )}
      </div>
      {(trailingTitle || trailingSubtitle) && (
        <div className="shrink-0 text-right">
          {trailingTitle && (
            <div className="text-[16px] font-semibold leading-[22px] tabular-nums tracking-tight text-ink">{trailingTitle}</div>
          )}
          {trailingSubtitle && <div className="mt-0.5 text-[13px] leading-[18px] text-ink-tertiary">{trailingSubtitle}</div>}
        </div>
      )}
      {withArrow && <ChevronRight size={18} strokeWidth={1.8} className="shrink-0 text-ink-subtle" aria-hidden="true" />}
    </Tag>
  );
}

export function getSubscriptionDisplayAmount(subscription) {
  if (subscription?.amount && Number(subscription.amount) > 0) {
    return Number(subscription.amount);
  }
  if (subscription?.regularAmount) return Number(subscription.regularAmount);
  if (subscription?.expectedAmount) return Number(subscription.expectedAmount);
  if (subscription?.normalAmount) return Number(subscription.normalAmount);

  // 0원인 무료체험(프로모션) 구독인 경우 카탈로그에서 정상 결제 예정 금액 탐색
  const cleanName = (subscription?.name || "").toLowerCase().trim();
  const cleanId = (subscription?.id || "").toLowerCase().trim();
  const catalog = getCachedCatalog()?.serviceCatalog || [];
  const matched = catalog.find(
    (s) => s.id === cleanId || s.name.toLowerCase() === cleanName || cleanName.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(cleanName)
  );
  if (matched) {
    if (subscription?.plan && Array.isArray(matched.availablePlans)) {
      const planMatched = matched.availablePlans.find((p) => p.plan === subscription.plan);
      if (planMatched && planMatched.amount) return planMatched.amount;
    }
    if (matched.amount) return matched.amount;
  }
  return Number(subscription?.amount || 0);
}

export function SubscriptionCard({
  subscription,
  onOpen,
  onTogglePin,
  variant = "card",
  className = "",
}) {
  const isGrouped = variant === "grouped";
  const monogram = subscription.monogram || subscription.name?.slice(0, 1) || "S";
  const isPinned = Boolean(subscription.isPinned || subscription.pinned);
  const displayAmount = getSubscriptionDisplayAmount(subscription);
  const cycleLabel = subscription.billingCycle === "매년" ? "매년" : "매월";

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className={cx(
        "flex w-full min-h-[68px] items-center justify-between gap-3 text-left transition-colors cursor-pointer group/card focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink",
        isGrouped
          ? "py-3 bg-transparent hover:bg-gray-50 active:bg-gray-100"
          : "px-5 py-3 bg-white hover:bg-gray-50 active:bg-gray-100",
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <ServiceMark
          serviceId={subscription.serviceId || subscription.id}
          name={subscription.name}
          monogram={monogram}
          image={subscription.image || subscription.attachments?.[0]}
          className="h-10 w-10"
        />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-medium leading-[22px] tracking-tight text-ink">
            {subscription.name}
          </span>
          <p className="mt-0.5 truncate text-[13px] leading-[18px] tracking-tight text-ink-tertiary">
            {subscription.plan || "기본 플랜"} · {cycleLabel}{subscription.paymentMethod ? ` · ${subscription.paymentMethod}` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <div className="text-right">
          <span className="block text-[16px] font-semibold leading-[22px] tabular-nums tracking-tight text-ink">
            {formatWonText(displayAmount)}
          </span>
          <DDayText subscription={subscription} className="mt-0.5" />
        </div>

        {onTogglePin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(subscription.subscriptionId || subscription.id);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
            className={cx(
              "relative ml-1 p-1.5 rounded-full transition-colors cursor-pointer before:absolute before:-inset-2 before:content-['']",
              isPinned
                ? "text-ink hover:bg-gray-100"
                : "text-ink-subtle hover:text-ink-muted hover:bg-gray-100"
            )}
            title={isPinned ? "상단 고정 해제" : "상단에 고정 강조"}
            aria-label={isPinned ? "상단 고정 해제" : "상단에 고정 강조"}
          >
            <Pin size={16} className={isPinned ? "fill-ink text-ink" : ""} />
          </button>
        )}
      </div>
    </div>
  );
}
