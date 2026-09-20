export const CancellationSupport = Object.freeze({
  SUPPORTED: "SUPPORTED",
  DEFERRED: "DEFERRED",
});

export const CancellationGuideMode = Object.freeze({
  AUTO_SEMANTIC: "AUTO_SEMANTIC",
  MANUAL_OFFICIAL: "MANUAL_OFFICIAL",
});

const VERIFIED_AT = "2026-09-20";

function step(stepNumber, title, description) {
  return { stepNumber, title, description, imageUrl: "" };
}

const guides = [
  {
    serviceId: "naverplus",
    aliases: ["naver", "naverplus", "네이버플러스멤버십"],
    serviceName: "네이버플러스 멤버십",
    support: CancellationSupport.SUPPORTED,
    supportReason: "NAVER 공식 고객센터가 정기결제 해지 경로를 명시함",
    guideMode: CancellationGuideMode.AUTO_SEMANTIC,
    officialDomain: "naver.com",
    entryUrl: "https://nid.naver.com/membership/subscribe",
    fallbackOfficialUrl: "https://help.naver.com/service/23168/contents/13775",
    officialSourceUrl: "https://help.naver.com/service/23168/contents/13775",
    allowedDomains: ["naver.com"],
    requiresLogin: true,
    billingChannel: "NAVER_DIRECT",
    pageMatchers: ["nid.naver.com/membership", "naver.com/membership"],
    targetMatchers: ["settings", "membership-manage", "cancel-entry", "recurring-cancel", "final-confirm"],
    steps: [
      step(1, "마이 멤버십 설정", "네이버플러스 마이 멤버십에서 오른쪽 위 설정을 선택하세요."),
      step(2, "멤버십 관리", "네이버플러스 멤버십 관리로 이동하세요."),
      step(3, "멤버십 해지", "네이버플러스 멤버십 해지하기를 선택하세요."),
      step(4, "정기결제 해지", "이번 이용 기간을 확인한 뒤 정기결제 해지를 선택하세요."),
      step(5, "사용자가 최종 확인", "내용을 확인한 뒤 공식 페이지의 해지하기를 직접 선택하세요."),
    ],
    lastVerifiedAt: VERIFIED_AT,
  },
  {
    serviceId: "netflix",
    aliases: ["netflix", "넷플릭스"],
    serviceName: "Netflix",
    support: CancellationSupport.SUPPORTED,
    supportReason: "Netflix 공식 고객센터가 멤버십 관리 페이지의 해지 절차를 명시함",
    guideMode: CancellationGuideMode.MANUAL_OFFICIAL,
    officialDomain: "netflix.com",
    entryUrl: "https://www.netflix.com/cancelplan",
    fallbackOfficialUrl: "https://help.netflix.com/ko/node/407",
    officialSourceUrl: "https://help.netflix.com/ko/node/407",
    allowedDomains: ["netflix.com"],
    requiresLogin: true,
    billingChannel: "NETFLIX_OR_BILLING_PARTNER",
    pageMatchers: ["netflix.com/cancelplan", "netflix.com/account"],
    targetMatchers: [],
    steps: [
      step(1, "멤버십 관리", "로그인 후 멤버십 관리 페이지에서 해지 항목을 확인하세요."),
      step(2, "해지 선택", "공식 페이지의 해지를 선택하세요."),
      step(3, "사용자가 최종 확인", "해지 내용을 확인하고 해지 완료를 직접 선택하세요."),
    ],
    lastVerifiedAt: VERIFIED_AT,
  },
  {
    serviceId: "youtube",
    aliases: ["youtube", "youtubepremium", "유튜브프리미엄"],
    serviceName: "YouTube Premium",
    support: CancellationSupport.SUPPORTED,
    supportReason: "YouTube 공식 고객센터가 웹 유료 멤버십 해지 절차를 제공함",
    guideMode: CancellationGuideMode.MANUAL_OFFICIAL,
    officialDomain: "youtube.com",
    entryUrl: "https://www.youtube.com/paid_memberships",
    fallbackOfficialUrl: "https://support.google.com/youtube/answer/6308278?hl=ko",
    officialSourceUrl: "https://support.google.com/youtube/answer/6308278?hl=ko",
    allowedDomains: ["youtube.com", "accounts.google.com"],
    requiresLogin: true,
    billingChannel: "VERIFY_BILLING_PROVIDER",
    pageMatchers: ["youtube.com/paid_memberships"],
    targetMatchers: [],
    steps: [
      step(1, "유료 멤버십", "YouTube 유료 멤버십 페이지에서 취소할 멤버십을 선택하세요."),
      step(2, "그대로 취소", "멤버십 관리에서 그대로 취소를 선택하세요."),
      step(3, "취소 사유", "취소 사유를 선택하고 다음으로 이동하세요."),
      step(4, "사용자가 최종 확인", "공식 페이지에서 취소를 직접 선택하세요."),
    ],
    lastVerifiedAt: VERIFIED_AT,
  },
  {
    serviceId: "spotify",
    aliases: ["spotify", "스포티파이"],
    serviceName: "Spotify",
    support: CancellationSupport.SUPPORTED,
    supportReason: "Spotify 공식 지원이 계정 페이지의 Premium 해지 절차를 명시함",
    guideMode: CancellationGuideMode.MANUAL_OFFICIAL,
    officialDomain: "spotify.com",
    entryUrl: "https://www.spotify.com/kr-ko/account/overview/",
    fallbackOfficialUrl: "https://support.spotify.com/kr-ko/article/cancel-premium/",
    officialSourceUrl: "https://support.spotify.com/kr-ko/article/cancel-premium/",
    allowedDomains: ["spotify.com"],
    requiresLogin: true,
    billingChannel: "VERIFY_BILLING_PROVIDER",
    pageMatchers: ["spotify.com/kr-ko/account", "spotify.com/account"],
    targetMatchers: [],
    steps: [
      step(1, "계정 페이지", "로그인 후 계정 페이지에서 요금제 관리하기를 확인하세요."),
      step(2, "요금제 변경", "요금제 관리하기에서 요금제 변경을 선택하세요."),
      step(3, "Premium 해지", "Spotify 구독 해지로 이동해 Premium 해지를 선택하세요."),
      step(4, "사용자가 최종 확인", "확인 화면의 안내를 읽고 해지를 직접 완료하세요."),
    ],
    lastVerifiedAt: VERIFIED_AT,
  },
  {
    serviceId: "chatgpt",
    aliases: ["chatgpt", "chatgptplus", "챗지피티", "챗GPT"],
    serviceName: "ChatGPT Plus",
    support: CancellationSupport.SUPPORTED,
    supportReason: "OpenAI 공식 도움말이 chatgpt.com 직접 결제 구독의 해지 절차를 명시함",
    guideMode: CancellationGuideMode.MANUAL_OFFICIAL,
    officialDomain: "chatgpt.com",
    entryUrl: "https://chatgpt.com/",
    fallbackOfficialUrl: "https://help.openai.com/en/articles/7232927",
    officialSourceUrl: "https://help.openai.com/en/articles/7232927",
    allowedDomains: ["chatgpt.com", "auth.openai.com", "openai.com"],
    requiresLogin: true,
    billingChannel: "VERIFY_BILLING_PROVIDER",
    pageMatchers: ["chatgpt.com"],
    targetMatchers: [],
    steps: [
      step(1, "계정 메뉴", "chatgpt.com에 로그인한 뒤 계정 메뉴에서 Settings를 여세요."),
      step(2, "Billing", "Settings에서 Billing을 선택하세요."),
      step(3, "Cancel plan", "Cancel plan 항목을 확인하세요."),
      step(4, "사용자가 최종 확인", "공식 결제 화면의 취소 내용을 확인하고 직접 완료하세요."),
    ],
    lastVerifiedAt: VERIFIED_AT,
  },
  {
    serviceId: "coupang",
    aliases: ["coupang", "쿠팡", "쿠팡와우", "와우멤버십"],
    serviceName: "쿠팡 와우",
    support: CancellationSupport.SUPPORTED,
    supportReason: "쿠팡 공식 뉴스룸 FAQ가 마이쿠팡 → 와우 멤버십 → 해지하기 경로를 명시함",
    guideMode: CancellationGuideMode.MANUAL_OFFICIAL,
    officialDomain: "coupang.com",
    entryUrl: "https://loyalty.coupang.com/loyalty/management/home",
    fallbackOfficialUrl: "https://news.coupang.com/archives/64216/",
    officialSourceUrl: "https://news.coupang.com/archives/64216/",
    allowedDomains: ["coupang.com", "login.coupang.com", "loyalty.coupang.com"],
    requiresLogin: true,
    billingChannel: "COUPANG_WOW",
    pageMatchers: ["loyalty.coupang.com/loyalty/management", "login.coupang.com"],
    targetMatchers: [],
    steps: [
      step(1, "마이쿠팡", "쿠팡 계정으로 로그인해 와우 멤버십 관리 화면으로 이동하세요."),
      step(2, "와우 멤버십", "마이쿠팡의 와우 멤버십에서 현재 멤버십 상태를 확인하세요."),
      step(3, "해지하기", "와우 멤버십의 해지하기를 선택하세요."),
      step(4, "사용자가 최종 확인", "환불·혜택 종료 안내를 확인하고 공식 페이지에서 직접 완료하세요."),
    ],
    lastVerifiedAt: VERIFIED_AT,
  },
  {
    serviceId: "tving",
    aliases: ["tving", "티빙"],
    serviceName: "티빙",
    support: CancellationSupport.DEFERRED,
    supportReason: "TVING 공식 구독 페이지는 확인했지만 현재 공개 페이지에서 정확한 해지 단계와 WebView 동작을 검증하지 못함",
    guideMode: CancellationGuideMode.MANUAL_OFFICIAL,
    officialDomain: "tving.com",
    entryUrl: "https://www.tving.com/account/sub",
    fallbackOfficialUrl: "https://www.tving.com/account/sub",
    officialSourceUrl: "https://www.tving.com/account/sub",
    allowedDomains: ["tving.com"],
    requiresLogin: true,
    billingChannel: "VERIFY_BILLING_PROVIDER",
    pageMatchers: ["tving.com/account/sub"],
    targetMatchers: [],
    steps: [],
    lastVerifiedAt: VERIFIED_AT,
  },
  {
    serviceId: "disney",
    aliases: ["disney", "disney+", "디즈니플러스"],
    serviceName: "Disney+",
    support: CancellationSupport.SUPPORTED,
    supportReason: "Disney+ 대한민국 공식 취소·환불 정책이 직접 결제 구독의 공식 취소 URL과 절차를 명시함",
    guideMode: CancellationGuideMode.MANUAL_OFFICIAL,
    officialDomain: "disneyplus.com",
    entryUrl: "https://www.disneyplus.com/account/cancel-subscription",
    fallbackOfficialUrl: "https://www.disneyplus.com/ko-kr/welcome/cancellation-and-refund-policy",
    officialSourceUrl: "https://www.disneyplus.com/ko-kr/welcome/cancellation-and-refund-policy",
    allowedDomains: ["disneyplus.com"],
    requiresLogin: true,
    billingChannel: "VERIFY_BILLING_PROVIDER",
    pageMatchers: ["disneyplus.com/account/cancel-subscription", "disneyplus.com/ko-kr/account"],
    targetMatchers: [],
    steps: [
      step(1, "구독 취소 페이지", "Disney+ 계정으로 로그인한 뒤 공식 구독 취소 페이지를 확인하세요."),
      step(2, "Cancel Subscription", "현재 구독과 결제 주기를 확인한 뒤 Cancel Subscription을 선택하세요."),
      step(3, "사용자가 최종 확인", "취소 안내를 읽고 공식 페이지에서 취소를 직접 완료하세요."),
    ],
    lastVerifiedAt: VERIFIED_AT,
  },
  {
    serviceId: "millie",
    aliases: ["millie", "밀리의서재"],
    serviceName: "밀리의 서재",
    support: CancellationSupport.DEFERRED,
    supportReason: "기존 공식 구독 URL은 있으나 이번 검증에서 현재 공식 해지 절차를 독립 확인하지 못함",
    guideMode: CancellationGuideMode.MANUAL_OFFICIAL,
    officialDomain: "millie.co.kr",
    entryUrl: "https://www.millie.co.kr/v3/mypage/subscription",
    fallbackOfficialUrl: "https://www.millie.co.kr/v3/mypage/subscription",
    officialSourceUrl: "https://www.millie.co.kr/v3/mypage/subscription",
    allowedDomains: ["millie.co.kr"],
    requiresLogin: true,
    billingChannel: "VERIFY_BILLING_PROVIDER",
    pageMatchers: ["millie.co.kr/v3/mypage/subscription"],
    targetMatchers: [],
    steps: [],
    lastVerifiedAt: VERIFIED_AT,
  },
];

