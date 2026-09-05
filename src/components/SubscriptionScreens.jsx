import { useMemo, useState } from "react";
import {
  BellOff,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FilterX,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button, DDayBadge, ServiceMark, SubscriptionCard, ToggleSwitch } from "./ui";
import { RiveCharacter } from "./RiveCharacter";
import {
  daysUntilCharge,
  formatBillingDate,
  formatKoreanMonth,
  formatWon,
  getCalendarDays,
  getChargeDateInMonth,
  getLastDate,
  monthlyEquivalentTotal,
} from "../lib/dates";

const baseCategories = ["전체", "OTT", "음악", "쇼핑", "생산성"];

const cx = (...classes) => classes.filter(Boolean).join(" ");

function LibraryCard({ subscription, onOpen, onStartCancel, onMute }) {
  const id = subscription.subscriptionId || subscription.id;
  return (
    <article className="re-library-card">
      <button type="button" className="re-library-card__main" onClick={() => onOpen(id)}>
        <span className="re-library-card__head">
          <ServiceMark monogram={subscription.monogram || subscription.name?.slice(0, 1)} className="h-11 w-11 rounded-full text-[12px]" />
          <span className="min-w-0 flex-1">
            <strong>{subscription.name}</strong>
            <span>{subscription.plan || "기본 플랜"}</span>
          </span>
          <DDayBadge subscription={subscription} />
        </span>
        <span className="re-library-card__amount">{formatWon(subscription.amount)} <small>/ {subscription.billingCycle === "매년" ? "년" : "월"}</small></span>
        <span className="re-library-card__date">다음 결제 {formatBillingDate(subscription)}</span>
      </button>
      <div className="re-library-card__actions">
        <button type="button" onClick={() => onOpen(id)}>상세</button>
        <button type="button" onClick={() => onMute(id)}><BellOff size={13} /> 알림 끄기</button>
        <button type="button" onClick={() => onStartCancel(id)}>해지</button>
      </div>
    </article>
  );
}

