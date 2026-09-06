import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BellOff,
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  ExternalLink,
  Filter,
  Gift,
  Home,
  Layers3,
  Leaf,
  LogOut,
  Megaphone,
  MoreVertical,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import { RELogo, WaterBackground } from "./REBrand";
import { ServiceMark } from "./ui";
import { serviceMarkToneClass } from "../lib/serviceBrand";
import {
  daysUntilCharge,
  formatBillingDate,
  formatKoreanMonth,
  formatWon,
  getCalendarDays,
  getChargeDateInMonth,
  monthlyEquivalentAmount,
  monthlyEquivalentTotal,
} from "../lib/dates";

const cx = (...items) => items.filter(Boolean).join(" ");
const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

function BrandBar({ unreadCount = 0, onNotifications, notificationMode = false }) {
  return (
    <header className="re-mobile-brandbar">
      <RELogo size="sm" />
      <div className="re-mobile-brandbar__actions">
        {notificationMode ? (
          <>
            <button type="button" className="is-inert" aria-disabled="true" aria-label="검색"><Search size={24} /></button>
            <button type="button" className="is-inert" aria-disabled="true" aria-label="알림 설정"><Settings size={24} /></button>
          </>
        ) : (
          <button type="button" onClick={onNotifications} aria-label="알림 화면 열기" className="re-mobile-bell-button">
            <Bell size={25} />
            {unreadCount > 0 && <span />}
          </button>
        )}
      </div>
    </header>
  );
}

function HeroGreeting({ title = "좋은 하루예요. 🌸", copy = "오늘도 더 가벼운 일상을 만들어봐요.", aside = "작은 변화가,\n더 여유로운 내일을\n만들어요." }) {
  return (
    <section className="re-mobile-greeting">
      <div>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      <img src="/re-assets/char_stand.jpg" alt="" aria-hidden="true" />
      <strong>{aside.split("\n").map((line) => <span key={line}>{line}</span>)}</strong>
    </section>
  );
}

function DDayPill({ subscription }) {
  const days = Math.max(0, daysUntilCharge(subscription));
  return <span className="re-mobile-dday">{days === 0 ? "TODAY" : `D-${days}`}</span>;
}

function ServiceIcon({ item, className = "" }) {
  return <ServiceMark monogram={item?.monogram || item?.name?.slice(0, 1)} className={cx("re-mobile-service-mark", serviceMarkToneClass(item || {}), className)} />;
}

function DailyBanner({ title = "오늘의 한마디", children = <>지금도,<br />더 좋은 너를 향해.<br /><strong>RE.</strong></> }) {
  return (
    <section className="re-mobile-daily-banner">
      <img src="/re-assets/sd/idle.png" alt="" aria-hidden="true" />
      <div><span>💡 {title}</span><p>{children}</p></div>
      <button type="button" className="is-inert" aria-disabled="true" aria-label="배너 더 보기"><ChevronRight size={22} /></button>
    </section>
  );
}

