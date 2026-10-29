import { useMemo, useState } from "react";
import { FilterX, RefreshCw, Search, SlidersHorizontal, PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, IconButton, SectionBand, SubscriptionCard } from "./ui";
import { CancelHistorySection } from "./CancelHistorySection";
import { formatWonText } from "../lib/dates";
import { calculateMonthlyTotal } from "../lib/subscriptionAgent";
import { toMonthlySavedAmount } from "../lib/subscriptionMath";
import { compareSubscriptions } from "../lib/subscriptionSort";
import { SelectSheet, SelectTrigger } from "./SelectSheet";

const SORT_OPTIONS = [
  { value: "due", label: "결제일 임박순" },
  { value: "amount", label: "금액 높은순" },
  { value: "recent", label: "최근 등록순" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "모든 상태" },
  { value: "active", label: "활성 구독" },
  { value: "trial", label: "무료 체험" },
];

const labelOf = (options, value) => options.find((option) => option.value === value)?.label || options[0].label;

export function SubscriptionListScreen({
  subscriptions,
  cancelHistory = [],
  savedAmount = 0,
  onOpen,
  onAdd,
  onStartCancel,
  onMute,
  onRefresh,
  onTogglePin,
  onAnswerCancel,
  onToast,
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("due");
  const [openPicker, setOpenPicker] = useState(null);

  const filtered = useMemo(() => {
    if (status === "cancelled") return [];
    const normalized = query.trim().toLowerCase();
    return subscriptions
      .filter((subscription) => status === "all" || (status === "trial" ? subscription.status === "trial" : subscription.status === "active"))
      .filter((subscription) => !normalized || `${subscription.name} ${subscription.plan}`.toLowerCase().includes(normalized))
      .sort((a, b) => compareSubscriptions(a, b, sort));
  }, [query, sort, status, subscriptions]);

  const total = calculateMonthlyTotal(filtered);
  const reset = () => { setQuery(""); setStatus("all"); setSort("due"); };

  return (
    <main className="relative min-h-[calc(100dvh-4rem)] min-h-[calc(100vh-4rem)] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-3">
      <div className="flex items-center gap-2 px-5">
        <label className="relative flex-1">
          <span className="sr-only">구독 검색</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-tertiary" size={18} />
          <input className="min-h-[44px] w-full rounded-xl bg-gray-100 py-2.5 pl-10 pr-3 text-[15px] text-ink outline-none placeholder:text-ink-subtle transition-colors focus:ring-1 focus:ring-inset focus:ring-gray-300" placeholder="서비스 또는 요금제 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <IconButton variant="ghost" size="large" onClick={onRefresh} aria-label="목록 새로고침"><RefreshCw size={18} className="text-ink-muted" /></IconButton>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto px-5 py-1.5 no-scrollbar">
        <SelectTrigger
          variant="chip"
          label="정렬 기준"
          valueLabel={labelOf(SORT_OPTIONS, sort)}
          icon={<SlidersHorizontal size={14} className="shrink-0 text-ink-tertiary" />}
          onClick={() => setOpenPicker("sort")}
        />
        <SelectTrigger
          variant="chip"
          label="구독 상태"
          valueLabel={status === "cancelled" ? "해지한 구독" : labelOf(STATUS_OPTIONS, status)}
          onClick={() => setOpenPicker("status")}
        />
      </div>

      {openPicker === "sort" && (
        <SelectSheet title="정렬 기준" options={SORT_OPTIONS} value={sort} onSelect={setSort} onClose={() => setOpenPicker(null)} />
      )}
      {openPicker === "status" && (
        <SelectSheet title="구독 상태" options={STATUS_OPTIONS} value={status} onSelect={setStatus} onClose={() => setOpenPicker(null)} />
      )}

      {status !== "cancelled" && cancelHistory.length > 0 && (
        <button
          type="button"
          onClick={() => setStatus("cancelled")}
          className="mt-1 flex min-h-[48px] w-full items-center justify-between gap-3 px-5 py-2 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
        >
          <span className="shrink-0 text-[14px] font-medium text-ink-secondary">해지한 구독 {cancelHistory.length}개</span>
          <span className="ml-auto flex min-w-0 items-center gap-0.5 text-right text-[14px] text-ink-tertiary">
            월 {formatWonText(savedAmount > 0 ? savedAmount : cancelHistory.reduce((s, r) => s + toMonthlySavedAmount(r), 0))} 절약
            <ChevronRight size={16} className="shrink-0 text-ink-subtle" />
          </span>
        </button>
      )}

      {status === "cancelled" ? (
        <div className="px-5">
          <button
            type="button"
            onClick={() => setStatus("all")}
            className="mt-2 -ml-1 flex min-h-[44px] items-center gap-0.5 pr-2 text-[16px] font-semibold text-ink"
          >
            <ChevronLeft size={20} className="text-ink-muted" />
            해지한 구독
          </button>
          <CancelHistorySection
            cancelHistory={cancelHistory}
            savedAmount={savedAmount}
            onAnswerCancel={onAnswerCancel}
            onToast={onToast}
          />
        </div>
      ) : (
        <>
          <SectionBand className="mt-3" />
          <div className="flex items-baseline justify-between px-5 pb-1 pt-5">
            <h2 className="text-[18px] font-bold leading-[26px] tracking-[-0.025em] text-ink">
              구독 <span className="text-ink-tertiary font-semibold">{filtered.length}개</span>
            </h2>
            <span className="text-[14px] tabular-nums text-ink-tertiary">월 <strong className="font-semibold text-ink">{formatWonText(total)}</strong></span>
          </div>

          {subscriptions.length === 0 ? (
        <section className="mt-14 flex flex-col items-center px-8 text-center">
          <PlusCircle size={32} strokeWidth={1.6} className="text-ink-subtle" />
          <h2 className="mt-4 text-[17px] font-semibold text-ink">등록된 구독이 없어요</h2>
          <p className="mt-1.5 text-[14px] text-ink-tertiary leading-relaxed">
            매달 나가는 고정 지출을 등록하고<br />결제일 전 알림과 통계를 확인해 보세요.
          </p>
          <Button variant="primary" size="default" className="mt-6 w-full max-w-[220px]" onClick={onAdd}>
            첫 구독 추가하기
          </Button>
        </section>
      ) : filtered.length > 0 ? (
        <div className="mt-1">
          {filtered.map((subscription) => (
            <SubscriptionCard
              key={subscription.subscriptionId || subscription.id}
              subscription={subscription}
              variant="card"
              detail
              onOpen={() => onOpen(subscription.subscriptionId || subscription.id)}
              onCancel={() => onStartCancel(subscription.subscriptionId || subscription.id)}
              onMute={() => onMute(subscription.subscriptionId || subscription.id)}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      ) : (
        <section className="mt-14 flex flex-col items-center px-8 text-center">
          <FilterX size={28} strokeWidth={1.6} className="text-ink-subtle" />
          <h2 className="mt-4 text-[17px] font-semibold text-ink">조건에 맞는 구독이 없어요</h2>
          <p className="mt-1.5 text-[14px] text-ink-tertiary">필터를 초기화하거나 다른 검색어를 입력해 보세요.</p>
          <Button variant="secondary" size="compact" className="mt-5" onClick={reset}>필터 초기화</Button>
        </section>
          )}
        </>
      )}
    </main>
  );
}
