import { useState, useRef, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { openCancelBrowser } from "../lib/cancelBrowser";
import { getCharacterAsset } from "../lib/characterAsset";
import { getCommonCancelSteps } from "../data/cancelGuides";
import { X, ExternalLink, ChevronLeft, ChevronRight, Minimize2 } from "lucide-react";

const COMPLETE_LABEL = "해지 완료했어요";

// 네이버플러스 말풍선. 단계 자체는 cancelGuides.js의 공식 확인 단계를 쓴다.
const NAVER_PLUS_HINTS = [
  {
    where: "마이 멤버십 오른쪽 위 설정(⚙)",
    dialogue: () => "로그인이 필요하면 먼저 로그인해줘. 마이 멤버십이 열리면 오른쪽 위 [설정]을 누르면 돼.",
    tip: "네이버 공식 안내도 이 화면에서 시작해요.",
  },
  {
    where: "설정 > 네이버플러스 멤버십 관리",
    dialogue: () => "설정 화면에서 [네이버플러스 멤버십 관리]를 눌러줘.",
    tip: "프로필이나 계정 설정 대신 '네이버플러스 멤버십 관리'를 고르세요.",
  },
  {
    where: "멤버십 관리 > 해지하기",
    dialogue: () => "[네이버플러스 멤버십 해지하기]를 눌러서 다음 화면으로 넘어가줘.",
    tip: "이 단계에서는 아직 해지되지 않아요.",
  },
  {
    where: "멤버십 해지 화면",
    dialogue: () => "이번 이용 기간을 확인하고 [정기결제 해지]를 눌러줘.",
    tip: "다음 결제부터 멈추려면 '멤버십 즉시 종료' 대신 '정기결제 해지'를 고르세요.",
  },
  {
    where: "최종 확인 > 해지하기",
    dialogue: () => "마지막 [해지하기]를 누르면 실제로 해지돼. 내용을 확인하고 직접 눌러줘.",
    tip: "꾸독은 이 버튼을 대신 누르지 않아요.",
  },
];

const NAVER_CANCEL_CHARACTER = "/assets/kkudok/cancel_guide_character.png";

const NAVER_STEP_SCREENS = {
  1: { screen: "마이 멤버십", action: "설정 ⚙", note: "오른쪽 위" },
  2: { screen: "멤버십 설정", action: "네이버플러스 멤버십 관리", note: "관리 메뉴" },
  3: { screen: "멤버십 관리", action: "네이버플러스 멤버십 해지하기", note: "해지 화면으로 이동" },
  4: { screen: "이번 이용 기간 확인", action: "정기결제 해지", note: "다음 결제부터 중단" },
  5: { screen: "최종 확인", action: "해지하기", note: "직접 누르기" },
};

function NaverPlusStepScreen({ stepNumber }) {
  const config = NAVER_STEP_SCREENS[stepNumber];
  if (!config) return null;

  return (
    <div className="w-full rounded-2xl border border-[#E5E8EB] bg-[#F7F8FA] p-4">
      <div className="flex items-center justify-between border-b border-[#E5E8EB] pb-2">
        <span className="text-[12px] font-bold text-[#4E5968]">{config.screen}</span>
        <span className="text-[11px] font-bold text-[#03C75A]">NAVER+</span>
      </div>
      <div className="mt-4 flex min-h-12 items-center justify-between rounded-xl border-2 border-[#3182F6] bg-white px-3 text-[13px] font-bold text-[#191F28]">
        <span>{config.action}</span>
        <ChevronRight size={16} className="text-[#3182F6]" />
      </div>
      <p className="mt-3 text-center text-[11px] font-semibold text-[#6B7684]">{config.note}</p>
    </div>
  );
}

export function CancelBrowserModal({
  subscription,
  guide = null,
  onClose,
  onComplete,
}) {
  const isNaverPlus =
    subscription.id === "naverplus" ||
    subscription.id === "naver" ||
    subscription.name?.includes("네이버플러스");

  // 단계는 cancelGuides.js가 만든 값(공식 확인 단계 또는 공통 안내)을 그대로 쓴다.
  const steps = subscription.guideSteps?.length > 0
    ? subscription.guideSteps
    : getCommonCancelSteps(subscription.name);

  // 네이버플러스 말풍선은 cancelGuides.js의 5단계와 순서가 같을 때만 쓴다.
  const hints = isNaverPlus && steps.length === NAVER_PLUS_HINTS.length ? NAVER_PLUS_HINTS : null;
  const showHelpLink = !isNaverPlus && guide && !guide.verified && guide.helpUrl;

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [customCharacterSrc, setCustomCharacterSrc] = useState(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    let active = true;
    getCharacterAsset().then((asset) => {
      if (active) setCustomCharacterSrc(asset?.hasCustom ? asset.src : null);
    });
    return () => {
      active = false;
    };
  }, []);

  const currentStep = steps[activeStepIndex] || steps[0];
  const hint = hints ? hints[Math.min(activeStepIndex, hints.length - 1)] : null;
  const message = hint ? hint.dialogue(subscription.name) : currentStep.description;
  const isFinalStep = activeStepIndex === steps.length - 1;
  const canComplete = !isNaverPlus;

  const characterImg = customCharacterSrc || (isNaverPlus
    ? NAVER_CANCEL_CHARACTER
    : isFinalStep
      ? "/assets/kkudok/character_done.png"
      : "/assets/kkudok/character_guide.png");

  const displayUrl = (() => {
    try {
      return new URL(subscription.cancelUrl).hostname;
    } catch {
      return "";
    }
  })();

  const openWebsite = async () => {
    if (!subscription.cancelUrl) return;

    if (Capacitor.isNativePlatform()) {
      const result = await openCancelBrowser({
        serviceId: subscription.id,
        serviceName: subscription.name,
        cancelUrl: subscription.cancelUrl,
        guideSteps: steps,
      });
      if (result?.action === "COMPLETED") {
        onComplete?.();
      }
      if (result?.action !== "FALLBACK_WEB") return;
    }

    window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
  };

  const goToStep = (index) => {
    setActiveStepIndex(index);
    const chip = scrollContainerRef.current?.children[index];
    chip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  if (minimized) {
    return (
      <div className="fixed bottom-6 right-4 z-50 flex items-center gap-2 select-none">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label="해지 안내 펼치기"
          className="flex max-w-[240px] items-center gap-2.5 rounded-full border border-[#E5E8EB] bg-white py-1.5 pl-1.5 pr-4 text-left shadow-lg active:scale-[0.97] transition-transform"
        >
          <img src={characterImg} alt="" className="h-10 w-10 shrink-0 rounded-full bg-[#F2F4F6] object-contain" />
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold text-[#8B95A1]">{activeStepIndex + 1}/{steps.length}단계</span>
            <span className="block truncate text-[13px] font-bold text-[#191F28]">{currentStep.title}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="해지 안내 닫기"
          className="grid h-8 w-8 place-items-center rounded-full border border-[#E5E8EB] bg-white text-[#6B7684] shadow-md"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white select-none animate-in fade-in duration-200">
      <header className="min-h-[calc(52px+env(safe-area-inset-top,0px))] shrink-0 border-b border-[#F2F4F6] bg-white px-4 pt-safe flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-[#191F28]">{subscription.name} 해지 안내</p>
          {displayUrl && <p className="truncate text-[11px] font-medium text-[#8B95A1]">{displayUrl}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="작게 보기"
            className="grid h-9 w-9 place-items-center rounded-full text-[#6B7684] hover:bg-[#F2F4F6]"
          >
            <Minimize2 size={17} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid h-9 w-9 place-items-center rounded-full text-[#6B7684] hover:bg-[#F2F4F6]"
          >
            <X size={19} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-[#F9FAFB] p-4">
        <div className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center gap-4 pb-4">
          <div className="flex items-start gap-3">
            <img src={characterImg} alt="꾸독이" className="h-20 w-20 shrink-0 object-contain" />
            <div className="relative flex-1 rounded-2xl border border-[#E5E8EB] bg-white p-4">
              <p className="text-[12px] font-semibold text-[#3182F6]">
                {activeStepIndex + 1}/{steps.length}단계 · {currentStep.title}
              </p>
              {hint?.where && (
                <p className="mt-1 text-[12px] font-medium text-[#8B95A1]">위치: {hint.where}</p>
              )}
              <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#333D4B]">{message}</p>
              {hint?.tip && (
                <p className="mt-3 border-t border-[#F2F4F6] pt-2.5 text-[12px] leading-relaxed text-[#8B95A1]">{hint.tip}</p>
              )}
              {showHelpLink && (
                <p className="mt-3 border-t border-[#F2F4F6] pt-2.5 text-[12px] leading-relaxed text-[#8B95A1]">
                  아직 공식 안내로 확인하지 못한 서비스라 공통 안내를 보여드려요.{" "}
                  <a href={guide.helpUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#3182F6]">
                    {guide.helpLabel} 보기
                  </a>
                </p>
              )}
            </div>
          </div>

          {isNaverPlus && <NaverPlusStepScreen stepNumber={currentStep.stepNumber} />}

          <div className="space-y-2">
            <button
              type="button"
              onClick={openWebsite}
              disabled={!subscription.cancelUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#191F28] py-3.5 text-[14px] font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              해지 페이지 열기 <ExternalLink size={15} />
            </button>
            {canComplete && (
              <button
                type="button"
                onClick={onComplete}
                className={"w-full rounded-xl py-3.5 text-[14px] font-bold active:scale-[0.98] transition-transform " + (isFinalStep ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#333D4B]")}
              >
                {COMPLETE_LABEL}
              </button>
            )}
          </div>

          <p className="text-center text-[11px] leading-relaxed text-[#8B95A1]">
            꾸독은 해지 버튼을 대신 누르지 않아요. 마지막 단계는 직접 확인하고 눌러주세요.
          </p>
        </div>
      </main>

      <nav
        aria-label="해지 단계"
        className="shrink-0 border-t border-[#F2F4F6] bg-white px-2 pt-2.5 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))]"
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={activeStepIndex === 0}
            onClick={() => goToStep(activeStepIndex - 1)}
            aria-label="이전 단계"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#4E5968] hover:bg-[#F2F4F6] disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <div
            ref={scrollContainerRef}
            className="flex flex-1 gap-1.5 overflow-x-auto py-1 snap-x"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {steps.map((step, idx) => {
              const isSelected = idx === activeStepIndex;
              return (
                <button
                  key={step.stepNumber ?? idx}
                  type="button"
                  onClick={() => goToStep(idx)}
                  aria-current={isSelected ? "step" : undefined}
                  className={"flex shrink-0 snap-center items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors " + (isSelected ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#6B7684]")}
                >
                  <span className="tabular-nums">{idx + 1}</span>
                  <span className="max-w-[120px] truncate">{step.title}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={isFinalStep}
            onClick={() => goToStep(activeStepIndex + 1)}
            aria-label="다음 단계"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#4E5968] hover:bg-[#F2F4F6] disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </nav>
    </div>
  );
}


