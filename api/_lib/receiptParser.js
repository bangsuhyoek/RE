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
    aliases: ["coupang wow", "coupang", "쿠팡 와우", "쿠팡와우", "쿠팡"],
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

const compact = (value = "") => value.toLowerCase().replace(/[\s._:/\\()[\]{}-]+/g, "");
const normalizedLines = (text) => text.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findLabeledValue = (lines, labels) => {
  const pattern = new RegExp(`^(?:${labels.map(escapeRegExp).join("|")})\\s*[:：-]?\\s*(.*)$`, "i");
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(pattern);
    if (!match) continue;
    if (match[1]?.trim()) return match[1].trim();
    if (lines[index + 1]) return lines[index + 1].trim();
  }
  return "";
};

const detectService = (text, lines) => {
  const labeled = findLabeledValue(lines, ["서비스명", "서비스", "상품명", "구독명", "가맹점명", "가맹점", "판매자", "상호명"]);
  const candidates = labeled ? [labeled, text] : [text];

  for (const candidate of candidates) {
    const normalized = compact(candidate);
    const matches = receiptServiceCatalog
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

const toAmount = (value) => {
  const number = Number(String(value).replace(/[^0-9]/g, ""));
  return Number.isFinite(number) && number >= 1000 && number <= 2_000_000 ? number : null;
};

const collectAmounts = (text) => {
  const amounts = [];
  const labeledPattern = /(?:결제\s*금액|승인\s*금액|청구\s*금액|이용\s*금액|최종\s*금액|합계|총액)\s*[:：-]?\s*(?:krw|₩|￦)?\s*([0-9][0-9,]{2,})\s*(?:원|krw)?/gi;
  const wonPattern = /(?:krw|₩|￦)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})\s*(?:원|krw)/gi;
  let match;
  while ((match = labeledPattern.exec(text)) !== null) {
    const amount = toAmount(match[1]);
    if (amount) amounts.push({ amount, source: "labeled-amount" });
  }
  while ((match = wonPattern.exec(text)) !== null) {
    const amount = toAmount(match[1]);
    if (amount) amounts.push({ amount, source: "won-amount" });
  }
  return amounts.filter((entry, index, list) => list.findIndex((item) => item.amount === entry.amount) === index);
};

