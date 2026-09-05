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
    <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-white/70 bg-[linear-gradient(135deg,#dcece6,#e8dff0,#f1e2e8)] text-[13px] font-semibold text-[#4f5652] shadow-sm", className)} aria-hidden="true">
      RE.
    </span>
  );
}

export function ServiceMark({ monogram, className = "" }) {
  const display = (monogram && monogram.trim()) ? monogram.trim().slice(0, 2).toUpperCase() : "RE";
  return (
    <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#E4ECE8] bg-white/80 text-sm font-bold text-[#56635D] shadow-sm", className)} aria-hidden="true">
      {display}
    </span>
  );
}

export function Button({ children, className = "", variant = "primary", size = "default", type = "button", ...props }) {
  const variants = {
    primary: "bg-[#4F5D57] text-white hover:bg-[#43504A] shadow-sm",
    secondary: "border border-[#DDE7E2] bg-white/80 text-[#4F5D57] hover:bg-[#F7FAF8]",
    ghost: "text-[#7D8983] hover:text-[#4F5D57] hover:underline underline-offset-4",
    danger: "border border-[#E9D7DA] bg-[#FBF3F4] text-[#A85D67] hover:bg-[#F7E9EB]",
  };
  const sizes = {
    default: "rounded-2xl px-4 py-3.5 text-[15px] font-semibold",
    compact: "rounded-xl px-3 py-2.5 text-[13px] font-semibold",
    icon: "grid h-10 w-10 place-items-center rounded-xl",
  };
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 transition-[transform,background-color,color,border-color] duration-180 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40",
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
    return <span className="rounded-full border border-[#D8CFE1] bg-[#F7F1FA] px-2.5 py-1 text-[11px] font-semibold text-[#7A6F87]">체험 D-{days}</span>;
  }
  if (days === 0) {
    return <span className="rounded-full bg-[#5D6C65] px-2.5 py-1 text-[11px] font-semibold text-white">오늘</span>;
  }
  if (days <= 3) {
    return <span className="rounded-full border border-[#E5D5DF] bg-[#FAF3F6] px-2.5 py-1 text-[11px] font-semibold text-[#8B6D7D]">D-{days}</span>;
  }
  return <span className="rounded-full bg-[#EFF4F1] px-2.5 py-1 text-[11px] font-medium text-[#71827B]">D-{days}</span>;
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
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
        checked ? "bg-[#5D6C65]" : "bg-[#DDE7E2]",
      )}
    >
      <span aria-hidden="true" className={cx("pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out", checked ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
}

export function AppHeader({ title, onBack, rightSlot = null }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#E6ECE8] bg-[#FFFDF9]/90 px-5 backdrop-blur-md">
      <div className="flex items-center gap-2">
        {onBack ? (
          <button type="button" onClick={onBack} className="grid h-9 w-9 place-items-center rounded-xl text-[#7D8983] hover:bg-[#F3F7F4] hover:text-[#4F5D57]" aria-label="뒤로가기"><ArrowLeft size={20} /></button>
        ) : (
          <LogoMark />
        )}
        <span className="re-serif text-[18px] font-semibold tracking-[-0.02em] text-[#303633]">{title}</span>
      </div>
      <div className="flex items-center gap-2">{rightSlot}</div>
    </header>
  );
}

export function BottomNavigation({ route, onNavigate, onOpenAdd }) {
  const active = "scale-[1.02] font-semibold text-[#4F5D57]";
  const inactive = "font-medium text-[#A5B0AB] hover:text-[#7D8983]";
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 flex h-16 w-full max-w-[420px] -translate-x-1/2 items-center justify-around border-x border-t border-[#E6ECE8] bg-[#FFFDF9]/94 px-2 pb-1 pt-1 backdrop-blur-md" aria-label="주요 탐색">
      <button type="button" onClick={() => onNavigate("home")} className={cx("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] tracking-tight transition-[color,transform]", route === "home" ? active : inactive)} aria-current={route === "home" ? "page" : undefined}><Home size={20} strokeWidth={route === "home" ? 2.4 : 1.7} /><span>홈</span></button>
      <button type="button" onClick={() => onNavigate("subscriptions")} className={cx("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] tracking-tight transition-[color,transform]", (route === "subscriptions" || route === "detail") ? active : inactive)} aria-current={(route === "subscriptions" || route === "detail") ? "page" : undefined}><CreditCard size={20} strokeWidth={(route === "subscriptions" || route === "detail") ? 2.4 : 1.7} /><span>구독</span></button>
      <div className="flex flex-1 items-center justify-center"><button type="button" onClick={onOpenAdd} className="grid h-11 w-11 place-items-center rounded-full bg-[linear-gradient(135deg,#6F7E77,#8A8098)] text-white shadow-[0_10px_24px_rgba(111,126,119,0.22)] transition-transform duration-150 active:scale-95" aria-label="새 구독 추가"><Plus size={22} strokeWidth={2.4} /></button></div>
      <button type="button" onClick={() => onNavigate("calendar")} className={cx("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] tracking-tight transition-[color,transform]", route === "calendar" ? active : inactive)} aria-current={route === "calendar" ? "page" : undefined}><CalendarDays size={20} strokeWidth={route === "calendar" ? 2.4 : 1.7} /><span>캘린더</span></button>
      <button type="button" onClick={() => onNavigate("promotions")} className={cx("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] tracking-tight transition-[color,transform]", route === "promotions" ? active : inactive)} aria-current={route === "promotions" ? "page" : undefined}><Sparkles size={20} strokeWidth={route === "promotions" ? 2.4 : 1.7} /><span>혜택</span></button>
    </nav>
  );
}

