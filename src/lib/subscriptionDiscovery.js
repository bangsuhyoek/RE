import { parseReceiptText, collectAmounts, parseDayFromValue, detectPaymentMethod } from "../../api/_lib/receiptParser.js";
import { detectTrialText } from "./trialGuard.js";
import { scanInstalledSubscriptionApps, scanActivePaymentNotifications } from "./paymentCapture.js";
import { isDuplicateSubscription } from "./subscriptionAdd.js";

/**
 * 한국 주요 구독 요금제 가격 지문(Price Fingerprint) 및 별칭 사전.
 * 카드 명세서나 알림에 '구글플레이', '애플코리아', '이니시스', '토스페이먼츠'처럼 PG사 이름만 찍히거나
 * 쿠팡·네이버·배민처럼 일반 결제와 멤버십 결제가 섞여 있을 때 정확한 구독 서비스를 역추적한다.
 */
export const DISCOVERY_SERVICE_SPECS = [
  { id: "netflix", name: "Netflix", category: "OTT", aliases: ["netflix", "넷플릭스", "넷플"], amounts: [5500, 13500, 17000], strictAmount: false, defaultPlan: "스탠다드", defaultAmount: 13500 },
  { id: "youtube", name: "YouTube Premium", category: "OTT", aliases: ["youtube premium", "youtube", "유튜브프리미엄", "유튜브", "구글유튜브", "google*youtube"], amounts: [8690, 10450, 14900], strictAmount: false, defaultPlan: "개인 멤버십", defaultAmount: 14900 },
  { id: "tving", name: "티빙", category: "OTT", aliases: ["tving", "티빙", "cjenm"], amounts: [5500, 9500, 13500, 17000], strictAmount: false, defaultPlan: "스탠다드", defaultAmount: 13500 },
  { id: "disney", name: "Disney+", category: "OTT", aliases: ["disney+", "disneyplus", "디즈니+", "디즈니플러스"], amounts: [9900, 13900, 99000, 139000], annualAmounts: [99000, 139000], strictAmount: false, defaultPlan: "스탠다드", defaultAmount: 9900 },
  { id: "wavve", name: "Wavve", category: "OTT", aliases: ["wavve", "웨이브", "콘텐츠웨이브"], amounts: [7900, 10900, 13900], strictAmount: false, defaultPlan: "스탠다드", defaultAmount: 10900 },
  { id: "watcha", name: "왓챠", category: "OTT", aliases: ["watcha", "왓챠"], amounts: [7900, 12900], strictAmount: false, defaultPlan: "베이직", defaultAmount: 7900 },
  { id: "laftel", name: "라프텔", category: "OTT", aliases: ["laftel", "라프텔"], amounts: [9900, 14900], strictAmount: false, defaultPlan: "베이직", defaultAmount: 9900 },
  { id: "appletv", name: "Apple TV+", category: "OTT", aliases: ["apple tv+", "appletv", "애플tv"], amounts: [6500], strictAmount: false, defaultPlan: "월간", defaultAmount: 6500 },
  { id: "coupang", name: "쿠팡 와우", category: "쇼핑", aliases: ["쿠팡와우", "와우멤버십", "coupang wow", "쿠팡(와우)", "쿠팡"], amounts: [4990, 7890], strictAmount: true, defaultPlan: "와우 멤버십", defaultAmount: 7890 },
  { id: "naver", name: "네이버플러스 멤버십", category: "쇼핑", aliases: ["네이버플러스", "네이버멤버십", "naver plus", "네이버파이낸셜"], amounts: [4900, 46800], annualAmounts: [46800], strictAmount: true, defaultPlan: "월간", defaultAmount: 4900 },
  { id: "baemin-club", name: "배민클럽", category: "쇼핑", aliases: ["배민클럽", "우아한형제들", "배달의민족"], amounts: [1990, 3990], strictAmount: true, defaultPlan: "월간", defaultAmount: 3990 },
  { id: "yogipass", name: "요기패스X", category: "쇼핑", aliases: ["요기패스", "요기패스x", "위대한상상"], amounts: [2900, 4900], strictAmount: true, defaultPlan: "월간", defaultAmount: 2900 },
  { id: "kurly-members", name: "컬리멤버스", category: "쇼핑", aliases: ["컬리멤버스", "마켓컬리", "컬리"], amounts: [1900], strictAmount: true, defaultPlan: "월간", defaultAmount: 1900 },
  { id: "spotify", name: "Spotify", category: "음악", aliases: ["spotify", "스포티파이"], amounts: [8690, 10900, 11990, 17900], strictAmount: false, defaultPlan: "개인", defaultAmount: 10900 },
  { id: "melon", name: "멜론", category: "음악", aliases: ["melon", "멜론", "카카오엔터테인먼트"], amounts: [7900, 10900, 11900], strictAmount: false, defaultPlan: "스트리밍 클럽", defaultAmount: 7900 },
  { id: "genie", name: "지니뮤직", category: "음악", aliases: ["genie", "지니뮤직", "지니"], amounts: [7400, 8400, 10900], strictAmount: false, defaultPlan: "스마트 음악감상", defaultAmount: 8400 },
  { id: "flo", name: "FLO", category: "음악", aliases: ["flo", "플로", "드림어스컴퍼니"], amounts: [7900, 8000, 10900], strictAmount: false, defaultPlan: "무제한 듣기", defaultAmount: 8000 },
  { id: "ytmusic", name: "YouTube Music", category: "음악", aliases: ["youtube music", "유튜브뮤직"], amounts: [8690, 11990], strictAmount: false, defaultPlan: "개인", defaultAmount: 11990 },
  { id: "applemusic", name: "Apple Music", category: "음악", aliases: ["apple music", "애플뮤직"], amounts: [8900, 13500], strictAmount: false, defaultPlan: "개인", defaultAmount: 8900 },
  { id: "millie", name: "밀리의 서재", category: "도서/웹툰", aliases: ["millie", "밀리의서재", "밀리의 서재"], amounts: [9900, 99000], annualAmounts: [99000], strictAmount: false, defaultPlan: "전자책 정기구독", defaultAmount: 9900 },
  { id: "ridiselect", name: "리디셀렉트", category: "도서/웹툰", aliases: ["ridiselect", "리디셀렉트", "리디북스"], amounts: [4900], strictAmount: true, defaultPlan: "월 정기구독", defaultAmount: 4900 },
  { id: "welaaa", name: "윌라 오디오북", category: "도서/웹툰", aliases: ["welaaa", "윌라"], amounts: [9900, 12500], strictAmount: false, defaultPlan: "멤버십", defaultAmount: 12500 },
  { id: "chatgpt", name: "ChatGPT Plus", category: "소프트웨어", aliases: ["chatgpt", "openai", "챗지피티", "챗gpt"], amounts: [27000, 29000], strictAmount: false, defaultPlan: "ChatGPT Plus", defaultAmount: 29000 },
  { id: "claude-pro", name: "Claude Pro", category: "SaaS", aliases: ["claude", "anthropic", "클로드"], amounts: [27000, 29000], strictAmount: false, defaultPlan: "Claude Pro", defaultAmount: 29000 },
  { id: "perplexity-pro", name: "Perplexity Pro", category: "SaaS", aliases: ["perplexity", "퍼플렉시티"], amounts: [27000, 29000], strictAmount: false, defaultPlan: "Perplexity Pro", defaultAmount: 27000 },
  { id: "cursor-pro", name: "Cursor Pro", category: "SaaS", aliases: ["cursor", "anysphere"], amounts: [27000, 29000], strictAmount: false, defaultPlan: "Pro", defaultAmount: 27000 },
  { id: "notion", name: "Notion", category: "SaaS", aliases: ["notion", "노션"], amounts: [11000, 13500, 20000], strictAmount: false, defaultPlan: "Plus", defaultAmount: 13500 },
  { id: "figma", name: "Figma Professional", category: "SaaS", aliases: ["figma", "피그마"], amounts: [16200, 20250, 21000], strictAmount: false, defaultPlan: "Professional", defaultAmount: 21000 },
  { id: "canva", name: "Canva Pro", category: "SaaS", aliases: ["canva", "캔바"], amounts: [14000, 14900], strictAmount: false, defaultPlan: "Canva Pro", defaultAmount: 14000 },
  { id: "adobe", name: "Adobe Creative Cloud", category: "SaaS", aliases: ["adobe", "어도비"], amounts: [13200, 26400, 35200, 61600], strictAmount: false, defaultPlan: "포토그래피 플랜", defaultAmount: 13200 },
  { id: "ms365", name: "Microsoft 365", category: "SaaS", aliases: ["microsoft 365", "office 365", "마이크로소프트365"], amounts: [8900, 11900, 89000], annualAmounts: [89000], strictAmount: false, defaultPlan: "Personal", defaultAmount: 8900 },
  { id: "duolingo-super", name: "Duolingo Super", category: "교육", aliases: ["duolingo", "듀오링고"], amounts: [12900, 14000, 89000], annualAmounts: [89000], strictAmount: false, defaultPlan: "Super", defaultAmount: 14000 },
  { id: "skt-universe", name: "T 우주패스", category: "기타", aliases: ["우주패스", "t우주"], amounts: [4900, 9900], strictAmount: false, defaultPlan: "우주패스 all", defaultAmount: 9900 },
  { id: "lgu-yudok", name: "U+ 유독", category: "기타", aliases: ["유독", "u+유독"], amounts: [4900, 9900, 13900], strictAmount: false, defaultPlan: "유독 픽", defaultAmount: 9900 },
];

