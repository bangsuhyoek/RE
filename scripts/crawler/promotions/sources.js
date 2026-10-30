/**
 * 프로모션별 확인 경로 설정
 *
 * 카탈로그의 link는 앱에서 사용자를 보내는 곳이라 설정/로그인 페이지인 경우가 많다.
 * 크롤러는 link와 함께 아래 공개 안내 페이지(urls)를 읽어 혜택 문구를 확인한다.
 *
 * - urls: 추가로 확인할 공식 공개 페이지 (앞쪽이 우선)
 * - priceUrls: 정가 대조에만 쓰는 공식 요금 페이지 (혜택 판정에는 쓰지 않음)
 * - claim: 혜택 판정 방식 덮어쓰기
 *     { type: "manual", reason }  자동 확인이 의미 없는 항목 (제휴/앱 전용/로그인 전용)
 *     { patterns: [정규식 문자열] }  모든 패턴이 같은 문장에 있으면 확인
 *     { text }                    kind 대신 이 문구로 조건 해석
 *     { keywords: [[...], ...] }  문장에 반드시 함께 있어야 하는 단어 묶음
 */

const APPLE_TV = "https://www.apple.com/kr/apple-tv-plus/";
const EDU = [["학생", "교육", "교사", "student", "education", "educator", "teacher", "academic"]];
// 요금제 이름과 "무료"가 문장 부호 없이 가까이 붙어 있어야 한다 (인접 줄의 다른 무료 안내와 섞이지 않도록)
const PLAN_FREE = (plan) => "(" + plan + ")[^.!?。]{0,60}(free|무료)|(free|무료)[^.!?。]{0,60}(" + plan + ")";

