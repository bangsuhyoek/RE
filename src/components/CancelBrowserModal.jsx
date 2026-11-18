import { useState, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import {
  openCancelBrowser,
  isNativeGuideSupported,
  isHttpsUrl,
  canShowManualComplete,
  getStepVisualMeta,
} from "../lib/cancelBrowser";
import { getCommonCancelSteps } from "../data/cancelGuides";
import { X, ExternalLink, ChevronLeft, ChevronRight, Minimize2 } from "lucide-react";

const COMPLETE_LABEL = "해지 완료했어요";

function StepVisualScreen({ visual }) {
  if (!visual) return null;
  const isFinal = Boolean(visual.userMustTap);

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-[#F7F8FA] p-4" data-testid="step-visual-screen">
      <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
        <span className="text-[12px] font-bold text-ink-secondary">{visual.screen}</span>
        <div className="flex items-center gap-1.5">
          {isFinal && (
            <span className="rounded-md bg-[#FFF0F0] px-1.5 py-0.5 text-[10px] font-extrabold text-[#D22030]">
              직접 누르기
            </span>
          )}
          <span className="text-[11px] font-extrabold" style={{ color: visual.brandColor || "#191F28" }}>
            {visual.brandLabel}
          </span>
        </div>
      </div>
      <div
        className={
          "mt-3.5 flex min-h-12 items-center justify-between rounded-xl border-2 bg-white px-3.5 text-[13px] font-bold text-ink shadow-2xs " +
          (isFinal ? "border-[#D22030]" : "border-brand")
        }
      >
        <span>{visual.action}</span>
        <ChevronRight size={16} className={isFinal ? "text-[#D22030]" : "text-brand-ink"} />
      </div>
      <p className={"mt-2.5 text-center text-[11px] font-semibold " + (isFinal ? "text-[#D22030]" : "text-ink-muted")}>
        {visual.note}
      </p>
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

  const steps = subscription.guideSteps?.length > 0
    ? subscription.guideSteps
    : getCommonCancelSteps(subscription.name);

  const showHelpLink = !isNaverPlus && guide && !guide.verified && guide.helpUrl;

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const scrollContainerRef = useRef(null);

  const currentStep = steps[activeStepIndex] || steps[0];
  const isFinalStep = activeStepIndex === steps.length - 1;
  const currentPlatform = Capacitor.getPlatform();
  const canComplete = canShowManualComplete({
    serviceId: subscription.id,
    isNaverPlus,
    platform: currentPlatform,
    isNativePlatform: Capacitor.isNativePlatform(),
  });

  const visualMeta = getStepVisualMeta({
    serviceId: subscription.id,
    serviceName: subscription.name,
    stepNumber: currentStep?.stepNumber || activeStepIndex + 1,
    totalSteps: steps.length,
    step: currentStep,
  });
  const message = visualMeta.dialogue || currentStep.description;
  const progressPercent = Math.round(((activeStepIndex + 1) / Math.max(1, steps.length)) * 100);

  const displayUrl = (() => {
    try {
      return new URL(subscription.cancelUrl).hostname;
    } catch {
      return "";
    }
  })();

  const openWebsite = async () => {
    if (!isHttpsUrl(subscription.cancelUrl)) return;
    const safeCancelUrl = subscription.cancelUrl.trim();

    if (Capacitor.isNativePlatform()) {
      const result = await openCancelBrowser({
        serviceId: subscription.id,
        serviceName: subscription.name,
        cancelUrl: safeCancelUrl,
        guideSteps: steps,
      });
      if (result?.action === "COMPLETED" || result?.status === "completed") {
        onComplete?.(result);
        return;
      }
      if (result?.action !== "FALLBACK_WEB") return;
    }

    window.open(safeCancelUrl, "_blank", "noopener,noreferrer");
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
          className="flex max-w-[240px] items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-left shadow-lg active:scale-[0.97] transition-transform"
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold text-ink-tertiary">{activeStepIndex + 1}/{steps.length}단계</span>
            <span className="block truncate text-[13px] font-bold text-ink">{currentStep.title}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="해지 안내 닫기"
          className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 bg-white text-ink-muted shadow-md"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  const isAndroid = Capacitor.getPlatform() === "android";
  const hasNativeRoute = isNativeGuideSupported(subscription.id);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white select-none animate-in fade-in duration-200">
      <header className="min-h-[calc(52px+env(safe-area-inset-top,0px))] shrink-0 border-b border-gray-100 bg-white px-4 pt-safe flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-ink">{subscription.name} 해지 안내</p>
          {displayUrl && <p className="truncate text-[11px] font-medium text-ink-tertiary">{displayUrl}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="작게 보기"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-gray-100"
          >
            <Minimize2 size={17} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-gray-100"
          >
            <X size={19} />
          </button>
        </div>
      </header>
      <div className="h-1 w-full bg-gray-100">
        <div
          className="h-full bg-brand transition-all duration-300"
          style={{ width: progressPercent + "%" }}
        />
      </div>

      <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
        <div className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center gap-4 pb-4">
          <div className="w-full rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[12px] font-semibold text-brand-ink">
              {activeStepIndex + 1}/{steps.length}단계 · {currentStep.title}
            </p>
            {visualMeta.where && (
              <p className="mt-1 text-[12px] font-medium text-ink-tertiary">위치: {visualMeta.where}</p>
            )}
            <p className="mt-2 text-[14px] font-medium leading-relaxed text-gray-800">{message}</p>
            {visualMeta.tip && (
              <p className="mt-3 border-t border-gray-100 pt-2.5 text-[12px] leading-relaxed text-ink-tertiary">{visualMeta.tip}</p>
            )}
            {showHelpLink && (
              <p className="mt-3 border-t border-gray-100 pt-2.5 text-[12px] leading-relaxed text-ink-tertiary">
                아직 공식 안내로 확인하지 못한 서비스라 공통 안내를 보여드려요.{" "}
                <a href={guide.helpUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-ink">
                  {guide.helpLabel} 보기
                </a>
              </p>
            )}
          </div>

          {visualMeta.preset && <StepVisualScreen visual={visualMeta} />}

          <div className="space-y-2">
            <button
              type="button"
              onClick={openWebsite}
              disabled={!subscription.cancelUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-[14px] font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              해지 페이지 열기 <ExternalLink size={15} />
            </button>
            {canComplete && (
              <button
                type="button"
                onClick={() => onComplete?.()}
                className={"w-full rounded-xl py-3.5 text-[14px] font-bold active:scale-[0.98] transition-transform " + (isFinalStep ? "bg-brand text-white" : "bg-gray-100 text-gray-800")}
              >
                {COMPLETE_LABEL}
              </button>
            )}
          </div>

          <p className="text-center text-[11px] leading-relaxed text-ink-tertiary">
            {isAndroid && hasNativeRoute
              ? "꾸독이 해지 화면까지 데려가요. 마지막 해지 버튼만 직접 눌러 주세요."
              : "꾸독은 비밀번호를 받거나 대신 해지하지 않아요. 마지막 단계는 직접 확인하고 눌러주세요."}
          </p>
        </div>
      </main>

      <nav
        aria-label="해지 단계"
        className="shrink-0 border-t border-gray-100 bg-white px-2 pt-2.5 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))]"
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={activeStepIndex === 0}
            onClick={() => goToStep(activeStepIndex - 1)}
            aria-label="이전 단계"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-secondary hover:bg-gray-100 disabled:opacity-30"
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
                  className={"flex shrink-0 snap-center items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors " + (isSelected ? "bg-gray-900 text-white" : "bg-gray-100 text-ink-muted")}
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
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-secondary hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </nav>
    </div>
  );
}
