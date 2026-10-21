import React from "react";
import { FieldLabel } from "./FieldLabel";

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, index) => index + 1);

export const BillingScheduleFields = React.memo(function BillingScheduleFields({
  billingCycle,
  dueDay,
  nextBillingDate,
  validSchedule,
  onBillingCycleChange,
  onDueDayChange,
  onNextBillingDateChange,
}) {
  return (
    <div>
      <FieldLabel required>
        결제 일정
      </FieldLabel>

      <div className="grid grid-cols-[112px_1fr] gap-2">
        <select
          value={billingCycle}
          onChange={(event) =>
            onBillingCycleChange(event.target.value)
          }
          className="rounded-xl border border-[#DDE2DF] bg-white px-3 py-3 text-[14px] font-semibold text-[#252A28] outline-none focus:border-[#153D2E]"
        >
          <option value="매월">
            매월
          </option>
          <option value="매년">
            매년
          </option>
        </select>

        {billingCycle === "매월" ? (
          <select
            value={dueDay}
            onChange={(event) =>
              onDueDayChange(event.target.value)
            }
            className={`rounded-xl border bg-white px-3 py-3 text-[14px] text-[#252A28] outline-none focus:border-[#153D2E] ${
              !validSchedule
                ? "border-[#B42318]"
                : "border-[#DDE2DF]"
            }`}
          >
            <option value="">
              결제일 선택
            </option>

            {DAYS_OF_MONTH.map((day) => (
              <option
                key={day}
                value={day}
              >
                {day}일
              </option>
            ))}
          </select>
        ) : (
          <input
            type="date"
            value={nextBillingDate}
            onChange={(event) =>
              onNextBillingDateChange(event.target.value)
            }
            className={`rounded-xl border bg-white px-3 py-3 text-[14px] text-[#252A28] outline-none focus:border-[#153D2E] ${
              !validSchedule
                ? "border-[#B42318]"
                : "border-[#DDE2DF]"
            }`}
          />
        )}
      </div>
    </div>
  );
});