export const cancellationGuideRegistry = Object.freeze(
  Object.fromEntries(guides.map((guide) => [guide.serviceId, Object.freeze(guide)]))
);

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}
export function getCancellationGuide(serviceId, serviceName = "") {
  const candidates = [normalize(serviceId), normalize(serviceName)].filter(Boolean);
  return guides.find((guide) => {
    const ids = [guide.serviceId, ...(guide.aliases || [])].map(normalize);
    return candidates.some((candidate) =>
      ids.some((id) => candidate === id || candidate.includes(id) || id.includes(candidate))
    );
  }) || null;
}

export function isSupportedCancellationGuide(guide) {
  return guide?.support === CancellationSupport.SUPPORTED;
}

export function isAllowedCancellationUrl(guide, url) {
  if (!guide || !url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return (guide.allowedDomains || []).some((domain) => {
      const normalized = String(domain).toLowerCase();
      return host === normalized || host.endsWith("." + normalized);
    });
  } catch {
    return false;
  }
}

export function resolveCancellationGuide(subscription = {}) {
  const guide = getCancellationGuide(
    subscription.serviceId || subscription.subscriptionId || subscription.id,
    subscription.name
  );
  if (!guide) {
    return {
      guide: null,
      supported: false,
      reason: "자주 사용하는 서비스의 검증된 공식 해지 가이드가 아니에요.",
    };
  }
  return {
    guide,
    supported: isSupportedCancellationGuide(guide),
    reason: guide.supportReason,
  };
}

export const POPULAR_CANCELLATION_SERVICE_IDS = Object.freeze(
  guides.map((guide) => guide.serviceId)
);