const selectAmount = (text, service) => {
  const amounts = collectAmounts(text);
  const labeled = amounts.find((entry) => entry.source === "labeled-amount");
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

const validDateParts = (year, month, day) => {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const toIsoDate = (year, month, day) =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const parseExplicitFullDate = (value = "") => {
  let match = String(value).match(/(20\d{2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})/);
  if (!match) match = String(value).match(/(20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return validDateParts(year, month, day) ? toIsoDate(year, month, day) : "";
};

const parseDayFromValue = (value) => {
  const fullDate = String(value).match(/(?:20\d{2}\s*[./-]\s*)?(\d{1,2})\s*[./-]\s*(\d{1,2})/);
  if (fullDate) {
    const day = Number(fullDate[2]);
    return day >= 1 && day <= 31 ? day : null;
  }
  const koreanDate = String(value).match(/(?:\d{4}\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (koreanDate) {
    const day = Number(koreanDate[2]);
    return day >= 1 && day <= 31 ? day : null;
  }
  const dayOnly = String(value).match(/(\d{1,2})\s*일/);
  if (dayOnly) {
    const day = Number(dayOnly[1]);
    return day >= 1 && day <= 31 ? day : null;
  }
  return null;
};

const detectDueDay = (text, lines) => {
  const nextPayment = findLabeledValue(lines, ["다음 결제일", "다음결제일", "결제 예정일", "결제예정일", "자동 결제일", "자동결제일", "갱신일", "청구 예정일"]);
  const nextDay = parseDayFromValue(nextPayment);
  if (nextDay) return { dueDay: nextDay, nextBillingDate: parseExplicitFullDate(nextPayment), source: "next-payment-date" };

  const transaction = findLabeledValue(lines, ["결제일시", "결제 일시", "승인일시", "승인 일시", "결제일", "승인일", "거래일"]);
  const transactionDay = parseDayFromValue(transaction);
  if (transactionDay) return { dueDay: transactionDay, nextBillingDate: "", source: "transaction-date" };

  const anyDate = parseDayFromValue(text);
  if (anyDate) return { dueDay: anyDate, nextBillingDate: "", source: "unlabeled-date-needs-review" };
  return { dueDay: null, nextBillingDate: "", source: "missing" };
};

const detectPaymentMethod = (text, lines) => {
  const labeled = findLabeledValue(lines, ["결제 수단", "결제수단", "지불 수단", "지불수단", "카드명", "카드"]);
  if (labeled) return { paymentMethod: labeled, source: "labeled-text" };

  const payMatch = text.match(/(?:네이버페이|카카오페이|토스페이|삼성페이|애플페이|google\s*pay|paypal)/i);
  if (payMatch) return { paymentMethod: payMatch[0], source: "payment-alias" };

  const cardMatch = text.match(/(신한|국민|KB국민|현대|삼성|롯데|하나|우리|농협|NH|BC|비씨)\s*카드[^0-9]*(?:\*+|-)?\s*(\d{4})?/i);
  if (cardMatch) return { paymentMethod: `${cardMatch[1]}카드${cardMatch[2] ? ` • ${cardMatch[2]}` : ""}`, source: "card-alias" };
  return { paymentMethod: "", source: "missing" };
};

const detectBillingCycle = (text, plan) => {
  if (/(?:연간|연 결제|12\s*개월|1\s*년|yearly|annual)/i.test(text)) return { billingCycle: "매년", source: "explicit-cycle" };
  if (/(?:매월|월간|월 결제|1\s*개월|monthly)/i.test(text)) return { billingCycle: "매월", source: "explicit-cycle" };
  if (plan?.billingCycle) return { billingCycle: plan.billingCycle, source: "catalog-inference" };
  return { billingCycle: "매월", source: "default-needs-review" };
};

const detectPlan = (text, lines, service, amount) => {
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
  const text = String(rawText || "").trim();
  if (!text) return { ok: false, code: "NO_TEXT", message: "이미지에서 글자를 읽지 못했습니다." };

  const lines = normalizedLines(text);
  const serviceResult = detectService(text, lines);
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
  if (cycleResult.billingCycle === "매년" && !dueDayResult.nextBillingDate) warnings.push("연간 구독의 정확한 월을 확인하려면 다음 결제일을 날짜로 입력해 주세요.");
  if (amountResult.source.includes("needs-review")) warnings.push("금액이 여러 개여서 가장 큰 금액을 선택했습니다. 결제 금액을 확인해 주세요.");
  if (cycleResult.source.includes("needs-review")) warnings.push("결제 주기를 확인하지 못해 매월로 표시했습니다.");

  return {
    ok: true,
    data: {
      serviceId: serviceResult.service?.id || "",
      name: serviceResult.service?.name || "",
      plan: planResult.plan,
      amount: amountResult.amount || "",
      dueDay: dueDayResult.dueDay || "",
      billingCycle: cycleResult.billingCycle,
      nextBillingDate: dueDayResult.nextBillingDate || "",
      paymentMethod: paymentResult.paymentMethod,
    },
    fieldSources: {
      name: serviceResult.source,
      plan: planResult.source,
      amount: amountResult.source,
      dueDay: dueDayResult.source,
      nextBillingDate: dueDayResult.nextBillingDate ? dueDayResult.source : "missing",
      billingCycle: cycleResult.source,
      paymentMethod: paymentResult.source,
    },
    needsReview: warnings.length > 0,
    warnings,
    catalogVersion: PLAN_CATALOG_VERSION,
  };
}
