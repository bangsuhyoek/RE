import React from "react";
import { getPaymentMethodInfo, PAYMENT_PRESETS } from "../lib/paymentMethod";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export { getPaymentMethodInfo, PAYMENT_PRESETS };

export function PaymentIcon({ method, brand, size = 16, className = "" }) {
  const resolvedBrand = brand || getPaymentMethodInfo(method).brand;

  switch (resolvedBrand) {
    case "kakaopay":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="카카오페이"
        >
          <rect width="16" height="16" rx="4" fill="#FEE500" />
          <path
            d="M8 3.8C5.6 3.8 3.6 5.3 3.6 7.1c0 1.2.8 2.2 2 2.8l-.5 1.9 2.2-1.1c.2 0 .5.1.7.1 2.4 0 4.4-1.5 4.4-3.3S10.4 3.8 8 3.8z"
            fill="#191919"
          />
          <circle cx="8" cy="7.1" r="0.9" fill="#FEE500" />
        </svg>
      );

    case "naverpay":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="네이버페이"
        >
          <rect width="16" height="16" rx="4" fill="#03C75A" />
          <path d="M4.5 4.3h2.3l2.4 3.9V4.3h2.3v7.4H9.2L6.8 7.8v3.9H4.5V4.3z" fill="#FFFFFF" />
        </svg>
      );

    case "tosspay":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="토스페이"
        >
          <rect width="16" height="16" rx="4" fill="#0064FF" />
          <path
            d="M11.5 7.1a3.4 3.4 0 0 0-3.3-2.1c-2 0-3.7 1.6-3.7 3.6 0 2 1.6 3.6 3.6 3.6 1.4 0 2.6-.8 3.2-2a.75.75 0 0 0-.4-.95.75.75 0 0 0-.95.38 2.1 2.1 0 0 1-1.85 1.07c-1.16 0-2.1-.94-2.1-2.1s.94-2.1 2.1-2.1c.88 0 1.65.55 1.95 1.37a.75.75 0 0 0 .95.45.75.75 0 0 0 .45-.97z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case "paypal":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="PayPal"
        >
          <rect width="16" height="16" rx="4" fill="#003087" />
          <path
            d="M5.5 3.8h2.7c1.3 0 2.2.8 2 2.1-.2 1.2-1.2 2-2.4 2H6.6l-.6 4.3H4.6l.9-8.4z"
            fill="#0079C1"
          />
          <path
            d="M6.9 4.9h2.7c1.3 0 2.2.8 2 2.1-.2 1.2-1.2 2-2.4 2H8l-.6 4.3H6l.9-8.4z"
            fill="#FFFFFF"
            opacity="0.95"
          />
        </svg>
      );

    case "applepay":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="Apple Pay"
        >
          <rect width="16" height="16" rx="4" fill="#000000" />
          <path
            d="M9.4 4.5c.3-.4.5-.9.4-1.4-.5 0-1 .4-1.3.8-.3.4-.5.9-.4 1.3.5.1 1-.3 1.3-.7zm.9 3.5c0-1.4 1.2-2.1 1.2-2.1-.7-1-1.6-1.1-2-1.1-.8-.1-1.6.5-2 .5-.5 0-1.1-.5-1.8-.5-.9 0-1.8.6-2.3 1.5-1 1.7-.3 4.3.7 5.7.5.8 1.1 1.5 1.7 1.5.7 0 1.1-.5 1.9-.5.8 0 1.1.5 1.9.5.8 0 1.3-.7 1.8-1.4.6-.8.8-1.6.8-1.6s-1.4-.6-1.4-2.5z"
            fill="#FFFFFF"
            transform="translate(0.5, 0.4) scale(0.95)"
          />
        </svg>
      );

    case "googlepay":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="Google Pay"
        >
          <rect width="16" height="16" rx="4" fill="#FFFFFF" stroke="#E5E8EB" strokeWidth="0.8" />
          <path d="M11.8 8.1c0-.3 0-.5-.1-.7H8v1.5h2.2c-.1.5-.4.9-.8 1.2v1h1.4c.8-.7 1-1.8 1-3z" fill="#4285F4" />
          <path d="M8 12c1.1 0 2-.4 2.7-1l-1.4-1c-.4.3-.8.4-1.3.4-1 0-1.9-.7-2.2-1.6H4.4v1.1C5.1 11.2 6.4 12 8 12z" fill="#34A853" />
          <path d="M5.8 8.8c-.1-.3-.1-.5-.1-.8s0-.5.1-.8V6.1H4.4A4.05 4.05 0 0 0 4 8c0 .7.2 1.3.4 1.9l1.4-1.1z" fill="#FBBC05" />
          <path d="M8 5.6c.6 0 1.2.2 1.6.6l1.2-1.2C10.1 4.3 9.1 4 8 4 6.4 4 5.1 4.8 4.4 6.1l1.4 1.1C6.1 6.3 7 5.6 8 5.6z" fill="#EA4335" />
        </svg>
      );

    case "shinhan":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="신한카드"
        >
          <rect width="16" height="16" rx="4" fill="#0046FF" />
          <path d="M10.8 5.8c-.3-.8-1.2-1.3-2.4-1.3-1.6 0-2.6.9-2.6 2.1 0 1.2.9 1.7 2.2 2 1.5.3 1.9.7 1.9 1.4 0 .8-.8 1.3-1.9 1.3-1.2 0-2.1-.5-2.4-1.4l-1.1.6c.4 1.3 1.7 2.1 3.5 2.1 2 0 3.3-1 3.3-2.6 0-1.3-.9-1.9-2.4-2.2-1.3-.3-1.7-.7-1.7-1.2 0-.6.6-1.1 1.5-1.1.9 0 1.6.4 1.9 1l1.1-.7z" fill="#FFFFFF" />
        </svg>
      );

    case "hyundai":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="현대카드"
        >
          <rect width="16" height="16" rx="4" fill="#171717" />
          <path d="M4.8 4.5h1.6v2.8h3.2V4.5h1.6v7H9.6V8.7H6.4v2.8H4.8v-7z" fill="#FFFFFF" />
        </svg>
      );

    case "kb":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="KB국민카드"
        >
          <rect width="16" height="16" rx="4" fill="#FFBC00" />
          <path d="M3.8 4.5h1.5v2.3l1.8-2.3h1.9l-2.2 2.7 2.4 4.3H7.3L5.3 8.8v2.7H3.8v-7zm5.5 0h2.3c1 0 1.7.5 1.7 1.4 0 .6-.3 1-.8 1.2.6.2.9.7.9 1.3 0 1-.8 1.6-1.9 1.6H9.3v-7zm1.5 2.7h.8c.4 0 .6-.2.6-.5 0-.3-.2-.5-.6-.5h-.8v1zm0 2.8h.9c.4 0 .7-.2.7-.5 0-.4-.3-.5-.7-.5h-.9v1z" fill="#4B433F" />
        </svg>
      );

    case "samsung":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="삼성카드"
        >
          <rect width="16" height="16" rx="4" fill="#0C4DA2" />
          <path d="M10.8 5.8c-.3-.8-1.2-1.3-2.4-1.3-1.6 0-2.6.9-2.6 2.1 0 1.2.9 1.7 2.2 2 1.5.3 1.9.7 1.9 1.4 0 .8-.8 1.3-1.9 1.3-1.2 0-2.1-.5-2.4-1.4l-1.1.6c.4 1.3 1.7 2.1 3.5 2.1 2 0 3.3-1 3.3-2.6 0-1.3-.9-1.9-2.4-2.2-1.3-.3-1.7-.7-1.7-1.2 0-.6.6-1.1 1.5-1.1.9 0 1.6.4 1.9 1l1.1-.7z" fill="#FFFFFF" />
        </svg>
      );

    case "bc":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="BC카드"
        >
          <rect width="16" height="16" rx="4" fill="#E60012" />
          <path d="M3.8 4.5h2.2c.9 0 1.5.4 1.5 1.2 0 .5-.3.9-.7 1 .6.1.9.6.9 1.2 0 .9-.7 1.6-1.7 1.6H3.8v-7zm1.4 2.4h.7c.4 0 .6-.2.6-.4 0-.3-.2-.4-.6-.4h-.7v.8zm0 2.5h.8c.4 0 .7-.2.7-.5 0-.3-.3-.4-.7-.4h-.8v.9zm4.2-4.9h1.4c1.4 0 2.3.9 2.3 2.5v1c0 1.6-.9 2.5-2.3 2.5H9.4v-7zm1.4 5.7c.7 0 1.1-.4 1.1-1.3v-.8c0-.9-.4-1.3-1.1-1.3v3.4z" fill="#FFFFFF" />
        </svg>
      );

    case "lotte":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="롯데카드"
        >
          <rect width="16" height="16" rx="4" fill="#ED1C24" />
          <path d="M5.5 4.5h1.7v5.4h3.6v1.4H5.5v-6.8z" fill="#FFFFFF" />
        </svg>
      );

    case "hana":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="하나카드"
        >
          <rect width="16" height="16" rx="4" fill="#008485" />
          <path d="M4.8 4.5h1.6v2.8h3.2V4.5h1.6v7H9.6V8.7H6.4v2.8H4.8v-7z" fill="#FFFFFF" />
        </svg>
      );

    case "woori":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="우리카드"
        >
          <rect width="16" height="16" rx="4" fill="#007BC8" />
          <path d="M3.8 4.5h1.6l1.2 4.4 1.2-4.4h1.5l1.2 4.4 1.2-4.4H12l-1.8 7H8.8L7.6 7.4 6.4 11.5H4.8L3.8 4.5z" fill="#FFFFFF" />
        </svg>
      );

    case "nh":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="NH농협카드"
        >
          <rect width="16" height="16" rx="4" fill="#005BAC" />
          <path d="M3.8 4.5h1.5l2.4 4.2V4.5h1.5v7H7.8L5.3 7.3v4.2H3.8v-7zm6 0h1.4v2.8h1.8V4.5h1.4v7h-1.4V8.7h-1.8v2.8H9.8v-7z" fill="#FFFFFF" />
        </svg>
      );

    case "bank":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="계좌이체"
        >
          <rect width="16" height="16" rx="4" fill="#F2F4F6" stroke="#E5E8EB" strokeWidth="0.8" />
          <path d="M8 3.5L3.5 6v1h9V6L8 3.5zM4.5 8v3h1V8h-1zm3 0v3h1V8h-1zm3 0v3h1V8h-1zM3 11.8v1.2h10v-1.2H3z" fill="#6B7684" />
        </svg>
      );

    case "none":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="결제수단 미등록"
        >
          <rect width="16" height="16" rx="4" fill="#F2F4F6" stroke="#E5E8EB" strokeWidth="0.8" strokeDasharray="2 2" />
          <line x1="5" y1="8" x2="11" y2="8" stroke="#8B95A1" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );

    case "card":
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cx("shrink-0 select-none", className)}
          aria-label="신용/체크카드"
        >
          <rect width="16" height="16" rx="4" fill="#F2F4F6" stroke="#E5E8EB" strokeWidth="0.8" />
          <rect x="3" y="4.5" width="10" height="7" rx="1.2" fill="none" stroke="#6B7684" strokeWidth="1" />
          <line x1="3" y1="7" x2="13" y2="7" stroke="#6B7684" strokeWidth="0.9" />
          <rect x="4.5" y="8.8" width="2.5" height="1.2" rx="0.3" fill="#6B7684" />
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
