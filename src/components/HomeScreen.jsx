import { useMemo, useState } from "react";
import { BellRing, ChevronRight, Inbox, Plus, Sparkles } from "lucide-react";
import { Button, SubscriptionCard } from "./ui";
import { daysUntilCharge, formatWon } from "../lib/dates";

function SummaryCard({ subscriptions }) {
  const [annual, setAnnual] = useState(false);
  const monthly = subscriptions.reduce((sum, subscription) => {
    const amount = Number(subscription.amount || 0);
    return sum + (subscription.billingCycle === "매년" ? Math.round(amount / 12) : amount);
  }, 0);
  const displayAmount = annual ? monthly * 12 : monthly;

  return (
    <button
      type="button"
      onClick={() => setAnnual((value) => !value)}
      className="re-summary card-press w-full rounded-[28px] p-5 text-left"
      aria-label="월간 및 연간 예상 결제액 전환"
    >
      <span className="block text-[12px] font-semibold text-[#66756f]">
        {annual ? "연간 예상 구독액" : "이번 달 예상 구독액"}
      </span>
      <strong className="mt-2 block text-[30px] font-bold tracking-[-0.04em] text-[#252b29]">
        {formatWon(displayAmount)}
      </strong>
      <span className="mt-2 block text-[12px] text-[#83918b]">
        탭하면 {annual ? "월간" : "연간"} 기준으로 볼 수 있어요
      </span>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/60 pt-4">
        <div>
          <span className="block text-[11px] text-[#83918b]">관리 중</span>
          <strong className="mt-1 block text-[16px] text-[#37413d]">{subscriptions.length}개</strong>
        </div>
        <div>
          <span className="block text-[11px] text-[#83918b]">연간 환산</span>
          <strong className="mt-1 block text-[16px] text-[#37413d]">{formatWon(monthly * 12)}</strong>
        </div>
      </div>
    </button>
  );
}

function EmptyState({ onAdd }) {
  return (
    <main className="re-page min-h-[calc(100vh-5rem)] px-5 pb-28 pt-8">
      <div className="re-orb mx-auto mt-10 grid h-24 w-24 place-items-center rounded-full">
        <Inbox size={30} strokeWidth={1.5} />
      </div>
      <section className="mx-auto mt-8 max-w-[310px] text-center">
        <p className="text-[12px] font-semibold tracking-[0.12em] text-[#8b829d]">RE. CARE</p>
        <h1 className="re-serif mt-3 text-[27px] font-semibold leading-[1.25] text-[#303633]">
          아직 확인된 구독이 없어요
        </h1>
        <p className="mt-4 text-[14px] leading-6 text-[#7d8983]">
          확인되는 구독이 생기면 필요한 순간에 먼저 알려드릴게요.
        </p>
      </section>

      <section className="re-soft-card mt-10 rounded-[24px] p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/70 text-[#756d88]">
            <Sparkles size={17} />
          </span>
          <div>
            <strong className="block text-[14px] text-[#37413d]">직접 등록할 수도 있어요</strong>
            <p className="mt-1 text-[12px] leading-5 text-[#7d8983]">
              RE.가 찾지 못한 구독만 간단히 추가해주세요.
            </p>
          </div>
        </div>
        <Button className="mt-5 w-full" onClick={onAdd}>
          <Plus size={17} />
          구독 직접 등록하기
        </Button>
      </section>
    </main>
  );
}

