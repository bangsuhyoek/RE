import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, CreditCard, FilterX, Plus, RefreshCw, Search, Settings2, SlidersHorizontal } from "lucide-react";
import { Button, DDayBadge, ServiceMark, SubscriptionCard, ToggleSwitch } from "./ui";
import { dateForDueDay, daysUntilCharge, formatBillingDate, formatKoreanMonth, formatWon, getCalendarDays, getLastDate } from "../lib/dates";

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
    <main className="relative min-h-[calc(100vh-4rem)] px-5 pb-28 pt-5">
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <span className="sr-only">구독 검색</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
          <input className="w-full rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] py-3 pl-10 pr-3 text-[14px] outline-none placeholder:text-[#A1A1AA] focus:border-black focus:bg-white" placeholder="서비스 또는 요금제 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <Button variant="secondary" size="icon" className="h-11 w-11 rounded-xl" onClick={onRefresh} aria-label="목록 새로고침"><RefreshCw size={18} /></Button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-3 py-2 text-[12px] font-semibold transition-colors ${category === item ? "border-black bg-black text-white" : "border-[#E4E4E7] bg-white text-[#71717A] hover:border-[#A1A1AA]"}`}>{item}</button>)}
      </div>

      <div className="mt-4 flex gap-2">
        <label className="relative flex-1">
          <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" size={15} />
          <select className="w-full appearance-none rounded-lg border border-[#E4E4E7] bg-white py-2 pl-8 pr-3 text-[12px] font-medium outline-none focus:border-black" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="정렬 기준">
            <option value="due">결제일 임박순</option>
            <option value="amount">금액 높은순</option>
            <option value="recent">최근 등록순</option>
          </select>
        </label>
        <label className="flex-1">
          <select className="w-full appearance-none rounded-lg border border-[#E4E4E7] bg-white px-3 py-2 text-[12px] font-medium outline-none focus:border-black" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="구독 상태">
            <option value="all">모든 상태</option>
            <option value="active">활성 구독</option>
            <option value="trial">무료 체험</option>
          </select>
        </label>
      </div>

      <div className="mt-6 flex items-end justify-between">
        <span className="text-[13px] text-[#71717A]"><strong className="font-semibold text-black">{filtered.length}개</strong> 구독</span>
        <span className="text-[13px] font-semibold">월 {formatWon(total)}</span>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-3 space-y-3">
          {filtered.map((subscription) => <SubscriptionCard key={subscription.subscriptionId} subscription={subscription} detail swipable onOpen={() => onOpen(subscription.subscriptionId)} onCancel={() => onStartCancel(subscription.subscriptionId)} onMute={() => onMute(subscription.subscriptionId)} />)}
        </div>
      ) : (
        <section className="mt-16 flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#F4F4F5]"><FilterX size={24} /></span>
          <h2 className="mt-5 text-[18px] font-semibold">조건에 맞는 구독 서비스가 없습니다.</h2>
          <p className="mt-2 text-[13px] text-[#71717A]">필터를 초기화하거나 다른 검색어를 입력해 보세요.</p>
          <Button variant="secondary" size="compact" className="mt-5" onClick={reset}>필터 초기화</Button>
        </section>
      )}

      <Button size="icon" className="fixed bottom-24 right-[max(1.25rem,calc(50%-190px))] z-20 h-14 w-14 rounded-full shadow-lg" onClick={onAdd} aria-label="구독 추가"><Plus size={25} /></Button>
    </main>
  );
}

function DetailField({ label, value }) {
  return <div className="flex items-center justify-between gap-4 py-3"><span className="text-[13px] text-[#71717A]">{label}</span><strong className="min-w-0 truncate text-right text-[14px] font-semibold">{value}</strong></div>;
}

