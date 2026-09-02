import { useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Inbox, ReceiptText, ScanLine, Sparkles } from "lucide-react";
import { Button, SubscriptionCard } from "./ui";
import { daysUntilCharge, formatWon } from "../lib/dates";

function SummaryCard({ subscriptions }) {
  const [annual, setAnnual] = useState(false);
  const monthly = subscriptions.reduce((sum, subscription) => sum + subscription.amount, 0);
  const displayAmount = annual ? monthly * 12 : monthly;
  return (
    <button type="button" onClick={() => setAnnual((value) => !value)} className="card-press w-full rounded-[24px] bg-[#18181B] p-5 text-left text-white" aria-label="월간 및 연간 지출 전환">
      <span className="block text-[13px] font-medium text-white/65">{annual ? "연간 환산 지출액" : "이번 달 총 결제 예정"}</span>
      <span className="mt-2 block text-[28px] font-bold tracking-tight text-white">{formatWon(displayAmount)}</span>
      <span className="mt-1 flex items-center gap-1 text-[12px] text-[#A1A1AA]">탭하면 {annual ? "월간" : "연간"} 지출로 전환</span>
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#27272A] pt-3.5">
        <span>
          <span className="block text-[11px] text-[#71717A]">활성 구독</span>
          <strong className="mt-1 block text-[16px] font-semibold text-white">{subscriptions.length}개</strong>
        </span>
        <span>
          <span className="block text-[11px] text-[#71717A]">연간 환산</span>
          <strong className="mt-1 block text-[16px] font-semibold text-white">{formatWon(monthly * 12)}</strong>
        </span>
      </div>
    </button>
  );
}

function PromotionCarousel({ promotions, onOpen, onExplore }) {
  const [index, setIndex] = useState(0);
  const items = promotions.slice(0, 4);
  if (!items.length) return null;
  const promo = items[index];
  const typeLabels = ["01 더 저렴한 대체", "02 무료 · 이벤트", "03 연간 · 학생 할인", "04 통신사 결합"];
  const next = () => setIndex((value) => (value + 1) % items.length);
  const previous = () => setIndex((value) => (value + items.length - 1) % items.length);
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#71717A]">Smart alternative</p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">더 아낄 수 있는 선택</h2>
        </div>
        <button type="button" onClick={onExplore} className="flex items-center gap-0.5 text-[13px] font-medium text-[#71717A] hover:text-black">전체보기 <ChevronRight size={15} /></button>
      </div>
      <article className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA]">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <span className="rounded-[4px] bg-black px-2 py-1 text-[11px] font-bold text-white">{typeLabels[index] || "추천 혜택"}</span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#18181B] text-[13px] font-bold text-white">{promo.monogram || promo.title.slice(0, 1)}</span>
          </div>
          <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.02em]">{promo.title}</h3>
          <p className="mt-2 min-h-10 text-[13px] leading-5 text-[#71717A]">{promo.description}</p>
          <div className="mt-4 flex items-end justify-between">
            <span>
              <span className="block text-[11px] text-[#71717A]">예상 절약</span>
              <strong className="mt-0.5 block text-[17px]">{formatWon(promo.saving)}</strong>
            </span>
            <Button size="compact" onClick={() => onOpen(promo)}>혜택 보기 <ArrowRight size={15} /></Button>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[#E4E4E7] bg-white px-4 py-3">
          <div className="flex gap-1.5" aria-label="추천 단계">
            {items.map((item, dotIndex) => <span key={item.id} className={`h-1.5 rounded-full transition-all ${dotIndex === index ? "w-5 bg-black" : "w-1.5 bg-[#E4E4E7]"}`} />)}
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={previous} className="grid h-7 w-7 place-items-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-black" aria-label="이전 추천"><ChevronLeft size={16} /></button>
            <button type="button" onClick={next} className="grid h-7 w-7 place-items-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-black" aria-label="다음 추천"><ChevronRight size={16} /></button>
          </div>
        </div>
      </article>
    </section>
  );
}

function EmptyState({ onAdd, onScan }) {
  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col items-center justify-center px-5 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-[24px] bg-[#F4F4F5] text-black"><Inbox size={28} strokeWidth={1.5} /></span>
      <h1 className="mt-6 text-[22px] font-bold tracking-[-0.02em]">등록된 구독 서비스가 없습니다</h1>
      <p className="mt-3 max-w-[280px] text-[14px] leading-6 text-[#71717A]">하단의 + 버튼이나 아래 버튼으로 구독을 추가해보세요.</p>
      <div className="mt-8 w-full space-y-3">
        <Button className="w-full" onClick={onAdd}><ReceiptText size={18} />첫 구독 서비스 등록하기</Button>
        <Button className="w-full" variant="secondary" onClick={onScan}><ScanLine size={18} />영수증 AI 스캔하기</Button>
      </div>
      <div className="mt-8 flex items-center gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] px-4 py-3 text-left">
        <Sparkles size={17} />
        <p className="text-[12px] leading-5 text-[#71717A]">구독을 등록하면 내 사용 패턴에 맞는 프로모션을 추천해드려요.</p>
      </div>
    </section>
  );
}

export function HomeScreen({ subscriptions, promotions, profile, notificationDenied, onOpenSubscription, onShowAll, onOpenPromotion, onExplorePromotions, onAdd, onStartOnboarding }) {
  const upcoming = useMemo(() => [...subscriptions].sort((a, b) => daysUntilCharge(a) - daysUntilCharge(b)).slice(0, 3), [subscriptions]);

  if (subscriptions.length === 0) return <EmptyState onAdd={onAdd} onScan={onAdd} />;

  return (
    <main className="px-5 pb-28 pt-6">
      <p className="text-[13px] font-medium text-[#71717A]">{profile?.nickname || "민수"}님, 이번 달</p>
      <h1 className="mt-1 text-[24px] font-bold tracking-[-0.02em]">고정지출을 확인하세요</h1>
      {notificationDenied && (
        <button type="button" onClick={onStartOnboarding} className="mt-5 flex w-full items-center gap-3 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] px-4 py-3 text-left">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white"><Sparkles size={16} /></span>
          <span>
            <strong className="block text-[13px]">결제 전 알림이 꺼져 있어요</strong>
            <span className="mt-0.5 block text-[12px] text-[#71717A]">알림을 켜고 D-3, D-1에 알려드릴게요.</span>
          </span>
        </button>
      )}
      <div className="mt-5"><SummaryCard subscriptions={subscriptions} /></div>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#71717A]">Upcoming</p>
            <h2 className="text-[17px] font-bold tracking-[-0.01em]">결제 임박 (최대 3개)</h2>
          </div>
          {subscriptions.length > 3 && (
            <button type="button" onClick={onShowAll} className="flex items-center gap-0.5 text-[12px] font-medium text-[#71717A] hover:text-black">
              전체보기 <ChevronRight size={15} />
            </button>
          )}
        </div>
        <div className="space-y-3">
          {upcoming.map((subscription) => (
            <SubscriptionCard key={subscription.subscriptionId} subscription={subscription} onOpen={() => onOpenSubscription(subscription.subscriptionId)} />
          ))}
        </div>
      </section>

      <PromotionCarousel promotions={promotions} onOpen={onOpenPromotion} onExplore={onExplorePromotions} />
    </main>
  );
}
