import { dateForDueDay, formatWon, getNextChargeDate } from "./dates.js";

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

export const AGENT_INTENTS = ["cancel_refund", "cancel", "refund", "upcoming", "unknown"];

const SERVICE_ALIASES = {
  netflix: ["넷플릭스", "넷플", "netflix"],
  spotify: ["스포티파이", "스포티", "spotify"],
  chatgpt: ["챗지피티", "챗gpt", "지피티", "chatgpt", "gpt"],
  youtube: ["유튜브", "유튜브프리미엄", "youtube", "유튭"],
  adobe: ["어도비", "adobe", "포토샵"],
  icloud: ["아이클라우드", "icloud"],
  claude: ["클로드", "claude"],
  tving: ["티빙", "tving"],
  wavve: ["웨이브", "wavve"],
  watcha: ["왓챠", "watcha"],
  coupangplay: ["쿠팡플레이", "coupangplay"],
  disney: ["디즈니", "디즈니플러스", "disney"],
  melon: ["멜론", "melon"],
  canva: ["캔바", "canva"],
  notion: ["노션", "notion"],
};

const APPLE_BILLED_SERVICE_IDS = ["icloud", "applemusic", "appletv", "apple-arcade", "arcade"];

const KEYWORDS = {
  cancel: ["해지", "취소", "그만", "끊어", "끊고", "해약", "탈퇴", "cancel"],
  refund: ["환불", "돌려받", "돌려줘", "refund"],
  upcoming: ["결제예정", "예정", "이번주", "다음결제", "언제결제", "곧결제", "나갈", "나가는", "결제일"],
};

