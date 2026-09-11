import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart2,
  Bell,
  BellOff,
  CalendarDays,
  Camera,
  CreditCard,
  ExternalLink,
  FileText,
  Home,
  MoreVertical,
  Plus,
  Sparkles,
  User,
  Loader2,
  X,
  Pin,
} from "lucide-react";
import { daysUntilCharge, formatBillingDate, formatWon } from "../lib/dates";
import {
  PaymentIcon,
  PaymentMethodBadge,
  PAYMENT_PRESETS,
  PaymentMethodTriggerField,
  PaymentMethodPickerModal,
} from "./PaymentMethod";
import { serviceCatalog } from "../data/subscriptionData";

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
  icloud: "/assets/services/icloud.svg",
  apple: "/assets/services/icloud.svg",
  uplus: "/assets/services/uplus.svg",
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
      (cleanName.includes("naver") || cleanName.includes("네이버") ? SERVICE_IMAGES.naver : null) ||
      (cleanName.includes("icloud") || cleanName.includes("apple") || cleanName.includes("아이클라우드") || cleanName.includes("애플") ? SERVICE_IMAGES.icloud : null)
    ));

  if (resolvedImage) {
    return (
      <span className={cx("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-50/80 p-2 overflow-hidden border border-gray-100 select-none", className)}>
        <img
          src={resolvedImage}
          alt={name || ""}
          className="h-full w-full object-contain pointer-events-none"
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
      <span className="inline-flex items-center text-[11px] font-semibold tracking-tight text-[#EA580C] leading-none">
        무료 D-{days}
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="inline-flex items-center rounded-md bg-[#C2410C] px-2 py-0.5 text-[10px] font-bold tracking-tight text-white leading-none shadow-xs">
        TODAY
      </span>
    );
  }
  if (days === 1) {
    return (
      <span className="inline-flex items-center rounded-md bg-[#FF6F0F] px-2 py-0.5 text-[10px] font-bold tracking-tight text-white leading-none shadow-xs">
        D-1
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="inline-flex items-center rounded-md bg-[#FFF5ED] border border-[#FED2B2] px-2 py-0.5 text-[10px] font-semibold tracking-tight text-[#EA580C] leading-none">
        D-{days}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-[#F9FAFB] border border-[#E5E8EB] px-2 py-0.5 text-[10px] font-normal tracking-tight text-[#9CA3AF] leading-none">
      D-{days}
    </span>
  );
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
    <header className="sticky top-0 z-30 flex flex-col w-full border-b border-border-subtle bg-surface-default/95 backdrop-blur-md pt-safe">
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-5">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <IconButton onClick={onBack} aria-label="뒤로가기" size="medium">
              <ArrowLeft size={20} className="text-fg-secondary" />
            </IconButton>
          )}
          <span className="text-[17px] font-bold tracking-tight text-fg-primary truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rightSlot}
        </div>
      </div>
    </header>
  );
}

