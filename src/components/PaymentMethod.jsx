import React, { useState, useMemo } from "react";
import { ChevronRight, X, ArrowLeft, Plus, Check } from "lucide-react";
import {
  getPaymentMethodInfo,
  PAYMENT_PRESETS,
  SIMPLE_PAY_METHODS,
  CARD_COMPANIES,
} from "../lib/paymentMethod";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export { getPaymentMethodInfo, PAYMENT_PRESETS, SIMPLE_PAY_METHODS, CARD_COMPANIES };

export function PaymentIcon({ method, brand, size = 16, className = "" }) {
  const resolvedBrand = brand || getPaymentMethodInfo(method).brand;
  const w = Math.round(size * 1.375);
  const h = size;

  switch (resolvedBrand) {
    case "kakaopay":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="카카오페이"
        >
          <rect width="22" height="16" rx="3.5" fill="#FEE500" />
          <path
            d="M11 3.8C8.6 3.8 6.6 5.3 6.6 7.1c0 1.2.8 2.2 2 2.8l-.5 1.9 2.2-1.1c.2 0 .5.1.7.1 2.4 0 4.4-1.5 4.4-3.3S13.4 3.8 11 3.8z"
            fill="#191919"
          />
          <circle cx="11" cy="7.1" r="0.9" fill="#FEE500" />
        </svg>
      );

    case "naverpay":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="네이버페이"
        >
          <rect width="22" height="16" rx="3.5" fill="#03C75A" />
          <path d="M7.5 4.3h2.3l2.4 3.9V4.3h2.3v7.4h-2.3L9.8 7.8v3.9H7.5V4.3z" fill="#FFFFFF" />
        </svg>
      );

    case "tosspay":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="토스페이"
        >
          <rect width="22" height="16" rx="3.5" fill="#0064FF" />
          <path
            d="M14.5 7.1a3.4 3.4 0 0 0-3.3-2.1c-2 0-3.7 1.6-3.7 3.6 0 2 1.6 3.6 3.6 3.6 1.4 0 2.6-.8 3.2-2a.75.75 0 0 0-.4-.95.75.75 0 0 0-.95.38 2.1 2.1 0 0 1-1.85 1.07c-1.16 0-2.1-.94-2.1-2.1s.94-2.1 2.1-2.1c.88 0 1.65.55 1.95 1.37a.75.75 0 0 0 .95.45.75.75 0 0 0 .45-.97z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case "payco":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="PAYCO"
        >
          <rect width="22" height="16" rx="3.5" fill="#FA2828" />
          <path
            d="M8.2 4.5h3.4c1.5 0 2.6 1 2.6 2.5s-1.1 2.5-2.6 2.5H9.8v2H8.2V4.5zm1.6 3.6h1.7c.6 0 1.1-.4 1.1-1.1s-.5-1.1-1.1-1.1H9.8v2.2z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case "paypal":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="PayPal"
        >
          <rect width="22" height="16" rx="3.5" fill="#003087" />
          <path
            d="M8.5 3.8h2.7c1.3 0 2.2.8 2 2.1-.2 1.2-1.2 2-2.4 2H9.6l-.6 4.3H7.6l.9-8.4z"
            fill="#0079C1"
          />
          <path
            d="M9.9 4.9h2.7c1.3 0 2.2.8 2 2.1-.2 1.2-1.2 2-2.4 2H11l-.6 4.3H9l.9-8.4z"
            fill="#FFFFFF"
            opacity="0.95"
          />
        </svg>
      );

    case "applepay":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="Apple Pay"
        >
          <rect width="22" height="16" rx="3.5" fill="#000000" />
          <path
            d="M12.4 4.5c.3-.4.5-.9.4-1.4-.5 0-1 .4-1.3.8-.3.4-.5.9-.4 1.3.5.1 1-.3 1.3-.7zm.9 3.5c0-1.4 1.2-2.1 1.2-2.1-.7-1-1.6-1.1-2-1.1-.8-.1-1.6.5-2 .5-.5 0-1.1-.5-1.8-.5-.9 0-1.8.6-2.3 1.5-1 1.7-.3 4.3.7 5.7.5.8 1.1 1.5 1.7 1.5.7 0 1.1-.5 1.9-.5.8 0 1.1.5 1.9.5.8 0 1.3-.7 1.8-1.4.6-.8.8-1.6.8-1.6s-1.4-.6-1.4-2.5z"
            fill="#FFFFFF"
            transform="translate(0, 0.4) scale(0.95)"
          />
        </svg>
      );

    case "googlepay":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="Google Pay"
        >
          <rect width="22" height="16" rx="3.5" fill="#FFFFFF" stroke="#E5E8EB" strokeWidth="0.8" />
          <path d="M14.8 8.1c0-.3 0-.5-.1-.7H11v1.5h2.2c-.1.5-.4.9-.8 1.2v1h1.4c.8-.7 1-1.8 1-3z" fill="#4285F4" />
          <path d="M11 12c1.1 0 2-.4 2.7-1l-1.4-1c-.4.3-.8.4-1.3.4-1 0-1.9-.7-2.2-1.6H7.4v1.1C8.1 11.2 9.4 12 11 12z" fill="#34A853" />
          <path d="M8.8 8.8c-.1-.3-.1-.5-.1-.8s0-.5.1-.8V6.1H7.4A4.05 4.05 0 0 0 7 8c0 .7.2 1.3.4 1.9l1.4-1.1z" fill="#FBBC05" />
          <path d="M11 5.6c.6 0 1.2.2 1.6.6l1.2-1.2C13.1 4.3 12.1 4 11 4 9.4 4 8.1 4.8 7.4 6.1l1.4 1.1C9.1 6.3 10 5.6 11 5.6z" fill="#EA4335" />
        </svg>
      );

    case "shinhan":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="신한카드"
        >
          <rect width="22" height="16" rx="3.5" fill="#0046FF" />
          <rect x="3" y="6" width="4.5" height="4" rx="0.8" fill="#F8DF8C" stroke="#DCA226" strokeWidth="0.5" />
          <line x1="3" y1="8" x2="7.5" y2="8" stroke="#DCA226" strokeWidth="0.4" />
          <line x1="5.25" y1="6" x2="5.25" y2="10" stroke="#DCA226" strokeWidth="0.4" />
          <path d="M14 4.5c2.5 1.5 3.5 4 4.5 7" stroke="#94B7FF" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );

    case "hyundai":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="현대카드"
        >
          <rect width="22" height="16" rx="3.5" fill="#191F28" />
          <rect x="3" y="6" width="4.5" height="4" rx="0.8" fill="#E5E8EB" stroke="#9CA3AF" strokeWidth="0.5" />
          <line x1="3" y1="8" x2="7.5" y2="8" stroke="#9CA3AF" strokeWidth="0.4" />
          <line x1="5.25" y1="6" x2="5.25" y2="10" stroke="#9CA3AF" strokeWidth="0.4" />
          <rect x="15" y="3.5" width="1.5" height="9" rx="0.75" fill="#FFFFFF" opacity="0.85" />
        </svg>
      );

    case "kb":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="KB국민카드"
        >
          <rect width="22" height="16" rx="3.5" fill="#FFBC00" />
          <rect x="3" y="6" width="4.5" height="4" rx="0.8" fill="#4B433F" stroke="#2E2824" strokeWidth="0.5" />
          <line x1="3" y1="8" x2="7.5" y2="8" stroke="#2E2824" strokeWidth="0.4" />
          <line x1="5.25" y1="6" x2="5.25" y2="10" stroke="#2E2824" strokeWidth="0.4" />
          <polygon points="16,5.8 16.6,7.2 18,7.3 16.9,8.3 17.2,9.7 16,9 14.8,9.7 15.1,8.3 14,7.3 15.4,7.2" fill="#4B433F" />
        </svg>
      );

    case "samsung":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="삼성카드"
        >
          <rect width="22" height="16" rx="3.5" fill="#0C4DA2" />
          <rect x="3" y="6" width="4.5" height="4" rx="0.8" fill="#E5E8EB" stroke="#9CA3AF" strokeWidth="0.5" />
          <line x1="3" y1="8" x2="7.5" y2="8" stroke="#9CA3AF" strokeWidth="0.4" />
          <line x1="5.25" y1="6" x2="5.25" y2="10" stroke="#9CA3AF" strokeWidth="0.4" />
          <path d="M13.5 4.5c2.8 0 5 1.8 5 3.5s-2.2 3.5-5 3.5" stroke="#5EA4FF" strokeWidth="1.2" fill="none" />
        </svg>
      );

    case "bc":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="BC카드"
        >
          <rect width="22" height="16" rx="3.5" fill="#E60012" />
          <rect x="3" y="6" width="4.5" height="4" rx="0.8" fill="#E5E8EB" stroke="#9CA3AF" strokeWidth="0.5" />
          <line x1="3" y1="8" x2="7.5" y2="8" stroke="#9CA3AF" strokeWidth="0.4" />
          <line x1="5.25" y1="6" x2="5.25" y2="10" stroke="#9CA3AF" strokeWidth="0.4" />
          <circle cx="14" cy="8" r="2.2" fill="#FFFFFF" opacity="0.8" />
          <circle cx="17" cy="8" r="2.2" fill="#FFFFFF" opacity="0.8" />
        </svg>
      );

    case "lotte":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="롯데카드"
        >
          <rect width="22" height="16" rx="3.5" fill="#ED1C24" />
          <rect x="3" y="6" width="4.5" height="4" rx="0.8" fill="#F8DF8C" stroke="#DCA226" strokeWidth="0.5" />
          <line x1="3" y1="8" x2="7.5" y2="8" stroke="#DCA226" strokeWidth="0.4" />
          <line x1="5.25" y1="6" x2="5.25" y2="10" stroke="#DCA226" strokeWidth="0.4" />
          <path d="M14.5 4.5v5.5h3.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );

    case "hana":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="하나카드"
        >
          <rect width="22" height="16" rx="3.5" fill="#008485" />
          <rect x="3" y="6" width="4.5" height="4" rx="0.8" fill="#E5E8EB" stroke="#9CA3AF" strokeWidth="0.5" />
          <line x1="3" y1="8" x2="7.5" y2="8" stroke="#9CA3AF" strokeWidth="0.4" />
          <line x1="5.25" y1="6" x2="5.25" y2="10" stroke="#9CA3AF" strokeWidth="0.4" />
          <polygon points="16,5 18.5,8 16,11 13.5,8" stroke="#FFFFFF" strokeWidth="1" fill="none" opacity="0.9" />
        </svg>
      );

    case "woori":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="우리카드"
        >
          <rect width="22" height="16" rx="3.5" fill="#007BC8" />
          <rect x="3" y="6" width="4.5" height="4" rx="0.8" fill="#E5E8EB" stroke="#9CA3AF" strokeWidth="0.5" />
          <line x1="3" y1="8" x2="7.5" y2="8" stroke="#9CA3AF" strokeWidth="0.4" />
          <line x1="5.25" y1="6" x2="5.25" y2="10" stroke="#9CA3AF" strokeWidth="0.4" />
          <circle cx="15.5" cy="8" r="3" stroke="#8FD4FF" strokeWidth="1.2" fill="none" />
        </svg>
      );

    case "nh":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="NH농협카드"
        >
          <rect width="22" height="16" rx="3.5" fill="#005BAC" />
          <rect x="3" y="6" width="4.5" height="4" rx="0.8" fill="#F8DF8C" stroke="#DCA226" strokeWidth="0.5" />
          <line x1="3" y1="8" x2="7.5" y2="8" stroke="#DCA226" strokeWidth="0.4" />
          <line x1="5.25" y1="6" x2="5.25" y2="10" stroke="#DCA226" strokeWidth="0.4" />
          <path d="M14 5l3 3-3 3" stroke="#50C878" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );

    case "bank":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="계좌이체"
        >
          <rect width="22" height="16" rx="3.5" fill="#F2F4F6" stroke="#D1D6DB" strokeWidth="0.8" />
          <path d="M11 3.5L6.5 6v1h9V6L11 3.5zM7.5 8v3h1V8h-1zm3 0v3h1V8h-1zm3 0v3h1V8h-1zM6 11.8v1.2h10v-1.2H6z" fill="#4E5968" />
        </svg>
      );

    case "none":
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="결제수단 미등록"
        >
          <rect width="22" height="16" rx="3.5" fill="#F8F9FA" stroke="#D1D6DB" strokeWidth="0.8" strokeDasharray="2 2" />
          <line x1="8" y1="8" x2="14" y2="8" stroke="#8B95A1" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );

    case "card":
    default:
      return (
        <svg
          width={w}
          height={h}
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="신용/체크카드"
        >
          <rect width="22" height="16" rx="3.5" fill="#4B5563" />
          <rect x="3" y="6" width="4.5" height="4" rx="0.8" fill="#E5E8EB" stroke="#9CA3AF" strokeWidth="0.5" />
          <line x1="3" y1="8" x2="7.5" y2="8" stroke="#9CA3AF" strokeWidth="0.4" />
          <line x1="5.25" y1="6" x2="5.25" y2="10" stroke="#9CA3AF" strokeWidth="0.4" />
          <line x1="12" y1="8" x2="18" y2="8" stroke="#D1D5DB" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1.5 1.5" />
        </svg>
      );
  }
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
 * Toss-style Payment Method Picker Bottom Sheet Modal
 */
