import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BellOff,
  CalendarDays,
  Camera,
  CreditCard,
  Home,
  Plus,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";
import { daysUntilCharge, formatBillingDate, formatWon } from "../lib/dates";
import {
  PaymentIcon,
  PaymentMethodBadge,
  PAYMENT_PRESETS,
  PaymentMethodTriggerField,
  PaymentMethodPickerModal,
} from "./PaymentMethod";

export {
  PaymentIcon,
  PaymentMethodBadge,
  PAYMENT_PRESETS,
  PaymentMethodTriggerField,
  PaymentMethodPickerModal,
};

const cx = (...classes) => classes.filter(Boolean).join(" ");

export function LogoMark() {
  return null;
}

/**
 * SubMate x SEED Design System Category Philosophy
 * 지출 카테고리별 고유한 삶의 가치와 철학을 부여하고,
 * 유칼립투스 그로브 100색 매트릭스와 엄격한 접근성 페어링 규칙으로 설계된 토큰 맵.
 */
export const CATEGORY_PHILOSOPHY = {
  OTT: {
    label: "OTT",
    theme: "몰입과 휴식",
    desc: "지친 일상을 비우고 온전히 빠져드는 스크린의 여유",
    style: "bg-palette-indigo-50 text-palette-indigo-700 border-palette-indigo-200",
    chipActive: "bg-palette-indigo-700 text-white border-palette-indigo-700",
    dot: "bg-palette-indigo-500",
  },
  음악: {
    label: "음악",
    theme: "감성과 리듬",
    desc: "하루의 틈새를 채우는 나만의 감각적인 선율과 비트",
    style: "bg-palette-pink-50 text-palette-pink-700 border-palette-pink-200",
    chipActive: "bg-palette-pink-700 text-white border-palette-pink-700",
    dot: "bg-palette-pink-500",
  },
  생산성: {
    label: "생산성",
    theme: "명료함과 지적 성장",
    desc: "인지 부하를 덜고 지속 가능한 일과 성장을 돕는 도구",
    style: "bg-palette-eucalyptus-green-50 text-palette-eucalyptus-green-700 border-palette-eucalyptus-green-200",
    chipActive: "bg-palette-eucalyptus-green-700 text-white border-palette-eucalyptus-green-700",
    dot: "bg-palette-eucalyptus-green-500",
  },
  쇼핑: {
    label: "쇼핑",
    theme: "실속과 풍요",
    desc: "일상의 수고를 덜고 매월 확실한 가치와 절약을 회수하는 스마트함",
    style: "bg-palette-eucalyptus-sage-50 text-palette-eucalyptus-sage-800 border-palette-eucalyptus-sage-300",
    chipActive: "bg-palette-eucalyptus-sage-800 text-white border-palette-eucalyptus-sage-800",
    dot: "bg-palette-eucalyptus-sage-600",
  },
  도서: {
    label: "도서",
    theme: "사색과 지식 축적",
    desc: "소음을 걷어내고 내면의 시야를 넓히는 차분한 지식의 축적",
    style: "bg-palette-amber-50 text-palette-amber-800 border-palette-amber-200",
    chipActive: "bg-palette-amber-700 text-white border-palette-amber-700",
    dot: "bg-palette-amber-600",
  },
  클라우드: {
    label: "클라우드",
    theme: "투명한 신뢰",
    desc: "기록과 자산을 소리 없이 안전하게 지탱하는 인프라",
    style: "bg-palette-blue-50 text-palette-blue-700 border-palette-blue-200",
    chipActive: "bg-palette-blue-700 text-white border-palette-blue-700",
    dot: "bg-palette-blue-500",
  },
  게임: {
    label: "게임",
    theme: "유희와 성취",
    desc: "기분 좋은 긴장감과 상상력이 깨어나는 즐거운 도전",
    style: "bg-palette-purple-50 text-palette-purple-700 border-palette-purple-200",
    chipActive: "bg-palette-purple-700 text-white border-palette-purple-700",
    dot: "bg-palette-purple-500",
  },
  유틸리티: {
    label: "유틸리티",
    theme: "일상의 기반",
    desc: "생활의 마찰을 줄여주는 없어서는 안 될 기본 편의",
    style: "bg-palette-teal-50 text-palette-teal-700 border-palette-teal-200",
    chipActive: "bg-palette-teal-700 text-white border-palette-teal-700",
    dot: "bg-palette-teal-500",
  },
  기타: {
    label: "기타",
    theme: "취향의 발견",
    desc: "나만의 고유한 라이프스타일을 완성하는 특별한 경험",
    style: "bg-surface-subtle text-fg-secondary border-border-subtle",
    chipActive: "bg-surface-inverse text-fg-inverse border-surface-inverse",
    dot: "bg-fg-muted",
  },
};