export function MobileBottomNavigation({ route, onNavigate }) {
  const notificationMode = route === "notifications";
  const activeRoute = route === "detail" ? "home" : route;
  const fourth = notificationMode
    ? { route: "notifications", label: "알림", icon: Bell }
    : { route: "promotions", label: "혜택", icon: Gift };
  const items = [
    { route: "home", label: "홈", icon: Home },
    { route: "subscriptions", label: "구독", icon: Layers3 },
    { route: "calendar", label: "캘린더", icon: CalendarDays },
    fourth,
    { route: "settings", label: "설정", icon: Settings },
  ];

  return (
    <nav className="re-mobile-bottom-nav" aria-label="주요 메뉴">
      {items.map(({ route: target, label, icon: Icon }) => {
        const active = activeRoute === target;
        return (
          <button key={target} type="button" onClick={() => onNavigate(target)} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined}>
            <Icon size={23} strokeWidth={active ? 2.5 : 1.8} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function HomeScreen({
  subscriptions,
  cancellationHistory = [],
  profile,
  notificationDenied,
  unreadCount = 0,
  onOpenSubscription,
  onShowAll,
  onAdd,
  onToggleNotificationPermission,
  onOpenCalendar,
  onOpenNotifications,
}) {
  const upcoming = useMemo(
    () => [...subscriptions].sort((a, b) => daysUntilCharge(a) - daysUntilCharge(b)).slice(0, 2),
    [subscriptions]
  );
  const dueSoon = useMemo(() => subscriptions.filter((item) => daysUntilCharge(item) >= 0 && daysUntilCharge(item) <= 3), [subscriptions]);
  const savedThisMonth = useMemo(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return cancellationHistory.filter((item) => String(item.cancelledAt || "").slice(0, 7) === month).reduce((sum, item) => sum + monthlyEquivalentAmount(item), 0);
  }, [cancellationHistory]);

  return (
    <main className="re-mobile-screen re-mobile-home">
      <WaterBackground />
      <div className="re-mobile-screen__content">
        <BrandBar unreadCount={unreadCount} onNotifications={onOpenNotifications} />
        <HeroGreeting />

        <section className="re-mobile-stat-grid">
          <article><div><span>이번 달 구독 총액</span><strong>{formatWon(monthlyEquivalentTotal(subscriptions))}</strong><small>현재 등록 구독 기준</small></div><BarChart3 /></article>
          <article><div><span>구독 개수</span><strong>{subscriptions.length}개</strong><small>활성 {subscriptions.filter((item) => item.status === "active").length}개</small></div><Layers3 /></article>
          <article><div><span>결제 예정</span><strong>{dueSoon.length}개</strong><small>실제 결제일 기준</small></div><BellRing /></article>
          <article><div><span>이번 달 절약 예정액</span><strong>{formatWon(savedThisMonth)}</strong><small>{savedThisMonth > 0 ? "지금도 잘하고 있어요!" : "해지 이력 기준"}</small></div><Leaf /></article>
        </section>

        {notificationDenied && (
          <button type="button" className="re-mobile-permission-reminder" onClick={onToggleNotificationPermission}><BellRing size={17} /> 결제 전 알림이 꺼져 있어요. <strong>확인</strong></button>
        )}

        <section className="re-mobile-panel re-mobile-upcoming">
          <header><h2>다가오는 결제</h2><button type="button" onClick={onShowAll}>전체보기 <ChevronRight size={17} /></button></header>
          <div>
            {upcoming.length ? upcoming.map((item) => (
              <button type="button" className="re-mobile-upcoming-row" key={item.subscriptionId} onClick={() => onOpenSubscription(item.subscriptionId)}>
                <ServiceIcon item={item} />
                <span className="re-mobile-upcoming-row__copy"><strong>{item.name}</strong><small>{formatBillingDate(item)}</small></span>
                <b>{formatWon(item.amount)}</b><DDayPill subscription={item} /><ChevronRight size={19} />
              </button>
            )) : <p className="re-mobile-empty-copy">등록된 다가오는 결제가 없어요.</p>}
          </div>
        </section>

        <section className="re-mobile-panel re-mobile-my-services">
          <header><h2>내 구독 서비스</h2><button type="button" onClick={onShowAll}>전체보기 <ChevronRight size={17} /></button></header>
          <div className="re-mobile-service-strip">
            {subscriptions.slice(0, 4).map((item) => (
              <button type="button" key={item.subscriptionId} onClick={() => onOpenSubscription(item.subscriptionId)}>
                <ServiceIcon item={item} /><strong>{item.name}</strong><span>{formatWon(item.amount)}</span>
              </button>
            ))}
            <button type="button" className="re-mobile-add-service" onClick={onAdd}><span>＋</span><strong>구독 추가</strong></button>
          </div>
        </section>

        <HomeMiniCalendar subscriptions={subscriptions} onOpenCalendar={onOpenCalendar} onOpenSubscription={onOpenSubscription} />
        <DailyBanner />
      </div>
    </main>
  );
}

function HomeMiniCalendar({ subscriptions, onOpenCalendar, onOpenSubscription }) {
  const now = new Date();
  const [date] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const year = date.getFullYear();
  const month = date.getMonth();
  const days = useMemo(() => getCalendarDays(year, month), [year, month]);
  const groups = useMemo(() => {
    const map = new Map();
    subscriptions.forEach((item) => {
      const charge = getChargeDateInMonth(item, year, month);
      if (!charge) return;
      const day = charge.getDate();
      map.set(day, [...(map.get(day) || []), item]);
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]).slice(0, 2);
  }, [month, subscriptions, year]);

  return (
    <section className="re-mobile-calendar-preview">
      <article className="re-mobile-panel re-mobile-mini-calendar">
        <header><h2>{formatKoreanMonth(date)}</h2><button type="button" onClick={onOpenCalendar}><ChevronRight size={19} /></button></header>
        <div className="re-mobile-calendar-week">{weekdays.map((item) => <span key={item}>{item}</span>)}</div>
        <div className="re-mobile-calendar-days">
          {days.map((day, index) => day ? <span key={day} className={groups.some(([d]) => d === day) ? "has-event" : ""}>{day}</span> : <span key={`e-${index}`} />)}
        </div>
      </article>
      <article className="re-mobile-panel re-mobile-mini-agenda">
        {groups.length ? groups.map(([day, items]) => (
          <section key={day}>
            <h3>{month + 1}월 {day}일 ({weekdays[new Date(year, month, day).getDay()]})</h3>
            {items.slice(0, 2).map((item) => <button type="button" key={item.subscriptionId} onClick={() => onOpenSubscription(item.subscriptionId)}><ServiceIcon item={item} /><span>{item.name}</span><b>{formatWon(item.amount)}</b></button>)}
          </section>
        )) : <p className="re-mobile-empty-copy">이번 달 결제 일정이 없어요.</p>}
      </article>
    </section>
  );
}

export function SubscriptionListScreen({ subscriptions, cancellationHistory = [], unreadCount = 0, onOpen, onAdd, onStartCancel, onMute, onOpenNotifications }) {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const paused = subscriptions.filter((item) => item.status === "paused");
  const active = subscriptions.filter((item) => item.status === "active" || item.status === "trial");

  const items = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const source = status === "paused" ? paused : status === "active" ? active : status === "cancelled" ? [] : subscriptions;
    return source.filter((item) => !normalized || `${item.name} ${item.plan || ""}`.toLowerCase().includes(normalized));
  }, [active, paused, query, status, subscriptions]);
  const history = status === "cancelled" ? cancellationHistory.filter((item) => !query.trim() || `${item.name} ${item.plan || ""}`.toLowerCase().includes(query.trim().toLowerCase())) : [];

  return (
    <main className="re-mobile-screen re-mobile-subscriptions">
      <WaterBackground />
      <div className="re-mobile-screen__content">
        <BrandBar unreadCount={unreadCount} onNotifications={onOpenNotifications} />
        <section className="re-mobile-subscriptions__hero">
          <div><h1>내 구독</h1><p>좋아하는 서비스가,<br />더 좋은 일상을 만들어줘요. 🌸</p></div>
          <img src="/re-assets/char_stand.jpg" alt="" aria-hidden="true" />
        </section>

        <section className="re-mobile-subscription-surface">
          <div className="re-mobile-status-tabs">
            {[
              ["all", `전체 ${subscriptions.length}`],
              ["active", `활성 ${active.length}`],
              ["paused", `일시정지 ${paused.length}`],
              ["cancelled", `해지됨 ${cancellationHistory.length}`],
            ].map(([key, label]) => <button type="button" key={key} onClick={() => setStatus(key)} className={status === key ? "is-active" : ""}>{label}</button>)}
          </div>
          <div className="re-mobile-search-row"><label><Search size={22} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="구독 서비스 검색하기..." /></label><button type="button" className="is-inert" aria-disabled="true"><Filter size={20} /> 필터⌄</button></div>

          <div className="re-mobile-subscription-list">
            {items.map((item) => (
              <article key={item.subscriptionId} className="re-mobile-subscription-card">
                <button type="button" className="re-mobile-subscription-card__main" onClick={() => onOpen(item.subscriptionId)}>
                  <ServiceIcon item={item} className="is-square" />
                  <span><strong>{item.name}</strong><em className={item.status === "paused" ? "is-paused" : ""}>{item.status === "trial" ? "무료체험" : item.status === "paused" ? "일시정지" : "활성"}</em><small>{item.plan || "요금제 미등록"}</small><b>{formatWon(item.amount)} <i>/ {item.billingCycle === "매년" ? "년" : "월"}</i></b></span>
                  <ChevronRight size={22} />
                </button>
                <div className="re-mobile-subscription-card__bottom"><span><CalendarDays size={20} /> <small>다음 결제일</small><strong>{item.status === "paused" ? "일시정지 중" : formatBillingDate(item)}</strong></span><div><button type="button" onClick={() => onOpen(item.subscriptionId)}>상세</button><button type="button" onClick={() => onMute(item.subscriptionId)}><BellOff size={16} /> 알림 끄기</button>{item.status !== "paused" && <button type="button" className="is-danger" onClick={() => onStartCancel(item.subscriptionId)}>해지</button>}</div></div>
              </article>
            ))}

            {history.map((item) => (
              <article key={item.historyId} className="re-mobile-subscription-card is-cancelled">
                <div className="re-mobile-subscription-card__main"><ServiceIcon item={item} className="is-square" /><span><strong>{item.name}</strong><em>해지됨</em><small>{item.plan || ""}</small><b>{formatWon(item.amount)}</b></span></div>
                <p>{item.cancelledAt ? new Date(item.cancelledAt).toLocaleDateString("ko-KR") : ""} 해지 기록</p>
              </article>
            ))}

            {!items.length && !history.length && <p className="re-mobile-empty-copy re-mobile-empty-block">조건에 맞는 구독이 없어요.</p>}
          </div>

          <button type="button" className="re-mobile-add-subscription" onClick={onAdd}>＋ <strong>구독 추가하기</strong><span>새로운 구독을 추가하고 모두 한 곳에서 관리해요.</span></button>
        </section>
      </div>
    </main>
  );
}

export function SubscriptionDetailScreen({ subscription, onUpdate, onStartCancel, onBack, promotion }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({
    plan: subscription?.plan || "",
    amount: subscription?.amount || 0,
    billingCycle: subscription?.billingCycle || "매월",
    nextBillingDate: subscription?.nextBillingDate || "",
    paymentMethod: subscription?.paymentMethod || "",
  }));

  if (!subscription) return <main className="re-mobile-screen"><WaterBackground /><div className="re-mobile-screen__content"><section className="re-mobile-panel re-mobile-empty-block"><h1>구독 정보를 찾을 수 없습니다.</h1><button type="button" className="re-mobile-primary-button" onClick={onBack}>목록으로</button></section></div></main>;

  const save = () => {
    const amount = Number(draft.amount);
    const parsed = draft.nextBillingDate ? new Date(`${draft.nextBillingDate}T00:00:00`) : null;
    const dueDay = parsed && !Number.isNaN(parsed.getTime()) ? parsed.getDate() : subscription.dueDay;
    if (!(amount > 0) || !(dueDay >= 1 && dueDay <= 31)) return;
    onUpdate(subscription.subscriptionId, { ...draft, amount, dueDay });
    setEditing(false);
  };

  return (
    <main className="re-mobile-screen re-mobile-detail">
      <WaterBackground />
      <div className="re-mobile-screen__content">
        <header className="re-mobile-detail__top"><button type="button" onClick={onBack}><ArrowLeft size={28} /></button><h1>구독 상세</h1><button type="button" onClick={() => setEditing((current) => !current)}><MoreVertical size={25} /></button></header>

        <section className="re-mobile-detail__hero"><ServiceIcon item={subscription} className="is-detail" /><div><h2>{subscription.name}</h2><p>{subscription.plan || "구독 서비스"}</p><span>{subscription.category || "기타"}</span></div><img src="/re-assets/char_stand.jpg" alt="" aria-hidden="true" /></section>

        <section className="re-mobile-panel re-mobile-detail-table">
          {[
            ["월 요금", formatWon(subscription.amount)],
            ["결제 주기", subscription.billingCycle || "매월"],
            ["다음 결제일", formatBillingDate(subscription)],
            ["결제 수단", subscription.paymentMethod || "등록 안 됨"],
            ["카테고리", subscription.category || "기타"],
            ["메모", subscription.memo || "등록된 메모가 없어요."],
          ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}

          {editing && <div className="re-mobile-detail-edit"><label>요금제<input value={draft.plan} onChange={(event) => setDraft((current) => ({ ...current, plan: event.target.value }))} /></label><label>결제 금액<input type="number" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} /></label><label>결제 주기<select value={draft.billingCycle} onChange={(event) => setDraft((current) => ({ ...current, billingCycle: event.target.value }))}><option>매월</option><option>매년</option></select></label><label>다음 결제일<input type="date" value={draft.nextBillingDate} onChange={(event) => setDraft((current) => ({ ...current, nextBillingDate: event.target.value }))} /></label><label>결제 수단<input value={draft.paymentMethod} onChange={(event) => setDraft((current) => ({ ...current, paymentMethod: event.target.value }))} /></label><button type="button" onClick={save}>저장</button></div>}
        </section>

        <section className="re-mobile-detail-actions">
          <button type="button" disabled={!subscription.cancelUrl} onClick={() => subscription.cancelUrl && window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer")}><ExternalLink /><strong>공식 해지 사이트</strong><span>바로 이동하기 ›</span></button>
          <button type="button" onClick={() => onStartCancel(subscription.subscriptionId)}><Layers3 /><strong>해지 체크리스트</strong><span>놓치는 것 없이 ›</span></button>
          <button type="button" onClick={() => onUpdate(subscription.subscriptionId, { alertD3: !subscription.alertD3, alertD1: !subscription.alertD1 })}><BellRing /><strong>결제 알림</strong><span>{subscription.alertD3 || subscription.alertD1 ? "미리 알려드려요" : "알림 꺼짐"} ›</span></button>
          <button type="button" className={!promotion ? "is-inert" : ""} aria-disabled={!promotion} onClick={() => promotion?.link && window.open(promotion.link, "_blank", "noopener,noreferrer")}><Gift /><strong>혜택 보기</strong><span>{promotion ? "확인된 혜택" : "확인된 혜택 없음"} ›</span></button>
        </section>

        <section className="re-mobile-panel re-mobile-cancel-guide"><header><h2>📣 해지 가이드</h2><span>아래 순서대로 차근차근 진행해보세요.</span></header>{[
          ["공식 해지 사이트로 이동하기", `${subscription.name} 계정에서 구독 관리를 열어주세요.`],
          [`${subscription.name} 구독 선택`, `구독 중인 항목에서 ${subscription.name}을 선택하세요.`],
          ["구독 취소 진행하기", "안내에 따라 구독 취소를 진행해주세요."],
          ["해지 완료 확인하기", "이메일 또는 화면에서 해지 완료 여부를 꼭 확인하세요."],
        ].map(([title, copy], index) => <div key={title}><span>{index + 1}</span><section><strong>{title}</strong><p>{copy}</p></section><ChevronRight size={20} /></div>)}<aside>💡 <strong>잠깐!</strong><p>해지해도 다음 결제일까지는 기존 혜택을 계속 이용할 수 있어요.</p></aside></section>
      </div>
    </main>
  );
}

export function CalendarScreen({ subscriptions, unreadCount = 0, onOpen, onOpenNotifications }) {
  const [date, setDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const year = date.getFullYear();
  const month = date.getMonth();
  const days = useMemo(() => getCalendarDays(year, month), [year, month]);
  const dues = useMemo(() => {
    const map = new Map();
    subscriptions.forEach((item) => {
      const charge = getChargeDateInMonth(item, year, month);
      if (!charge) return;
      const day = charge.getDate();
      map.set(day, [...(map.get(day) || []), item]);
    });
    return map;
  }, [month, subscriptions, year]);
  const monthItems = [...dues.values()].flat();
  const moveMonth = (delta) => {
    const next = new Date(year, month + delta, 1);
    const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    setDate(next);
    setSelectedDay((current) => Math.min(current, last));
  };

  return (
    <main className="re-mobile-screen re-mobile-calendar">
      <WaterBackground />
      <div className="re-mobile-screen__content">
        <BrandBar unreadCount={unreadCount} onNotifications={onOpenNotifications} />
        <HeroGreeting />
        <section className="re-mobile-panel re-mobile-calendar-main"><header><button type="button" onClick={() => moveMonth(-1)}><ChevronLeft /></button><h1>{formatKoreanMonth(date)}</h1><button type="button" onClick={() => moveMonth(1)}><ChevronRight /></button></header><div className="re-mobile-calendar-week">{weekdays.map((day) => <span key={day}>{day}</span>)}</div><div className="re-mobile-calendar-grid">{days.map((day, index) => day ? <button type="button" key={day} onClick={() => setSelectedDay(day)} className={cx(selectedDay === day && "is-selected", dues.has(day) && "has-event")}>{day}</button> : <span key={`e-${index}`} />)}</div></section>
        <section className="re-mobile-panel re-mobile-calendar-summary"><div><Layers3 /><span>이번 달 결제 예정<strong>{monthItems.length}건</strong><small>예상 결제 금액 {formatWon(monthlyEquivalentTotal(monthItems))}</small></span></div><div><BarChart3 /><span>지난 달보다<strong>실제 비교 데이터 연결 시 표시</strong></span></div></section>
        <section className="re-mobile-calendar-agenda">{[...dues.entries()].sort((a, b) => a[0] - b[0]).map(([day, items]) => <article className="re-mobile-panel" key={day}><header><h2>{month + 1}월 {day}일 ({weekdays[new Date(year, month, day).getDay()]})</h2></header>{items.map((item) => <button type="button" key={item.subscriptionId} onClick={() => onOpen(item.subscriptionId)}><ServiceIcon item={item} /><span><strong>{item.name}</strong><small>구독 결제</small></span><b>{formatWon(item.amount)}</b><ChevronRight /></button>)}</article>)}{!dues.size && <article className="re-mobile-panel re-mobile-empty-block">이번 달 결제 일정이 없어요.</article>}</section>
        <DailyBanner title="오늘의 RE. 한마디">계획하는 지금이,<br />더 좋은 내일을 만들어요.<br /><strong>RE.</strong></DailyBanner>
      </div>
    </main>
  );
}

export function PromotionScreen({ promotions = [], unreadCount = 0, onOpenPromotion, onOpenNotifications }) {
  const [category, setCategory] = useState("전체 혜택");
  const categories = ["전체 혜택", "무료체험", "OTT 할인", "통신사 결합", "학생 할인"];
  const visible = category === "전체 혜택" ? promotions : promotions.filter((item) => String(item.category || item.badge || "").includes(category.replace(" 혜택", "")));

  return (
    <main className="re-mobile-screen re-mobile-promotions"><WaterBackground /><div className="re-mobile-screen__content"><BrandBar unreadCount={unreadCount} onNotifications={onOpenNotifications} /><section className="re-mobile-promotions__hero"><div><h1>맞춤 혜택 & 프로모션 🎁</h1><p>지금, 더 좋은 구독 생활을 만나보세요.</p></div><img src="/re-assets/char_stand.jpg" alt="" aria-hidden="true" /><strong>작은 혜택이<br />더 큰 여유를<br />만들어요.</strong></section><div className="re-mobile-promo-tabs">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={category === item ? "is-active" : ""}>{item}</button>)}</div><section className="re-mobile-promo-list">{visible.map((promotion) => <article className="re-mobile-panel re-mobile-promo-card" key={promotion.id || promotion.title}><ServiceIcon item={{ name: promotion.serviceName || promotion.title, monogram: promotion.monogram }} /><div><span>{promotion.badge || promotion.category || "혜택"}</span><h2>{promotion.title}</h2><p>{promotion.description || promotion.copy || ""}</p><small>{promotion.condition || ""}</small></div><button type="button" onClick={() => onOpenPromotion(promotion)}>자세히 보기 <ChevronRight /></button></article>)}{!visible.length && <article className="re-mobile-panel re-mobile-promo-empty"><Gift size={38} /><h2>현재 확인된 혜택이 없어요.</h2><p>실제 프로모션 API 또는 제휴 데이터가 연결되기 전에는 임의의 혜택을 표시하지 않아요.</p></article>}</section><aside className="re-mobile-panel re-mobile-promo-notice"><span>ⓘ</span><div><strong>혜택 안내</strong><p>프로모션 내용, 기간, 적용 조건은 실제 데이터가 연결된 경우 각 서비스의 공식 페이지에서 다시 한 번 확인해 주세요.</p></div></aside><DailyBanner>작은 혜택이,<br />더 큰 취향을 이어줘요.<br /><strong>RE.</strong></DailyBanner></div></main>
  );
}

const notificationCategory = (item) => {
  const type = String(item?.type || "");
  if (type.startsWith("billing") || type.startsWith("trial")) return "결제 알림";
  if (type.includes("promotion") || type.includes("benefit")) return "혜택·이벤트";
  if (type.includes("news")) return "서비스 소식";
  return "기타";
};

export function NotificationScreen({ notifications = [], unreadCount = 0, onOpenDetail, onMarkAllRead, onClearAll, onOpenNotifications }) {
  const [category, setCategory] = useState("전체");
  const categories = ["전체", "결제 알림", "서비스 소식", "혜택·이벤트"];
  const visible = category === "전체" ? notifications : notifications.filter((item) => notificationCategory(item) === category);
  const groups = visible.reduce((acc, item) => {
    const key = notificationCategory(item);
    acc[key] = [...(acc[key] || []), item];
    return acc;
  }, {});

  return (
    <main className="re-mobile-screen re-mobile-notifications"><WaterBackground /><div className="re-mobile-screen__content"><BrandBar unreadCount={unreadCount} notificationMode onNotifications={onOpenNotifications} /><section className="re-mobile-notification-hero"><div><h1>알림 🌸</h1><p>소중한 구독 생활을,<br />RE.가 함께 챙겨드려요.</p></div><img src="/re-assets/sd/idle.png" alt="" aria-hidden="true" /><strong>잊지 않도록<br />RE.가 알려드릴게요!</strong></section><div className="re-mobile-notification-tabs">{categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={category === item ? "is-active" : ""}>{item}</button>)}</div><section className="re-mobile-notification-groups">{Object.entries(groups).map(([group, items]) => <article className="re-mobile-panel" key={group}><header><h2>{group}</h2><button type="button" onClick={onMarkAllRead}>전체보기 <ChevronRight size={17} /></button></header>{items.map((item) => <button type="button" className="re-mobile-notification-row" key={item.id} onClick={() => item.subscriptionId && onOpenDetail(item.subscriptionId)}><ServiceIcon item={{ name: item.serviceName || item.title, monogram: item.monogram, category: item.category }} /><span><em>{item.badge || group}</em><strong>{item.title}</strong><p>{item.message}</p></span><time>{item.timestamp ? new Date(item.timestamp).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</time><ChevronRight /></button>)}</article>)}{!visible.length && <article className="re-mobile-panel re-mobile-empty-block"><Bell size={34} /><h2>새로운 알림이 없어요.</h2><p>실제 등록 구독의 결제 일정에 따라 생성된 알림만 표시합니다.</p></article>}</section>{notifications.length > 0 && <button type="button" className="re-mobile-clear-notifications" onClick={onClearAll}>알림 전체 삭제</button>}<section className="re-mobile-notification-footer"><span>지금은 새로운 알림이 없어요.</span><p>좋은 하루가, 더 좋은 구독 생활로 이어지길. 🌸</p><img src="/re-assets/sd/idle.png" alt="" aria-hidden="true" /></section></div></main>
  );
}

export function SettingsScreen({ profile, notificationPermission, notificationsEnabled, unreadCount = 0, onToggleNotifications, onReplayIntro, onOpenNotifications }) {
  return (
    <main className="re-mobile-screen re-mobile-settings"><WaterBackground /><div className="re-mobile-screen__content"><BrandBar unreadCount={unreadCount} onNotifications={onOpenNotifications} /><HeroGreeting title="언제나 고마워요. 🌸" copy="더 좋은 하루가 이어지길 바라요." aside="조금씩,\n더 좋은 내일을\n함께 만들어가요." /><section className="re-mobile-settings-list"><article className="re-mobile-panel re-mobile-settings-card"><div className="re-mobile-settings-heading"><CircleUserRound /><span><strong>계정</strong><small>프로필 정보와 계정 설정을 관리해요.</small></span><ChevronRight /></div><div className="re-mobile-profile-row"><img src="/re-assets/char_stand.jpg" alt="" /><span><strong>{profile?.nickname || "RE. 유저"}</strong><small>{profile?.provider ? `${profile.provider} 로그인` : "로컬 프로필"}</small></span><ChevronRight /></div></article><article className="re-mobile-panel re-mobile-settings-card"><div className="re-mobile-settings-heading"><BellRing /><span><strong>결제 알림</strong><small>결제 예정 알림 설정을 확인해요.</small></span></div><div className="re-mobile-setting-toggle"><span><strong>결제 예정 알림</strong><small>{notificationPermission === "denied" ? "기기에서 알림 권한이 차단되어 있어요." : "등록된 결제일을 기준으로 미리 알려드려요."}</small></span><button type="button" role="switch" aria-checked={notificationsEnabled} className={notificationsEnabled ? "is-on" : ""} onClick={onToggleNotifications}><i /></button></div><div className="re-mobile-setting-toggle is-inert" aria-disabled="true"><span><strong>결제 완료 알림</strong><small>실제 결제 완료 데이터가 연결되지 않아 동작을 추가하지 않았어요.</small></span><button type="button" role="switch" aria-checked="false" disabled><i /></button></div></article><button type="button" className="re-mobile-panel re-mobile-settings-link" onClick={onReplayIntro}><PlayCircle /><span><strong>서비스 소개 다시 보기</strong><small>RE.의 주요 기능과 이용 방법을 다시 확인해요.</small></span><ChevronRight /></button><article className="re-mobile-panel re-mobile-settings-link"><ShieldCheck /><span><strong>개인정보 및 데이터 안내</strong><small>사용자가 확인한 구독 정보를 기준으로 관리해요.</small></span><ChevronRight /></article><button type="button" className="re-mobile-panel re-mobile-settings-link is-inert" aria-disabled="true"><LogOut /><span><strong>로그아웃</strong><small>실제 인증 로그아웃 흐름이 연결되기 전에는 동작을 추가하지 않아요.</small></span><ChevronRight /></button></section><DailyBanner title="도움이 필요하신가요?">언제든지 알려주세요.<br /><strong>RE.가 함께할게요.</strong></DailyBanner></div></main>
  );
}
