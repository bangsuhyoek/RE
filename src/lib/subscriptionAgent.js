import { dateForDueDay, formatWon, getNextChargeDate } from "./dates.js";
import { SERVICE_ALIAS_CATALOG } from "../../api/_lib/serviceAliases.js";
import { unusedStreak } from "./usageCheck.js";

/**
 * 꾸독 에이전트(미니 닷) 판단 로직
 * - 사용자의 요청을 해석하고, 구독 데이터·결제 경로·환불 정책을 "도구"처럼 조회해 실행 계획을 만든다.
 * - 돈이나 계정에 영향을 주는 행동은 모두 승인 요청(approval)을 거친다. 승인 요청은 한 번만 결정할 수 있다.
 * - 꾸독은 결제를 직접 막거나 대신 결제하지 않는다. 비밀번호와 카드번호 전체를 다루지 않는다.
 */

const DAY_MS = 86_400_000;
const ACTION_APPROVAL_TTL_MS = 10 * 60 * 1000;
const ALERT_DECISION_DAYS = 7;
const UPCOMING_WINDOW_DAYS = 7;
const WITHDRAWAL_DAYS = 7;
const MANDATE_TTL_DAYS = 365;

export const AGENT_INTENTS = ["cancel_refund", "cancel", "refund", "upcoming", "spending", "top_cost", "unused", "service_info", "unknown"];

const CLIENT_EXTRA_ALIASES = {
  spotify: ["스포티"],
  chatgpt: ["지피티", "gpt"],
  youtube: ["유튜브프리미엄", "유튭"],
  adobe: ["포토샵"],
  disney: ["디즈니", "disney"],
  claude: ["클로드", "claude"],
  "claude-pro": ["클로드", "claude"],
};

const APPLE_BILLED_SERVICE_IDS = ["icloud", "applemusic", "appletv", "apple-arcade", "arcade"];

const KEYWORDS = {
  cancel: ["해지", "취소", "그만", "끊어", "끊고", "해약", "탈퇴", "cancel"],
  refund: ["환불", "돌려받", "돌려줘", "refund"],
  upcoming: ["결제예정", "예정", "이번주", "다음결제", "언제결제", "곧결제", "나갈", "나가는"],
  spending: ["총지출", "한달지출", "한달얼마", "월지출", "얼마나가", "얼마써", "얼마쓰", "총얼마", "전체지출", "한달구독료", "월구독료", "총구독료", "구독료얼마", "지출얼마", "얼마내", "지출내역"],
  top_cost: ["가장비싼", "제일비싼", "가장큰", "제일큰", "비싼구독", "비싼거", "최대지출", "금액높은", "비싼순"],
  unused: ["안쓰는", "안쓴", "사용안한", "거의안쓴", "정리할"],
  service_info: ["금액", "얼마야", "얼마니", "얼마인지", "얼마지", "결제수단", "요금", "다음결제일", "결제일"],
};

import { VERIFIED_REFUND_POLICIES, REFUND_ROUTES } from "./refundPolicies.js";
export { VERIFIED_REFUND_POLICIES, REFUND_ROUTES };


const normalize = (value = "") => String(value).toLowerCase().replace(/[\s·\-_+.]/g, "");

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const subscriptionKey = (subscription) => subscription?.subscriptionId || subscription?.id;

const aliasesFor = (subscription) => {
  const id = normalize(subscription?.id);
  const catalogAliases = SERVICE_ALIAS_CATALOG
    .filter((entry) => {
      const entryId = normalize(entry.id);
      return id && (
        id === entryId ||
        id === entryId.replace(/[-_]?(pro|plus|all|sub)$/, "") ||
        entryId === id.replace(/[-_]?(pro|plus|all|sub)$/, "") ||
        id.startsWith(entryId + "-") ||
        entryId.startsWith(id + "-")
      );
    })
    .flatMap((entry) => [entry.name, ...(entry.aliases || [])]);
  const extra = CLIENT_EXTRA_ALIASES[id] || [];
  return [subscription?.name, subscription?.id, ...catalogAliases, ...extra]
    .map(normalize)
    .filter((alias) => alias && alias.length >= 2);
};

export function findSubscriptionInText(text, subscriptions = []) {
  const haystack = normalize(text);
  let best = null;
  let bestLength = 0;
  for (const subscription of subscriptions) {
    for (const alias of aliasesFor(subscription)) {
      if (haystack.includes(alias) && alias.length > bestLength) {
        best = subscription;
        bestLength = alias.length;
      }
    }
  }
  return best;
}

