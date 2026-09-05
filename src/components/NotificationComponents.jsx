import { Bell, CheckCheck, X } from "lucide-react";
import { Button } from "./ui";

export function PushNotificationBanner({ notification, onClose, onOpenDetail }) {
  if (!notification) return null;
  return (
    <div className="push-banner-enter fixed left-1/2 top-4 z-[70] w-[calc(100%-2rem)] max-w-[390px] -translate-x-1/2 rounded-[20px] border border-white/80 bg-gradient-to-br from-[#DEEFF5] via-[#EFE7FB] to-[#E9EDFD] p-4 shadow-xl">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/80 text-[#475FAC]"><Bell size={18} /></span>
        <button type="button" onClick={() => onOpenDetail(notification.subscriptionId)} className="min-w-0 flex-1 text-left">
          <strong className="block text-[13px] text-[#1B2A8C]">{notification.title}</strong>
          <p className="mt-1 text-[11px] leading-5 text-[#5B6DA9]">{notification.message}</p>
        </button>
        <button type="button" onClick={onClose} className="text-[#7E8AC0]" aria-label="알림 닫기"><X size={16} /></button>
      </div>
    </div>
  );
}

export function NotificationCenterModal({ notifications, unreadCount, onClose, onOpenDetail, onMarkAllRead, onClearAll, notificationPermission, onRequestPermission }) {
  return (
    <div className="fixed inset-0 z-[60] bg-[#1B2A8C]/20 backdrop-blur-sm" onClick={onClose}>
      <section className="sheet-enter absolute inset-x-0 bottom-0 mx-auto max-h-[82vh] max-w-[420px] overflow-auto rounded-t-[30px] bg-[#F7FAFD] px-5 pb-8 pt-4" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto h-1.5 w-12 rounded-full bg-[#DDE3F2]" />
        <div className="mt-5 flex items-center justify-between">
          <div><h2 className="text-[21px] font-extrabold text-[#1B2A8C]">알림</h2><p className="mt-1 text-[11px] text-[#9099CA]">읽지 않음 {unreadCount}개</p></div>
          <button type="button" onClick={onClose} className="re-icon-button" aria-label="알림 닫기"><X size={18} /></button>
        </div>
        {notificationPermission !== "granted" && <Button variant="secondary" className="mt-4 w-full" onClick={onRequestPermission}>알림 권한 켜기</Button>}
        <div className="mt-5 space-y-3">
          {notifications.length ? notifications.map((notification) => (
            <button key={notification.id} type="button" onClick={() => onOpenDetail(notification.subscriptionId)} className="re-dashboard-card w-full rounded-[18px] p-4 text-left">
              <strong className="text-[13px] text-[#1B2A8C]">{notification.title}</strong>
              <p className="mt-1 text-[11px] leading-5 text-[#7E8AC0]">{notification.message}</p>
            </button>
          )) : <p className="py-10 text-center text-[13px] text-[#9099CA]">새로운 알림이 없어요.</p>}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" size="compact" onClick={onMarkAllRead}><CheckCheck size={14} /> 모두 읽음</Button>
          <Button variant="secondary" size="compact" onClick={onClearAll}>모두 지우기</Button>
        </div>
      </section>
    </div>
  );
}
