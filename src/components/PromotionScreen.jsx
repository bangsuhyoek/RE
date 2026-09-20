import { useMemo } from "react";
import { BadgeCheck, RefreshCw, Search, WalletCards } from "lucide-react";
import { BenefitRecommendationCard } from "./BenefitRecommendationCard";
import { BenefitLoadState } from "../features/benefits/api/fetchState.js";
import {
  buildRecommendationViewModels,
  partitionRecommendationViewModels,
  summarizePublishedConfirmedSavings,
} from "../features/benefits/presentation/recommendationViewModel.js";

function formatWon(value) {
  return `₩${Math.round(Number(value) || 0).toLocaleString("ko-KR")}`;
}

export function PromotionScreen({
  subscriptions = [],
  benefits = [],
  recommendations = null,
  loading = false,
  loadState = null,
  partial = false,
  source = "legacy",
  onOpenPromotion,
  onRefresh,
}) {
  const effectiveRecommendations = useMemo(
    () =>
      Array.isArray(recommendations)
        ? recommendations
        : buildRecommendationViewModels({
            subscriptions,
            legacyBenefits: benefits,
          }),
    [recommendations, subscriptions, benefits]
  );

  const sections = useMemo(
    () => partitionRecommendationViewModels(effectiveRecommendations),
    [effectiveRecommendations]
  );

  const confirmedSummary = useMemo(
    () => summarizePublishedConfirmedSavings(effectiveRecommendations),
    [effectiveRecommendations]
  );

  const portfolioConflictById = useMemo(() => {
    const map = new Map();
    for (const choice of confirmedSummary.exclusiveChoices || []) {
      for (const recommendationId of choice.recommendationIds || []) {
        map.set(recommendationId, {
          type: "EXCLUSIVE_CHOICE",
          choiceLabel: choice.choiceLabel,
          selected: recommendationId === choice.selectedId,
        });
      }
    }
    for (const recommendationId of confirmedSummary.uncertainRecommendationIds || []) {
      if (!map.has(recommendationId)) {
        map.set(recommendationId, {
          type: "UNCERTAIN_COMPATIBILITY",
          selected: confirmedSummary.selected.some(
            (item) => item.id === recommendationId
          ),
        });
      }
    }
    return map;
  }, [confirmedSummary]);

  const visibleCount =
    sections.confirmed.length +
    sections.needsCheck.length +
    sections.optimization.length +
    sections.discovery.length +
    sections.additional.length;

  if (subscriptions.length === 0) {
    return (
      <main className="px-5 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-5">
        <h1 className="text-[22px] font-black tracking-tight text-[#191F28]">
          혜택
        </h1>
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
        ) : loadState === BenefitLoadState.FETCH_FAILED ? (
          <div className="py-3">
            <div className="text-[12px] font-bold text-white/65">
              혜택 조회 상태
            </div>
            <div className="mt-1 text-[18px] font-extrabold">
              최신 혜택 확인 필요
            </div>
          </div>
        ) : (
          <>
            <div className="text-[12px] font-bold text-white/65">
              {confirmedSummary.hasExclusiveChoice
                ? `확정 월 절약 선택지 ${confirmedSummary.candidateCount}개`
                : `확정 월 절약 혜택 ${confirmedSummary.count}개`}
            </div>
            {confirmedSummary.amount > 0 ? (
              <div className="mt-1 text-[24px] font-black tracking-tight">
                {confirmedSummary.hasExclusiveChoice
                  ? `선택 조건 반영 시 매달 최대 ${formatWon(confirmedSummary.amount)} 절약 가능`
                  : `매달 ${formatWon(confirmedSummary.amount)} 절약 가능`}
              </div>
            ) : sections.needsCheck.length > 0 ? (
              <div className="mt-1 text-[18px] font-extrabold">
                지금 확인할 절약 방법 {sections.needsCheck.length}개
              </div>
            ) : sections.optimization.length > 0 ? (
              <div className="mt-1 text-[18px] font-extrabold">
                연간·이용 방식 절약 방법 {sections.optimization.length}개
              </div>
            ) : sections.discovery.length > 0 ? (
              <div className="mt-1 text-[18px] font-extrabold">
                다른 절약 방법 {sections.discovery.length}개를 둘러보세요
              </div>
            ) : (
              <div className="mt-1 text-[18px] font-extrabold">
                현재 확인된 확정 절약액은 없어요
              </div>
            )}
            {confirmedSummary.hasExclusiveChoice && (
              <div className="mt-1 text-[11.5px] text-white/65">
                같은 선택 그룹의 혜택은 하나만 확정 절약액에 반영했어요.
              </div>
            )}
            {confirmedSummary.hasUncertainCompatibility && (
              <div className="mt-1 text-[11.5px] text-white/65">
                동시 적용 관계가 확인되지 않은 혜택은 서로 합산하지 않았어요.
              </div>
            )}
            {(sections.needsCheck.length > 0 || sections.optimization.length > 0 || sections.discovery.length > 0) && (
              <div className="mt-1 text-[11.5px] text-white/65">
                조건부·연간 전환·탐색 혜택은 월 확정 절약액에 포함하지 않았어요.
              </div>
            )}
          </>
        )}
      </section>

      {!loading && partial && loadState !== BenefitLoadState.FETCH_FAILED && (
        <section className="mt-4 rounded-xl border border-[#FFE0C2] bg-[#FFF8F1] px-3.5 py-3 text-[12px] font-semibold text-[#8A4B17]">
          일부 최신 혜택은 확인하지 못했어요. 확인된 혜택만 표시하고 있어요.
        </section>
      )}

      {!loading && loadState === BenefitLoadState.FETCH_FAILED && (
        <section className="mt-6 rounded-2xl border border-[#F2D5C4] bg-[#FFF8F3] p-5 text-center">
          <Search size={24} className="mx-auto text-[#E55D00]" />
          <h2 className="mt-2 text-[15px] font-extrabold text-[#333D4B]">
            최신 혜택을 확인하지 못했어요
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#8B95A1]">
            현재 혜택이 없는 것으로 처리하지 않았어요. 잠시 후 다시 확인해 주세요.
          </p>
          {onRefresh && source !== "unconfigured" && (
            <button
              type="button"
              onClick={onRefresh}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[12px] font-bold text-[#4E5968]"
            >
              <RefreshCw size={13} />
              다시 확인하기
            </button>
          )}
        </section>
      )}

      {!loading &&
        loadState !== BenefitLoadState.FETCH_FAILED &&
        visibleCount === 0 && (
          <section className="mt-6 rounded-2xl border border-[#E5E8EB] p-5 text-center">
            <Search size={24} className="mx-auto text-[#8B95A1]" />
            <h2 className="mt-2 text-[15px] font-extrabold text-[#333D4B]">
              현재 확인된 절약 방법은 없어요
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#8B95A1]">
              꾸독이 공식 제휴 이벤트를 계속 확인하고 있어요.
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

      {sections.confirmed.length > 0 && (
        <section className="mt-7">
          <h2 className="text-[17px] font-black text-[#191F28]">
            바로 아낄 수 있어요
          </h2>
          <p className="mt-0.5 text-[12px] text-[#8B95A1]">
            게시가 확인된 공식 혜택과 현재 구독 조건으로 계산했어요.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {sections.confirmed.map((item) => (
              <BenefitRecommendationCard
                key={item.id}
                recommendation={item}
                portfolioConflict={portfolioConflictById.get(item.id) || null}
                onOpen={onOpenPromotion}
              />
            ))}
          </div>
        </section>
      )}

      {sections.needsCheck.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[17px] font-black text-[#191F28]">
            조건을 확인하면 아낄 수 있어요
          </h2>
          <p className="mt-0.5 text-[12px] text-[#8B95A1]">
            카드·통신사·멤버십 등 아직 모르는 조건을 확인해 주세요.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {sections.needsCheck.map((item) => (
              <BenefitRecommendationCard
                key={item.id}
                recommendation={item}
                onOpen={onOpenPromotion}
              />
            ))}
          </div>
        </section>
      )}

      {sections.optimization.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[17px] font-black text-[#191F28]">
            이용 방법을 바꾸면 더 아낄 수 있어요
          </h2>
          <p className="mt-0.5 text-[12px] text-[#8B95A1]">
            현재 구독의 결제 주기·요금제·번들처럼 확인 가능한 변경안만 보여드려요.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {sections.optimization.map((item) => (
              <BenefitRecommendationCard
                key={item.id}
                recommendation={item}
                onOpen={onOpenPromotion}
              />
            ))}
          </div>
        </section>
      )}

      {sections.discovery.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[17px] font-black text-[#191F28]">
            다른 절약 혜택 둘러보기
          </h2>
          <p className="mt-0.5 text-[12px] text-[#8B95A1]">
            지금 내 구독에는 아니지만, 공식 검증된 구독비 절약 방법이에요.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {sections.discovery.map((item) => (
              <BenefitRecommendationCard
                key={item.id}
                recommendation={item}
                onOpen={onOpenPromotion}
              />
            ))}
          </div>
        </section>
      )}

      {sections.additional.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[17px] font-black text-[#191F28]">
            구독료 외 추가 혜택
          </h2>
          <p className="mt-0.5 text-[12px] text-[#8B95A1]">
            검증됐지만 확정 구독비 절감액으로 합산하지 않은 혜택이에요.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {sections.additional.map((item) => (
              <BenefitRecommendationCard
                key={item.id}
                recommendation={item}
                onOpen={onOpenPromotion}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
