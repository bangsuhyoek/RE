import { useEffect } from "react";
import { Bell, BellRing, ChevronRight, Trash2, X } from "lucide-react";
import { BottomSheet, ServiceMark } from "./ui";
import { RiveCharacter } from "./RiveCharacter";
import { serviceMarkToneClass } from "../lib/serviceBrand";

export function PushNotificationBanner({ notification, onClose, onOpenDetail }) {
  useEffect(() => {
    if (!notification) return undefined;
    const timer = window.setTimeout(onClose, 8000);
    return () => window.clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  return (
    <div className="re-push-banner fixed inset-x-0 top-3 z-[70] mx-auto w-[calc(100%-1.5rem)] max-w-[396px] push-banner-enter">
      <div className="re-push-banner__surface rounded-2xl p-3.5 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5"><span className="re-push-banner__mark">R</span><span className="text-[11px] font-bold tracking-wider">RE.</span><span className="h-1 w-1 rounded-full bg-white/40" /><span className="text-[10px] text-white/65">지금</span></div>
          <button type="button" onClick={onClose} className="grid h-6 w-6 place-items-center rounded-full text-white/65 hover:bg-white/10 hover:text-white" aria-label="알림 닫기"><X size={13} /></button>
        </div>
        <button type="button" onClick={() => onOpenDetail(notification.subscriptionId)} className="mt-2 w-full text-left">
          <div className="flex items-start gap-2.5">
            <ServiceMark monogram={notification.monogram} className="mt-0.5 h-9 w-9 rounded-full bg-white/14 text-[11px] text-white" />
            <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white">{notification.badge}</span><span className="truncate text-[12px] font-semibold text-white">{notification.title}</span></div><p className="mt-1 text-[11px] leading-4 text-white/82">{notification.message}</p></div>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2"><span className="text-[10px] font-medium text-white/55">탭하여 구독 상세보기</span><span className="flex items-center gap-0.5 text-[10px] font-semibold text-white">확인하기 <ChevronRight size={12} /></span></div>
        </button>
      </div>
    </div>
  );
}

export function NotificationCenterModal({ notifications, unreadCount, onClose, onOpenDetail, onMarkAllRead, onClearAll, notificationPermission, onRequestPermission }) {
  return (
    <BottomSheet onClose={onClose} label="RE. 알림 센터">
      <div className="re-notification-center">
        <div className="re-notification-center__head flex items-center justify-between border-b pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="re-notification-center__icon grid h-10 w-10 shrink-0 place-items-center rounded-xl"><BellRing size={18} /></div>
            <div className="min-w-0"><div className="flex items-center gap-2"><h2>알림 센터</h2>{unreadCount > 0 && <span className="re-notification-center__count">{unreadCount}</span>}</div><p>등록된 구독의 결제 전 알림을 모아 보여드려요.</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {notifications.length > 0 && <>
              <button type="button" onClick={onMarkAllRead} className="re-notification-text-button">모두 읽음</button>
              <button type="button" onClick={onClearAll} className="re-notification-icon-button" aria-label="알림 전체 삭제"><Trash2 size={16} /></button>
            </>}
            <button type="button" onClick={onClose} className="re-notification-icon-button" aria-label="알림 센터 닫기"><X size={18} /></button>
          </div>
        </div>

        <div className="re-notification-center__list mt-3 max-h-[420px] divide-y overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="re-notification-empty py-7 text-center">
              <RiveCharacter state="idle" className="re-notification-empty__character" />
              <p className="re-notification-empty__title">도착한 알림이 없어요</p>
              <p className="re-notification-empty__copy">등록한 구독의 결제 일정에 따라 D-3 · D-1 알림을 여기에서 확인할 수 있어요.</p>
            </div>
          ) : notifications.map((item) => (
            <button key={item.id} type="button" onClick={() => onOpenDetail(item.subscriptionId)} className={`re-notification-row flex w-full items-start gap-3 rounded-xl px-3 py-3.5 text-left ${!item.read ? "is-unread" : ""}`}>
              <ServiceMark monogram={item.monogram} className={`mt-0.5 h-10 w-10 shrink-0 rounded-full text-[11px] ${serviceMarkToneClass(item)}`} />
              <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="re-notification-row__badge">{item.badge}</span><strong className="truncate">{item.title}</strong>{!item.read && <span className="re-notification-row__dot" />}</div><p>{item.message}</p></div><ChevronRight size={15} className="mt-3 shrink-0 text-[#9AA6C8]" />
            </button>
          ))}
        </div>

        <div className="re-notification-center__permission mt-3 flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-1.5"><Bell size={14} /><span>기기 알림:</span><strong>{notificationPermission === "granted" ? "허용됨" : notificationPermission === "denied" ? "차단됨" : "미설정"}</strong></div>
          {notificationPermission !== "granted" && <button type="button" onClick={onRequestPermission}>알림 권한 허용하기</button>}
        </div>
      </div>
    </BottomSheet>
  );
}