export const CATEGORY_PALETTE_STYLES = Object.fromEntries(
  Object.entries(CATEGORY_PHILOSOPHY).map(([k, v]) => [k, v.style])
);

export const SERVICE_IMAGES = {
  netflix: "/assets/services/netflix.svg",
  youtube: "/assets/services/youtube.svg",
  coupang: "/assets/services/coupang.svg",
  spotify: "/assets/services/spotify.svg",
  chatgpt: "/assets/services/chatgpt.svg",
  tving: "/assets/services/tving.svg",
  disney: "/assets/services/disney.svg",
  millie: "/assets/services/millie.svg",
  adobe: "/assets/services/adobe.svg",
  watcha: "/assets/services/watcha.svg",
  flo: "/assets/services/flo.svg",
  naver: "/assets/services/naver.svg",
};

export function ServiceMark({
  serviceId,
  name,
  monogram,
  image = null,
  category = null,
  brandColor,
  brandBg,
  brandText,
  className = "",
}) {
  const cleanName = (name || "").toLowerCase().trim();
  const cleanId = (serviceId || "").toLowerCase().trim();
  const resolvedImage =
    image ||
    (cleanId && SERVICE_IMAGES[cleanId]) ||
    (cleanName && (
      SERVICE_IMAGES[cleanName] ||
      (cleanName.includes("netflix") || cleanName.includes("넷플") ? SERVICE_IMAGES.netflix : null) ||
      (cleanName.includes("youtube") || cleanName.includes("유튜브") ? SERVICE_IMAGES.youtube : null) ||
      (cleanName.includes("coupang") || cleanName.includes("쿠팡") ? SERVICE_IMAGES.coupang : null) ||
      (cleanName.includes("spotify") || cleanName.includes("스포티") ? SERVICE_IMAGES.spotify : null) ||
      (cleanName.includes("chatgpt") || cleanName.includes("gpt") ? SERVICE_IMAGES.chatgpt : null) ||
      (cleanName.includes("tving") || cleanName.includes("티빙") ? SERVICE_IMAGES.tving : null) ||
      (cleanName.includes("disney") || cleanName.includes("디즈니") ? SERVICE_IMAGES.disney : null) ||
      (cleanName.includes("millie") || cleanName.includes("밀리") ? SERVICE_IMAGES.millie : null) ||
      (cleanName.includes("adobe") || cleanName.includes("어도비") ? SERVICE_IMAGES.adobe : null) ||
      (cleanName.includes("watcha") || cleanName.includes("왓챠") ? SERVICE_IMAGES.watcha : null) ||
      (cleanName.includes("flo") || cleanName.includes("플로") ? SERVICE_IMAGES.flo : null) ||
      (cleanName.includes("naver") || cleanName.includes("네이버") ? SERVICE_IMAGES.naver : null)
    ));

  if (resolvedImage) {
    return (
      <span className={cx("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border-subtle bg-surface-default p-2 shadow-2xs overflow-hidden", className)}>
        <img
          src={resolvedImage}
          alt=""
          className="h-full w-full object-contain rounded-xl select-none pointer-events-none"
        />
      </span>
    );
  }
  const display = (monogram && monogram.trim()) ? monogram.trim().slice(0, 2).toUpperCase() : "S";
  const info = (category && CATEGORY_PHILOSOPHY[category]) || CATEGORY_PHILOSOPHY.기타;
  const catStyle = info.style;
  const customStyle = (brandBg || brandText || brandColor) ? {
    backgroundColor: brandBg || (brandColor ? `${brandColor}18` : undefined),
    color: brandText || brandColor || undefined,
    borderColor: brandColor ? `${brandColor}35` : undefined,
  } : undefined;

  return (
    <span
      style={customStyle}
      className={cx(
        "grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-bold border transition-colors",
        !customStyle && catStyle,
        className
      )}
      title={info.theme}
      aria-hidden="true"
    >
      {display}
    </span>
  );
}

