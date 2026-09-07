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

export function getPaymentMethodInfo(method = "") {
  const raw = String(method || "").trim();
  const normalized = raw.toLowerCase().replace(/\s+/g, "");

  if (!raw || normalized === "등록안됨" || normalized === "직접관리" || normalized === "결제수단미등록") {
    return { brand: "none", name: "결제수단 미등록", fullLabel: raw || "결제수단 미등록", isRegistered: false };
  }

  if (/카카오|kakao/.test(normalized)) {
    return { brand: "kakaopay", name: "카카오페이", fullLabel: raw, isRegistered: true };
  }
  if (/네이버|naver/.test(normalized)) {
    return { brand: "naverpay", name: "네이버페이", fullLabel: raw, isRegistered: true };
  }
  if (/토스|toss/.test(normalized)) {
    return { brand: "tosspay", name: "토스페이", fullLabel: raw, isRegistered: true };
  }
  if (/payco|페이코/.test(normalized)) {
    return { brand: "payco", name: "PAYCO", fullLabel: raw, isRegistered: true };
  }
  if (/paypal|페이팔/.test(normalized)) {
    return { brand: "paypal", name: "PayPal", fullLabel: raw, isRegistered: true };
  }
  if (/apple|애플/.test(normalized)) {
    return { brand: "applepay", name: "Apple Pay", fullLabel: raw, isRegistered: true };
  }
  if (/google|구글/.test(normalized)) {
    return { brand: "googlepay", name: "Google Pay", fullLabel: raw, isRegistered: true };
  }
  if (/신한|shinhan/.test(normalized)) {
    return { brand: "shinhan", name: "신한카드", fullLabel: raw, isRegistered: true };
  }
  if (/현대|hyundai/.test(normalized)) {
    return { brand: "hyundai", name: "현대카드", fullLabel: raw, isRegistered: true };
  }
  if (/국민|kb/.test(normalized)) {
    return { brand: "kb", name: "KB국민카드", fullLabel: raw, isRegistered: true };
  }
  if (/삼성|samsung/.test(normalized)) {
    return { brand: "samsung", name: "삼성카드", fullLabel: raw, isRegistered: true };
  }
  if (/롯데|lotte/.test(normalized)) {
    return { brand: "lotte", name: "롯데카드", fullLabel: raw, isRegistered: true };
  }
  if (/우리|woori/.test(normalized)) {
    return { brand: "woori", name: "우리카드", fullLabel: raw, isRegistered: true };
  }
  if (/하나|hana/.test(normalized)) {
    return { brand: "hana", name: "하나카드", fullLabel: raw, isRegistered: true };
  }
  if (/bc|비씨/.test(normalized)) {
    return { brand: "bc", name: "BC카드", fullLabel: raw, isRegistered: true };
  }
  if (/농협|nh/.test(normalized)) {
    return { brand: "nh", name: "NH농협카드", fullLabel: raw, isRegistered: true };
  }
  if (/계좌|이체|bank/.test(normalized)) {
    return { brand: "bank", name: "계좌이체", fullLabel: raw, isRegistered: true };
  }

  return { brand: "card", name: "신용/체크카드", fullLabel: raw, isRegistered: true };
}