/**
 * 한국 사용자의 정기결제가 집중된 5대 구독 허브 바로가기.
 * 외부 API 비용 없이 사용자가 한 번의 탭으로 숨은 인앱/간편결제 구독 목록을 확인·복사할 수 있다.
 */
export const SUBSCRIPTION_HUBS = [
  {
    id: "google-play",
    name: "Google Play 정기 결제",
    badge: "인앱결제 1위",
    description: "유튜브·티빙·듀오링고·밀리의서재 등 안드로이드 인앱 구독과 무료 체험이 모두 모여 있어요.",
    url: "https://play.google.com/store/account/subscriptions",
    packageName: "com.android.vending",
    tip: "구글 플레이 정기 결제 화면에서 내용을 복사하거나 공유하면 바로 자동 등록돼요.",
  },
  {
    id: "naver-pay",
    name: "네이버페이 정기결제 · 멤버십",
    badge: "간편결제",
    description: "네이버플러스 멤버십과 네이버페이로 자동결제 연결된 모든 외부 구독을 확인할 수 있어요.",
    url: "https://order.pay.naver.com/home?tabMenu=REGULAR_PAYMENT",
    packageName: "com.nhn.android.search",
    tip: "정기결제 내역 텍스트를 그대로 복사해 '명세서·내역 붙여넣기'에 넣으면 한 번에 인식돼요.",
  },
  {
    id: "youtube-memberships",
    name: "YouTube 유료 멤버십",
    badge: "OTT · 음악",
    description: "YouTube Premium, YouTube Music, 채널 멤버십의 정확한 결제일과 요금제를 확인해요.",
    url: "https://www.youtube.com/paid_memberships",
    packageName: "com.google.android.youtube",
    tip: "다음 결제일 문구를 복사해 붙여넣으면 결제일까지 정확히 맞춰 드려요.",
  },
  {
    id: "apple-subscriptions",
    name: "Apple 구독 관리 (iCloud · App Store)",
    badge: "iOS · 인앱",
    description: "카드 명세서에 'APPLE.COM/BILL'로만 찍히는 아이폰·아이패드 인앱 구독을 찾아내요.",
    url: "https://apps.apple.com/account/subscriptions",
    packageName: "",
    tip: "애플 영수증이나 구독 화면을 캡처·복사해 넣으면 숨은 애플 구독을 찾아드려요.",
  },
  {
    id: "telecom-bundles",
    name: "통신 3사 구독 (T우주 · KT OTT · U+ 유독)",
    badge: "통신비 합산",
    description: "카드 내역에 안 나오고 휴대폰 요금에 합산 청구되는 우주패스·유독·OTT 결합 상품이에요.",
    url: "https://m.tworld.co.kr/v6/plan/submain",
    packageName: "com.sktelecom.minit",
    tip: "통신사 앱의 나의 가입부가서비스 화면에서 구독 중인 상품을 확인할 수 있어요.",
  },
];

