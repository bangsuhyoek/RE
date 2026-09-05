import { useMemo } from "react";
import { Bell, ChevronRight, Leaf, Plus, RotateCcw } from "lucide-react";
import { Button, ServiceMark } from "./ui";
import { daysUntilCharge, formatBillingDate, formatWon } from "../lib/dates";
import { RECharacter } from "./REBrand";

function EmptyHome({ onAdd }) {
  return (
    <main className="re-home px-6 pb-28 pt-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-extrabold leading-[1.35] text-[#1B2A8C]">안녕하세요,<br /><span className="inline-flex items-center gap-2">좋은 하루예요. <Leaf size={19} className="text-[#6FB48A]" /></span></h1>
          <p className="mt-4 text-[14px] leading-6 text-[#9099CA]">오늘도 가벼운 선택이<br />더 좋은 내일을 만들어요.</p>
        </div>
        <RECharacter state="idle" className="h-[112px] w-auto object-contain" />
      </div>

      <section className="re-dashboard-card mt-7 rounded-[22px] p-5 text-center">
        <p className="text-[13px] text-[#9099CA]">관리 중인 구독</p>
        <strong className="mt-2 block text-[30px] text-[#1B2A8C]">0개</strong>
        <p className="mt-4 text-[13px] leading-6 text-[#7E8AC0]">아직 확인된 구독이 없어요.<br />확인되는 순간 RE.가 같이 챙길게요.</p>
        <Button className="mt-5 w-full" onClick={onAdd}><Plus size={17} /> 구독 직접 등록하기</Button>
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
  onReviewSubscription,
  onShowAll,
  onOpenPromotion,
  onExplorePromotions,
  onAdd,
  onToggleNotificationPermission,
  onResumeCancel,
}) {
  const sorted = useMemo(
    () => [...subscriptions].sort((a, b) => daysUntilCharge(a) - daysUntilCharge(b)),
    [subscriptions]
  );
  const upcoming = sorted.filter((item) => item.status !== "cancel_pending").slice(0, 3);
  const monthly = subscriptions.reduce((sum, subscription) => {
    if (subscription.status === "cancel_pending") return sum;
    const amount = Number(subscription.amount || 0);
    return sum + (subscription.billingCycle === "매년" ? Math.round(amount / 12) : amount);
  }, 0);
  const cancelInProgress = subscriptions.find((subscription) => subscription.status === "cancel_in_progress");
  const urgent = sorted.find((subscription) =>
    subscription.status !== "cancel_pending" && subscription.status !== "cancel_in_progress" && daysUntilCharge(subscription) <= 3
  );
  const needsReview = subscriptions.filter((subscription) =>
    subscription.status === "cancel_in_progress" ||
    (subscription.status !== "cancel_pending" && daysUntilCharge(subscription) <= 3)
  ).length;
  const eligiblePromotions = (promotions || []).filter((promotion) =>
    promotion.sourceServiceIds?.some((id) => subscriptions.some((subscription) => subscription.id === id))
  );

  if (!subscriptions.length) return <EmptyHome onAdd={onAdd} />;

  return (
    <main className="re-home px-6 pb-28 pt-7">
      <header className="flex items-center justify-end gap-2">
        <button type="button" onClick={onToggleNotificationPermission} className="re-icon-button" aria-label="알림 설정"><Bell size={19} /></button>
        <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-white shadow-sm"><img src="/re-assets/char_stand.jpg" alt="" className="h-full w-full object-cover object-top" /></div>
      </header>

      <section className="mt-4">
        <h1 className="text-[24px] font-extrabold leading-[1.35] text-[#1B2A8C]">{profile?.nickname ? `${profile.nickname}님,` : "안녕하세요,"}<br /><span className="inline-flex items-center gap-2">좋은 하루예요. <Leaf size={19} className="text-[#6FB48A]" /></span></h1>
        <p className="mt-4 text-[14px] leading-6 text-[#9099CA]">오늘도 가벼운 선택이<br />더 좋은 내일을 만들어요.</p>
      </section>

      {notificationDenied && (
        <button type="button" onClick={onToggleNotificationPermission} className="re-notice mt-5 w-full rounded-2xl p-4 text-left">
          <strong className="text-[13px] text-[#3746A5]">결제 전 알림이 꺼져 있어요</strong>
          <p className="mt-1 text-[12px] text-[#7E8AC0]">필요한 순간 먼저 알려드릴 수 있게 켜주세요.</p>
        </button>
      )}

      <section className="mt-6">
        <p className="re-eyebrow">NOW</p>
        <h2 className="mt-1 text-[16px] font-extrabold text-[#1B2A8C]">지금 확인할 것</h2>
        {cancelInProgress ? (
          <button type="button" onClick={() => onResumeCancel(cancelInProgress.subscriptionId)} className="re-action-card mt-3 w-full rounded-[20px] p-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-bold text-[#3746A5]"><RotateCcw size={12} /> 해지 이어하기</span>
                <strong className="mt-3 block text-[17px] leading-6 text-[#1B2A8C]">{cancelInProgress.name} 해지를<br />이어서 마무리할까요?</strong>
              </div>
              <RECharacter state="guide" className="h-[88px] w-auto object-contain" />
            </div>
          </button>
        ) : urgent ? (
          <button type="button" onClick={() => onReviewSubscription(urgent.subscriptionId)} className="re-action-card mt-3 w-full rounded-[20px] p-4 text-left">
            <span className="text-[11px] font-bold text-[#6D5D91]">결제까지 {daysUntilCharge(urgent) <= 0 ? "오늘" : `${daysUntilCharge(urgent)}일`}</span>
            <strong className="mt-2 block text-[17px] leading-6 text-[#1B2A8C]">{urgent.name}을 이번에도<br />계속 이용할까요?</strong>
            <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[#475FAC]">확인하기 <ChevronRight size={14} /></span>
          </button>
        ) : (
          <div className="re-calm-card mt-3 rounded-[20px] p-4">
            <strong className="text-[14px] text-[#3746A5]">지금은 괜찮아요.</strong>
            <p className="mt-1 text-[12px] leading-5 text-[#7E8AC0]">급하게 확인할 항목이 없어요. 필요한 순간에만 먼저 알려드릴게요.</p>
          </div>
        )}
      </section>

      <section className="re-dashboard-card mt-6 rounded-[22px] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-[#9099CA]">관리 중인 구독</p>
            <strong className="mt-1 block text-[30px] text-[#1B2A8C]">{subscriptions.length}개</strong>
          </div>
          <button type="button" onClick={onShowAll} className="grid h-10 w-10 place-items-center rounded-full bg-[#E3E6F7] text-[#3746A5]" aria-label="구독 전체보기"><ChevronRight size={18} /></button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[14px] bg-[#E7F7F6] p-3"><strong className="text-[17px] text-[#3746A5]">{formatWon(monthly)}</strong><span className="mt-1 block text-[11px] text-[#7E8AC0]">이번 달 결제 예상</span></div>
          <div className="rounded-[14px] bg-[#FCEBE5] p-3"><strong className="text-[17px] text-[#3746A5]">{needsReview}개</strong><span className="mt-1 block text-[11px] text-[#7E8AC0]">검토가 필요해요.</span></div>
        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-center justify-between"><h2 className="text-[17px] font-extrabold text-[#1B2A8C]">최근 활동</h2><button type="button" onClick={onShowAll} className="text-[12px] text-[#7E8AC0]">모두 보기</button></div>
        <div className="re-dashboard-card mt-3 divide-y divide-[#E4EAF6] rounded-[22px] px-4">
          {upcoming.map((subscription) => (
            <button key={subscription.subscriptionId} type="button" onClick={() => onOpenSubscription(subscription.subscriptionId)} className="flex w-full items-center gap-3 py-4 text-left">
              <ServiceMark monogram={subscription.monogram || subscription.name?.[0]} />
              <span className="min-w-0 flex-1"><strong className="block truncate text-[14px] text-[#1B2A8C]">{subscription.name}</strong><span className="mt-1 block text-[11px] text-[#9099CA]">{formatBillingDate(subscription)}</span></span>
              <strong className="text-[13px] text-[#3746A5]">{formatWon(subscription.amount)}</strong>
            </button>
          ))}
        </div>
      </section>

      {eligiblePromotions.length > 0 && (
        <section className="mt-7">
          <div className="flex items-center justify-between"><h2 className="text-[17px] font-extrabold text-[#1B2A8C]">받을 수 있는 혜택</h2><button type="button" onClick={onExplorePromotions} className="text-[12px] text-[#7E8AC0]">전체보기</button></div>
          <button type="button" onClick={() => onOpenPromotion(eligiblePromotions[0])} className="re-dashboard-card mt-3 w-full rounded-[20px] p-4 text-left"><strong className="text-[14px] text-[#3746A5]">{eligiblePromotions[0].title}</strong><p className="mt-1 text-[12px] leading-5 text-[#9099CA]">{eligiblePromotions[0].description}</p></button>
        </section>
      )}
    </main>
  );
}
