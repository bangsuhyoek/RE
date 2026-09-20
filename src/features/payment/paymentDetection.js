export const PaymentDecision = Object.freeze({
  MATCH: "MATCH",
  REJECT: "REJECT",
});

export const PaymentRejectReason = Object.freeze({
  PAYMENT_CANCELLED: "PAYMENT_CANCELLED",
  NEGATIVE_PAYMENT_EVENT: "NEGATIVE_PAYMENT_EVENT",
  AMOUNT_NOT_FOUND: "AMOUNT_NOT_FOUND",
  AMBIGUOUS_MERCHANT: "AMBIGUOUS_MERCHANT",
  PRICE_MISMATCH: "PRICE_MISMATCH",
  NON_SUBSCRIPTION_PURCHASE: "NON_SUBSCRIPTION_PURCHASE",
});

export const PAYMENT_PARSER_CONTRACT_VERSION = "android-payment-parser-2026-09-20";

export const KNOWN_PAYMENT_SERVICES = Object.freeze([
  { id: "netflix", name: "Netflix", category: "OTT", aliases: ["netflix", "넷플릭스", "netflix.com"], allowedAmounts: [5500, 13500, 17000], strict: false },
  { id: "youtube", name: "YouTube Premium", category: "OTT", aliases: ["youtube premium", "유튜브", "youtube", "google youtube", "구글유튜브"], allowedAmounts: [8690, 10450, 14900], strict: false },
  { id: "tving", name: "티빙", category: "OTT", aliases: ["티빙", "tving", "cj enm"], allowedAmounts: [5500, 9500, 13500, 17000], strict: false },
  { id: "disney", name: "Disney+", category: "OTT", aliases: ["disney+", "디즈니+", "디즈니플러스", "disneyplus", "disney"], allowedAmounts: [9900, 13900, 99000, 139000], strict: false },
  { id: "watcha", name: "왓챠", category: "OTT", aliases: ["왓챠", "watcha"], allowedAmounts: [7900, 12900], strict: false },
  { id: "wavve", name: "웨이브", category: "OTT", aliases: ["웨이브", "wavve"], allowedAmounts: [7900, 10900, 13900], strict: false },
  { id: "coupang", name: "쿠팡 와우", category: "쇼핑", aliases: ["쿠팡 와우", "쿠팡", "coupang", "쿠팡와우", "와우멤버십"], allowedAmounts: [4990, 7890], strict: true },
  { id: "naverplus", name: "네이버플러스 멤버십", category: "쇼핑", aliases: ["네이버플러스 멤버십", "네이버플러스", "네이버멤버십", "네이버"], allowedAmounts: [4900, 46800], strict: true },
  { id: "spotify", name: "Spotify", category: "음악", aliases: ["spotify", "스포티파이"], allowedAmounts: [8690, 10900, 11990, 17900], strict: false },
  { id: "melon", name: "멜론", category: "음악", aliases: ["멜론", "melon"], allowedAmounts: [7900, 10900, 11900], strict: false },
  { id: "chatgpt", name: "ChatGPT Plus", category: "AI/생산성", aliases: ["chatgpt plus", "챗gpt", "chatgpt", "openai", "챗지피티"], allowedAmounts: [27000, 29000], strict: false },
  { id: "notion", name: "Notion", category: "AI/생산성", aliases: ["notion", "노션"], allowedAmounts: [11000, 13500, 20000], strict: false },
  { id: "adobe", name: "Adobe", category: "AI/생산성", aliases: ["adobe", "어도비"], allowedAmounts: [13200, 26400, 35200, 61600], strict: false },
  { id: "claude", name: "Claude Pro", category: "AI/생산성", aliases: ["claude pro", "클로드", "claude", "anthropic"], allowedAmounts: [27000, 29000], strict: false },
  { id: "millie", name: "밀리의서재", category: "도서", aliases: ["밀리의서재", "밀리", "밀리의 서재"], allowedAmounts: [9900, 99000], strict: false },
  { id: "apple", name: "Apple One", category: "기타", aliases: ["apple one", "apple.com/bill", "애플", "apple"], allowedAmounts: [14900, 20900, 3300, 4400, 8900], strict: true },
]);

