import React, { useState } from "react";
import { ChevronRight, X, ArrowLeft, Plus, Check } from "lucide-react";
import {
  getPaymentMethodInfo,
  PAYMENT_PRESETS,
  SIMPLE_PAY_METHODS,
  CARD_COMPANIES,
} from "../lib/paymentMethod";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export { getPaymentMethodInfo, PAYMENT_PRESETS, SIMPLE_PAY_METHODS, CARD_COMPANIES };

export const BRAND_IMAGES = {
  hyundai: "/assets/payments/hyundai.svg",
  shinhan: "/assets/payments/shinhan.svg",
  kb: "/assets/payments/kb.svg",
  samsung: "/assets/payments/samsung.svg",
  lotte: "/assets/payments/lotte.svg",
  woori: "/assets/payments/woori.svg",
  hana: "/assets/payments/hana.svg",
  nh: "/assets/payments/nh.svg",
  bc: "/assets/payments/bc.svg",
  tosspay: "/assets/payments/tosspay.svg",
  naverpay: "/assets/payments/naverpay.svg",
  kakaopay: "/assets/payments/kakaopay.svg",
  applepay: "/assets/payments/applepay.svg",
  payco: "/assets/payments/payco.svg",
  paypal: "/assets/payments/paypal.svg",
  bank: "/assets/payments/bank.svg",
  card: "/assets/payments/card.svg",
};

export function PaymentIcon({ method, brand, size = 16, className = "" }) {
  const resolvedBrand = brand || getPaymentMethodInfo(method).brand;
  const imgSrc = BRAND_IMAGES[resolvedBrand] || (resolvedBrand !== "none" ? BRAND_IMAGES.card : null);
  const w = Math.round(size * 1.375);

  if (imgSrc) {
    return (
      <span
        style={{ width: w, height: size }}
        className={cx(
          "inline-flex items-center justify-center rounded-[3px] bg-white border border-[#E5E8EB] p-0.5 shrink-0 overflow-hidden shadow-2xs",
          className
        )}
      >
        <img
          src={imgSrc}
          alt={resolvedBrand}
          className="h-full w-full object-contain pointer-events-none select-none"
        />
      </span>
    );
  }

  return (
    <span
      style={{ width: w, height: size }}
      className={cx(
        "inline-flex items-center justify-center rounded-[3px] border border-dashed border-[#D1D6DB] bg-[#F8F9FA] shrink-0 text-[#8B95A1] text-[10px] font-bold select-none",
        className
      )}
    >
      —
    </span>
  );
}

export function PaymentMethodBadge({
  method,
  size = 15,
  showText = true,
  className = "",
  textClassName = "",
}) {
  const info = getPaymentMethodInfo(method);

  if (!info.isRegistered && !showText) {
    return <PaymentIcon brand="none" size={size} className={className} />;
  }

  return (
    <span className={cx("inline-flex items-center gap-1.5 align-middle", className)}>
      <PaymentIcon brand={info.brand} size={size} />
      {showText && (
        <span className={cx("truncate", textClassName)}>
          {info.fullLabel}
        </span>
      )}
    </span>
  );
}

/**
 * Toss-style Circular Brand Logo for 3-Column Financial Grid using Real Images
 */
export function BrandCircleIcon({ brand, size = 48, className = "" }) {
  const imgSrc = BRAND_IMAGES[brand] || BRAND_IMAGES.card;

  return (
    <div
      style={{ width: size, height: size }}
      className={cx(
        "grid place-items-center rounded-2xl bg-[#F7F8F9] border border-[#E5E8EB] p-1 shrink-0 shadow-2xs overflow-hidden transition-transform group-hover:scale-105",
        className
      )}
    >
      <img
        src={imgSrc}
        alt={brand}
        className="h-full w-full object-contain pointer-events-none select-none rounded-xl"
        loading="lazy"
      />
    </div>
  );
}

/**
 * Toss-style Financial Institution Selector Bottom Sheet Modal
 */
