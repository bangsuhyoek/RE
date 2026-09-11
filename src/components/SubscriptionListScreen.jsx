import { useMemo, useState } from "react";
import { FilterX, RefreshCw, Search, SlidersHorizontal, PlusCircle } from "lucide-react";
import { Button, IconButton, SubscriptionCard } from "./ui";
import { daysUntilCharge, formatWon } from "../lib/dates";

export function SubscriptionListScreen({ subscriptions, onOpen, onAdd, onStartCancel, onMute, onRefresh, onTogglePin }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("due");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return subscriptions
      .filter((subscription) => status === "all" || (status === "trial" ? subscription.status === "trial" : subscription.status === "active"))
      .filter((subscription) => !normalized || `${subscription.name} ${subscription.plan}`.toLowerCase().includes(normalized))
      .sort((a, b) => {
        if (sort === "amount") return b.amount - a.amount;
        if (sort === "recent") return new Date(b.createdAt) - new Date(a.createdAt);
        return daysUntilCharge(a) - daysUntilCharge(b);
      });
  }, [query, sort, status, subscriptions]);

  const total = filtered.reduce((sum, subscription) => sum + subscription.amount, 0);
  const reset = () => { setQuery(""); setStatus("all"); setSort("due"); };

  return (
    <main className="relative min-h-[calc(100dvh-4rem)] min-h-[calc(100vh-4rem)] px-4 sm:px-5 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-5">
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <span className="sr-only">구독 검색</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B95A1]" size={18} />
          <input className="w-full rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] py-3 pl-10 pr-3 text-[14px] text-[#191F28] outline-none placeholder:text-[#8B95A1] transition-colors focus:border-[#191F28] focus:bg-white" placeholder="서비스 또는 요금제 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <IconButton variant="weak" size="large" onClick={onRefresh} aria-label="목록 새로고침"><RefreshCw size={18} className="text-[#4E5968]" /></IconButton>
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

      {subscriptions.length === 0 ? (
        <section className="mt-16 flex flex-col items-center text-center px-4">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[#F2F4F6] text-[#191F28] border border-[#E5E8EB]">
            <PlusCircle size={32} className="text-[#3182F6]" />
          </div>
          <h2 className="mt-5 text-[18px] font-bold text-[#191F28]">등록된 구독이 없어요</h2>
          <p className="mt-1.5 text-[13px] text-[#6B7684] leading-relaxed">
            매달 나가는 고정 지출을 등록하고<br />결제일 전 알림과 통계를 확인해 보세요.
          </p>
          <Button variant="primary" size="default" className="mt-6 w-full max-w-[200px]" onClick={onAdd}>
            첫 구독 추가하기
          </Button>
        </section>
      ) : filtered.length > 0 ? (
        <div className="mt-3 divide-y divide-gray-100/80 border-t border-b border-gray-100/80">
          {filtered.map((subscription) => (
            <SubscriptionCard
              key={subscription.subscriptionId || subscription.id}
              subscription={subscription}
              variant="grouped"
              detail
              onOpen={() => onOpen(subscription.subscriptionId || subscription.id)}
              onCancel={() => onStartCancel(subscription.subscriptionId || subscription.id)}
              onMute={() => onMute(subscription.subscriptionId || subscription.id)}
              onTogglePin={onTogglePin}
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
