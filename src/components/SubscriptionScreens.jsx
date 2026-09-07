import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, CreditCard, FilterX, RefreshCw, Search, Send, Settings2, SlidersHorizontal } from "lucide-react";
import { Button, Chip, DDayBadge, IconButton, ServiceMark, SubscriptionCard, ToggleSwitch, PaymentIcon, PaymentMethodBadge, PAYMENT_PRESETS } from "./ui";
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
    <main className="relative min-h-[calc(100vh-4rem)] px-5 pb-36 pt-5">
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <span className="sr-only">구독 검색</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B95A1]" size={18} />
          <input className="w-full rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] py-3 pl-10 pr-3 text-[14px] text-[#191F28] outline-none placeholder:text-[#8B95A1] transition-colors focus:border-[#191F28] focus:bg-white" placeholder="서비스 또는 요금제 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <IconButton variant="weak" size="large" onClick={onRefresh} aria-label="목록 새로고침"><RefreshCw size={18} className="text-[#4E5968]" /></IconButton>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((item) => <Chip key={item} selected={category === item} onClick={() => setCategory(item)}>{item}</Chip>)}
      </div>

      <div className="mt-4 flex gap-2">
        <label className="relative flex-1">
          <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A1]" size={15} />
          <select className="w-full appearance-none rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] py-2 pl-8 pr-3 text-[12px] font-semibold text-[#333D4B] outline-none transition-colors focus:border-[#191F28] focus:bg-white" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="정렬 기준">
            <option value="due">결제일 임박순</option>
            <option value="amount">금액 높은순</option>
            <option value="recent">최근 등록순</option>
          </select>
        </label>
        <label className="flex-1">
          <select className="w-full appearance-none rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3.5 py-2 text-[12px] font-semibold text-[#333D4B] outline-none transition-colors focus:border-[#191F28] focus:bg-white" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="구독 상태">
            <option value="all">모든 상태</option>
            <option value="active">활성 구독</option>
            <option value="trial">무료 체험</option>
          </select>
        </label>
      </div>

      <div className="mt-6 flex items-end justify-between">
        <span className="text-[13px] text-[#6B7684]"><strong className="font-bold text-[#191F28]">{filtered.length}개</strong> 구독</span>
        <span className="text-[14px] font-bold text-[#191F28]">월 {formatWon(total)}</span>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-3 space-y-3">
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
      ) : (
        <section className="mt-16 flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#F2F4F6] text-[#6B7684] border border-[#E5E8EB]"><FilterX size={24} /></span>
          <h2 className="mt-5 text-[18px] font-bold text-[#191F28]">조건에 맞는 구독 서비스가 없습니다.</h2>
          <p className="mt-2 text-[13px] text-[#6B7684]">필터를 초기화하거나 다른 검색어를 입력해 보세요.</p>
          <Button variant="secondary" size="compact" className="mt-5" onClick={reset}>필터 초기화</Button>
        </section>
      )}
    </main>
  );
}

function DetailField({ label, value }) {
  return <div className="flex items-center justify-between gap-4 py-3.5"><span className="text-[13px] font-medium text-[#6B7684]">{label}</span><strong className="min-w-0 truncate text-right text-[14px] font-bold text-[#191F28]">{value}</strong></div>;
}

