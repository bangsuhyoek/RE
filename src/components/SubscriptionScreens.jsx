import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, FilterX, RefreshCw, Search, Settings2, SlidersHorizontal } from "lucide-react";
import { Button, DDayBadge, ServiceMark, SubscriptionCard, ToggleSwitch } from "./ui";
import { daysUntilCharge, formatBillingDate, formatKoreanMonth, formatWon, getCalendarDays, getLastDate } from "../lib/dates";

const categories = ["전체", "OTT", "음악", "쇼핑", "생산성"];

export function SubscriptionListScreen({ subscriptions, onOpen, onAdd, onStartCancel, onMute, onRefresh }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("due");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return subscriptions
      .filter((subscription) => category === "전체" || subscription.category === category)
      .filter((subscription) => status === "all" || (status === "trial" ? subscription.status === "trial" : subscription.status === "active"))
      .filter((subscription) => !normalized || `${subscription.name} ${subscription.plan}`.toLowerCase().includes(normalized))
      .sort((a, b) => {
        if (sort === "amount") return b.amount - a.amount;
        if (sort === "recent") return new Date(b.createdAt) - new Date(a.createdAt);
        return daysUntilCharge(a) - daysUntilCharge(b);
      });
  }, [category, query, sort, status, subscriptions]);

  const total = filtered.reduce((sum, subscription) => sum + subscription.amount, 0);
  const reset = () => { setQuery(""); setCategory("전체"); setStatus("all"); setSort("due"); };

  return (
    <main className="relative min-h-[calc(100vh-4rem)] px-5 pb-36 pt-5">
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <span className="sr-only">구독 검색</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
          <input className="re-field w-full rounded-xl py-3 pl-10 pr-3 text-[14px] outline-none placeholder:text-[#A1A1AA]" placeholder="서비스 또는 요금제 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <Button variant="secondary" size="icon" className="h-11 w-11" onClick={onRefresh} aria-label="목록 새로고침"><RefreshCw size={18} /></Button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-3 py-2 text-[12px] font-semibold transition-colors ${category === item ? "border-black bg-black text-white" : "border-[#E4E4E7] bg-white text-[#71717A] hover:border-[#A1A1AA]"}`}>{item}</button>)}
      </div>

      <div className="mt-4 flex gap-2">
        <label className="relative flex-1">
          <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" size={15} />
          <select className="w-full appearance-none rounded-lg border border-[#E4E4E7] bg-white py-2 pl-8 pr-3 text-[12px] font-medium outline-none focus:border-black" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="정렬 기준"><option value="due">결제일 임박순</option><option value="amount">금액 높은순</option><option value="recent">최근 등록순</option></select>
        </label>
        <label className="flex-1"><select className="w-full appearance-none rounded-lg border border-[#E4E4E7] bg-white px-3 py-2 text-[12px] font-medium outline-none focus:border-black" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="구독 상태"><option value="all">모든 상태</option><option value="active">활성 구독</option><option value="trial">무료 체험</option></select></label>
      </div>

      <div className="mt-6 flex items-end justify-between"><span className="text-[13px] text-[#71717A]"><strong className="font-semibold text-black">{filtered.length}개</strong> 구독</span><span className="text-[13px] font-semibold">월 {formatWon(total)}</span></div>

      {filtered.length > 0 ? (
        <div className="mt-3 space-y-3">{filtered.map((subscription) => <SubscriptionCard key={subscription.subscriptionId || subscription.id} subscription={subscription} detail swipable onOpen={() => onOpen(subscription.subscriptionId || subscription.id)} onCancel={() => onStartCancel(subscription.subscriptionId || subscription.id)} onMute={() => onMute(subscription.subscriptionId || subscription.id)} />)}</div>
      ) : (
        <section className="mt-16 flex flex-col items-center text-center"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#F4F4F5]"><FilterX size={24} /></span><h2 className="mt-5 text-[18px] font-semibold">조건에 맞는 구독 서비스가 없습니다.</h2><p className="mt-2 text-[13px] text-[#71717A]">필터를 초기화하거나 다른 검색어를 입력해 보세요.</p><Button variant="secondary" size="compact" className="mt-5" onClick={reset}>필터 초기화</Button></section>
      )}
    </main>
  );
}

function DetailField({ label, value }) {
  return <div className="flex items-center justify-between gap-4 py-3"><span className="text-[13px] text-[#71717A]">{label}</span><strong className="min-w-0 truncate text-right text-[14px] font-semibold">{value}</strong></div>;
}

