import { useState, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { openCancelBrowser } from "../lib/cancelBrowser";
import { CHARACTER_MASTER_ASSET } from "../lib/characterAsset";
import {
  Lock,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Minimize2,
  CheckCircle2,
  Compass,
} from "lucide-react";

const NAVER_PLUS_CANCEL_STEPS = [
  {
    stepNumber: 1,
    title: "설정",
    description: "네이버플러스 마이 멤버십 오른쪽 위 [설정]을 누르세요.",
  },
  {
    stepNumber: 2,
    title: "네이버플러스 멤버십 관리",
    description: "설정 화면에서 [네이버플러스 멤버십 관리]를 누르세요.",
  },
  {
    stepNumber: 3,
    title: "네이버플러스 멤버십 해지하기",
    description: "멤버십 관리 화면에서 [네이버플러스 멤버십 해지하기]를 누르세요.",
  },
  {
    stepNumber: 4,
    title: "정기결제 해지",
    description: "이번 이용 기간을 확인한 뒤 [정기결제 해지]를 누르세요.",
  },
  {
    stepNumber: 5,
    title: "해지하기",
    description: "최종 확인 화면의 [해지하기]는 사용자가 직접 눌러야 실제 해지가 완료됩니다.",
  },
];

const NAVER_PLUS_TUTORIAL_HINTS = [
  {
    locationBadge: "📍 지금 확인할 곳: 마이 멤버십 오른쪽 위 설정(⚙)",
    dialogue: () => "로그인이 필요하면 먼저 로그인해줘. 마이 멤버십이 열리면 오른쪽 위 [설정]을 누르면 돼.",
    tip: "NAVER 공식 안내의 시작점은 '네이버플러스 마이 멤버십 > 오른쪽 위 설정'입니다.",
  },
  {
    locationBadge: "📍 지금 확인할 곳: 네이버플러스 멤버십 관리",
    dialogue: () => "설정 화면에서 [네이버플러스 멤버십 관리]를 찾아 눌러줘.",
    tip: "프로필이나 일반 계정 설정이 아니라 '네이버플러스 멤버십 관리' 항목을 선택합니다.",
  },
  {
    locationBadge: "📍 지금 확인할 곳: 네이버플러스 멤버십 해지하기",
    dialogue: () => "멤버십 관리 화면에서 [네이버플러스 멤버십 해지하기]를 눌러 다음 화면으로 이동해줘.",
    tip: "이 단계에서는 아직 최종 해지가 완료되지 않습니다.",
  },
  {
    locationBadge: "📍 지금 확인할 곳: 정기결제 해지",
    dialogue: () => "이번 이용 기간을 확인하고 [정기결제 해지]를 눌러줘.",
    tip: "다음 결제부터 중단하려는 경우 '멤버십 즉시 종료'가 아니라 '정기결제 해지'를 선택합니다.",
  },
  {
    locationBadge: "📍 지금 확인할 곳: 최종 해지하기",
    dialogue: () => "마지막 [해지하기] 버튼은 실제 해지가 실행되는 단계야. 내용 확인 후 직접 선택해줘.",
    tip: "꾸독은 최종 해지 버튼을 대신 누르지 않습니다.",
  },
];

function NaverPlusStepUiIllustration({ stepNumber, large = false }) {
  const config = {
    1: { section: "마이 멤버십", action: "설정 ⚙", note: "오른쪽 위" },
    2: { section: "멤버십 설정", action: "네이버플러스 멤버십 관리", note: "관리 메뉴" },
    3: { section: "멤버십 관리", action: "네이버플러스 멤버십 해지하기", note: "해지 진입" },
    4: { section: "이번 이용 기간 확인", action: "정기결제 해지", note: "다음 결제 중단" },
    5: { section: "최종 확인", action: "해지하기", note: "사용자가 직접 선택" },
  }[stepNumber] || { section: "네이버플러스 멤버십", action: "다음 단계", note: "" };

  return (
    <div className={`h-full w-full bg-[#F7F8FA] p-3.5 flex flex-col justify-between select-none ${large ? "p-6" : ""}`}>
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <span className={`font-extrabold text-[#191F28] ${large ? "text-[12px]" : "text-[9px]"}`}>
          {config.section}
        </span>
        <span className={`font-bold text-[#03C75A] ${large ? "text-[11px]" : "text-[8px]"}`}>
          NAVER+
        </span>
      </div>
      <div className={`my-auto w-full ${large ? "max-w-xs mx-auto" : ""}`}>
        <div className={`rounded-xl border-2 border-[#3182F6] bg-white px-3 font-extrabold text-[#191F28] shadow-sm flex items-center justify-between ${large ? "min-h-12 text-[13px]" : "min-h-7 text-[8px]"}`}>
          <span>{config.action}</span>
          <span className="text-blue-600">▶</span>
        </div>
      </div>
      <span className={`text-center font-semibold text-[#6B7684] ${large ? "text-[11px]" : "text-[8px]"}`}>
        {config.note}
      </span>
    </div>
  );
}

function StepUiIllustration({
  stepNumber,
  title,
  description,
  serviceName,
  large = false,
  isNaverPlus = false,
}) {
  if (isNaverPlus) {
    return <NaverPlusStepUiIllustration stepNumber={stepNumber} large={large} />;
  }

  return (
    <div
      className={`h-full w-full bg-[#F7F8FA] p-3.5 flex flex-col justify-between select-none ${large ? "p-6" : ""}`}
    >
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <span className={`font-extrabold text-[#191F28] ${large ? "text-[12px]" : "text-[9px]"}`}>
          {serviceName} 공식 가이드
        </span>
        <span className={`font-bold text-[#3182F6] ${large ? "text-[11px]" : "text-[8px]"}`}>
          Step {stepNumber}
        </span>
      </div>
      <div className={`my-auto rounded-xl border border-[#DCE4F8] bg-white px-3 py-3 text-left ${large ? "max-w-xs mx-auto w-full" : ""}`}>
        <p className={`font-extrabold text-[#191F28] ${large ? "text-[13px]" : "text-[9px]"}`}>
          {title}
        </p>
        <p className={`mt-1 leading-relaxed text-[#6B7684] ${large ? "text-[11px]" : "text-[7.5px]"}`}>
          {description}
        </p>
      </div>
      <span className={`text-center font-semibold text-[#8B95A1] ${large ? "text-[10px]" : "text-[7px]"}`}>
        실제 버튼 위치는 추정하지 않고 공식 절차만 안내해요
      </span>
    </div>
  );
}

const TUTORIAL_HINTS = [
  {
    locationBadge: "📍 지금 확인할 곳: 화면 중앙 로그인 창",
    dialogue: (name) => `${name} 공식 사이트가 열렸어! 먼저 계정으로 로그인해줘. 이미 로그인되어 있다면 바로 2단계로 넘어가자!`,
    tip: "소셜 로그인(Google, 카카오 등)을 사용하는 경우 해당 소셜 계정으로 로그인하세요.",
  },
  {
    locationBadge: "📍 지금 확인할 곳: 화면 우측 상단 프로필 / 메뉴 (↗)",
    dialogue: () => `화면 우측 상단(↗)에 있는 프로필 아이콘이나 메뉴(☰)를 눌러서 [계정] 또는 [멤버십 관리] 메뉴를 찾아봐!`,
    tip: "대부분의 서비스는 우측 상단 프로필 > 계정/설정에 구독 관리 메뉴가 위치해 있어요.",
  },
  {
    locationBadge: "📍 지금 확인할 곳: 페이지 하단 스크롤 영역 (⬇)",
    dialogue: () => `페이지를 아래(⬇)로 쭉 스크롤해봐! 찾기 어렵게 회색 작은 글씨나 링크로 [멤버십 해지]나 [구독 취소]가 숨겨져 있어. 과감하게 눌러줘!`,
    tip: "해지 버튼은 종종 '혜택 유지' 버튼보다 눈에 덜 띄는 텍스트나 하단 구석에 배치되어 있어요.",
  },
  {
    locationBadge: "📍 지금 확인할 곳: 혜택 제안 넘긴 후 최종 완료 팝업 (✓)",
    dialogue: () => `할인해 주겠다며 붙잡는 혜택 제안들을 넘기고 최종 [해지 완료] 메시지를 확인하면 완벽해! 다 했으면 아래 [해지 완료했습니다]를 눌러줘!`,
    tip: "최종 완료 화면을 확인한 후 아래 '해지 완료했습니다'를 누르면 절약 금액이 반영돼요.",
  },
];

export function CancelBrowserModal({
  subscription,
  onClose,
  onComplete,
  autoOpened = false,
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

  const isNaverPlus =
    subscription.id === "naverplus" ||
    subscription.id === "naver" ||
    subscription.name?.includes("네이버플러스");

  const steps = isNaverPlus
    ? NAVER_PLUS_CANCEL_STEPS
    : (subscription.guideSteps && subscription.guideSteps.length > 0)
      ? subscription.guideSteps
      : defaultSteps;

  const tutorialHints = isNaverPlus
    ? NAVER_PLUS_TUTORIAL_HINTS
    : steps.map((step) => ({
        locationBadge: "📍 공식 페이지 단계 안내",
        dialogue: () => step.description,
        tip: "실제 버튼 위치를 임의로 추정하지 않으며 최종 취소는 사용자가 직접 선택합니다.",
      }));
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const scrollContainerRef = useRef(null);
  const currentStep = steps[activeStepIndex] || steps[0];
  const stepHint = tutorialHints[Math.min(activeStepIndex, tutorialHints.length - 1)];

  const isFinalStep = activeStepIndex === steps.length - 1;
  const characterImg = CHARACTER_MASTER_ASSET;

  const displayUrl = (() => {
    try {
      return new URL(subscription.cancelUrl).hostname;
    } catch {
      return "official-cancel-page";
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
        allowedDomains: subscription.cancellationGuide?.allowedDomains || [],
        guideMode: subscription.cancellationGuide?.guideMode || "MANUAL_OFFICIAL",
        officialSourceUrl: subscription.cancellationGuide?.officialSourceUrl || "",
        fallbackOfficialUrl: subscription.cancellationGuide?.fallbackOfficialUrl || "",
      });
      if (result?.action === "COMPLETED") {
        onComplete?.();
      }
      if (result?.action !== "FALLBACK_WEB") return;
    }

    window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
  };

  const handleNext = () => {
    if (activeStepIndex < steps.length - 1) {
      handleCardClick(activeStepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (activeStepIndex > 0) {
      handleCardClick(activeStepIndex - 1);
    }
  };

  const handleCardClick = (index) => {
    setActiveStepIndex(index);
    if (scrollContainerRef.current) {
      const card = scrollContainerRef.current.children[index];
      if (card) {
        card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  };

  // 플로팅 캐릭터 미니 버블 모드 (최소화 상태)
  if (minimized) {
    return (
      <div className="fixed bottom-6 right-4 z-50 flex items-end gap-2 select-none animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* 캐릭터 말풍선 프리뷰 툴팁 */}
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="rounded-2xl border border-blue-200 bg-white/95 px-3.5 py-2 text-left shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer max-w-[210px]"
        >
          <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
            <Sparkles size={11} />
            <span>꾸독이 해지 가이드</span>
            <span className="rounded bg-blue-100 px-1 text-[9px] font-extrabold">{activeStepIndex + 1}/{steps.length}</span>
          </div>
          <p className="mt-0.5 text-[11px] font-bold text-[#191F28] truncate">
            {currentStep.title}
          </p>
          <p className="text-[10px] text-gray-500 truncate">
            탭하여 해지 안내 열기
          </p>
        </button>

        {/* 원형 마스코트 플로팅 버튼 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMinimized(false)}
            aria-label="해지 안내 열기"
            className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-2xl ring-4 ring-white transition-all active:scale-90 hover:scale-105 cursor-pointer animate-tutorial-float overflow-hidden"
          >
            <img
              src={CHARACTER_MASTER_ASSET}
              alt="꾸독이"
              className="h-13 w-13 object-contain drop-shadow"
            />
            {/* 스텝 번호 배지 */}
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#FF4D4D] text-[11px] font-black text-white shadow-md ring-2 ring-white">
              {activeStepIndex + 1}
            </span>
          </button>
          {/* 닫기 (X) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="가이드 닫기"
            className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-white hover:bg-black shadow-xs cursor-pointer"
          >
            <X size={10} />
          </button>
        </div>
      </div>
    );
  }

  // 전체 화면 게임 튜토리얼 컨시어지 뷰
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white select-none animate-in fade-in duration-200">
      {/* 상단 툴바 헤더 */}
      <header className="min-h-[calc(52px+env(safe-area-inset-top,0px))] shrink-0 border-b border-gray-200 bg-white px-4 pt-safe flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-blue-600">
            <Compass size={16} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-extrabold text-[#191F28] leading-tight truncate">
                {subscription.name} 해지 안내
              </p>
              <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-700">
                컨시어지
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium leading-tight truncate">
              {displayUrl}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 최소화 버튼 */}
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="미니 버블로 최소화"
            className="flex items-center gap-1 rounded-xl bg-gray-100 px-2.5 py-1.5 text-[11px] font-bold text-[#4E5968] hover:bg-gray-200 active:scale-95 transition-all cursor-pointer"
          >
            <Minimize2 size={13} />
            <span className="hidden sm:inline">최소화</span>
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

      {/* 중앙 메인 튜토리얼 스테이지 */}
      <main className="relative flex-1 bg-[#F9FAFB] overflow-y-auto p-4 flex flex-col items-center">
        <div className="w-full max-w-sm flex flex-col items-center gap-3.5 my-auto pb-4">
          
          {/* 게임 튜토리얼 캐릭터 & 말풍선 인터랙션 영역 */}
          <div className="w-full flex items-start gap-3">
            {/* 캐릭터 마스코트 아바타 (통통 튀는 애니메이션) */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="relative">
                <img
                  src={characterImg}
                  alt="꾸독이"
                  className="h-24 w-24 object-contain drop-shadow-md animate-tutorial-float transition-all duration-300"
                />
                <span className="absolute -bottom-1 -right-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow-sm ring-1 ring-white">
                  꾸독이
                </span>
              </div>
            </div>

            {/* 게임 튜토리얼 대화 말풍선 */}
            <div className="relative flex-1 rounded-2xl border border-blue-200/80 bg-white p-3.5 shadow-md">
              {/* 말풍선 꼬리 */}
              <div className="absolute top-6 -left-2 h-3.5 w-3.5 -rotate-45 border-l border-t border-blue-200/80 bg-white" />

              {/* 말풍선 헤더 */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    Step {currentStep.stepNumber}
                  </span>
                  <span className="text-[13px] font-extrabold text-[#191F28]">
                    {currentStep.title}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-gray-400">
                  {activeStepIndex + 1}/{steps.length}
                </span>
              </div>

              {/* 게임 튜토리얼 위치 안내 배지 (화면 인식 대신 직관적 위치 가이드) */}
              <div className="rounded-lg bg-blue-50/80 px-2 py-1 mb-2 border border-blue-100/60">
                <p className="text-[11px] font-bold text-blue-800 leading-tight">
                  {stepHint.locationBadge}
                </p>
              </div>

              {/* 캐릭터 친근한 대사 */}
              <p className="text-[12px] font-semibold text-[#333D4B] leading-relaxed">
                "{stepHint.dialogue(subscription.name)}"
              </p>

              {/* 추가 팁 */}
              <p className="mt-2 text-[11px] text-[#8B95A1] leading-normal border-t border-gray-100 pt-1.5">
                💡 {stepHint.tip}
              </p>
            </div>
          </div>

          {/* 중앙 실제 UI 단계 다이어그램 (표준 UI 와이어프레임) */}
          <div className="w-full h-40 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <StepUiIllustration
              stepNumber={currentStep.stepNumber}
              title={currentStep.title}
              description={currentStep.description}
              serviceName={subscription.name}
              large
              isNaverPlus={isNaverPlus}
            />
          </div>

          {/* 보안 안심 안내 배지 (화면 인식 불가 사유 명시) */}
          <div className="w-full rounded-xl bg-gray-100/90 px-3 py-2 border border-gray-200/60 flex items-center gap-2">
            <ShieldCheck size={16} className="text-gray-500 shrink-0" />
            <p className="text-[10px] text-gray-600 leading-tight">
              <span className="font-bold text-gray-800">보안 안내:</span> 개인정보 및 금융 보안을 위해 외부 웹 화면을 캡처하거나 인식하지 않고 사전 확인된 공식 절차를 기준으로 안내합니다.
            </p>
          </div>

          {subscription.cancellationGuide?.billingChannel === "NETFLIX_OR_BILLING_PARTNER" && (
            <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10.5px] leading-4 text-amber-900">
              Netflix 계정에서 해지 버튼이 보이지 않으면 결제 파트너를 통해 해지해야 할 수 있어요.
            </div>
          )}

          {/* 주요 액션 버튼 */}
          <div className="w-full space-y-2">
            {Capacitor.isNativePlatform() ? (
              <button
                type="button"
                onClick={openWebsite}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#191F28] py-3 text-[13px] font-bold text-white shadow-xs hover:bg-black active:scale-98 transition-all cursor-pointer"
              >
                <span>{subscription.name} 공식 웹사이트 열기</span>
                <ExternalLink size={14} />
              </button>
            ) : (
              <a
                href={subscription.cancelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#191F28] py-3 text-[13px] font-bold text-white shadow-xs hover:bg-black active:scale-98 transition-all"
              >
                <span>{subscription.name} 공식 웹사이트 열기</span>
                <ExternalLink size={14} />
              </a>
            )}

            {subscription.cancellationGuide?.officialSourceUrl && (
              <a
                href={subscription.cancellationGuide.officialSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E5E8EB] bg-white py-2.5 text-[11.5px] font-bold text-[#4E5968]"
              >
                공식 해지 안내 확인
                <ExternalLink size={13} />
              </a>
            )}

            {isFinalStep && !isNaverPlus && (
              <button
                type="button"
                onClick={onComplete}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#3182F6] py-3 text-[13px] font-extrabold text-white shadow-md hover:bg-[#1B64DA] active:scale-98 transition-all cursor-pointer animate-pulse"
              >
                <CheckCircle2 size={16} />
                <span>해지를 완료했어요</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* 하단 가이드 도크 & 단계별 스와이프 컨트롤 */}
      <section className="shrink-0 border-t border-gray-200 bg-white flex flex-col justify-between px-4 pt-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-[#191F28]">
              해지 진행 단계
            </span>
            <span className="rounded-full bg-gray-100 px-1.5 py-0.2 text-[10px] font-bold text-gray-600">
              {activeStepIndex + 1}/{steps.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={activeStepIndex === 0}
              onClick={handlePrev}
              className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            >
              <ChevronLeft size={14} /> 이전
            </button>
            <button
              type="button"
              disabled={activeStepIndex === steps.length - 1}
              onClick={handleNext}
              className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            >
              다음 <ChevronRight size={14} />
            </button>
          </div>
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
                style={{ width: "92px", height: "84px" }}
              >
                <StepUiIllustration
                  stepNumber={step.stepNumber}
                  title={step.title}
                  description={step.description}
                  serviceName={subscription.name}
                  isNaverPlus={isNaverPlus}
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

