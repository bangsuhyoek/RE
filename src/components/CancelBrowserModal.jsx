import { useState, useRef, useEffect } from "react";
import { Lock, X, ExternalLink } from "lucide-react";

export function CancelBrowserModal({
  subscription,
  onClose,
  onComplete,
}) {
  const steps = (subscription.guideSteps && subscription.guideSteps.length > 0) ? subscription.guideSteps : [
    {
      stepNumber: 1,
      title: "로그인",
      description: `${subscription.name} 계정으로 로그인하세요.`,
      imageUrl: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=320&auto=format&fit=crop&q=80",
    },
    {
      stepNumber: 2,
      title: "계정 관리",
      description: "프로필 > 멤버십 또는 계정 관리 메뉴를 선택하세요.",
      imageUrl: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=320&auto=format&fit=crop&q=80",
    },
    {
      stepNumber: 3,
      title: "해지 완료",
      description: "해지 방어 단계를 거쳐 최종 해지 완료를 확인하세요.",
      imageUrl: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=320&auto=format&fit=crop&q=80",
    },
  ];

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const currentStep = steps[activeStepIndex] || steps[0];
  const scrollContainerRef = useRef(null);

  // 도메인 추출
  const displayUrl = (() => {
    try {
      return new URL(subscription.cancelUrl).hostname;
    } catch {
      return "official-cancel-page";
    }
  })();

  const handleCardClick = (index) => {
    setActiveStepIndex(index);
    if (scrollContainerRef.current) {
      const card = scrollContainerRef.current.children[index];
      if (card) {
        card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white select-none animate-in fade-in duration-200">
      {/* 상단 헤더 (전체 화면의 약 7%, 52px) */}
      <header className="h-[52px] shrink-0 border-b border-[#E5E8EB] bg-white px-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#F2F4F6] text-[#191F28]">
            <Lock size={14} className="text-[#3182F6]" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#191F28] leading-tight truncate">
              {subscription.name}
            </p>
            <p className="text-[11px] text-[#8B95A1] font-medium leading-tight truncate">
              {displayUrl}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onComplete}
            className="rounded-xl bg-[#191F28] px-3.5 py-1.5 text-[12px] font-bold text-white shadow-xs hover:bg-[#333D4B] active:scale-95 transition-all"
          >
            해지 완료
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid h-9 w-9 place-items-center rounded-full text-[#4E5968] hover:bg-[#F2F4F6] active:scale-95 transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* 중앙 메인 웹뷰 영역 (전체 화면의 약 73%) */}
      <main className="relative flex-1 bg-[#F9FAFB] overflow-hidden flex flex-col items-center justify-center p-4">
        {/* 실제 웹 브라우저 환경에서는 iframe X-Frame-Options 방어 처리 */}
        <div className="w-full h-full max-w-lg bg-white rounded-2xl border border-[#E5E8EB] shadow-xs flex flex-col items-center justify-center p-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#EFF6FF] text-[#3182F6] mb-3">
            <ExternalLink size={26} />
          </div>
          <h3 className="text-[17px] font-bold text-[#191F28]">
            {subscription.name} 해지 페이지 연결
          </h3>
          <p className="mt-2 text-[13px] text-[#6B7684] max-w-[280px] leading-relaxed">
            하단의 <span className="font-semibold text-[#191F28]">연속 이미지 가이드</span>를 참고하여 모바일 해지를 진행해 주세요.
          </p>
          <a
            href={subscription.cancelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#191F28] px-4 py-2.5 text-[13px] font-semibold text-white shadow-xs hover:bg-[#333D4B] active:scale-98 transition-all"
          >
            공식 해지 사이트 열기 <ExternalLink size={14} />
          </a>
          <button
            type="button"
            onClick={onComplete}
            className="mt-3 text-[12px] font-semibold text-[#3182F6] hover:underline"
          >
            이미 해지하셨나요? 해지 완료 처리하기
          </button>
        </div>
      </main>

      {/* 하단 가이드 도크 (전체 화면의 정확히 20%, 약 160px) */}
      <section className="h-[20vh] min-h-[148px] max-h-[180px] shrink-0 border-t border-[#E5E8EB] bg-white flex flex-col justify-between px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        {/* 상단 단계 인디케이터 및 핵심 안내 문구 */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 rounded-md bg-[#EFF6FF] px-1.5 py-0.5 text-[11px] font-bold text-[#3182F6]">
              {currentStep.stepNumber}/{steps.length}단계
            </span>
            <p className="text-[13px] font-bold text-[#191F28] truncate">
              {currentStep.description}
            </p>
          </div>
          <span className="shrink-0 text-[11px] font-medium text-[#8B95A1]">
            스와이프 가이드
          </span>
        </div>

        {/* 연속 이미지 카드 스와이프 리스트 */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2.5 overflow-x-auto py-1.5 scrollbar-none snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {steps.map((step, idx) => {
            const isSelected = idx === activeStepIndex;
            return (
              <button
                key={step.stepNumber}
                type="button"
                onClick={() => handleCardClick(idx)}
                className={`relative shrink-0 snap-center rounded-xl overflow-hidden text-left transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? "ring-2 ring-[#3182F6] ring-offset-1 shadow-md scale-[1.02]"
                    : "opacity-60 hover:opacity-90 border border-[#E5E8EB]"
                }`}
                style={{ width: "84px", height: "88px" }}
              >
                <img
                  src={step.imageUrl}
                  alt={step.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {/* 상단 번호 배지 */}
                <div className="absolute top-1.5 left-1.5 grid h-4 w-4 place-items-center rounded-full bg-black/65 text-[10px] font-bold text-white backdrop-blur-xs">
                  {step.stepNumber}
                </div>
                {/* 하단 그라데이션 타이틀 라벨 */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1 pt-3">
                  <p className="text-[10px] font-semibold text-white text-center truncate">
                    {step.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
