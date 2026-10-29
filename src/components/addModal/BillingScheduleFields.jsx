import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FieldLabel } from "./FieldLabel";
import { SelectSheet } from "../SelectSheet";

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, index) => index + 1);
const CYCLE_OPTIONS = [
  { value: "매월", label: "매월" },
  { value: "매년", label: "매년" },
];
const DAY_OPTIONS = DAYS_OF_MONTH.map((day) => ({ value: String(day), label: `${day}일`, shortLabel: String(day) }));

const triggerClass = (hasError) =>
  `flex min-h-[52px] w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-[16px] text-ink outline-none focus-visible:border-gray-300 ${
    hasError ? "border-danger bg-white" : "border-transparent bg-gray-100"
  }`;

export const BillingScheduleFields = React.memo(function BillingScheduleFields({
  billingCycle,
  dueDay,
  nextBillingDate,
  showError = false,
  onBlur,
  onBillingCycleChange,
  onDueDayChange,
  onNextBillingDateChange,
}) {
  const [openPicker, setOpenPicker] = useState(null);
  const dueDayValue = dueDay === undefined || dueDay === null ? "" : String(dueDay);

  return (
    <div data-add-field="schedule" tabIndex={-1} className="outline-none">
      <FieldLabel required>
        결제 일정
      </FieldLabel>

      <div className="grid grid-cols-[112px_1fr] gap-2">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-label={`결제 주기: ${billingCycle}`}
          onClick={() => setOpenPicker("cycle")}
          className={`${triggerClass(false)} font-medium`}
        >
          <span className="truncate">{billingCycle}</span>
          <ChevronDown size={16} className="shrink-0 text-ink-tertiary" />
        </button>

        {billingCycle === "매월" ? (
          <button
            type="button"
            aria-haspopup="listbox"
            aria-label={`결제일: ${dueDayValue ? `${dueDayValue}일` : "선택 안 됨"}`}
            onClick={() => setOpenPicker("day")}
            className={triggerClass(showError)}
          >
            <span className={`truncate ${dueDayValue ? "" : "text-ink-tertiary"}`}>
              {dueDayValue ? `${dueDayValue}일` : "결제일 선택"}
            </span>
            <ChevronDown size={16} className="shrink-0 text-ink-tertiary" />
          </button>
        ) : (
          <input
            type="date"
            value={nextBillingDate}
            onChange={(event) =>
              onNextBillingDateChange(event.target.value)
            }
            onBlur={onBlur}
            className={`min-h-[52px] rounded-xl border px-3.5 text-[16px] text-ink outline-none focus:border-gray-300 focus:bg-white ${
              showError
                ? "border-danger bg-white"
                : "border-transparent bg-gray-100"
            }`}
          />
        )}
      </div>

      {openPicker === "cycle" && (
        <SelectSheet
          title="결제 주기"
          options={CYCLE_OPTIONS}
          value={billingCycle}
          onSelect={onBillingCycleChange}
          onClose={() => setOpenPicker(null)}
        />
      )}
      {openPicker === "day" && (
        <SelectSheet
          title="결제일"
          options={DAY_OPTIONS}
          columns={7}
          value={dueDayValue}
          onSelect={onDueDayChange}
          onClose={() => {
            setOpenPicker(null);
            onBlur?.();
          }}
        />
      )}
    </div>
  );
});

