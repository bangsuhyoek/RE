import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellRing, Check, ChevronRight, Sparkles, X, Trash2, Send } from "lucide-react";
import { BottomSheet, Button, ServiceMark } from "./ui";
import { formatWon } from "../lib/dates";

function getNotificationBadgeStyle(badge = "") {
  const b = badge.toUpperCase();
  if (b.includes("D-0") || b.includes("D-1") || b.includes("TODAY") || b.includes("오늘")) {
    return "bg-red-50 text-red-600 border border-red-200";
  }
  if (b.includes("D-3") || b.includes("정기")) {
    return "bg-blue-50 text-blue-700 border border-blue-200";
  }
  if (b.includes("체험") || b.includes("만료") || b.includes("TRIAL")) {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }
  return "bg-gray-100 text-gray-700 border border-gray-200";
}

/**
 * Floating push notification banner (simulates iOS/Android push notification banner)
 */
export function PushNotificationBanner({ notification, onClose, onOpenDetail, duration = 6000 }) {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(duration);
  const timerRef = useRef(null);
  const hardTimeoutRef = useRef(null);
  const exitTimerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const notifKey = notification?.id || notification?.title || "";

  const handleClose = useCallback(() => {
    setIsExiting((curr) => {
      if (curr) return curr;
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      exitTimerRef.current = setTimeout(() => {
        onCloseRef.current?.();
      }, 240);
      return true;
    });
  }, []);

  useEffect(() => {
    if (!notification) {
      setIsExiting(false);
      setIsPaused(false);
      return;
    }
    setIsExiting(false);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    remainingTimeRef.current = duration;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);

    timerRef.current = setTimeout(() => {
      handleClose();
    }, duration);

    // Hard ceiling timeout (at most 7000ms): guarantees banner always disappears within 5~7 seconds
    hardTimeoutRef.current = setTimeout(() => {
      handleClose();
    }, Math.min(Math.max(duration + 1000, 5000), 7000));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [notifKey, duration, notification, handleClose]);

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

  if (!notification) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed top-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] inset-x-0 mx-auto z-50 w-[calc(100%-1.5rem)] max-w-[416px] ${
        isExiting ? "push-banner-exit" : "push-banner-enter"
      }`}
    >
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#18181B]/95 p-3.5 text-white shadow-2xl backdrop-blur-md">
        {/* Banner Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold tracking-wider text-white/80">꾸독</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span className="text-[10px] text-white/60">지금</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="grid h-5 w-5 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="알림 닫기"
          >
            <X size={13} />
          </button>
        </div>

        {/* Banner Body */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpenDetail(notification.subscriptionId)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onOpenDetail(notification.subscriptionId);
            }
          }}
          className="mt-2 cursor-pointer text-left focus:outline-none"
        >
          <div className="flex items-start gap-2.5">
            <ServiceMark
              serviceId={notification.subscriptionId || notification.serviceId}
              name={notification.title || notification.name}
              monogram={notification.monogram}
              className="mt-0.5 h-8 w-8 rounded-lg bg-white/10 text-[11px] text-white shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-bold tracking-tight text-white shrink-0">
                  {notification.badge}
                </span>
                <span className="truncate text-[12px] font-semibold tracking-tight text-white">
                  {notification.title}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-white/80">
                {notification.message}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2">
            <span className="text-[10px] font-medium text-[#A1A1AA]">
              탭하여 해지 가이드 바로보기
            </span>
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-white">
              웹사이트에서 해지하기 <ChevronRight size={12} />
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-2.5 h-[2px] w-full overflow-hidden rounded-full bg-white/10">
            <div
              key={notifKey}
              className="h-full bg-white/40 origin-left"
              style={{
                animation: `toast-shrink ${duration}ms linear forwards`,
                animationPlayState: isPaused ? "paused" : "running",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Notification Center Modal / Drawer
 */
export function NotificationCenterModal({
  notifications,
  unreadCount,
  onClose,
  onOpenDetail,
  onMarkAllRead,
  onClearAll,
  onTriggerTest,
  notificationPermission,
  onRequestPermission,
  onTestPaymentDetection,
  onRequestPaymentCapture,
  onOpenTerms,
}) {
  return (
    <BottomSheet onClose={onClose} label="꾸독 알림 센터">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-black text-white shrink-0">
              <BellRing size={15} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-[16px] font-bold tracking-tight">알림 센터</h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#71717A] truncate">결제 D-3, D-1 사전 알림 내역</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {notifications.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-[#71717A] hover:bg-[#F4F4F5] hover:text-black"
                >
                  모두 읽음
                </button>
                <button
                  type="button"
                  onClick={onClearAll}
                  className="grid h-7 w-7 place-items-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-red-600"
                  aria-label="알림 전체 삭제"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-black"
              aria-label="알림 센터 닫기"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Real-time Payment Detection Bar */}
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-xs shadow-xs">
              ⚡
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <strong className="block text-[12px] font-bold text-emerald-950 truncate">실시간 결제 감지</strong>
                <span className="rounded bg-emerald-200/80 px-1 py-0.2 text-[9px] font-bold text-emerald-800">Beta</span>
              </div>
              <span className="block text-[10px] text-emerald-700/80 truncate">
                카드사 결제 알림 시 자동 등록 팝업
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="compact"
              variant="secondary"
              className="!py-1.5 !px-2 !text-[10px] !bg-white !border-emerald-200 !text-emerald-900"
              onClick={onTestPaymentDetection}
            >
              체험
            </Button>
            <Button
              size="compact"
              className="!py-1.5 !px-2 !text-[10px] !bg-emerald-600 !text-white hover:!bg-emerald-700"
              onClick={onRequestPaymentCapture}
            >
              설정
            </Button>
          </div>
        </div>

        {/* Quick Test Trigger Bar */}
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] p-3">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={15} className="text-black shrink-0" />
            <div className="min-w-0">
              <strong className="block text-[12px] font-semibold truncate">알림 기능 즉시 테스트</strong>
              <span className="block text-[10px] text-[#71717A] truncate">
                D-1/D-3 푸시 알림을 즉시 발송합니다
              </span>
            </div>
          </div>
          <Button
            size="compact"
            className="shrink-0 !py-1.5 !px-2.5 !text-[11px]"
            onClick={onTriggerTest}
          >
            <Send size={12} />
            알림 발송
          </Button>
        </div>

        {/* Notification List */}
        <div className="mt-3 max-h-[340px] overflow-y-auto divide-y divide-[#F4F4F5]">
          {notifications.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#F4F4F5] text-[#A1A1AA]">
                <Bell size={18} />
              </div>
              <p className="mt-2 text-[13px] font-semibold text-black">도착한 알림이 없습니다</p>
              <p className="mt-1 text-[11px] text-[#71717A]">
                구독 결제일 3일 전(D-3)과 하루 전(D-1)에 스마트 알림을 보내드려요.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenDetail(item.subscriptionId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onOpenDetail(item.subscriptionId);
                  }
                }}
                className={`flex items-start gap-3 py-3 px-3 rounded-xl transition-all cursor-pointer text-left hover:bg-[#F9FAFB] ${
                  !item.read ? "bg-[#F0F4FF] border-l-[3px] border-l-[#3182F6]" : "border-l-[3px] border-l-transparent bg-white border border-[#F2F4F6]"
                }`}
              >
                <ServiceMark
                  serviceId={item.subscriptionId || item.serviceId}
                  name={item.title || item.name}
                  monogram={item.monogram}
                  className="mt-0.5 h-10 w-10 text-[12px] shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${getNotificationBadgeStyle(item.badge)}`}>
                      {item.badge}
                    </span>
                    <strong className="truncate text-[13px] font-bold text-[#191F28]">
                      {item.title}
                    </strong>
                    {!item.read && (
                      <span className="h-2 w-2 rounded-full bg-red-500 shrink-0 ml-auto" />
                    )}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#4E5968]">
                    {item.message}
                  </p>
                  <span className="mt-1.5 block text-[11px] font-medium text-[#3182F6]">
                    {item.isTest ? "테스트 알림" : "스마트 결제 알림"} · {
                      item.badge?.includes("체험") || item.badge?.includes("D-0") || item.badge?.includes("D-1")
                        ? "탭하여 해지 가이드 및 일정 확인"
                        : "탭하여 결제 상세 정보 확인"
                    }
                  </span>
                </div>
                <ChevronRight size={15} className="text-[#B0B8C1] shrink-0 mt-3" />
              </div>
            ))
          )}
        </div>

        {/* Permission Status Footer */}
        <div className="mt-3 border-t border-[#E4E4E7] pt-2.5 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-[#71717A]">
            <Bell size={13} className="shrink-0" />
            <span>기기 푸시:</span>
            <strong className="text-black">
              {notificationPermission === "granted"
                ? "허용됨"
                : notificationPermission === "denied"
                ? "차단됨"
                : "미설정"}
            </strong>
          </div>
          {notificationPermission !== "granted" && (
            <button
              type="button"
              onClick={onRequestPermission}
              className="text-[11px] font-semibold text-black underline underline-offset-4"
            >
              알림 권한 허용하기
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
