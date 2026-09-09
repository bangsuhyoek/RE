import { useMemo, useState } from "react";
import { FilterX, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { Button, Chip, IconButton, SubscriptionCard, CATEGORY_PHILOSOPHY } from "./ui";
import { daysUntilCharge, formatWon } from "../lib/dates";

const categories = ["전체", "OTT", "음악", "쇼핑", "생산성", "도서", "클라우드", "게임", "기타"];

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
        {categories.map((item) => {
          const isSelected = category === item;
          const info = CATEGORY_PHILOSOPHY[item];
          const activeClass = isSelected ? (info?.chipActive || "bg-surface-inverse text-white") : "";
          return (
            <Chip
              key={item}
              selected={isSelected}
              className={activeClass}
              onClick={() => setCategory(item)}
            >
              {info && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSelected ? "bg-white/80" : info.dot}`} />}
              <span>{item}</span>
            </Chip>
          );
        })}
      </div>

      {category !== "전체" && CATEGORY_PHILOSOPHY[category] && (
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-border-subtle bg-surface-default p-3.5 shadow-2xs">
          <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${CATEGORY_PHILOSOPHY[category].dot}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-fg-primary">{CATEGORY_PHILOSOPHY[category].label}</span>
              <span className="text-[12px] font-semibold text-fg-brand">· {CATEGORY_PHILOSOPHY[category].theme}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-fg-muted leading-relaxed">
              {CATEGORY_PHILOSOPHY[category].desc}
            </p>
          </div>
        </div>
      )}

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