export function HomeScreen({
  subscriptions,
  promotions,
  profile,
  notificationDenied,
  onOpenSubscription,
  onShowAll,
  onOpenPromotion,
  onExplorePromotions,
  onAdd,
  onToggleNotificationPermission,
}) {
  const upcoming = useMemo(
    () => [...subscriptions].sort((a, b) => daysUntilCharge(a) - daysUntilCharge(b)).slice(0, 3),
    [subscriptions]
  );

  if (subscriptions.length === 0) return <EmptyState onAdd={onAdd} />;

  const next = upcoming[0];
  const nextDays = next ? daysUntilCharge(next) : null;
  const needsAttention = next && nextDays <= 3;

  return (
    <main className="re-page px-5 pb-28 pt-7">
      <p className="text-[12px] font-semibold tracking-[0.12em] text-[#8b829d]">RE. HOME</p>
      <h1 className="re-serif mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[#303633]">
        {profile?.nickname ? `${profile.nickname}님, ` : ""}제가 같이 챙길게요
      </h1>
      <p className="mt-2 text-[13px] leading-5 text-[#7d8983]">
        필요한 순간에만 먼저 알려드릴게요.
      </p>

      {notificationDenied && (
        <button
          type="button"
          onClick={onToggleNotificationPermission}
          className="re-soft-card mt-6 flex w-full items-center justify-between rounded-[22px] p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white/75 text-[#756d88]">
              <BellRing size={17} />
            </span>
            <div>
              <strong className="block text-[13px] text-[#37413d]">결제 전 알림이 꺼져 있어요</strong>
              <span className="mt-1 block text-[11px] text-[#7d8983]">필요한 순간 먼저 알려드릴 수 있게 켜주세요.</span>
            </div>
          </div>
          <ChevronRight size={17} className="text-[#9189a0]" />
        </button>
      )}

      <section className="mt-7">
        <p className="mb-3 text-[12px] font-semibold text-[#66756f]">지금 확인할 것</p>
        <button
          type="button"
          onClick={() => needsAttention && onOpenSubscription(next.subscriptionId)}
          className={`w-full rounded-[26px] p-5 text-left ${needsAttention ? "re-action-card card-press" : "re-calm-card"}`}
        >
          {needsAttention ? (
            <>
              <span className="text-[12px] font-semibold text-[#846d82]">결제까지 {nextDays <= 0 ? "오늘" : `${nextDays}일`}</span>
              <strong className="mt-2 block text-[19px] leading-7 text-[#303633]">
                {next.name}을 이번에도 계속 이용할까요?
              </strong>
              <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[#6f667d]">
                확인하기 <ChevronRight size={14} />
              </span>
            </>
          ) : (
            <>
              <span className="text-[12px] font-semibold text-[#71827b]">지금은 괜찮아요</span>
              <strong className="mt-2 block text-[19px] text-[#303633]">급하게 확인할 항목이 없어요.</strong>
              <span className="mt-2 block text-[12px] text-[#7d8983]">필요해지면 RE.가 먼저 말씀드릴게요.</span>
            </>
          )}
        </button>
      </section>

      <div className="mt-5">
        <SummaryCard subscriptions={subscriptions} />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.1em] text-[#8b829d]">UPCOMING</p>
            <h2 className="mt-1 text-[17px] font-bold text-[#37413d]">다가오는 결제</h2>
          </div>
          {subscriptions.length > 3 && (
            <button type="button" onClick={onShowAll} className="flex items-center gap-0.5 text-[12px] font-medium text-[#7d8983]">
              전체보기 <ChevronRight size={14} />
            </button>
          )}
        </div>
        <div className="space-y-3">
          {upcoming.map((subscription) => (
            <SubscriptionCard
              key={subscription.subscriptionId}
              subscription={subscription}
              onOpen={() => onOpenSubscription(subscription.subscriptionId)}
            />
          ))}
        </div>
      </section>

      {promotions?.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-[#37413d]">받을 수 있는 혜택</h2>
            <button type="button" onClick={onExplorePromotions} className="text-[12px] text-[#7d8983]">전체보기</button>
          </div>
          <button
            type="button"
            onClick={() => onOpenPromotion(promotions[0])}
            className="re-soft-card card-press w-full rounded-[22px] p-4 text-left"
          >
            <span className="text-[12px] font-semibold text-[#846d82]">혜택은 필요할 때만</span>
            <strong className="mt-2 block text-[15px] text-[#37413d]">{promotions[0].title}</strong>
            <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#7d8983]">{promotions[0].description}</p>
          </button>
        </section>
      )}
    </main>
  );
}