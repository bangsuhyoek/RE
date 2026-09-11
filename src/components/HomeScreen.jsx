import { useMemo, useState, useRef } from "react";
import {
  ChevronRight,
  Inbox,
  ReceiptText,
  ScanLine,
  Sparkles,
  Bell,
  BellOff,
  User,
} from "lucide-react";
import { Button, SubscriptionCard, ServiceMark } from "./ui";
import { daysUntilCharge, formatWon } from "../lib/dates";

function EmptyState({ onAdd, onScan, onLogout, onOpenAccount, profile }) {
  return (
    <section className="flex min-h-[calc(100dvh-9rem)] min-h-[calc(100vh-9rem)] flex-col items-center justify-center px-4 sm:px-5 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-[#F2F4F6] text-[#6B7684] border border-[#E5E8EB]">
        <Inbox size={28} strokeWidth={1.75} />
      </span>
      <h1 className="mt-6 text-[22px] font-bold tracking-tight text-[#191F28]">등록된 구독 서비스가 없습니다</h1>
      <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-[#6B7684]">하단의 + 버튼이나 아래 버튼으로 구독을 추가해보세요.</p>
      <div className="mt-8 w-full space-y-3">
        <Button size="large" fullWidth onClick={onAdd} prefixIcon={<ReceiptText size={18} />}>첫 구독 서비스 등록하기</Button>
        <Button size="large" fullWidth variant="secondary" onClick={onScan} prefixIcon={<ScanLine size={18} />}>AI 결제인식 (문자·영수증 스캔)</Button>
      </div>
      <div className="mt-8 flex items-center gap-2.5 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-4 py-3.5 text-left shadow-2xs">
        <Sparkles size={18} className="shrink-0 text-[#FF6F0F]" />
        <p className="text-[12px] leading-5 text-[#6B7684]">구독을 등록하면 내 사용 패턴에 맞는 프로모션을 추천해드려요.</p>
      </div>
      {(onOpenAccount || onLogout) && (
        <div className="mt-6 flex items-center justify-center gap-3 text-[12px] text-[#8B95A1]">
          {onOpenAccount && (
            <button type="button" onClick={onOpenAccount} className="hover:text-[#191F28] hover:underline">
              내 계정 ({profile?.nickname || "사용자"})
            </button>
          )}
          {onOpenAccount && onLogout && <span>·</span>}
          {onLogout && (
            <button type="button" onClick={onLogout} className="hover:text-[#E11D48] hover:underline text-[#71717A]">
              로그아웃
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function VisualPromoCarousel({ promotions, onOpenPromotion }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  const naverPromo = promotions.find((p) => p.id === "tving-naver" || p.id === "netflix") || promotions[0];
  const youtubePromo = promotions.find((p) => p.id === "youtube-promo") || promotions[1] || promotions[0];
  const heroPromo = promotions.find((p) => p.id === "lgu-nerget") || promotions[0];

  const slides = [
    {
      id: "naver-netflix",
      promo: naverPromo,
      tag: "네이버플러스 멤버십 제휴",
      tagBg: "bg-[#DCFCE7] text-[#15803D]",
      title: "네이버 멤버십으로\n넷플릭스 매월 0원!",
      desc: "월 4,900원에 쇼핑 적립 + 넷플릭스 무료",
      bgGradient: "from-[#F0FDF4] via-white to-[#E8F9EF] border-[#DCFCE7]",
      visual: (
        <div className="relative h-20 w-28 shrink-0 flex items-center justify-center select-none">
          <div className="absolute top-3 right-9 w-[50px] h-[34px] rounded-xl bg-[#03C75A] text-white shadow-md -rotate-12 flex items-center justify-center font-black text-[13px] border-[1.5px] border-white">
            N+
          </div>
          <div className="absolute top-7 right-1 w-[60px] h-[36px] rounded-xl bg-[#141414] text-[#E50914] shadow-md rotate-6 flex items-center justify-center font-black text-[11px] tracking-wider border-[1.5px] border-white">
            NETFLIX
          </div>
          <div className="absolute top-1 right-2.5 h-[30px] w-[30px] rounded-full bg-[#22C55E] text-white flex items-center justify-center shadow-md text-[10px] font-black border-2 border-white">
            0원
          </div>
        </div>
      ),
    },
    {
      id: "youtube-promo",
      promo: youtubePromo,
      tag: "우주패스 전용 프로모션",
      tagBg: "bg-[#FFE4E6] text-[#BE123C]",
      title: "유튜브 프리미엄\n우주패스 결합 특가!",
      desc: "요금제별 최대 특별 할인 지원",
      bgGradient: "from-[#FFF1F2] via-white to-[#FFE4E6] border-[#FEE2E2]",
      visual: (
        <div className="relative h-20 w-28 shrink-0 flex items-center justify-center select-none">
          <div className="absolute top-3 right-9 w-[52px] h-[34px] rounded-xl bg-[#2563EB] text-white shadow-md -rotate-12 flex items-center justify-center font-black text-[11px] border-[1.5px] border-white">
            T우주
          </div>
          <div className="absolute top-7 right-1 w-[62px] h-[36px] rounded-xl bg-[#FF0000] text-white shadow-md rotate-6 flex items-center justify-center font-black text-[11px] tracking-tight border-[1.5px] border-white">
            YouTube
          </div>
          <div className="absolute top-1 right-2.5 h-[30px] w-[30px] rounded-full bg-[#F59E0B] text-white flex items-center justify-center shadow-md text-[10px] font-black border-2 border-white">
            특가
          </div>
        </div>
      ),
    },
    {
      id: "lgu-nerget",
      promo: heroPromo,
      tag: "유독 OTT 정기구독 혜택",
      tagBg: "bg-[#DBEAFE] text-[#1D4ED8]",
      title: "티빙 월 4,950원~\n디즈니+ 최대 할인!",
      desc: "유독 단독 할인 & 너겟 요금제 결합",
      bgGradient: "from-[#EFF6FF] via-white to-[#E0F2FE] border-[#DBEAFE]",
      visual: (
        <div className="relative h-20 w-28 shrink-0 flex items-center justify-center select-none">
          <div style={{ backgroundColor: "#001D38" }} className="absolute top-3 right-9 w-[54px] h-[34px] rounded-xl text-[#60A5FA] shadow-md -rotate-12 flex items-center justify-center font-black text-[11px] border-[1.5px] border-white">
            Disney+
          </div>
          <div style={{ backgroundColor: "#FF153C" }} className="absolute top-7 right-1 w-[60px] h-[36px] rounded-xl text-white shadow-md rotate-6 flex items-center justify-center font-black text-[12px] border-[1.5px] border-white">
            TVING
          </div>
          <div className="absolute top-1 right-2.5 h-[30px] w-[30px] rounded-full bg-[#38BDF8] text-[#0A1E3F] flex items-center justify-center shadow-md text-[10px] font-black border-2 border-white">
            할인
          </div>
        </div>
      ),
    },
  ];

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.clientWidth;
    if (width > 0) {
      const newIdx = Math.round(scrollLeft / width);
      setActiveIndex(newIdx);
    }
  };

  const scrollToSlide = (idx) => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({
      left: idx * width,
      behavior: "smooth",
    });
    setActiveIndex(idx);
  };

  return (
    <div className="w-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-[20px]"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {slides.map((s) => (
          <div
            key={s.id}
            onClick={() => onOpenPromotion?.(s.promo)}
            className={`w-full shrink-0 snap-center rounded-[20px] border bg-gradient-to-br ${s.bgGradient} px-4 py-3.5 flex items-center justify-between shadow-xs cursor-pointer active:scale-[0.98] transition-all`}
            style={{ minHeight: "108px" }}
            role="button"
            tabIndex={0}
            aria-label={`${s.tag} - ${s.title}`}
          >
            <div className="flex-1 pr-2 min-w-0">
              <span className={`inline-block text-[10.5px] font-bold px-2 py-0.5 rounded-md tracking-tight mb-1.5 ${s.tagBg}`}>
                {s.tag}
              </span>
              <h3 className="text-[14px] font-bold text-[#191F28] tracking-tight leading-[1.3] whitespace-pre-line">
                {s.title}
              </h3>
              <p className="text-[11px] font-medium text-[#4E5968] mt-1 truncate">
                {s.desc}
              </p>
            </div>
            {s.visual}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-2.5">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => scrollToSlide(idx)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              activeIndex === idx ? "w-4.5 bg-[#3182F6]" : "w-1.5 bg-[#E5E8EB]"
            }`}
            aria-label={`슬라이드 ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export function HomeScreen({
  subscriptions,
  promotions = [],
  profile,
  notificationDenied,
  onOpenSubscription,
  onShowAll,
  onOpenPromotion,
  onExplorePromotions,
  onAdd,
  onScan,
  onToggleNotificationPermission,
  onOpenNotificationCenter,
  onOpenTerms,
  onLogout,
  onOpenAccount,
}) {
  const [annual, setAnnual] = useState(false);

  const monthly = useMemo(() => {
    return subscriptions.reduce((sum, sub) => {
      const amt = sub.billingCycle === "매년" ? Math.round(sub.amount / 12) : sub.amount;
      return sum + amt;
    }, 0);
  }, [subscriptions]);

  const yearly = useMemo(() => {
    return subscriptions.reduce((sum, sub) => {
      const amt = sub.billingCycle === "매년" ? sub.amount : sub.amount * 12;
      return sum + amt;
    }, 0);
  }, [subscriptions]);

  const displayAmount = annual ? yearly : monthly;

  // 결제 예정순 정렬 (무료체험 최우선 -> 사용자 지정 고정(강조) -> 빠른 결제일 순)
  const sortedSubscriptions = useMemo(() => {
    return [...subscriptions].sort((a, b) => {
      const aTrial = Boolean(a.isTrial || a.status === "trial");
      const bTrial = Boolean(b.isTrial || b.status === "trial");
      if (aTrial && !bTrial) return -1;
      if (!aTrial && bTrial) return 1;

      const aPinned = Boolean(a.isPinned || a.pinned);
      const bPinned = Boolean(b.isPinned || b.pinned);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      return daysUntilCharge(a) - daysUntilCharge(b);
    });
  }, [subscriptions]);

  if (subscriptions.length === 0) {
    return (
      <EmptyState
        onAdd={onAdd}
        onScan={onScan || onAdd}
        onLogout={onLogout}
        onOpenAccount={onOpenAccount}
        profile={profile}
      />
    );
  }

  return (
    <main className="px-5 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-safe select-none">
      {/* 1. 상단 서비스 브랜드 & 알림센터/마이페이지 헤더 */}
      <header className="flex items-center justify-between pt-4 pb-3 border-b border-gray-100/80">
        <div className="flex items-baseline gap-2">
          <span className="text-[20px] font-black tracking-tight text-black">
            꾸독
          </span>
          <span className="text-[12px] font-semibold text-gray-400">
            구독 관리
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenNotificationCenter}
            className="relative p-2 text-gray-500 hover:text-black transition-colors cursor-pointer"
            aria-label="알림 센터 열기"
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>
          {onOpenAccount && (
            <button
              type="button"
              onClick={onOpenAccount}
              className="p-2 text-gray-500 hover:text-black transition-colors cursor-pointer"
              aria-label="내 계정 관리"
            >
              <User size={20} />
            </button>
          )}
        </div>
      </header>

      {/* 2. 이번 달 총 지출 & 활성 구독 (원래 레이아웃 유지) */}
      <div className="pt-6 pb-4 flex items-end justify-between">
        <div
          onClick={() => setAnnual((v) => !v)}
          className="cursor-pointer group"
          role="button"
          tabIndex={0}
          aria-label="월간 및 연간 지출 전환"
        >
          <span className="text-[13px] font-semibold text-gray-400 block">
            {annual ? "연간 환산 총 지출" : "이번 달 총 지출"}
            <span className="text-[11px] text-gray-300 font-normal ml-1 group-hover:text-gray-500 transition-colors">
              (탭하여 전환)
            </span>
          </span>
          <span className="mt-1.5 block text-[36px] font-black text-black tracking-tight leading-none truncate">
            {formatWon(displayAmount)}
          </span>
        </div>

        <div className="text-right pb-0.5 shrink-0">
          <span className="text-[11px] font-medium text-gray-400 block">
            활성 구독
          </span>
          <div className="mt-1 leading-none">
            <span className="text-[26px] font-black text-black tracking-tight">
              {subscriptions.length}
            </span>
            <span className="text-[15px] font-bold text-gray-600 ml-0.5">
              개
            </span>
          </div>
        </div>
      </div>

      {/* 알림 권한 꺼짐 안내 (필요 시 노출) */}
      {notificationDenied && (
        <button
          type="button"
          onClick={onToggleNotificationPermission}
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-left shadow-xs transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-500 text-white shadow-2xs">
              <BellOff size={15} />
            </span>
            <div>
              <strong className="block text-[12px] font-bold text-amber-950">결제 전 알림이 꺼져 있어요</strong>
              <span className="text-[11px] font-medium text-amber-700">D-3, D-1 알림을 켜보세요.</span>
            </div>
          </div>
          <span className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs">
            켜기
          </span>
        </button>
      )}

      {/* 3. 내 구독 파트 (피로도 제로: 편안한 16px 굵기와 넉넉한 20px+ 여백) */}
      <section className="mt-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100/80">
          <h2 className="text-[16px] font-bold text-[#191F28] tracking-tight">
            구독 관리
          </h2>
          {subscriptions.length > 5 && onShowAll && (
            <button
              type="button"
              onClick={onShowAll}
              className="text-[12px] font-medium text-gray-400 hover:text-black flex items-center transition-colors cursor-pointer"
            >
              전체보기 <ChevronRight size={13} />
            </button>
          )}
        </div>

        {/* 구독 리스트: 기존과 같은 단일 리스트 구성, 서비스 간 여백 py-5(20px) 넉넉한 확장 + 대형 로고 */}
        <div className="divide-y divide-gray-100/80">
          {sortedSubscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.subscriptionId || subscription.id}
              subscription={subscription}
              variant="grouped"
              onOpen={() => onOpenSubscription(subscription.subscriptionId || subscription.id)}
            />
          ))}
        </div>
      </section>

      {/* 4. 스마트 절약 · 혜택 (하단 30~40% 영역을 차지하는 시각화 스와이프 캐러셀) */}
      <section className="mt-9">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100/80 mb-3.5">
          <h2 className="text-[14px] font-bold text-gray-800 tracking-tight flex items-center gap-1.5">
            <Sparkles size={16} className="text-[#3182F6]" />
            스마트 절약 추천 · 혜택
          </h2>
          {onExplorePromotions && (
            <button
              type="button"
              onClick={onExplorePromotions}
              className="text-[12px] font-medium text-gray-400 hover:text-black flex items-center transition-colors"
            >
              더보기 <ChevronRight size={13} />
            </button>
          )}
        </div>

        {/* 시각화 스와이프 캐러셀 (글자 목록 없이 단독 스와이프 배너) */}
        <VisualPromoCarousel
          promotions={promotions}
          onOpenPromotion={onOpenPromotion}
        />
      </section>

      {/* 5. Legal & Footer */}
      <footer className="mt-12 border-t border-gray-100 pt-5 pb-4 text-center">
        <div className="flex items-center justify-center gap-2.5 text-[11px] text-gray-400">
          <button type="button" onClick={() => onOpenTerms?.("terms")} className="hover:text-black hover:underline">
            서비스 이용약관
          </button>
          <span>·</span>
          <button type="button" onClick={() => onOpenTerms?.("privacy")} className="hover:text-black hover:underline">
            개인정보 처리방침
          </button>
          {onLogout && (
            <>
              <span>·</span>
              <button type="button" onClick={onLogout} className="hover:text-red-500 hover:underline">
                로그아웃
              </button>
            </>
          )}
        </div>
        <p className="mt-1.5 text-[10px] text-gray-300">
          © 2026 꾸독. 구독 관리 서비스
        </p>
      </footer>
    </main>
  );
}