export function BrandServiceMark({ monogram, image = null, category = null, brandColor, brandBg, brandText, className = "" }) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        className={cx("h-11 w-11 shrink-0 rounded-2xl object-cover border border-border-subtle", className)}
      />
    );
  }
  const display = (monogram && monogram.trim()) ? monogram.trim().slice(0, 2).toUpperCase() : "S";
  const info = (category && CATEGORY_PHILOSOPHY[category]) || CATEGORY_PHILOSOPHY.기타;
  const catStyle = info.style;
  const customStyle = (brandBg || brandText || brandColor) ? {
    backgroundColor: brandBg || (brandColor ? `${brandColor}18` : undefined),
    color: brandText || brandColor || undefined,
    borderColor: brandColor ? `${brandColor}35` : undefined,
  } : undefined;

  return (
    <span
      style={customStyle}
      className={cx(
        "grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-bold border transition-colors",
        !customStyle && catStyle,
        className
      )}
      title={info.theme}
      aria-hidden="true"
    >
      {display}
    </span>
  );
}

export function CategoryBadge({ category, showPhilosophy = false, className = "" }) {
  if (!category) return null;
  const info = CATEGORY_PHILOSOPHY[category] || CATEGORY_PHILOSOPHY.기타;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-0.5 text-[10px] font-bold tracking-tight transition-colors select-none",
        info.style,
        className
      )}
      title={info.desc}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full shrink-0", info.dot)} aria-hidden="true" />
      <span>{info.label}</span>
      {showPhilosophy && <span className="opacity-75 font-medium">· {info.theme}</span>}
    </span>
  );
}

/**
 * SEED Action Button Component
 * Supports SEED-aligned variants (Neutral Solid, Neutral Weak, Neutral Outline, Brand Solid, Critical Solid, Ghost)
 * and sizes (Large, Medium/Default, Small/Compact, XSmall, Icon) with tactile micro-press feedback.
 */
export function Button({
  children,
  className = "",
  variant = "primary",
  size = "default",
  type = "button",
  loading = false,
  disabled = false,
  fullWidth = false,
  prefixIcon = null,
  suffixIcon = null,
  ...props
}) {
  const variants = {
    primary: "bg-surface-inverse text-fg-inverse hover:bg-palette-gray-800 active:bg-palette-gray-700 shadow-sm",
    "neutral-solid": "bg-surface-inverse text-fg-inverse hover:bg-palette-gray-800 active:bg-palette-gray-700 shadow-sm",
    secondary: "bg-surface-subtle text-fg-secondary hover:bg-border-subtle active:bg-border-default",
    "neutral-weak": "bg-surface-subtle text-fg-secondary hover:bg-border-subtle active:bg-border-default",
    outline: "border border-border-subtle bg-surface-default text-fg-secondary hover:bg-surface-inset active:bg-surface-subtle",
    "neutral-outline": "border border-border-subtle bg-surface-default text-fg-secondary hover:bg-surface-inset active:bg-surface-subtle",
    brand: "bg-surface-brand text-fg-inverse hover:bg-surface-brand-hover active:bg-surface-brand-active shadow-sm",
    "brand-solid": "bg-surface-brand text-fg-inverse hover:bg-surface-brand-hover active:bg-surface-brand-active shadow-sm",
    danger: "bg-palette-red-500 text-fg-inverse hover:bg-palette-red-600 active:bg-palette-red-700",
    "critical-solid": "bg-palette-red-500 text-fg-inverse hover:bg-palette-red-600 active:bg-palette-red-700",
    ghost: "text-fg-tertiary hover:bg-surface-subtle hover:text-fg-primary active:bg-border-subtle",
  };
  const sizes = {
    large: "min-h-[52px] rounded-2xl px-5 text-[16px] font-bold tracking-tight",
    default: "min-h-[46px] rounded-xl px-4 text-[15px] font-semibold tracking-tight",
    compact: "min-h-[36px] rounded-lg px-3.5 text-[13px] font-semibold tracking-tight",
    xsmall: "min-h-[28px] rounded-full px-2.5 text-[12px] font-medium tracking-tight",
    icon: "grid h-10 w-10 place-items-center rounded-xl p-0",
  };
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cx(
        "relative inline-flex select-none items-center justify-center gap-1.5 transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#191F28]",
        isDisabled ? "cursor-not-allowed opacity-40 pointer-events-none active:scale-100" : "cursor-pointer",
        fullWidth && "w-full",
        variants[variant] || variants.primary,
        sizes[size] || sizes.default,
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 size={size === "compact" || size === "xsmall" ? 14 : 17} className="animate-spin" />
          <span>{children}</span>
        </span>
      ) : (
        <>
          {prefixIcon && <span className="inline-flex shrink-0 items-center">{prefixIcon}</span>}
          {children}
          {suffixIcon && <span className="inline-flex shrink-0 items-center">{suffixIcon}</span>}
        </>
      )}
    </button>
  );
}

