import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, ChevronRight, X, Trash2, Send } from "lucide-react";
import { BottomSheet, Button, DDAY_BADGE_TONE, ServiceLogo, ServiceMark } from "./ui";
import { normalizeWonText } from "../lib/dates";

/** 알림 배지를 사람이 읽는 말로 바꾼다. TODAY → 오늘, TRIAL D-1 → 무료 D-1. */
export function formatNotificationBadge(badge = "") {
  const text = String(badge || "").trim();
  if (!text) return "";
  return text.replace(/^TODAY$/i, "오늘").replace(/^TRIAL\s*/i, "무료 ");
}

/** C2: 배지는 색 면 없이 글자로만. 오늘·D-3 이내만 빨강, 나머지는 회색. */
export function isUrgentNotificationBadge(badge = "") {
  const b = String(badge || "").toUpperCase();
  if (b.includes("TODAY") || b.includes("오늘")) return true;
  const dday = b.match(/D-(\d+)/);
  return Boolean(dday && Number(dday[1]) <= 3);
}

function getNotificationBadgeStyle(badge = "") {
  return isUrgentNotificationBadge(badge) ? DDAY_BADGE_TONE.urgent : DDAY_BADGE_TONE.normal;
}

/** 알림 시각을 짧게: 오늘이면 "오전 9:05", 어제면 "어제", 그 외 "10월 26일". */
export function formatNotificationTime(value, now = new Date()) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, now)) {
    const h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${m}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "어제";
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/**
 * Floating push notification banner (simulates iOS/Android push notification banner)
 */
export function PushNotificationBanner({ notification, onClose, onOpenDetail, duration = 2500 }) {
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

    // Hard ceiling timeout: 2~3초 내 빠른 자동 사라짐 보장 (사용자 피드백)
    hardTimeoutRef.current = setTimeout(() => {
      handleClose();
    }, Math.min(duration + 500, 3500));

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
                <span className="shrink-0 text-[11px] font-semibold tracking-tight text-white/70">
                  {formatNotificationBadge(notification.badge)}
                </span>
                <span className="truncate text-[12px] font-semibold tracking-tight text-white">
                  {normalizeWonText(notification.title)}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-white/80">
                {normalizeWonText(notification.message)}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2">
            <span className="text-[10px] font-medium text-ink-subtle">
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
 * 알림 센터 시트 (C2): 평평한 목록 행, 글자 배지, 짧은 시각 표시.
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
}) {
  return (
    <BottomSheet onClose={onClose} label="꾸독 알림 센터">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-1">
          <h2 className="min-w-0 truncate text-[20px] font-bold tracking-[-0.03em] text-ink">
            알림
            {unreadCount > 0 && <span className="ml-1.5 text-[16px] font-semibold text-ink-tertiary">{unreadCount}개 안 읽음</span>}
          </h2>

          <div className="-mr-2 flex shrink-0 items-center">
            {notifications.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="min-h-[44px] px-2 text-[14px] font-medium text-ink-tertiary hover:text-ink"
                >
                  모두 읽음
                </button>
                <button
                  type="button"
                  onClick={onClearAll}
                  className="grid h-11 w-11 place-items-center rounded-full text-ink-tertiary hover:bg-gray-100 hover:text-danger"
                  aria-label="알림 전체 삭제"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid h-11 w-11 place-items-center rounded-full text-ink-tertiary hover:bg-gray-100 hover:text-ink"
              aria-label="알림 센터 닫기"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <p className="text-[13px] text-ink-tertiary">결제 전에 미리 알려 드린 내역이에요.</p>

        {/* Quick Test Trigger Bar: 개발 서버에서만 보인다(배포 APK는 프로덕션 빌드라 숨겨진다). */}
        {import.meta.env.DEV && (
          <div className="mt-3 flex min-h-[52px] items-center justify-between gap-2 border-y border-gray-100 py-2">
            <span className="text-[14px] text-ink-tertiary">개발용: D-1/D-3 알림 바로 보내기</span>
            <Button size="compact" variant="secondary" className="shrink-0" onClick={onTriggerTest}>
              <Send size={13} />
              보내기
            </Button>
          </div>
        )}

        {/* Notification List */}
        <div className="-mx-5 mt-2 max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Bell size={24} strokeWidth={1.6} className="mx-auto text-ink-subtle" />
              <p className="mt-3 text-[16px] font-medium text-ink">도착한 알림이 없어요</p>
              <p className="mt-1 text-[13px] text-ink-tertiary">결제 3일 전과 하루 전에 알려 드려요.</p>
            </div>
          ) : (
            notifications.map((item) => {
              const badgeText = formatNotificationBadge(item.badge);
              const time = formatNotificationTime(item.timestamp);
              return (
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
                  aria-label={`${item.read ? "" : "안 읽음, "}${badgeText ? badgeText + ", " : ""}${item.title}`}
                  className={`flex min-h-[72px] cursor-pointer items-start gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink ${
                    !item.read ? "bg-gray-50" : ""
                  }`}
                >
                  <ServiceLogo
                    serviceId={item.subscriptionId || item.serviceId}
                    name={item.title || item.name}
                    monogram={item.monogram}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <strong className={`truncate text-[15px] leading-[21px] text-ink ${item.read ? "font-medium" : "font-semibold"}`}>
                        {normalizeWonText(item.title)}
                      </strong>
                      {!item.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" />}
                      {time && <span className="ml-auto shrink-0 pl-2 text-[12px] text-ink-tertiary">{time}</span>}
                    </div>
                    <p className="mt-0.5 text-[14px] leading-[20px] text-ink-secondary">
                      {normalizeWonText(item.message)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[13px] leading-[18px]">
                      {badgeText && (
                        <span className={`font-semibold ${getNotificationBadgeStyle(item.badge)}`}>{badgeText}</span>
                      )}
                      {item.isTest && import.meta.env.DEV && <span className="text-ink-tertiary">테스트 알림</span>}
                    </p>
                  </div>
                  <ChevronRight size={16} className="mt-3 shrink-0 text-ink-subtle" aria-hidden="true" />
                </div>
              );
            })
          )}
        </div>

        {/* Permission Status Footer */}
        <div className="mt-2 flex min-h-[48px] items-center justify-between border-t border-gray-100 text-[14px]">
          <span className="text-ink-tertiary">
            기기 알림{" "}
            <strong className="font-medium text-ink">
              {notificationPermission === "granted"
                ? "허용됨"
                : notificationPermission === "denied"
                ? "차단됨"
                : "설정 안 함"}
            </strong>
          </span>
          {notificationPermission !== "granted" && (
            <button
              type="button"
              onClick={onRequestPermission}
              className="-mr-2 min-h-[44px] px-2 text-[14px] font-semibold text-ink"
            >
              알림 허용하기
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
