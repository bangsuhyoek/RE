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
        className={`mt-4 flex items-center gap-2 text-[12px] font-semibold ${
          needsReview
            ? "text-[#8A5A12]"
            : "text-[#2C6049]"
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
              className="mx-auto h-12 w-12 rounded-[14px] p-2"
            />

            <p
              className={`mt-3 text-[16px] font-semibold ${
                validService
                  ? "text-[#111315]"
                  : "text-[#B42318]"
              }`}
            >
              {form.name ||
                "서비스 확인 필요"}
            </p>

            <p
              className={`mt-4 text-[28px] font-bold tracking-[-0.04em] ${
                validAmount
                  ? "text-[#111315]"
                  : "text-[#B42318]"
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
                  ? "text-[#6B7684]"
                  : "text-[#B42318]"
              }`}
            >
              {scheduleSummary}
            </p>
          </div>

          <div className="border-t border-[#E7EAE8] py-5">
            <p className="mb-2 text-[12px] font-semibold text-[#6B7684]">
              결제 수단
            </p>

            {form.paymentMethod ? (
              <button
                type="button"
                onClick={onStartEditing}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="text-[14px] font-semibold text-[#252A28]">
                  {
                    form.paymentMethod
                  }
                </span>

                <span className="rounded-full bg-[#EAF2ED] px-2 py-1 text-[10px] font-semibold text-[#2C6049]">
                  기록용
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartEditing}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="text-[14px] font-semibold text-[#2C6049]">
                  어떤 카드에서 결제되는지 기록하기
                </span>

                <ChevronRight
                  size={17}
                  className="text-[#2C6049]"
                />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onStartEditing}
            className="flex w-full items-center justify-between border-t border-[#E7EAE8] py-4 text-left"
          >
            <span className="text-[13px] text-[#6B7684]">
              정보가 다른가요?
            </span>

            <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-[#2C6049]">
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

          <div className="mt-5 flex items-center justify-between border-t border-[#E7EAE8] pt-4">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6B7684]">
              <Pencil size={14} />
              정보 수정 중
            </span>

            <button
              type="button"
              onClick={onFinishEditing}
              className="text-[13px] font-bold text-[#2C6049]"
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