export function SubscriptionListScreen({ subscriptions, onOpen, onAdd, onStartCancel, onMute, onRefresh }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("due");

  const categories = useMemo(
    () => [...new Set([...baseCategories, ...subscriptions.map((item) => item.category).filter(Boolean)])],
    [subscriptions]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...subscriptions]
      .filter((subscription) => category === "전체" || subscription.category === category)
      .filter((subscription) => status === "all" || (status === "trial" ? subscription.status === "trial" : subscription.status === "active"))
      .filter((subscription) => !normalized || `${subscription.name} ${subscription.plan || ""}`.toLowerCase().includes(normalized))
      .sort((a, b) => {
        if (sort === "amount") return Number(b.amount || 0) - Number(a.amount || 0);
        if (sort === "recent") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        return daysUntilCharge(a) - daysUntilCharge(b);
      });
  }, [category, query, sort, status, subscriptions]);

  const total = monthlyEquivalentTotal(filtered);
  const reset = () => {
    setQuery("");
    setCategory("전체");
    setStatus("all");
    setSort("due");
  };

  return (
    <main className="re-final-page re-subscriptions-page">
      <header className="re-final-page__header">
        <div>
          <p className="re-eyebrow">MY SUBSCRIPTIONS</p>
          <h1>구독 관리</h1>
          <p>랜딩에서 본 카드와 같은 방식으로, 지금 관리 중인 구독을 한눈에 확인해요.</p>
        </div>
        <Button onClick={onAdd}>+ 구독 추가</Button>
      </header>

      <section className="re-final-panel re-subscription-toolbar">
        <div className="re-final-tabs" role="tablist" aria-label="구독 상태">
          <button type="button" className={status === "all" ? "is-active" : ""} onClick={() => setStatus("all")}>전체 ({subscriptions.length})</button>
          <button type="button" className={status === "active" ? "is-active" : ""} onClick={() => setStatus("active")}>활성 ({subscriptions.filter((item) => item.status === "active").length})</button>
          <button type="button" className={status === "trial" ? "is-active" : ""} onClick={() => setStatus("trial")}>무료체험 ({subscriptions.filter((item) => item.status === "trial").length})</button>
        </div>

        <div className="re-final-controls">
          <label>
            <span className="sr-only">카테고리</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">정렬</span>
            <SlidersHorizontal size={14} />
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="due">결제일 임박순</option>
              <option value="amount">금액 높은순</option>
              <option value="recent">최근 등록순</option>
            </select>
          </label>
          <label className="re-final-search">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색..." />
          </label>
          <button type="button" className="re-final-icon-button" onClick={onRefresh} aria-label="목록 새로고침"><RefreshCw size={17} /></button>
        </div>
      </section>

      <div className="re-subscription-summary-line">
        <span><strong>{filtered.length}개</strong> 구독</span>
        <span>월 환산 <strong>{formatWon(total)}</strong></span>
      </div>

      {filtered.length > 0 ? (
        <>
          <div className="re-desktop-subscription-grid">
            {filtered.map((subscription) => (
              <LibraryCard
                key={subscription.subscriptionId || subscription.id}
                subscription={subscription}
                onOpen={onOpen}
                onStartCancel={onStartCancel}
                onMute={onMute}
              />
            ))}
          </div>
          <div className="re-mobile-subscription-list">
            {filtered.map((subscription) => (
              <SubscriptionCard
                key={subscription.subscriptionId || subscription.id}
                subscription={subscription}
                detail
                swipable
                onOpen={() => onOpen(subscription.subscriptionId || subscription.id)}
                onCancel={() => onStartCancel(subscription.subscriptionId || subscription.id)}
                onMute={() => onMute(subscription.subscriptionId || subscription.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <section className="re-final-empty">
          <RiveCharacter state="idle" className="re-final-empty__character" />
          <h2>조건에 맞는 구독 서비스가 없습니다.</h2>
          <p>필터를 초기화하거나 다른 검색어를 입력해 보세요.</p>
          <Button variant="secondary" size="compact" onClick={reset}><FilterX size={15} /> 필터 초기화</Button>
        </section>
      )}
    </main>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="re-detail-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function SubscriptionDetailScreen({ subscription, onUpdate, onStartCancel, onBack, promotion, highlightCancel }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({
    plan: subscription?.plan || "기본 플랜",
    amount: subscription?.amount || 0,
    dueDay: subscription?.dueDay || 1,
    billingCycle: subscription?.billingCycle || "매월",
    nextBillingDate: subscription?.nextBillingDate || "",
    paymentMethod: subscription?.paymentMethod || "등록 안 됨",
  }));

  if (!subscription) {
    return (
      <main className="re-final-page">
        <section className="re-final-empty">
          <RiveCharacter state="sorry" className="re-final-empty__character" />
          <h1>구독 정보를 찾을 수 없습니다.</h1>
          <p>삭제되었거나 잘못된 경로입니다.</p>
          <Button onClick={onBack}>목록으로 돌아가기</Button>
        </section>
      </main>
    );
  }

  const save = () => {
    const amount = Number(draft.amount);
    const nextBillingDate = String(draft.nextBillingDate || "").trim();
    const parsed = nextBillingDate ? new Date(`${nextBillingDate}T00:00:00`) : null;
    const dueDay = parsed && !Number.isNaN(parsed.getTime()) ? parsed.getDate() : Math.max(1, Math.min(31, Number(draft.dueDay)));
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(dueDay)) return;
    onUpdate(subscription.subscriptionId, { ...draft, amount, dueDay, nextBillingDate });
    setEditing(false);
  };

  const monogram = subscription.monogram || subscription.name?.slice(0, 1) || "S";

  return (
    <main className="re-final-page re-detail-page">
      <header className="re-final-page__header">
        <div className="re-detail-title">
          <ServiceMark monogram={monogram} className="h-14 w-14 rounded-full text-[16px]" />
          <div>
            <p className="re-eyebrow">SUBSCRIPTION DETAIL</p>
            <div className="flex items-center gap-2">
              <h1>{subscription.name}</h1>
              <DDayBadge subscription={subscription} />
            </div>
            <p>다음 결제일 {formatBillingDate(subscription)}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={onBack}>목록으로</Button>
      </header>

      <div className="re-detail-grid">
        <section className="re-final-panel re-detail-info">
          <div className="re-final-section-title">
            <div>
              <span>서비스 정보</span>
              <strong>결제 정보를 한눈에 확인해요.</strong>
            </div>
            <button type="button" className="re-final-icon-button" onClick={() => setEditing((value) => !value)} aria-label="구독 정보 수정">
              <Settings2 size={17} />
            </button>
          </div>
          <DetailField label="요금제" value={subscription.plan} />
          <DetailField label="결제 금액" value={formatWon(subscription.amount)} />
          <DetailField label="결제 주기" value={subscription.billingCycle || "매월"} />
          <DetailField label="다음 결제일" value={formatBillingDate(subscription)} />
          <DetailField label="결제 수단" value={subscription.paymentMethod || "직접 관리"} />

          {editing && (
            <div className="re-detail-edit">
              <label>요금제<input value={draft.plan} onChange={(event) => setDraft((value) => ({ ...value, plan: event.target.value }))} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label>결제 금액<input type="number" min="1" value={draft.amount} onChange={(event) => setDraft((value) => ({ ...value, amount: event.target.value }))} /></label>
                <label>결제 주기<select value={draft.billingCycle} onChange={(event) => setDraft((value) => ({ ...value, billingCycle: event.target.value }))}><option>매월</option><option>매년</option></select></label>
              </div>
              <label>다음 결제일<input type="date" value={draft.nextBillingDate} onChange={(event) => setDraft((value) => ({ ...value, nextBillingDate: event.target.value }))} /></label>
              <label>결제 수단<input value={draft.paymentMethod} onChange={(event) => setDraft((value) => ({ ...value, paymentMethod: event.target.value }))} /></label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="compact" onClick={() => setEditing(false)}>취소</Button>
                <Button size="compact" onClick={save}>저장</Button>
              </div>
            </div>
          )}
        </section>

        <section className="re-final-panel re-detail-manage">
          <div className="re-final-section-title">
            <div>
              <span>관리</span>
              <strong>결제 전 알림 설정</strong>
            </div>
          </div>

          <div className="re-detail-toggle-row">
            <span><strong>결제 3일 전</strong><small>D-3 알림</small></span>
            <ToggleSwitch checked={Boolean(subscription.alertD3)} onChange={(checked) => onUpdate(subscription.subscriptionId, { alertD3: checked })} label="결제 3일 전 알림" />
          </div>
          <div className="re-detail-toggle-row">
            <span><strong>결제 하루 전</strong><small>D-1 알림</small></span>
            <ToggleSwitch checked={Boolean(subscription.alertD1)} onChange={(checked) => onUpdate(subscription.subscriptionId, { alertD1: checked })} label="결제 하루 전 알림" />
          </div>

          <Button
            className="w-full"
            variant="secondary"
            disabled={!subscription.cancelUrl}
            onClick={() => subscription.cancelUrl && window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer")}
          >
            공식 웹사이트 열기 <ExternalLink size={15} />
          </Button>

          {promotion && (
            <article className="re-detail-promotion">
              <Sparkles size={16} />
              <div>
                <span>절약 기회</span>
                <strong>{promotion.title}</strong>
                <p>이 구독을 해지한 뒤 혜택을 받을 수 있어요.</p>
              </div>
            </article>
          )}

          <Button className={cx("w-full", highlightCancel && "cancel-highlight")} onClick={() => onStartCancel(subscription.subscriptionId, promotion)}>
            {subscription.status === "cancel_in_progress" ? "해지 계속하기" : "구독 해지하기"}
          </Button>
        </section>
      </div>
    </main>
  );
}

export function CalendarScreen({ subscriptions, onOpen }) {
  const [date, setDate] = useState(() => new Date());
  const year = date.getFullYear();
  const month = date.getMonth();
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const days = useMemo(() => getCalendarDays(year, month), [year, month]);
  const lastDay = getLastDate(year, month);
  const clampedDay = Math.min(selectedDay, lastDay);

  const duesByDay = useMemo(() => {
    const map = new Map();
    for (const sub of subscriptions) {
      const chargeDate = getChargeDateInMonth(sub, year, month);
      if (!chargeDate) continue;
      const day = chargeDate.getDate();
      const list = map.get(day) || [];
      list.push(sub);
      map.set(day, list);
    }
    return map;
  }, [month, subscriptions, year]);

  const monthDues = useMemo(() => {
    const items = [];
    for (const sub of subscriptions) {
      const chargeDate = getChargeDateInMonth(sub, year, month);
      if (chargeDate) items.push({ subscription: sub, chargeDate });
    }
    return items;
  }, [month, subscriptions, year]);

  const selectedDues = duesByDay.get(clampedDay) || [];
  const selectedTotal = selectedDues.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthTotal = monthDues.reduce((sum, item) => sum + Number(item.subscription.amount || 0), 0);
  const prevMonth = () => setDate(new Date(year, month - 1, 1));
  const nextMonth = () => setDate(new Date(year, month + 1, 1));
  const goToday = () => {
    const now = new Date();
    setDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now.getDate());
  };

  return (
    <main className="re-final-page re-calendar-page">
      <div className="re-calendar-shell">
        <section className="re-final-panel re-calendar-main">
          <div className="re-calendar-head">
            <div>
              <p className="re-eyebrow">BILLING CALENDAR</p>
              <h1>{formatKoreanMonth(year, month)}</h1>
            </div>
            <div className="re-calendar-actions">
              <button type="button" className="re-final-icon-button" onClick={prevMonth} aria-label="이전 달"><ChevronLeft size={18} /></button>
              <button type="button" className="re-final-icon-button" onClick={nextMonth} aria-label="다음 달"><ChevronRight size={18} /></button>
              <Button variant="secondary" size="compact" onClick={goToday}>오늘로 이동</Button>
            </div>
          </div>

          <div className="re-calendar-week">
            <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
          </div>
          <div className="re-calendar-grid">
            {days.map((item, index) => {
              if (!item) return <span key={`empty-${index}`} className="re-calendar-day is-empty" />;
              const isSelected = item === clampedDay;
              const hasDue = (duesByDay.get(item) || []).length > 0;
              return (
                <button
                  key={`day-${item}`}
                  type="button"
                  className={cx("re-calendar-day", isSelected && "is-selected", hasDue && "has-due")}
                  onClick={() => setSelectedDay(item)}
                >
                  <span>{item}</span>
                  {hasDue && <i aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="re-calendar-side">
          <section className="re-final-panel re-calendar-summary">
            <div className="re-final-section-title">
              <div>
                <span>이번 달 구독 요약</span>
                <strong>{month + 1}월</strong>
              </div>
              <CalendarDays size={20} />
            </div>
            <dl>
              <div><dt>전체 구독 수</dt><dd>{subscriptions.length}개</dd></div>
              <div><dt>이번 달 결제 예정</dt><dd>{monthDues.length}건</dd></div>
              <div><dt>이번 달 결제 예정 금액</dt><dd>{formatWon(monthTotal)}</dd></div>
            </dl>
          </section>

          <section className="re-final-panel re-calendar-tip">
            <div>
              <span>RE. 작은 팁</span>
              <strong>필요한 것만, 더 가볍게.</strong>
              <p>결제 예정일을 확인하고 필요한 구독만 남겨보세요.</p>
            </div>
            <RiveCharacter state="idle" className="re-calendar-tip__character" />
          </section>
        </aside>
      </div>

      <section className="re-final-panel re-calendar-agenda">
        <div className="re-calendar-agenda__head">
          <div>
            <span>선택 날짜</span>
            <h2>{month + 1}월 {clampedDay}일 결제 예정 ({selectedDues.length}건)</h2>
          </div>
          {selectedDues.length > 0 && <strong>{formatWon(selectedTotal)}</strong>}
        </div>

        {selectedDues.length > 0 ? (
          <div className="re-calendar-agenda__list">
            {selectedDues.map((sub) => (
              <button key={sub.subscriptionId || sub.id} type="button" onClick={() => onOpen(sub.subscriptionId || sub.id)}>
                <span className="flex items-center gap-3">
                  <ServiceMark monogram={sub.monogram || sub.name?.slice(0, 1)} className="h-10 w-10 rounded-full text-[11px]" />
                  <span>
                    <strong>{sub.name}</strong>
                    <small>{sub.plan}</small>
                  </span>
                </span>
                <strong>{formatWon(sub.amount)}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="re-calendar-agenda__empty">
            <RiveCharacter state="idle" className="re-calendar-agenda__character" />
            <div>
              <strong>해당 일자에는 예정된 결제 일정이 없습니다.</strong>
              <span>지금도, 더 좋은 너를 향해.</span>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