export function SubscriptionDetailScreen({ subscription, onUpdate, onStartCancel, promotion }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({ plan: subscription.plan, amount: subscription.amount, dueDay: subscription.dueDay, paymentMethod: subscription.paymentMethod }));
  if (!subscription) return null;
  const save = () => {
    const amount = Number(draft.amount);
    const dueDay = Math.max(1, Math.min(31, Number(draft.dueDay)));
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(dueDay)) return;
    onUpdate(subscription.subscriptionId, { ...draft, amount, dueDay });
    setEditing(false);
  };
  return (
    <main className="px-5 pb-28 pt-6">
      <section className="flex items-center gap-4">
        <ServiceMark monogram={subscription.monogram} className="h-14 w-14 rounded-2xl text-[17px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h1 className="truncate text-[22px] font-bold tracking-[-0.02em]">{subscription.name}</h1><DDayBadge subscription={subscription} /></div>
          <p className="mt-1 text-[13px] text-[#71717A]">다음 결제일 {formatBillingDate(subscription)}</p>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-[#E4E4E7] bg-white px-4">
        <DetailField label="요금제" value={subscription.plan} />
        <div className="h-px bg-[#E4E4E7]" />
        <DetailField label="결제 금액" value={formatWon(subscription.amount)} />
        <div className="h-px bg-[#E4E4E7]" />
        <DetailField label="결제 주기" value={subscription.billingCycle || "매월"} />
        <div className="h-px bg-[#E4E4E7]" />
        <DetailField label="결제 수단" value={subscription.paymentMethod || "등록 안 됨"} />
      </section>

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

      <section className="mt-5 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] p-4">
        <h2 className="text-[15px] font-semibold">사전 알림 설정</h2>
        <p className="mt-1 text-[12px] leading-5 text-[#71717A]">원치 않는 자동 결제 전에 알려드려요.</p>
        <div className="mt-4 divide-y divide-[#E4E4E7]">
          <div className="flex items-center justify-between py-3"><span><strong className="block text-[14px]">결제 3일 전</strong><span className="text-[12px] text-[#71717A]">D-3 알림</span></span><ToggleSwitch checked={Boolean(subscription.alertD3)} onChange={(checked) => onUpdate(subscription.subscriptionId, { alertD3: checked })} label="결제 3일 전 알림" /></div>
          <div className="flex items-center justify-between py-3"><span><strong className="block text-[14px]">결제 하루 전</strong><span className="text-[12px] text-[#71717A]">D-1 알림</span></span><ToggleSwitch checked={Boolean(subscription.alertD1)} onChange={(checked) => onUpdate(subscription.subscriptionId, { alertD1: checked })} label="결제 하루 전 알림" /></div>
        </div>
      </section>

      {promotion && <section className="mt-5 rounded-2xl border border-black bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#71717A]">절약 기회</p><h2 className="mt-2 text-[16px] font-semibold">{promotion.title}</h2><p className="mt-1 text-[13px] text-[#71717A]">이 구독을 해지한 뒤 혜택을 받을 수 있어요.</p></section>}

      <div className="mt-8 space-y-3">
        <Button className="w-full" onClick={() => onStartCancel(subscription.subscriptionId, promotion)}>웹사이트에서 다이렉트 해지하기</Button>
        <Button className="w-full" variant="secondary" onClick={() => setEditing((value) => !value)}>{editing ? "수정 닫기" : "구독 정보 수정"}</Button>
      </div>
    </main>
  );
}

export function CalendarScreen({ subscriptions, onOpen }) {
  const now = new Date();
  const [visible, setVisible] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const days = getCalendarDays(visible.year, visible.month);
  const paymentMap = useMemo(() => {
    const map = new Map();
    subscriptions.forEach((subscription) => {
      const day = Math.min(subscription.dueDay, getLastDate(visible.year, visible.month));
      const existing = map.get(day) || [];
      map.set(day, [...existing, subscription]);
    });
    return map;
  }, [subscriptions, visible]);
  const selected = paymentMap.get(selectedDay) || [];
  const selectedTotal = selected.reduce((sum, subscription) => sum + subscription.amount, 0);
  const shiftMonth = (direction) => {
    const date = new Date(visible.year, visible.month + direction, 1);
    setVisible({ year: date.getFullYear(), month: date.getMonth() });
    setSelectedDay(1);
  };
  const todayInView = visible.year === now.getFullYear() && visible.month === now.getMonth();

  return (
    <main className="px-5 pb-28 pt-5">
      <section className="flex items-center justify-between">
        <button type="button" onClick={() => shiftMonth(-1)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-[#F4F4F5]" aria-label="이전 달"><ChevronLeft size={20} /></button>
        <h1 className="text-[18px] font-semibold">{formatKoreanMonth(visible.year, visible.month)}</h1>
        <button type="button" onClick={() => shiftMonth(1)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-[#F4F4F5]" aria-label="다음 달"><ChevronRight size={20} /></button>
      </section>
      <section className="mt-6 rounded-2xl border border-[#E4E4E7] bg-white p-3">
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[#A1A1AA]"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>
        <div className="mt-2 grid grid-cols-7 gap-y-1">
          {days.map((day, index) => {
            if (!day) return <span key={`blank-${index}`} className="aspect-square" />;
            const bills = paymentMap.get(day) || [];
            const selectedNow = day === selectedDay;
            const todayNow = todayInView && day === now.getDate();
            return <button key={day} type="button" onClick={() => setSelectedDay(day)} className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-[13px] transition-colors ${selectedNow ? "bg-black font-semibold text-white" : todayNow ? "border border-black font-semibold" : "hover:bg-[#F4F4F5]"}`} aria-pressed={selectedNow}><span>{day}</span>{bills.length > 0 && <span className={`mt-1 h-1 w-1 rounded-full ${selectedNow ? "bg-white" : "bg-black"}`} />}</button>;
          })}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] p-4">
        <div className="flex items-start justify-between"><span><p className="text-[12px] text-[#71717A]">{visible.month + 1}월 {selectedDay}일 결제 예정</p><h2 className="mt-1 text-[18px] font-semibold">{formatWon(selectedTotal)}</h2></span><CalendarDays size={20} className="text-[#71717A]" /></div>
        {selected.length ? <div className="mt-4 space-y-2">{selected.map((subscription) => <button key={subscription.subscriptionId} type="button" onClick={() => onOpen(subscription.subscriptionId)} className="flex w-full items-center gap-3 rounded-xl border border-[#E4E4E7] bg-white p-3 text-left hover:border-black"><ServiceMark monogram={subscription.monogram} className="h-8 w-8 rounded-lg text-[11px]" /><span className="min-w-0 flex-1"><strong className="block truncate text-[13px]">{subscription.name}</strong><span className="text-[11px] text-[#71717A]">{subscription.plan}</span></span><strong className="text-[13px]">{formatWon(subscription.amount)}</strong></button>)}</div> : <p className="mt-5 text-center text-[13px] text-[#71717A]">이 날에는 예정된 결제가 없습니다.</p>}
      </section>
    </main>
  );
}
