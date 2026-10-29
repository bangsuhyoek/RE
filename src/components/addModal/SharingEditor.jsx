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
    <section className="border-t border-gray-100 pt-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[16px] font-medium text-ink">
            다른 사람과 함께 이용 중이에요
          </p>

          {enabled && (
            <p className="mt-0.5 text-[13px] text-ink-tertiary">
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
        <div className="mt-4">
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
                  aria-pressed={selected}
                  className={`min-h-[44px] rounded-xl border text-[15px] transition-colors ${
                    selected
                      ? "border-ink bg-ink font-semibold text-white"
                      : "border-gray-200 bg-white font-medium text-ink-secondary"
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
                className="min-h-[52px] w-full rounded-xl border border-transparent bg-gray-100 px-3.5 text-[16px] text-ink outline-none focus:border-gray-300 focus:bg-white"
              />
            </div>
          )}

          <div className="mt-4 divide-y divide-gray-100 border-y border-gray-100 text-[15px]">
            <div className="flex min-h-[44px] items-center justify-between">
              <span className="text-ink-tertiary">
                전체 구독료
              </span>
              <strong className="font-semibold text-ink">
                {formatWon(gross)}
              </strong>
            </div>

            <div className="flex min-h-[44px] items-center justify-between">
              <span className="text-ink-tertiary">
                {shareCount}명 균등 분담 기준
              </span>
              <strong className="font-semibold text-ink">
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
                className="min-h-[52px] w-full rounded-xl border border-transparent bg-gray-100 px-3.5 pr-9 text-right text-[17px] font-semibold tabular-nums text-ink outline-none focus:border-gray-300 focus:bg-white"
              />

              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-tertiary">
                원
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

