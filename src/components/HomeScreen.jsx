import { useMemo, useState } from "react";
import { ArrowRight, BellRing, ChevronLeft, ChevronRight, Inbox, ReceiptText, ScanLine, Sparkles } from "lucide-react";
import { Button, SubscriptionCard } from "./ui";
import { daysUntilCharge, formatWon, monthlyEquivalentTotal } from "../lib/dates";
import { RiveCharacter } from "./RiveCharacter";

function SummaryCard({ subscriptions }) {
  const [annual, setAnnual] = useState(false);
  const monthly = monthlyEquivalentTotal(subscriptions);
  const displayAmount = annual ? monthly * 12 : monthly;
  return (
    <button type="button" onClick={() => setAnnual((value) => !value)} className="card-press re-summary-card w-full rounded-[24px] bg-[#18181B] p-5 text-left text-white" aria-label="월간 및 연간 예상 구독액 전환">
      <span className="block text-[13px] font-medium text-white/65">{annual ? "연간 환산 구독액" : "월 예상 구독액"}</span>
      <span className="mt-2 block text-[28px] font-bold tracking-tight text-white">{formatWon(displayAmount)}</span>
      <span className="mt-1 flex items-center gap-1 text-[12px] text-[#A1A1AA]">탭하면 {annual ? "월간" : "연간"} 기준으로 전환</span>
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#27272A] pt-3.5">
        <span><span className="block text-[11px] text-[#A1A1AA]">관리 중인 구독</span><strong className="mt-1 block text-[16px] font-semibold text-white">{subscriptions.length}개</strong></span>
        <span><span className="block text-[11px] text-[#A1A1AA]">연간 환산</span><strong className="mt-1 block text-[16px] font-semibold text-white">{formatWon(monthly * 12)}</strong></span>
      </div>
    </button>
  );
}

function PromotionCarousel({ promotions, onOpen, onExplore }) {
  const [index, setIndex] = useState(0);
  const items = promotions.slice(0, 4);
  if (!items.length) return null;
  const promo = items[index];
  const next = () => setIndex((value) => (value + 1) % items.length);
  const previous = () => setIndex((value) => (value + items.length - 1) % items.length);
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between">
        <div><p className="re-eyebrow">BENEFITS</p><h2 className="mt-1 text-[18px] font-semibold tracking-[-0.01em] text-[#1B2A8C]">받을 수 있는 혜택</h2></div>
        <button type="button" onClick={onExplore} className="flex items-center gap-0.5 text-[13px] font-medium text-[#71717A] hover:text-black">전체보기 <ChevronRight size={15} /></button>
      </div>
      <article className="re-surface-card overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white">
        <div className="p-5">
          <h3 className="text-[18px] font-semibold tracking-[-0.02em]">{promo.title}</h3>
          <p className="mt-2 min-h-10 text-[13px] leading-5 text-[#71717A]">{promo.description}</p>
          <div className="mt-4 flex items-end justify-between"><span><span className="block text-[11px] text-[#71717A]">예상 절약</span><strong className="mt-0.5 block text-[17px]">{formatWon(promo.saving)}</strong></span><Button size="compact" onClick={() => onOpen(promo)}>혜택 보기 <ArrowRight size={15} /></Button></div>
        </div>
        <div className="flex items-center justify-between border-t border-[#E4E4E7] bg-white px-4 py-3"><div className="flex gap-1.5">{items.map((item, dotIndex) => <span key={item.id} className={`h-1.5 rounded-full transition-all ${dotIndex === index ? "w-5 bg-black" : "w-1.5 bg-[#E4E4E7]"}`} />)}</div><div className="flex gap-1"><button type="button" onClick={previous} className="grid h-7 w-7 place-items-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5]" aria-label="이전 추천"><ChevronLeft size={16} /></button><button type="button" onClick={next} className="grid h-7 w-7 place-items-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5]" aria-label="다음 추천"><ChevronRight size={16} /></button></div></div>
      </article>
    </section>
  );
}

