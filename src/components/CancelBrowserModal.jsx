import { useState, useRef, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { openCancelBrowser } from "../lib/cancelBrowser";
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
    locationBadge: "📍 목표 위치: 마이 멤버십 오른쪽 위 설정(⚙)",
    dialogue: () => "로그인이 필요하면 먼저 로그인해줘. 마이 멤버십이 열리면 오른쪽 위 [설정]을 누르면 돼.",
    tip: "NAVER 공식 안내의 시작점은 '네이버플러스 마이 멤버십 > 오른쪽 위 설정'입니다.",
  },
  {
    locationBadge: "📍 목표 위치: 네이버플러스 멤버십 관리",
    dialogue: () => "설정 화면에서 [네이버플러스 멤버십 관리]를 찾아 눌러줘.",
    tip: "프로필이나 일반 계정 설정이 아니라 '네이버플러스 멤버십 관리' 항목을 선택합니다.",
  },
  {
    locationBadge: "📍 목표 위치: 네이버플러스 멤버십 해지하기",
    dialogue: () => "멤버십 관리 화면에서 [네이버플러스 멤버십 해지하기]를 눌러 다음 화면으로 이동해줘.",
    tip: "이 단계에서는 아직 최종 해지가 완료되지 않습니다.",
  },
  {
    locationBadge: "📍 목표 위치: 정기결제 해지",
    dialogue: () => "이번 이용 기간을 확인하고 [정기결제 해지]를 눌러줘.",
    tip: "다음 결제부터 중단하려는 경우 '멤버십 즉시 종료'가 아니라 '정기결제 해지'를 선택합니다.",
  },
  {
    locationBadge: "📍 목표 위치: 최종 해지하기",
    dialogue: () => "마지막 [해지하기] 버튼은 실제 해지가 실행되는 단계야. 내용 확인 후 직접 선택해줘.",
    tip: "꾸독은 최종 해지 버튼을 대신 누르지 않습니다.",
  },
];

const NAVER_CANCEL_CHARACTER = "/assets/kkudok/cancel_guide_character.png";

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

function StepUiIllustration({ stepNumber, title, serviceName, large = false, isNaverPlus = false }) {
  if (isNaverPlus) {
    return <NaverPlusStepUiIllustration stepNumber={stepNumber} large={large} />;
  }

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

const TUTORIAL_HINTS = [
  {
    locationBadge: "📍 목표 위치: 화면 중앙 로그인 창",
    dialogue: (name) => `${name} 공식 사이트가 열렸어! 먼저 계정으로 로그인해줘. 이미 로그인되어 있다면 바로 2단계로 넘어가자!`,
    tip: "소셜 로그인(Google, 카카오 등)을 사용하는 경우 해당 소셜 계정으로 로그인하세요.",
  },
  {
    locationBadge: "📍 목표 위치: 화면 우측 상단 프로필 / 메뉴 (↗)",
    dialogue: () => `화면 우측 상단(↗)에 있는 프로필 아이콘이나 메뉴(☰)를 눌러서 [계정] 또는 [멤버십 관리] 메뉴를 찾아봐!`,
    tip: "대부분의 서비스는 우측 상단 프로필 > 계정/설정에 구독 관리 메뉴가 위치해 있어요.",
  },
  {
    locationBadge: "📍 목표 위치: 페이지 하단 스크롤 영역 (⬇)",
    dialogue: () => `페이지를 아래(⬇)로 쭉 스크롤해봐! 찾기 어렵게 회색 작은 글씨나 링크로 [멤버십 해지]나 [구독 취소]가 숨겨져 있어. 과감하게 눌러줘!`,
    tip: "해지 버튼은 종종 '혜택 유지' 버튼보다 눈에 덜 띄는 텍스트나 하단 구석에 배치되어 있어요.",
  },
  {
    locationBadge: "📍 목표 위치: 혜택 제안 넘긴 후 최종 완료 팝업 (✓)",
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

  const tutorialHints = isNaverPlus ? NAVER_PLUS_TUTORIAL_HINTS : TUTORIAL_HINTS;
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const scrollContainerRef = useRef(null);
  const currentStep = steps[activeStepIndex] || steps[0];
  const stepHint = tutorialHints[Math.min(activeStepIndex, tutorialHints.length - 1)];

  const isFinalStep = activeStepIndex === steps.length - 1;
  const characterImg = isNaverPlus
    ? NAVER_CANCEL_CHARACTER
    : isFinalStep
      ? "/assets/kkudok/character_done.png"
      : "/assets/kkudok/character_guide.png";

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
            탭하여 튜토리얼 카드 열기
          </p>
        </button>

        {/* 원형 마스코트 플로팅 버튼 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMinimized(false)}
            aria-label="튜토리얼 열기"
            className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-2xl ring-4 ring-white transition-all active:scale-90 hover:scale-105 cursor-pointer animate-tutorial-float overflow-hidden"
          >
            <img
              src={isNaverPlus ? NAVER_CANCEL_CHARACTER : "/assets/kkudok/character_mascot.png"}
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
                {subscription.name} 해지 튜토리얼
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
          {!isNaverPlus && (
            <button
              type="button"
              onClick={onComplete}
              className="rounded-xl bg-[#191F28] px-3 py-1.5 text-[12px] font-bold text-white shadow-xs hover:bg-black active:scale-95 transition-all cursor-pointer"
            >
              해지 완료
            </button>
          )}
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
              serviceName={subscription.name}
              large
              isNaverPlus={isNaverPlus}
            />
          </div>

          {/* 보안 안심 안내 배지 (화면 인식 불가 사유 명시) */}
          <div className="w-full rounded-xl bg-gray-100/90 px-3 py-2 border border-gray-200/60 flex items-center gap-2">
            <ShieldCheck size={16} className="text-gray-500 shrink-0" />
            <p className="text-[10px] text-gray-600 leading-tight">
              <span className="font-bold text-gray-800">보안 안내:</span> 개인정보 및 금융 보안을 위해 외부 웹 화면을 캡처하거나 인식하지 않고 사전 검증된 튜토리얼 경로로 안내합니다.
            </p>
          </div>

          {/* 주요 액션 버튼 */}
          <div className="w-full space-y-2">
            <button
              type="button"
              onClick={openWebsite}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#191F28] py-3 text-[13px] font-bold text-white shadow-xs hover:bg-black active:scale-98 transition-all cursor-pointer"
            >
              <span>{subscription.name} 공식 웹사이트 열기</span>
              <ExternalLink size={14} />
            </button>

            {isFinalStep && !isNaverPlus && (
              <button
                type="button"
                onClick={onComplete}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#3182F6] py-3 text-[13px] font-extrabold text-white shadow-md hover:bg-[#1B64DA] active:scale-98 transition-all cursor-pointer animate-pulse"
              >
                <CheckCircle2 size={16} />
                <span>해지를 완료했습니다 (절약 금액 반영)</span>
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
              튜토리얼 진행 단계
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