function SubscriptionCardBody({ subscription, onOpen, detail = false }) {
  return (
    <button type="button" onClick={onOpen} className="card-press flex w-full items-center gap-3 rounded-[22px] border border-[#E4ECE8] bg-white/78 p-3.5 text-left shadow-[0_8px_24px_rgba(70,86,78,0.04)]">
      <ServiceMark monogram={subscription.monogram || subscription.name?.slice(0, 1)} />
      <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold text-[#37413D]">{subscription.name}</span><span className="mt-0.5 block truncate text-[13px] text-[#7D8983]">{subscription.plan} · {formatBillingDate(subscription)}</span>{detail && <span className="mt-1 block truncate text-[12px] text-[#A5B0AB]">{subscription.paymentMethod || "결제수단 미등록"}</span>}</span>
      <span className="flex shrink-0 flex-col items-end gap-2"><DDayBadge subscription={subscription} /><span className="text-[14px] font-semibold text-[#4F5D57]">{formatWon(subscription.amount)}</span></span>
    </button>
  );
}

export function SubscriptionCard({ subscription, onOpen, onCancel, onMute, swipable = false, detail = false }) {
  const [revealed, setRevealed] = useState(false);
  const [dragX, setDragX] = useState(0);
  const startX = useRef(null);
  if (!swipable) return <SubscriptionCardBody subscription={subscription} onOpen={onOpen} detail={detail} />;
  const handlePointerDown = (event) => { startX.current = event.clientX; event.currentTarget.setPointerCapture?.(event.pointerId); };
  const handlePointerMove = (event) => { if (startX.current === null) return; setDragX(Math.max(-120, Math.min(0, event.clientX - startX.current))); };
  const handlePointerEnd = () => { if (startX.current === null) return; setRevealed(dragX < -55 || revealed); setDragX(0); startX.current = null; };
  const translate = revealed ? -120 : dragX;
  return (
    <div className="relative overflow-hidden rounded-[22px]">
      <div className="absolute inset-y-0 right-0 flex w-[120px] overflow-hidden rounded-r-[22px]" aria-hidden={!revealed}><button type="button" tabIndex={revealed ? 0 : -1} onClick={onCancel} className="flex w-1/2 flex-col items-center justify-center gap-1 bg-[#8B6D7D] text-[10px] font-semibold text-white"><X size={16} />해지</button><button type="button" tabIndex={revealed ? 0 : -1} onClick={onMute} className="flex w-1/2 flex-col items-center justify-center gap-1 bg-[#71827B] text-[10px] font-semibold text-white"><BellOff size={16} />알림 끄기</button></div>
      <div className="relative touch-pan-y transition-transform duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)]" style={{ transform: `translateX(${translate}px)` }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd}><SubscriptionCardBody subscription={subscription} onOpen={onOpen} detail={detail} /></div>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  return <div className="toast-enter fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2.5rem)] max-w-[380px] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-[#4F5D57] px-4 py-3.5 text-white shadow-xl"><p className="text-[13px] font-medium leading-5">{toast}</p><button type="button" onClick={onClose} className="rounded-lg p-1 text-white/65 hover:text-white" aria-label="알림 닫기"><X size={16} /></button></div>;
}

export function BottomSheet({ children, onClose, label }) {
  return (
    <div className="fixed inset-0 z-40 bg-[#303633]/35 backdrop-blur-sm" onClick={onClose}>
      <div className="sheet-enter fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[420px] rounded-t-[30px] border-t border-[#E4ECE8] bg-[#FFFDF9] px-5 pb-8 pt-4 shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={label}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#DDE7E2]" />{children}
      </div>
    </div>
  );
}
