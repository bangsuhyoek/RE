import React from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Pencil } from "lucide-react";
import { ServiceMark } from "../ui";
import { formatWon } from "./utils";

export const ReviewSummarySection = React.memo(function ReviewSummarySection({
  needsReview,
  isEditing,
  form,
  matchedService,
  grossAmount,
  validService,
  validAmount,
  validSchedule,
  scheduleSummary,
  onStartEditing,
  onFinishEditing,
  renderEditFields,
  sharingEditor,
}) {
  return (
    <div className="pb-2">
      <div
        className={`mt-2 flex items-center gap-1.5 text-[14px] font-medium ${
          needsReview
            ? "text-danger"
            : "text-ink-secondary"
        }`}
      >
        {needsReview ? (
          <AlertTriangle
            size={15}
          />
        ) : (
          <CheckCircle2
            size={15}
          />
        )}

        <span>
          {needsReview
            ? "일부 정보만 확인해 주세요"
            : "결제 정보를 찾았어요"}
        </span>
      </div>

      {!isEditing ? (
        <>
          <div className="pb-8 pt-8 text-center">
            <ServiceMark
              serviceId={
                form.serviceId ||
                matchedService?.id
              }
              name={form.name}
              monogram={
                form.monogram
              }
              className="mx-auto h-12 w-12"
            />

            <p
              className={`mt-3 text-[16px] font-semibold ${
                validService
                  ? "text-ink"
                  : "text-danger"
              }`}
            >
              {form.name ||
                "서비스 확인 필요"}
            </p>

            <p
              className={`mt-3 text-[30px] font-bold leading-[38px] tabular-nums tracking-[-0.03em] ${
                validAmount
                  ? "text-ink"
                  : "text-danger"
              }`}
            >
              {validAmount
                ? formatWon(
                    grossAmount
                  )
                : "금액 확인 필요"}
            </p>

            <p
              className={`mt-1 text-[14px] ${
                validSchedule
                  ? "text-ink-tertiary"
                  : "text-danger"
              }`}
            >
              {scheduleSummary}
            </p>
          </div>

          <div className="border-t border-gray-100 py-4">
            <p className="mb-1 text-[14px] text-ink-tertiary">
              결제 수단
            </p>

            {form.paymentMethod ? (
              <button
                type="button"
                onClick={onStartEditing}
                className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left"
              >
                <span className="text-[16px] font-medium text-ink">
                  {
                    form.paymentMethod
                  }
                </span>

                <span className="text-[13px] text-ink-tertiary">
                  기록용
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartEditing}
                className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left"
              >
                <span className="text-[16px] font-medium text-ink">
                  어떤 카드에서 결제되는지 기록하기
                </span>

                <ChevronRight
                  size={18}
                  className="text-ink-subtle"
                />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onStartEditing}
            className="flex min-h-[52px] w-full items-center justify-between border-t border-gray-100 py-3 text-left"
          >
            <span className="text-[15px] text-ink-tertiary">
              정보가 다른가요?
            </span>

            <span className="inline-flex items-center gap-0.5 text-[15px] font-medium text-ink">
              수정하기
              <ChevronRight
                size={15}
              />
            </span>
          </button>
        </>
      ) : (
        <div className="pb-5 pt-6">
          {renderEditFields}

          <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-2">
            <span className="inline-flex items-center gap-1.5 text-[14px] text-ink-tertiary">
              <Pencil size={14} />
              정보 수정 중
            </span>

            <button
              type="button"
              onClick={onFinishEditing}
              className="-mr-2 min-h-[44px] px-2 text-[15px] font-semibold text-ink"
            >
              완료
            </button>
          </div>
        </div>
      )}

      {sharingEditor}
    </div>
  );
});

