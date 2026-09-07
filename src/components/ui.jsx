import { useRef, useState } from "react";
import {
  ArrowLeft,
  BellOff,
  CalendarDays,
  CreditCard,
  Home,
  Plus,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";
import { daysUntilCharge, formatBillingDate, formatWon } from "../lib/dates";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export function LogoMark({ className = "" }) {
  return (
    <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#191F28] text-sm font-bold text-white shadow-sm", className)} aria-hidden="true">
      S
    </span>
  );
}

export function ServiceMark({ monogram, className = "" }) {
  const display = (monogram && monogram.trim()) ? monogram.trim().slice(0, 2).toUpperCase() : "S";
  return (
    <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F2F4F6] text-sm font-bold text-[#191F28] border border-[#E5E8EB]", className)} aria-hidden="true">
      {display}
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
    primary: "bg-[#191F28] text-white hover:bg-[#2C3440] active:bg-[#384252] shadow-sm",
    "neutral-solid": "bg-[#191F28] text-white hover:bg-[#2C3440] active:bg-[#384252] shadow-sm",
    secondary: "bg-[#F2F4F6] text-[#333D4B] hover:bg-[#E5E8EB] active:bg-[#D1D6DB]",
    "neutral-weak": "bg-[#F2F4F6] text-[#333D4B] hover:bg-[#E5E8EB] active:bg-[#D1D6DB]",
    outline: "border border-[#E5E8EB] bg-white text-[#333D4B] hover:bg-[#F9FAFB] active:bg-[#F2F4F6]",
    "neutral-outline": "border border-[#E5E8EB] bg-white text-[#333D4B] hover:bg-[#F9FAFB] active:bg-[#F2F4F6]",
    brand: "bg-[#FF6F0F] text-white hover:bg-[#E85E00] active:bg-[#D25400] shadow-sm",
    "brand-solid": "bg-[#FF6F0F] text-white hover:bg-[#E85E00] active:bg-[#D25400] shadow-sm",
    danger: "bg-[#FF4D4D] text-white hover:bg-[#E53935] active:bg-[#CC2E2E]",
    "critical-solid": "bg-[#FF4D4D] text-white hover:bg-[#E53935] active:bg-[#CC2E2E]",
    ghost: "text-[#4E5968] hover:bg-[#F2F4F6] hover:text-[#191F28] active:bg-[#E5E8EB]",
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
    ghost: "text-[#4E5968] hover:bg-[#F2F4F6] hover:text-[#191F28] active:bg-[#E5E8EB]",
    weak: "bg-[#F2F4F6] text-[#333D4B] hover:bg-[#E5E8EB] active:bg-[#D1D6DB]",
    outline: "border border-[#E5E8EB] bg-white text-[#333D4B] hover:bg-[#F9FAFB] active:bg-[#F2F4F6]",
    solid: "bg-[#191F28] text-white hover:bg-[#2C3440] active:bg-[#384252]",
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
        "grid place-items-center select-none transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#191F28]",
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
          ? "bg-[#191F28] text-white shadow-sm"
          : "bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] hover:text-[#191F28] active:bg-[#D1D6DB]",
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
    <div className={cx("flex items-center gap-1 rounded-xl bg-[#F2F4F6] p-1", className)} role="tablist">
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
                ? "bg-white text-[#191F28] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                : "text-[#8B95A1] hover:text-[#4E5968] active:scale-[0.98]",
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
    return <span className="rounded-[6px] border border-[#FFE8CC] bg-[#FFF4E6] px-2 py-0.5 text-[11px] font-bold tracking-tight text-[#E85E00]">TRIAL D-{days}</span>;
  }
  if (days === 0) {
    return <span className="today-pulse rounded-[6px] bg-[#FF4D4D] px-2 py-0.5 text-[11px] font-bold tracking-tight text-white shadow-sm">TODAY</span>;
  }
  if (days <= 3) {
    return <span className="rounded-[6px] border border-[#FFD8D8] bg-[#FFF0F0] px-2 py-0.5 text-[11px] font-bold tracking-tight text-[#E03E3E]">D-{days}</span>;
  }
  return <span className="rounded-[6px] bg-[#F2F4F6] px-2 py-0.5 text-[11px] font-semibold tracking-tight text-[#6B7684]">D-{days}</span>;
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
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer select-none rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#191F28] active:scale-[0.97]",
        checked ? "bg-[#191F28]" : "bg-[#E5E8EB]",
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
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#F2F4F6] bg-white/95 px-5 backdrop-blur-md">
      <div className="flex items-center gap-2">
        {onBack ? (
          <IconButton onClick={onBack} aria-label="뒤로가기" size="medium">
            <ArrowLeft size={20} className="text-[#333D4B]" />
          </IconButton>
        ) : (
          <LogoMark />
        )}
        <span className="text-[17px] font-bold tracking-tight text-[#191F28]">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {rightSlot}
      </div>
    </header>
  );
}

export function BottomNavigation({ route, onNavigate, onOpenAdd }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 flex h-16 w-full max-w-[420px] -translate-x-1/2 items-center justify-around border-x border-t border-[#F2F4F6] bg-white/95 px-2 pb-1 pt-1 backdrop-blur-md shadow-[0_-1px_3px_rgba(0,0,0,0.02)]" aria-label="주요 탐색">
      <button
        type="button"
        onClick={() => onNavigate("home")}
        className={cx("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] tracking-tight transition-all active:scale-[0.95]", route === "home" ? "font-bold text-[#191F28]" : "font-medium text-[#8B95A1] hover:text-[#4E5968]")}
        aria-current={route === "home" ? "page" : undefined}
      >
        <Home size={20} strokeWidth={route === "home" ? 2.5 : 1.75} />
        <span>홈</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate("subscriptions")}
        className={cx("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] tracking-tight transition-all active:scale-[0.95]", (route === "subscriptions" || route === "detail") ? "font-bold text-[#191F28]" : "font-medium text-[#8B95A1] hover:text-[#4E5968]")}
        aria-current={(route === "subscriptions" || route === "detail") ? "page" : undefined}
      >
        <CreditCard size={20} strokeWidth={(route === "subscriptions" || route === "detail") ? 2.5 : 1.75} />
        <span>구독</span>
      </button>

      <div className="flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={onOpenAdd}
          className="grid h-11 w-11 place-items-center rounded-full bg-[#191F28] text-white shadow-[0_4px_12px_rgba(25,31,40,0.2)] transition-all duration-150 active:scale-95 hover:bg-[#2C3440]"
          aria-label="새 구독 추가"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onNavigate("calendar")}
        className={cx("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] tracking-tight transition-all active:scale-[0.95]", route === "calendar" ? "font-bold text-[#191F28]" : "font-medium text-[#8B95A1] hover:text-[#4E5968]")}
        aria-current={route === "calendar" ? "page" : undefined}
      >
        <CalendarDays size={20} strokeWidth={route === "calendar" ? 2.5 : 1.75} />
        <span>캘린더</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate("promotions")}
        className={cx("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] tracking-tight transition-all active:scale-[0.95]", route === "promotions" ? "font-bold text-[#191F28]" : "font-medium text-[#8B95A1] hover:text-[#4E5968]")}
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
    <button type="button" onClick={onOpen} className="card-press flex w-full items-center gap-3.5 rounded-2xl border border-[#E5E8EB] bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:border-[#D1D6DB] active:scale-[0.98] cursor-pointer">
      <ServiceMark monogram={subscription.monogram || subscription.name?.slice(0, 1)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-[#191F28] tracking-tight">{subscription.name}</span>
        <span className="mt-0.5 block truncate text-[13px] font-medium text-[#6B7684]">{subscription.plan} · {formatBillingDate(subscription)}</span>
        {detail && <span className="mt-1 block truncate text-[11px] font-medium text-[#8B95A1]">{subscription.paymentMethod || "결제수단 미등록"}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <DDayBadge subscription={subscription} />
        <span className="text-[15px] font-bold tracking-tight text-[#191F28]">{formatWon(subscription.amount)}</span>
      </span>
    </button>
  );
}

export function SubscriptionCard({ subscription, onOpen, onCancel, onMute, swipable = false, detail = false }) {
  const [revealed, setRevealed] = useState(false);
  const [dragX, setDragX] = useState(0);
  const startX = useRef(null);

  if (!swipable) return <SubscriptionCardBody subscription={subscription} onOpen={onOpen} detail={detail} />;

  const handlePointerDown = (event) => {
    startX.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handlePointerMove = (event) => {
    if (startX.current === null) return;
    setDragX(Math.max(-120, Math.min(0, event.clientX - startX.current)));
  };
  const handlePointerEnd = () => {
    if (startX.current === null) return;
    setRevealed(dragX < -55 || revealed);
    setDragX(0);
    startX.current = null;
  };
  const translate = revealed ? -120 : dragX;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 flex w-[120px] overflow-hidden rounded-r-2xl" aria-hidden={!revealed}>
        <button type="button" tabIndex={revealed ? 0 : -1} onClick={onCancel} className="flex w-1/2 flex-col items-center justify-center gap-1 bg-[#FF4D4D] text-[11px] font-bold text-white transition-opacity active:opacity-90">
          <X size={16} />
          해지
        </button>
        <button type="button" tabIndex={revealed ? 0 : -1} onClick={onMute} className="flex w-1/2 flex-col items-center justify-center gap-1 bg-[#6B7684] text-[11px] font-bold text-white transition-opacity active:opacity-90">
          <BellOff size={16} />
          알림 끄기
        </button>
      </div>
      <div
        className="relative touch-pan-y transition-transform duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ transform: `translateX(${translate}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <SubscriptionCardBody subscription={subscription} onOpen={onOpen} detail={detail} />
      </div>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className="toast-animate fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2.5rem)] max-w-[380px] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-[#18181B] px-4 py-3.5 text-white shadow-xl">
      <p className="text-[13px] font-medium leading-5">{toast}</p>
      <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#A1A1AA] hover:text-white" aria-label="알림 닫기">
        <X size={16} />
      </button>
    </div>
  );
}

export function BottomSheet({ children, onClose, label }) {
  return (
    <div className="sheet-backdrop fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose}>
      <div
        className="sheet-slide-up fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[420px] rounded-t-[24px] border-t border-[#F2F4F6] bg-white px-5 pb-9 pt-3 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#D1D6DB]" />
        {children}
      </div>
    </div>
  );
}
