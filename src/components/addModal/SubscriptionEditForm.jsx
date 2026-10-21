import React from "react";
import { ChevronRight } from "lucide-react";
import { normalizePaymentMethod } from "../../lib/subscriptionAdd";
import { PaymentMethodTriggerField, ServiceMark } from "../ui";
import { FieldLabel } from "./FieldLabel";
import { ServiceShortcutCarousel } from "./ServiceShortcutCarousel";
import { BillingScheduleFields } from "./BillingScheduleFields";

export const SubscriptionEditForm = React.memo(function SubscriptionEditForm({
  form,
  matchedService,
  catalog,
  validService,
  validAmount,
  validSchedule,
  isServicePickerOpen,
  customServiceInputOpen,
  onOpenServicePicker,
  onSelectService,
  onCustomServiceClick,
  onCustomServiceNameChange,
  onAmountChange,
  onBillingCycleChange,
  onDueDayChange,
  onNextBillingDateChange,
  onPaymentMethodChange,
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <FieldLabel required>
            서비스
          </FieldLabel>

          {!isServicePickerOpen && (
            <button
              type="button"
              onClick={onOpenServicePicker}
              className="mb-1.5 inline-flex items-center gap-0.5 text-[13px] font-semibold text-[#2C6049]"
            >
              변경
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {!customServiceInputOpen ? (
          <div
            className={`flex min-h-[50px] items-center gap-3 rounded-xl border bg-white px-3.5 ${
              !validService
                ? "border-[#B42318]"
                : "border-[#DDE2DF]"
            }`}
          >
            <ServiceMark
              serviceId={
                form.serviceId ||
                matchedService?.id
              }
              name={form.name}
              monogram={form.monogram}
              className="h-8 w-8 rounded-[10px] p-1.5"
            />

            <span
              className={`min-w-0 flex-1 truncate text-[14px] font-semibold ${
                form.name
                  ? "text-[#111315]"
                  : "text-[#8B95A1]"
              }`}
            >
              {form.name ||
                "서비스를 선택해 주세요"}
            </span>
          </div>
        ) : (
          <input
            autoFocus
            value={form.name}
            onChange={(event) => onCustomServiceNameChange(event.target.value)}
            placeholder="서비스명을 입력해 주세요"
            className={`w-full rounded-xl border bg-white px-3.5 py-3 text-[14px] text-[#111315] outline-none focus:border-[#153D2E] focus:ring-[3px] focus:ring-[#153D2E]/[0.08] ${
              !validService
                ? "border-[#B42318]"
                : "border-[#DDE2DF]"
            }`}
          />
        )}

        {isServicePickerOpen && (
          <div className="mt-3 rounded-2xl bg-[#F7F8F6] px-4 py-4">
            <ServiceShortcutCarousel
              catalog={catalog}
              selectedId={
                form.serviceId ||
                matchedService?.id
              }
              onSelect={onSelectService}
            />

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12px] text-[#6B7684]">
                찾는 서비스가 없나요?
              </span>

              <button
                type="button"
                onClick={onCustomServiceClick}
                className="text-[13px] font-semibold text-[#2C6049]"
              >
                + 직접 입력
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <FieldLabel required>
          결제 금액
        </FieldLabel>

        <div className="relative">
          <input
            inputMode="numeric"
            value={form.amount}
            onChange={(event) =>
              onAmountChange(
                event.target.value.replace(
                  /[^0-9]/g,
                  ""
                )
              )
            }
            placeholder="0"
            className={`w-full rounded-xl border bg-white px-3.5 py-3 pr-9 text-right text-[16px] font-bold text-[#111315] outline-none focus:border-[#153D2E] focus:ring-[3px] focus:ring-[#153D2E]/[0.08] ${
              !validAmount
                ? "border-[#B42318]"
                : "border-[#DDE2DF]"
            }`}
          />

          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#6B7684]">
            원
          </span>
        </div>
      </div>

      <BillingScheduleFields
        billingCycle={form.billingCycle}
        dueDay={form.dueDay}
        nextBillingDate={form.nextBillingDate}
        validSchedule={validSchedule}
        onBillingCycleChange={onBillingCycleChange}
        onDueDayChange={onDueDayChange}
        onNextBillingDateChange={onNextBillingDateChange}
      />

      <div>
        <FieldLabel>
          결제 수단
        </FieldLabel>

        <PaymentMethodTriggerField
          value={form.paymentMethod}
          onChange={(value) =>
            onPaymentMethodChange(normalizePaymentMethod(value))
          }
        />

        <p className="mt-1.5 text-[11px] leading-4 text-[#6B7684]">
          어디에서 구독료가 나가는지 기록하는 용도예요.
        </p>
      </div>
    </div>
  );
});