const NEGATIVE_LINE_PATTERN = /(취소|환불|승인취소|결제취소|반품|카드대금|후불교통|교통카드|송금|이체|ATM|적금|대출|이자|현금서비스|배송완료|장바구니)/i;
const RECURRING_HINT_PATTERN = /(정기|자동결제|정기결제|매월|구독|멤버십|와우|플러스멤버십|월간|연간|자동이체|빌링|인보이스|invoice|receipt|주문\s*영수증|결제\s*영수증|갱신)/i;
const PG_MASKED_PATTERN = /(google\s*\*?\s*services|google\s*play|구글플레이|애플코리아|apple\.com\/bill|이니시스|kg이니시스|토스페이먼츠|나이스페이|다날|케이씨피|nhn\s*kcp)/i;
const OFFLINE_SUFFIX_PATTERN = /(헤어|미용실|치과|식당|마트|로지스틱스|물류|카페|베이커리|의원|병원|모텔|호텔|빌딩|세탁|주유소|약국|분식|반점|편의점|택시)/;
// 결제 허브 화면에서 이미 끝났거나 갱신되지 않는 구독을 가려낸다. '구독 취소' 버튼 글자는 걸러내지 않는다.
const HUB_NEGATIVE_PATTERN = /(취소됨|만료됨|해지됨|해지\s*예정|만료\s*예정|결제\s*취소|승인\s*취소|환불\s*완료)/;
const HUB_RECURRING_PATTERN = /(\/\s*(월|년|month|year)|매월|매년|다음\s*결제|결제\s*예정|정기|갱신|구독|멤버십|renews|monthly|yearly)/i;
const ANNUAL_HINT_PATTERN = /(\/\s*년|\/\s*year|연간|매년|yearly|annual)/i;
const MONTHLY_HINT_PATTERN = /(\/\s*월|\/\s*month|월간|매월|monthly)/i;
const WON_PREFIX_PATTERN = /(?:₩|￦|krw)\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})/i;