export const promotionSources = {
  // 음악
  "spotify-3m-free": { urls: ["https://www.spotify.com/kr-ko/premium/"] },
  "spotify-promo": { urls: ["https://www.spotify.com/kr-ko/premium/"] },
  "genie-promo": { urls: ["https://pay.genie.co.kr/buy/recommend"] },
  "melon-2m-discount": { urls: ["https://www.melon.com/buy/pamphlet/all.htm"], claim: { patterns: ["2\\s*개월", "할인|특가"] } },
  "melon-promo": { urls: ["https://www.melon.com/buy/pamphlet/all.htm", "https://www.melon.com/buy/pamphlet/discount.htm"], claim: { type: "manual", reason: "멜론 스트리밍클럽 2개월 특가 할인은 비구독자 대상 개인화 혜택으로 로그인 후에만 노출" } },
  "flo-promo": { urls: ["https://www.music-flo.com/purchase/voucher"], claim: { type: "manual", reason: "FLO 첫 달 100원 프로모션은 모바일 앱 첫 가입자 전용(앱스토어/구글플레이 인앱결제)으로 웹 공개 페이지에서 미제공" } },
  "applemusic-promo": { urls: ["https://www.apple.com/kr/apple-music/"] },
  // YouTube Premium 안내 페이지에 "YouTube와 YouTube Music ... 광고 없이"가 함께 나온다 (Lite 문구는 음악 제외라 배제)
  "ytmusic-promo": {
    urls: ["https://www.youtube.com/premium"],
    claim: { patterns: ["YouTube와 YouTube Music|YouTube Music 앱", "광고", "^(?![\\s\\S]*Lite)"] },
  },

  // 영상
  "youtube-lite-43": { urls: ["https://www.youtube.com/premium"], claim: { patterns: ["Lite", "43\\s*%"] } },
  "youtube-promo": { urls: ["https://www.youtube.com/premium"], claim: { text: "1개월 0원 무료 체험" } },
  "wavve-100-payback": { urls: ["https://www.wavve.com/voucher/index.html"] },
  "wavve-promo": { urls: ["https://www.wavve.com/voucher/index.html"], fetch: { device: "mobile" } },
  "wavve-annual-16": { urls: ["https://www.wavve.com/voucher/index.html"], fetch: { device: "mobile" } },
  "disney-bundle-37": { urls: ["https://www.disneyplus.com/ko-kr"] },
  // 홈페이지에는 번들 할인만 나오고 연간 요금은 고객센터 요금 안내에만 있다. 스탠다드 연 99,000원(월 9,900원 × 12 대비 약 16%)을 확인한다.
  "disney-annual-16": { urls: ["https://help.disneyplus.com/ko/article/disneyplus-ko-kr-price"], claim: { patterns: ["연\\s*99,?000\\s*원"] } },
  "tving-annual-44": { urls: ["https://www.tving.com/membership/tving"] },
  "tving-naver": { claim: { type: "manual", reason: "네이버 로그인 후에만 보이는 제휴 연동" } },
  "watcha-promo": { urls: ["https://watcha.com/"], claim: { type: "manual", reason: "왓챠 요금제 및 이용권 결제 페이지는 로그인 필수이며 공개 페이지에서는 연간 요금제를 안내하지 않음" } },
  // "와우회원이 아니어도 무료", "쿠팡 회원이라면 누구나 무료" 같이 와우 전용 혜택이 아님을 말하는 문장은 근거에서 제외
  "coupangplay-promo": { urls: ["https://www.coupangplay.com/"], claim: { patterns: ["와우", "무료|추가 비용 없이", "^(?![\\s\\S]*(?:아니어도|뿐만\\s*아니라|누구나))"] } },
  "appletv-promo": { urls: [APPLE_TV] },
  "primevideo-promo": { urls: ["https://www.primevideo.com/"], claim: { type: "manual", reason: "아마존 프라임 비디오 무료체험(7일) 기간 표기는 공개 웹에서 미제공되며 계정 가입 단계에서만 노출" } },
  "dazn-promo": { urls: ["https://www.dazn.com/ko-KR/welcome"] },
  "naverplus-netflix": { urls: ["https://help.naver.com/service/23168/contents/23881?lang=ko"], claim: { patterns: ["넷플릭스|Netflix", "광고형"] } },
  "weverse-promo": { claim: { type: "manual", reason: "아티스트별 멤버십이라 공통 혜택 페이지 없음" } },

  // 도서/오디오
  "millie-promo": { urls: ["https://www.millie.co.kr/"], claim: { patterns: ["1\\s*\\+\\s*1|둘째\\s*달|2\\s*개월"] } },
  "welaaa-first-month": { urls: ["https://www.welaaa.com/membership"] },
  "welaaa-promo": { urls: ["https://www.welaaa.com/membership"] },
  "ridiselect-promo": { urls: ["https://select.ridibooks.com/home"], claim: { patterns: ["첫\\s*구독", "4,?900\\s*포인트"] } },
  "podbbang-promo": { urls: ["https://www.podbbang.com/"] },
  "audible-promo": { urls: ["https://www.audible.com/ep/freetrial"] },
  "scribd-promo": { urls: ["https://www.scribd.com/"] },

  // 뉴스
  // 뉴스 헤드라인의 금액·기간이 섞이지 않도록 "구독" 문장만 본다
  "the-joongang-plus-promo": { urls: ["https://www.joongang.co.kr/purchase/main"], claim: { requires: ["구독"], patterns: ["첫\\s*1개월\\s*67%\\s*할인"] } },
  // 같은 페이지에 Games/Cooking의 "$0.50 every four weeks" 문구도 있어 All Access 표기(/week)로 한정한다
  "nyt-digital-promo": { urls: ["https://www.nytimes.com/subscription/all-access"], claim: { patterns: ["\\$\\s*0\\.50?\\s*/\\s*week", "first"] } },
  "wsj-digital-promo": { urls: ["https://subscribe.wsj.com/"], claim: { patterns: ["4,000|\\$4", "1\\s*Year|1년|첫해"] } },
  // 한국에서 접속하면 $1 대신 원화("W1000 for 4 weeks")로 표시된다
  "ft-digital-promo": { urls: ["https://www.ft.com/products"], claim: { patterns: ["4\\s*weeks?|4\\s*주", "\\$\\s*1\\b|1\\s*달러|[W₩]\\s*1,?000\\b"] } },

  // 생산성/AI
  "chatgpt-promo": { urls: ["https://chatgpt.com/pricing"], claim: { type: "manual", reason: "무료 플랜 안내라 할인 혜택이 아님 (문구 재작성 필요)" } },
  "claude-pro-promo": { urls: ["https://claude.com/pricing"], claim: { type: "manual", reason: "무료 플랜 안내라 할인 혜택이 아님 (문구 재작성 필요)" } },
  "perplexity-pro-promo": { urls: ["https://www.perplexity.ai/pro"], claim: { patterns: ["SKT|에이닷|T\\s*우주|SK\\s*텔레콤", "1\\s*년", "무료|100%"] } },
  "skt-perplexity-free": { urls: ["https://www.perplexity.ai/pro"], claim: { patterns: ["SKT|에이닷|T\\s*우주|SK\\s*텔레콤", "1\\s*년", "무료|100%"] } },
  // 우주패스 공식 사이트 자체이므로 "우주패스" 단어는 요구하지 않는다 (월 할인액은 자동 확인 안 됨)
  "skt-universe-youtube": { urls: ["https://sktmembership.tworld.co.kr/mps/pc-bff/benefitbrand/detail.do?brandId=5140"], claim: { patterns: ["YouTube|Youtube|유튜브", "9,900\\s*원|5,000\\s*원"] } },
  "midjourney-promo": { urls: ["https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans"] },
  // 카탈로그가 특정 요금제(Plus/Professional)를 무료라고 안내하므로, 요금제 이름과 무료가 같은 문장에 있어야 확인으로 본다.
  "notion-student-free": { urls: ["https://www.notion.com/pricing", "https://www.notion.com/product/notion-for-education"], fetch: { preferFetch: true }, claim: { patterns: [PLAN_FREE("Plus|플러스")], keywords: EDU } },
  "notion-promo": { urls: ["https://www.notion.com/pricing", "https://www.notion.com/product/notion-for-education"], fetch: { preferFetch: true }, claim: { patterns: [PLAN_FREE("Plus|플러스")], keywords: EDU } },
  "figma-edu-free": { urls: ["https://www.figma.com/education/"], claim: { patterns: [PLAN_FREE("Professional|프로페셔널")], keywords: EDU } },
  "figma-promo": { urls: ["https://www.figma.com/education/"], claim: { patterns: [PLAN_FREE("Professional|프로페셔널")], keywords: EDU } },
  "canva-promo": { urls: ["https://www.canva.com/education/"], claim: { keywords: EDU } },
  "github-copilot-promo": { urls: ["https://education.github.com/pack"], claim: { patterns: ["Copilot"], keywords: EDU } },
  "jetbrains-student-free": { urls: ["https://www.jetbrains.com/community/education/"], claim: { keywords: EDU } },
  // 카탈로그는 "IDE 16종"이라고 안내하므로 페이지에 16이 있어야 확인 (현재 페이지는 "10 JetBrains IDEs")
  "jetbrains-all-promo": { urls: ["https://www.jetbrains.com/community/education/"], claim: { patterns: ["\\b16\\b[^.!?]{0,30}IDE|IDE[^.!?]{0,10}16\\s*종"], keywords: EDU } },
  // 비영리 할인 안내 문장에는 "교육" 단어가 없으므로 교육 키워드 요구를 끈다
  "slack-pro-promo": { urls: ["https://slack.com/intl/ko-kr/help/articles/204368833"], claim: { keywords: [] } },
  "zoom-pro-promo": { urls: ["https://zoom.us/pricing"], claim: { patterns: ["40\\s*(?:분|min)"] } },
  "ms365-promo": { urls: ["https://www.microsoft.com/ko-kr/education/products/office"], claim: { patterns: ["Office|Microsoft\\s*365|Word", "무료|free"], keywords: EDU } },
  "google-one-promo": { urls: ["https://one.google.com/about/plans"], claim: { type: "manual", reason: "구글원 첫 달 무료 체험은 구글 플레이 앱 결제 및 기기 프로모션 전용으로 공개 웹에서 미제공" } },
  "evernote-promo": { urls: ["https://evernote.com/students"] },
  "1password-promo": { urls: ["https://1password.com/pricing/password-manager"], claim: { patterns: ["famil|가족", "\\b5\\b|five"] } },
  "framer-promo": { urls: ["https://www.framer.com/pricing"], claim: { patterns: ["Start free|Free Framer domain|\\$\\s*0\\b"] } },
  "webflow-promo": { urls: ["https://webflow.com/pricing"], claim: { patterns: ["Starter", "free|무료", "2\\s*(sites|개\\s*사이트)"] } },
  "adobe-student-66": { urls: ["https://www.adobe.com/kr/creativecloud/buy/students.html"] },
  "adobe-new-user-25": { urls: ["https://www.adobe.com/kr/creativecloud/plans.html"] },
  "adobe-lightroom-promo": { urls: ["https://www.adobe.com/kr/products/photoshop-lightroom/plans.html"], claim: { type: "manual", reason: "Lightroom Mobile Premium 7일 무료체험은 모바일 앱 인앱결제 전용 상품으로 웹 공개 페이지에서 구매 불가" } },
  "naver-mybox-promo": { urls: ["https://mybox.naver.com/"], claim: { patterns: ["30\\s*GB"] } },

  // 생활/멤버십
  "naverplus-welcome": { urls: ["https://nid.naver.com/membership/join"], claim: { patterns: ["웰컴\\s*쿠폰|웰컴\\s*혜택", "4,900\\s*원|무료|0원"] } },
  "naverplus-promo": { urls: ["https://nid.naver.com/membership/join"], claim: { patterns: ["웰컴\\s*쿠폰|웰컴\\s*혜택", "4,900\\s*원|무료|0원"] } },
  "naver-spotify-link": { urls: ["https://nid.naver.com/membership/join"], priceUrls: ["https://www.spotify.com/kr-ko/premium/"], claim: { patterns: ["매월|선택", "스포티파이|Spotify"] } },
  "coupang-30d-free": { urls: ["https://loyalty.coupang.com/loyalty/sign-up/home"], claim: { type: "manual", reason: "쿠팡 와우 30일 무료체험은 로그인 후 가입 단계 또는 앱 내에서만 제공되는 개인화 혜택" } },
  "coupang-promo": { urls: ["https://loyalty.coupang.com/loyalty/sign-up/home"], claim: { type: "manual", reason: "쿠팡 와우 30일 무료체험은 로그인 후 가입 단계 또는 앱 내에서만 제공되는 개인화 혜택" } },
  "baemin-club-promo": { urls: ["https://baemin.com/"], claim: { type: "manual", reason: "배민클럽은 배달의민족 모바일 앱 전용 멤버십이며 공식 웹은 앱 다운로드 페이지만 제공" } },
  "yogipass-promo": { urls: ["https://static-webviews.yogiyo.co.kr/subscription/yogipassx-pc-version", "https://www.yogiyo.co.kr/"], claim: { patterns: ["요기패스", "네이버|무료"] } },
  "kakaotalk-emoticon-promo": { urls: ["https://e.kakao.com/my/product/001"], claim: { type: "manual", reason: "카카오톡 이모티콘 플러스 첫 달 100원 프로모션은 카카오 로그인 및 첫 구독자 계정 인증 시에만 노출" } },

  // 게임/학습
  "nintendo-7d-free": { urls: ["https://www.nintendo.com/kr/nintendo-switch-online/"] },
  // 공개 페이지에는 "패밀리 플랜" 존재만 나오고 최대 인원(8명)은 나오지 않는다
  "nintendo-family-plan": { urls: ["https://support.nintendo.com/kr/switch/nintendo_switch_online/03.html", "https://www.nintendo.com/kr/nintendo-switch-online/"], claim: { patterns: ["패밀리", "최대\\s*8|8\\s*(?:명|인|어카운트)"] } },
  "ps-plus-promo": { urls: ["https://www.playstation.com/ko-kr/ps-plus/"], claim: { patterns: ["171,000\\s*원", "32%\\s*할인"] } },
  "apple-arcade-promo": { urls: ["https://www.apple.com/kr/apple-arcade/"] },
  "ea-play-promo": { urls: ["https://www.ea.com/ko-kr/ea-play"], claim: { patterns: ["월\\s*7,000원,\\s*연\\s*54,000원"] } },
  "wow-subscription-promo": { urls: ["https://kr.shop.battle.net/ko-kr/product/world-of-warcraft-subscription"], claim: { patterns: ["6개월\\s*특가\\s*상품", "1년에\\s*[₩￦]61,600\\s*절약"] } },
  "speak-7d-free": { urls: ["https://www.usespeak.com/ko"], claim: { type: "manual", reason: "스픽 7일 무료 체험은 모바일 앱 설치 및 회원가입 온보딩 시에만 제공되는 앱 전용 혜택" } },
  "duolingo-14d-free": { urls: ["https://www.duolingo.com/super"] },

  // 2026-10-30 카탈로그 확장 (조사: outputs/catalog-research/candidates)
  "apple-one-individual": { urls: ["https://www.apple.com/kr/apple-one/"], claim: { patterns: ["14,900","14,900"] } },
  "apple-one-family": { urls: ["https://www.apple.com/kr/apple-one/"], claim: { patterns: ["20,900","20,900"] } },
  "genie-millie": { urls: ["https://pay.genie.co.kr/product/f_Product_Main"], claim: { patterns: ["13,498원","13,498"] } },
  "spotify-duo": { urls: ["https://www.spotify.com/kr-ko/premium/"], claim: { patterns: ["듀오","17,985"] } },
  "spotify-student": { urls: ["https://www.spotify.com/kr-ko/premium/"], claim: { patterns: ["학생","6,600"] } },
  "spotify-basic": { urls: ["https://www.spotify.com/kr-ko/premium/"], claim: { patterns: ["베이직","8,690"] } },
  "applemusic-family": { urls: ["https://www.apple.com/kr/apple-music/"], claim: { patterns: ["가족","13,500"] } },
  "netflix-ad-standard": { urls: ["https://help.netflix.com/ko/node/24926"], claim: { patterns: ["광고형 스탠다드","7,000"] } },
  "netflix-extra-member": { urls: ["https://help.netflix.com/ko/node/24926"], claim: { patterns: ["추가 회원","5,000"] } },
  "disney-standard-annual": { urls: ["https://help.disneyplus.com/ko/article/disneyplus-ko-kr-price"], claim: { patterns: ["11,500","115,000"] } },
  "disney-premium-annual": { urls: ["https://help.disneyplus.com/ko/article/disneyplus-ko-kr-price"], claim: { patterns: ["16,500","165,000"] } },
  "disney-tving-bundle": { urls: ["https://help.disneyplus.com/ko/article/disneyplus-ko-kr-price"], claim: { patterns: ["티빙 스탠다드","18,000"] } },
  "disney-extra-member": { urls: ["https://help.disneyplus.com/ko/article/disneyplus-ko-kr-price"], claim: { patterns: ["추가 회원","5,000"] } },
  "tving-wavve-double-standard": { urls: ["https://www.tving.com/bill/subscription/plan"], claim: { patterns: ["더블 스탠다드","15,000"] } },
  "tving-wavve-double-basic": { urls: ["https://www.tving.com/bill/subscription/plan"], claim: { patterns: ["더블 베이직","13,500"] } },
  "tving-wavve-double-slim": { urls: ["https://www.tving.com/bill/subscription/plan"], claim: { patterns: ["더블 슬림","9,500"] } },
  "tving-wavve-double-premium": { urls: ["https://www.tving.com/bill/subscription/plan"], claim: { patterns: ["더블 프리미엄","19,500"] } },
  "tving-wavve-double-ad": { urls: ["https://www.tving.com/bill/subscription/plan"], claim: { patterns: ["더블 광고형","7,000"] } },
  "icloud-200gb-family": { urls: ["https://www.apple.com/kr/icloud/"], claim: { patterns: ["200GB","4,400"] } },
  "xbox-gamepass-essential": { urls: ["https://www.xbox.com/ko-KR/xbox-game-pass"], claim: { patterns: ["Essential","10,800"] } },
  "xbox-gamepass-premium": { urls: ["https://www.xbox.com/ko-KR/xbox-game-pass"], claim: { patterns: ["Premium","14,900"] } },
  "xbox-pc-gamepass": { urls: ["https://www.xbox.com/ko-KR/xbox-game-pass"], claim: { patterns: ["PC 전용","15,500"] } },
  "psplus-essential-annual": { urls: ["https://www.playstation.com/ko-kr/ps-plus/"], claim: { patterns: ["12개월 플랜","86,400"] } },
  "psplus-extra-annual": { urls: ["https://www.playstation.com/ko-kr/ps-plus/"], claim: { patterns: ["12개월 플랜","145,800"] } },
  "speak-annual": { urls: ["https://www.speak.com/untitled"], claim: { patterns: ["26,875","10,750"] } },
  "speak-plus-annual": { urls: ["https://www.speak.com/untitled"], claim: { patterns: ["62,291","19,916"] } },

  // 2026-10-30 통신·플랫폼 결합 확장
  "kakaomembership-emoticon": { urls: ["https://membership.kakao.com/intro"], claim: { patterns: ["이모티콘 플러스"] } },
  "kakaomembership-melon": { urls: ["https://membership.kakao.com/intro"], claim: { patterns: ["1,600원 상당의 캐시"] } },
  "kakaomembership-kakaopage": { urls: ["https://membership.kakao.com/intro"], claim: { patterns: ["카카오페이지 매달 2,000캐시"] } },
  "udok-youtube-premium": { urls: ["https://www.lguplus.com/pogg/main"], claim: { patterns: ["월 13,900원","13,900"] } },
  "udok-netflix-youtube": { urls: ["https://www.lguplus.com/pogg/main"], claim: { patterns: ["월 18,900원","18,900"] } },
  "udok-tving": { urls: ["https://www.lguplus.com/pogg/main"], claim: { patterns: ["월 4,950원","4,950"] } },
  "udok-disney": { urls: ["https://www.lguplus.com/pogg/main"], claim: { patterns: ["월 9,405원","9,405"] } },
  "kt-disney-plus-standard": { urls: ["https://product.kt.com/static/prodetail/1583/web/htmlUploadType_20260714180119.html"], claim: { patterns: ["스탠다드 정상가","8,900원"] } },
  "kt-disney-plus-premium": { urls: ["https://product.kt.com/static/prodetail/1583/web/htmlUploadType_20260714180119.html"], claim: { patterns: ["프리미엄 정상가","12,900원"] } },
  "kt-disney-starbucks-standard": { urls: ["https://product.kt.com/static/prodetail/1610/web/htmlUploadType_20260714180459.html"], claim: { patterns: ["14,600원","프로모션가 9,900원"] } },
  "kt-disney-starbucks-premium": { urls: ["https://product.kt.com/static/prodetail/1610/web/htmlUploadType_20260714180459.html"], claim: { patterns: ["18,600원","프로모션가 13,900원"] } },
  "lgu-youtube-google-ai-pro": { urls: ["https://www.lguplus.com/pogg/product/youtube-google-ai-pro-26y-pack"], claim: { patterns: ["29,000원","43,900원"] } },
  "ibk-narasarang-naver-membership": { urls: ["https://narasarang.ibk.co.kr/"], claim: { patterns: ["네이버 멤버십 무료","군 급여이체"] } },
};

export function getPromotionSource(id) {
  return promotionSources[id] ?? {};
}
