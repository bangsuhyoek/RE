import React from "react";
import {
  calculateEqualShare,
  parseSubscriptionAmount,
} from "../../lib/subscriptionAdd";
import { ToggleSwitch } from "../ui";
import { FieldLabel } from "./FieldLabel";
import { formatWon } from "./utils";

export const SharingEditor = React.memo(function SharingEditor({
  grossAmount,
  enabled,
  shareCount,
  personalAmount,
  onEnabledChange,
  onShareCountChange,
  onPersonalAmountChange,
}) {
  const gross =
    parseSubscriptionAmount(grossAmount) || 0;

  const equalShare =
    enabled && shareCount >= 2
      ? calculateEqualShare(gross, shareCount)
      : gross;

  return (
    <section className="border-t border-[#E7EAE8] pt-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[14px] font-semibold text-[#252A28]">
            다른 사람과 함께 이용 중이에요
          </p>

          {enabled && (
            <p className="mt-0.5 text-[12px] text-[#6B7684]">
              실제로 내가 부담하는 금액만 지출에 반영해요.
            </p>
          )}
        </div>

        <ToggleSwitch
          checked={enabled}
          onChange={onEnabledChange}
          label="공동 이용 여부"
        />
      </div>

      {enabled && (
        <div className="mt-4 rounded-2xl bg-[#F4F7F5] p-4">
          <FieldLabel>
            함께 이용하는 인원
          </FieldLabel>

          <div className="grid grid-cols-4 gap-2">
            {[2, 3, 4, 5].map((count) => {
              const selected =
                count === 5
                  ? shareCount >= 5
                  : shareCount === count;

              return (
                <button
                  key={count}
                  type="button"
                  onClick={() =>
                    onShareCountChange(count)
                  }
                  className={`h-10 rounded-xl border text-[13px] font-semibold transition-all ${
                    selected
                      ? "border-[#153D2E] bg-[#153D2E] text-white"
                      : "border-[#DDE2DF] bg-white text-[#252A28]"
                  }`}
                >
                  {count === 5
                    ? "5명+"
                    : `${count}명`}
                </button>
              );
            })}
          </div>

          {shareCount >= 5 && (
            <div className="mt-3">
              <FieldLabel>
                총 이용 인원
              </FieldLabel>

              <input
                type="number"
                min="5"
                max="20"
                value={shareCount}
                onChange={(event) =>
                  onShareCountChange(
                    Math.max(
                      5,
                      Math.min(
                        20,
                        Number(event.target.value) ||
                          5
                      )
                    )
                  )
                }
                className="w-full rounded-xl border border-[#DDE2DF] bg-white px-3.5 py-3 text-[14px] text-[#111315] outline-none focus:border-[#153D2E] focus:ring-[3px] focus:ring-[#153D2E]/[0.08]"
              />
            </div>
          )}

          <div className="mt-4 space-y-2.5 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-[#6B7684]">
                전체 구독료
              </span>
              <strong className="font-semibold text-[#252A28]">
                {formatWon(gross)}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6B7684]">
                {shareCount}명 균등 분담 기준
              </span>
              <strong className="font-semibold text-[#252A28]">
                {formatWon(equalShare)}
              </strong>
            </div>
          </div>

          <div className="mt-4">
            <FieldLabel>
              내 실제 부담금
            </FieldLabel>

            <div className="relative">
              <input
                inputMode="numeric"
                value={personalAmount}
                onChange={(event) =>
                  onPersonalAmountChange(
                    event.target.value.replace(
                      /[^0-9]/g,
                      ""
                    )
                  )
                }
                className="w-full rounded-xl border border-[#DDE2DF] bg-white px-3.5 py-3 pr-9 text-right text-[16px] font-bold text-[#153D2E] outline-none focus:border-[#153D2E] focus:ring-[3px] focus:ring-[#153D2E]/[0.08]"
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#6B7684]">
                원
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});
