import React from "react";
import { CheckCircle2, ChevronRight, CircleAlert, Clock3 } from "lucide-react";
import { ServiceMark } from "./ui";
import { BenefitEligibility } from "../lib/benefitMatcher.js";
import { SavingPeriod } from "../lib/savingsCalculator.js";

function formatWon(value) {
  return `₩${Math.round(Number(value) || 0).toLocaleString("ko-KR")}`;
}

function deadlineLabel(endAt) {
  if (!endAt) return null;
  const end = Date.parse(endAt);
  if (!Number.isFinite(end)) return null;
  const diff = Math.ceil((end - Date.now()) / 86400000);
  if (diff < 0) return "종료";
  if (diff === 0) return "오늘 종료";
  return `D-${diff}`;
}

function savingLabel(savings) {
  if (!savings || savings.amount == null) return "절약액 조건 확인 필요";
  const amount = formatWon(savings.amount);
  const labels = {
    [SavingPeriod.MONTHLY_RECURRING]: `매달 ${amount} 절약`,
    [SavingPeriod.ONE_TIME]: `이번에 ${amount} 절약`,
    [SavingPeriod.CAMPAIGN_TOTAL]: `이벤트 전체 ${amount} 절약`,
    [SavingPeriod.ANNUAL]: `연 ${amount} 절약`,
  };
  return labels[savings.period] || `${amount} 절약`;
}
function eligibilityBadge(status) {
  if (status === BenefitEligibility.ELIGIBLE) {
    return {
      icon: CheckCircle2,
      text: "적용 가능",
      className: "bg-emerald-50 text-emerald-700",
    };
  }
  if (status === BenefitEligibility.NEEDS_CHECK) {
    return {
      icon: CircleAlert,
      text: "조건 확인 필요",
      className: "bg-amber-50 text-amber-700",
    };
  }
  return {
    icon: CircleAlert,
    text: "적용 어려움",
    className: "bg-gray-100 text-gray-500",
  };
}

export function PartnershipBenefitCard({
  recommendation,
  onOpen,
}) {
  const { benefit, eligibility, savings } = recommendation;
  const subscription = eligibility.matchedSubscriptions?.[0] || {};
  const serviceId =
    subscription.serviceId ||
    subscription.service_id ||
    subscription.id ||
    benefit.targetServiceIds?.[0] ||
    "subscription";
  const serviceName = subscription.name || benefit.title || "구독 서비스";
  const badge = eligibilityBadge(eligibility.status);
  const BadgeIcon = badge.icon;
  const deadline = deadlineLabel(benefit.endAt);
  const partnerName =
    benefit.partnerName ||
    benefit.partnerId ||
    benefit.subtitle ||
    "공식 제휴";
  const conditional = eligibility.status === BenefitEligibility.NEEDS_CHECK;

  return (
    <article className="rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.035)]">
      <div className="flex items-start gap-3.5">
        <ServiceMark
          serviceId={serviceId}
          name={serviceName}
          className="h-12 w-12 shrink-0 rounded-[14px] border border-black/5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[16px] font-extrabold text-[#191F28]">
              {serviceName}
            </h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${badge.className}`}>
              <BadgeIcon size={11} />
              {badge.text}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-[#8B95A1]">
            현재 {subscription.plan || "요금제 확인 필요"}
            {subscription.amount ? ` · 월 ${formatWon(subscription.amount)}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-[#F8F9FA] p-3.5">
        <div className="text-[11.5px] font-bold text-[#6B7684]">{partnerName}</div>
        <div className="mt-1 text-[15px] font-extrabold leading-snug text-[#333D4B]">
          {benefit.kind || benefit.title}
        </div>
        <div className="mt-2 text-[16px] font-black text-[#FF6F0F]">
          {conditional && savings?.amount != null ? "조건 충족 시 " : ""}
          {savingLabel(savings)}
        </div>
        {benefit.planChangeRequired && (
          <div className="mt-1 text-[11.5px] font-semibold text-[#6B7684]">
            요금제 변경 필요{benefit.targetPlan ? ` · ${benefit.targetPlan}` : ""}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-[#6B7684]">
        {deadline && (
          <span className="inline-flex items-center gap-1 font-bold text-[#E55D00]">
            <Clock3 size={12} />
            {deadline}
          </span>
        )}
        {benefit.requiredPaymentMethod && (
          <span>결제수단: {benefit.requiredPaymentMethod}</span>
        )}
        {benefit.requiredCarrier && (
          <span>통신사: {benefit.requiredCarrier}</span>
        )}
        {benefit.requiredMembership && (
          <span>필요 멤버십: {benefit.requiredMembership}</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onOpen?.(benefit)}
        className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl bg-[#191F28] px-4 py-3 text-[13px] font-bold text-white"
      >
        {conditional ? "조건 확인하기" : "혜택 확인하기"}
        <ChevronRight size={15} />
      </button>
    </article>
  );
}
