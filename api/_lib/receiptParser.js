import { SERVICE_ALIAS_CATALOG } from "./serviceAliases.js";

export const PLAN_CATALOG_VERSION = "submate-project-2026-09-02";

// 금액 기반 요금제 판정은 이 프로젝트가 지원하는 기준 요금제에만 적용한다.
// 프로모션, 제휴 할인, 인앱 결제, 일할 계산 금액은 일치하지 않을 수 있으므로
// 정확히 하나의 항목과 일치할 때만 요금제를 자동 입력한다.
export const receiptServiceCatalog = [
  {
    id: "netflix",
    name: "Netflix",
    aliases: ["netflix", "넷플릭스", "netflix.com"],
    plans: [{ name: "프리미엄", aliases: ["premium", "프리미엄"], amount: 17000, billingCycle: "매월" }],
  },
  {
    id: "youtube",
    name: "YouTube Premium",
    aliases: ["youtube premium", "youtube", "유튜브 프리미엄", "유튜브", "google youtube"],
    plans: [{ name: "개인 멤버십", aliases: ["individual", "개인 멤버십", "개인"], amount: 14900, billingCycle: "매월" }],
  },
  {
    id: "coupang",
    name: "쿠팡 와우",
    // '로켓와우클럽 월회비', '와우 멤버십' 메일에는 '쿠팡플레이 특별 혜택' 같은 다른 서비스 이름도 함께 나오므로 와우 별칭을 길게 둔다.
    aliases: ["coupang wow", "coupang", "쿠팡 와우", "쿠팡와우", "쿠팡", "와우 멤버십", "와우멤버십", "로켓와우클럽"],
    plans: [{ name: "와우 멤버십", aliases: ["wow membership", "와우 멤버십", "와우"], amount: 7890, billingCycle: "매월" }],
  },
  {
    id: "spotify",
    name: "Spotify",
    aliases: ["spotify", "스포티파이"],
    plans: [{ name: "개인", aliases: ["premium individual", "individual", "개인"], amount: 10900, billingCycle: "매월" }],
  },
  {
    id: "chatgpt",
    name: "ChatGPT Plus",
    aliases: ["chatgpt plus", "chatgpt", "openai", "챗지피티", "챗GPT"],
    plans: [{ name: "Plus", aliases: ["chatgpt plus", "plus", "플러스"], amount: 29000, billingCycle: "매월" }],
  },
  {
    id: "tving",
    name: "티빙",
    aliases: ["tving", "티빙", "cj enm tving"],
    plans: [{ name: "스탠다드", aliases: ["standard", "스탠다드"], amount: 13500, billingCycle: "매월" }],
  },
  {
    id: "disney",
    name: "Disney+",
    aliases: ["disney+", "disney plus", "disneyplus", "디즈니+", "디즈니 플러스", "디즈니플러스"],
  plans: [{ name: "스탠다드", aliases: ["standard", "스탠다드"], amount: 9900, billingCycle: "매월" }],
  },
];

export const compact = (value = "") => String(value || "").toLowerCase().replace(/[\s._:/\\()[\]{}-]+/g, "");

// 요금제 표가 있는 서비스 뒤에 앱 카탈로그 전체 별칭을 붙인다. 별칭 표 서비스는 이름만 알아보고
// 요금제는 채우지 않는다(plans: []). 같은 길이로 겹치면 요금제 표 서비스가 이긴다(안정 정렬).
const primaryServiceIds = new Set(receiptServiceCatalog.map((service) => service.id));
const detectableServices = [
  ...receiptServiceCatalog,
  ...SERVICE_ALIAS_CATALOG.filter((service) => !primaryServiceIds.has(service.id) && service.aliases.length > 0).map((service) => ({
    id: service.id,
    name: service.name,
    aliases: service.aliases,
    plans: [],
  })),
];
export const normalizedLines = (text) => String(text || "").replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean);

export const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const findLabeledValue = (lines, labels) => {
  const pattern = new RegExp(`^(?:${labels.map(escapeRegExp).join("|")})\\s*[:：-]?\\s*(.*)$`, "i");
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(pattern);
    if (!match) continue;
    if (match[1]?.trim()) return match[1].trim();
    if (lines[index + 1]) return lines[index + 1].trim();
  }
  return "";
};

