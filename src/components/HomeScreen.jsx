import { useMemo, useState } from "react";
import { ArrowRight, BellRing, ChevronLeft, ChevronRight, Inbox, ReceiptText, ScanLine, Send, Sparkles } from "lucide-react";
import { Button, IconButton, SubscriptionCard } from "./ui";
import { daysUntilCharge, formatWon } from "../lib/dates";

function SummaryCard({ subscriptions }) {
  const [annual, setAnnual] = useState(false);
  const monthly = subscriptions.reduce((sum, subscription) => sum + subscription.amount, 0);
  const displayAmount = annual ? monthly * 12 : monthly;
  return (
    <button type="button" onClick={() => setAnnual((value) => !value)} className="card-press w-full rounded-[24px] bg-[#191F28] p-5 text-left text-white shadow-[0_4px_20px_rgba(25,31,40,0.12)] border border-[#2B3240]" aria-label="월간 및 연간 지출 전환">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-white/70">{annual ? "연간 환산 지출액" : "이번 달 총 결제 예정"}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-xs">{annual ? "연간 보기" : "월간 보기"}</span>
      </div>
      <span className="mt-2.5 block text-[32px] font-extrabold tracking-tight text-white">{formatWon(displayAmount)}</span>
      <span className="mt-1 flex items-center gap-1 text-[12px] text-white/50">탭하면 {annual ? "월간" : "연간"} 지출로 전환</span>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-white/[0.06] p-3.5 backdrop-blur-xs">
        <span>
          <span className="block text-[11px] font-medium text-white/60">활성 구독</span>
          <strong className="mt-0.5 block text-[16px] font-bold text-white tracking-tight">{subscriptions.length}개</strong>
        </span>
        <span>
          <span className="block text-[11px] font-medium text-white/60">{annual ? "월 환산" : "연간 환산"}</span>
          <strong className="mt-0.5 block text-[16px] font-bold text-white tracking-tight">{formatWon(annual ? monthly : monthly * 12)}</strong>
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
          <h2 className="mt-1 text-[18px] font-bold tracking-tight text-[#191F28]">더 아낄 수 있는 선택</h2>
        </div>
        <button type="button" onClick={onExplore} className="flex items-center gap-0.5 text-[13px] font-semibold text-[#6B7684] hover:text-[#191F28] transition-colors">전체보기 <ChevronRight size={15} /></button>
      </div>
      <article className="overflow-hidden rounded-2xl border border-[#E5E8EB] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <span className="rounded-[6px] bg-[#191F28] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs">{typeLabels[index] || "추천 혜택"}</span>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F2F4F6] text-[13px] font-bold text-[#191F28] border border-[#E5E8EB]">{promo.monogram || promo.title.slice(0, 1)}</span>
          </div>
          <h3 className="mt-4 text-[18px] font-bold tracking-tight text-[#191F28]">{promo.title}</h3>
          <p className="mt-1.5 min-h-10 text-[13px] leading-relaxed text-[#6B7684]">{promo.description}</p>
          <div className="mt-4 flex items-end justify-between">
            <span>
              <span className="block text-[11px] font-semibold text-[#8B95A1]">예상 절약</span>
              <strong className="mt-0.5 block text-[18px] font-extrabold tracking-tight text-[#191F28]">{formatWon(promo.saving)}</strong>
            </span>
            <Button size="compact" onClick={() => onOpen(promo)}>혜택 보기 <ArrowRight size={15} /></Button>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[#F2F4F6] bg-[#F9FAFB] px-4 py-3">
          <div className="flex gap-1.5" aria-label="추천 단계">
            {items.map((item, dotIndex) => <span key={item.id} className={`h-1.5 rounded-full transition-all ${dotIndex === index ? "w-4 bg-[#191F28]" : "w-1.5 bg-[#D1D6DB]"}`} />)}
          </div>
          <div className="flex gap-1">
            <IconButton size="small" variant="weak" onClick={previous} aria-label="이전 추천"><ChevronLeft size={16} /></IconButton>
            <IconButton size="small" variant="weak" onClick={next} aria-label="다음 추천"><ChevronRight size={16} /></IconButton>
          </div>
        </div>
      </article>
    </section>
  );
}

function EmptyState({ onAdd, onScan }) {
  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col items-center justify-center px-5 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-3xl bg-[#F2F4F6] text-[#6B7684] border border-[#E5E8EB]"><Inbox size={28} strokeWidth={1.75} /></span>
      <h1 className="mt-6 text-[22px] font-bold tracking-tight text-[#191F28]">등록된 구독 서비스가 없습니다</h1>
      <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-[#6B7684]">하단의 + 버튼이나 아래 버튼으로 구독을 추가해보세요.</p>
      <div className="mt-8 w-full space-y-3">
        <Button size="large" fullWidth onClick={onAdd} prefixIcon={<ReceiptText size={18} />}>첫 구독 서비스 등록하기</Button>
        <Button size="large" fullWidth variant="secondary" onClick={onScan} prefixIcon={<ScanLine size={18} />}>영수증 AI 스캔하기</Button>
      </div>
      <div className="mt-8 flex items-center gap-2.5 rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] px-4 py-3.5 text-left shadow-2xs">
        <Sparkles size={18} className="shrink-0 text-[#FF6F0F]" />
        <p className="text-[12px] leading-5 text-[#6B7684]">구독을 등록하면 내 사용 패턴에 맞는 프로모션을 추천해드려요.</p>
      </div>
    </section>
  );
}

export function HomeScreen({ subscriptions, promotions, profile, notificationDenied, onOpenSubscription, onShowAll, onOpenPromotion, onExplorePromotions, onAdd, onScan, onStartOnboarding, onToggleNotificationPermission, onOpenNotificationCenter, onTriggerTestNotification }) {
  const upcoming = useMemo(() => [...subscriptions].sort((a, b) => daysUntilCharge(a) - daysUntilCharge(b)).slice(0, 3), [subscriptions]);

  if (subscriptions.length === 0) return <EmptyState onAdd={onAdd} onScan={onScan || onAdd} />;

  return (
    <main className="px-5 pb-28 pt-6">
      <p className="text-[13px] font-semibold text-[#8B95A1]">{profile?.nickname || "민수"}님, 이번 달</p>
      <h1 className="mt-0.5 text-[24px] font-extrabold tracking-tight text-[#191F28]">고정지출을 확인하세요</h1>
      {notificationDenied ? (
        <button
          type="button"
          onClick={onToggleNotificationPermission}
          className="mt-5 flex w-full items-center justify-between rounded-2xl border border-[#FFE8CC] bg-[#FFF9F2] p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FF6F0F] text-white shadow-2xs">
              <Sparkles size={16} />
            </span>
            <div>
              <strong className="block text-[13px] font-bold text-[#191F28]">결제 전 알림이 꺼져 있어요</strong>
              <span className="mt-0.5 block text-[12px] font-medium text-[#8B95A1]">탭하여 알림을 켜고 D-3, D-1에 미리 안내받으세요.</span>
            </div>
          </div>
          <span className="rounded-lg bg-[#FF6F0F] px-3 py-1.5 text-[12px] font-bold text-white shadow-2xs">
            켜기
          </span>
        </button>
      ) : (
        <div className="mt-5 flex w-full items-center justify-between rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#F2F4F6] text-[#191F28]">
              <BellRing size={16} />
            </span>
            <div>
              <strong className="block text-[13px] font-bold text-[#191F28]">사전 결제 스마트 알림 활성화</strong>
              <span className="block text-[11px] font-medium text-[#8B95A1]">D-3, D-1 결제 및 무료체험 종료 안내</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onTriggerTestNotification}
            className="flex items-center gap-1.5 rounded-lg border border-[#E5E8EB] bg-[#F9FAFB] px-3 py-1.5 text-[12px] font-semibold text-[#333D4B] shadow-2xs hover:bg-[#F2F4F6] active:scale-95 transition-all"
          >
            <Send size={12} className="text-[#6B7684]" />
            알림 테스트
          </button>
        </div>
      )}
      <div className="mt-5"><SummaryCard subscriptions={subscriptions} /></div>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8B95A1]">Upcoming</p>
            <h2 className="text-[18px] font-bold tracking-tight text-[#191F28]">결제 임박 (최대 3개)</h2>
          </div>
          {subscriptions.length > 3 && (
            <button type="button" onClick={onShowAll} className="flex items-center gap-0.5 text-[13px] font-semibold text-[#6B7684] hover:text-[#191F28] transition-colors">
              전체보기 <ChevronRight size={15} />
            </button>
          )}
        </div>
        <div className="space-y-3">
          {upcoming.map((subscription) => (
            <SubscriptionCard
              key={subscription.subscriptionId}
              subscription={subscription}
              detail
              onOpen={() => onOpenSubscription(subscription.subscriptionId)}
            />
          ))}
        </div>
      </section>

      <PromotionCarousel promotions={promotions} onOpen={onOpenPromotion} onExplore={onExplorePromotions} />
    </main>
  );
}
