import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CreditCard,
  Gift,
  Home,
  MessageCircle,
  PlusCircle,
  X,
} from "lucide-react";

import { cx } from "./cx";
import { IconButton } from "./controls";

/** C2 에이전트 진입점. 헤더 오른쪽의 작은 회색 알약 버튼. */
export function AgentEntryPill({ onClick, label = "꾸독에게 맡기기" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex h-8 items-center gap-1.5 rounded-full bg-gray-100 px-3 text-[14px] font-semibold tracking-tight text-ink-muted transition-colors hover:bg-gray-200 active:bg-gray-200 before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-['']"
    >
      <MessageCircle size={16} strokeWidth={1.8} aria-hidden="true" />
      {label}
    </button>
  );
}

/** C2 알림 버튼. 읽지 않은 알림이 있으면 작은 빨간 점. */
export function NotificationBellButton({ onClick, unreadCount = 0 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative grid h-10 w-10 place-items-center rounded-full text-ink-muted transition-colors hover:bg-gray-100 hover:text-ink before:absolute before:-inset-0.5 before:content-['']"
      aria-label={unreadCount > 0 ? `알림 센터 열기, 읽지 않은 알림 ${unreadCount}개` : "알림 센터 열기"}
    >
      <Bell size={22} strokeWidth={1.8} />
      {unreadCount > 0 && <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-danger" aria-hidden="true" />}
    </button>
  );
}

/** C2 홈 헤더: 왼쪽 "꾸독", 오른쪽 에이전트 알약 + 알림. 홈 화면 재구성 때 쓴다. */
export function MainHeader({ onOpenAgent, onOpenNotifications, unreadCount = 0 }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white pt-safe">
      <div className="flex h-[52px] items-center justify-between pl-5 pr-3">
        <span className="text-[20px] font-bold tracking-[-0.04em] text-ink">꾸독</span>
        <div className="flex items-center gap-1">
          {onOpenAgent && <AgentEntryPill onClick={onOpenAgent} />}
          {onOpenNotifications && <NotificationBellButton onClick={onOpenNotifications} unreadCount={unreadCount} />}
        </div>
      </div>
    </header>
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
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer select-none rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus active:scale-[0.97] before:absolute before:-inset-x-2 before:-inset-y-2.5 before:content-['']",
        checked ? "bg-brand" : "bg-gray-300",
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

export function AppHeader({ title, onBack, rightSlot = null, large = false }) {
  return (
    <header className="sticky top-0 z-30 flex flex-col w-full bg-white pt-safe">
      <div className="flex h-14 w-full items-center justify-between pl-4 pr-3 sm:pl-5">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <IconButton onClick={onBack} aria-label="뒤로가기" size="medium">
              <ArrowLeft size={22} className="text-ink" />
            </IconButton>
          )}
          <span className={cx("font-bold tracking-[-0.03em] text-ink truncate", large ? "text-[24px]" : "text-[20px]")}>{title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {rightSlot}
        </div>
      </div>
    </header>
  );
}

const NAV_ITEMS = [
  { key: "home", label: "홈", Icon: Home, routes: ["home"] },
  { key: "subscriptions", label: "구독", Icon: CreditCard, routes: ["subscriptions", "detail"] },
  { key: "add", label: "추가", Icon: PlusCircle, routes: [] },
  { key: "calendar", label: "캘린더", Icon: CalendarDays, routes: ["calendar"] },
  { key: "promotions", label: "혜택", Icon: Gift, routes: ["promotions"] },
];

// C2 하단 탭: 같은 모양의 선 아이콘 5개. 활성은 잉크색, 비활성은 회색. 추가도 일반 탭처럼 둔다.
export function BottomNavigation({
  route,
  onNavigate,
  onOpenAdd,
}) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 grid w-full max-w-full sm:max-w-[440px] -translate-x-1/2 grid-cols-5 border-t border-gray-100 bg-white px-1 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] pt-1" aria-label="주요 탐색">
      {NAV_ITEMS.map(({ key, label, Icon, routes }) => {
        const active = routes.includes(route);
        const isAdd = key === "add";
        return (
          <button
            key={key}
            type="button"
            onClick={isAdd ? onOpenAdd : () => onNavigate(key)}
            className={cx(
              "flex min-h-[52px] flex-col items-center justify-center gap-[3px] text-[11px] tracking-tight transition-colors",
              active ? "font-semibold text-ink" : "font-medium text-ink-tertiary hover:text-ink-muted",
            )}
            aria-current={active ? "page" : undefined}
            aria-label={isAdd ? "새 구독 추가" : undefined}
          >
            <Icon size={24} strokeWidth={active ? 2.1 : 1.7} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
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
          className="rounded-lg p-1 text-ink-subtle hover:text-white transition-colors"
          aria-label="알림 닫기"
        >
          <X size={16} />
        </button>
      </div>

      <div className="h-[2px] w-full bg-white/10">
        <div
          key={toastKey}
          className="h-full bg-brand/80 origin-left"
          style={{
            animation: `toast-shrink ${initialDuration}ms linear forwards`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        />
      </div>
    </div>
  );
}

let nextSheetId = 0;
const activeSheetStack = [];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function BottomSheet({ children, onClose, label, layout = "default" }) {
  // layout="chat": 높이를 고정하고 스크롤 영역을 자식이 직접 나눈다(고정 머리말·입력창). 다른 시트는 그대로.
  const isChat = layout === "chat";
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 열리면 포커스를 시트 안으로 옮기고, 닫히면 시트를 열기 전 위치로 돌려준다.
  // 또한 시트 스택에 등록하여 여러 시트가 열려 있을 때 최상위 시트만 Escape 로 닫히도록 한다.
  useEffect(() => {
    const sheetId = ++nextSheetId;
    activeSheetStack.push({ id: sheetId, dialogRef, close: () => onCloseRef.current?.() });

    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    if (dialog && !dialog.contains(document.activeElement)) {
      dialog.focus({ preventScroll: true });
    }

    const handleGlobalKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (activeSheetStack.length === 0) return;
      const top = activeSheetStack[activeSheetStack.length - 1];
      if (top.id !== sheetId) return;

      // 시트 내부에 다른 dialog(예: 결제수단 선택 창)가 떠 있다면 그 창이 자체 Escape 처리를 하도록 양보
      const topDialog = top.dialogRef.current;
      if (topDialog && topDialog.querySelector('[role="dialog"]')) return;

      event.stopPropagation();
      top.close();
    };

    document.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
      const index = activeSheetStack.findIndex((item) => item.id === sheetId);
      if (index !== -1) {
        activeSheetStack.splice(index, 1);
      }
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      } else {
        const nextTop = activeSheetStack[activeSheetStack.length - 1];
        const nextDialog = nextTop?.dialogRef.current;
        if (nextDialog && !nextDialog.contains(document.activeElement)) {
          nextDialog.focus({ preventScroll: true });
        }
      }
    };
  }, []);

  // Tab 은 시트 안에서만 돈다. 시트 안에 다른 창(role="dialog", 예: 결제수단 선택 창)이 열려 있거나
  // 키가 그 창에서 왔으면 그 창이 처리하도록 손대지 않는다.
  const handleKeyDown = (event) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (event.target.closest?.('[role="dialog"]') !== dialog || dialog.querySelector('[role="dialog"]')) return;
    if (event.key !== "Tab") return;
    event.stopPropagation();
    const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (element) => element.getClientRects().length > 0
    );
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="sheet-backdrop fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={
          "sheet-slide-up fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-full sm:max-w-[440px] flex flex-col rounded-t-[20px] bg-white pt-2.5 outline-none " +
          (isChat
            ? "h-[92vh] h-[92dvh] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
            : "max-h-[90vh] max-h-[90dvh] pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))]")
        }
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className={"mx-auto h-1 w-10 shrink-0 rounded-full bg-gray-200 " + (isChat ? "mb-1" : "mb-3")} aria-hidden="true" />
        {isChat ? (
          <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
        ) : (
          <div className="overflow-y-auto overflow-x-hidden no-scrollbar flex-1 overscroll-contain px-5 pb-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
