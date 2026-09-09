import { useRef, useState } from "react";
import { ArrowLeft, BellOff, CalendarDays, CreditCard, Home, Plus, Sparkles, X } from "lucide-react";
import { daysUntilCharge, formatBillingDate, formatWon } from "../lib/dates";
import { RELogo } from "./REBrand";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export function LogoMark({ className = "" }) {
  return <span className={cx("inline-flex items-center", className)}><RELogo markClassName="h-8 w-auto" /></span>;
}

export function ServiceMark({ monogram, className = "" }) {
  const display = monogram?.trim()?.slice(0, 2).toUpperCase() || "RE";
  return <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#E4EAF6] bg-white text-[12px] font-extrabold text-[#3746A5] shadow-sm", className)}>{display}</span>;
}

export function Button({ children, className = "", variant = "primary", size = "default", type = "button", ...props }) {
  const variants = { primary: "re-btn-primary", secondary: "re-btn-secondary", ghost: "re-btn-ghost", danger: "re-btn-danger" };
  const sizes = { default: "rounded-2xl px-4 py-3.5 text-[15px]", compact: "rounded-xl px-3 py-2.5 text-[13px]", icon: "grid h-10 w-10 place-items-center rounded-xl" };
  return <button type={type} className={cx("inline-flex items-center justify-center gap-2 font-bold transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40", variants[variant], sizes[size], className)} {...props}>{children}</button>;
}

export function DDayBadge({ subscription }) {
  if (subscription.status === "cancel_in_progress") return <span className="rounded-full bg-[#FCEBE5] px-2.5 py-1 text-[10px] font-bold text-[#9B5E49]">해지 진행</span>;
  if (subscription.status === "cancel_pending") return <span className="rounded-full bg-[#E3E6F7] px-2.5 py-1 text-[10px] font-bold text-[#3746A5]">해지 확인</span>;
  const days = Math.max(0, daysUntilCharge(subscription));
  if (subscription.isTrial || subscription.status === "trial") return <span className="rounded-full bg-[#E3E6F7] px-2.5 py-1 text-[10px] font-bold text-[#3746A5]">TRIAL D-{days}</span>;
  if (days === 0) return <span className="today-pulse rounded-full bg-[#3746A5] px-2.5 py-1 text-[10px] font-bold text-white">TODAY</span>;
  return <span className="rounded-full bg-[#F4F7FD] px-2.5 py-1 text-[10px] font-bold text-[#7E8AC0]">D-{days}</span>;
}

export function ToggleSwitch({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cx("relative inline-flex h-7 w-12 rounded-full p-0.5 transition", checked ? "bg-[#475FAC]" : "bg-[#DDE3F2]")}><span className={cx("h-6 w-6 rounded-full bg-white shadow transition", checked ? "translate-x-5" : "translate-x-0")} /></button>;
}

export function AppHeader({ title, onBack, rightSlot = null }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E4EAF6] bg-[#F7FAFD]/95 px-5 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        {onBack ? <button type="button" onClick={onBack} className="re-icon-button" aria-label="뒤로가기"><ArrowLeft size={20} /></button> : <RELogo markClassName="h-7 w-auto" />}
        <span className="text-[17px] font-extrabold text-[#1B2A8C]">{title}</span>
      </div>
      {rightSlot}
    </header>
  );
}

export function BottomNavigation({ route, onNavigate, onOpenAdd }) {
  const item = (target, icon, label) => (
    <button type="button" onClick={() => onNavigate(target)} className={cx("flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px]", route === target || (target === "subscriptions" && route === "detail") ? "font-bold text-[#475FAC]" : "text-[#9099CA]")}>
      {icon}<span>{label}</span>
    </button>
  );
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 flex h-[72px] w-full max-w-[420px] -translate-x-1/2 items-center border-x border-t border-[#E4EAF6] bg-white/95 px-2 pb-2 pt-1 backdrop-blur-xl" aria-label="주요 메뉴">
      {item("home", <Home size={19} />, "홈")}
      {item("subscriptions", <CreditCard size={19} />, "구독")}
      <div className="flex flex-1 justify-center"><button type="button" onClick={onOpenAdd} className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#A0C3DD] to-[#C7BCEC] text-white shadow-lg" aria-label="구독 추가"><Plus size={22} /></button></div>
      {item("calendar", <CalendarDays size={19} />, "캘린더")}
      {item("promotions", <Sparkles size={19} />, "혜택")}
    </nav>
  );
}

