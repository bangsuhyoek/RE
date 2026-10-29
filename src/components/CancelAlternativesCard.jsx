import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw } from "lucide-react";
import { formatWon } from "../lib/dates";
import { getAlternativeOptions } from "../lib/cancelAlternativesView";

/**
 * 해지 전 대안 안내 카드 컴포넌트
 * - 해지를 유도하거나 강요하지 않으며, 솔직하게 더 저렴하게 이용할 수 있는 대안을 안내
 * - 기본적으로 접혀 있으며(collapsed), 클릭 시 펼쳐짐
 * - 옵션이 없고 구독 순환 대상도 아닌 경우 null 렌더링
 */
export function CancelAlternativesCard({
  subscription,
  serviceId,
  rotationEligible = false,
  onOpenRotation,
  onOpenUrl,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const options = getAlternativeOptions({ subscription, serviceId });
  const hasOptions = options.length > 0;

  // 대안 옵션도 없고 순환 플랜 대상도 아니라면 아무것도 표시하지 않음
  if (!hasOptions && !rotationEligible) {
    return null;
  }

  const latestCheckedAt = options.find((opt) => opt.checkedAt)?.checkedAt || "2026-10-16";

  const handleOpenLink = (url) => {
    if (!url) return;
    if (typeof onOpenUrl === "function") {
      onOpenUrl(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3.5 transition-all">
      {/* 헤더: 기본 1줄 요약 접힘 상태 + chevron 토글 */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between text-left cursor-pointer"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[13px] font-bold text-gray-800">
            {hasOptions
              ? `해지 대신 더 저렴하게 쓰는 방법 ${options.length}가지`
              : "구독 순환으로 비용을 아끼는 방법"}
          </span>
        </div>
        <div className="shrink-0 text-ink-tertiary pl-2">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* 펼침 영역 */}
      {isExpanded && (
        <div className="mt-3 border-t border-gray-200 pt-3 space-y-3">
          {/* 대안 목록 */}
          {hasOptions && (
            <ul className="space-y-2.5">
              {options.map((option, idx) => {
                const hasPrice = typeof option.monthlyPrice === "number" && !isNaN(option.monthlyPrice);
                const hasSavings = typeof option.monthlySavings === "number" && option.monthlySavings > 0;

                return (
                  <li
                    key={idx}
                    className="rounded-xl border border-gray-200 bg-white p-3 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[13px] font-bold text-ink leading-snug">
                          {option.title}
                        </h4>
                        <p className="mt-0.5 text-[12px] font-semibold text-brand-ink">
                          {hasPrice ? (
                            <>
                              월 {formatWon(option.monthlyPrice)}
                              {hasSavings && (
                                <span className="text-[#008334] font-medium ml-1">
                                  (지금보다 {formatWon(option.monthlySavings)} 절약)
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-ink-muted">요금 없이 일시 정지/공유</span>
                          )}
                        </p>
                        {option.note && (
                          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                            {option.note}
                          </p>
                        )}
                      </div>

                      {option.sourceUrl && (
                        <button
                          type="button"
                          onClick={() => handleOpenLink(option.sourceUrl)}
                          className="shrink-0 flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-ink-secondary hover:bg-gray-100 cursor-pointer"
                        >
                          <span>공식 안내</span>
                          <ExternalLink size={11} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* 구독 순환(Rotation) 연동 버튼 */}
          {rotationEligible && (
            <div className="rounded-xl border border-brand-line bg-brand-soft p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-brand-ink flex items-center gap-1">
                    <RefreshCw size={14} className="shrink-0" />
                    구독 순환 계획에 넣기
                  </p>
                  <p className="mt-0.5 text-[12px] text-brand-ink leading-relaxed">
                    같은 분야 구독과 한 달씩 번갈아 가며 보면 매달 구독료를 크게 아낄 수 있어요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenRotation}
                  className="shrink-0 rounded-xl bg-brand px-3 py-1.5 text-[12px] font-bold text-white shadow-2xs hover:bg-brand-hover active:scale-95 transition-all cursor-pointer"
                >
                  순환 계획에 넣기
                </button>
              </div>
            </div>
          )}

          {/* 하단 각주 (Footnote) */}
          <p className="text-[11px] leading-relaxed text-ink-tertiary pt-1">
            {latestCheckedAt} 기준 공식 요금이에요. 해지를 막으려는 안내가 아니에요.
          </p>
        </div>
      )}
    </div>
  );
}
