import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton, ListRow, SectionBand, ServiceLogo } from "./ui";
import { formatKoreanMonth, formatWonText, getCalendarDays, getLastDate } from "../lib/dates";
import { buildDuesByDay } from "../lib/calendarDues";

export function CalendarScreen({ subscriptions, onOpen }) {
  const [date, setDate] = useState(() => new Date());
  const year = date.getFullYear();
  const month = date.getMonth();
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());

  const days = useMemo(() => getCalendarDays(year, month), [year, month]);
  const lastDay = getLastDate(year, month);
  const clampedDay = Math.min(selectedDay, lastDay);

  const duesByDay = useMemo(() => {
    return buildDuesByDay(subscriptions, month, lastDay);
  }, [lastDay, subscriptions, month]);

  const selectedDues = duesByDay.get(clampedDay) || [];
  const selectedTotal = selectedDues.reduce((sum, item) => sum + item.amount, 0);

  const monthTotal = useMemo(() => {
    let total = 0;
    for (const list of duesByDay.values()) {
      for (const item of list) {
        total += item.amount;
      }
    }
    return total;
  }, [duesByDay]);

  const now = new Date();
  const todayDay = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : null;

  const prevMonth = () => setDate(new Date(year, month - 1, 1));
  const nextMonth = () => setDate(new Date(year, month + 1, 1));

  return (
    <main className="pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-3">
      <div className="flex items-center justify-between px-5">
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold tracking-[-0.03em] text-ink">{formatKoreanMonth(year, month)}</h1>
          <p className="mt-0.5 text-[14px] tabular-nums text-ink-tertiary">
            {monthTotal > 0 ? <>이번 달 결제 <strong className="font-semibold text-ink-secondary">{formatWonText(monthTotal)}</strong></> : "이번 달 결제 예정이 없어요"}
          </p>
        </div>
        <div className="flex gap-1">
          <IconButton variant="ghost" size="large" onClick={prevMonth} aria-label="이전 달"><ChevronLeft size={20} /></IconButton>
          <IconButton variant="ghost" size="large" onClick={nextMonth} aria-label="다음 달"><ChevronRight size={20} /></IconButton>
        </div>
      </div>

      <div className="mt-3 px-3">
        <div className="grid grid-cols-7 text-center text-[12px] font-medium text-ink-tertiary">
          <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
        </div>
        <div className="mt-1 grid grid-cols-7 text-center">
          {days.map((item, i) => {
            if (!item) return <div key={`empty-${i}`} className="h-12" />;
            const isSelected = item === clampedDay;
            const isToday = item === todayDay;
            const subsOnDay = duesByDay.get(item) || [];
            const hasDue = subsOnDay.length > 0;

            let dayStyle = "text-ink";
            if (isSelected) dayStyle = "bg-ink text-white font-semibold";
            else if (isToday) dayStyle = "bg-gray-100 text-ink font-bold";
            else if (hasDue) dayStyle = "text-ink font-semibold";

            return (
              <button
                key={`day-${item}`}
                type="button"
                onClick={() => setSelectedDay(item)}
                aria-label={`${month + 1}월 ${item}일${isToday ? " 오늘" : ""}${hasDue ? ` 결제 ${subsOnDay.length}건` : ""}`}
                aria-pressed={isSelected}
                className="group flex h-12 w-full items-center justify-center"
              >
                <span className={`relative flex h-10 w-10 flex-col items-center justify-center rounded-full text-[15px] tabular-nums transition-colors ${isSelected ? "" : "group-hover:bg-gray-100"} ${dayStyle}`}>
                  <span>{item}</span>
                  {hasDue && (
                    <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? "bg-white" : "bg-ink-subtle"}`} aria-hidden="true" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <SectionBand className="mt-3" />

      <section>
        <div className="flex items-baseline justify-between px-5 pb-1 pt-5">
          <h2 className="text-[18px] font-bold leading-[26px] tracking-[-0.025em] text-ink">{month + 1}월 {clampedDay}일</h2>
          {selectedDues.length > 0 && (
            <span className="text-[14px] tabular-nums text-ink-tertiary">{selectedDues.length}건 · <strong className="font-semibold text-ink">{formatWonText(selectedTotal)}</strong></span>
          )}
        </div>

        {selectedDues.length > 0 ? (
          <div>
            {selectedDues.map((sub) => (
              <ListRow
                key={sub.subscriptionId || sub.id}
                onClick={() => onOpen(sub.subscriptionId || sub.id)}
                leading={
                  <ServiceLogo
                    serviceId={sub.serviceId || sub.id}
                    name={sub.name}
                    monogram={sub.monogram || sub.name?.slice(0, 1)}
                    image={sub.image || sub.attachments?.[0]}
                  />
                }
                title={sub.name}
                subtitle={sub.plan}
                trailingTitle={formatWonText(sub.amount)}
              />
            ))}
          </div>
        ) : (
          <p className="px-5 py-6 text-[14px] text-ink-tertiary">이날은 결제 예정이 없어요.</p>
        )}
      </section>
    </main>
  );
}
