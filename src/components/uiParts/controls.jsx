import { Loader2 } from "lucide-react";

import { cx } from "./cx";

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
    // C2: 주요 버튼은 잉크색 채움, 보조는 회색 면, 아웃라인은 흰 바탕 + 얇은 선. 그림자 없음.
    primary: "bg-brand text-white hover:bg-brand-hover active:bg-brand-pressed",
    "neutral-solid": "bg-brand text-white hover:bg-brand-hover active:bg-brand-pressed",
    secondary: "bg-gray-100 text-ink-secondary hover:bg-gray-200 active:bg-gray-200",
    "neutral-weak": "bg-gray-100 text-ink-secondary hover:bg-gray-200 active:bg-gray-200",
    outline: "border border-gray-200 bg-white text-ink-secondary hover:bg-gray-50 active:bg-gray-100",
    "neutral-outline": "border border-gray-200 bg-white text-ink-secondary hover:bg-gray-50 active:bg-gray-100",
    brand: "bg-brand text-white hover:bg-brand-hover active:bg-brand-pressed",
    "brand-solid": "bg-brand text-white hover:bg-brand-hover active:bg-brand-pressed",
    danger: "bg-danger text-white hover:opacity-90 active:opacity-80",
    "critical-solid": "bg-danger text-white hover:opacity-90 active:opacity-80",
    ghost: "text-ink-muted hover:bg-gray-100 hover:text-ink active:bg-gray-200",
  };
  const sizes = {
    large: "min-h-[52px] rounded-[14px] px-5 text-[16px] font-semibold tracking-tight",
    default: "min-h-[48px] rounded-xl px-4 text-[15px] font-semibold tracking-tight",
    compact: "min-h-[36px] rounded-[10px] px-3.5 text-[13px] font-semibold tracking-tight",
    xsmall: "min-h-[28px] rounded-lg px-2.5 text-[12px] font-medium tracking-tight",
    icon: "grid h-10 w-10 place-items-center rounded-xl p-0",
  };
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cx(
        "relative inline-flex select-none items-center justify-center gap-1.5 transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900",
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
    ghost: "text-ink-muted hover:bg-gray-100 hover:text-ink active:bg-gray-200",
    weak: "bg-gray-100 text-ink-secondary hover:bg-gray-200 active:bg-gray-200",
    outline: "border border-gray-200 bg-white text-ink-secondary hover:bg-gray-50 active:bg-gray-100",
    solid: "bg-brand text-white hover:bg-brand-hover active:bg-brand-pressed",
  };
  const sizes = {
    large: "h-11 w-11 rounded-xl",
    // 보이는 크기는 유지하고 before 가상 요소로 터치 영역만 44px 이상으로 넓힌다.
    medium: "h-9 w-9 rounded-lg before:absolute before:-inset-1 before:content-['']",
    small: "h-7 w-7 rounded-md before:absolute before:-inset-2 before:content-['']",
  };
  const positioned = /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className);
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        "grid place-items-center select-none transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus",
        !positioned && "relative",
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
 * C2 필터 칩. 선택된 칩만 잉크색으로 채우고, 나머지는 흰 바탕 + 얇은 회색 선(당근 칩 방식).
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
        "inline-flex min-h-[34px] shrink-0 items-center justify-center gap-1 rounded-full border px-3.5 text-[14px] tracking-tight transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-[''] relative",
        selected
          ? "border-ink bg-ink font-semibold text-white"
          : "border-gray-200 bg-white font-medium text-ink-secondary hover:bg-gray-50 active:bg-gray-100",
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
    <div className={cx("flex items-center gap-1 rounded-xl bg-gray-100 p-1", className)} role="tablist">
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
                ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-ink-tertiary hover:text-ink-secondary",
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