export function parseAgentIntent(text, subscriptions = []) {
  const compact = normalize(text);
  const has = (list) => list.some((keyword) => compact.includes(normalize(keyword)));
  const wantsCancel = has(KEYWORDS.cancel);
  const wantsRefund = has(KEYWORDS.refund);
  const wantsTopCost = has(KEYWORDS.top_cost);
  const wantsSpending = has(KEYWORDS.spending);
  const wantsUnused = has(KEYWORDS.unused);
  const wantsUpcoming = has(KEYWORDS.upcoming);
  const wantsServiceInfo = has(KEYWORDS.service_info);
  const subscription = findSubscriptionInText(text, subscriptions);

  let intent = "unknown";
  if (wantsCancel && wantsRefund) intent = "cancel_refund";
  else if (wantsRefund) intent = "refund";
  else if (wantsCancel) intent = "cancel";
  else if (wantsTopCost) intent = "top_cost";
  else if (wantsSpending) intent = "spending";
  else if (wantsUnused) intent = "unused";
  else if (wantsUpcoming) intent = "upcoming";
  else if (wantsServiceInfo && subscription) intent = "service_info";

  return { intent, subscription };
}

export function detectPaymentChannel(subscription = {}) {
  if (subscription.paymentChannel && REFUND_ROUTES[subscription.paymentChannel]) return subscription.paymentChannel;
  const id = normalize(subscription.id);
  if (APPLE_BILLED_SERVICE_IDS.some((appleId) => id === normalize(appleId))) return "app_store";
  const method = String(subscription.paymentMethod || "");
  if (/app\s?store|애플|apple|itunes|아이튠즈/i.test(method)) return "app_store";
  if (/google\s?play|구글/i.test(method)) return "google_play";
  if (/\bskt\b|\bkt\b|lg\s?u\+|유플러스|통신사|휴대폰\s?결제/i.test(method)) return "carrier";
  return "web";
}

export function getCardLast4(paymentMethod = "") {
  const matches = String(paymentMethod).match(/\d{4}/g);
  return matches ? matches[matches.length - 1] : null;
}

export function describePaymentMethod(paymentMethod = "") {
  const last4 = getCardLast4(paymentMethod);
  // 카드번호 전체가 저장돼 있어도 숫자는 모두 지우고 끝 4자리만 따로 표기한다.
  const issuer = String(paymentMethod).replace(/[-0-9•*]+/g, " ").replace(/\s+/g, " ").trim();
  if (!issuer && !last4) return "등록된 결제수단 없음";
  return last4 ? (issuer || "카드") + " (끝자리 " + last4 + ")" : issuer;
}

export function getLastChargeDate(subscription, now = new Date()) {
  if (!subscription?.dueDay) return null;
  const today = startOfDay(now);
  const next = getNextChargeDate(subscription, now);
  if (next.getTime() === today.getTime()) return next;
  if (subscription.billingCycle === "매년") {
    return new Date(next.getFullYear() - 1, next.getMonth(), next.getDate());
  }
  return dateForDueDay(next.getFullYear(), next.getMonth() - 1, subscription.dueDay);
}

export function assessRefund({ daysSinceCharge, serviceName }) {
  if (daysSinceCharge === null || daysSinceCharge === undefined) {
    return { level: "unknown", label: "확인 필요", reason: "최근 결제일을 알 수 없어요. 결제 내역을 먼저 확인해 주세요." };
  }
  if (daysSinceCharge <= WITHDRAWAL_DAYS) {
    return {
      level: "possible",
      label: "가능성 있음",
      reason: "결제 후 " + daysSinceCharge + "일째예요. 사용하지 않았다면 청약철회(원칙 7일)를 근거로 요청할 수 있어요.",
    };
  }
  return {
    level: "review",
    label: "검토 필요",
    reason: "결제 후 " + daysSinceCharge + "일 지났어요. 남은 기간 환불 여부는 " + (serviceName || "서비스") + " 정책에 따라 달라요.",
  };
}

const formatKoreanDate = (date) => date.getFullYear() + "년 " + (date.getMonth() + 1) + "월 " + date.getDate() + "일";
const formatShortDate = (date) => (date.getMonth() + 1) + "월 " + date.getDate() + "일";
const pad2 = (value) => String(value).padStart(2, "0");
const formatEnglishDate = (date) => date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());

const DEFAULT_REFUND_REASON = {
  ko: "결제 후 서비스를 이용하지 않았습니다. (사유가 다르면 수정해 주세요)",
  en: "I have not used the service since this charge.",
};

export function buildRefundDraft({ subscription, lastChargeDate, reason = DEFAULT_REFUND_REASON }) {
  const last4 = getCardLast4(subscription.paymentMethod);
  const method = describePaymentMethod(subscription.paymentMethod);
  const plan = subscription.plan ? " " + subscription.plan : "";
  const chargedKo = lastChargeDate ? formatKoreanDate(lastChargeDate) : "(결제일 입력)";
  const chargedEn = lastChargeDate ? formatEnglishDate(lastChargeDate) : "(charge date)";
  const ko = [
    "제목: [" + subscription.name + "] 구독 해지 및 환불 요청",
    "",
    "안녕하세요. " + subscription.name + plan + " 구독을 해지했고, 최근 결제 건의 환불을 요청드립니다.",
    "- 결제일: " + chargedKo,
    "- 결제 금액: " + formatWon(subscription.amount),
    "- 결제수단: " + method,
    "- 요청 사유: " + reason.ko,
    "",
    "확인 후 환불 처리 부탁드립니다. 감사합니다.",
  ].join("\n");
  const en = [
    "Subject: Cancellation and refund request - " + subscription.name,
    "",
    "Hello, I have cancelled my " + subscription.name + plan + " subscription and would like to request a refund for the most recent charge.",
    "- Charge date: " + chargedEn,
    "- Amount: KRW " + Number(subscription.amount || 0).toLocaleString("en-US"),
    "- Payment method: card ending in " + (last4 || "----"),
    "- Reason: " + reason.en,
    "",
    "Thank you for your help.",
  ].join("\n");
  return { ko, en };
}