export const detectService = (text, lines) => {
  const labeled = findLabeledValue(lines, ["서비스명", "서비스", "상품명", "구독명", "가맹점명", "가맹점", "판매자", "상호명"]);
  const candidates = labeled ? [labeled, text] : [text];

  for (const candidate of candidates) {
    const normalized = compact(candidate);
    const matches = detectableServices
      .map((service) => ({
        service,
        aliasLength: Math.max(0, ...service.aliases.filter((alias) => normalized.includes(compact(alias))).map((alias) => compact(alias).length)),
      }))
      .filter((entry) => entry.aliasLength > 0)
      .sort((left, right) => right.aliasLength - left.aliasLength);
    if (matches[0]) return { service: matches[0].service, source: labeled && candidate === labeled ? "labeled-text" : "text-alias" };
  }

  return { service: null, source: "missing" };
};

/**
 * 구독 결제로 볼 최소 금액(원). 이보다 작은 금액은 결제 금액 후보로 쓰지 않는다.
 * 카드 등록·본인 확인용 인증 결제와 소액 결제(100~900원대)를 구독으로 잘못 잡지 않기 위한 값이며,
 * 등록된 요금 중 가장 낮은 값(컬리멤버스 1,900원)보다 낮다. 안드로이드 결제 알림 파서
 * (PaymentParser.MIN_SUBSCRIPTION_AMOUNT_KRW)도 같은 값을 쓴다.
 */
export const MIN_SUBSCRIPTION_AMOUNT_KRW = 1000;

// ── 결제 금액·구독 판정 공통 규칙 (안드로이드 PaymentParser.java와 같은 단어 목록) ──

// 금액 바로 앞에 붙어 결제 금액이 아님을 나타내는 말 ('잔액 500,000원', '누적 승인금액 523,400원', '포인트 적립 300원').
export const NON_CHARGE_PREFIX_PATTERN =
  /(잔액|잔여|누적|한도|포인트|적립(?:금|예정)?|할인|캐시백|쿠폰|마일리지|페이백|리워드|사용\s*가능|이용\s*가능|VAT|부가세|부가가치세|세액)(?:\s*(?:사용|이용|결제|승인|청구))?(?:\s*(?:금액|액))?\s*[:：|]*\s*(?:krw|₩|￦)?\s*$/i;
