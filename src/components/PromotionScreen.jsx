import { useMemo } from "react";
import { BadgeCheck, RefreshCw, Search, WalletCards } from "lucide-react";
import { MacroPerkBlock } from "./MacroPerkBlock";
import { PartnershipBenefitCard } from "./PartnershipBenefitCard";
import {
  BenefitEligibility,
  evaluateBenefitEligibility,
} from "../lib/benefitMatcher.js";
import {
  calculateBenefitSavings,
  SavingPeriod,
  summarizeConfirmedMonthlySavings,
} from "../lib/savingsCalculator.js";

function formatWon(value) {
  return `₩${Math.round(Number(value) || 0).toLocaleString("ko-KR")}`;
}

function isPartnershipBenefit(benefit = {}) {
  const text = [
    benefit.kind,
    benefit.category,
    benefit.title,
    benefit.description,
  ].join(" ");
  return Boolean(
    benefit.partnerType ||
    benefit.partnerId ||
    benefit.providerServiceIds?.length ||
    (benefit.sourceServiceIds || []).length > 1 ||
    /(제휴|결합|번들|캐시백|카드|통신|멤버십|간편결제)/.test(text)
  );
}
function recommendationFor(subscriptions, benefit) {
  const eligibility = evaluateBenefitEligibility(subscriptions, benefit);
  const savings = calculateBenefitSavings(
    subscriptions,
    benefit,
    eligibility
  );
  return { benefit, eligibility, savings };
}

function savingText(savings) {
  if (!savings?.amount) return null;
  const amount = formatWon(savings.amount);
  if (savings.period === SavingPeriod.ANNUAL) return `연 ${amount} 절약`;
  if (savings.period === SavingPeriod.ONE_TIME) return `이번에 ${amount} 절약`;
  if (savings.period === SavingPeriod.CAMPAIGN_TOTAL) {
    return `이벤트 전체 ${amount} 절약`;
  }
  return `매달 ${amount} 절약`;
}

