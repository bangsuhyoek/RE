import React, { useState } from "react";
import { AlertTriangle, ExternalLink, Smartphone } from "lucide-react";
import { Button } from "./ui";
import { getRailOpenUrl, openRailApp } from "../lib/railCancel";

/**
 * RailCancelCard: 2단계 결제 경로 우선 해지 카드
 *
 * props:
 * - plan: getRailCancelPlan 결과 객체
 * - platform: "android" | "ios" | "web" (Capacitor or web)
 * - onOpenUrl(url): URL 오픈 콜백 (window.open, Capacitor Browser 등)
 */
export function RailCancelCard({ plan, platform = "web", onOpenUrl, onOpenApp, onOpenServiceCancel }) {
  const [selectedCarrier, setSelectedCarrier] = useState(null);

  if (!plan) return null;

  const carrierOptions = plan.carrierOptions;
  // 통신사 선택지는 통신사 미확정 플랜에서만 의미가 있다. 다른 결제 경로 플랜에는 이전 선택을 적용하지 않는다.
  const activeRail = (carrierOptions && selectedCarrier?.rail) || plan.rail;

  const handleOpen = (url) => {
    if (!url) return;
    if (typeof onOpenUrl === "function") {
      onOpenUrl(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenApp = (rail) => {
    if (!rail) return;
    if (typeof onOpenApp === "function") {
      onOpenApp(rail);
    } else {
      openRailApp(rail, { platform });
    }
  };

  const blockStep = plan.blockStep;
  const contractStep = plan.contractStep;

  const displaySteps = activeRail ? activeRail.menuPath : blockStep?.steps || [];
  const displayTitle = activeRail
    ? (activeRail.kind === "carrier" ? "1단계: " + activeRail.name + " 결제 차단" : "1단계: " + activeRail.name + " 자동결제 차단")
    : blockStep?.title;
  const displayEffect = activeRail?.contractEffect || blockStep?.effect;
  const openUrl = activeRail ? getRailOpenUrl(activeRail, platform) : "";

  return (
    <div className="rounded-2xl border border-[#E5E8EB] bg-white p-4 space-y-4 shadow-sm text-left">
      {/* Amber Warning Banner */}
      <div className="rounded-xl bg-[#FFF8E6] border border-[#FFE7B3] p-3 flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[13px] font-semibold text-[#8A5A00] leading-snug">
            결제 경로 우선 해지 안내
          </p>
          <p className="text-[12px] text-[#B45309] leading-relaxed">
            {plan.warning || "결제만 막으면 계약은 남아 있어 미납·연체가 생길 수 있어요. 2단계까지 꼭 진행해 주세요."}
          </p>
        </div>
      </div>

      {/* Carrier Selection if unknown carrier */}
      {carrierOptions && (
        <div className="space-y-2">
          <p className="text-[12px] font-medium text-[#4E5968]">이용 중인 통신사를 선택해 주세요:</p>
          <div className="grid grid-cols-3 gap-2">
            {carrierOptions.map((opt) => {
              const isSelected = activeRail?.id === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedCarrier(opt)}
                  className={
                    "rounded-xl border p-2.5 text-center text-[12px] font-medium transition-colors " +
                    (isSelected
                      ? "border-[#1B64DA] bg-[#E8F3FF] text-[#1B64DA] font-bold"
                      : "border-[#E5E8EB] bg-[#F9FAFB] hover:bg-[#F2F4F6] active:bg-[#E5E8EB] text-[#333D4B]")
                  }
                >
                  {opt.name.replace(/\s*\(.*$/, "")}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 1: Payment Rail Block */}
      <div className="rounded-xl bg-[#F9FAFB] p-3.5 border border-[#F2F4F6] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1B64DA] text-[11px] font-bold text-white">
              1
            </span>
            <h4 className="text-[13px] font-bold text-[#191F28]">{displayTitle}</h4>
          </div>
          {activeRail && (
            <span className="rounded-full bg-[#E8F3FF] px-2 py-0.5 text-[11px] font-semibold text-[#1B64DA]">
              {activeRail.name}
            </span>
          )}
        </div>

        <ol className="space-y-1.5 pl-1">
          {displaySteps.map((step, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[12px] text-[#4E5968] leading-relaxed">
              <span className="text-[#8B95A1] font-mono text-[11px] shrink-0 mt-0.5">{idx + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {displayEffect && (
          <div className="rounded-lg bg-white p-2.5 border border-[#E5E8EB] text-[11px] text-[#6B7684] leading-relaxed">
            💡 {displayEffect}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {activeRail && openUrl && (
            <Button
              size="medium"
              variant="primary"
              className="flex-1 min-w-[120px]"
              onClick={() => (platform === "android" || platform === "ios" ? handleOpenApp(activeRail) : handleOpen(openUrl))}
              prefixIcon={<Smartphone size={14} />}
            >
              {platform === "android" || platform === "ios" ? activeRail.name + " 앱 열기" : activeRail.name + " 관리 바로가기"}
            </Button>
          )}
          {activeRail?.webUrl && openUrl !== activeRail.webUrl && (
            <Button
              size="medium"
              variant="secondary"
              onClick={() => handleOpen(activeRail.webUrl)}
              prefixIcon={<ExternalLink size={14} />}
            >
              웹에서 관리
            </Button>
          )}
          {!activeRail && blockStep?.actions?.map((act, idx) => (
            <Button
              key={idx}
              size="medium"
              variant="primary"
              className="flex-1 min-w-[140px]"
              onClick={() => handleOpen(act.url)}
              prefixIcon={<ExternalLink size={14} />}
            >
              {act.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Step 2: Contract Cancellation at Service */}
      <div className="rounded-xl bg-[#F9FAFB] p-3.5 border border-[#F2F4F6] space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#333D4B] text-[11px] font-bold text-white">
            2
          </span>
          <h4 className="text-[13px] font-bold text-[#191F28]">{contractStep?.title || "2단계: 계약 해지"}</h4>
        </div>

        <ol className="space-y-1.5 pl-1">
          {contractStep?.steps?.map((step, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[12px] text-[#4E5968] leading-relaxed">
              <span className="text-[#8B95A1] font-mono text-[11px] shrink-0 mt-0.5">{idx + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {contractStep?.url ? (
          <Button
            size="medium"
            variant="outline"
            fullWidth
            onClick={() => {
              if (typeof onOpenServiceCancel === "function") {
                onOpenServiceCancel(contractStep.url);
              } else {
                handleOpen(contractStep.url);
              }
            }}
            prefixIcon={<ExternalLink size={14} />}
          >
            서비스 해지 페이지 바로가기
          </Button>
        ) : (
          <div className="rounded-lg bg-white p-2.5 border border-[#E5E8EB] text-[11px] text-[#6B7684]">
            해지 페이지 링크가 등록되어 있지 않아요. 해당 서비스 앱 또는 공식 웹사이트에서 해지를 진행해 주세요.
          </div>
        )}
      </div>

      {/* Footnote */}
      <p className="text-[11px] text-[#8B95A1] text-right">
        {(plan.checkedAt || "2026-10-16") + " 기준 안내예요. 앱 화면은 바뀔 수 있어요."}
      </p>
    </div>
  );
}

export default RailCancelCard;