const AMOUNT_PATTERN = /([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})\s*원|[$]\s*([0-9]+(?:\.[0-9]{2})?)/i;
const RECURRING_KEYWORD = /(정기|자동결제|정기결제|매월|구독|멤버십|와우|플러스멤버십|월간)/;
const NEGATIVE_KEYWORD = /(취소|환불|승인취소|결제취소|반품|카드대금|결제대금|후불교통|교통카드|송금|이체|출금|적금|대출|이자|현금서비스|배송완료|주문취소|장바구니)/;
const CANCELLATION_KEYWORD = /(취소|환불|승인취소|결제취소|반품|주문취소)/;
const BUSINESS_SUFFIX = /(헤어|미용실|치과|식당|마트|로지스틱스|물류|카페|베이커리|의원|병원|모텔|호텔|빌딩|세탁|주유소|약국|분식|반점)/;

function compact(value = "") {
  return String(value || "").toLowerCase().replace(/[^a-zA-Z0-9가-힣]/g, "");
}

function parseAmount(text) {
  const match = String(text || "").match(AMOUNT_PATTERN);
  if (!match) return 0;
  if (match[1]) return Number(match[1].replace(/,/g, "")) || 0;
  if (match[2]) return Math.round(Number(match[2]) * 1350) || 0;
  return 0;
}

export function detectPaymentMethod(packageName = "", text = "") {
  const pkg = String(packageName || "");
  if (pkg.includes("shcard") || text.includes("신한")) return "신한카드";
  if (pkg.includes("kbcard") || pkg.includes("kbstar") || text.includes("KB") || text.includes("국민")) return "KB국민카드";
  if (pkg.includes("hyundaicard") || text.includes("현대")) return "현대카드";
  if (pkg.includes("samsungcard") || text.includes("삼성카드")) return "삼성카드";
  if (pkg.includes("wooricard") || text.includes("우리")) return "우리카드";
  if (pkg.includes("lotte") || text.includes("롯데")) return "롯데카드";
  if (pkg.includes("hana") || text.includes("하나")) return "하나카드";
  if (pkg.includes("nh.smart") || text.includes("농협")) return "NH농협카드";
  if (pkg.includes("kakaopay") || text.includes("카카오페이")) return "카카오페이";
  if (pkg.includes("toss") || text.includes("토스")) return "토스페이";
  if (pkg.includes("nhn") || text.includes("네이버페이")) return "네이버페이";
  if (pkg.includes("spay") || text.includes("삼성월렛") || text.includes("삼성페이")) return "삼성월렛";
  return "신용/체크카드";
}

export function inferPaymentPlan(serviceId, amount, text = "") {
  const lower = String(text || "").toLowerCase();
  if (text.includes("프리미엄") || lower.includes("premium")) return "프리미엄";
  if (text.includes("스탠다드") || lower.includes("standard")) return "스탠다드";
  if (text.includes("베이직") || lower.includes("basic")) return "베이직";
  if (text.includes("와우")) return "와우 멤버십";
  if (serviceId !== "disney" && text.includes("플러스")) return "Plus";
  if (serviceId === "chatgpt" && (lower.includes("chatgpt plus") || lower.includes("openai"))) return "Plus";

  if (serviceId === "netflix") {
    if (amount === 17000) return "프리미엄";
    if (amount === 13500) return "스탠다드";
    if (amount === 5500) return "광고형 스탠다드";
  } else if (serviceId === "youtube" && amount === 14900) return "개인 멤버십";
  else if (serviceId === "coupang" && [7890, 4990].includes(amount)) return "와우 멤버십";
  else if (serviceId === "naver" && [4900, 46800].includes(amount)) return "네이버플러스 멤버십";
  else if (serviceId === "disney") {
    if (amount === 9900) return "스탠다드";
    if (amount === 13900) return "프리미엄";
  } else if (serviceId === "tving") {
    if (amount === 13500) return "스탠다드";
    if (amount === 17000) return "프리미엄";
    if (amount === 5500) return "광고형 스탠다드";
  }
  return "기본 플랜";
}

