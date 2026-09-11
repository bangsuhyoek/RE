import { useState, useRef } from "react";
import { Lock, X, ExternalLink, ArrowRight, CheckCircle2 } from "lucide-react";

function StepUiIllustration({ stepNumber, title, serviceName, large = false }) {
  if (stepNumber === 1) {
    return (
      <div className={`h-full w-full bg-[#111827] text-white p-3.5 flex flex-col justify-between select-none ${large ? "p-6" : ""}`}>
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className={`font-bold tracking-wider text-white/60 uppercase ${large ? "text-[12px]" : "text-[9px]"}`}>
            {serviceName}
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
        <div className={`space-y-2 my-auto ${large ? "max-w-xs mx-auto w-full space-y-3" : ""}`}>
          <div className={`rounded bg-white/10 px-2.5 flex items-center text-white/50 border border-white/5 ${large ? "h-9 text-[12px]" : "h-5 text-[8px]"}`}>
            user@email.com
          </div>
          <div className={`rounded bg-white/10 px-2.5 flex items-center text-white/50 border border-white/5 ${large ? "h-9 text-[12px]" : "h-5 text-[8px]"}`}>
            ••••••••
          </div>
          <div className={`rounded bg-[#3182F6] font-bold flex items-center justify-center text-white shadow-xs ${large ? "h-10 text-[13px]" : "h-6 text-[9px]"}`}>
            로그인
          </div>
        </div>
        <span className={`text-white/40 text-center ${large ? "text-[12px]" : "text-[8px]"}`}>
          공식 회원 계정 로그인 단계
        </span>
      </div>
    );
  }

  if (stepNumber === 2) {
    return (
      <div className={`h-full w-full bg-[#111827] text-white p-3.5 flex flex-col justify-between select-none ${large ? "p-6" : ""}`}>
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className={`font-bold text-white/60 ${large ? "text-[12px]" : "text-[9px]"}`}>
            설정 / 프로필 메뉴
          </span>
          <span className={`text-blue-400 font-semibold ${large ? "text-[11px]" : "text-[8px]"}`}>
            선택 필요
          </span>
        </div>
        <div className={`space-y-1.5 my-auto ${large ? "max-w-xs mx-auto w-full space-y-2.5" : ""}`}>
          <div className={`rounded bg-white/5 px-2.5 flex items-center text-white/40 ${large ? "h-8 text-[11px]" : "h-4 text-[8px]"}`}>
            개인정보 설정
          </div>
          <div className={`rounded bg-blue-500/20 border border-blue-400 px-2.5 font-bold flex items-center justify-between text-white ${large ? "h-10 text-[13px]" : "h-5 text-[8px]"}`}>
            <span>계정 및 멤버십 관리</span>
            <span>▶</span>
          </div>
          <div className={`rounded bg-white/5 px-2.5 flex items-center text-white/40 ${large ? "h-8 text-[11px]" : "h-4 text-[8px]"}`}>
            결제 수단 관리
          </div>
        </div>
        <span className={`text-white/40 text-center ${large ? "text-[12px]" : "text-[8px]"}`}>
          멤버십 / 계정 관리 메뉴 선택
        </span>
      </div>
    );
  }

  if (stepNumber === 3) {
    return (
      <div className={`h-full w-full bg-[#111827] text-white p-3.5 flex flex-col justify-between select-none ${large ? "p-6" : ""}`}>
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className={`font-bold text-white/60 ${large ? "text-[12px]" : "text-[9px]"}`}>
            구독 플랜 상세
          </span>
          <span className={`text-amber-400 font-semibold ${large ? "text-[11px]" : "text-[8px]"}`}>
            이용 중
          </span>
        </div>
        <div className={`space-y-2 my-auto ${large ? "max-w-xs mx-auto w-full space-y-3" : ""}`}>
          <div className={`rounded bg-white/5 p-2 text-white/70 border border-white/5 ${large ? "text-[11px]" : "text-[8px]"}`}>
            <span className="block font-bold">현재 이용 요금제</span>
            <span className="text-white/50">다음 결제일에 자동 결제 예정</span>
          </div>
          <div className={`rounded bg-red-600 font-bold flex items-center justify-center text-white shadow-xs ${large ? "h-10 text-[13px]" : "h-6 text-[9px]"}`}>
            멤버십 해지하기
          </div>
        </div>
        <span className={`text-red-300 text-center font-medium ${large ? "text-[12px]" : "text-[8px]"}`}>
          해지 / 정기결제 취소 버튼 클릭
        </span>
      </div>
    );
  }

  return (
    <div className={`h-full w-full bg-[#111827] text-white p-3.5 flex flex-col justify-between select-none ${large ? "p-6" : ""}`}>
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <span className={`font-bold text-emerald-400 ${large ? "text-[12px]" : "text-[9px]"}`}>
          해지 처리 확인
        </span>
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
      </div>
      <div className="text-center my-auto py-2">
        <div className={`mx-auto grid place-items-center rounded-full bg-emerald-500/20 text-emerald-400 mb-2 ${large ? "h-10 w-10 text-[18px]" : "h-6 w-6 text-[12px]"}`}>
          ✓
        </div>
        <span className={`block font-bold text-white ${large ? "text-[14px]" : "text-[9px]"}`}>
          해지 신청이 완료되었습니다
        </span>
        <span className={`block text-white/60 mt-0.5 ${large ? "text-[11px]" : "text-[7px]"}`}>
          다음 결제일에 추가 청구되지 않습니다
        </span>
      </div>
      <span className={`text-emerald-300 text-center font-medium ${large ? "text-[12px]" : "text-[8px]"}`}>
        해지 완료 화면 확인
      </span>
    </div>
  );
}