export function SubscriptionDetailScreen({ subscription, onUpdate, onStartCancel, onBack, promotion, onTriggerNotification, highlightCancel }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({
    plan: subscription?.plan || "기본 플랜",
    amount: subscription?.amount || 0,
    dueDay: subscription?.dueDay || 1,
    paymentMethod: subscription?.paymentMethod || "등록 안 됨"
  }));

  if (!subscription) {
    return (
      <main className="px-5 pb-36 pt-12 text-center">
        <h1 className="text-[18px] font-bold">구독 정보를 찾을 수 없습니다.</h1>
        <p className="mt-2 text-[13px] text-[#71717A]">삭제되었거나 잘못된 경로입니다.</p>
        <Button className="mt-6 mx-auto" onClick={onBack}>목록으로 돌아가기</Button>
      </main>
    );
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
      <section className="flex items-center gap-4">
        <ServiceMark monogram={monogram} className="h-14 w-14 rounded-2xl text-[17px] shadow-2xs" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[22px] font-extrabold tracking-tight text-[#191F28]">{subscription.name}</h1>
            <DDayBadge subscription={subscription} />
          </div>
          <p className="mt-1 text-[13px] font-medium text-[#6B7684]">다음 결제일 {formatBillingDate(subscription)}</p>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-[#E5E8EB] bg-white px-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <DetailField label="요금제" value={subscription.plan} />
        <div className="h-px bg-[#F2F4F6]" />
        <DetailField label="결제 금액" value={formatWon(subscription.amount)} />
        <div className="h-px bg-[#F2F4F6]" />
        <DetailField label="결제 주기" value={subscription.billingCycle || "매월"} />
        <div className="h-px bg-[#F2F4F6]" />
        <DetailField label="결제 수단" value={<PaymentMethodBadge method={subscription.paymentMethod || "직접 관리"} size={16} />} />
      </section>

      {editing && (
        <section className="field-enter mt-4 rounded-2xl border border-[#191F28] bg-[#F9FAFB] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-[15px] font-bold text-[#191F28]">구독 정보 수정</h2><Settings2 size={17} className="text-[#6B7684]" /></div>
          <div className="space-y-3">
            <label className="block text-[12px] font-semibold text-[#6B7684]">요금제<input className="mt-1.5 w-full rounded-xl border border-[#E5E8EB] bg-white px-3.5 py-2.5 text-[14px] text-[#191F28] outline-none transition-colors focus:border-[#191F28]" value={draft.plan} onChange={(event) => setDraft((value) => ({ ...value, plan: event.target.value }))} /></label>
            <div className="grid grid-cols-2 gap-3"><label className="block text-[12px] font-semibold text-[#6B7684]">월 금액<input className="mt-1.5 w-full rounded-xl border border-[#E5E8EB] bg-white px-3.5 py-2.5 text-[14px] text-[#191F28] outline-none transition-colors focus:border-[#191F28]" type="number" min="0" value={draft.amount} onChange={(event) => setDraft((value) => ({ ...value, amount: event.target.value }))} /></label><label className="block text-[12px] font-semibold text-[#6B7684]">결제일<input className="mt-1.5 w-full rounded-xl border border-[#E5E8EB] bg-white px-3.5 py-2.5 text-[14px] text-[#191F28] outline-none transition-colors focus:border-[#191F28]" type="number" min="1" max="31" value={draft.dueDay} onChange={(event) => setDraft((value) => ({ ...value, dueDay: event.target.value }))} /></label></div>
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7684]">
                결제 수단
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
                    <PaymentIcon method={draft.paymentMethod} size={16} />
                  </span>
                  <input className="w-full rounded-xl border border-[#E5E8EB] bg-white pl-9 pr-3.5 py-2.5 text-[14px] text-[#191F28] outline-none transition-colors focus:border-[#191F28]" value={draft.paymentMethod} onChange={(event) => setDraft((value) => ({ ...value, paymentMethod: event.target.value }))} placeholder="예: 카카오페이, 신한카드 • 4412" />
                </div>
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PAYMENT_PRESETS.map((preset) => (
                  <button key={preset} type="button" onClick={() => setDraft((v) => ({ ...v, paymentMethod: preset }))} className="inline-flex items-center gap-1 rounded-lg border border-[#E5E8EB] bg-white px-2 py-1 text-[11px] font-medium text-[#4E5968] hover:border-[#191F28] hover:text-[#191F28] active:scale-95 transition-all">
                    <PaymentIcon method={preset} size={12} />
                    <span>{preset}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5"><Button variant="secondary" size="default" onClick={() => setEditing(false)}>취소</Button><Button size="default" onClick={save}>저장</Button></div>
        </section>
      )}

      <section className="mt-5 rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <h2 className="text-[15px] font-bold text-[#191F28]">사전 알림 설정</h2>
        <p className="mt-1 text-[12px] leading-5 text-[#6B7684]">원치 않는 자동 결제 전에 알려드려요.</p>
        <div className="mt-4 divide-y divide-[#F2F4F6]">
          <div className="flex items-center justify-between py-3">
            <span>
              <strong className="block text-[14px] font-bold text-[#191F28]">결제 3일 전</strong>
              <span className="text-[12px] font-medium text-[#8B95A1]">D-3 알림</span>
            </span>
            <ToggleSwitch checked={Boolean(subscription.alertD3)} onChange={(checked) => onUpdate(subscription.subscriptionId, { alertD3: checked })} label="결제 3일 전 알림" />
          </div>
          <div className="flex items-center justify-between py-3">
            <span>
              <strong className="block text-[14px] font-bold text-[#191F28]">결제 하루 전</strong>
              <span className="text-[12px] font-medium text-[#8B95A1]">D-1 알림</span>
            </span>
            <ToggleSwitch checked={Boolean(subscription.alertD1)} onChange={(checked) => onUpdate(subscription.subscriptionId, { alertD1: checked })} label="결제 하루 전 알림" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[#F2F4F6] flex items-center justify-between">
          <span className="text-[12px] font-medium text-[#8B95A1]">알림 동작 미리보기</span>
          <Button
            size="compact"
            variant="secondary"
            prefixIcon={<Send size={13} />}
            onClick={() => onTriggerNotification?.(subscription)}
          >
            이 구독 알림 테스트
          </Button>
        </div>
      </section>

      {promotion && (
        <section className="mt-5 rounded-2xl border border-[#FFE8CC] bg-[#FFF9F2] p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#FF6F0F]">절약 기회</p>
          <h2 className="mt-1 text-[16px] font-bold text-[#191F28]">{promotion.title}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[#6B7684]">이 구독을 해지한 뒤 혜택을 받을 수 있어요.</p>
        </section>
      )}

      <div className="mt-8 space-y-3">
        <Button size="large" fullWidth className={highlightCancel ? "cancel-highlight" : ""} onClick={() => onStartCancel(subscription.subscriptionId, promotion)}>웹사이트에서 다이렉트 해지하기</Button>
        <Button size="large" fullWidth variant="secondary" onClick={() => setEditing((value) => !value)}>{editing ? "수정 닫기" : "구독 정보 수정"}</Button>
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#71717A]">Billing calendar</p>
          <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-[#191F28]">{formatKoreanMonth(date)}</h1>
        </div>
        <div className="flex gap-1">
          <IconButton variant="weak" size="medium" onClick={prevMonth} aria-label="이전 달"><ChevronLeft size={16} /></IconButton>
          <IconButton variant="weak" size="medium" onClick={nextMonth} aria-label="다음 달"><ChevronRight size={16} /></IconButton>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#E5E8EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="grid grid-cols-7 text-center text-[12px] font-bold text-[#8B95A1]">
          <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-y-2 text-center text-[13px]">
          {days.map((item, i) => {
            if (!item) return <div key={`empty-${i}`} className="h-10" />;
            const isSelected = item === clampedDay;
            const subsOnDay = duesByDay.get(item) || [];
            const hasDue = subsOnDay.length > 0;
            return (
              <button
                key={`day-${item}`}
                type="button"
                onClick={() => setSelectedDay(item)}
                className={`relative mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-xl font-semibold transition-all active:scale-95 ${
                  isSelected ? "bg-[#191F28] text-white shadow-sm" : "text-[#191F28] hover:bg-[#F2F4F6]"
                }`}
              >
                <span>{item}</span>
                {hasDue && !isSelected && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#FF6F0F]" />
                )}
                {hasDue && isSelected && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#191F28]">{month + 1}월 {clampedDay}일 결제 예정 ({selectedDues.length}건)</h2>
          {selectedDues.length > 0 && <span className="text-[15px] font-extrabold text-[#191F28]">{formatWon(selectedTotal)}</span>}
        </div>

        {selectedDues.length > 0 ? (
          <div className="mt-3 space-y-2">
            {selectedDues.map((sub) => (
              <button
                key={sub.subscriptionId || sub.id}
                type="button"
                onClick={() => onOpen(sub.subscriptionId || sub.id)}
                className="card-press flex w-full items-center justify-between rounded-2xl border border-[#E5E8EB] bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:border-[#D1D6DB] active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <ServiceMark monogram={sub.monogram || sub.name?.slice(0, 1)} className="h-10 w-10 rounded-xl text-[13px]" />
                  <div>
                    <strong className="block text-[14px] font-bold text-[#191F28]">{sub.name}</strong>
                    <span className="text-[12px] font-medium text-[#6B7684]">{sub.plan}</span>
                  </div>
                </div>
                <span className="text-[14px] font-bold text-[#191F28]">{formatWon(sub.amount)}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] p-6 text-center text-[13px] text-[#6B7684]">
            해당 일자에는 예정된 결제 일정이 없습니다.
          </div>
        )}
      </section>
    </main>
  );
}
