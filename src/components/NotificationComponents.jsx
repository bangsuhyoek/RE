import { useEffect } from "react";
import { Bell, BellRing, ChevronRight, Trash2, X } from "lucide-react";
import { BottomSheet, ServiceMark } from "./ui";

export function PushNotificationBanner({ notification, onClose, onOpenDetail }) {
  useEffect(() => {
    if (!notification) return undefined;
    const timer = window.setTimeout(onClose, 8000);
    return () => window.clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  return (
    <div className="fixed inset-x-0 top-3 z-[70] mx-auto w-[calc(100%-1.5rem)] max-w-[396px] push-banner-enter">
      <div className="rounded-2xl border border-black/10 bg-[#18181B]/95 p-3.5 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5"><span className="grid h-5 w-5 place-items-center rounded-[6px] bg-white text-[9px] font-bold text-black">R</span><span className="text-[11px] font-bold tracking-wider text-white/80">RE.</span><span className="h-1 w-1 rounded-full bg-white/40" /><span className="text-[10px] text-white/60">지금</span></div>
          <button type="button" onClick={onClose} className="grid h-5 w-5 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white" aria-label="알림 닫기"><X size={13} /></button>
        </div>
        <button type="button" onClick={() => onOpenDetail(notification.subscriptionId)} className="mt-2 w-full text-left">
          <div className="flex items-start gap-2.5">
            <ServiceMark monogram={notification.monogram} className="mt-0.5 h-8 w-8 rounded-lg bg-white/10 text-[11px] text-white" />
            <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white">{notification.badge}</span><span className="truncate text-[12px] font-semibold text-white">{notification.title}</span></div><p className="mt-1 text-[11px] leading-4 text-white/80">{notification.message}</p></div>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2"><span className="text-[10px] font-medium text-[#A1A1AA]">탭하여 구독 상세보기</span><span className="flex items-center gap-0.5 text-[10px] font-semibold text-white">확인하기 <ChevronRight size={12} /></span></div>
        </button>
      </div>
    </div>
  );
}

export function NotificationCenterModal({ notifications, unreadCount, onClose, onOpenDetail, onMarkAllRead, onClearAll, notificationPermission, onRequestPermission }) {
  return (
    <BottomSheet onClose={onClose} label="RE. 알림 센터">
      <div>
        <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
          <div className="flex min-w-0 items-center gap-2"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-black text-white"><BellRing size={15} /></div><div className="min-w-0"><div className="flex items-center gap-1.5"><h2 className="text-[16px] font-bold tracking-tight">알림 센터</h2>{unreadCount > 0 && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCount}</span>}</div><p className="truncate text-[11px] text-[#71717A]">등록된 구독의 결제 전 알림 내역</p></div></div>
          <div className="flex shrink-0 items-center gap-1.5">{notifications.length > 0 && <><button type="button" onClick={onMarkAllRead} className="rounded-lg px-2 py-1 text-[11px] font-medium text-[#71717A] hover:bg-[#F4F4F5] hover:text-black">모두 읽음</button><button type="button" onClick={onClearAll} className="grid h-7 w-7 place-items-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-red-600" aria-label="알림 전체 삭제"><Trash2 size={14} /></button></>}<button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-black" aria-label="알림 센터 닫기"><X size={16} /></button></div>
        </div>

        <div className="mt-3 max-h-[360px] divide-y divide-[#F4F4F5] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-10 text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#F4F4F5] text-[#A1A1AA]"><Bell size={18} /></div><p className="mt-2 text-[13px] font-semibold text-black">도착한 알림이 없어요</p><p className="mt-1 text-[11px] text-[#71717A]">실제 등록된 구독의 결제 일정에 따라 알림이 생성돼요.</p></div>
          ) : notifications.map((item) => (
            <button key={item.id} type="button" onClick={() => onOpenDetail(item.subscriptionId)} className={`flex w-full items-start gap-2.5 rounded-xl px-2 py-3 text-left transition-colors hover:bg-[#FAFAFA] ${!item.read ? "bg-[#F4F4F5]/50" : ""}`}>
              <ServiceMark monogram={item.monogram} className="mt-0.5 h-9 w-9 shrink-0 text-[11px]" />
              <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="rounded-[4px] border border-black px-1.5 py-0.5 text-[9px] font-bold">{item.badge}</span><strong className="truncate text-[12px] font-semibold">{item.title}</strong>{!item.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />}</div><p className="mt-1 text-[11px] leading-4 text-[#71717A]">{item.message}</p></div><ChevronRight size={14} className="mt-2.5 shrink-0 text-[#A1A1AA]" />
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[#E4E4E7] pt-2.5 text-[11px]"><div className="flex items-center gap-1.5 text-[#71717A]"><Bell size={13} /><span>기기 알림:</span><strong className="text-black">{notificationPermission === "granted" ? "허용됨" : notificationPermission === "denied" ? "차단됨" : "미설정"}</strong></div>{notificationPermission !== "granted" && <button type="button" onClick={onRequestPermission} className="text-[11px] font-semibold text-black underline underline-offset-4">알림 권한 허용하기</button>}</div>
      </div>
    </BottomSheet>
  );
}