export function CancelBrowserModal({
  subscription,
  onClose,
  onComplete,
}) {
  const defaultSteps = [
    {
      stepNumber: 1,
      title: "계정 로그인",
      description: `${subscription.name} 공식 사이트에서 계정으로 로그인하세요.`,
    },
    {
      stepNumber: 2,
      title: "멤버십 관리",
      description: "우측 상단 프로필 > [계정] 또는 [멤버십 관리] 메뉴를 선택하세요.",
    },
    {
      stepNumber: 3,
      title: "멤버십 해지",
      description: "스크롤을 내려 [멤버십 해지] 또는 [구독 취소]를 클릭하세요.",
    },
    {
      stepNumber: 4,
      title: "해지 완료",
      description: "혜택 유지 제안을 넘기고 최종 해지 완료를 확인하세요.",
    },
  ];

  const steps = (subscription.guideSteps && subscription.guideSteps.length > 0)
    ? subscription.guideSteps
    : defaultSteps;

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const currentStep = steps[activeStepIndex] || steps[0];
  const scrollContainerRef = useRef(null);

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
      {/* 상단 헤더 */}
      <header className="min-h-[calc(52px+env(safe-area-inset-top,0px))] shrink-0 border-b border-gray-200 bg-white px-4 pt-safe flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gray-100 text-black">
            <Lock size={14} className="text-blue-600" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-black leading-tight truncate">
              {subscription.name} 해지 가이드
            </p>
            <p className="text-[11px] text-gray-400 font-medium leading-tight truncate">
              {displayUrl}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onComplete}
            className="rounded-xl bg-[#111827] px-3.5 py-1.5 text-[12px] font-bold text-white shadow-xs hover:bg-black active:scale-95 transition-all cursor-pointer"
          >
            해지 완료
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-black active:scale-95 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* 중앙 메인 안내 & 단계별 UI 시각 가이드 영역 */}
      <main className="relative flex-1 bg-gray-50 overflow-hidden flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center p-5 text-center overflow-hidden">
          {/* 상단 스텝 라벨 */}
          <div className="flex items-center gap-1.5 mb-2">
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
              {currentStep.stepNumber}단계
            </span>
            <h3 className="text-[16px] font-bold text-black">
              {currentStep.title}
            </h3>
          </div>
          <p className="text-[12px] text-gray-500 mb-4 max-w-[260px] leading-relaxed">
            {currentStep.description}
          </p>

          {/* 중앙 실제 UI 단계 다이어그램 (AI/스톡 사진 대신 실제 UI 와이어프레임) */}
          <div className="w-full h-44 rounded-xl overflow-hidden border border-gray-200 mb-4 shadow-2xs">
            <StepUiIllustration
              stepNumber={currentStep.stepNumber}
              title={currentStep.title}
              serviceName={subscription.name}
              large
            />
          </div>

          <a
            href={subscription.cancelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#111827] py-3 text-[13px] font-bold text-white shadow-xs hover:bg-black active:scale-98 transition-all cursor-pointer"
          >
            {subscription.name} 공식 해지 사이트 열기 <ExternalLink size={14} />
          </a>
        </div>
      </main>

      {/* 하단 가이드 도크 (단계별 미니어처 UI 스와이프 리스트) */}
      <section className="shrink-0 border-t border-gray-200 bg-white flex flex-col justify-between px-4 pt-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[12px] font-bold text-black">
            진행 순서 ({activeStepIndex + 1}/{steps.length})
          </span>
          <span className="text-[11px] font-medium text-gray-400">
            카드 탭 시 해당 단계 미리보기
          </span>
        </div>

        {/* 미니어처 UI 단계 카드 리스트 */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-none snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {steps.map((step, idx) => {
            const isSelected = idx === activeStepIndex;
            return (
              <button
                key={step.stepNumber}
                type="button"
                onClick={() => handleCardClick(idx)}
                className={`relative shrink-0 snap-center rounded-xl overflow-hidden text-left transition-all duration-200 active:scale-95 cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-blue-600 ring-offset-1 shadow-sm scale-[1.02]"
                    : "opacity-60 hover:opacity-90 border border-gray-200"
                }`}
                style={{ width: "92px", height: "88px" }}
              >
                <StepUiIllustration
                  stepNumber={step.stepNumber}
                  title={step.title}
                  serviceName={subscription.name}
                />
                <div className="absolute top-1 left-1 grid h-4 w-4 place-items-center rounded-full bg-black/70 text-[9px] font-bold text-white">
                  {step.stepNumber}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