function EmptyState({ onAdd }) {
  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col items-center justify-center px-5 text-center">
      <div className="relative h-[150px] w-[180px]"><RiveCharacter state="idle" className="h-full w-full" /></div>
      <span className="mt-2 grid h-14 w-14 place-items-center rounded-[22px] bg-white/85 text-black shadow-sm"><Inbox size={25} strokeWidth={1.5} /></span>
      <h1 className="mt-5 text-[22px] font-bold tracking-[-0.02em] text-[#1B2A8C]">등록된 구독이 없어요</h1>
      <p className="mt-3 max-w-[290px] text-[14px] leading-6 text-[#71717A]">실제 구독 정보를 추가하면 결제일과 알림을 함께 관리할 수 있어요.</p>
      <div className="mt-7 w-full space-y-3"><Button className="w-full" onClick={onAdd}><ReceiptText size={18} />구독 추가하기</Button><Button className="w-full" variant="secondary" onClick={onAdd}><ScanLine size={18} />영수증·결제 문자로 찾기</Button></div>
    </section>
  );
}

export function HomeScreen({ subscriptions, promotions, profile, notificationDenied, onOpenSubscription, onShowAll, onOpenPromotion, onExplorePromotions, onAdd, onToggleNotificationPermission }) {
  const upcoming = useMemo(() => [...subscriptions].sort((a, b) => daysUntilCharge(a) - daysUntilCharge(b)).slice(0, 3), [subscriptions]);

  if (subscriptions.length === 0) return <EmptyState onAdd={onAdd} />;

  return (
    <main className="re-home px-5 pb-28 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[13px] font-medium text-[#71717A]">{profile?.nickname ? `${profile.nickname}님,` : "안녕하세요,"} 이번 달</p><h1 className="mt-1 text-[24px] font-bold tracking-[-0.02em] text-[#1B2A8C]">고정지출을 확인하세요</h1></div>
        <RiveCharacter state="idle" className="h-[86px] w-[92px]" />
      </div>

      {notificationDenied ? (
        <button type="button" onClick={onToggleNotificationPermission} className="re-surface-card mt-5 flex w-full items-center justify-between rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 text-left">
          <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F4F4F5] text-black"><Sparkles size={16} /></span><div><strong className="block text-[13px]">결제 전 알림이 꺼져 있어요</strong><span className="mt-0.5 block text-[12px] text-[#71717A]">탭하여 알림 권한을 확인해 주세요.</span></div></div><span className="rounded-lg bg-black px-2.5 py-1 text-[11px] font-bold text-white">켜기</span>
        </button>
      ) : (
        <div className="re-surface-card mt-5 flex w-full items-center gap-2.5 rounded-xl border border-[#E4E4E7] bg-white px-4 py-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-black text-white"><BellRing size={14} /></span><div><strong className="block text-[12px] font-semibold text-black">사전 결제 알림</strong><span className="block text-[11px] text-[#71717A]">설정한 D-3, D-1 알림을 기준으로 안내해요.</span></div></div>
      )}

      <div className="mt-5"><SummaryCard subscriptions={subscriptions} /></div>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between"><div><p className="re-eyebrow">UPCOMING</p><h2 className="mt-1 text-[17px] font-bold tracking-[-0.01em] text-[#1B2A8C]">결제 임박 (최대 3개)</h2></div>{subscriptions.length > 3 && <button type="button" onClick={onShowAll} className="flex items-center gap-0.5 text-[12px] font-medium text-[#71717A] hover:text-black">전체보기 <ChevronRight size={15} /></button>}</div>
        <div className="space-y-3">{upcoming.map((subscription) => <SubscriptionCard key={subscription.subscriptionId} subscription={subscription} onOpen={() => onOpenSubscription(subscription.subscriptionId)} />)}</div>
      </section>

      <PromotionCarousel promotions={promotions} onOpen={onOpenPromotion} onExplore={onExplorePromotions} />
    </main>
  );
}