// ---------- 승인 요청(approval) ----------

export function createApprovalRequest({ kind, subscription, amount, dueAt, now = new Date(), dedupeKey }) {
  const key = dedupeKey || (kind + ":" + subscriptionKey(subscription) + ":" + new Date(dueAt).toISOString().slice(0, 10));
  return {
    id: key,
    kind,
    subscriptionId: subscriptionKey(subscription),
    serviceName: subscription?.name || "",
    amount: Number(amount ?? subscription?.amount ?? 0),
    dueAt: new Date(dueAt).toISOString(),
    status: "pending",
    createdAt: now.toISOString(),
    decidedAt: null,
  };
}

const DECISION_STATUS = {
  allow: "approved",
  allow_once: "approved_once",
  allow_mandate: "approved_mandate",
  deny: "declined",
};

/**
 * 승인 요청을 한 번만 결정한다.
 * "allow_mandate"(항상 허용 범위로 자동 허용)는 갱신 결제이고 살아 있는 범위의 한도 이하일 때만 된다.
 */
export function decideApproval(request, decision, now = new Date(), mandates = null) {
  if (!request) return { ok: false, reason: "not_found", request };
  if (request.status !== "pending") return { ok: false, reason: "already_decided", request };
  if (now.getTime() > new Date(request.dueAt).getTime()) {
    return { ok: false, reason: "expired", request: { ...request, status: "expired" } };
  }
  const status = DECISION_STATUS[decision];
  if (!status) return { ok: false, reason: "invalid_decision", request };
  if (decision === "allow_mandate") {
    const mandate = findApplicableMandate(mandates, request, now);
    if (!mandate) return { ok: false, reason: "mandate_not_applicable", request };
    return { ok: true, request: { ...request, status, decidedAt: now.toISOString(), mandateId: mandate.id } };
  }
  return { ok: true, request: { ...request, status, decidedAt: now.toISOString() } };
}

export function mergeApproval(approvals = {}, request) {
  const existing = approvals[request.id];
  if (existing && existing.status !== "pending" && request.status === "pending") return approvals;
  return { ...approvals, [request.id]: request };
}

export function resolveApproval(approvals = {}, request) {
  return approvals[request.id] || request;
}

// ---------- "항상 허용" 권한 범위(mandate) ----------

/**
 * 구독 하나에 대해 "이 금액 이하면 항상 허용" 범위를 만든다. 본인 확인(생체인증·기기 잠금·웹 확인)을 거친 뒤에만 부른다.
 * 범위는 1년 뒤 만료되고, 같은 구독에 새로 만들면 이전 범위를 대체한다.
 */
export function createMandate({ subscriptionId, serviceName = "", maxAmount, verifiedWith, now = new Date() }) {
  const limit = Math.round(Number(maxAmount) || 0);
  if (!subscriptionId || limit <= 0) return null;
  return {
    id: "mandate:" + subscriptionId + ":" + now.getTime(),
    subscriptionId: String(subscriptionId),
    serviceName,
    maxAmount: limit,
    verifiedWith,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + MANDATE_TTL_DAYS * DAY_MS).toISOString(),
    revokedAt: null,
  };
}

export function isMandateActive(mandate, now = new Date()) {
  return Boolean(mandate && !mandate.revokedAt && new Date(mandate.expiresAt).getTime() > now.getTime());
}

/** 갱신 결제 승인 요청에 쓸 수 있는 범위를 찾는다. 요금 인상·유료 전환·한도 초과는 자동 허용하지 않는다. */
export function findApplicableMandate(mandates, request, now = new Date()) {
  if (!mandates || !request || request.kind !== "renewal" || request.status !== "pending") return null;
  const mandate = mandates[request.subscriptionId];
  if (!isMandateActive(mandate, now)) return null;
  return Number(request.amount) <= mandate.maxAmount ? mandate : null;
}

export function revokeMandate(mandates = {}, subscriptionId, now = new Date()) {
  const mandate = mandates[subscriptionId];
  if (!isMandateActive(mandate, now)) return mandates;
  return { ...mandates, [subscriptionId]: { ...mandate, revokedAt: now.toISOString() } };
}

/** 서버 기록과 기기 기록 중 구독마다 더 최근에 만들거나 해제한 범위를 남긴다. */
export function mergeMandates(local = {}, remote = []) {
  const next = { ...local };
  const stamp = (mandate) => Math.max(new Date(mandate.createdAt).getTime(), mandate.revokedAt ? new Date(mandate.revokedAt).getTime() : 0);
  for (const mandate of remote) {
    const current = next[mandate.subscriptionId];
    if (!current || stamp(mandate) >= stamp(current)) next[mandate.subscriptionId] = mandate;
  }
  return next;
}

