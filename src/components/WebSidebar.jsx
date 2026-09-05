import {
  Bell,
  CalendarDays,
  CreditCard,
  Home,
  PlusCircle,
  Settings,
  Sparkles,
} from "lucide-react";
import { RELogo } from "./REBrand";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export function WebSidebar({
  route,
  profile,
  unreadCount = 0,
  onNavigate,
  onOpenAdd,
  onOpenNotifications,
}) {
  const items = [
    { id: "home", label: "홈", icon: Home, action: () => onNavigate("home") },
    { id: "subscriptions", label: "구독 관리", icon: CreditCard, action: () => onNavigate("subscriptions") },
    { id: "calendar", label: "캘린더", icon: CalendarDays, action: () => onNavigate("calendar") },
    { id: "add", label: "추가하기", icon: PlusCircle, action: onOpenAdd },
    { id: "promotions", label: "혜택", icon: Sparkles, action: () => onNavigate("promotions") },
    { id: "notifications", label: "알림", icon: Bell, action: onOpenNotifications },
  ];

  const isActive = (id) => id === "subscriptions"
    ? route === "subscriptions" || route === "detail"
    : route === id;

  return (
    <aside className="re-web-sidebar" aria-label="데스크톱 주요 탐색">
      <div className="re-web-sidebar__brand">
        <RELogo size="sm" />
      </div>

      <nav className="re-web-sidebar__nav">
        {items.map(({ id, label, icon: Icon, action }) => (
          <button
            key={id}
            type="button"
            onClick={action}
            className={cx("re-web-sidebar__item", isActive(id) && "is-active")}
            aria-current={isActive(id) ? "page" : undefined}
          >
            <span className="re-web-sidebar__icon-wrap">
              <Icon size={18} strokeWidth={isActive(id) ? 2.25 : 1.7} />
              {id === "notifications" && unreadCount > 0 && <span className="re-web-sidebar__badge">{Math.min(unreadCount, 9)}</span>}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="re-web-sidebar__bottom">
        <button
          type="button"
          onClick={() => onNavigate("settings")}
          className={cx("re-web-sidebar__item", route === "settings" && "is-active")}
          aria-current={route === "settings" ? "page" : undefined}
        >
          <span className="re-web-sidebar__icon-wrap"><Settings size={18} strokeWidth={route === "settings" ? 2.25 : 1.7} /></span>
          <span>설정</span>
        </button>

        <div className="re-web-sidebar__profile">
          <img src="/re-assets/char_stand.jpg" alt="" className="re-web-sidebar__avatar" />
          <div className="min-w-0 flex-1">
            <strong>RE.</strong>
            <span>언제나, 너와 함께.</span>
          </div>
          <span className="re-web-sidebar__profile-close" aria-hidden="true">×</span>
        </div>
      </div>
    </aside>
  );
}