export function PaymentMethodPickerModal({
  isOpen,
  onClose,
  value = "",
  onSelect,
}) {
  const [tab, setTab] = useState("card"); // "card" | "simple"
  const [isCustom, setIsCustom] = useState(false);
  const [customText, setCustomText] = useState("");

  const handleSelect = (methodName) => {
    onSelect(methodName);
    resetAndClose();
  };

  const handleFinishCustom = () => {
    const trimmed = customText.trim();
    if (trimmed) {
      onSelect(trimmed);
    }
    resetAndClose();
  };

  const resetAndClose = () => {
    setIsCustom(false);
    setCustomText("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-full sm:max-w-[440px] rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl transition-all max-h-[85vh] max-h-[85dvh] flex flex-col overflow-hidden pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F2F4F6] px-5 py-4">
          <div className="flex items-center gap-2">
            {isCustom && (
              <button
                type="button"
                onClick={() => setIsCustom(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-[#4E5968] hover:bg-[#F2F4F6] active:scale-95 transition-all -ml-1.5"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h3 className="text-[17px] font-bold text-[#191F28]">
              {isCustom ? "직접 입력" : "결제 수단 선택"}
            </h3>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="grid h-8 w-8 place-items-center rounded-full text-[#8B95A1] hover:bg-[#F2F4F6] active:scale-95 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Header (Toss Style Segment) */}
        {!isCustom && (
          <div className="flex border-b border-[#F2F4F6] px-5 pt-1">
            <button
              type="button"
              onClick={() => setTab("card")}
              className={cx(
                "flex-1 pb-3 pt-2 text-[14px] font-bold transition-all relative",
                tab === "card"
                  ? "text-[#191F28]"
                  : "text-[#8B95A1] hover:text-[#4E5968]"
              )}
            >
              카드사
              {tab === "card" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#191F28] rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab("simple")}
              className={cx(
                "flex-1 pb-3 pt-2 text-[14px] font-bold transition-all relative",
                tab === "simple"
                  ? "text-[#191F28]"
                  : "text-[#8B95A1] hover:text-[#4E5968]"
              )}
            >
              간편결제 · 계좌
              {tab === "simple" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#191F28] rounded-full" />
              )}
            </button>
          </div>
        )}

        {/* Modal Body: 3-column Toss-style Financial Grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4">
          {!isCustom ? (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                {(tab === "card" ? CARD_COMPANIES : SIMPLE_PAY_METHODS).map((item) => {
                  const isSelected = value.startsWith(item.name) || value === item.name;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.name)}
                      className="group flex flex-col items-center justify-center p-2.5 rounded-2xl hover:bg-[#F9FAFB] active:scale-95 transition-all relative"
                    >
                      <div className="relative">
                        <BrandCircleIcon brand={item.id} size={48} />
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-[#191F28] text-white ring-2 ring-white">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <span
                        className={cx(
                          "mt-2 text-[13px] tracking-tight truncate max-w-[90px] text-center",
                          isSelected ? "font-bold text-[#191F28]" : "font-medium text-[#333D4B] group-hover:text-[#191F28]"
                        )}
                      >
                        {item.shortName || item.name}
                      </span>
                    </button>
                  );
                })}
              </div>

             {/* Bottom Actions */}
             <div className="pt-3 border-t border-[#F2F4F6] flex flex-col gap-2">
               <button
                 type="button"
                 onClick={() => setIsCustom(true)}
                 className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] py-2.5 text-[13px] font-semibold text-[#4E5968] hover:bg-white hover:border-[#B0B8C1] active:scale-[0.99] transition-all"
               >
                 <Plus size={14} />
                 <span>직접 입력하기</span>
               </button>
             </div>
           </div>
         ) : (
            <div className="py-2 space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#191F28] mb-1.5">
                  결제 수단 명칭
                </label>
                <input
                  type="text"
                  autoFocus
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="예: 법인카드, 외환카드, 계좌이체"
                  className="w-full rounded-xl border border-[#D1D6DB] px-3.5 py-3 text-[14px] text-[#191F28] outline-none focus:border-[#191F28] transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFinishCustom();
                    }
                  }}
                />
                <p className="mt-1.5 text-[12px] text-[#8B95A1]">
                  이용 중인 결제수단을 자유롭게 입력하세요.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFinishCustom}
                disabled={!customText.trim()}
                className="w-full rounded-xl bg-[#191F28] py-3 text-[14px] font-semibold text-white shadow-sm hover:bg-[#333D4B] active:scale-[0.99] disabled:opacity-50 transition-all"
              >
                적용하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Clean 1-line interactive trigger field for payment method selection
 */
export function PaymentMethodTriggerField({
  value = "",
  onChange,
  className = "",
  error = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const info = getPaymentMethodInfo(value);

  return (
    <div className={className}>
      {info.isRegistered ? (
        <div className="flex items-center justify-between rounded-xl border border-[#E5E8EB] bg-[#F7F8F9] px-3.5 py-2.5 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <PaymentIcon method={value} size={16} />
            <span className="truncate text-[14px] font-semibold text-[#191F28]">
              {info.fullLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="rounded-lg border border-[#D1D6DB] bg-white px-2.5 py-1 text-[12px] font-medium text-[#4E5968] hover:bg-[#F2F4F6] active:scale-95 transition-all shadow-2xs"
            >
              변경
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-1 text-[#8B95A1] hover:text-[#191F28] transition-colors"
              title="결제수단 삭제"
              aria-label="결제수단 삭제"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ) : (
       <button
         type="button"
         onClick={() => setIsOpen(true)}
          className={`flex w-full items-center justify-between rounded-xl border border-dashed px-3.5 py-2.5 text-left transition-all hover:bg-[#F9FAFB] active:scale-[0.99] ${
            error
              ? "border-[#FF4D4D] bg-[#FFF5F5] hover:border-[#FF4D4D]"
              : "border-[#D1D6DB] bg-white hover:border-[#191F28]"
          }`}
        >
          <div className="flex items-center gap-2.5 text-[#8B95A1]">
            <div className="grid h-6 w-6 place-items-center rounded-lg bg-[#F2F4F6] text-[#4E5968]">
              <Plus size={14} />
            </div>
            <span className={`text-[13px] font-medium ${error ? "text-[#FF4D4D]" : "text-[#4E5968]"}`}>
              결제 수단 선택
            </span>
          </div>
          <ChevronRight size={16} className={error ? "text-[#FF4D4D]" : "text-[#B0B8C1]"} />
        </button>
      )}

      <PaymentMethodPickerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        value={value}
        onSelect={(newMethod) => onChange(newMethod)}
      />
    </div>
  );
}