export function PaymentMethodPickerModal({
  isOpen,
  onClose,
  value = "",
  onSelect,
  subscriptions = [],
}) {
  const [mode, setMode] = useState("select"); // "select" | "card_digits" | "custom_input"
  const [selectedCard, setSelectedCard] = useState(null);
  const [digits, setDigits] = useState("");
  const [customText, setCustomText] = useState("");

  // Extract previously used unique payment methods from user's subscriptions
  const myMethods = useMemo(() => {
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) return [];
    const seen = new Set();
    const result = [];
    for (const sub of subscriptions) {
      const raw = String(sub?.paymentMethod || "").trim();
      if (!raw) continue;
      const info = getPaymentMethodInfo(raw);
      if (info.isRegistered && !seen.has(raw)) {
        seen.add(raw);
        result.push({ raw, info });
      }
    }
    return result;
  }, [subscriptions]);

  const handleCardClick = (card) => {
    setSelectedCard(card);
    // If current value belongs to this card and has last 4 digits, prefill them
    const currentInfo = getPaymentMethodInfo(value);
    if (currentInfo.name === card.name && currentInfo.last4) {
      setDigits(currentInfo.last4);
    } else {
      setDigits("");
    }
    setMode("card_digits");
  };

  const handleFinishCard = (includeDigits = true) => {
    if (!selectedCard) return;
    const cleanDigits = digits.trim().replace(/\D/g, "");
    if (includeDigits && cleanDigits) {
      onSelect(selectedCard.name + " • " + cleanDigits);
    } else {
      onSelect(selectedCard.name);
    }
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
    setMode("select");
    setSelectedCard(null);
    setDigits("");
    setCustomText("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl transition-all max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F2F4F6] px-5 py-4">
          <div className="flex items-center gap-2">
            {mode !== "select" && (
              <button
                type="button"
                onClick={() => setMode("select")}
                className="grid h-8 w-8 place-items-center rounded-full text-[#4E5968] hover:bg-[#F2F4F6] active:scale-95 transition-all -ml-1.5"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h3 className="text-[17px] font-bold text-[#191F28]">
              {mode === "card_digits" ? "카드 번호 입력" : mode === "custom_input" ? "직접 입력" : "결제 수단 선택"}
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {mode === "select" && (
            <div className="space-y-6">
              {/* 1. 내가 사용 중인 수단 (스마트 추천) */}
              {myMethods.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[12px] font-semibold text-[#868B94]">내가 사용 중인 수단</span>
                    <span className="text-[11px] text-[#B0B8C1]">탭하면 바로 적용</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {myMethods.map(({ raw, info }) => {
                      const isCurrent = value.trim() === raw;
                      return (
                        <button
                          key={raw}
                          type="button"
                          onClick={() => {
                            onSelect(raw);
                            resetAndClose();
                          }}
                          className={cx(
                            "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-all active:scale-95",
                            isCurrent
                              ? "border-[#191F28] bg-[#191F28] text-white shadow-sm"
                              : "border-[#E5E8EB] bg-[#F9FAFB] text-[#333D4B] hover:border-[#B0B8C1] hover:bg-white"
                          )}
                        >
                          <PaymentIcon brand={info.brand} size={15} />
                          <span>{raw}</span>
                          {isCurrent && <Check size={14} className="text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. 간편결제 */}
              <div>
                <span className="block text-[12px] font-semibold text-[#868B94] mb-2.5">간편결제</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SIMPLE_PAY_METHODS.map((item) => {
                    const isSelected = value.trim() === item.name;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelect(item.name);
                          resetAndClose();
                        }}
                        className={cx(
                          "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all active:scale-[0.98]",
                          isSelected
                            ? "border-[#191F28] bg-[#F7F8F9] ring-1 ring-[#191F28]"
                            : "border-[#E5E8EB] bg-white hover:border-[#B0B8C1] hover:bg-[#F9FAFB]"
                        )}
                      >
                        <PaymentIcon brand={item.id} size={18} />
                        <span className="text-[13px] font-semibold text-[#191F28] truncate">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. 신용 / 체크카드 */}
              <div>
                <span className="block text-[12px] font-semibold text-[#868B94] mb-2.5">신용 / 체크카드</span>
                <div className="grid grid-cols-2 gap-2">
                  {CARD_COMPANIES.map((card) => {
                    const isSelected = value.startsWith(card.name);
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handleCardClick(card)}
                        className={cx(
                          "flex items-center justify-between rounded-xl border p-3 text-left transition-all active:scale-[0.98]",
                          isSelected
                            ? "border-[#191F28] bg-[#F7F8F9] ring-1 ring-[#191F28]"
                            : "border-[#E5E8EB] bg-white hover:border-[#B0B8C1] hover:bg-[#F9FAFB]"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PaymentIcon brand={card.id} size={18} />
                          <span className="text-[13px] font-semibold text-[#191F28] truncate">{card.name}</span>
                        </div>
                        <ChevronRight size={14} className="text-[#B0B8C1] shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. 기타 / 직접 입력 & 미등록 옵션 */}
              <div className="pt-2 border-t border-[#F2F4F6] flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setMode("custom_input")}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] py-3 text-[13px] font-semibold text-[#4E5968] hover:bg-white hover:border-[#B0B8C1] active:scale-[0.99] transition-all"
                >
                  <Plus size={15} />
                  <span>직접 입력하기 (계좌이체, 해외카드 등)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelect("");
                    resetAndClose();
                  }}
                  className="w-full py-2 text-[12px] font-medium text-[#8B95A1] hover:text-[#4E5968] transition-colors"
                >
                  결제수단 없이 등록 (미등록)
                </button>
              </div>
            </div>
          )}

          {/* Mode: 카드 뒷 4자리 입력 */}
          {mode === "card_digits" && selectedCard && (
            <div className="py-2 text-center space-y-5">
              <div className="inline-flex flex-col items-center">
                <div className="shadow-md rounded-lg overflow-hidden">
                  <PaymentIcon brand={selectedCard.id} size={36} />
                </div>
                <h4 className="mt-3 text-[18px] font-bold text-[#191F28]">{selectedCard.name}</h4>
                <p className="mt-1 text-[13px] text-[#8B95A1]">
                  카드 뒷 4자리를 입력하면 어떤 카드인지 쉽게 구분할 수 있어요.
                </p>
              </div>

              <div className="max-w-[200px] mx-auto">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#868B94] mb-1.5">
                  카드 뒷 4자리 (선택)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={4}
                  autoFocus
                  value={digits}
                  onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1234"
                  className="w-full text-center text-[22px] font-bold tracking-[0.25em] rounded-xl border border-[#D1D6DB] py-2.5 outline-none focus:border-[#191F28] transition-colors"
                />
              </div>

              {/* 미리보기 */}
              <div className="rounded-xl bg-[#F7F8F9] p-3 text-[13px] text-[#4E5968]">
                <span className="text-[#8B95A1]">저장 형태: </span>
                <span className="font-semibold text-[#191F28]">
                  {selectedCard.name + (digits ? " • " + digits : "")}
                </span>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleFinishCard(true)}
                  className="w-full rounded-xl bg-[#191F28] py-3.5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#333D4B] active:scale-[0.99] transition-all"
                >
                  {digits.length > 0 ? "입력한 번호로 선택 완료" : "뒷자리 없이 선택 완료"}
                </button>
                {digits.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleFinishCard(false)}
                    className="w-full py-2 text-[12px] font-medium text-[#8B95A1] hover:text-[#4E5968] transition-colors"
                  >
                    뒷자리 제외하고 카드사명만 저장
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Mode: 직접 입력 */}
          {mode === "custom_input" && (
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
                  placeholder="예: 우리 법인카드 • 9901, 계좌이체, 외환카드"
                  className="w-full rounded-xl border border-[#D1D6DB] px-3.5 py-3 text-[14px] text-[#191F28] outline-none focus:border-[#191F28] transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFinishCustom();
                    }
                  }}
                />
                <p className="mt-1.5 text-[12px] text-[#8B95A1]">
                  카드명, 간편결제명, 계좌번호 등 원하시는 방식으로 자유롭게 기재하세요.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFinishCustom}
                disabled={!customText.trim()}
                className="w-full rounded-xl bg-[#191F28] py-3.5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#333D4B] active:scale-[0.99] disabled:opacity-50 transition-all"
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
  subscriptions = [],
  className = "",
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
          className="flex w-full items-center justify-between rounded-xl border border-dashed border-[#D1D6DB] bg-white px-3.5 py-2.5 text-left transition-all hover:border-[#191F28] hover:bg-[#F9FAFB] active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5 text-[#8B95A1]">
            <div className="grid h-6 w-6 place-items-center rounded-lg bg-[#F2F4F6] text-[#4E5968]">
              <Plus size={14} />
            </div>
            <span className="text-[13px] font-medium text-[#4E5968]">
              결제 수단 선택 <span className="text-[11px] text-[#8B95A1]">(선택 사항)</span>
            </span>
          </div>
          <ChevronRight size={16} className="text-[#B0B8C1]" />
        </button>
      )}

      <PaymentMethodPickerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        value={value}
        onSelect={(newMethod) => onChange(newMethod)}
        subscriptions={subscriptions}
      />
    </div>
  );
}