// ---------- 에이전트 실행 ----------

const listForClarify = (subscriptions, preferredId = null) => {
  const list = [...subscriptions];
  if (preferredId) {
    list.sort((a, b) => {
      const aMatch = subscriptionKey(a) === preferredId || a.id === preferredId;
      const bMatch = subscriptionKey(b) === preferredId || b.id === preferredId;
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }
  return list.slice(0, 6).map((subscription) => ({
    id: subscriptionKey(subscription),
    name: subscription.name,
  }));
};

function buildActionResponse({ intent, subscription, now, text }) {
  const channel = detectPaymentChannel(subscription);
  const route = REFUND_ROUTES[channel];
  const lastChargeDate = getLastChargeDate(subscription, now);
  const daysSinceCharge = lastChargeDate ? Math.round((startOfDay(now) - startOfDay(lastChargeDate)) / DAY_MS) : null;
  const wantsRefund = intent === "cancel_refund" || intent === "refund";
  const wantsCancel = intent === "cancel_refund" || intent === "cancel";
  const policy = VERIFIED_REFUND_POLICIES[subscription.id] || VERIFIED_REFUND_POLICIES[normalize(subscription.id)] || null;
  const requestTo = route.requestTo || subscription.name + " 고객센터";
  const refundUrl = route.url || (channel === "web" ? subscription.supportUrl || null : null);

  const findings = [
    { label: "결제 정보", value: subscription.name + (subscription.plan ? " " + subscription.plan : "") + " · " + formatWon(subscription.amount) + " · " + describePaymentMethod(subscription.paymentMethod) },
    { label: "최근 결제", value: lastChargeDate ? formatShortDate(lastChargeDate) + " (" + (daysSinceCharge === 0 ? "오늘" : daysSinceCharge + "일 전") + ")" : "결제일 정보 없음" },
    { label: "결제 경로", value: route.channelLabel + " → 환불은 " + requestTo + "에 요청" },
  ];

  let refund = null;
  if (wantsRefund) {
    const assessment = assessRefund({ daysSinceCharge, serviceName: subscription.name });
    findings.push({ label: "환불 가능성", value: assessment.label + " · " + assessment.reason });
    refund = {
      assessment,
      requestTo,
      url: refundUrl,
      urlLabel: route.urlLabel || (refundUrl ? requestTo + " 페이지" : null),
      note: route.note,
      policy,
      draft: buildRefundDraft({ subscription, lastChargeDate }),
    };
  }

  const steps = [];
  if (wantsCancel) steps.push(subscription.cancelUrl ? "해지 페이지 열고 눌러야 할 버튼 안내" : "해지 경로 안내(공식 해지 링크 없음)");
  if (wantsRefund) steps.push("환불 요청서 작성 (" + requestTo + " 제출용)");

  const approval = createApprovalRequest({
    kind: wantsCancel && wantsRefund ? "cancel_refund" : wantsCancel ? "cancel" : "refund",
    subscription,
    now,
    dueAt: new Date(now.getTime() + ACTION_APPROVAL_TTL_MS),
    dedupeKey: "action:" + subscriptionKey(subscription) + ":" + intent + ":" + now.getTime(),
  });

  return {
    type: "action",
    intent,
    text,
    subscriptionId: subscriptionKey(subscription),
    serviceName: subscription.name,
    hasCancelUrl: Boolean(subscription.cancelUrl),
    wantsCancel,
    wantsRefund,
    toolsUsed: ["구독 정보 조회", "결제일 계산", "결제 경로 판단", wantsRefund ? "환불 정책 확인" : null].filter(Boolean),
    findings,
    policy,
    refund,
    steps,
    approval,
  };
}

const isTrialSubscription = (subscription) => Boolean(subscription?.isTrial || subscription?.status === "trial");

function buildRenewalItem(subscription, now) {
  const next = getNextChargeDate(subscription, now);
  const days = Math.round((startOfDay(next) - startOfDay(now)) / DAY_MS);
  const dueAt = new Date(next.getFullYear(), next.getMonth(), next.getDate(), 23, 59, 59);
  const trial = isTrialSubscription(subscription);
  return {
    days,
    subscriptionId: subscriptionKey(subscription),
    serviceName: subscription.name,
    plan: subscription.plan || "",
    amount: subscription.amount,
    isTrial: trial,
    dateLabel: formatShortDate(next),
    dDay: days === 0 ? "오늘" : "D-" + days,
    payment: describePaymentMethod(subscription.paymentMethod),
    // 무료체험은 유료 전환 승인으로 따로 기록한다. 같은 구독·같은 결제일이면 키가 같아 결정이 하나만 남는다.
    approval: createApprovalRequest({ kind: trial ? "trial_conversion" : "renewal", subscription, now, dueAt }),
  };
}

function buildUpcomingResponse({ subscriptions, now }) {
  const items = subscriptions
    .filter((subscription) => subscription.status !== "cancelled")
    .map((subscription) => buildRenewalItem(subscription, now))
    .filter((item) => item.days >= 0 && item.days <= UPCOMING_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days);
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return {
    type: "upcoming",
    toolsUsed: ["구독 목록 조회", "결제일 계산"],
    summary: items.length
      ? UPCOMING_WINDOW_DAYS + "일 안에 " + items.length + "건, 총 " + formatWon(total) + "이 결제될 예정이에요."
      : UPCOMING_WINDOW_DAYS + "일 안에 결제될 구독이 없어요.",
    items,
  };
}

import { toMonthlyAmount, calculateMonthlyTotal, calculateYearlyTotal } from "./subscriptionMath.js";
export { calculateMonthlyTotal, calculateYearlyTotal };

function buildSpendingResponse({ subscriptions = [] }) {
  const monthly = calculateMonthlyTotal(subscriptions);
  const yearly = calculateYearlyTotal(subscriptions);
  const count = subscriptions.filter((s) => s.status !== "cancelled").length;
  return {
    type: "spending",
    toolsUsed: ["구독 목록 조회", "지출 계산"],
    monthly,
    yearly,
    count,
    summary: "현재 이용 중인 구독 " + count + "개의 월 지출은 " + formatWon(monthly) + ", 연간 예상 지출은 " + formatWon(yearly) + "이에요.",
  };
}

function buildTopCostResponse({ subscriptions = [] }) {
  const active = subscriptions.filter((s) => s.status !== "cancelled");
  const sorted = [...active].sort((a, b) => {
    const amtA = toMonthlyAmount(a);
    const amtB = toMonthlyAmount(b);
    return amtB - amtA;
  });
  const top3 = sorted.slice(0, 3).map((sub) => {
    const monthlyEquivalent = toMonthlyAmount(sub);
    return {
      subscriptionId: subscriptionKey(sub),
      name: sub.name,
      plan: sub.plan || "",
      amount: sub.amount,
      billingCycle: sub.billingCycle || "매월",
      monthlyEquivalent,
    };
  });
  return {
    type: "top_cost",
    toolsUsed: ["구독 목록 조회", "금액 정렬"],
    items: top3,
    summary: top3.length
      ? "가장 지출이 큰 구독 상위 " + top3.length + "개예요."
      : "등록된 구독이 없어요.",
  };
}

function buildUnusedResponse({ subscriptions = [], usageAnswers = {} }) {
  const hasAnswers = usageAnswers && Object.keys(usageAnswers).length > 0;
  if (!hasAnswers) {
    return {
      type: "unused",
      toolsUsed: ["사용 체크 기록 조회"],
      hasRecords: false,
      items: [],
      summary: "아직 기록된 사용 체크 답변이 없어요. 홈의 '오늘 챙길 일'에서 결제 전 사용 여부를 체크해 보세요.",
    };
  }

  const active = subscriptions.filter((s) => s.status !== "cancelled" && !s.isTrial && s.status !== "trial");
  const candidates = active
    .map((sub) => {
      const streak = unusedStreak(usageAnswers, sub);
      return {
        subscriptionId: subscriptionKey(sub),
        name: sub.name,
        amount: sub.amount,
        streak,
      };
    })
    .filter((item) => item.streak > 0)
    .sort((a, b) => b.streak - a.streak);

  if (candidates.length === 0) {
    return {
      type: "unused",
      toolsUsed: ["사용 체크 기록 조회", "연속 미사용 계산"],
      hasRecords: true,
      items: [],
      summary: "최근 사용 체크에서 '안 씀'으로 표시된 구독이 없어요. 모두 잘 활용하고 계시네요!",
    };
  }

  return {
    type: "unused",
    toolsUsed: ["사용 체크 기록 조회", "연속 미사용 계산"],
    hasRecords: true,
    items: candidates,
    summary: "사용 체크에서 잘 안 쓴다고 답한 구독이 " + candidates.length + "개 있어요.",
  };
}

function buildServiceInfoResponse({ subscription, now = new Date() }) {
  const nextCharge = getNextChargeDate(subscription, now);
  const nextChargeLabel = (nextCharge.getMonth() + 1) + "월 " + nextCharge.getDate() + "일";
  const paymentDesc = describePaymentMethod(subscription.paymentMethod);
  return {
    type: "service_info",
    toolsUsed: ["구독 정보 조회", "결제일 계산"],
    subscriptionId: subscriptionKey(subscription),
    serviceName: subscription.name,
    plan: subscription.plan || "",
    amount: subscription.amount,
    billingCycle: subscription.billingCycle || "매월",
    nextPaymentDate: nextChargeLabel,
    paymentMethod: paymentDesc,
    summary: subscription.name + (subscription.plan ? " (" + subscription.plan + ")" : "") + "은 " +
      subscription.billingCycle + " " + formatWon(subscription.amount) + "이며, 다음 결제일은 " +
      nextChargeLabel + ", 결제수단은 " + paymentDesc + "이에요.",
  };
}
/**
 * 결제 사전 알림(D-3, D-1)을 눌렀을 때 그 구독 하나에 대한 갱신 승인 카드를 만든다.
 */
export function buildRenewalResponse({ subscription, now = new Date() }) {
  if (!subscription) return null;
  const item = buildRenewalItem(subscription, now);
  const when = item.days === 0 ? "오늘" : item.days === 1 ? "내일" : item.days + "일 뒤";
  const summary = item.isTrial
    ? when + " " + subscription.name + " 무료체험이 끝나고 " + formatWon(subscription.amount) + "이 결제될 예정이에요."
    : when + " " + subscription.name + " " + formatWon(subscription.amount) + "이 결제될 예정이에요.";
  return {
    type: "upcoming",
    source: "notification",
    toolsUsed: ["구독 정보 조회", "결제일 계산"],
    summary,
    items: [item],
  };
}

// ---------- 결제 감지 경고 ----------

const sameService = (a, b) => {
  const left = normalize(a);
  const right = normalize(b);
  return Boolean(left && right && left === right);
};

export function findActiveSubscriptionForPayment(detected = {}, subscriptions = []) {
  const active = subscriptions.filter((subscription) => subscription.status !== "cancelled");
  const byId = active.find((subscription) =>
    sameService(subscription.id, detected.serviceId) || sameService(subscription.serviceId, detected.serviceId)
  );
  return byId || findSubscriptionInText(detected.name || "", active);
}

export function findCancelRecordForPayment(detected = {}, cancelHistory = [], detectedAt = new Date()) {
  const byText = findSubscriptionInText(detected.name || "", cancelHistory);
  return cancelHistory
    .filter((record) => sameService(record.id, detected.serviceId) || sameService(record.serviceId, detected.serviceId) || record === byText)
    .filter((record) => record.cancelledAt && new Date(record.cancelledAt).getTime() < detectedAt.getTime())
    .sort((a, b) => new Date(b.cancelledAt) - new Date(a.cancelledAt))[0] || null;
}

const ALERT_COPY = {
  price_increase: {
    title: "등록한 금액보다 더 결제됐어요",
    notice: "요금을 올릴 때 사업자는 미리 알리고 따로 동의를 받아야 해요(전자상거래법). 동의한 적이 없다면 이 기록을 증빙으로 남겨 두세요.",
  },
  trial_conversion: {
    title: "무료체험이 유료로 바뀌었어요",
    notice: "무료체험을 유료로 바꿀 때 사업자는 미리 알리고 따로 동의를 받아야 해요(전자상거래법). 동의한 적이 없다면 이 기록을 증빙으로 남겨 두세요.",
  },
  charged_after_cancel: {
    title: "해지한 구독에서 결제됐어요",
    notice: "해지한 뒤 결제됐다면 환불을 요청할 수 있어요. 해외 결제라면 카드사에 이의제기도 할 수 있으니 해지 기록을 지워지지 않게 남겨 두세요.",
  },
};

export const EVIDENCE_TITLES = Object.fromEntries(Object.entries(ALERT_COPY).map(([kind, copy]) => [kind, copy.title]));

/**
 * 결제 알림으로 감지한 결제를 등록된 구독·해지 기록과 비교한다.
 * 요금 인상, 무료체험 유료 전환, 해지 후 결제일 때만 경고 응답을 돌려주고, 평소 결제면 null을 돌려준다.
 * 이미 결제된 뒤의 경고이므로 꾸독이 결제를 되돌리지는 못한다.
 */
export function assessDetectedPayment({ detected = {}, subscriptions = [], cancelHistory = [], now = new Date() }) {
  const amount = Math.round(Number(detected.amount) || 0);
  if (amount <= 0) return null;
  const detectedAt = detected.detectedAt ? new Date(detected.detectedAt) : now;
  const paymentMethod = detected.paymentMethod || "";

  const subscription = findActiveSubscriptionForPayment(detected, subscriptions);
  let kind = null;
  let previousAmount = null;
  let base = subscription;
  let cancelRecord = null;

  if (subscription) {
    // 공동 이용이면 사용자 부담금이 아니라 카드에 찍히는 전체 금액과 비교한다.
    previousAmount = Math.round(Number(subscription.grossAmount ?? subscription.amount) || 0);
    if (isTrialSubscription(subscription)) kind = "trial_conversion";
    else if (previousAmount > 0 && amount > previousAmount) kind = "price_increase";
  } else {
    cancelRecord = findCancelRecordForPayment(detected, cancelHistory, detectedAt);
    if (cancelRecord) {
      kind = "charged_after_cancel";
      base = cancelRecord;
      previousAmount = Math.round(Number(cancelRecord.amount) || 0) || null;
    }
  }
  if (!kind) return null;

  const serviceName = base.name || detected.name || "구독";
  const findings = [
    { label: "감지한 결제", value: serviceName + " · " + formatWon(amount) + " · " + formatShortDate(detectedAt) },
    { label: "결제수단", value: describePaymentMethod(paymentMethod || base.paymentMethod) },
  ];
  if (kind === "price_increase") {
    findings.push({ label: "등록 금액", value: formatWon(previousAmount) + " → " + formatWon(amount) + " (+" + formatWon(amount - previousAmount) + ")" });
  }
  if (kind === "trial_conversion") {
    findings.push({ label: "등록 상태", value: "무료체험 중으로 등록돼 있었어요" });
  }
  if (kind === "charged_after_cancel") {
    findings.push({ label: "해지 기록", value: formatKoreanDate(new Date(cancelRecord.cancelledAt)) + " 꾸독에서 해지 완료로 처리" });
  }

  const decisionDue = new Date(detectedAt.getTime() + ALERT_DECISION_DAYS * DAY_MS);
  const approval = kind === "charged_after_cancel"
    ? null
    : createApprovalRequest({
      kind,
      subscription,
      amount,
      now,
      dueAt: decisionDue,
      dedupeKey: kind + ":" + subscriptionKey(subscription) + ":" + formatEnglishDate(detectedAt) + ":" + amount,
    });
  if (approval) approval.previousAmount = previousAmount;

  const channel = detectPaymentChannel({ ...base, paymentMethod: paymentMethod || base.paymentMethod });
  const route = REFUND_ROUTES[channel];
  const refundSubject = { ...base, name: serviceName, amount, paymentMethod: paymentMethod || base.paymentMethod };
  const refund = kind === "charged_after_cancel"
    ? {
      requestTo: route.requestTo || serviceName + " 고객센터",
      url: route.url || base.supportUrl || null,
      urlLabel: route.urlLabel,
      note: route.note,
      draft: buildRefundDraft({
        subscription: refundSubject,
        lastChargeDate: detectedAt,
        reason: {
          ko: formatKoreanDate(new Date(cancelRecord.cancelledAt)) + "에 해지했는데 이후 결제가 발생했습니다.",
          en: "I cancelled on " + formatEnglishDate(new Date(cancelRecord.cancelledAt)) + ", but I was charged afterwards.",
        },
      }),
    }
    : null;

  return {
    type: "alert",
    kind,
    title: ALERT_COPY[kind].title,
    notice: ALERT_COPY[kind].notice,
    subscriptionId: subscription ? subscriptionKey(subscription) : null,
    cancelRecordSubscriptionId: cancelRecord?.subscriptionId ?? null,
    serviceId: cancelRecord?.serviceId ?? cancelRecord?.id ?? null,
    serviceName,
    amount,
    previousAmount,
    detectedAt: detectedAt.toISOString(),
    paymentMethod: paymentMethod || base.paymentMethod || "",
    cancelledAt: cancelRecord?.cancelledAt || null,
    toolsUsed: ["결제 알림 분석", subscription ? "등록 금액 비교" : "해지 기록 확인"],
    findings,
    approval,
    refund,
  };
}

// ---------- 증빙 사건 ----------

const EVIDENCE_LABEL = {
  payment_message: "결제 알림",
  cancel_record: "해지 기록",
  decision_log: "꾸독 승인 기록",
};

export function createEvidenceCase(alert, now = new Date()) {
  const items = [
    {
      type: "payment_message",
      capturedAt: alert.detectedAt,
      detail: alert.serviceName + " " + formatWon(alert.amount) + " 결제 (" + describePaymentMethod(alert.paymentMethod) + ")",
    },
  ];
  if (alert.cancelledAt) {
    items.push({ type: "cancel_record", capturedAt: alert.cancelledAt, detail: "꾸독에서 해지 완료로 처리" });
  }
  return {
    id: "case:" + alert.kind + ":" + (alert.subscriptionId || normalize(alert.serviceName)) + ":" + alert.detectedAt.slice(0, 10) + ":" + alert.amount,
    kind: alert.kind,
    subscriptionId: alert.subscriptionId || null,
    title: alert.title,
    serviceName: alert.serviceName,
    amount: alert.amount,
    previousAmount: alert.previousAmount,
    createdAt: now.toISOString(),
    items,
  };
}

export function appendDecisionToCase(evidenceCase, approval) {
  if (!evidenceCase || !approval || approval.status === "pending") return evidenceCase;
  const exists = evidenceCase.items.some((item) => item.type === "decision_log" && item.approvalId === approval.id);
  if (exists) return evidenceCase;
  const label = approval.status === "approved_once" ? "새 금액으로 계속 이용" : approval.status === "declined" ? "거절하고 해지 진행" : approval.status;
  return {
    ...evidenceCase,
    items: [...evidenceCase.items, { type: "decision_log", capturedAt: approval.decidedAt, detail: label, approvalId: approval.id }],
  };
}

const formatDateTime = (iso) => {
  const date = new Date(iso);
  return formatKoreanDate(date) + " " + pad2(date.getHours()) + ":" + pad2(date.getMinutes());
};

export function formatEvidenceSummary(evidenceCase) {
  if (!evidenceCase) return "";
  const lines = [
    "[꾸독 증빙 기록] " + evidenceCase.title,
    "서비스: " + evidenceCase.serviceName,
    "결제 금액: " + formatWon(evidenceCase.amount) + (evidenceCase.kind === "price_increase" && evidenceCase.previousAmount ? " (기존 등록 금액 " + formatWon(evidenceCase.previousAmount) + ")" : ""),
    "",
    "경과",
    ...[...evidenceCase.items]
      .sort((a, b) => new Date(a.capturedAt) - new Date(b.capturedAt))
      .map((item) => "- " + formatDateTime(item.capturedAt) + " " + EVIDENCE_LABEL[item.type] + ": " + item.detail),
    "",
    "결제 화면 캡처, 가입·인상 안내 메일, 해지 확인 메일이 있으면 함께 첨부하세요.",
  ];
  return lines.join("\n");
}

const REFERENCE_WORDS = ["그거", "그것", "이거", "이것", "거기", "방금", "아까", "그 구독"];
const CONTEXT_REUSABLE_INTENTS = ["cancel", "refund", "cancel_refund", "service_info"];

export function applyConversationContext(parsed, context = {}, subscriptions = [], rawText = "") {
  let { intent, subscription } = parsed;
  const compact = normalize(rawText);
  const hasRef = REFERENCE_WORDS.some((w) => compact.includes(normalize(w)));

  // (a) if no subscription found and text contains a reference word and lastSubscriptionId exists -> use that subscription
  if (!subscription && hasRef && context.lastSubscriptionId) {
    const found = subscriptions.find(
      (s) => subscriptionKey(s) === context.lastSubscriptionId || s.id === context.lastSubscriptionId
    );
    if (found) {
      subscription = found;
      if (intent === "unknown") {
        const has = (list) => list.some((keyword) => compact.includes(normalize(keyword)));
        if (has(KEYWORDS.service_info)) {
          intent = "service_info";
        }
      }
    }
  }

  // (b) if a subscription is found but intent is unknown and lastIntent is one of cancel/refund/cancel_refund/service_info -> reuse lastIntent
  if (subscription && intent === "unknown" && context.lastIntent && CONTEXT_REUSABLE_INTENTS.includes(context.lastIntent)) {
    intent = context.lastIntent;
  }

  return { intent, subscription };
}

/**
 * @param {object} options
 * @param {string} options.text 사용자 요청
 * @param {Array} options.subscriptions 사용자 구독 목록
 * @param {Date} [options.now]
 * @param {{intent?: string, subscriptionId?: string|null}} [options.interpretation] AI 해석 결과(검증된 값만)
 * @param {{lastSubscriptionId?: string|null, lastIntent?: string|null}} [options.context] 대화 단기 기억
 * @param {object} [options.usageAnswers] 사용 체크 기록
 */
export function runAgent({ text = "", subscriptions = [], now = new Date(), interpretation = null, context = null, usageAnswers = {} }) {
  let parsed = parseAgentIntent(text, subscriptions);
  if (context) {
    parsed = applyConversationContext(parsed, context, subscriptions, text);
  }
  let { intent, subscription } = parsed;
  if (interpretation && AGENT_INTENTS.includes(interpretation.intent)) {
    if (intent === "unknown") intent = interpretation.intent;
    if (!subscription && interpretation.subscriptionId) {
      subscription = subscriptions.find((item) => subscriptionKey(item) === interpretation.subscriptionId || item.id === interpretation.subscriptionId) || null;
    }
  }

  if (intent === "spending") return buildSpendingResponse({ subscriptions });
  if (intent === "top_cost") return buildTopCostResponse({ subscriptions });
  if (intent === "unused") return buildUnusedResponse({ subscriptions, usageAnswers });
  if (intent === "upcoming") return buildUpcomingResponse({ subscriptions, now });
  if (intent === "service_info") {
    if (!subscription) {
      return {
        type: "clarify",
        intent,
        message: "어떤 구독의 정보를 확인할까요?",
        options: listForClarify(subscriptions, context?.lastSubscriptionId),
      };
    }
    return buildServiceInfoResponse({ subscription, now });
  }

  if (intent === "unknown") {
    return {
      type: "unknown",
      message: "해지, 환불, 결제 예정, 총 지출, 가장 비싼 구독, 안 쓰는 구독 조회를 도와드릴 수 있어요. 이렇게 말해 보세요.",
      suggestions: buildSuggestions(subscriptions),
    };
  }

  if (!subscription) {
    return {
      type: "clarify",
      intent,
      message: "어떤 구독을 말씀하시는지 골라 주세요.",
      options: listForClarify(subscriptions, context?.lastSubscriptionId),
    };
  }

  return buildActionResponse({ intent, subscription, now, text });
}

export function buildSuggestions(subscriptions = []) {
  const first = subscriptions[0]?.name || "넷플릭스";
  const second = subscriptions[1]?.name || first;
  return [
    "한 달 총 지출 얼마야?",
    "가장 비싼 구독이 뭐야?",
    "안 쓰는 구독 있어?",
    first + " 해지하고 환불 받아줘",
    "이번 주 결제 예정 알려줘",
    second + " 해지해줘",
  ];
}
