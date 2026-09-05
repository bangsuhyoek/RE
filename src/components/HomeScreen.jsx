import { useMemo, useState } from "react";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Search,
  Sparkles,
} from "lucide-react";
import { Button, DDayBadge, ServiceMark } from "./ui";
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
import { RiveCharacter } from "./RiveCharacter";

const currentMonthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

function StatCard({ label, value, detail, icon, accent = "blue" }) {
  return (
    <article className={`re-dashboard-stat re-dashboard-stat--${accent}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <span className="re-dashboard-stat__icon" aria-hidden="true">{icon}</span>
    </article>
  );
}

function CompactSubscription({ subscription, onOpen }) {
  return (
    <button type="button" className="re-upcoming-card" onClick={() => onOpen(subscription.subscriptionId)}>
      <ServiceMark monogram={subscription.monogram || subscription.name?.slice(0, 1)} className="h-9 w-9 rounded-full text-[11px]" />
      <span className="min-w-0 flex-1">
        <strong>{subscription.name}</strong>
        <span>{formatWon(subscription.amount)} · {formatBillingDate(subscription)}</span>
      </span>
      <DDayBadge subscription={subscription} />
    </button>
  );
}

function SubscriptionGridCard({ subscription, onOpen }) {
  return (
    <button type="button" className="re-subscription-grid-card" onClick={() => onOpen(subscription.subscriptionId)}>
      <span className="flex items-center gap-3">
        <ServiceMark monogram={subscription.monogram || subscription.name?.slice(0, 1)} className="h-10 w-10 rounded-full text-[12px]" />
        <span className="min-w-0 text-left">
          <strong className="block truncate">{subscription.name}</strong>
          <span className="mt-0.5 block truncate">{formatWon(subscription.amount)} / {subscription.billingCycle === "매년" ? "년" : "월"}</span>
        </span>
      </span>
      <span className="mt-3 block text-left text-[12px] text-[#7C89B8]">다음 결제 {formatBillingDate(subscription)}</span>
    </button>
  );
}

function CancelledGridCard({ item }) {
  const cancelledDate = item.cancelledAt ? new Date(item.cancelledAt) : null;
  const dateLabel = cancelledDate && !Number.isNaN(cancelledDate.getTime())
    ? `${cancelledDate.getMonth() + 1}월 ${cancelledDate.getDate()}일 해지`
    : "해지 완료";
  return (
    <article className="re-subscription-grid-card is-cancelled">
      <span className="flex items-center gap-3">
        <ServiceMark monogram={item.monogram || item.name?.slice(0, 1)} className="h-10 w-10 rounded-full text-[12px]" />
        <span className="min-w-0 text-left">
          <strong className="block truncate">{item.name}</strong>
          <span className="mt-0.5 block truncate">{formatWon(item.amount)} / {item.billingCycle === "매년" ? "년" : "월"}</span>
        </span>
      </span>
      <span className="mt-3 block text-left text-[12px] text-[#7C89B8]">{dateLabel}</span>
    </article>
  );
}

function MiniCalendar({ subscriptions, onOpenCalendar }) {
  const [date, setDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const year = date.getFullYear();
  const month = date.getMonth();
  const days = useMemo(() => getCalendarDays(year, month), [year, month]);

  const duesByDay = useMemo(() => {
    const map = new Map();
    for (const subscription of subscriptions) {
      const charge = getChargeDateInMonth(subscription, year, month);
      if (!charge) continue;
      const day = charge.getDate();
      const list = map.get(day) || [];
      list.push(subscription);
      map.set(day, list);
    }
    return map;
  }, [month, subscriptions, year]);

  const selectedDues = duesByDay.get(selectedDay) || [];

  return (
    <section className="re-mini-calendar re-dashboard-panel">
      <div className="re-mini-calendar__head">
        <strong>{formatKoreanMonth(date)}</strong>
        <div>
          <button type="button" aria-label="이전 달" onClick={() => setDate(new Date(year, month - 1, 1))}><ChevronLeft size={16} /></button>
          <button type="button" aria-label="다음 달" onClick={() => setDate(new Date(year, month + 1, 1))}><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="re-mini-calendar__week"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>
      <div className="re-mini-calendar__days">
        {days.map((day, index) => day ? (
          <button
            key={day}
            type="button"
            className={`${selectedDay === day ? "is-selected" : ""} ${duesByDay.has(day) ? "has-due" : ""}`}
            onClick={() => setSelectedDay(day)}
          >{day}</button>
        ) : <span key={`empty-${index}`} />)}
      </div>
      <div className="re-mini-calendar__agenda">
        {selectedDues.length ? selectedDues.slice(0, 2).map((subscription) => (
          <div key={subscription.subscriptionId}>
            <span className="flex min-w-0 items-center gap-2"><ServiceMark monogram={subscription.monogram || subscription.name?.slice(0, 1)} className="h-6 w-6 rounded-full text-[8px]" /><strong className="truncate">{subscription.name}</strong></span>
            <span>{formatWon(subscription.amount)}</span>
          </div>
        )) : <p>선택한 날짜에는 예정된 결제가 없어요.</p>}
      </div>
      <button type="button" className="re-dashboard-text-link" onClick={onOpenCalendar}>전체 일정 보기 <ArrowRight size={14} /></button>
    </section>
  );
}

function ConciergePanel({ upcomingCount, onShowAll }) {
  return (
    <section className="re-concierge-card re-dashboard-panel">
      <div className="re-concierge-card__copy">
        <span>지금도,</span>
        <strong>더 좋은 너를 향해.</strong>
        <p>{upcomingCount > 0 ? `${upcomingCount}개의 가까운 결제가 있어요. 필요한 것만 확인해볼까요?` : "지금 급하게 확인할 결제는 없어요."}</p>
      </div>
      <div className="re-concierge-card__character"><RiveCharacter state="idle" className="h-full w-full" /></div>
      <Button size="compact" variant="secondary" onClick={onShowAll}>구독 확인하기</Button>
    </section>
  );
}

export function HomeScreen({
  subscriptions,
  cancellationHistory = [],
  promotions,
  profile,
  notificationDenied,
  onOpenSubscription,
  onShowAll,
  onOpenPromotion,
  onExplorePromotions,
  onAdd,
  onToggleNotificationPermission,
  onOpenCalendar,
}) {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [sort, setSort] = useState("due");

  const upcoming = useMemo(
    () => [...subscriptions].sort((a, b) => daysUntilCharge(a) - daysUntilCharge(b)).slice(0, 3),
    [subscriptions]
  );
  const dueSoon = useMemo(() => subscriptions.filter((subscription) => daysUntilCharge(subscription) <= 3), [subscriptions]);
  const savedThisMonth = useMemo(() => {
    const key = currentMonthKey();
    return cancellationHistory
      .filter((item) => String(item.cancelledAt || "").slice(0, 7) === key)
      .reduce((sum, item) => sum + monthlyEquivalentAmount(item), 0);
  }, [cancellationHistory]);

  const categories = useMemo(() => ["전체", ...new Set(subscriptions.map((item) => item.category).filter(Boolean))], [subscriptions]);

  const visibleSubscriptions = useMemo(() => {
    if (status === "cancelled") return [];
    const normalized = query.trim().toLowerCase();
    return subscriptions
      .filter((item) => status === "all" || (status === "active" ? item.status === "active" : item.status === "trial"))
      .filter((item) => category === "전체" || item.category === category)
      .filter((item) => !normalized || `${item.name} ${item.plan}`.toLowerCase().includes(normalized))
      .sort((left, right) => {
        if (sort === "amount") return Number(right.amount || 0) - Number(left.amount || 0);
        if (sort === "recent") return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
        return daysUntilCharge(left) - daysUntilCharge(right);
      });
  }, [category, query, sort, status, subscriptions]);

  const visibleHistory = useMemo(() => {
    if (status !== "cancelled") return [];
    const normalized = query.trim().toLowerCase();
    return [...cancellationHistory]
      .filter((item) => category === "전체" || item.category === category)
      .filter((item) => !normalized || `${item.name} ${item.plan || ""}`.toLowerCase().includes(normalized))
      .sort((a, b) => new Date(b.cancelledAt || 0) - new Date(a.cancelledAt || 0));
  }, [cancellationHistory, category, query, status]);

  const primaryPromotion = promotions?.[0] || null;

  return (
    <main className="re-dashboard-home">
      <div className="re-dashboard-main-column">
        <header className="re-dashboard-greeting">
          <div>
            <h1>좋은 하루예요. <span aria-hidden="true">🌸</span></h1>
            <p>{profile?.nickname ? `${profile.nickname}님, 오늘도 더 가벼운 일상을 만들어봐요.` : "오늘도 더 가벼운 일상을 만들어봐요."}</p>
          </div>
          <div className="re-dashboard-greeting__aside">
            <span>작은 변화가,</span>
            <strong>더 여유로운 내일을 만들어요.</strong>
            <img src="/re-assets/sd/idle.png" alt="" />
          </div>
        </header>

        <section className="re-dashboard-stats" aria-label="구독 요약">
          <StatCard label="이번 달 구독 예상액" value={formatWon(monthlyEquivalentTotal(subscriptions))} detail="현재 등록된 구독 기준" icon={<span className="re-stat-bars">▥</span>} accent="blue" />
          <StatCard label="구독 개수" value={`${subscriptions.length}개`} detail={`${subscriptions.filter((item) => item.status === "active").length}개 활성 구독`} icon={<span>▧</span>} accent="purple" />
          <StatCard label="결제 예정" value={`${dueSoon.length}개`} detail="D-3 · D-1 기준" icon={<BellRing size={22} />} accent="pink" />
          <StatCard label="이번 달 줄인 금액" value={formatWon(savedThisMonth)} detail={savedThisMonth > 0 ? "해지 완료 기록 기준" : "아직 해지 기록이 없어요"} icon={<Leaf size={22} />} accent="green" />
        </section>

        {notificationDenied && (
          <button type="button" onClick={onToggleNotificationPermission} className="re-notification-reminder">
            <span><BellRing size={16} /> 결제 전 알림이 꺼져 있어요.</span>
            <strong>알림 확인</strong>
          </button>
        )}

        <section className="re-dashboard-upcoming re-dashboard-panel">
          <div className="re-dashboard-section-head">
            <h2>결제 예정 구독</h2>
            <button type="button" onClick={onShowAll}>전체 보기 <ArrowRight size={14} /></button>
          </div>
          <div className="re-dashboard-upcoming__body">
            <div className="re-dashboard-upcoming__list">
              {upcoming.length ? upcoming.map((subscription) => (
                <CompactSubscription key={subscription.subscriptionId} subscription={subscription} onOpen={onOpenSubscription} />
              )) : <div className="re-dashboard-empty-inline">다가오는 결제가 아직 없어요.</div>}
            </div>
            <article className="re-dashboard-guide-banner">
              <div>
                <span>{primaryPromotion ? "혜택을 하나 찾았어요." : "불필요한 구독,"}</span>
                <strong>{primaryPromotion ? primaryPromotion.title : "이제는 안녕."}</strong>
                <p>{primaryPromotion ? primaryPromotion.description : "지금 필요한 구독만 남겨보세요."}</p>
                <button type="button" onClick={() => primaryPromotion ? onOpenPromotion(primaryPromotion) : onShowAll()}>
                  {primaryPromotion ? "혜택 확인하기" : "구독 정리하러 가기"} <ArrowRight size={13} />
                </button>
              </div>
              <img src="/re-assets/sd/idle.png" alt="" />
            </article>
          </div>
        </section>

        <section className="re-dashboard-subscriptions re-dashboard-panel">
          <div className="re-dashboard-section-head re-dashboard-section-head--subscriptions">
            <div>
              <h2>내 구독 서비스</h2>
              <div className="re-dashboard-tabs" role="tablist" aria-label="구독 상태 필터">
                <button type="button" className={status === "all" ? "is-active" : ""} onClick={() => setStatus("all")}>전체 ({subscriptions.length})</button>
                <button type="button" className={status === "active" ? "is-active" : ""} onClick={() => setStatus("active")}>활성 ({subscriptions.filter((item) => item.status === "active").length})</button>
                <button type="button" className={status === "trial" ? "is-active" : ""} onClick={() => setStatus("trial")}>무료체험 ({subscriptions.filter((item) => item.status === "trial").length})</button>
                <button type="button" className={status === "cancelled" ? "is-active" : ""} onClick={() => setStatus("cancelled")}>해지됨 ({cancellationHistory.length})</button>
              </div>
            </div>
            <div className="re-dashboard-add-actions">
              <Button size="compact" variant="secondary" onClick={onAdd}>+ 구독 추가</Button>
            </div>
          </div>

          <div className="re-dashboard-filters">
            <label>
              <span className="sr-only">카테고리</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">정렬</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} disabled={status === "cancelled"}>
                <option value="due">결제일 임박순</option>
                <option value="amount">금액 높은순</option>
                <option value="recent">최근 등록순</option>
              </select>
            </label>
            <label className="re-dashboard-search">
              <Search size={15} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색..." />
            </label>
          </div>

          <div className="re-dashboard-subscription-grid">
            {status === "cancelled"
              ? visibleHistory.map((item) => <CancelledGridCard key={item.historyId || `${item.subscriptionId}-${item.cancelledAt}`} item={item} />)
              : visibleSubscriptions.map((subscription) => <SubscriptionGridCard key={subscription.subscriptionId} subscription={subscription} onOpen={onOpenSubscription} />)}
          </div>

          {((status === "cancelled" && !visibleHistory.length) || (status !== "cancelled" && !visibleSubscriptions.length)) && (
            <div className="re-dashboard-empty-state">
              <Sparkles size={22} />
              <strong>{status === "cancelled" ? "해지 완료 기록이 없어요." : "조건에 맞는 구독이 없어요."}</strong>
              <p>{status === "cancelled" ? "해지가 완료되면 활성 목록에서는 즉시 제거되고 이 기록에만 남아요." : "구독을 추가하거나 필터 조건을 바꿔보세요."}</p>
              {status !== "cancelled" && <Button size="compact" onClick={onAdd}>구독 추가하기</Button>}
            </div>
          )}
        </section>
      </div>

      <aside className="re-dashboard-right-column">
        <MiniCalendar subscriptions={subscriptions} onOpenCalendar={onOpenCalendar} />
        <ConciergePanel upcomingCount={dueSoon.length} onShowAll={onShowAll} />
        {promotions?.length > 0 && (
          <button type="button" className="re-dashboard-benefit-link" onClick={onExplorePromotions}>
            <Sparkles size={16} /> 구독 혜택 전체 보기 <ArrowRight size={14} />
          </button>
        )}
      </aside>
    </main>
  );
}