export function BottomNavigation({
  route,
  onNavigate,
  onOpenAdd,
  onOpenNotifications,
  onOpenAccount,
}) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 flex min-h-[calc(3.75rem+env(safe-area-inset-bottom,0px))] w-full max-w-full sm:max-w-[440px] -translate-x-1/2 items-center justify-around border-t border-gray-100 bg-white px-2 pb-[max(0.4rem,calc(env(safe-area-inset-bottom,0px)+0.2rem))] pt-1.5 shadow-[0_-2px_12px_rgba(0,0,0,0.03)]" aria-label="주요 탐색">
      <button
        type="button"
        onClick={() => onNavigate("home")}
        className={cx(
          "flex flex-1 flex-col items-center gap-1 py-1 text-[11px] tracking-tight transition-all active:scale-[0.95]",
          route === "home" ? "font-bold text-black" : "font-medium text-gray-400 hover:text-gray-600"
        )}
        aria-current={route === "home" ? "page" : undefined}
      >
        <Home size={22} strokeWidth={route === "home" ? 2.5 : 1.75} />
        <span>홈</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate("subscriptions")}
        className={cx(
          "flex flex-1 flex-col items-center gap-1 py-1 text-[11px] tracking-tight transition-all active:scale-[0.95]",
          (route === "subscriptions" || route === "detail") ? "font-bold text-black" : "font-medium text-gray-400 hover:text-gray-600"
        )}
        aria-current={(route === "subscriptions" || route === "detail") ? "page" : undefined}
      >
        <CreditCard size={22} strokeWidth={(route === "subscriptions" || route === "detail") ? 2.5 : 1.75} />
        <span>구독</span>
      </button>

      <div className="flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={onOpenAdd}
          className="grid h-12 w-12 place-items-center rounded-full bg-[#111827] text-white shadow-[0_4px_16px_rgba(17,24,39,0.3)] transition-all duration-150 active:scale-95 hover:bg-black -mt-4 cursor-pointer"
          aria-label="새 구독 추가"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onNavigate("calendar")}
        className={cx(
          "flex flex-1 flex-col items-center gap-1 py-1 text-[11px] tracking-tight transition-all active:scale-[0.95]",
          route === "calendar" ? "font-bold text-black" : "font-medium text-gray-400 hover:text-gray-600"
        )}
        aria-current={route === "calendar" ? "page" : undefined}
      >
        <CalendarDays size={22} strokeWidth={route === "calendar" ? 2.5 : 1.75} />
        <span>캘린더</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate("promotions")}
        className={cx(
          "flex flex-1 flex-col items-center gap-1 py-1 text-[11px] tracking-tight transition-all active:scale-[0.95]",
          route === "promotions" ? "font-bold text-black" : "font-medium text-gray-400 hover:text-gray-600"
        )}
        aria-current={route === "promotions" ? "page" : undefined}
      >
        <Sparkles size={22} strokeWidth={route === "promotions" ? 2.5 : 1.75} />
        <span>혜택</span>
      </button>
    </nav>
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
  const matched = serviceCatalog.find(
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
  onCancel,
  onMute,
  onTogglePin,
  detail = false,
  variant = "card",
  className = "",
}) {
  const isGrouped = variant === "grouped";
  const monogram = subscription.monogram || subscription.name?.slice(0, 1) || "S";
  const isTrial = Boolean(subscription.isTrial || subscription.status === "trial");
  const isPinned = Boolean(subscription.isPinned || subscription.pinned);
  const displayAmount = getSubscriptionDisplayAmount(subscription);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        "flex w-full items-center justify-between text-left transition-colors cursor-pointer group/card",
        isGrouped
          ? "py-5 border-b border-gray-100/80 bg-transparent hover:bg-gray-50/40 active:bg-gray-100/50"
          : "card-press p-4 rounded-xl border border-gray-100/80 bg-white shadow-xs hover:border-gray-200 active:scale-[0.99]",
        className
      )}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <ServiceMark
          serviceId={subscription.id}
          name={subscription.name}
          monogram={monogram}
          image={subscription.image || subscription.attachments?.[0]}
          category={subscription.category}
          className="h-12 w-12 rounded-full shrink-0 shadow-xs"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[16px] font-semibold text-[#191F28] tracking-tight leading-tight">
              {subscription.name}
            </span>
            <DDayBadge subscription={subscription} />
          </div>
          <p className="truncate text-[12px] text-gray-400 font-normal mt-1 leading-tight">
            {subscription.plan || "기본 플랜"}{subscription.paymentMethod ? ` · ${subscription.paymentMethod}` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 pl-3">
        <div className="text-right">
          <span
            className={cx(
              "text-[16px] font-semibold tracking-tight block leading-tight",
              isTrial ? "text-[#FF6F0F]" : "text-[#191F28]"
            )}
          >
            {formatWon(displayAmount)}
          </span>
          <span className="text-[11px] text-gray-400 block mt-0.5 leading-tight font-normal">
            /{subscription.billingCycle === "매년" ? "년" : "월"}
          </span>
        </div>

        {onTogglePin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(subscription.subscriptionId || subscription.id);
            }}
            className={cx(
              "p-1.5 rounded-full transition-all cursor-pointer",
              isPinned
                ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                : "text-gray-300 hover:text-gray-500 hover:bg-gray-100 opacity-60 group-hover/card:opacity-100"
            )}
            title={isPinned ? "상단 고정 해제" : "상단에 고정 강조"}
            aria-label={isPinned ? "상단 고정 해제" : "상단에 고정 강조"}
          >
            <Pin size={17} className={isPinned ? "fill-amber-500 text-amber-500" : ""} />
          </button>
        )}
      </div>
    </button>
  );
}

export function Toast({ toast, onClose, duration = 2500 }) {
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
  const toastRef = useRef(null);

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

    // Hard ceiling timeout: 2~3초 내 빠른 자동 종료 보장 (사용자 피드백)
    hardTimeoutRef.current = setTimeout(() => {
      handleClose();
    }, Math.min(initialDuration + 500, 3500));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [toastKey, initialDuration, message, handleClose]);

  // 외부 영역 터치/클릭 시 즉시 닫힘 (사용자 피드백)
  useEffect(() => {
    if (!message) return;
    const handleOutsideClick = (e) => {
      if (toastRef.current && !toastRef.current.contains(e.target)) {
        handleClose();
      }
    };
    const timer = setTimeout(() => {
      window.addEventListener("pointerdown", handleOutsideClick, { capture: true, once: true });
    }, 80);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", handleOutsideClick, { capture: true });
    };
  }, [message, handleClose]);

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
      ref={toastRef}
      role="status"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClose}
      className={`fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2 flex-col overflow-hidden rounded-2xl bg-[#18181B] text-white shadow-xl cursor-pointer ${
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
        className="sheet-slide-up fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-full sm:max-w-[440px] max-h-[90vh] max-h-[90dvh] flex flex-col rounded-t-[24px] border-t border-[#F2F4F6] bg-white px-4 sm:px-5 pb-[max(1.75rem,calc(env(safe-area-inset-bottom,0px)+1rem))] pt-3 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className="mx-auto mb-3 h-1 w-9 shrink-0 rounded-full bg-[#D1D6DB]" />
        <div className="overflow-y-auto no-scrollbar flex-1 overscroll-contain pb-2 pr-0.5">
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