// 금액 바로 뒤에 붙어 결제 금액이 아님을 나타내는 말 ('300원 적립', '2,000원(할인)').
export const NON_CHARGE_SUFFIX_PATTERN = /^\s*[([]?\s*(?:적립|할인|캐시백|페이백|포인트|쿠폰|리워드|환급|사용\s*가능)/;
// 취소·환불 알림. '취소문의', '환불불가', '취소 가능' 같은 결제 안내 문구는 제외한다.
export const CANCEL_OR_REFUND_PATTERN = new RegExp(
  [
    "결제\\s*취소|승인\\s*취소|취소\\s*승인|주문\\s*취소|취소되었습니다|취소\\s*완료",
    "환불\\s*완료|환불\\s*처리|환불\\s*되었습니다|환불\\s*진행",
    "(?<![가-힣])(?:취소|환불)(?![가-힣])(?!\\s*(?:문의|가능|불가|안내|규정|정책|수수료))",
    "\\b(?:refund(?:ed)?|cancell?ed|reversal|voided)\\b",
    // 환불 대신 크레딧을 돌려주는 'Credit note'와 '플랜이 갱신되지 않습니다' 같은 해지 예약 안내.
    "credit\\s*note|갱신되지\\s*않|(?:will\\s*not|won't)\\s*(?:auto-?)?renew",
  ].join("|"),
  "i"
);
// 카드 등록·본인 확인·결제수단 확인용 인증 결제와 임시 승인.
export const VERIFICATION_CHARGE_PATTERN =
  /(카드\s*(?:인증|등록|확인)|본인\s*(?:인증|확인)\s*(?:결제|승인)|인증\s*(?:결제|승인|금액)|결제\s*수단\s*(?:등록|확인|인증)|유효성\s*(?:확인|검사|검증)|가승인|임시\s*승인|테스트\s*결제|test\s*(?:charge|payment)|temporary\s*(?:hold|authori[sz]ation)|authori[sz]ation\s*hold|card\s*verification|verification\s*charge|pre-?auth)/i;

/** 결제 금액 자리의 숫자가 잔액·누적·포인트·할인 같은 다른 금액인지. */
export const isNonChargeAmountContext = (text, start, end) =>
  NON_CHARGE_PREFIX_PATTERN.test(String(text).slice(0, start)) || NON_CHARGE_SUFFIX_PATTERN.test(String(text).slice(end));

/**
 * 글 전체가 환불·크레딧·결제 취소·해지 안내인지. 제목 역할을 하는 앞 두 줄만 본다.
 * 정상 영수증 본문의 "언제든지 구독을 취소할 수 있습니다", "요금제 취소" 같은 안내 문구로 영수증을 버리지 않기 위해서다.
 */
export const isCancellationDocument = (text) => {
  const head = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("\n");
  return CANCEL_OR_REFUND_PATTERN.test(head);
};

/**
 * 앱스토어 단건 구매 영수증인지. Google Play 영수증은 단건 구매("○○에서 구매하셨습니다")와
 * 구독("구독권을 구매하셨습니다", "구독이 갱신되어", "자동 갱신되는 정기 결제", 무료 체험)을 문구로 구분한다.
 * 실제 메일함 표본에서 Google Play 영수증 58건 중 47건이 게임 아이템·웹툰 쿠키 같은 단건 구매였다.
 */
export const isOneTimeStoreReceipt = (text) => {
  const value = String(text || "");
  return (
    /Google\s*Play(?:의|에서)\s.{0,80}?에서\s*구매하셨습니다/.test(value) &&
    !/(구독|정기\s*결제|자동\s*갱신|무료\s*체험)/.test(value)
  );
};

/**
 * Google Play 구독 영수증에 적힌 판매자 이름("Google Play에서 Chess.com, LLC의 구독권을 구매하셨습니다").
 * 판매자가 적혀 있으면 금액 지문으로 다른 서비스(같은 139,000원인 Disney+ 등)를 추정하지 않고 이 이름을 쓴다.
 */
export const extractStoreSeller = (text) => {
  const match = String(text || "").match(/Google\s*Play(?:에서|를 통한)\s+(.{1,60}?)(?:의\s*구독권을\s*구매|\s*구독이\s*갱신|의\s*무료\s*체험)/);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
};

export const toAmount = (value) => {
  if (value === null || value === undefined) return null;
  const number = Number(String(value).replace(/[^0-9]/g, ""));
  return Number.isFinite(number) && number >= MIN_SUBSCRIPTION_AMOUNT_KRW && number <= 2_000_000 ? number : null;
};

export const toDollarAmount = (value, rate = 1350) => {
  if (value === null || value === undefined) return null;
  const num = parseFloat(String(value).replace(/[^0-9.]/g, ""));
  if (Number.isFinite(num) && num > 0 && num <= 2000) {
    const krw = Math.round(num * rate);
    // 환율로 바꾼 뒤에도 구독 최소 금액보다 작으면(예: USD 0.50 인증 결제) 결제 금액으로 쓰지 않는다.
    return krw >= MIN_SUBSCRIPTION_AMOUNT_KRW ? krw : null;
  }
  return null;
};

export const collectAmounts = (text) => {
  const amounts = [];
  // 표 형식 메일('최종 결제 금액 | ₩ 1,000')도 읽는다. 할인 전 금액보다 '최종' 금액을 우선한다(selectAmount).
  const labeledPattern = /(최종\s*결제\s*금액|결제\s*금액|승인\s*금액|청구\s*금액|이용\s*금액|최종\s*금액|합계|총액)\s*[|:：-]*\s*(?:krw|₩|￦)?\s*([0-9][0-9,]{2,})\s*(?:원|krw)?/gi;
  // '₩11,990의 요금'처럼 '원' 없이 통화 기호만 앞에 붙은 금액도 읽는다.
  const wonPattern = /(?:krw|₩|￦)\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})(?![0-9,])|([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})\s*(?:원|krw)/gi;
  const dollarPattern = /(?:\$|(?<![a-z])usd)\s*([0-9]+(?:\.[0-9]{1,2})?)|(?<![0-9.])([0-9]+(?:\.[0-9]{1,2})?)\s*(?:usd(?![a-z])|\$)/gi;
  let match;
  while ((match = labeledPattern.exec(text)) !== null) {
    if (isNonChargeAmountContext(text, match.index, match.index + match[0].length)) continue;
    const amount = toAmount(match[2]);
    if (amount) amounts.push({ amount, source: "labeled-amount", final: /^최종/.test(match[1]) });
  }
  while ((match = wonPattern.exec(text)) !== null) {
    if (isNonChargeAmountContext(text, match.index, match.index + match[0].length)) continue;
    const amount = toAmount(match[1] || match[2]);
    if (amount) amounts.push({ amount, source: "won-amount" });
  }
  while ((match = dollarPattern.exec(text)) !== null) {
    if (isNonChargeAmountContext(text, match.index, match.index + match[0].length)) continue;
    const raw = match[1] || match[2];
    const amount = toDollarAmount(raw);
    if (amount) amounts.push({ amount, source: "dollar-amount" });
  }
  return amounts.filter((entry, index, list) => list.findIndex((item) => item.amount === entry.amount) === index);
};