/**
 * SEED Icon Button Component
 * For navigation, back, close, or action icon targets with min 36-40px touch zone.
 */
export function IconButton({
  children,
  className = "",
  variant = "ghost",
  size = "medium",
  type = "button",
  disabled = false,
  ...props
}) {
  const variants = {
    ghost: "text-fg-tertiary hover:bg-surface-subtle hover:text-fg-primary active:bg-border-subtle",
    weak: "bg-surface-subtle text-fg-secondary hover:bg-border-subtle active:bg-border-default",
    outline: "border border-border-subtle bg-surface-default text-fg-secondary hover:bg-surface-inset active:bg-surface-subtle",
    solid: "bg-surface-inverse text-fg-inverse hover:bg-palette-gray-800 active:bg-palette-gray-700",
  };
  const sizes = {
    large: "h-11 w-11 rounded-xl",
    medium: "h-9 w-9 rounded-lg",
    small: "h-7 w-7 rounded-md",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        "grid place-items-center select-none transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus",
        disabled ? "cursor-not-allowed opacity-40 pointer-events-none" : "cursor-pointer",
        variants[variant] || variants.ghost,
        sizes[size] || sizes.medium,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * SEED Chip Component
 * For filters, categories, and selectable option tags.
 */
export function Chip({
  children,
  selected = false,
  className = "",
  type = "button",
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold tracking-tight transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96]",
        selected
          ? "bg-surface-inverse text-fg-inverse shadow-sm"
          : "bg-surface-subtle text-fg-tertiary hover:bg-border-subtle hover:text-fg-primary active:bg-border-default",
        disabled && "cursor-not-allowed opacity-40 pointer-events-none",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * SEED Segmented Control Component
 * Container and tab items for 2~4 option fast switching.
 */
export function SegmentedControl({
  options = [],
  value,
  onChange,
  className = "",
}) {
  return (
    <div className={cx("flex items-center gap-1 rounded-xl bg-surface-subtle p-1", className)} role="tablist">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(option.value)}
            className={cx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold tracking-tight transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
              isSelected
                ? "bg-surface-default text-fg-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                : "text-fg-subtle hover:text-fg-tertiary active:scale-[0.98]",
            )}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function DDayBadge({ subscription }) {
  const days = daysUntilCharge(subscription);
  if (subscription.isTrial || subscription.status === "trial") {
    return (
      <span className="rounded-[6px] border border-status-trial-border bg-status-trial-bg px-2 py-0.5 text-[11px] font-bold tracking-tight text-status-trial-fg">
        TRIAL D-{days}
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="today-pulse rounded-[6px] bg-status-today-bg px-2 py-0.5 text-[11px] font-bold tracking-tight text-status-today-fg shadow-sm">
        TODAY
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="rounded-[6px] border border-status-urgent-border bg-status-urgent-bg px-2 py-0.5 text-[11px] font-bold tracking-tight text-status-urgent-fg">
        D-{days}
      </span>
    );
  }
  return <span className="rounded-[6px] bg-surface-subtle px-2 py-0.5 text-[11px] font-semibold tracking-tight text-fg-muted">D-{days}</span>;
}

export function ToggleSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer select-none rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus active:scale-[0.97]",
        checked ? "bg-surface-inverse" : "bg-border-subtle",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

export function AppHeader({ title, onBack, rightSlot = null }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border-subtle bg-surface-default/95 px-5 backdrop-blur-md">
      <div className="flex items-center gap-2">
        {onBack && (
          <IconButton onClick={onBack} aria-label="뒤로가기" size="medium">
            <ArrowLeft size={20} className="text-fg-secondary" />
          </IconButton>
        )}
        <span className="text-[17px] font-bold tracking-tight text-fg-primary">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {rightSlot}
      </div>
    </header>
  );
}

export function BottomNavigation({ route, onNavigate, onOpenAdd }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 flex min-h-16 w-full max-w-[420px] -translate-x-1/2 items-center justify-around border-x border-t border-border-subtle bg-surface-default/95 px-2 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] pt-1 backdrop-blur-md shadow-[0_-1px_3px_rgba(0,0,0,0.02)]" aria-label="주요 탐색">
      <button
        type="button"
        onClick={() => onNavigate("home")}
        className={cx("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] tracking-tight transition-all active:scale-[0.95]", route === "home" ? "font-bold text-fg-primary" : "font-medium text-fg-subtle hover:text-fg-tertiary")}
        aria-current={route === "home" ? "page" : undefined}
      >
        <Home size={20} strokeWidth={route === "home" ? 2.5 : 1.75} />
        <span>홈</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate("subscriptions")}
        className={cx("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] tracking-tight transition-all active:scale-[0.95]", (route === "subscriptions" || route === "detail") ? "font-bold text-fg-primary" : "font-medium text-fg-subtle hover:text-fg-tertiary")}
        aria-current={(route === "subscriptions" || route === "detail") ? "page" : undefined}
      >
        <CreditCard size={20} strokeWidth={(route === "subscriptions" || route === "detail") ? 2.5 : 1.75} />
        <span>구독</span>
      </button>

      <div className="flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={onOpenAdd}
          className="grid h-11 w-11 place-items-center rounded-full bg-surface-inverse text-fg-inverse shadow-[0_4px_12px_rgba(25,31,40,0.2)] transition-all duration-150 active:scale-95 hover:bg-palette-gray-800"
          aria-label="새 구독 추가"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onNavigate("calendar")}
        className={cx("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] tracking-tight transition-all active:scale-[0.95]", route === "calendar" ? "font-bold text-fg-primary" : "font-medium text-fg-subtle hover:text-fg-tertiary")}
        aria-current={route === "calendar" ? "page" : undefined}
      >
        <CalendarDays size={20} strokeWidth={route === "calendar" ? 2.5 : 1.75} />
        <span>캘린더</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate("promotions")}
        className={cx("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] tracking-tight transition-all active:scale-[0.95]", route === "promotions" ? "font-bold text-fg-primary" : "font-medium text-fg-subtle hover:text-fg-tertiary")}
        aria-current={route === "promotions" ? "page" : undefined}
      >
        <Sparkles size={20} strokeWidth={route === "promotions" ? 2.5 : 1.75} />
        <span>혜택</span>
      </button>
    </nav>
  );
}

