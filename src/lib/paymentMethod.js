export const PAYMENT_PRESETS = [
  "카카오페이",
  "네이버페이",
  "토스페이",
  "PAYCO",
  "PayPal",
  "Apple Pay",
  "신한카드",
  "현대카드",
  "KB국민카드",
  "삼성카드",
];

export const SIMPLE_PAY_METHODS = [
  { id: "kakaopay", name: "카카오페이" },
  { id: "naverpay", name: "네이버페이" },
  { id: "tosspay", name: "토스페이" },
  { id: "applepay", name: "Apple Pay" },
  { id: "payco", name: "PAYCO" },
  { id: "paypal", name: "PayPal" },
];

export const CARD_COMPANIES = [
  { id: "shinhan", name: "신한카드" },
  { id: "hyundai", name: "현대카드" },
  { id: "kb", name: "KB국민카드" },
  { id: "samsung", name: "삼성카드" },
  { id: "lotte", name: "롯데카드" },
  { id: "woori", name: "우리카드" },
  { id: "hana", name: "하나카드" },
  { id: "nh", name: "NH농협카드" },
  { id: "bc", name: "BC카드" },
  { id: "card", name: "기타 신용/체크카드" },
];

export function getPaymentMethodInfo(method = "") {
  const raw = String(method || "").trim();
  const normalized = raw.toLowerCase().replace(/\s+/g, "");
  const last4Match = raw.match(/(?:[•·\s-]|^)(\d{4})$/);
  const last4 = last4Match ? last4Match[1] : null;

  if (!raw || normalized === "등록안됨" || normalized === "직접관리" || normalized === "결제수단미등록") {
    return { brand: "none", name: "결제수단 미등록", fullLabel: raw || "결제수단 미등록", last4: null, isRegistered: false };
  }

  let brand = "card";
  let name = "신용/체크카드";

  if (/카카오|kakao/.test(normalized)) {
    brand = "kakaopay";
    name = "카카오페이";
  } else if (/네이버|naver/.test(normalized)) {
    brand = "naverpay";
    name = "네이버페이";
  } else if (/토스|toss/.test(normalized)) {
    brand = "tosspay";
    name = "토스페이";
  } else if (/payco|페이코/.test(normalized)) {
    brand = "payco";
    name = "PAYCO";
  } else if (/paypal|페이팔/.test(normalized)) {
    brand = "paypal";
    name = "PayPal";
  } else if (/apple|애플/.test(normalized)) {
    brand = "applepay";
    name = "Apple Pay";
  } else if (/google|구글/.test(normalized)) {
    brand = "googlepay";
    name = "Google Pay";
  } else if (/신한|shinhan/.test(normalized)) {
    brand = "shinhan";
    name = "신한카드";
  } else if (/현대|hyundai/.test(normalized)) {
    brand = "hyundai";
    name = "현대카드";
  } else if (/국민|kb/.test(normalized)) {
    brand = "kb";
    name = "KB국민카드";
  } else if (/삼성|samsung/.test(normalized)) {
    brand = "samsung";
    name = "삼성카드";
  } else if (/롯데|lotte/.test(normalized)) {
    brand = "lotte";
    name = "롯데카드";
  } else if (/우리|woori/.test(normalized)) {
    brand = "woori";
    name = "우리카드";
  } else if (/하나|hana/.test(normalized)) {
    brand = "hana";
    name = "하나카드";
  } else if (/bc|비씨/.test(normalized)) {
    brand = "bc";
    name = "BC카드";
  } else if (/농협|nh/.test(normalized)) {
    brand = "nh";
    name = "NH농협카드";
  } else if (/계좌|이체|bank/.test(normalized)) {
    brand = "bank";
    name = "계좌이체";
  }

  return {
    brand,
    name,
    fullLabel: raw,
    last4: brand.includes("pay") || brand === "bank" ? null : last4,
    isRegistered: true,
  };
}