// 공식 출처 원문으로 확인한 정책만 넣는다. 없으면 "확인 필요"로 답한다.
// verifiedAt은 원문을 마지막으로 확인한 날이다. 정책이 바뀌면 출처를 다시 확인하고 날짜를 고친다.
// checkPhrases는 sourceUrl 원문에 그대로 있는 문구다. 크롤러(npm run crawl:refunds)가 문구가 사라졌는지 주기적으로 확인한다.
export const VERIFIED_REFUND_POLICIES = {
  chatgpt: {
    summary: "결제 금액은 원칙적으로 환불되지 않지만, 한국 거주자는 구매 후 7일 안에 요청하고 그동안 쓰지 않았다면 전액 환불돼요. 해지만으로는 환불되지 않아요. App Store 결제는 Apple에 요청해요.",
    sourceUrl: "https://help.openai.com/en/articles/7232895-how-do-i-request-a-refund-for-chatgpt-plus",
    sourceLabel: "OpenAI 환불 안내",
    verifiedAt: "2026-10-02",
    checkPhrases: [
      "If you live in the Republic of Korea, you will receive a full refund if you request a refund within 7 days",
      "cancellations and refunds must be requested directly from Apple",
    ],
  },
  netflix: {
    summary: "해지하면 현재 결제 기간이 끝날 때 계정이 종료되고 더 청구되지 않아요. Apple로 결제했다면 결제 문의는 Apple 지원에 해요.",
    sourceUrl: "https://help.netflix.com/ko/node/124418",
    sourceLabel: "넷플릭스 고객 센터",
    verifiedAt: "2026-10-02",
    checkPhrases: ["계정은 현재 결제 기간이 종료될 때 자동으로 종료되어 요금이 다시 청구되지 않습니다"],
  },
  youtube: {
    summary: "해지해도 결제 기간 마지막 날까지 혜택이 남고, 남은 기간은 환불되지 않아요. 즉시 해지·환불은 YouTube 지원팀에 요청해요(마지막 결제 후 14일이 지났으면 지원팀 문의). App Store 결제는 Apple 정책을 따라요.",
    sourceUrl: "https://support.google.com/youtube/answer/12014038?hl=ko",
    sourceLabel: "YouTube 고객센터 환불 안내",
    verifiedAt: "2026-10-02",
    checkPhrases: ["마지막 결제 주기 후 14일이 지났다면 지원팀에 문의하여 환불을 요청하세요"],
  },
  spotify: {
    summary: "해지해도 청구 기간이 끝날 때까지 Premium이 유지되고 이후 Free로 바뀌어요. 통신사 등 파트너를 통해 결제했다면 그 파트너에 환불을 요청해요.",
    sourceUrl: "https://support.spotify.com/kr-ko/article/refund-policy/",
    sourceLabel: "Spotify 환불 정책",
    verifiedAt: "2026-10-02",
    checkPhrases: ["청구 기간이 끝날 때까지 계정은 Premium으로 유지됩니다", "파트너를 통해 결제한 Premium 요금"],
  },
  coupang: {
    summary: "그달 혜택을 쓰지 않았다면 해지할 때 그달 월회비를 돌려받아요(최대 7일, 일부 해외카드 최대 14일). 혜택을 썼다면 환불되지 않고 종료 예정일까지 혜택이 유지돼요.",
    sourceUrl: "https://news.coupang.com/archives/64216/",
    sourceLabel: "쿠팡 와우 멤버십 FAQ",
    verifiedAt: "2026-10-02",
    checkPhrases: ["결제된 당월 월회비 환불이 진행되며", "결제된 당월 월회비는 환불되지 않습니다"],
  },
  wavve: {
    summary: "해지하면 다음 결제부터 멈추고 남은 기간은 그대로 볼 수 있어요. 결제 후 7일 안에는 청약철회를 요청할 수 있어요(제한 사유 있음). 그 밖에 환불을 요청하면 쓴 날만큼 일할로 빼고, 회원 사정이면 남은 금액의 10%를 더 빼요. 카드 결제 취소는 결제 후 60일 안에 가능하고, 앱 마켓 결제는 그 마켓 정책을 따라요.",
    sourceUrl: "https://member.wavve.com/signup/terms?category=payment",
    sourceLabel: "웨이브 유료서비스 이용약관",
    verifiedAt: "2026-10-02",
    checkPhrases: [
      "수신확인의 통지를 받은 날로부터 7일 이내에는 청약의 철회를 할 수 있습니다",
      "잔여 금액에서 10% (결제대행수수료 및 부대비용)를 제외한 금액을 환불 조치합니다",
      "결제당일 ~ 2개월(60일) 이내에 결제취소가 가능합니다",
    ],
  },
  watcha: {
    summary: "만료일 전에 해지해도 남은 일수만큼 환불되지 않아요. App Store 결제는 Apple 기기나 Apple 고객센터에서만 해지할 수 있어요.",
    sourceUrl: "https://help.watcha.com/hc/ko/articles/31326576396825",
    sourceLabel: "왓챠 고객센터 해지 안내",
    verifiedAt: "2026-10-02",
    checkPhrases: ["만료일 이전에 해지하셔도 남은 일수 만큼 환불되지 않아요", "애플 기기 혹은 애플 고객센터를 통해서만 가능해요"],
  },
};

export const REFUND_ROUTES = {
  app_store: {
    channelLabel: "App Store(Apple)",
    requestTo: "Apple",
    url: "https://reportaproblem.apple.com/",
    urlLabel: "Apple 문제 신고 페이지",
    note: "App Store로 결제한 구독은 환불을 Apple에 요청해요.",
  },
  google_play: {
    channelLabel: "Google Play",
    requestTo: "Google Play",
    url: "https://support.google.com/googleplay/answer/2479637?hl=ko",
    urlLabel: "Google Play 환불 안내",
    note: "Google Play로 결제한 구독은 Google Play 환불 절차부터 확인해요.",
  },
  carrier: {
    channelLabel: "통신사 결제",
    requestTo: "통신사 고객센터",
    url: null,
    urlLabel: null,
    note: "휴대폰 요금으로 결제했다면 통신사 고객센터(114)에 요청해요.",
  },
  web: {
    channelLabel: "서비스 웹사이트·카드 결제",
    requestTo: null,
    url: null,
    urlLabel: null,
    note: "서비스 웹사이트에서 카드로 결제했다면 해당 서비스 고객센터에 요청해요.",
  },
};