export function SubscriptionDetailScreen({ subscription, onUpdate, onStartCancel, onBack, promotion, highlightCancel }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({ plan: subscription?.plan || "기본 플랜", amount: subscription?.amount || 0, dueDay: subscription?.dueDay || 1, paymentMethod: subscription?.paymentMethod || "등록 안 됨" }));

  if (!subscription) {
    return <main className="px-5 pb-36 pt-12 text-center"><h1 className="text-[18px] font-bold">구독 정보를 찾을 수 없습니다.</h1><p className="mt-2 text-[13px] text-[#71717A]">삭제되었거나 잘못된 경로입니다.</p><Button className="mx-auto mt-6" onClick={onBack}>목록으로 돌아가기</Button></main>;
  }

  const save = () => {
    const amount = Number(draft.amount);
    const dueDay = Math.max(1, Math.min(31, Number(draft.dueDay)));
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(dueDay)) return;
    onUpdate(subscription.subscriptionId, { ...draft, amount, dueDay });
    setEditing(false);
  };

  const monogram = subscription.monogram || subscription.name?.slice(0, 1) || "S";

  return (
    <main className="px-5 pb-36 pt-6">
      <section className="flex items-center gap-4"><ServiceMark monogram={monogram} className="h-14 w-14 rounded-2xl text-[17px]" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h1 className="truncate text-[22px] font-bold tracking-[-0.02em] text-[#1B2A8C]">{subscription.name}</h1><DDayBadge subscription={subscription} /></div><p className="mt-1 text-[13px] text-[#71717A]">다음 결제일 {formatBillingDate(subscription)}</p></div></section>

      <section className="re-surface-card mt-8 rounded-2xl border border-[#E4E4E7] bg-white px-4"><DetailField label="요금제" value={subscription.plan} /><div className="h-px bg-[#E4E4E7]" /><DetailField label="결제 금액" value={formatWon(subscription.amount)} /><div className="h-px bg-[#E4E4E7]" /><DetailField label="결제 주기" value={subscription.billingCycle || "매월"} /><div className="h-px bg-[#E4E4E7]" /><DetailField label="결제 수단" value={subscription.paymentMethod || "직접 관리"} /></section>

      {editing && (
        <section className="field-enter mt-4 rounded-2xl border border-black bg-[#FAFAFA] p-4">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-[15px] font-semibold">구독 정보 수정</h2><Settings2 size={17} /></div>
          <div className="space-y-3">
            <label className="block text-[12px] font-medium text-[#71717A]">요금제<input className="mt-1.5 w-full rounded-lg border border-[#E4E4E7] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-black" value={draft.plan} onChange={(event) => setDraft((value) => ({ ...value, plan: event.target.value }))} /></label>
            <div className="grid grid-cols-2 gap-3"><label className="block text-[12px] font-medium text-[#71717A]">월 금액<input className="mt-1.5 w-full rounded-lg border border-[#E4E4E7] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-black" type="number" min="0" value={draft.amount} onChange={(event) => setDraft((value) => ({ ...value, amount: event.target.value }))} /></label><label className="block text-[12px] font-medium text-[#71717A]">결제일<input className="mt-1.5 w-full rounded-lg border border-[#E4E4E7] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-black" type="number" min="1" max="31" value={draft.dueDay} onChange={(event) => setDraft((value) => ({ ...value, dueDay: event.target.value }))} /></label></div>
            <label className="block text-[12px] font-medium text-[#71717A]">결제 수단<input className="mt-1.5 w-full rounded-lg border border-[#E4E4E7] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-black" value={draft.paymentMethod} onChange={(event) => setDraft((value) => ({ ...value, paymentMethod: event.target.value }))} /></label>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="secondary" size="compact" onClick={() => setEditing(false)}>취소</Button><Button size="compact" onClick={save}>저장</Button></div>
        </section>
      )}

      <section className="re-surface-card mt-5 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] p-4">
        <h2 className="text-[15px] font-semibold">결제 전 알림 설정</h2><p className="mt-1 text-[12px] leading-5 text-[#71717A]">원치 않는 자동 결제 전에 알려드려요.</p>
        <div className="mt-4 divide-y divide-[#E4E4E7]"><div className="flex items-center justify-between py-3"><span><strong className="block text-[14px]">결제 3일 전</strong><span className="text-[12px] text-[#71717A]">D-3 알림</span></span><ToggleSwitch checked={Boolean(subscription.alertD3)} onChange={(checked) => onUpdate(subscription.subscriptionId, { alertD3: checked })} label="결제 3일 전 알림" /></div><div className="flex items-center justify-between py-3"><span><strong className="block text-[14px]">결제 하루 전</strong><span className="text-[12px] text-[#71717A]">D-1 알림</span></span><ToggleSwitch checked={Boolean(subscription.alertD1)} onChange={(checked) => onUpdate(subscription.subscriptionId, { alertD1: checked })} label="결제 하루 전 알림" /></div></div>
      </section>

      <section className="mt-5">
        <Button
          className="w-full"
          variant="secondary"
          disabled={!subscription.cancelUrl}
          onClick={() => subscription.cancelUrl && window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer")}
        >
          공식 웹사이트 열기 <ExternalLink size={15} />
        </Button>
      </section>

      {promotion && <section className="re-surface-card mt-5 rounded-2xl border border-black bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#71717A]">절약 기회</p><h2 className="mt-2 text-[16px] font-semibold">{promotion.title}</h2><p className="mt-1 text-[13px] text-[#71717A]">이 구독을 해지한 뒤 혜택을 받을 수 있어요.</p></section>}

      <div className="mt-8 space-y-3"><Button className={`w-full ${highlightCancel ? "cancel-highlight" : ""}`} onClick={() => onStartCancel(subscription.subscriptionId, promotion)}>{subscription.status === "cancel_in_progress" ? "해지 계속하기" : "구독 해지하기"}</Button><Button className="w-full" variant="secondary" onClick={() => setEditing((value) => !value)}>{editing ? "수정 닫기" : "구독 정보 수정"}</Button></div>
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
      const day = Math.min(sub.dueDay, lastDay);
      const list = map.get(day) || [];
      list.push(sub);
      map.set(day, list);
    }
    return map;
  }, [lastDay, subscriptions]);

  const selectedDues = duesByDay.get(clampedDay) || [];
  const selectedTotal = selectedDues.reduce((sum, item) => sum + item.amount, 0);
  const prevMonth = () => setDate(new Date(year, month - 1, 1));
  const nextMonth = () => setDate(new Date(year, month + 1, 1));

  return (
    <main className="px-5 pb-36 pt-6">
      <div className="flex items-center justify-between"><div><p className="re-eyebrow">BILLING CALENDAR</p><h1 className="mt-1 text-[22px] font-bold tracking-tight text-[#1B2A8C]">{formatKoreanMonth(date)}</h1></div><div className="flex gap-1"><Button variant="secondary" size="icon" className="h-9 w-9" onClick={prevMonth} aria-label="이전 달"><ChevronLeft size={16} /></Button><Button variant="secondary" size="icon" className="h-9 w-9" onClick={nextMonth} aria-label="다음 달"><ChevronRight size={16} /></Button></div></div>

      <div className="re-surface-card mt-5 rounded-2xl border border-[#E4E4E7] bg-white p-4">
        <div className="grid grid-cols-7 text-center text-[12px] font-semibold text-[#71717A]"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>
        <div className="mt-2 grid grid-cols-7 gap-y-2 text-center text-[13px]">
          {days.map((item, i) => {
            if (!item) return <div key={`empty-${i}`} className="h-10" />;
            const isSelected = item === clampedDay;
            const hasDue = (duesByDay.get(item) || []).length > 0;
            return <button key={`day-${item}`} type="button" onClick={() => setSelectedDay(item)} className={`relative mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-xl font-medium transition-colors ${isSelected ? "bg-black font-bold text-white" : "hover:bg-[#F4F4F5]"}`}><span>{item}</span>{hasDue && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? "bg-white" : "bg-black"}`} />}</button>;
          })}
        </div>
      </div>

      <section className="mt-6"><div className="flex items-center justify-between"><h2 className="text-[16px] font-bold">{month + 1}월 {clampedDay}일 결제 예정 ({selectedDues.length}건)</h2>{selectedDues.length > 0 && <span className="text-[14px] font-semibold">{formatWon(selectedTotal)}</span>}</div>
        {selectedDues.length > 0 ? <div className="mt-3 space-y-2">{selectedDues.map((sub) => <button key={sub.subscriptionId || sub.id} type="button" onClick={() => onOpen(sub.subscriptionId || sub.id)} className="card-press re-surface-card flex w-full items-center justify-between rounded-xl border border-[#E4E4E7] bg-white p-3 text-left"><div className="flex items-center gap-3"><ServiceMark monogram={sub.monogram || sub.name?.slice(0, 1)} className="h-9 w-9 rounded-lg text-[12px]" /><div><strong className="block text-[14px] font-semibold">{sub.name}</strong><span className="text-[12px] text-[#71717A]">{sub.plan}</span></div></div><span className="text-[14px] font-semibold">{formatWon(sub.amount)}</span></button>)}</div> : <div className="mt-3 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] p-6 text-center text-[13px] text-[#71717A]">해당 일자에는 예정된 결제 일정이 없습니다.</div>}
      </section>
    </main>
  );
}
