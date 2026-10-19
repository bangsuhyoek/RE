import { useEffect, useState, useMemo, useRef } from "react";
import { DifficultyBadge } from "./DifficultyBadge";
import { DifficultySurvey } from "./DifficultySurvey";
import { CancelAlternativesCard } from "./CancelAlternativesCard";
import { RailCancelCard } from "./RailCancelCard";
import { CancelProofCapture } from "./CancelProofCapture";
import { canJoinRotation } from "../lib/cancelAlternativesView";
import { createCancelSession } from "../lib/cancelDifficulty";
import { getRailCancelPlan, openRailApp } from "../lib/railCancel";
import { platform } from "../lib/platform";
import { BellRing, Check, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { BottomSheet, Button, ServiceMark } from "./ui";
import { formatWon } from "../lib/dates";
import { CancelBrowserModal } from "./CancelBrowserModal";
import { serviceCatalog } from "../data/subscriptionData";
import { getCancelGuide } from "../data/cancelGuides";
import { getCancelPolicy } from "../data/cancelPolicies";
import { getCancelTimingAdvice } from "../lib/cancelTiming";
import { expectedChargeAfterCancel } from "../lib/cancelVerification";
import {
  openCancelBrowser,
  stopFloatingGuide,
  addCancelFlowListener,
  decideCancelTopCard,
  hasMoneyRelevantWarning,
  getCancelGuidanceCopy,
  readCancelAiConsent,
  setCancelAiConsent,
} from "../lib/cancelBrowser";
import { saveCancelProof } from "../lib/cancelProof";
import { CANCEL_CHANNELS, getCancelRoutes, resolvePaymentChannel } from "../lib/cancelRoutes";
import { describeAccountInfoAvailability } from "../lib/businessDays";
import { addCancelReminder } from "../lib/notifications";

const COMPLETE_LABEL = "해지 완료했어요";

const openExternal = (url) => {
  if (!url) return;
  const isHttp = /^https?:\/\//i.test(url);
  if (Capacitor.isNativePlatform() && isHttp) {
    Browser.open({ url }).catch(() => window.open(url, "_blank", "noopener,noreferrer"));
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

// 어카운트인포는 영업일 09:00~22:00에만 해지된다. 시간 밖이면 다음 가능 시각과 다시 알림을 보여준다.
function AccountInfoRoute({ route, subscription, compact = false, onOpened, onToast }) {
  const availability = describeAccountInfoAvailability(new Date());
  const [reminderSet, setReminderSet] = useState(false);

  const remind = async () => {
    const { scheduled } = await addCancelReminder({ subscription, at: availability.nextOpen, routeLabel: "어카운트인포 해지" });
    setReminderSet(true);
    onToast?.(scheduled
      ? `${availability.nextOpenLabel}에 다시 알려드릴게요.`
      : `${availability.nextOpenLabel} 이후 꾸독을 열면 알림 센터에 띄워드릴게요.`);
  };

  const body = (
    <>
      <p className={"text-[12px] leading-relaxed text-[#6B7684] " + (compact ? "mt-2" : "")}>{route.note}</p>
      <div className={"rounded-xl px-3.5 py-3 text-[13px] leading-relaxed " + (availability.open ? "bg-[#F2F8FF] text-[#1B64DA]" : "bg-[#FFF8E6] text-[#8A5A00]") + " mt-2"}>
        {availability.open
          ? "지금 해지 신청할 수 있어요 (오늘 22:00까지)."
          : `지금은 해지 신청 시간이 아니에요. 다음 해지 가능 시각은 ${availability.nextOpenLabel}이에요. 조회는 매일 08:00~24:00에 돼요.`}
        {!availability.holidayDataKnown && " 공휴일이면 그다음 영업일에 다시 시도해 주세요."}
      </div>
      <div className="mt-2 space-y-2">
        {!availability.open && (
          <Button size="large" fullWidth variant={compact ? "secondary" : "primary"} onClick={remind} disabled={reminderSet} prefixIcon={<BellRing size={16} />}>
            {reminderSet ? "다시 알림을 예약했어요" : `${availability.nextOpenLabel}에 다시 알려주기`}
          </Button>
        )}
        <Button
          size="large"
          fullWidth
          variant={availability.open && !compact ? "primary" : "secondary"}
          onClick={() => { openExternal(route.url); onOpened?.(); }}
          prefixIcon={<ExternalLink size={16} />}
        >
          {availability.open ? "어카운트인포 열기" : "어카운트인포에서 미리 조회하기"}
        </Button>
      </div>
    </>
  );

  if (compact) {
    return (
      <details className="rounded-2xl border border-[#E5E8EB] px-3.5 py-3">
        <summary className="cursor-pointer text-[13px] font-bold text-[#333D4B]">{route.label}</summary>
        {body}
      </details>
    );
  }
  return <div>{body}</div>;
}

export function CancelModal({
  subscription: rawSub,
  promotion,
  autoOpen = false,
  onClose,
  onComplete,
  onToast,
  onChannelChange,
  subscriptions = [],
  rotationPlan = null,
  onOpenRotation,
  userId = null,
}) {
  const { subscription, guide, policy, canonicalServiceId } = useMemo(() => {
    const targetName = (rawSub.name || "").toLowerCase().replace(/\s+/g, "");
    const targetId = (rawSub.id || rawSub.subscriptionId || "").toLowerCase();
    const matched = serviceCatalog.find((s) => {
      const sId = (s.id || "").toLowerCase();
      const sName = (s.name || "").toLowerCase().replace(/\s+/g, "");
      return sId === targetId || sName === targetName || targetId.includes(sId) || targetName.includes(sName);
    });
    const resolvedGuide = getCancelGuide(matched?.id || rawSub.id, {
      name: rawSub.name || matched?.name,
      cancelUrl: rawSub.cancelUrl || matched?.cancelUrl || "",
    });
    const canonicalServiceId = matched?.id || rawSub.serviceId || rawSub.id;
    const policy = getCancelPolicy(canonicalServiceId);

    return {
      policy,
      canonicalServiceId,
      guide: resolvedGuide,
      subscription: {
        ...rawSub,
        cancelUrl: resolvedGuide.cancelUrl,
        guideSteps: resolvedGuide.steps,
      },
    };
  }, [rawSub]);

  const [channel, setChannel] = useState(() => resolvePaymentChannel(rawSub));
  const routes = useMemo(
    () => getCancelRoutes({ ...rawSub, paymentChannel: channel }, { serviceCancelUrl: subscription.cancelUrl }),
    [rawSub, channel, subscription.cancelUrl]
  );
  const usesServicePage = routes.primary.kind === "service";
  const isStoreRoute = routes.primary.kind === "google_play" || routes.primary.kind === "app_store";

  const isYearly = subscription.billingCycle === "매년";
  const monthlySavings = isYearly ? Math.round(subscription.amount / 12) : subscription.amount;
  const yearlySavings = isYearly ? subscription.amount : subscription.amount * 12;

  const steps = usesServicePage
    ? subscription.guideSteps.map((s) => ({ title: s.title, description: s.description }))
    : routes.primary.steps.map((description) => ({ title: "", description }));

  const currentPlatform = platform.getName?.() || (Capacitor.isNativePlatform() ? Capacitor.getPlatform() : "web");

  const railPlan = useMemo(() => {
    return getRailCancelPlan({
      subscription: rawSub,
      channel,
      serviceCancelUrl: subscription.cancelUrl,
      platform: currentPlatform,
    });
  }, [rawSub, channel, subscription.cancelUrl, currentPlatform]);

  const [checked, setChecked] = useState(() => new Array(steps.length).fill(false));
  const [celebrating, setCelebrating] = useState(false);
  const [flowStatus, setFlowStatus] = useState(null);
  const [autoDetectedSuccess, setAutoDetectedSuccess] = useState(false);
  const [autoProofPath, setAutoProofPath] = useState(null);
  const [returnedFromCancel, setReturnedFromCancel] = useState(false);
  const [userDismissedQuestion, setUserDismissedQuestion] = useState(false);

  const [cancelSessionActive, setCancelSessionActive] = useState(false);
  const [cancelReminderSet, setCancelReminderSet] = useState(false);
  const [aiCancelConsent, setAiCancelConsentState] = useState(() => readCancelAiConsent(null, userId));

  useEffect(() => {
    setAiCancelConsentState(readCancelAiConsent(null, userId));
  }, [userId]);

  const toggleAiCancelConsent = () => {
    const next = setCancelAiConsent(!aiCancelConsent, null, userId);
    setAiCancelConsentState(next);
  };


  const sessionRef = useRef(null);
  if (!sessionRef.current) {
    sessionRef.current = createCancelSession({
      serviceId: canonicalServiceId,
      stepsTotal: steps.length,
    });
  } else if (sessionRef.current.stepsTotal !== steps.length) {
    sessionRef.current.stepsTotal = steps.length;
  }

  const rotationEligible = useMemo(() => {
    return canJoinRotation({ subscription: rawSub, subscriptions, rotationPlan }).eligible;
  }, [rawSub, subscriptions, rotationPlan]);

  const [cancelledAt, setCancelledAt] = useState(null);

  const stableSubId = rawSub.subscriptionId || rawSub.id || subscription.subscriptionId || subscription.id;
  const proofRecord = useMemo(() => ({
    serviceId: canonicalServiceId,
    recordId: stableSubId,
    subscriptionId: stableSubId,
    serviceName: subscription.name,
    amount: subscription.amount,
    cancelledAt: cancelledAt || new Date().toISOString(),
  }), [canonicalServiceId, stableSubId, subscription.name, subscription.amount, cancelledAt]);

  const timingAdvice = useMemo(
    () => getCancelTimingAdvice({ subscription: { ...rawSub, paymentChannel: channel }, policy }),
    [rawSub, channel, policy]
  );

  const [showBrowserModal, setShowBrowserModal] = useState(() =>
    Boolean(
      autoOpen &&
        !Capacitor.isNativePlatform() &&
        !railPlan &&
        !hasMoneyRelevantWarning(timingAdvice) &&
        subscription.cancelUrl &&
        usesServicePage
    )
  );

  const topCardState = decideCancelTopCard({
    celebrating,
    hasReturnedFromCancel: returnedFromCancel,
    flowStatus,
    cancelSessionActive,
    userDismissedQuestion,
  });

  const expectedNextWatchDate = useMemo(() => {
    const next = expectedChargeAfterCancel(rawSub, cancelledAt ? new Date(cancelledAt) : new Date());
    return next ? (next.getMonth() + 1) + "월 " + next.getDate() + "일" : null;
  }, [rawSub, cancelledAt]);

  const handleScheduleCancelReminder = async () => {
    if (!timingAdvice.reminderAt) return;
    const routeLabel = routes.primary.label || rawSub.name || "해지";
    const isD1 = timingAdvice.kind === "immediate_loss";
    const copy = isD1
      ? { badge: "결제 D-1", title: `[결제 D-1] ${rawSub.name} 내일 결제돼요`, body: "해지하려면 결제 전에 해지를 마쳐 주세요. 눌러서 해지를 이어가세요." }
      : { badge: "갱신 D-7", title: `[갱신 D-7] ${rawSub.name} 갱신 7일 전이에요`, body: "갱신되기 전에 해지할지 정해 주세요. 눌러서 해지를 이어가세요." };
    const { scheduled } = await addCancelReminder({
      subscription: rawSub,
      at: timingAdvice.reminderAt,
      routeLabel,
      ...copy,
    });
    setCancelReminderSet(true);
    const toastMsg = isD1
      ? "결제일 전날 알림을 예약했어요."
      : "해지 알림을 예약했어요.";
    onToast?.(scheduled ? toastMsg : `${toastMsg} (꾸독을 열 때 알림 센터에 띄워드릴게요)`);
  };
  const isNative = Capacitor.isNativePlatform();

  const changeChannel = (next) => {
    setChannel(next);
    onChannelChange?.(rawSub.subscriptionId || rawSub.id, next);
    setChecked([]);
    setCancelSessionActive(false);
    setReturnedFromCancel(false);
    setFlowStatus(null);
  };

  const openStoreRoute = () => {
    sessionRef.current?.incrementStep();
    openExternal(routes.primary.url);
    setCancelSessionActive(true);
    markFirstStepDone();
  };

  // 플러그인 결과 처리 핸들러
  const handleFlowResult = (result) => {
    if (!result) return;
    if (result.status === "completed" || result.action === "COMPLETED") {
      setFlowStatus("completed");
      const path = result.proofWebPath || result.proofPath;
      if (path) {
        setAutoProofPath(path);
        saveCancelProof({
          recordId: stableSubId,
          subscriptionId: stableSubId,
          serviceId: canonicalServiceId,
          serviceName: subscription.name,
          amount: subscription.amount,
          cancelledAt: new Date().toISOString(),
          imageDataUrl: path,
          note: `자동 감지 증빙 (${result.detectedBy === "url" ? "URL 감지" : "텍스트 감지"})`,
        }).catch((err) => console.warn("자동 증빙 저장 실패:", err));
      }
      setAutoDetectedSuccess(true);
      complete();
    } else if (result.status === "closed" || result.action === "CLOSED") {
      setFlowStatus("closed");
      setReturnedFromCancel(true);
      setUserDismissedQuestion(false);
    }
  };

  // 네이티브 이벤트 리스너 등록
  useEffect(() => {
    let active = true;
    let handle;
    addCancelFlowListener((res) => {
      handleFlowResult(res);
    }).then((h) => {
      if (!active) {
        h?.remove?.();
      } else {
        handle = h;
      }
    });
    return () => {
      active = false;
      handle?.remove?.();
    };
  }, [stableSubId, canonicalServiceId, subscription.name, subscription.amount]);

  // 브라우저 복귀 감지
  useEffect(() => {
    let listenerPromise;
    if (Capacitor.isNativePlatform()) {
      listenerPromise = App.addListener("appStateChange", (state) => {
        if (state.isActive && cancelSessionActive) {
          setReturnedFromCancel(true);
          setUserDismissedQuestion(false);
        }
      });
    }
    const handleFocus = () => {
      if (cancelSessionActive) {
        setReturnedFromCancel(true);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      listenerPromise?.then((h) => h.remove?.());
      window.removeEventListener("focus", handleFocus);
    };
  }, [cancelSessionActive]);

  const markFirstStepDone = () => setChecked((current) => {
    if (!current[0]) {
      sessionRef.current?.incrementStep();
    }
    return steps.map((_, i) => (i === 0 ? true : Boolean(current?.[i])));
  });

  const goToCancel = async () => {
    if (!subscription.cancelUrl) return;

    sessionRef.current?.incrementStep();
    setCancelSessionActive(true);
    setUserDismissedQuestion(false);

    if (!isNative) {
      window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
      setShowBrowserModal(true);
      return;
    }

    const res = await openCancelBrowser(
      {
        serviceId: subscription.id,
        serviceName: subscription.name,
        cancelUrl: subscription.cancelUrl,
        guideSteps: subscription.guideSteps,
        aiConsent: aiCancelConsent,
        userId,
      },

      handleFlowResult
    );

    if (res?.status === "completed" || res?.action === "COMPLETED") {
      handleFlowResult(res);
      return;
    }

    if (res?.status === "closed" || res?.action === "CLOSED") {
      handleFlowResult(res);
      return;
    }

    if (res?.action === "FALLBACK_WEB") {
      window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
      setShowBrowserModal(true);
      return;
    }

    markFirstStepDone();
  };

  const openInSystemBrowser = () => {
    if (!subscription.cancelUrl) return;
    sessionRef.current?.incrementStep();
    setCancelSessionActive(true);
    window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
    onToast?.(`${subscription.name} 해지 페이지를 브라우저에서 열었어요.`);
    markFirstStepDone();
  };

  const complete = () => {
    stopFloatingGuide();
    if (!cancelledAt) {
      setCancelledAt(new Date().toISOString());
    }
    setCelebrating(true);
  };

  const revertCompletion = () => {
    setCelebrating(false);
    setFlowStatus("closed");
    setAutoDetectedSuccess(false);
    setAutoProofPath(null);
    setReturnedFromCancel(true);
    setUserDismissedQuestion(false);
  };

  const finish = () => {
    onComplete?.(subscription.subscriptionId, subscription.amount);
    onClose();
  };

  const openPromotion = () => {
    if (promotion?.link) window.open(promotion.link, "_blank", "noopener,noreferrer");
  };

  if (topCardState === "celebration") {
    return (
      <BottomSheet onClose={finish} label="해지 완료">
        <div className="flex flex-col items-center px-2 pb-5 pt-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#191F28] text-white">
            <CheckCircle2 size={28} />
          </span>

          {autoDetectedSuccess && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#E8F5E9] px-3.5 py-1 text-[12px] font-bold text-[#2E7D32]">
              <Check size={14} strokeWidth={3} />
              <span>해지가 끝난 걸 확인했어요</span>
            </div>
          )}

          <p className={"text-[14px] font-semibold text-[#6B7684] " + (autoDetectedSuccess ? "mt-2" : "mt-4")}>
            {subscription.name} 해지 완료
          </p>
          <h2 className="mt-1 text-[24px] font-extrabold tracking-tight text-[#191F28]">
            매달 {formatWon(monthlySavings)} 절약
          </h2>
          <p className="mt-1 text-[14px] font-medium text-[#4E5968]">
            1년이면 {formatWon(yearlySavings)}이에요.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-[#8B95A1]">
            {expectedNextWatchDate
              ? "다음 결제 예정일(" + expectedNextWatchDate + ") 이후 재결제가 없는지 꾸독이 자동으로 지켜볼게요."
              : "구독 목록에서 빼고, 아낀 금액은 통계에 기록해 둘게요."}
          </p>

          {/* 자동 감지 증빙 썸네일 카드 */}
          {autoProofPath && (
            <div className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-[#D6E4FF] bg-[#F2F8FF] p-3 text-left">
              <img
                src={autoProofPath}
                alt="해지 증빙"
                className="h-12 w-12 shrink-0 rounded-xl border border-[#B9D5FF] object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#1B64DA]">
                  <ShieldCheck size={16} />
                  <span>증빙 자동 저장됨</span>
                </div>
                <p className="mt-0.5 text-[11px] text-[#4E5968]">완료 화면을 기기에 안전하게 보관했어요.</p>
              </div>
            </div>
          )}

          {/* 원터치 완료 확인 버튼 */}
          <Button size="large" fullWidth className="mt-5" onClick={finish}>
            확인
          </Button>

          {/* 자동 감지 시 되돌리기 링크 */}
          {autoDetectedSuccess && (
            <button
              type="button"
              onClick={revertCompletion}
              className="mt-3 text-[13px] font-medium text-[#8B95A1] underline underline-offset-4 hover:text-[#4E5968] cursor-pointer"
            >
              아직 안 끝났어요
            </button>
          )}

          {/* 접어둔 피드백 및 수동 증빙 옵션 */}
          <div className="mt-4 w-full">
            <details className="group rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] p-3 text-left">
              <summary className="cursor-pointer text-center text-[12px] font-semibold text-[#6B7684] hover:text-[#333D4B] list-none flex items-center justify-center gap-1">
                <span>{autoProofPath ? "해지가 어려웠다면 알려주기" : "해지 완료 화면 저장하기"}</span>
              </summary>
              <div className="mt-3 border-t border-[#E5E8EB] pt-3">
                {!autoProofPath && <CancelProofCapture record={proofRecord} />}
                {userId && (
                  <DifficultySurvey
                    serviceId={canonicalServiceId}
                    session={sessionRef.current}
                    userId={userId}
                  />
                )}
              </div>
            </details>
          </div>

          {/* 추천 혜택 배너 (확인 버튼 뒤에 배치) */}
          {promotion && (
            <div className="mt-4 w-full rounded-2xl border border-[#E5E8EB] p-3.5 text-left">
              <p className="text-[11px] font-bold text-[#8B95A1]">추천 혜택</p>
              <p className="mt-0.5 text-[13px] font-bold text-[#191F28]">{promotion.title}</p>
              {promotion.link && (
                <button
                  type="button"
                  onClick={openPromotion}
                  className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#3182F6]"
                >
                  자세히 보기 <ExternalLink size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      </BottomSheet>
    );
  }

  if (showBrowserModal) {
    return (
      <CancelBrowserModal
        subscription={subscription}
        guide={guide}
        autoOpened={autoOpen}
        onClose={() => {
          setShowBrowserModal(false);
          setFlowStatus("closed");
          setCancelSessionActive(true);
          setReturnedFromCancel(true);
          setUserDismissedQuestion(false);
        }}
        onComplete={(res) => {
          if (res?.status === "completed" || res?.action === "COMPLETED") {
            handleFlowResult(res);
          } else {
            complete();
          }
        }}
      />
    );
  }

  const hasCancelUrl = Boolean(subscription.cancelUrl);
  const isMoneyWarning = hasMoneyRelevantWarning(timingAdvice);
  // Android 앱에서는 꾸독이 공식 해지 페이지를 열고 해지 버튼을 찾아 마지막 확인 직전까지 진행한다.
  const usesCancelAgent = currentPlatform === "android" && usesServicePage && hasCancelUrl && !railPlan;
  const guidanceCopy = usesCancelAgent
    ? "로그인하면 꾸독이 해지 메뉴를 찾아 대신 넘겨요. 해지 버튼은 누르기 전에 한 번씩 물어볼게요."
    : getCancelGuidanceCopy({
        serviceId: canonicalServiceId,
        channel,
        platform: currentPlatform,
        targetName: subscription.name,
      });

  const timingTone =
    timingAdvice.kind === "keep_until" || timingAdvice.kind === "prorated_refund"
      ? { box: "border-[#D6E4FF] bg-[#F2F8FF]", head: "text-[#1B64DA]", body: "text-[#357AE8]" }
      : isMoneyWarning
      ? { box: "border-[#FFE5B5] bg-[#FFF8E6]", head: "text-[#8A5A00]", body: "text-[#9E6A00]" }
      : { box: "border-[#E5E8EB] bg-white", head: "text-[#333D4B]", body: "text-[#6B7684]" };

  const reminderButton = timingAdvice.reminderAt ? (
    <Button
      size="compact"
      fullWidth
      variant="secondary"
      onClick={handleScheduleCancelReminder}
      disabled={cancelReminderSet}
      prefixIcon={<BellRing size={14} />}
    >
      {cancelReminderSet ? "알림을 예약했어요" : (timingAdvice.reminderLabel || "결제일 전날 알림 받기")}
    </Button>
  ) : null;

  return (
    <BottomSheet onClose={onClose} label="구독 해지 가이드">
      {/* 1. 상단 헤더: 서비스 정보 및 절약액 */}
      <div className="flex items-center gap-3">
        <ServiceMark
          serviceId={subscription.id}
          name={subscription.name}
          monogram={subscription.monogram}
          image={subscription.image || subscription.attachments?.[0]}
          category={subscription.category}
          className="h-12 w-12 rounded-2xl text-[14px] shadow-2xs"
        />
        <div className="min-w-0">
          <h2 className="truncate text-[20px] font-extrabold tracking-tight text-[#191F28]">{subscription.name} 해지</h2>
          <p className="mt-0.5 text-[13px] font-medium text-[#6B7684]">
            월 {formatWon(monthlySavings)} · 해지하면 1년에 <span className="font-bold text-[#3182F6]">{formatWon(yearlySavings)}</span> 아껴요
          </p>
        </div>
      </div>

      {/* 2. 해지하면 바로 손해가 생길 때(잔여일 소멸·위약금)만 위에 경고를 띄운다 */}
      {isMoneyWarning && (
        <div className={"mt-3.5 rounded-2xl border p-3.5 text-left " + timingTone.box} data-testid="cancel-timing-banner">
          <p className={"text-[13px] font-bold leading-snug " + timingTone.head}>{timingAdvice.headline}</p>
          {timingAdvice.detail && (
            <p className={"mt-1 text-[12px] leading-relaxed " + timingTone.body}>{timingAdvice.detail}</p>
          )}
          {reminderButton && <div className="mt-2.5">{reminderButton}</div>}
        </div>
      )}
      {/* 3. 복귀 시 최상단에 뜨는 원터치 확인 질문 카드 */}
      {topCardState === "completion_question" && (
        <div className="mt-3.5 rounded-2xl border-2 border-[#3182F6] bg-[#F2F8FF] p-4 text-left shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-extrabold text-[#191F28]">해지를 끝냈나요?</h3>
            <span className="rounded-full bg-[#3182F6] px-2 py-0.5 text-[11px] font-bold text-white">확인</span>
          </div>
          <p className="mt-1 text-[13px] text-[#4E5968]">
            해지 페이지에서 단계를 마치셨다면 완료를 눌러주세요.
          </p>
          <div className="mt-3.5 flex gap-2">
            <Button size="large" fullWidth onClick={complete} className="flex-1">
              끝났어요
            </Button>
            <Button
              size="large"
              variant="secondary"
              onClick={() => {
                setUserDismissedQuestion(true);
                setReturnedFromCancel(false);
                setFlowStatus(null);
              }}
              className="w-28"
            >
              아직이에요
            </Button>
          </div>
        </div>
      )}

      {/* 4. 결제한 곳 채널 선택 필 (스크롤 없이 상단에 바로 노출) */}
      <div className="mt-3.5">
        <p className="text-[12px] font-bold text-[#8B95A1]">결제한 곳</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="결제한 곳 선택">
          {CANCEL_CHANNELS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={channel === option.id}
              onClick={() => changeChannel(option.id)}
              className={"rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors " + (channel === option.id ? "border-[#191F28] bg-[#191F28] text-white" : "border-[#E5E8EB] bg-white text-[#4E5968] hover:border-[#D1D6DB]")}
            >
              {option.label}
            </button>
          ))}
        </div>
        {(isStoreRoute ? routes.primary.note : routes.note) && (
          <p className="mt-2 text-[12px] leading-relaxed text-[#6B7684]">{isStoreRoute ? routes.primary.note : routes.note}</p>
        )}
      </div>

      {railPlan && (
        <div className="mt-3.5">
          <RailCancelCard
            key={channel}
            plan={railPlan}
            platform={currentPlatform}
            onOpenApp={(rail) => {
              openRailApp(rail, { platform: currentPlatform });
              setCancelSessionActive(true);
              markFirstStepDone();
              sessionRef.current?.incrementStep();
            }}
            onOpenUrl={(url) => {
              openExternal(url);
              setCancelSessionActive(true);
              markFirstStepDone();
              sessionRef.current?.incrementStep();
            }}
            onOpenServiceCancel={() => goToCancel()}
          />
        </div>
      )}

      {/* 5. 주요 액션 버튼 (스크롤 없이 즉시 조작 가능) */}
      <div className="mt-3.5 space-y-2">
        {railPlan ? (
          cancelSessionActive ? (
            <>
              <Button size="large" fullWidth onClick={complete}>{COMPLETE_LABEL}</Button>
              <Button size="large" fullWidth variant="secondary" onClick={goToCancel} prefixIcon={<ExternalLink size={16} />}>
                해지 페이지 다시 열기
              </Button>
            </>
          ) : (
            <Button size="large" fullWidth onClick={complete}>{COMPLETE_LABEL}</Button>
          )
        ) : routes.primary.kind === "card_autopay" ? (
          <>
            <AccountInfoRoute
              route={routes.primary}
              subscription={rawSub}
              onOpened={() => { setCancelSessionActive(true); markFirstStepDone(); sessionRef.current?.incrementStep(); }}
              onToast={onToast}
            />
            <Button size="large" fullWidth variant="secondary" onClick={complete}>{COMPLETE_LABEL}</Button>
          </>
        ) : isStoreRoute ? (
          cancelSessionActive ? (
            <>
              <Button size="large" fullWidth onClick={complete}>{COMPLETE_LABEL}</Button>
              <Button size="large" fullWidth variant="secondary" onClick={openStoreRoute} prefixIcon={<ExternalLink size={16} />}>
                {routes.primary.label.replace(" 열기", "")} 다시 열기
              </Button>
            </>
          ) : (
            <>
              <Button size="large" fullWidth onClick={openStoreRoute} prefixIcon={<ExternalLink size={17} />}>
                {routes.primary.label}
              </Button>
              <Button size="large" fullWidth variant="secondary" onClick={complete}>
                이미 해지했어요
              </Button>
            </>
          )
        ) : !hasCancelUrl ? (
          <>
            <p className="rounded-xl bg-[#F9FAFB] px-3.5 py-3 text-[13px] leading-relaxed text-[#4E5968]">
              해지 페이지 주소가 아직 등록되지 않았어요. 아래 순서대로 {subscription.name} 앱이나 웹사이트에서 해지해 주세요.
            </p>
            <Button size="large" fullWidth onClick={complete}>{COMPLETE_LABEL}</Button>
          </>
        ) : cancelSessionActive ? (
          <>
            <Button size="large" fullWidth onClick={complete}>{COMPLETE_LABEL}</Button>
            <Button size="large" fullWidth variant="secondary" onClick={goToCancel} prefixIcon={<ExternalLink size={16} />}>
              {usesCancelAgent ? "꾸독에게 다시 맡기기" : "해지 페이지 다시 열기"}
            </Button>
          </>
        ) : (
          <>
            <Button
              size="large"
              fullWidth
              onClick={goToCancel}
              prefixIcon={usesCancelAgent ? null : <ExternalLink size={17} />}
            >
              {usesCancelAgent ? "꾸독에게 해지 맡기기" : "해지 페이지 열기"}
            </Button>
            <Button size="large" fullWidth variant="secondary" onClick={complete}>
              이미 해지했어요
            </Button>
          </>
        )}
      </div>

      {hasCancelUrl && isNative && usesServicePage && !railPlan && (
        <button
          type="button"
          onClick={openInSystemBrowser}
          className="mt-2 w-full py-1.5 text-center text-[12px] font-semibold text-[#6B7684] underline-offset-2 hover:underline"
        >
          평소 쓰는 브라우저로 열기
        </button>
      )}

      {usesCancelAgent && (
        <label className="mt-2.5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3 py-2.5 text-left">
          <input
            type="checkbox"
            checked={aiCancelConsent}
            onChange={toggleAiCancelConsent}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#D1D6DB] accent-[#3182F6]"
          />
          <span className="text-[11.5px] leading-snug text-[#4E5968]">
            <strong className="font-bold text-[#333D4B]">AI 해지 도우미 함께 쓰기 (선택)</strong>
            <span className="mt-0.5 block text-[11px] text-[#8B95A1]">
              다음 버튼을 못 찾았을 때만 개인정보를 지운 화면 버튼 이름을 Google Gemini로 보내 확인해요.
            </span>
          </span>
        </label>
      )}

      {routes.secondary.map((route) => (
        <div key={route.kind} className="mt-3">
          {route.kind === "card_autopay" ? (
            <AccountInfoRoute route={route} subscription={rawSub} compact onToast={onToast} />
          ) : route.url ? (
            <Button size="large" fullWidth variant="secondary" onClick={goToCancel} prefixIcon={<ExternalLink size={16} />}>
              {route.label}
            </Button>
          ) : null}
        </div>
      ))}

      {/* 6. 신뢰 및 안내 문구 */}
      <p className="mt-3 text-center text-[12px] leading-relaxed text-[#8B95A1]">
        {guidanceCopy}
      </p>

      {/* 7. 접어둔 "해지 전에 알아두면 좋은 것" 섹션 */}
      <details className="mt-4 rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] p-3.5 text-left">
        <summary className="cursor-pointer text-[13px] font-bold text-[#333D4B]">해지 전에 알아두면 좋은 것</summary>
        <div className="mt-3 space-y-3 border-t border-[#E5E8EB] pt-3">
          <DifficultyBadge serviceId={canonicalServiceId} />

          {!isMoneyWarning && (
            <div className={"rounded-2xl border p-3.5 " + timingTone.box}>
              <p className={"text-[13px] font-bold leading-snug " + timingTone.head}>{timingAdvice.headline}</p>
              {timingAdvice.detail && (
                <p className={"mt-1 text-[12px] leading-relaxed " + timingTone.body}>{timingAdvice.detail}</p>
              )}
              {reminderButton && <div className="mt-3">{reminderButton}</div>}
              {timingAdvice.checkedAt && (
                <p className="mt-2 text-[11px] text-[#8B95A1]">
                  {timingAdvice.checkedAt} 기준 서비스 안내이며 변경될 수 있어요
                  {timingAdvice.sourceUrl && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        onClick={() => openExternal(timingAdvice.sourceUrl)}
                        className="underline underline-offset-2 hover:text-[#4E5968]"
                      >
                        공식 안내
                      </button>
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          <CancelAlternativesCard
            subscription={rawSub}
            serviceId={canonicalServiceId}
            rotationEligible={rotationEligible}
            onOpenRotation={onOpenRotation}
            onOpenUrl={openExternal}
          />

          {promotion && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E5E8EB] bg-white p-3.5">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#8B95A1]">해지 전에 볼 만한 혜택</p>
                <p className="mt-0.5 truncate text-[13px] font-bold text-[#191F28]">{promotion.title}</p>
              </div>
              {promotion.link && (
                <button
                  type="button"
                  onClick={openPromotion}
                  className="shrink-0 rounded-xl bg-[#F2F4F6] px-3 py-1.5 text-[12px] font-bold text-[#333D4B] active:scale-95 transition-transform"
                >
                  보기
                </button>
              )}
            </div>
          )}
        </div>
      </details>

      {/* 8. 해지 순서 단계 */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#191F28]">해지 순서</h3>
          <span className="text-[12px] font-semibold text-[#8B95A1]">{steps.length}단계</span>
        </div>
        <ol className="mt-3 space-y-2">
          {steps.map((step, index) => (
            <li key={index}>
              <button
                type="button"
                aria-pressed={Boolean(checked[index])}
                onClick={() => setChecked((current) => {
                  const willCheck = !current?.[index];
                  if (willCheck) {
                    sessionRef.current?.incrementStep();
                  }
                  return steps.map((_, i) => (i === index ? willCheck : Boolean(current?.[i])));
                })}
                className={"flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors " + (checked[index] ? "border-[#D1D6DB] bg-[#F9FAFB]" : "border-[#E5E8EB] bg-white hover:border-[#D1D6DB]")}
              >
                <span className={"mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold " + (checked[index] ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#8B95A1]")}>
                  {checked[index] ? <Check size={14} strokeWidth={3} /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {step.title && (
                    <span className={"block text-[13px] font-bold " + (checked[index] ? "text-[#8B95A1]" : "text-[#191F28]")}>
                      {step.title}
                    </span>
                  )}
                  <span className={"mt-0.5 block text-[13px] leading-snug " + (checked[index] ? "text-[#8B95A1]" : "text-[#4E5968]")}>
                    {step.description}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ol>

        {!usesServicePage && routes.primary.source && (
          <p className="mt-3 text-[11px] text-[#8B95A1]">
            출처{" "}
            <a href={routes.primary.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              {new URL(routes.primary.source).hostname}
            </a>
            {" "}· 2026-10-04 확인
          </p>
        )}

        {usesServicePage && !guide.verified && (
          <p className="mt-3 text-[12px] leading-relaxed text-[#6B7684]">
            {subscription.name}의 해지 메뉴는 아직 공식 안내로 확인하지 못했어요. 실제 메뉴 이름은 서비스마다 달라요.
            {guide.helpUrl && (
              <>
                {" "}
                <a href={guide.helpUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#3182F6] underline-offset-2 hover:underline">
                  {guide.helpLabel} 보기
                </a>
              </>
            )}
          </p>
        )}

        {usesServicePage && guide.verified && guide.notes.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {guide.notes.map((note) => (
              <li key={note} className="flex gap-2 text-[12px] leading-relaxed text-[#6B7684]">
                <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#B0B8C1]" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        )}

        {usesServicePage && guide.verified && guide.altRoutes.map((route) => (
          <details key={route.id} className="mt-3 rounded-2xl border border-[#E5E8EB] px-3.5 py-3">
            <summary className="cursor-pointer text-[13px] font-bold text-[#333D4B]">{route.label}</summary>
            <ol className="mt-2 space-y-1.5">
              {route.steps.map((step) => (
                <li key={step.stepNumber} className="flex gap-2 text-[12px] leading-relaxed text-[#4E5968]">
                  <span className="shrink-0 font-bold tabular-nums text-[#8B95A1]">{step.stepNumber}</span>
                  <span>{step.description}</span>
                </li>
              ))}
            </ol>
          </details>
        ))}

        {usesServicePage && guide.verified && (
          <p className="mt-3 text-[11px] text-[#8B95A1]">
            출처{" "}
            {guide.sources.map((source, index) => (
              <span key={source}>
                {index > 0 && ", "}
                <a href={source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {new URL(source).hostname}
                </a>
              </span>
            ))}
            {" "}· {guide.checkedAt} 확인
          </p>
        )}
      </section>
    </BottomSheet>
  );
}