const normalize = (value = "") => String(value).toLowerCase().replace(/[\s·\-_+.]/g, "");

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const subscriptionKey = (subscription) => subscription?.subscriptionId || subscription?.id;

const aliasesFor = (subscription) => {
  const id = normalize(subscription?.id);
  const fromMap = Object.entries(SERVICE_ALIASES)
    .filter(([key]) => id && (id === key || id.startsWith(key)))
    .flatMap(([, aliases]) => aliases);
  return [subscription?.name, subscription?.id, ...fromMap].map(normalize).filter((alias) => alias.length >= 2);
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
  const wantsUpcoming = has(KEYWORDS.upcoming);

  let intent = "unknown";
  if (wantsCancel && wantsRefund) intent = "cancel_refund";
  else if (wantsRefund) intent = "refund";
  else if (wantsCancel) intent = "cancel";
  else if (wantsUpcoming) intent = "upcoming";

  return { intent, subscription: findSubscriptionInText(text, subscriptions) };
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
  const issuer = String(paymentMethod).replace(/[\d•*\-]+/g, " ").replace(/\s+/g, " ").trim();
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

const listForClarify = (subscriptions) => subscriptions.slice(0, 6).map((subscription) => ({
  id: subscriptionKey(subscription),
  name: subscription.name,
}));

function buildActionResponse({ intent, subscription, now, text }) {
  const channel = detectPaymentChannel(subscription);
  const route = REFUND_ROUTES[channel];
  const lastChargeDate = getLastChargeDate(subscription, now);
  const daysSinceCharge = lastChargeDate ? Math.round((startOfDay(now) - startOfDay(lastChargeDate)) / DAY_MS) : null;
  const wantsRefund = intent === "cancel_refund" || intent === "refund";
  const wantsCancel = intent === "cancel_refund" || intent === "cancel";
  const policy = VERIFIED_REFUND_POLICIES[normalize(subscription.id)] || null;
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

function findCancelRecordForPayment(detected = {}, cancelHistory = [], detectedAt) {
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

/**
 * @param {object} options
 * @param {string} options.text 사용자 요청
 * @param {Array} options.subscriptions 사용자 구독 목록
 * @param {Date} [options.now]
 * @param {{intent?: string, subscriptionId?: string|null}} [options.interpretation] AI 해석 결과(검증된 값만)
 */
export function runAgent({ text = "", subscriptions = [], now = new Date(), interpretation = null }) {
  const parsed = parseAgentIntent(text, subscriptions);
  let { intent, subscription } = parsed;
  if (interpretation && AGENT_INTENTS.includes(interpretation.intent)) {
    if (intent === "unknown") intent = interpretation.intent;
    if (!subscription && interpretation.subscriptionId) {
      subscription = subscriptions.find((item) => subscriptionKey(item) === interpretation.subscriptionId || item.id === interpretation.subscriptionId) || null;
    }
  }

  if (intent === "upcoming") return buildUpcomingResponse({ subscriptions, now });

  if (intent === "unknown") {
    return {
      type: "unknown",
      message: "아직 해지, 환불, 결제 예정 확인을 도와드릴 수 있어요. 이렇게 말해 보세요.",
      suggestions: buildSuggestions(subscriptions),
    };
  }

  if (!subscription) {
    return {
      type: "clarify",
      intent,
      message: "어떤 구독을 말씀하시는지 골라 주세요.",
      options: listForClarify(subscriptions),
    };
  }

  return buildActionResponse({ intent, subscription, now, text });
}

export function buildSuggestions(subscriptions = []) {
  const first = subscriptions[0]?.name || "넷플릭스";
  const second = subscriptions[1]?.name || first;
  return [
    first + " 해지하고 환불 받아줘",
    "이번 주 결제 예정 알려줘",
    second + " 해지해줘",
  ];
}