function cleanToken(value = "") {
  return String(value || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

// '14,900원'뿐 아니라 결제 허브 화면에 흔한 '₩14,900/월' 표기도 금액으로 읽는다.
function extractAmount(chunk) {
  const amounts = collectAmounts(chunk);
  if (amounts[0]?.amount) return amounts[0].amount;
  const match = String(chunk || "").match(WON_PREFIX_PATTERN);
  if (!match) return 0;
  const value = Number(match[1].replace(/,/g, ""));
  return value >= 1000 && value <= 2_000_000 ? value : 0;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

// 연간 구독은 다음 결제일(YYYY-MM-DD)이 있어야 결제일 계산이 맞는다. 글 속 날짜의 다음 돌아오는 날을 쓴다.
export function nextAnnualBillingDate(text, now = new Date()) {
  const source = String(text || "");
  const match =
    source.match(/(?:20\d{2}\s*[./-]\s*)?(\d{1,2})\s*[./-]\s*(\d{1,2})/) ||
    source.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  let month = match ? Number(match[1]) : now.getMonth() + 1;
  let day = match ? Number(match[2]) : now.getDate();
  if (!(month >= 1 && month <= 12 && day >= 1 && day <= 31)) {
    month = now.getMonth() + 1;
    day = now.getDate();
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let year = now.getFullYear();
  if (new Date(year, month - 1, day) < today) year += 1;
  return year + "-" + pad2(month) + "-" + pad2(day);
}

function buildExistingIds(existingSubscriptions = []) {
  return new Set(
    (existingSubscriptions || [])
      .filter((s) => s.status !== "cancelled")
      .map((s) => cleanToken(s.serviceId || s.id || s.name))
      .filter(Boolean)
  );
}

/**
 * 결제 주기를 글 속 표시(/년·연간, /월·매월)와 요금제 가격(카탈로그 plans, 서비스별 연간 가격)으로 판정한다.
 * 근거가 없으면 월간으로 두고 cycleConfirmed=false 로 알려 사용자가 모달에서 직접 고르게 한다.
 */
export function inferBillingCycle({ amount, text = "", spec = null, catalogItem = null } = {}) {
  const source = String(text || "");
  if (ANNUAL_HINT_PATTERN.test(source)) return { billingCycle: "매년", cycleConfirmed: true };
  if (MONTHLY_HINT_PATTERN.test(source)) return { billingCycle: "매월", cycleConfirmed: true };

  const value = Number(amount) || 0;
  if (value > 0) {
    const plan = (catalogItem?.plans || []).find((p) => Number(p.amount) === value && p.billingCycle);
    if (plan) return { billingCycle: plan.billingCycle === "매년" ? "매년" : "매월", cycleConfirmed: true };
    if (spec?.annualAmounts?.includes(value)) return { billingCycle: "매년", cycleConfirmed: true };
    if (spec?.amounts?.includes(value)) return { billingCycle: "매월", cycleConfirmed: true };
  }
  return { billingCycle: "매월", cycleConfirmed: false };
}

let fallbackIdCounter = 0;

// 같은 밀리초에 여러 건을 만들어도 겹치지 않는 구독 ID. randomUUID 가 없는 오래된 웹뷰는 시간·순번·난수를 섞는다.
export function createSubscriptionId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  fallbackIdCounter += 1;
  return Date.now().toString(36) + "-" + fallbackIdCounter.toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function normalizeName(value = "") {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

/**
 * 숨은 구독 찾기에서 고른 항목을 구독 레코드로 만든다. 기존 목록과 이번 묶음 안에서 같은 구독(이름+요금제,
 * 또는 해지되지 않은 같은 서비스)은 한 번만 넣고, 항목마다 고유 ID 를 붙인다.
 * 같은 serviceId 는 요금제가 달라도 제외한다. 결제 내역에서 찾은 요금제 이름은 추정이라(금액·기본 플랜으로 채움)
 * 이미 쓰는 서비스를 요금제 이름만 다르게 한 번 더 등록하는 것을 막기 위해서다. 같은 서비스를 두 요금제로
 * 쓰는 드문 경우는 일반 추가 화면에서 직접 등록한다.
 */
export function buildDiscoveredSubscriptions(items = [], existingSubscriptions = [], { catalog = [], now = new Date(), createId = createSubscriptionId } = {}) {
  const accepted = [];
  const activeServiceIds = new Set(
    (existingSubscriptions || [])
      .filter((s) => s.status !== "cancelled")
      .map((s) => s.serviceId || s.id)
      .filter(Boolean)
  );
  let skippedCount = 0;

  for (const item of items || []) {
    const name = String(item?.name || "").trim();
    if (!name) {
      skippedCount += 1;
      continue;
    }
    const serviceKey = item.serviceId || item.id || "";
    const queryName = normalizeName(name);
    const matched = (catalog || []).find((service) => {
      if (serviceKey && service.id === serviceKey) return true;
      if (normalizeName(service.name) === queryName) return true;
      return (service.aliases || []).some((alias) => normalizeName(alias) === queryName);
    });
    const serviceId = matched?.id || serviceKey;
    const plan = item.plan || "기본 플랜";
    const candidate = { name, plan };
    if (
      (serviceId && activeServiceIds.has(serviceId)) ||
      isDuplicateSubscription(existingSubscriptions || [], candidate) ||
      isDuplicateSubscription(accepted, candidate)
    ) {
      skippedCount += 1;
      continue;
    }

    const billingCycle = item.billingCycle === "매년" ? "매년" : "매월";
    const uid = createId();
    const record = {
      serviceId,
      name,
      category: item.category || matched?.category || "기타",
      plan,
      amount: Number(item.amount) || 0,
      dueDay: Number(item.dueDay) || now.getDate(),
      billingCycle,
      nextBillingDate: billingCycle === "매년" ? item.nextBillingDate || item.annualNextBillingDate || null : null,
      paymentMethod: item.paymentMethod || "신용/체크카드",
      isTrial: Boolean(item.isTrial),
      sourceType: "sms",
      id: matched?.id || "custom-" + uid,
      monogram: matched?.monogram || name.slice(0, 1).toUpperCase(),
      cancelUrl: matched?.cancelUrl || "https://google.com",
      subscriptionId: "manual-" + uid,
      createdAt: now.toISOString(),
      status: item.isTrial ? "trial" : "active",
      alertD3: true,
      alertD1: false,
      renewalPending: false,
    };
    accepted.push(record);
    if (serviceId) activeServiceIds.add(serviceId);
  }

  return { records: accepted, skippedCount };
}

/**
 * 금액 지문(Price Fingerprint)과 기기 설치 앱 목록(installedServiceIds)을 교차 검증하여
 * '구글플레이 14,900원', '이니시스 7,890원' 같은 익명 결제의 실제 서비스를 추론한다.
 */
export function inferServiceByPriceFingerprint(amount, installedServiceIds = []) {
  const numAmount = Number(amount) || 0;
  if (numAmount <= 0) return null;

  const installedSet = new Set((installedServiceIds || []).map((id) => String(id).toLowerCase()));
  const candidates = DISCOVERY_SERVICE_SPECS.filter((spec) => spec.amounts.includes(numAmount));
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // 기기에 설치된 앱이 후보 중에 있으면 최우선 선택
  if (installedSet.size > 0) {
    const installedCandidate = candidates.find((spec) => installedSet.has(spec.id));
    if (installedCandidate) return installedCandidate;
  }

  // 한국 시장 대표 고유 가격 우선순위
  if (numAmount === 14900) return DISCOVERY_SERVICE_SPECS.find((s) => s.id === "youtube") || candidates[0];
  if (numAmount === 7890 || numAmount === 4990) return DISCOVERY_SERVICE_SPECS.find((s) => s.id === "coupang") || candidates[0];
  if (numAmount === 4900) return DISCOVERY_SERVICE_SPECS.find((s) => s.id === "naver") || candidates[0];
  if (numAmount === 17000 || numAmount === 13500) return DISCOVERY_SERVICE_SPECS.find((s) => s.id === "netflix") || candidates[0];
  if (numAmount === 3990) return DISCOVERY_SERVICE_SPECS.find((s) => s.id === "baemin-club") || candidates[0];

  return candidates[0];
}

function matchKnownSpec(text) {
  const compactText = cleanToken(text);
  if (!compactText) return null;

  let bestSpec = null;
  let bestLen = 0;
  for (const spec of DISCOVERY_SERVICE_SPECS) {
    for (const alias of spec.aliases) {
      const compactAlias = cleanToken(alias);
      if (compactAlias && compactText.includes(compactAlias)) {
        if (compactAlias.length > bestLen) {
          bestLen = compactAlias.length;
          bestSpec = spec;
        }
      }
    }
  }

  if (bestSpec && OFFLINE_SUFFIX_PATTERN.test(text)) {
    for (const alias of bestSpec.aliases) {
      const suffixMatch = text.match(OFFLINE_SUFFIX_PATTERN);
      if (suffixMatch && text.includes(alias + suffixMatch[1])) {
        return null;
      }
    }
  }

  return bestSpec;
}

function extractUnknownMerchantName(line) {
  const labeled = line.match(/(?:가맹점명|가맹점|상호명|상품명|서비스명|사용처)\s*[:：-]\s*([가-힣a-zA-Z0-9.+_-]{2,20})/);
  if (labeled?.[1]) return labeled[1].trim();

  const cleaned = String(line || "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/20\d{2}[./-]\d{1,2}[./-]\d{1,2}/g, " ")
    .replace(/\d{1,2}[./월]\s*\d{1,2}일?/g, " ")
    .replace(/\d{1,2}:\d{2}(?::\d{2})?/g, " ")
    .replace(/(?:krw|₩|￦|\$)?\s*[0-9]{1,3}(?:,[0-9]{3})+원?/gi, " ")
    .replace(/[0-9]{4,7}\s*원/g, " ")
    .replace(/(신한|국민|KB국민|현대|삼성|롯데|하나|우리|농협|NH농협|BC|비씨|카카오페이|네이버페이|토스페이|삼성페이)(?:카드|체크)?/gi, " ")
    .replace(/(일시불|승인|결제완료|정상승인|출금|정기결제|자동결제|매월|월간|구독|멤버십|체크카드)/g, " ")
    .replace(/[*,•|/\-_:()]+/g, " ")
    .trim();

  const tokens = cleaned
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t) && !/님$/.test(t));

  return tokens[0] || "";
}

/**
 * 여러 줄의 카드 명세서(CSV/TSV/텍스트 복사), 문자 보관함 내역, 간편결제 내역을 기기 내에서 일괄 분석하여
 * 구독 서비스 목록을 추출한다 (외부 LLM/API 비용 0원).
 */
export function scanStatementText(rawText, { catalog = [], existingSubscriptions = [], installedServiceIds = [], now = new Date() } = {}) {
  const text = String(rawText || "").trim();
  if (!text) return { items: [], stats: { totalLines: 0, detectedCount: 0 } };

  const rawLines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const singleReceiptLines = rawLines.filter((l) => collectAmounts(l).length > 0);
  const chunks =
    singleReceiptLines.length <= 1 && rawLines.length <= 10
      ? [rawLines.join("\n")]
      : rawLines;

  const existingIds = new Set(
    (existingSubscriptions || [])
      .filter((s) => s.status !== "cancelled")
      .map((s) => cleanToken(s.serviceId || s.id || s.name))
      .filter(Boolean)
  );

  const detectedMap = new Map();
  const unknownCandidates = new Map();

  for (const chunk of chunks) {
    if (NEGATIVE_LINE_PATTERN.test(chunk)) continue;

    const trialInfo = detectTrialText(chunk, now);
    const amount = extractAmount(chunk);
    if (amount === 0 && !trialInfo.isTrial) continue;

    const hasRecurringHint = RECURRING_HINT_PATTERN.test(chunk) || trialInfo.isTrial;
    const isPgMasked = PG_MASKED_PATTERN.test(chunk);
    const day =
      (trialInfo.trialEndsOn ? trialInfo.trialEndsOn.getDate() : null) ||
      parseDayFromValue(chunk) ||
      now.getDate();
    const paymentMethod = detectPaymentMethod(chunk, [chunk]).paymentMethod || "신용/체크카드";

    let spec = matchKnownSpec(chunk);
    let detectionReason = "서비스명 일치";

    if (spec && spec.strictAmount) {
      const priceMatches = spec.amounts.includes(amount);
      if (!priceMatches && !hasRecurringHint) {
        spec = null;
      }
    }

    if (!spec && isPgMasked && amount > 0) {
      const inferred = inferServiceByPriceFingerprint(amount, installedServiceIds);
      if (inferred) {
        spec = inferred;
        detectionReason = installedServiceIds.includes(inferred.id)
          ? "결제 금액 + 설치된 앱 교차 매칭"
          : "인앱/PG 결제 금액 지문 매칭";
      }
    }

    if (spec) {
      const catalogItem = catalog.find((c) => c.id === spec.id);
      const finalAmount = amount > 0 ? amount : spec.defaultAmount;
      const matchedPlan =
        catalogItem?.availablePlans?.find((p) => Number(p.amount) === finalAmount)?.plan ||
        spec.defaultPlan ||
        "기본 플랜";
      const key = spec.id;
      const prev = detectedMap.get(key);
      const { billingCycle, cycleConfirmed } = inferBillingCycle({ amount: finalAmount, text: chunk, spec, catalogItem });
      const annualNextBillingDate = nextAnnualBillingDate(chunk, now);
      detectedMap.set(key, {
        serviceId: spec.id,
        name: catalogItem?.name || spec.name,
        category: catalogItem?.category || spec.category || "기타",
        plan: matchedPlan,
        amount: finalAmount,
        dueDay: day,
        billingCycle,
        cycleConfirmed,
        nextBillingDate: billingCycle === "매년" ? annualNextBillingDate : null,
        annualNextBillingDate,
        paymentMethod,
        isTrial: Boolean(trialInfo.isTrial),
        occurrences: (prev?.occurrences || 0) + 1,
        reason: prev?.occurrences ? String(prev.occurrences + 1) + "회 반복 결제 확인" : detectionReason,
        alreadyRegistered: existingIds.has(cleanToken(spec.id)) || existingIds.has(cleanToken(spec.name)),
      });
      continue;
    }

    const merchant = extractUnknownMerchantName(chunk);
    if (!merchant || OFFLINE_SUFFIX_PATTERN.test(merchant)) continue;
    const merchantKey = cleanToken(merchant) + "_" + String(amount);
    const entry = unknownCandidates.get(merchantKey) || {
      merchant,
      amount,
      dueDay: day,
      paymentMethod,
      hasRecurringHint: false,
      count: 0,
    };
    entry.count += 1;
    entry.dueDay = day;
    if (hasRecurringHint) entry.hasRecurringHint = true;
    unknownCandidates.set(merchantKey, entry);
  }

  for (const [merchantKey, entry] of unknownCandidates.entries()) {
    if (entry.count >= 2 || entry.hasRecurringHint) {
      detectedMap.set("custom_" + merchantKey, {
        serviceId: "",
        name: entry.merchant,
        category: "기타",
        plan: entry.count >= 2 ? "정기결제 추정" : "기본 플랜",
        amount: entry.amount,
        dueDay: entry.dueDay,
        billingCycle: "매월",
        cycleConfirmed: false,
        paymentMethod: entry.paymentMethod,
        isTrial: false,
        occurrences: entry.count,
        reason: entry.count >= 2 ? "동일 금액 " + String(entry.count) + "회 반복 결제 감지" : "정기결제 키워드 감지",
        alreadyRegistered: existingIds.has(cleanToken(entry.merchant)),
      });
    }
  }

  if (detectedMap.size === 0) {
    const single = parseReceiptText(text);
    if (single.ok && (single.data?.name || single.data?.amount)) {
      const inferred =
        !single.data.serviceId && single.data.amount
          ? inferServiceByPriceFingerprint(single.data.amount, installedServiceIds)
          : null;
      const name = single.data.name || inferred?.name || "";
      const serviceId = single.data.serviceId || inferred?.id || "";
      if (name) {
        detectedMap.set(serviceId || name, {
          serviceId,
          name,
          category: inferred?.category || "기타",
          plan: single.data.plan || inferred?.defaultPlan || "기본 플랜",
          amount: Number(single.data.amount) || inferred?.defaultAmount || 0,
          dueDay: Number(single.data.dueDay) || now.getDate(),
          billingCycle: single.data.billingCycle || "매월",
          paymentMethod: single.data.paymentMethod || "신용/체크카드",
          isTrial: false,
          occurrences: 1,
          reason: inferred ? "결제 금액 지문 매칭" : "영수증 텍스트 분석",
          alreadyRegistered: existingIds.has(cleanToken(serviceId || name)),
        });
      }
    }
  }

  const items = Array.from(detectedMap.values());
  return {
    items,
    stats: {
      totalLines: rawLines.length,
      detectedCount: items.length,
    },
  };
}

/**
 * 안드로이드 기기 내 설치된 구독 앱 + 현재 상태바에 남아 있는 결제/영수증 알림을 한 번에 스캔한다.
 */
export async function scanDeviceForSubscriptions({ catalog = [], existingSubscriptions = [], now = new Date() } = {}) {
  const [appsRes, notifRes] = await Promise.all([
    scanInstalledSubscriptionApps(),
    scanActivePaymentNotifications(),
  ]);

  const existingIds = new Set(
    (existingSubscriptions || [])
      .filter((s) => s.status !== "cancelled")
      .map((s) => cleanToken(s.serviceId || s.id || s.name))
      .filter(Boolean)
  );

  const resultsMap = new Map();

  for (const item of notifRes.items || []) {
    const key = item.serviceId || item.serviceName;
    if (!key) continue;
    const catalogService = catalog.find((c) => c.id === item.serviceId);
    resultsMap.set(key, {
      serviceId: item.serviceId || "",
      name: catalogService?.name || item.serviceName,
      category: catalogService?.category || item.category || "기타",
      plan: item.plan || catalogService?.plan || "기본 플랜",
      amount: Number(item.amount) || catalogService?.amount || 0,
      dueDay: now.getDate(),
      billingCycle: "매월",
      paymentMethod: item.paymentMethod || "신용/체크카드",
      isTrial: Boolean(item.isTrial),
      sourceBadge: item.sourceChannel === "email_notification" ? "이메일 알림 감지" : item.sourceChannel === "play_store" ? "구글플레이 알림" : "결제 알림 감지",
      alreadyRegistered: existingIds.has(cleanToken(item.serviceId)) || existingIds.has(cleanToken(item.serviceName)),
    });
  }

  for (const app of appsRes.apps || []) {
    const key = app.serviceId || app.serviceName;
    if (!key || resultsMap.has(key)) continue;
    const catalogService = catalog.find((c) => c.id === app.serviceId);
    resultsMap.set(key, {
      serviceId: app.serviceId || "",
      name: catalogService?.name || app.serviceName,
      category: catalogService?.category || app.category || "기타",
      plan: catalogService?.plan || app.plan || "기본 플랜",
      amount: Number(catalogService?.amount || app.amount) || 0,
      dueDay: catalogService?.dueDay || now.getDate(),
      billingCycle: "매월",
      paymentMethod: "신용/체크카드",
      isTrial: false,
      sourceBadge: "설치된 앱 발견",
      alreadyRegistered: existingIds.has(cleanToken(app.serviceId)) || existingIds.has(cleanToken(app.serviceName)),
    });
  }

  return {
    items: Array.from(resultsMap.values()),
    installedServiceIds: (appsRes.apps || []).map((a) => a.serviceId).filter(Boolean),
    isNativeSupported: Boolean(appsRes.isSupported || notifRes.isSupported),
  };
}

/**
 * 구글 플레이 정기 결제, 네이버페이 정기결제, 유튜브 유료 멤버십 같은 결제 허브 화면의 글을 읽어 구독 목록을 만든다.
 * 허브 화면은 서비스명·금액·다음 결제일이 줄마다 나뉘어 있으므로, 금액 줄을 기준으로 바로 위 서비스명 줄과
 * 바로 아래 결제일 줄을 묶는다. 위로 올라가다 다른 금액 줄이나 이미 알아본 서비스명 줄을 만나면 멈춰
 * 앞 구독의 이름이나 날짜가 섞이지 않게 한다. 글은 기기 밖으로 보내지 않는다.
 */
export function scanHubPageText(rawText, { catalog = [], existingSubscriptions = [], installedServiceIds = [], hubName = "", now = new Date() } = {}) {
  const lines = String(rawText || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const existingIds = buildExistingIds(existingSubscriptions);
  const found = new Map();
  const reason = hubName ? hubName + " 화면에서 확인" : "결제 허브 화면에서 확인";

  lines.forEach((line, index) => {
    const amount = extractAmount(line);
    if (!amount) return;

    const nameLines = [];
    for (let j = index - 1; j >= Math.max(0, index - 3); j -= 1) {
      // 앞 구독의 금액·결제일·상태 줄을 만나면 멈춘다.
      if (extractAmount(lines[j]) || parseDayFromValue(lines[j]) || HUB_NEGATIVE_PATTERN.test(lines[j])) break;
      nameLines.unshift(lines[j]);
      if (matchKnownSpec(lines[j])) break;
    }
    const next = lines[index + 1];
    const after = next && !extractAmount(next) && !matchKnownSpec(next) ? next : "";
    const context = [line, after, ...nameLines].join(" ");
    if (HUB_NEGATIVE_PATTERN.test(context)) return;

    const dateSource = [line, after].join(" ");
    const dueDay = parseDayFromValue(dateSource) || parseDayFromValue(context) || now.getDate();
    const trial = detectTrialText(context, now);

    let spec = matchKnownSpec(line) || matchKnownSpec(nameLines.join(" "));
    if (!spec && PG_MASKED_PATTERN.test(context)) {
      spec = inferServiceByPriceFingerprint(amount, installedServiceIds);
    }

    let item;
    let catalogItem = null;
    if (spec) {
      catalogItem = catalog.find((c) => c.id === spec.id) || null;
      item = {
        serviceId: spec.id,
        name: catalogItem?.name || spec.name,
        category: catalogItem?.category || spec.category || "기타",
        plan: catalogItem?.availablePlans?.find((p) => Number(p.amount) === amount)?.plan || spec.defaultPlan || "기본 플랜",
      };
    } else {
      // 모르는 서비스는 금액 바로 위 줄을 이름으로 쓰되, 정기결제 표시가 있을 때만 구독으로 본다.
      const rawName = (nameLines[nameLines.length - 1] || "").replace(WON_PREFIX_PATTERN, "").trim();
      if (!HUB_RECURRING_PATTERN.test(context) || rawName.length < 2 || rawName.length > 30 || OFFLINE_SUFFIX_PATTERN.test(rawName)) return;
      item = { serviceId: "", name: rawName, category: "기타", plan: "기본 플랜" };
    }

    const key = item.serviceId || cleanToken(item.name);
    if (found.has(key)) return;
    const { billingCycle, cycleConfirmed } = inferBillingCycle({ amount, text: context, spec, catalogItem });
    const annualNextBillingDate = nextAnnualBillingDate(dateSource, now);
    found.set(key, {
      ...item,
      amount,
      dueDay: trial.trialEndsOn ? trial.trialEndsOn.getDate() : dueDay,
      billingCycle,
      cycleConfirmed,
      nextBillingDate: billingCycle === "매년" ? annualNextBillingDate : null,
      annualNextBillingDate,
      paymentMethod: detectPaymentMethod(context, [context]).paymentMethod || "신용/체크카드",
      isTrial: Boolean(trial.isTrial),
      occurrences: 1,
      reason,
      alreadyRegistered: existingIds.has(cleanToken(item.serviceId)) || existingIds.has(cleanToken(item.name)),
    });
  });

  return { items: Array.from(found.values()), stats: { totalLines: lines.length, detectedCount: found.size } };
}
