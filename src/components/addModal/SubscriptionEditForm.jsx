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
  showErrors = {},
  onFieldBlur,
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
      <div data-add-field="service" tabIndex={-1} className="outline-none">
        <div className="flex items-center justify-between">
          <FieldLabel required>
            서비스
          </FieldLabel>

          {!isServicePickerOpen && (
            <button
              type="button"
              onClick={onOpenServicePicker}
              className="-mb-1.5 -mr-2 -mt-3 inline-flex min-h-[44px] items-center gap-0.5 px-2 text-[14px] font-medium text-ink-tertiary"
            >
              변경
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {!customServiceInputOpen ? (
          <div
            className={`flex min-h-[52px] items-center gap-3 rounded-xl border px-3.5 ${
              showErrors.service
                ? "border-danger bg-white"
                : "border-transparent bg-gray-100"
            }`}
          >
            <ServiceMark
              serviceId={
                form.serviceId ||
                matchedService?.id
              }
              name={form.name}
              monogram={form.monogram}
              className="h-8 w-8"
            />

            <span
              className={`min-w-0 flex-1 truncate text-[16px] font-medium ${
                form.name
                  ? "text-ink"
                  : "text-ink-tertiary"
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
            onBlur={() => onFieldBlur?.("service")}
            placeholder="서비스명을 입력해 주세요"
            className={`min-h-[52px] w-full rounded-xl border px-3.5 text-[16px] text-ink outline-none placeholder:text-ink-subtle focus:border-gray-300 focus:bg-white ${
              showErrors.service
                ? "border-danger bg-white"
                : "border-transparent bg-gray-100"
            }`}
          />
        )}

        {isServicePickerOpen && (
          <div className="mt-3 border-y border-gray-100 py-3">
            <ServiceShortcutCarousel
              catalog={catalog}
              selectedId={
                form.serviceId ||
                matchedService?.id
              }
              onSelect={onSelectService}
            />

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[14px] text-ink-tertiary">
                찾는 서비스가 없나요?
              </span>

              <button
                type="button"
                onClick={onCustomServiceClick}
                className="-my-2 -mr-2 min-h-[44px] px-2 text-[14px] font-semibold text-ink"
              >
                + 직접 입력
              </button>
            </div>
          </div>
        )}
      </div>

      <div data-add-field="amount" tabIndex={-1} className="outline-none">
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
            onBlur={() => onFieldBlur?.("amount")}
            className={`min-h-[52px] w-full rounded-xl border px-3.5 pr-9 text-right text-[17px] font-semibold tabular-nums text-ink outline-none placeholder:text-ink-subtle focus:border-gray-300 focus:bg-white ${
              showErrors.amount
                ? "border-danger bg-white"
                : "border-transparent bg-gray-100"
            }`}
          />

          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-tertiary">
            원
          </span>
        </div>
      </div>

      <BillingScheduleFields
        billingCycle={form.billingCycle}
        dueDay={form.dueDay}
        nextBillingDate={form.nextBillingDate}
        showError={Boolean(showErrors.schedule)}
        onBlur={() => onFieldBlur?.("schedule")}
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

        <p className="mt-1.5 text-[13px] leading-[18px] text-ink-tertiary">
          어디에서 구독료가 나가는지 기록하는 용도예요.
        </p>
      </div>
    </div>
  );
});