function SubscriptionCardBody({ subscription, onOpen, detail = false }) {
  const secondary = subscription.status === "cancel_pending"
    ? "해지 완료 여부 확인 중"
    : subscription.status === "cancel_in_progress"
      ? "해지를 이어서 할 수 있어요"
      : `${subscription.plan || "요금제 미등록"} · ${formatBillingDate(subscription)}`;
  return (
    <button type="button" onClick={onOpen} className="re-dashboard-card flex w-full items-center gap-3 rounded-[18px] p-3.5 text-left">
      <ServiceMark monogram={subscription.monogram || subscription.name?.[0]} />
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[14px] text-[#1B2A8C]">{subscription.name}</strong>
        <span className="mt-1 block truncate text-[11px] text-[#9099CA]">{secondary}</span>
        {detail && <span className="mt-1 block text-[10px] text-[#B4BCDD]">{subscription.paymentMethod || "결제수단 미등록"}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-2"><DDayBadge subscription={subscription} /><strong className="text-[13px] text-[#3746A5]">{formatWon(subscription.amount)}</strong></span>
    </button>
  );
}

export function SubscriptionCard({ subscription, onOpen, onCancel, onMute, swipable = false, detail = false }) {
  const [revealed, setRevealed] = useState(false);
  const [dragX, setDragX] = useState(0);
  const startX = useRef(null);

  if (!swipable) return <SubscriptionCardBody subscription={subscription} onOpen={onOpen} detail={detail} />;

  const down = (event) => {
    startX.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const move = (event) => {
    if (startX.current !== null) setDragX(Math.max(-120, Math.min(0, event.clientX - startX.current)));
  };
  const end = () => {
    if (startX.current === null) return;
    setRevealed(dragX < -55 || revealed);
    setDragX(0);
    startX.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-[18px]">
      <div className="absolute inset-y-0 right-0 flex w-[120px]">
        <button type="button" onClick={onCancel} className="flex w-1/2 flex-col items-center justify-center gap-1 bg-[#FEF4F6] text-[10px] font-bold text-[#E43C78]"><X size={16} />해지</button>
        <button type="button" onClick={onMute} className="flex w-1/2 flex-col items-center justify-center gap-1 bg-[#E3E6F7] text-[10px] font-bold text-[#3746A5]"><BellOff size={16} />알림 끄기</button>
      </div>
      <div style={{ transform: `translateX(${revealed ? -120 : dragX}px)` }} className="relative touch-pan-y transition-transform duration-200" onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        <SubscriptionCardBody subscription={subscription} onOpen={onOpen} detail={detail} />
      </div>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  return <div className="toast-enter fixed bottom-24 left-1/2 z-50 flex w-[calc(100%-2.5rem)] max-w-[380px] -translate-x-1/2 items-center justify-between rounded-2xl bg-[#3746A5] px-4 py-3.5 text-white shadow-xl"><p className="text-[13px] font-medium">{toast}</p><button type="button" onClick={onClose} aria-label="알림 닫기"><X size={16} /></button></div>;
}

export function BottomSheet({ children, onClose, label }) {
  return <div className="fixed inset-0 z-40 bg-[#1B2A8C]/25 backdrop-blur-sm" onClick={onClose}><div className="sheet-enter fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[420px] rounded-t-[30px] bg-gradient-to-br from-[#DEEFF5] via-[#EFE7FB] to-[#E9EDFD] px-5 pb-8 pt-4 shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={label}><div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/80" />{children}</div></div>;
}
