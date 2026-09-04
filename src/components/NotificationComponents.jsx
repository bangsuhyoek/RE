import { useEffect } from "react";
import { Bell, BellRing, Check, ChevronRight, Sparkles, X, Trash2, Send } from "lucide-react";
import { BottomSheet, Button, ServiceMark } from "./ui";
import { formatWon } from "../lib/dates";

/**
 * Floating push notification banner (simulates iOS/Android push notification banner)
 */
export function PushNotificationBanner({ notification, onClose, onOpenDetail }) {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onClose();
    }, 8000);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  return (
    <div className="fixed top-3 inset-x-0 mx-auto z-50 w-[calc(100%-1.5rem)] max-w-[396px] push-banner-enter">
      <div className="rounded-2xl border border-black/10 bg-[#18181B]/95 p-3.5 text-white shadow-2xl backdrop-blur-md">
        {/* Banner Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="grid h-4.5 w-4.5 place-items-center rounded-[5px] bg-white text-[9px] font-bold text-black px-1">
              S
            </span>
            <span className="text-[11px] font-bold tracking-wider text-white/80">SUBMATE</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span className="text-[10px] text-white/60">지금</span>
          </div>
          <button
            type="button"
            onClick={onClose}
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
}) {
  return (
    <BottomSheet onClose={onClose} label="SubMate 알림 센터">
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
                className={`flex items-start gap-2.5 py-2.5 px-2 rounded-xl transition-colors cursor-pointer text-left hover:bg-[#FAFAFA] ${
                  !item.read ? "bg-[#F4F4F5]/50" : ""
                }`}
              >
                <ServiceMark
                  monogram={item.monogram}
                  className="mt-0.5 h-9 w-9 text-[11px] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-[4px] border border-black px-1.5 py-0.2 text-[9px] font-bold shrink-0">
                      {item.badge}
                    </span>
                    <strong className="truncate text-[12px] font-semibold">
                      {item.title}
                    </strong>
                    {!item.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-[#71717A]">
                    {item.message}
                  </p>
                  <span className="mt-1 block text-[10px] text-[#A1A1AA]">
                    {item.isTest ? "테스트 알림" : "스마트 정기 알림"} · 탭하여 해지 가이드 열기
                  </span>
                </div>
                <ChevronRight size={14} className="text-[#A1A1AA] shrink-0 mt-2.5" />
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
