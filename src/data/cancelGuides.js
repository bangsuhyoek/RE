import { GUIDES, GOOGLE_PLAY_SOURCE, APPLE_SOURCE } from "./cancelGuideData.js";

// 서비스별 해지 가이드.
// 모든 가이드는 공식 고객센터 문서를 근거로 작성하고 sources와 checkedAt을 남긴다.
// 공식 자료로 확인하지 못한 서비스는 여기에 넣지 않는다. getCancelGuide가 공통 안내와 도움말 링크를 대신 돌려준다.

const CHECKED_AT = "2026-10-01";


const storeRoutes = {
  googlePlay: (appName) => ({
    id: "googlePlay",
    label: "Google Play로 결제했다면",
    sources: [GOOGLE_PLAY_SOURCE],
    steps: [
      { title: "정기 결제 열기", description: "Play 스토어 앱에서 오른쪽 위 프로필 → [결제 및 정기 결제] → [정기 결제]로 가세요." },
      { title: `${appName} 선택`, description: `목록에서 ${appName}을(를) 고르세요.` },
      { title: "정기 결제 취소", description: "[정기 결제 취소]를 누르고 화면 안내를 끝까지 진행하세요." },
    ],
    notes: [
      "앱을 지워도 정기 결제는 취소되지 않아요.",
      "목록에 없으면 다른 Google 계정으로 결제했는지 확인하세요.",
    ],
  }),
  appStore: (appName) => ({
    id: "appStore",
    label: "App Store(Apple)로 결제했다면",
    sources: [APPLE_SOURCE],
    steps: [
      { title: "구독 열기", description: "iPhone [설정] → 맨 위 내 이름 → [구독]으로 가세요." },
      { title: `${appName} 선택`, description: `구독 목록에서 ${appName}을(를) 고르세요.` },
      { title: "구독 취소", description: "[구독 취소]를 누르고 확인하세요. 버튼이 없으면 이미 취소된 상태예요." },
    ],
    notes: [
      "목록에 없으면 메일에서 'Apple 영수증'을 검색해 결제한 계정을 확인하세요.",
      "무료 체험은 끝나기 최소 24시간 전에 취소하세요.",
    ],
  }),
};

// 공식 자료로 단계를 확인하지 못한 서비스의 공식 안내 링크.
const HELP_LINKS = {
  // 2026-10-01에 직접 열어 확인한 공식 해지 도움말 또는 공식 고객센터.
  "kurly-pass": "https://www.kurly.com/board/faq",
  // 컬리패스는 2023-08-01 판매 종료(기존 가입자는 혜택 유지). 해지 경로를 공식 원문으로 확인하지 못해 고객센터로 안내한다.
  kurly: "https://www.kurly.com/board/faq",
  spotvnow: "https://www.spotvnow.co.kr/customer/faq",
  flo: "https://www.music-flo.com/help/faq/3/1",
  "wsj-digital": "https://customercenter.wsj.com/help/article?topic=Policies&title=Cancellation%20%26%20Refund%20Policy",
  santatoeic: "https://support.riiid.co/hc/ko/articles/360009330413",
  ringle: "https://www.ringleplus.com/ko/student/landing/blog/faq-lesson-credits-refund",
  yogipass: "https://www.yogiyo.co.kr/mobile/#/faq/",
  inflearn: "https://www.inflearn.com/faq",
  "kakaotalk-drive": "https://cs.kakao.com/helps?service=8",
  "kakaotalk-emoticon": "https://cs.kakao.com/helps?service=94",
};

const withNumbers = (steps) => steps.map((step, index) => ({ stepNumber: index + 1, ...step }));

// 공식 자료로 확인하지 못한 서비스에 보여줄 공통 안내. 특정 메뉴 위치를 단정하지 않는다.
export function getCommonCancelSteps(appName = "서비스") {
  return withNumbers([
    { title: "로그인", description: `${appName} 공식 앱이나 웹사이트에 로그인하세요.` },
    {
      title: "구독 관리 찾기",
      description: "계정이나 설정에서 [구독], [멤버십], [결제] 같은 메뉴를 찾으세요. 앱에서 결제했다면 App Store나 Google Play 구독에서 해지해요.",
    },
    { title: "해지 확인", description: "해지 버튼을 직접 누르고 해지 완료 문구가 나오는지 확인하세요." },
  ]);
}

function resolveRoute(routeId, appName) {
  const build = storeRoutes[routeId];
  if (!build) return null;
  const route = build(appName);
  return { ...route, steps: withNumbers(route.steps) };
}

/**
 * 서비스 id로 해지 가이드를 찾는다.
 * verified=true면 공식 자료로 확인한 단계(steps)와 출처(sources)가 있다.
 * verified=false면 steps는 공통 안내이고 helpUrl로 공식 안내를 연결한다.
 */
export function getCancelGuide(serviceId, { name = "", cancelUrl = "" } = {}) {
  const id = String(serviceId || "").toLowerCase();
  const guide = GUIDES[id];
  const appName = name || id;

  if (!guide) {
    const helpUrl = HELP_LINKS[id] || cancelUrl || "";
    return {
      verified: false,
      steps: getCommonCancelSteps(name || "서비스"),
      notes: [],
      altRoutes: [],
      sources: [],
      checkedAt: null,
      cancelUrl: cancelUrl || "",
      helpUrl,
      helpLabel: HELP_LINKS[id] ? "공식 도움말" : "공식 해지 페이지",
    };
  }

  const primary = guide.primaryRoute ? resolveRoute(guide.primaryRoute, appName) : null;
  const steps = primary ? primary.steps : withNumbers(guide.steps);
  const notes = [...(guide.notes || []), ...(primary?.notes || [])];
  const altRoutes = (guide.altRoutes || []).map((routeId) => resolveRoute(routeId, appName)).filter(Boolean);
  const sources = [...new Set([...(guide.sources || []), ...altRoutes.flatMap((route) => route.sources)])];

  return {
    verified: true,
    steps,
    notes,
    altRoutes,
    sources,
    checkedAt: guide.checkedAt || CHECKED_AT,
    cancelUrl: guide.cancelUrl || cancelUrl || "",
    helpUrl: sources[0],
    helpLabel: "공식 도움말",
  };
}

export const verifiedCancelGuideIds = Object.keys(GUIDES);