function SubscriptionCardBody({ subscription, onOpen, detail = false }) {
  return (
    <button type="button" onClick={onOpen} className="card-press flex w-full items-center gap-3.5 rounded-2xl border border-border-subtle bg-surface-default p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:border-border-default active:scale-[0.98] cursor-pointer">
      <ServiceMark
        serviceId={subscription.id}
        name={subscription.name}
        monogram={subscription.monogram || subscription.name?.slice(0, 1)}
        image={subscription.image || subscription.attachments?.[0]}
        category={subscription.category}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-[15px] font-bold text-fg-primary tracking-tight">{subscription.name}</span>
          <CategoryBadge category={subscription.category} />
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] font-medium text-fg-muted">
          <span>{subscription.plan} · {formatBillingDate(subscription)}</span>
        </span>
        {detail && (
          <span className="mt-1 block truncate text-[11px] font-medium text-fg-subtle">
            <PaymentMethodBadge method={subscription.paymentMethod} size={14} />
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <DDayBadge subscription={subscription} />
        <span className="text-[15px] font-bold tracking-tight text-fg-primary">{formatWon(subscription.amount)}</span>
      </span>
    </button>
  );
}

export function SubscriptionCard({ subscription, onOpen, onCancel, onMute, swipable = false, detail = false }) {
  const [revealed, setRevealed] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const startX = useRef(null);
  const startY = useRef(null);
  const isDragging = useRef(false);
  const capturedElement = useRef(null);

  if (!swipable) return <SubscriptionCardBody subscription={subscription} onOpen={onOpen} detail={detail} />;

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    startX.current = event.clientX;
    startY.current = event.clientY;
    isDragging.current = false;
  };

  const handlePointerMove = (event) => {
    if (startX.current === null) return;
    const deltaX = event.clientX - startX.current;
    const deltaY = event.clientY - (startY.current ?? event.clientY);

    if (!isDragging.current) {
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isDragging.current = true;
        setIsDraggingState(true);
        capturedElement.current = event.currentTarget;
        try {
          event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch (_) {}
      }
    }

    if (isDragging.current) {
      const base = revealed ? -120 : 0;
      const nextX = Math.max(-120, Math.min(0, base + deltaX));
      setDragX(nextX);
    }
  };
  const handlePointerEnd = (event) => {
    if (capturedElement.current) {
      try {
        capturedElement.current.releasePointerCapture?.(event.pointerId);
      } catch (_) {}
      capturedElement.current = null;
    }

    if (isDragging.current) {
      if (revealed) {
        setRevealed(dragX < -70);
      } else {
        setRevealed(dragX < -50);
      }
      setDragX(0);
      setIsDraggingState(false);
      startX.current = null;
      startY.current = null;
      setTimeout(() => {
        isDragging.current = false;
      }, 100);
      return;
    }

    setDragX(0);
    setIsDraggingState(false);
    startX.current = null;
    startY.current = null;
  };

  const handleCardClick = (event) => {
    if (isDragging.current) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      return;
    }
    if (revealed) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      setRevealed(false);
      return;
    }
    onOpen?.();
  };

  const currentTranslate = isDraggingState ? dragX : (revealed ? -120 : 0);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 flex w-[120px] overflow-hidden rounded-r-2xl" aria-hidden={!revealed}>
        <button
          type="button"
          tabIndex={revealed ? 0 : -1}
          onClick={(e) => {
            e.stopPropagation();
            setRevealed(false);
            onCancel?.();
          }}
          className="flex w-1/2 flex-col items-center justify-center gap-1 bg-[#FF4D4D] text-[11px] font-bold text-white transition-opacity active:opacity-90 cursor-pointer"
        >
          <X size={16} />
          해지
        </button>
        <button
          type="button"
          tabIndex={revealed ? 0 : -1}
          onClick={(e) => {
            e.stopPropagation();
            setRevealed(false);
            onMute?.();
          }}
          className="flex w-1/2 flex-col items-center justify-center gap-1 bg-[#6B7684] text-[11px] font-bold text-white transition-opacity active:opacity-90 cursor-pointer"
        >
          <BellOff size={16} />
          알림 끄기
        </button>
      </div>
      <div
        className={"relative touch-pan-y " + (isDraggingState ? "transition-none" : "transition-transform duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)]")}
        style={{ transform: "translateX(" + currentTranslate + "px)" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <SubscriptionCardBody subscription={subscription} onOpen={handleCardClick} detail={detail} />
      </div>
    </div>
  );
}