export function PromotionScreen({
  subscriptions = [],
  benefits = [],
  loading = false,
  source = "supabase",
  onOpenPromotion,
  onRefresh,
}) {
  const recommendations = useMemo(
    () => benefits.map((benefit) => recommendationFor(subscriptions, benefit)),
    [benefits, subscriptions]
  );

  const partnershipRecommendations = useMemo(
    () => recommendations.filter((item) => isPartnershipBenefit(item.benefit)),
    [recommendations]
  );
  const eligible = useMemo(
    () => partnershipRecommendations
      .filter((item) =>
        item.eligibility.status === BenefitEligibility.ELIGIBLE &&
        item.savings?.isPositive
      )
      .sort((a, b) => (b.savings.amount || 0) - (a.savings.amount || 0)),
    [partnershipRecommendations]
  );

  const needsCheck = useMemo(
    () => partnershipRecommendations
      .filter((item) =>
        item.eligibility.status === BenefitEligibility.NEEDS_CHECK ||
        (
          item.eligibility.status === BenefitEligibility.ELIGIBLE &&
          item.savings?.amount == null
        )
      )
      .sort((a, b) => (b.savings.amount || 0) - (a.savings.amount || 0)),
    [partnershipRecommendations]
  );

  const otherSavings = useMemo(
    () => recommendations
      .filter((item) =>
        !isPartnershipBenefit(item.benefit) &&
        item.eligibility.status !== BenefitEligibility.INELIGIBLE &&
        item.savings?.isPositive
      )
      .sort((a, b) => (b.savings.amount || 0) - (a.savings.amount || 0)),
    [recommendations]
  );

  const confirmedSummary = useMemo(
    () => summarizeConfirmedMonthlySavings(eligible),
    [eligible]
  );

  if (subscriptions.length === 0) {
    return (
      <main className="px-5 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-5">
        <h1 className="text-[22px] font-black tracking-tight text-[#191F28]">혜택</h1>
        <div className="mt-8 rounded-2xl bg-[#F8F9FA] p-6 text-center">
          <WalletCards size={28} className="mx-auto text-[#8B95A1]" />
          <h2 className="mt-3 text-[16px] font-extrabold text-[#333D4B]">
            구독을 등록하면 절약 방법을 찾아드려요
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#8B95A1]">
            이미 이용 중인 구독을 기준으로 현재 적용 가능한 공식 제휴 이벤트를 확인해요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-5 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-5">
      <div>
        <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#FF6F0F]">
          <BadgeCheck size={14} />
          공식 출처에서 확인된 제휴만 보여드려요
        </div>
        <h1 className="mt-1 text-[22px] font-black tracking-tight text-[#191F28]">
          내 구독에서 지금 아낄 수 있는 방법
        </h1>
      </div>

      <section className="mt-5 rounded-2xl bg-[#191F28] p-4 text-white">
        {loading ? (
          <div className="py-3 text-[13px] font-semibold text-white/75">
            현재 제휴 혜택을 확인하고 있어요.
          </div>
        ) : (
          <>
            <div className="text-[12px] font-bold text-white/65">
              확인된 제휴 혜택 {eligible.length}개
            </div>
            {confirmedSummary.amount > 0 ? (
              <div className="mt-1 text-[24px] font-black tracking-tight">
                매달 {formatWon(confirmedSummary.amount)} 절약 가능
              </div>
            ) : (
              <div className="mt-1 text-[18px] font-extrabold">
                지금 확인할 절약 방법 {needsCheck.length}개
              </div>
            )}
            {needsCheck.length > 0 && (
              <div className="mt-1 text-[11.5px] text-white/65">
                조건 확인이 필요한 제휴 {needsCheck.length}개는 확정 절약액에 포함하지 않았어요.
              </div>
            )}
          </>
        )}
      </section>

      {!loading && benefits.length === 0 && (
        <section className="mt-6 rounded-2xl border border-[#E5E8EB] p-5 text-center">
          <Search size={24} className="mx-auto text-[#8B95A1]" />
          <h2 className="mt-2 text-[15px] font-extrabold text-[#333D4B]">
            지금 확인된 제휴 혜택은 없어요
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#8B95A1]">
            {source === "unconfigured"
              ? "현재 최신 제휴 혜택을 확인할 수 없어요. 잠시 후 다시 확인해 주세요."
              : "꾸독이 공식 제휴 이벤트를 계속 확인하고 있어요."}
          </p>
          {onRefresh && source !== "unconfigured" && (
            <button
              type="button"
              onClick={onRefresh}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#F2F4F6] px-3 py-2 text-[12px] font-bold text-[#4E5968]"
            >
              <RefreshCw size={13} />
              다시 확인하기
            </button>
          )}
        </section>
      )}

      {eligible.length > 0 && (
        <section className="mt-7">
          <h2 className="text-[17px] font-black text-[#191F28]">
            바로 아낄 수 있어요
          </h2>
          <p className="mt-0.5 text-[12px] text-[#8B95A1]">
            현재 구독과 확인된 조건을 기준으로 계산했어요.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {eligible.map((item) => (
              <PartnershipBenefitCard
                key={item.benefit.id}
                recommendation={item}
                onOpen={onOpenPromotion}
              />
            ))}
          </div>
        </section>
      )}

      {needsCheck.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[17px] font-black text-[#191F28]">
            조건을 확인해 주세요
          </h2>
          <p className="mt-0.5 text-[12px] text-[#8B95A1]">
            카드·통신사·멤버십 조건을 확인하면 적용 여부를 알 수 있어요.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {needsCheck.map((item) => (
              <PartnershipBenefitCard
                key={item.benefit.id}
                recommendation={item}
                onOpen={onOpenPromotion}
              />
            ))}
          </div>
        </section>
      )}

      {otherSavings.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[17px] font-black text-[#191F28]">다른 절약 방법</h2>
          <p className="mt-0.5 text-[12px] text-[#8B95A1]">
            제휴 외에도 현재 구독 비용을 줄일 수 있는 방법이에요.
          </p>
          <div className="mt-2 flex flex-col">
            {otherSavings.map((item) => (
              <MacroPerkBlock
                key={item.benefit.id}
                serviceId={item.eligibility.matchedSubscriptions?.[0]?.id}
                serviceName={
                  item.eligibility.matchedSubscriptions?.[0]?.name ||
                  item.benefit.title
                }
                solutionTitle={item.benefit.kind || item.benefit.title}
                description={item.benefit.description}
                savingText={savingText(item.savings)}
                badgeText="다른 절약 방법"
                isDirectMatch
                onAction={() => onOpenPromotion?.(item.benefit)}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
