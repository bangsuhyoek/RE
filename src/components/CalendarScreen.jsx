import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton, ServiceMark } from "./ui";
import { formatKoreanMonth, formatWon, getCalendarDays, getLastDate } from "../lib/dates";

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
      if (sub.billingCycle === "매년") {
        const chargeMonth = sub.nextBillingDate
          ? new Date(sub.nextBillingDate).getMonth()
          : sub.createdAt
          ? new Date(sub.createdAt).getMonth()
          : null;
        if (chargeMonth !== null && chargeMonth !== month) {
          continue;
        }
      }
      const day = Math.min(sub.dueDay, lastDay);
      const list = map.get(day) || [];
      list.push(sub);
      map.set(day, list);
    }
    return map;
  }, [lastDay, subscriptions, month]);

  const selectedDues = duesByDay.get(clampedDay) || [];
  const selectedTotal = selectedDues.reduce((sum, item) => sum + item.amount, 0);
  const maxDayAmount = useMemo(() => {
    let max = 0;
    for (const list of duesByDay.values()) {
      const daySum = list.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      if (daySum > max) max = daySum;
    }
    return max;
  }, [duesByDay]);

  const monthTotal = useMemo(() => {
    let total = 0;
    for (const list of duesByDay.values()) {
      for (const item of list) {
        total += item.amount;
      }
    }
    return total;
  }, [duesByDay]);

  const prevMonth = () => setDate(new Date(year, month - 1, 1));
  const nextMonth = () => setDate(new Date(year, month + 1, 1));

  return (
    <main className="px-4 sm:px-5 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-5 sm:pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight text-fg-primary">
            {formatKoreanMonth(year, month)}
            {monthTotal > 0 && (
              <span className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-[12px] font-bold text-fg-secondary">
                총 {formatWon(monthTotal)}
              </span>
            )}
          </h1>
        </div>
        <div className="flex gap-1">
          <IconButton variant="weak" size="medium" onClick={prevMonth} aria-label="이전 달"><ChevronLeft size={16} /></IconButton>
          <IconButton variant="weak" size="medium" onClick={nextMonth} aria-label="다음 달"><ChevronRight size={16} /></IconButton>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border-subtle bg-surface-default p-3 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="grid grid-cols-7 text-center text-[12px] font-bold text-fg-subtle">
          <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-y-2 text-center text-[13px]">
          {days.map((item, i) => {
            if (!item) return <div key={`empty-${i}`} className="h-8 sm:h-10" />;
            const isSelected = item === clampedDay;
            const subsOnDay = duesByDay.get(item) || [];
            const hasDue = subsOnDay.length > 0;
            const dayAmount = subsOnDay.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
            const isPeak = hasDue && maxDayAmount > 0 && dayAmount >= maxDayAmount * 0.6;
            const isMid = hasDue && !isPeak && maxDayAmount > 0 && dayAmount >= maxDayAmount * 0.25;

            let dayStyle = "text-fg-primary hover:bg-surface-subtle";
            if (isSelected) {
              dayStyle = "bg-surface-inverse text-fg-inverse shadow-sm";
            } else if (isPeak) {
              dayStyle = "bg-amber-100/90 text-amber-950 font-bold border border-amber-300 shadow-2xs";
            } else if (isMid) {
              dayStyle = "bg-emerald-50 text-emerald-950 font-semibold border border-emerald-200/70";
            } else if (hasDue) {
              dayStyle = "bg-surface-subtle text-fg-primary font-semibold";
            }

            return (
              <button
                key={`day-${item}`}
                type="button"
                onClick={() => setSelectedDay(item)}
                className={`relative mx-auto flex h-8 w-8 min-w-[32px] sm:h-10 sm:w-10 sm:min-w-[40px] flex-col items-center justify-center rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all active:scale-95 ${dayStyle}`}
              >
                <span>{item}</span>
                {hasDue && !isSelected && (
                  <span className={`absolute bottom-1 h-1 w-1 rounded-full ${
                    isPeak ? "bg-amber-600" : isMid ? "bg-emerald-600" : "bg-surface-brand"
                  }`} />
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
          <h2 className="text-[16px] font-bold text-fg-primary">{month + 1}월 {clampedDay}일 결제 예정 ({selectedDues.length}건)</h2>
          {selectedDues.length > 0 && <span className="text-[15px] font-extrabold text-fg-primary">{formatWon(selectedTotal)}</span>}
        </div>

        {selectedDues.length > 0 ? (
          <div className="mt-3 border-t border-border-subtle divide-y divide-border-subtle">
            {selectedDues.map((sub) => (
              <button
                key={sub.subscriptionId || sub.id}
                type="button"
                onClick={() => onOpen(sub.subscriptionId || sub.id)}
                className="flex w-full items-center justify-between gap-3.5 text-left transition-colors cursor-pointer bg-transparent hover:bg-surface-subtle active:bg-border-subtle/40 px-0.5 sm:px-1 py-3.5 rounded-none border-0 shadow-none"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <ServiceMark
                    serviceId={sub.id}
                    name={sub.name}
                    monogram={sub.monogram || sub.name?.slice(0, 1)}
                    image={sub.image || sub.attachments?.[0]}
                    category={sub.category}
                    className="h-12 w-12 rounded-xl text-[13px]"
                  />
                  <div className="min-w-0 flex-1">
                    <strong className="block text-[17px] font-semibold text-fg-primary tracking-tight truncate leading-tight">{sub.name}</strong>
                    <span className="mt-1 block text-[12px] font-medium text-fg-muted truncate">{sub.plan}</span>
                  </div>
                </div>
                <span className="text-[16px] font-bold tracking-tight text-fg-primary shrink-0 pl-2">{formatWon(sub.amount)}</span>
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
