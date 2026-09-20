import React from "react";
import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Gift,
} from "lucide-react";
import { ServiceMark } from "./ui";
import { SavingPeriod } from "../lib/savingsCalculator.js";
import { isNativePlatform } from "../lib/platform.js";
import { HybridRecommendationStatus } from "../features/benefits/domain/hybridRecommendation.js";
import {
  RecommendationSource,
  recommendationConditionLabels,
} from "../features/benefits/presentation/recommendationViewModel.js";

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

function savingLabel(recommendation) {
  const { status, savings } = recommendation;

  if (status === HybridRecommendationStatus.NON_SUBSCRIPTION_RELEVANT) {
    return "구독료 외 추가 혜택";
  }
  if (status === HybridRecommendationStatus.ELIGIBLE_NOT_COMPUTABLE) {
    return "확정 절약액 산정 불가";
  }
  if (status === HybridRecommendationStatus.NEEDS_CHECK && savings?.amount == null) {
    return "조건 확인 후 절약액 계산";
  }
  if (!savings || savings.amount == null) return "절약액 확인 필요";

  const amount = formatWon(savings.amount);
  const labels = {
    [SavingPeriod.MONTHLY_RECURRING]: `매달 ${amount} 절약`,
    [SavingPeriod.ONE_TIME]: `이번에 ${amount} 절약`,
    [SavingPeriod.CAMPAIGN_TOTAL]: `이벤트 전체 ${amount} 절약`,
    [SavingPeriod.ANNUAL]: `연 ${amount} 절약`,
  };
  const label = labels[savings.period] || `${amount} 절약`;
  return status === HybridRecommendationStatus.NEEDS_CHECK
    ? `조건 충족 시 ${label}`
    : label;
}

function statusBadge(status) {
  if (status === HybridRecommendationStatus.ELIGIBLE_CONFIRMED) {
    return {
      icon: CheckCircle2,
      text: "적용 가능",
      className: "bg-emerald-50 text-emerald-700",
    };
  }
  if (status === HybridRecommendationStatus.NEEDS_CHECK) {
    return {
      icon: CircleAlert,
      text: "조건 확인 필요",
      className: "bg-amber-50 text-amber-700",
    };
  }
  if (
    status === HybridRecommendationStatus.ELIGIBLE_NOT_COMPUTABLE ||
    status === HybridRecommendationStatus.NON_SUBSCRIPTION_RELEVANT
  ) {
    return {
      icon: Gift,
      text: "추가 혜택",
      className: "bg-blue-50 text-blue-700",
    };
  }
  return {
    icon: CircleAlert,
    text: "확인 필요",
    className: "bg-gray-100 text-gray-500",
  };
}

export function BenefitRecommendationCard({
  recommendation,
  onOpen,
}) {
  const badge = statusBadge(recommendation.status);
  const BadgeIcon = badge.icon;
  const deadline = deadlineLabel(recommendation.temporal?.end);
  const conditions = recommendationConditionLabels(recommendation).slice(0, 4);
  const sourceLabel =
    recommendation.sourceType === RecommendationSource.TRUSTFIX_V7
      ? "공식 검증 제휴"
      : "기존 제휴 데이터";

  return (
    <article className="rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.035)]">
      <div className="flex items-start gap-3.5">
        <ServiceMark
          serviceId={recommendation.serviceId || "subscription"}
          name={recommendation.serviceName || "구독 서비스"}
          className="h-12 w-12 shrink-0 rounded-[14px] border border-black/5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[16px] font-extrabold text-[#191F28]">
              {recommendation.serviceName || "구독 서비스"}
            </h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${badge.className}`}>
              <BadgeIcon size={11} />
              {badge.text}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-[#8B95A1]">
            {recommendation.servicePlan
              ? `현재 ${recommendation.servicePlan}`
              : sourceLabel}
            {recommendation.currentAmount != null
              ? ` · 월 ${formatWon(recommendation.currentAmount)}`
              : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-[#F8F9FA] p-3.5">
        <div className="text-[11.5px] font-bold text-[#6B7684]">
          {recommendation.partnerName || "공식 제휴"}
        </div>
        <div className="mt-1 text-[15px] font-extrabold leading-snug text-[#333D4B]">
          {recommendation.title}
        </div>
        {recommendation.description && (
          <div className="mt-1 text-[12px] leading-relaxed text-[#6B7684]">
            {recommendation.description}
          </div>
        )}
        <div className="mt-2 text-[16px] font-black text-[#FF6F0F]">
          {savingLabel(recommendation)}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-[#6B7684]">
        {deadline && (
          <span className="inline-flex items-center gap-1 font-bold text-[#E55D00]">
            <Clock3 size={12} />
            {deadline}
          </span>
        )}
        {conditions.map((condition) => (
          <span key={condition}>{condition}</span>
        ))}
      </div>

      {recommendation.sourceUrl && (
        isNativePlatform() ? (
          <button
            type="button"
            onClick={() => onOpen?.(recommendation.actionTarget || recommendation)}
            className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl bg-[#191F28] px-4 py-3 text-[13px] font-bold text-white"
          >
            공식 혜택 확인하기
            <ChevronRight size={15} />
          </button>
        ) : (
          <a
            href={recommendation.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl bg-[#191F28] px-4 py-3 text-[13px] font-bold text-white"
          >
            공식 혜택 확인하기
            <ChevronRight size={15} />
          </a>
        )
      )}
    </article>
  );
}