export const selectAmount = (text, service) => {
  const amounts = collectAmounts(text);
  const labeled =
    amounts.find((entry) => entry.source === "labeled-amount" && entry.final) ||
    amounts.find((entry) => entry.source === "labeled-amount");
  if (labeled) return labeled;

  if (service) {
    const catalogAmounts = new Set(service.plans.map((plan) => plan.amount));
    const matches = amounts.filter((entry) => catalogAmounts.has(entry.amount));
    if (matches.length === 1) return { ...matches[0], source: "catalog-matched-amount" };
  }

  if (amounts.length === 1) return amounts[0];
  if (amounts.length > 1) return { ...amounts.sort((left, right) => right.amount - left.amount)[0], source: "largest-amount-needs-review" };
  return { amount: null, source: "missing" };
};

export const parseDayFromValue = (value) => {
  if (!value) return null;
  const str = String(value);
  const fullDate = str.match(/(?:20\d{2}\s*[./-]\s*)?(\d{1,2})\s*[./-]\s*(\d{1,2})/);
  if (fullDate) {
    const day = Number(fullDate[2]);
    return day >= 1 && day <= 31 ? day : null;
  }
  const koreanDate = str.match(/(?:\d{4}\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (koreanDate) {
    const day = Number(koreanDate[2]);
    return day >= 1 && day <= 31 ? day : null;
  }
  const dayOnly = str.match(/(?:매월\s*)?(\d{1,2})\s*일/);
  if (dayOnly) {
    const day = Number(dayOnly[1]);
    return day >= 1 && day <= 31 ? day : null;
  }
  return null;
};

export const detectDueDay = (text, lines) => {
  const nextPayment = findLabeledValue(lines, ["다음 결제일", "다음결제일", "결제 예정일", "결제예정일", "자동 결제일", "자동결제일", "갱신일", "청구 예정일"]);
  const nextDay = parseDayFromValue(nextPayment);
  if (nextDay) return { dueDay: nextDay, source: "next-payment-date" };

  const transaction = findLabeledValue(lines, ["결제일시", "결제 일시", "승인일시", "승인 일시", "결제일", "승인일", "거래일"]);
  const transactionDay = parseDayFromValue(transaction);
  if (transactionDay) return { dueDay: transactionDay, source: "transaction-date" };

  const anyDate = parseDayFromValue(text);
  if (anyDate) return { dueDay: anyDate, source: "unlabeled-date-needs-review" };
  return { dueDay: null, source: "missing" };
};

export const detectPaymentMethod = (text, lines) => {
  const labeled = findLabeledValue(lines, ["결제 수단", "결제수단", "지불 수단", "지불수단", "카드명", "카드", "결제방법"]);
  if (labeled) return { paymentMethod: labeled, source: "labeled-text" };

  const payMatch = text.match(/(?:네이버페이|카카오페이|토스페이|삼성페이|애플페이|kb\s*pay|페이코|payco|ssg\s*pay|스마일페이|sk\s*pay|l\.?pay|google\s*pay|paypal)/i);
  if (payMatch) return { paymentMethod: payMatch[0].replace(/\s+/g, " "), source: "payment-alias" };

  const cardMatch = text.match(/(신한|국민|KB국민|현대|삼성|롯데|하나|우리|농협|NH농협|NH|BC|비씨)\s*카드[^0-9]*(?:[*•]+|-)?\s*(\d{4})?/i);
  if (cardMatch) {
    const cardName = cardMatch[1].endsWith("카드") ? cardMatch[1] : cardMatch[1] + "카드";
    return { paymentMethod: cardName + (cardMatch[2] ? " • " + cardMatch[2] : ""), source: "card-alias" };
  }
  return { paymentMethod: "", source: "missing" };
};

export const detectBillingCycle = (text, plan) => {
  // 영수증 본문에는 '(월간)' 요금제 표시 뒤에 '연간 요금제를 보유한 경우…' 같은 안내가 붙기도 하므로
  // 두 표시가 모두 있으면 먼저 나온 쪽(요금제 줄)을 쓰고 확인 필요로 표시한다. '2021년'의 '1년'은 주기가 아니다.
  const annual = text.search(/(?:연간|연 결제|12\s*개월|(?<![0-9])1\s*년|yearly|annual)/i);
  const monthly = text.search(/(?:매월|월간|월 결제|(?<![0-9])1\s*개월|monthly)/i);
  if (annual >= 0 && monthly >= 0) {
    return { billingCycle: annual < monthly ? "매년" : "매월", source: "conflicting-cycle-needs-review" };
  }
  if (annual >= 0) return { billingCycle: "매년", source: "explicit-cycle" };
  if (monthly >= 0) return { billingCycle: "매월", source: "explicit-cycle" };
  if (plan?.billingCycle) return { billingCycle: plan.billingCycle, source: "catalog-inference" };
  return { billingCycle: "매월", source: "default-needs-review" };
};

export const detectPlan = (text, lines, service, amount) => {
  if (!service) return { plan: "", source: "missing", matchedPlan: null };

  const labeled = findLabeledValue(lines, ["요금제", "플랜", "요금 상품", "요금상품", "이용권", "멤버십", "상품명"]);
  const searchable = [labeled, text].filter(Boolean);
  for (const candidate of searchable) {
    const normalized = compact(candidate);
    const explicitMatches = service.plans.filter((plan) => plan.aliases.some((alias) => normalized.includes(compact(alias))));
    if (explicitMatches.length === 1) return { plan: explicitMatches[0].name, source: labeled && candidate === labeled ? "labeled-plan" : "plan-alias", matchedPlan: explicitMatches[0] };
  }

  const amountMatches = amount ? service.plans.filter((plan) => plan.amount === amount) : [];
  if (amountMatches.length === 1) return { plan: amountMatches[0].name, source: "exact-service-amount", matchedPlan: amountMatches[0] };
  return { plan: "", source: amountMatches.length > 1 ? "ambiguous-amount" : "unmatched-amount", matchedPlan: null };
};

export function parseReceiptText(rawText) {
  // 메일 본문의 추적 링크 주소 안 숫자(…88usd…)를 금액으로 읽지 않도록 주소는 먼저 지운다.
  const text = String(rawText || "").replace(/https?:\/\/[^\s)\]>"']+/gi, " ").trim();
  if (!text) return { ok: false, code: "NO_TEXT", message: "이미지에서 글자를 읽지 못했습니다." };

  const lines = normalizedLines(text);
  const serviceResult = detectService(text, lines);
  const storeSeller = serviceResult.service ? "" : extractStoreSeller(text);
  const amountResult = selectAmount(text, serviceResult.service);
  const planResult = detectPlan(text, lines, serviceResult.service, amountResult.amount);
  const dueDayResult = detectDueDay(text, lines);
  const paymentResult = detectPaymentMethod(text, lines);
  const cycleResult = detectBillingCycle(text, planResult.matchedPlan);
  const warnings = [];

  if (!serviceResult.service) warnings.push("서비스를 특정하지 못했습니다. 서비스명을 직접 확인해 주세요.");
  if (!amountResult.amount) warnings.push("결제 금액을 찾지 못했습니다.");
  if (!planResult.plan) warnings.push("금액만으로 요금제를 확정할 수 없어 직접 확인이 필요합니다.");
  if (!dueDayResult.dueDay) warnings.push("결제일을 찾지 못했습니다.");
  else if (dueDayResult.source === "transaction-date") warnings.push("다음 결제일이 없어 거래일의 날짜를 결제일로 입력했습니다.");
  else if (dueDayResult.source.includes("needs-review")) warnings.push("문서에서 찾은 날짜를 결제일로 입력했습니다. 날짜를 확인해 주세요.");
  if (amountResult.source.includes("needs-review")) warnings.push("금액이 여러 개여서 가장 큰 금액을 선택했습니다. 결제 금액을 확인해 주세요.");
  if (cycleResult.source.includes("needs-review")) warnings.push("결제 주기를 확인하지 못해 매월로 표시했습니다.");

  return {
    ok: true,
    data: {
      serviceId: serviceResult.service?.id || "",
      name: serviceResult.service?.name || storeSeller,
      plan: planResult.plan,
      amount: amountResult.amount || "",
      dueDay: dueDayResult.dueDay || "",
      billingCycle: cycleResult.billingCycle,
      paymentMethod: paymentResult.paymentMethod,
    },
    fieldSources: {
      name: serviceResult.service ? serviceResult.source : storeSeller ? "store-seller" : serviceResult.source,
      plan: planResult.source,
      amount: amountResult.source,
      dueDay: dueDayResult.source,
      billingCycle: cycleResult.source,
      paymentMethod: paymentResult.source,
    },
    needsReview: warnings.length > 0,
    warnings,
    catalogVersion: PLAN_CATALOG_VERSION,
  };
}