function findKnownService(text) {
  const compactText = compact(text);
  let bestMatch = null;
  let longest = 0;
  for (const service of KNOWN_PAYMENT_SERVICES) {
    for (const alias of service.aliases) {
      const candidate = compact(alias);
      if (candidate && compactText.includes(candidate) && candidate.length > longest) {
        bestMatch = service;
        longest = candidate.length;
      }
    }
  }
  return bestMatch;
}

function reject(reasonCode, rawEvent, details = {}) {
  return {
    decision: PaymentDecision.REJECT,
    reasonCode,
    rawEvent,
    ...details,
  };
}

export function detectPaymentNotification(rawEvent = {}) {
  const normalized = {
    packageName: String(rawEvent.packageName || rawEvent.package || ""),
    title: String(rawEvent.title || ""),
    body: String(rawEvent.body || ""),
    receivedAt: rawEvent.receivedAt || new Date().toISOString(),
  };
  const combined = `${normalized.title} ${normalized.body}`.trim();

  if (NEGATIVE_KEYWORD.test(combined)) {
    return reject(
      CANCELLATION_KEYWORD.test(combined)
        ? PaymentRejectReason.PAYMENT_CANCELLED
        : PaymentRejectReason.NEGATIVE_PAYMENT_EVENT,
      normalized
    );
  }

  const amount = parseAmount(combined);
  if (!amount) return reject(PaymentRejectReason.AMOUNT_NOT_FOUND, normalized);

  const service = findKnownService(combined);

  if (service) {
    const suffix = combined.match(BUSINESS_SUFFIX)?.[1];
    if (suffix && service.aliases.some((alias) => combined.toLowerCase().includes((alias + suffix).toLowerCase()))) {
      return reject(PaymentRejectReason.AMBIGUOUS_MERCHANT, normalized, { serviceId: service.id, amount });
    }
  }

  const recurring = RECURRING_KEYWORD.test(combined);
  if (service?.strict && !service.allowedAmounts.includes(amount) && !recurring) {
    return reject(PaymentRejectReason.PRICE_MISMATCH, normalized, { serviceId: service.id, amount });
  }
  if (!service && !recurring) {
    return reject(PaymentRejectReason.NON_SUBSCRIPTION_PURCHASE, normalized, { amount });
  }

  const serviceId = service?.id || "";
  const serviceName = service?.name || "신규 구독 서비스";
  const category = service?.category || "기타";
  const paymentMethod = detectPaymentMethod(normalized.packageName, combined);
  const plan = inferPaymentPlan(serviceId, amount, combined);
  const receivedDate = new Date(normalized.receivedAt);
  const dueDay = Number.isNaN(receivedDate.getTime()) ? new Date().getDate() : receivedDate.getDate();

  return {
    decision: PaymentDecision.MATCH,
    reasonCode: "SUBSCRIPTION_MATCH",
    rawEvent: normalized,
    parserContractVersion: PAYMENT_PARSER_CONTRACT_VERSION,
    candidate: {
      serviceId,
      name: serviceName,
      category,
      amount,
      plan,
      paymentMethod,
      dueDay,
      billingCycle: "매월",
      sourceType: "sms",
      autoDetected: true,
    },
  };
}

export function paymentRejectMessage(reasonCode) {
  switch (reasonCode) {
    case PaymentRejectReason.PAYMENT_CANCELLED:
      return "취소·환불 알림이라 구독으로 등록하지 않았어요.";
    case PaymentRejectReason.NEGATIVE_PAYMENT_EVENT:
      return "카드대금·이체·출금 등 구독 결제가 아닌 알림이에요.";
    case PaymentRejectReason.PRICE_MISMATCH:
      return "일반 쇼핑 결제 가능성이 높아 구독으로 등록하지 않았어요.";
    case PaymentRejectReason.AMBIGUOUS_MERCHANT:
      return "구독 서비스와 이름이 비슷한 일반 매장 결제로 판단했어요.";
    case PaymentRejectReason.AMOUNT_NOT_FOUND:
      return "결제 금액을 확인할 수 없어 자동 등록하지 않았어요.";
    default:
      return "구독 결제로 판단되지 않아 등록하지 않았어요.";
  }
}
