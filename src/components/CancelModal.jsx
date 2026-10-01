import { useEffect, useState, useMemo } from "react";
import { Check, CheckCircle2, ExternalLink } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { BottomSheet, Button, ServiceMark } from "./ui";
import { formatWon } from "../lib/dates";
import { CancelBrowserModal } from "./CancelBrowserModal";
import { serviceCatalog } from "../data/subscriptionData";
import { getCancelGuide } from "../data/cancelGuides";
import { openCancelBrowser, stopFloatingGuide } from "../lib/cancelBrowser";

const COMPLETE_LABEL = "해지 완료했어요";

export function CancelModal({ subscription: rawSub, promotion, autoOpen = false, onClose, onComplete, onToast }) {
  // 해지 단계는 공식 자료로 확인한 cancelGuides만 쓴다. 해지 주소는 가이드 → 구독 데이터 → 카탈로그 순서로 고른다.
  const { subscription, guide } = useMemo(() => {
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

    return {
      guide: resolvedGuide,
      subscription: {
        ...rawSub,
        cancelUrl: resolvedGuide.cancelUrl,
        guideSteps: resolvedGuide.steps,
      },
    };
  }, [rawSub]);

  const steps = subscription.guideSteps.map((s) => ({ title: s.title, description: s.description }));

  const [checked, setChecked] = useState(() => new Array(steps.length).fill(false));
  const [celebrating, setCelebrating] = useState(false);
  const [showBrowserModal, setShowBrowserModal] = useState(() => Boolean(autoOpen && subscription.cancelUrl));
  const [cancelSessionActive, setCancelSessionActive] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    let listenerPromise;
    if (Capacitor.isNativePlatform()) {
      listenerPromise = App.addListener("appStateChange", (state) => {
        if (state.isActive && cancelSessionActive) {
          onToast?.(`해지를 마쳤다면 '${COMPLETE_LABEL}'를 눌러주세요.`);
        }
      });
    }
    return () => {
      listenerPromise?.then((h) => h.remove());
    };
  }, [cancelSessionActive, onToast]);

  const markFirstStepDone = () => setChecked((current) => [true, ...current.slice(1)]);

  const goToCancel = async () => {
    if (!subscription.cancelUrl) return;

    setCancelSessionActive(true);
    if (!isNative) {
      window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
      setShowBrowserModal(true);
      return;
    }

    const res = await openCancelBrowser({
      serviceId: subscription.id,
      serviceName: subscription.name,
      cancelUrl: subscription.cancelUrl,
      guideSteps: subscription.guideSteps,
    });

    if (res?.action === "COMPLETED") {
      complete();
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
    setCancelSessionActive(true);
    window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
    onToast?.(`${subscription.name} 해지 페이지를 브라우저에서 열었어요.`);
    markFirstStepDone();
  };

  const complete = () => {
    stopFloatingGuide();
    setCelebrating(true);
  };

  const finish = () => {
    onComplete?.(subscription.subscriptionId, subscription.amount);
    onClose();
  };

  const openPromotion = () => {
    if (promotion?.link) window.open(promotion.link, "_blank", "noopener,noreferrer");
  };

  if (celebrating) {
    return (
      <BottomSheet onClose={finish} label="해지 완료">
        <div className="flex flex-col items-center px-2 pb-5 pt-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#191F28] text-white"><CheckCircle2 size={28} /></span>
          <p className="mt-5 text-[14px] font-semibold text-[#6B7684]">{subscription.name} 해지 완료</p>
          <h2 className="mt-1 text-[24px] font-extrabold tracking-tight text-[#191F28]">매달 {formatWon(subscription.amount)} 절약</h2>
          <p className="mt-1 text-[14px] font-medium text-[#4E5968]">1년이면 {formatWon(subscription.amount * 12)}이에요.</p>
          <p className="mt-3 text-[13px] leading-relaxed text-[#8B95A1]">구독 목록에서 빼고, 아낀 금액은 통계에 기록해 둘게요.</p>
          {promotion && (
            <div className="mt-5 w-full rounded-2xl border border-[#E5E8EB] p-3.5 text-left">
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
          <Button size="large" fullWidth className="mt-6" onClick={finish}>
            확인
          </Button>
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
          setCancelSessionActive(true);
          onToast?.(`해지를 마쳤다면 '${COMPLETE_LABEL}'를 눌러주세요.`);
        }}
        onComplete={complete}
      />
    );
  }

  const hasCancelUrl = Boolean(subscription.cancelUrl);

  return (
    <BottomSheet onClose={onClose} label="구독 해지 가이드">
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
            월 {formatWon(subscription.amount)} · 해지하면 1년에 <span className="font-bold text-[#3182F6]">{formatWon(subscription.amount * 12)}</span> 아껴요
          </p>
        </div>
      </div>

      {promotion && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#E5E8EB] p-3.5">
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

      <div className="mt-5 space-y-2">
        {!hasCancelUrl ? (
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
              해지 페이지 다시 열기
            </Button>
          </>
        ) : (
          <>
            <Button size="large" fullWidth onClick={goToCancel} prefixIcon={<ExternalLink size={17} />}>
              해지 페이지 열기
            </Button>
            <Button size="large" fullWidth variant="secondary" onClick={complete}>
              이미 해지했어요
            </Button>
          </>
        )}
      </div>

      {hasCancelUrl && isNative && (
        <button
          type="button"
          onClick={openInSystemBrowser}
          className="mt-2 w-full py-1.5 text-center text-[12px] font-semibold text-[#6B7684] underline-offset-2 hover:underline"
        >
          평소 쓰는 브라우저로 열기
        </button>
      )}

      <p className="mt-3 text-center text-[12px] leading-relaxed text-[#8B95A1]">
        꾸독은 해지를 대신하지 않아요. {subscription.name} 화면에서 해지가 끝난 걸 확인한 뒤 완료를 눌러주세요.
      </p>

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
                aria-pressed={checked[index]}
                onClick={() => setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))}
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

        {!guide.verified && (
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

        {guide.verified && guide.notes.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {guide.notes.map((note) => (
              <li key={note} className="flex gap-2 text-[12px] leading-relaxed text-[#6B7684]">
                <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#B0B8C1]" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        )}

        {guide.verified && guide.altRoutes.map((route) => (
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

        {guide.verified && (
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
