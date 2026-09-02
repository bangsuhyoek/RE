import { useRef, useState } from "react";
import {
  ArrowLeft,
  BellOff,
  CalendarDays,
  CreditCard,
  Home,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { daysUntilCharge, formatBillingDate, formatWon } from "../lib/dates";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export function LogoMark({ className = "" }) {
  return (
    <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black text-sm font-bold text-white", className)} aria-hidden="true">
      S
    </span>
  );
}

export function ServiceMark({ monogram, className = "" }) {
  return (
    <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#18181B] text-sm font-bold text-white", className)} aria-hidden="true">
      {monogram}
    </span>
  );
}

export function Button({ children, className = "", variant = "primary", size = "default", type = "button", ...props }) {
  const variants = {
    primary: "bg-black text-white hover:bg-[#18181B]",
    secondary: "border border-[#E4E4E7] bg-white text-black hover:bg-[#FAFAFA]",
    ghost: "text-[#71717A] hover:text-black hover:underline underline-offset-4",
    danger: "bg-[#EF4444] text-white hover:bg-[#dc2626]",
  };
  const sizes = {
    default: "rounded-xl px-4 py-3.5 text-[15px] font-semibold",
    compact: "rounded-lg px-3 py-2.5 text-[13px] font-semibold",
    icon: "grid h-10 w-10 place-items-center rounded-xl",
  };
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 transition-[transform,background-color,color,border-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DDayBadge({ subscription }) {
  const days = daysUntilCharge(subscription);
  if (subscription.isTrial || subscription.status === "trial") {
    return <span className="rounded-[4px] border border-dashed border-black bg-white px-2 py-1 text-[11px] font-bold tracking-[0.02em]">TRIAL D-{days}</span>;
  }
  if (days === 0) {
    return <span className="today-pulse rounded-[4px] bg-black px-2 py-1 text-[11px] font-bold tracking-[0.02em] text-white">TODAY</span>;
  }
  if (days <= 3) {
    return <span className="rounded-[4px] border border-black bg-white px-2 py-1 text-[11px] font-bold tracking-[0.02em]">D-{days}</span>;
  }
  return <span className="rounded-[4px] bg-[#F4F4F5] px-2 py-1 text-[11px] font-medium text-[#71717A]">D-{days}</span>;
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
        "relative h-6 w-11 rounded-full transition-colors duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
        checked ? "bg-black" : "bg-[#E4E4E7]",
      )}
    >
      <span
        className={cx(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          checked ? "translate-x-[21px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function AppHeader({ title, onBack, onAdd, rightSlot }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-[#E4E4E7] bg-white/95 px-5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        {onBack ? (
          <Button variant="secondary" size="icon" className="h-9 w-9 rounded-lg border-0 bg-transparent" onClick={onBack} aria-label="이전 화면">
            <ArrowLeft size={19} />
          </Button>
        ) : (
          <LogoMark className="h-8 w-8 rounded-lg text-xs" />
        )}
        <span className="truncate text-[18px] font-semibold tracking-[-0.01em]">{title || "SubMate"}</span>
      </div>
      <div className="flex items-center gap-2">
        {rightSlot}
        {onAdd && (
          <Button size="compact" className="h-9 rounded-lg px-3 py-1.5 text-[13px]" onClick={onAdd} aria-label="AI로 구독 추가">
            <Plus size={16} />
            AI 추가
          </Button>
        )}
      </div>
    </header>
  );
}

export function BottomNavigation({ route, onNavigate }) {
  const items = [
    { id: "home", label: "홈", Icon: Home },
    { id: "subscriptions", label: "구독", Icon: CreditCard },
    { id: "calendar", label: "캘린더", Icon: CalendarDays },
    { id: "promotions", label: "혜택", Icon: Sparkles },
  ];
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 flex h-16 w-full max-w-[420px] -translate-x-1/2 border-x border-t border-[#E4E4E7] bg-white/95 px-3 pb-2 pt-2 backdrop-blur-md" aria-label="주요 탐색">
      {items.map(({ id, label, Icon }) => {
        const active = route === id || (route === "detail" && id === "subscriptions");
        return (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            className={cx("flex flex-1 flex-col items-center gap-1 rounded-xl py-1 text-[10px] tracking-tight transition-[color,transform]", active ? "scale-[1.02] font-bold text-black" : "font-medium text-[#A1A1AA] hover:text-[#71717A]")}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}

function SubscriptionCardBody({ subscription, onOpen, detail = false }) {
  return (
    <button type="button" onClick={onOpen} className="card-press flex w-full items-center gap-3 rounded-2xl border border-[#E4E4E7] bg-white p-3.5 text-left">
      <ServiceMark monogram={subscription.monogram} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{subscription.name}</span>
        <span className="mt-0.5 block truncate text-[13px] text-[#71717A]">{subscription.plan} · {formatBillingDate(subscription)}</span>
        {detail && <span className="mt-1 block truncate text-[12px] text-[#A1A1AA]">{subscription.paymentMethod}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-2">
        <DDayBadge subscription={subscription} />
        <span className="text-[14px] font-semibold">{formatWon(subscription.amount)}</span>
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
        <button type="button" tabIndex={revealed ? 0 : -1} onClick={onCancel} className="flex w-1/2 flex-col items-center justify-center gap-1 bg-black text-[10px] font-semibold text-white">
          <X size={16} />
          해지
        </button>
        <button type="button" tabIndex={revealed ? 0 : -1} onClick={onMute} className="flex w-1/2 flex-col items-center justify-center gap-1 bg-[#71717A] text-[10px] font-semibold text-white">
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

export function BottomSheet({ children, onClose, label }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-label="닫기" />
      <section className="sheet-enter relative max-h-[calc(100dvh-1.5rem)] w-full max-w-[420px] overflow-y-auto rounded-t-[24px] border border-[#E4E4E7] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:rounded-2xl">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#E4E4E7]" />
        {children}
      </section>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className="toast-enter fixed left-1/2 top-5 z-[70] w-[calc(100%-2rem)] max-w-[388px] -translate-x-1/2 rounded-xl bg-[#18181B] px-4 py-3 text-[13px] font-medium text-white shadow-xl" role="status">
      <div className="flex items-center justify-between gap-3">
        <span>{toast}</span>
        <button type="button" onClick={onClose} aria-label="알림 닫기" className="text-white/70 hover:text-white">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
