import { useEffect, useState } from "react";
import { Check, CheckCircle2, ExternalLink, ShieldCheck, Layers, Sparkles } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { BottomSheet, Button, ServiceMark } from "./ui";
import { formatWon } from "../lib/dates";
import { CancelBrowserModal } from "./CancelBrowserModal";
import {
  openCancelBrowser,
  checkOverlayPermission,
  requestOverlayPermission,
  startFloatingGuide,
  stopFloatingGuide,
} from "../lib/cancelBrowser";

const baseSteps = [
  "서비스 계정으로 로그인하기",
  "멤버십 또는 구독 관리 메뉴 열기",
  "해지 신청 후 완료 화면 확인하기",
];

export function CancelModal({ subscription, promotion, onClose, onComplete, onToast }) {
  const [checked, setChecked] = useState([false, false, false]);
  const [celebrating, setCelebrating] = useState(false);
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [cancelSessionActive, setCancelSessionActive] = useState(false);

  useEffect(() => {
    if (!celebrating) return undefined;
    const timer = window.setTimeout(() => {
      onComplete?.(subscription.subscriptionId, subscription.amount);
      onClose();
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [celebrating, onClose, onComplete, subscription.subscriptionId, subscription.amount]);

  useEffect(() => {
    let listenerPromise;
    if (Capacitor.isNativePlatform()) {
      listenerPromise = App.addListener("appStateChange", (state) => {
        if (state.isActive && cancelSessionActive) {
          onToast?.("해지를 완료하셨다면 아래 '해지 완료했습니다' 버튼을 눌러주세요.");
        }
      });
    }
    return () => {
      listenerPromise?.then((h) => h.remove());
    };
  }, [cancelSessionActive, onToast]);

  const goToCancel = async () => {
    if (!subscription.cancelUrl) return;

    setCancelSessionActive(true);
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

    if (res.action === "FALLBACK_WEB") {
      setShowBrowserModal(true);
      return;
    }

    window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
    onToast?.(`${subscription.name} 해지 페이지를 브라우저에서 열었어요.`);
    setChecked((current) => [true, ...current.slice(1)]);
  };

  const proceedWithoutOverlay = async () => {
    setShowPermissionPrompt(false);
    setCancelSessionActive(true);
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
      setShowBrowserModal(true);
      return;
    }
    window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
    onToast?.(`${subscription.name} 해지 페이지를 브라우저에서 열었어요.`);
    setChecked((current) => [true, ...current.slice(1)]);
  };

  const handleRequestPermission = async () => {
    setShowPermissionPrompt(false);
    await requestOverlayPermission();
    onToast?.("권한을 켠 후 다시 [해지 페이지로 바로 이동]을 눌러주세요.");
  };

  const complete = () => {
    stopFloatingGuide();
    setCelebrating(true);
  };

  if (celebrating) {
    return (
      <BottomSheet
        onClose={() => {
          onComplete?.(subscription.subscriptionId, subscription.amount);
          onClose();
        }}
        label="해지 완료"
      >
        <div className="flex flex-col items-center px-2 pb-5 pt-3 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-[#191F28] text-white shadow-md"><CheckCircle2 size={31} /></span>
          <h2 className="mt-5 text-[22px] font-extrabold tracking-tight text-[#191F28]">월 {formatWon(subscription.amount)}<br />절약 성공!</h2>
          <p className="mt-2.5 text-[14px] leading-relaxed text-[#6B7684]">{subscription.name}을 구독 목록에서 정리했어요. 절약한 금액은 다음 달에도 이어서 확인할 수 있어요.</p>
          {promotion && <p className="mt-4 rounded-2xl border border-[#FFE8CC] bg-[#FFF9F2] px-3.5 py-2.5 text-[12px] font-medium text-[#FF6F0F]">다음으로 {promotion.title} 혜택을 확인해 보세요.</p>}
        </div>
      </BottomSheet>
    );
  }

  if (showPermissionPrompt) {
    return (
      <BottomSheet onClose={() => setShowPermissionPrompt(false)} label="플로팅 가이드 안내">
        <div className="flex flex-col items-center px-1 pb-4 pt-2 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#EFF6FF] text-[#3182F6] shadow-2xs mb-3">
            <Layers size={28} />
          </span>
          <h3 className="text-[18px] font-bold tracking-tight text-[#191F28]">
            화면 위에 가이드를 띄울까요?
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-[#6B7684] max-w-[280px]">
            공식 사이트에서 로그인 및 해지하는 동안, 화면 구석에 단계별 팁이 담긴 <span className="font-semibold text-[#191F28]">미니 버블</span>을 띄워 드려요.
          </p>
          <div className="mt-4 w-full rounded-xl bg-[#F9FAFB] p-3.5 text-left border border-[#E5E8EB]">
            <p className="text-[12px] font-bold text-[#191F28] flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#3182F6]" /> '다른 앱 위에 표시' 권한 필요
            </p>
            <p className="mt-1 text-[11px] text-[#8B95A1] leading-relaxed">
              설정 화면으로 이동하여 SubMate 권한을 켜주시면 즉시 플로팅 가이드가 활성화됩니다.
            </p>
          </div>
          <Button size="large" fullWidth className="mt-5" onClick={handleRequestPermission}>
            권한 설정하고 가이드 띄우기
          </Button>
          <button
            type="button"
            onClick={proceedWithoutOverlay}
            className="mt-3.5 text-[12px] font-semibold text-[#6B7684] hover:text-[#191F28] active:scale-95 transition-all"
          >
            권한 없이 일반 브라우저로 이동하기
          </button>
        </div>
      </BottomSheet>
    );
  }

  if (showBrowserModal) {
    return (
      <CancelBrowserModal
        subscription={subscription}
        onClose={() => {
          setShowBrowserModal(false);
          onToast("해지 화면을 닫았어요. 해지를 완료하셨다면 아래 완료 버튼을 눌러주세요.");
        }}
        onComplete={complete}
      />
    );
  }

  return (
    <BottomSheet onClose={onClose} label="구독 해지 가이드">
      <div className="flex items-start gap-3">
        <ServiceMark monogram={subscription.monogram} className="h-12 w-12 rounded-2xl text-[14px] shadow-2xs" />
        <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8B95A1]">Direct cancel</p><h2 className="mt-0.5 truncate text-[20px] font-extrabold tracking-tight text-[#191F28]">{subscription.name} 해지하기</h2><p className="mt-0.5 text-[12px] font-medium text-[#6B7684]">직접 해지 페이지와 단계별 안내를 준비했어요.</p></div>
      </div>

      {promotion && <div className="mt-5 rounded-2xl border border-[#FFE8CC] bg-[#FFF9F2] p-4 shadow-2xs"><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#FF6F0F]">환승 혜택</p><p className="mt-1 text-[13px] font-bold text-[#191F28]">{promotion.title}</p><p className="mt-0.5 text-[12px] text-[#6B7684]">해지 후 혜택 페이지로 이어갈 수 있어요.</p></div>}

      <Button size="large" fullWidth className="mt-5" disabled={!subscription.cancelUrl} onClick={goToCancel} prefixIcon={<ExternalLink size={17} />}>{subscription.cancelUrl ? "해지 페이지로 바로 이동" : "해지 링크를 찾지 못했어요"}</Button>
      {!subscription.cancelUrl && <p className="mt-2 text-center text-[12px] font-medium text-[#FF4D4D]">이 서비스의 해지 URL이 DB에 등록되어 있지 않습니다.</p>}

      <section className="mt-6">
        <div className="flex items-center justify-between"><h3 className="text-[15px] font-bold text-[#191F28]">해지 가이드</h3><span className="text-[12px] font-semibold text-[#8B95A1]">Step 1–3</span></div>
        <ol className="mt-3 space-y-2">
          {baseSteps.map((step, index) => <li key={step}><button type="button" onClick={() => setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))} className={`flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.99] ${checked[index] ? "border-[#191F28] bg-[#F9FAFB] shadow-2xs" : "border-[#E5E8EB] bg-white hover:border-[#D1D6DB]"}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${checked[index] ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#8B95A1]"}`}>{checked[index] ? <Check size={14} strokeWidth={3} /> : index + 1}</span><span className={`text-[13px] ${checked[index] ? "font-bold text-[#191F28]" : "font-medium text-[#6B7684]"}`}>{step}</span></button></li>)}
        </ol>
      </section>

      <div className="mt-6 rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] p-4"><div className="flex gap-2.5"><ShieldCheck className="shrink-0 text-[#6B7684]" size={18} /><p className="text-[12px] leading-relaxed text-[#6B7684]">SubMate는 해지를 대행하지 않아요. 해지 완료 여부는 서비스 화면에서 확인한 뒤 아래 버튼을 눌러주세요.</p></div></div>
      <Button size="large" fullWidth variant="secondary" className="mt-4" onClick={complete}>해지 완료했습니다</Button>
    </BottomSheet>
  );
}