export function Toast({ toast, onClose, duration = 6000 }) {
  const message = typeof toast === "object" && toast !== null ? toast.message : toast;
  const initialDuration = (typeof toast === "object" && toast?.duration) || duration;
  const toastKey = (typeof toast === "object" && toast?.id) || message;

  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(initialDuration);
  const timerRef = useRef(null);
  const hardTimeoutRef = useRef(null);
  const exitTimerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const handleClose = useCallback(() => {
    setIsExiting((curr) => {
      if (curr) return curr;
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      exitTimerRef.current = setTimeout(() => {
        onCloseRef.current?.();
      }, 180);
      return true;
    });
  }, []);

  useEffect(() => {
    if (!message) {
      setIsExiting(false);
      setIsPaused(false);
      return;
    }
    setIsExiting(false);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    remainingTimeRef.current = initialDuration;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);

    timerRef.current = setTimeout(() => {
      handleClose();
    }, initialDuration);

    // Hard ceiling timeout (at most 7000ms): guarantees toast always disappears within 5~7 seconds
    hardTimeoutRef.current = setTimeout(() => {
      handleClose();
    }, Math.min(Math.max(initialDuration + 1000, 5000), 7000));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [toastKey, initialDuration, message, handleClose]);

  const handleMouseEnter = (e) => {
    if (isExiting) return;
    if (e?.pointerType === "touch") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    setIsPaused(true);
  };

  const handleMouseLeave = (e) => {
    if (isExiting) return;
    if (e?.pointerType === "touch") return;
    setIsPaused(false);
    startTimeRef.current = Date.now();
    const remaining = remainingTimeRef.current > 0 ? remainingTimeRef.current : 500;
    timerRef.current = setTimeout(() => {
      handleClose();
    }, remaining);
  };

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2.5rem)] max-w-[380px] -translate-x-1/2 flex-col overflow-hidden rounded-2xl bg-[#18181B] text-white shadow-xl ${
        isExiting ? "toast-exit" : "toast-enter"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <p className="text-[13px] font-medium leading-5">{message}</p>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-1 text-[#A1A1AA] hover:text-white transition-colors"
          aria-label="알림 닫기"
        >
          <X size={16} />
        </button>
      </div>

      <div className="h-[2px] w-full bg-white/10">
        <div
          key={toastKey}
          className="h-full bg-blue-400/80 origin-left"
          style={{
            animation: `toast-shrink ${initialDuration}ms linear forwards`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        />
      </div>
    </div>
  );
}

export function BottomSheet({ children, onClose, label }) {
  return (
    <div className="sheet-backdrop fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose}>
      <div
        className="sheet-slide-up fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[420px] max-h-[92vh] flex flex-col rounded-t-[24px] border-t border-[#F2F4F6] bg-white px-5 pb-8 pt-3 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className="mx-auto mb-3 h-1 w-9 shrink-0 rounded-full bg-[#D1D6DB]" />
        <div className="overflow-y-auto no-scrollbar flex-1 overscroll-contain pb-safe pr-0.5">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * SEED Attachment Input Component
 * Inspired by Daangn Seed Design (attachment-input / attachment-input-trigger / attachment-input-item)
 * Displays an 80x80px camera trigger button with count badge (e.g. 3/10) and horizontal thumbnail list.
 */
export function AttachmentInput({
  files = [],
  maxFiles = 10,
  onChange,
  onRemove,
  disabled = false,
  className = "",
}) {
  const fileInputRef = useRef(null);

  return (
    <div className={cx("flex items-center gap-2.5 overflow-x-auto py-1", className)}>
      <button
        type="button"
        disabled={disabled || files.length >= maxFiles}
        onClick={() => fileInputRef.current?.click()}
        className={cx(
          "relative flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-[#E5E8EB] bg-[#F7F8F9] transition-all",
          files.length >= maxFiles || disabled
            ? "cursor-not-allowed opacity-40"
            : "cursor-pointer hover:border-[#191F28] hover:bg-[#F2F4F6] active:scale-[0.96]"
        )}
        aria-label={`사진 첨부하기 (${files.length}/${maxFiles})`}
      >
        <Camera size={24} className="text-[#868B94]" />
        <div className="text-[12px] leading-tight select-none">
          <strong className={cx("font-bold", files.length > 0 ? "text-[#212124]" : "text-[#868B94]")}>
            {files.length}
          </strong>
          <span className="text-[#868B94]">/{maxFiles}</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={onChange}
        />
      </button>

      {files.map((fileUrl, index) => (
        <div
          key={index}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[#E5E8EB] bg-[#F2F4F6]"
        >
          <img src={fileUrl} alt={`첨부 사진 ${index + 1}`} className="h-full w-full object-cover" />
          {index === 0 && (
            <span className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5 text-center text-[10px] font-medium text-white backdrop-blur-xs select-none">
              대표 사진
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(index);
            }}
            className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-[#E5E8EB] bg-white text-[#212124] shadow-xs transition-transform hover:bg-[#F2F4F6] active:scale-90"
            aria-label={`첨부 사진 ${index + 1} 삭제`}
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * SEED Action Chip Component
 * For category selection, filter chips, and interactive tags.
 */
export function ActionChip({
  children,
  selected = false,
  onClick,
  prefixIcon = null,
  className = "",
  disabled = false,
  size = "medium",
}) {
  const sizes = {
    small: "min-h-[28px] px-2.5 text-[12px]",
    medium: "min-h-[34px] px-3.5 text-[13px]",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-all active:scale-[0.96] select-none shrink-0 cursor-pointer",
        sizes[size] || sizes.medium,
        selected
          ? "bg-[#212124] text-white shadow-xs"
          : "border border-[#E5E8EB] bg-[#F7F8F9] text-[#4E5968] hover:border-[#D1D6DB] hover:bg-white",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      {prefixIcon && <span className="inline-flex shrink-0">{prefixIcon}</span>}
      <span>{children}</span>
    </button>
  );
}
