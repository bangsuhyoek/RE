/**
 * 프로모션별 확인 경로 설정
 *
 * 카탈로그의 link는 앱에서 사용자를 보내는 곳이라 설정/로그인 페이지인 경우가 많다.
 * 크롤러는 link와 함께 아래 공개 안내 페이지(urls)를 읽어 혜택 문구를 확인한다.
 *
 * - urls: 추가로 확인할 공식 공개 페이지 (앞쪽이 우선)
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
  "genie-110won": { urls: ["https://pay.genie.co.kr/buy/recommend"] },
  "genie-promo": { urls: ["https://pay.genie.co.kr/buy/recommend"] },
  "melon-2m-discount": { urls: ["https://www.melon.com/buy/pamphlet/all.htm"], claim: { patterns: ["2\\s*개월", "할인|특가"] } },
  "melon-promo": { urls: ["https://www.melon.com/buy/pamphlet/all.htm"], claim: { patterns: ["2\\s*개월", "할인|특가"] } },
  "flo-promo": { urls: ["https://www.music-flo.com/purchase/voucher"] },
  "applemusic-promo": { urls: ["https://www.apple.com/kr/apple-music/"] },
  // YouTube Premium 안내 페이지에 "YouTube와 YouTube Music ... 광고 없이"가 함께 나온다 (Lite 문구는 음악 제외라 배제)
  "ytmusic-promo": {
    urls: ["https://www.youtube.com/premium"],
    claim: { patterns: ["YouTube와 YouTube Music|YouTube Music 앱", "광고", "^(?![\\s\\S]*Lite)"] },
  },

  // 영상
  "youtube-1m-free": { urls: ["https://www.youtube.com/premium"] },
  "youtube-lite-43": { urls: ["https://www.youtube.com/premium"], claim: { patterns: ["Lite", "43\\s*%"] } },
  "youtube-promo": { urls: ["https://www.youtube.com/premium"], claim: { text: "1개월 0원 무료 체험" } },
  "wavve-100-payback": { urls: ["https://www.wavve.com/voucher/index.html"] },
  "wavve-promo": { urls: ["https://www.wavve.com/voucher/index.html"] },
  "wavve-annual-16": { urls: ["https://www.wavve.com/voucher/index.html"] },
  "disney-bundle-37": { urls: ["https://www.disneyplus.com/ko-kr"] },
  "disney-annual-16": { urls: ["https://www.disneyplus.com/ko-kr"] },
  "tving-annual-44": { urls: ["https://www.tving.com/membership/tving"] },
  "tving-naver": { claim: { type: "manual", reason: "네이버 로그인 후에만 보이는 제휴 연동" } },
  "watcha-promo": { urls: ["https://watcha.com/"] },
  // "와우회원이 아니어도 무료", "쿠팡 회원이라면 누구나 무료" 같이 와우 전용 혜택이 아님을 말하는 문장은 근거에서 제외
  "coupangplay-promo": { urls: ["https://www.coupangplay.com/"], claim: { patterns: ["와우", "무료|추가 비용 없이", "^(?![\\s\\S]*(?:아니어도|뿐만\\s*아니라|누구나))"] } },
  "appletv-7d-free": { urls: [APPLE_TV] },
  "appletv-promo": { urls: [APPLE_TV] },
  "primevideo-promo": { urls: ["https://www.primevideo.com/"] },
  "dazn-promo": { urls: ["https://www.dazn.com/ko-KR/welcome"] },
  "naverplus-netflix": { urls: ["https://help.naver.com/service/23168/contents/23881?lang=ko"], claim: { patterns: ["넷플릭스|Netflix", "광고형"] } },
  "weverse-promo": { claim: { type: "manual", reason: "아티스트별 멤버십이라 공통 혜택 페이지 없음" } },

  // 도서/오디오
  "millie-1plus1": { urls: ["https://www.millie.co.kr/"], claim: { patterns: ["1\\s*\\+\\s*1|둘째\\s*달|2\\s*개월"] } },
  "millie-promo": { urls: ["https://www.millie.co.kr/"], claim: { patterns: ["1\\s*\\+\\s*1|둘째\\s*달|2\\s*개월"] } },
  "welaaa-first-month": { urls: ["https://www.welaaa.com/membership"] },
  "welaaa-promo": { urls: ["https://www.welaaa.com/membership"] },
  "ridiselect-promo": { urls: ["https://select.ridibooks.com/home"] },
  "podbbang-promo": { urls: ["https://www.podbbang.com/"] },
  "audible-promo": { urls: ["https://www.audible.com/ep/freetrial"] },
  "scribd-promo": { urls: ["https://www.scribd.com/"] },

  // 뉴스
  // 뉴스 헤드라인의 금액·기간이 섞이지 않도록 "구독" 문장만 본다
  "the-joongang-plus-promo": { urls: ["https://www.joongang.co.kr/plus"], claim: { requires: ["구독"] } },
  // 같은 페이지에 Games/Cooking의 "$0.50 every four weeks" 문구도 있어 All Access 표기(/week)로 한정한다
  "nyt-digital-promo": { urls: ["https://www.nytimes.com/subscription/all-access"], claim: { patterns: ["\\$\\s*0\\.50?\\s*/\\s*week", "first"] } },
  "wsj-digital-promo": { urls: ["https://store.wsj.com/"] },
  // 한국에서 접속하면 $1 대신 원화("W1000 for 4 weeks")로 표시된다
  "ft-digital-promo": { urls: ["https://www.ft.com/products"], claim: { patterns: ["4\\s*weeks?|4\\s*주", "\\$\\s*1\\b|1\\s*달러|[W₩]\\s*1,?000\\b"] } },

  // 생산성/AI
  "chatgpt-promo": { urls: ["https://chatgpt.com/pricing"], claim: { type: "manual", reason: "무료 플랜 안내라 할인 혜택이 아님 (문구 재작성 필요)" } },
  "claude-pro-promo": { urls: ["https://claude.com/pricing"], claim: { type: "manual", reason: "무료 플랜 안내라 할인 혜택이 아님 (문구 재작성 필요)" } },
  "perplexity-pro-promo": { urls: ["https://www.perplexity.ai/pro"], claim: { patterns: ["SKT|에이닷|T\\s*우주|SK\\s*텔레콤", "Perplexity|퍼플렉시티"] } },
  "skt-perplexity-free": { urls: ["https://www.perplexity.ai/pro"], claim: { patterns: ["SKT|에이닷|T\\s*우주|SK\\s*텔레콤", "Perplexity|퍼플렉시티"] } },
  // 우주패스 공식 사이트 자체이므로 "우주패스" 단어는 요구하지 않는다 (월 할인액은 자동 확인 안 됨)
  "skt-universe-youtube": { urls: ["https://m.sktuniverse.co.kr/"], claim: { patterns: ["YouTube Premium|유튜브 프리미엄", "5,000\\s*원"] } },
  "midjourney-promo": { urls: ["https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans"] },
  // 카탈로그가 특정 요금제(Plus/Professional)를 무료라고 안내하므로, 요금제 이름과 무료가 같은 문장에 있어야 확인으로 본다.
  "notion-student-free": { urls: ["https://www.notion.com/product/notion-for-education"], claim: { patterns: [PLAN_FREE("Plus|플러스")], keywords: EDU } },
  "notion-promo": { urls: ["https://www.notion.com/product/notion-for-education"], claim: { patterns: [PLAN_FREE("Plus|플러스")], keywords: EDU } },
  "figma-edu-free": { urls: ["https://www.figma.com/education/"], claim: { patterns: [PLAN_FREE("Professional|프로페셔널")], keywords: EDU } },
  "figma-promo": { urls: ["https://www.figma.com/education/"], claim: { patterns: [PLAN_FREE("Professional|프로페셔널")], keywords: EDU } },
  "canva-promo": { urls: ["https://www.canva.com/education/"], claim: { keywords: EDU } },
  "github-student-pack": { urls: ["https://education.github.com/pack"], claim: { patterns: ["Copilot"], keywords: EDU } },
  "github-copilot-promo": { urls: ["https://education.github.com/pack"], claim: { patterns: ["Copilot"], keywords: EDU } },
  "jetbrains-student-free": { urls: ["https://www.jetbrains.com/community/education/"], claim: { keywords: EDU } },
  // 카탈로그는 "IDE 16종"이라고 안내하므로 페이지에 16이 있어야 확인 (현재 페이지는 "10 JetBrains IDEs")
  "jetbrains-all-promo": { urls: ["https://www.jetbrains.com/community/education/"], claim: { patterns: ["\\b16\\b[^.!?]{0,30}IDE|IDE[^.!?]{0,10}16\\s*종"], keywords: EDU } },
  // 비영리 할인 안내 문장에는 "교육" 단어가 없으므로 교육 키워드 요구를 끈다
  "slack-pro-promo": { urls: ["https://slack.com/intl/ko-kr/help/articles/204368833"], claim: { keywords: [] } },
  "zoom-pro-promo": { urls: ["https://zoom.us/pricing"], claim: { patterns: ["40\\s*(?:분|min)"] } },
  "ms365-promo": { urls: ["https://www.microsoft.com/ko-kr/education/products/office"], claim: { patterns: ["Office|Microsoft\\s*365|Word", "무료|free"], keywords: EDU } },
  "google-one-promo": { urls: ["https://one.google.com/about/plans"] },
  "evernote-promo": { urls: ["https://evernote.com/students"] },
  "1password-promo": { urls: ["https://1password.com/pricing/password-manager"], claim: { patterns: ["famil|가족", "\\b5\\b|five"] } },
  "framer-promo": { urls: ["https://www.framer.com/pricing"], claim: { patterns: ["Start free|Free Framer domain|\\$\\s*0\\b"] } },
  "webflow-promo": { urls: ["https://webflow.com/pricing"], claim: { patterns: ["Starter", "free|무료", "2\\s*(sites|개\\s*사이트)"] } },
  "adobe-student-66": { urls: ["https://www.adobe.com/kr/creativecloud/buy/students.html"] },
  "adobe-new-user-25": { urls: ["https://www.adobe.com/kr/creativecloud/plans.html"] },
  "adobe-lightroom-promo": { urls: ["https://www.adobe.com/kr/products/photoshop-lightroom/plans.html"] },
  "naver-mybox-promo": { urls: ["https://mybox.naver.com/"], claim: { patterns: ["30\\s*GB"] } },

  // 생활/멤버십
  "naverplus-welcome": { urls: ["https://nid.naver.com/membership/join"], claim: { patterns: ["첫\\s*달|1\\s*개월|한\\s*달", "무료|0원"] } },
  "naverplus-promo": { urls: ["https://nid.naver.com/membership/join"], claim: { patterns: ["첫\\s*달|1\\s*개월|한\\s*달", "무료|0원"] } },
  "naver-spotify-link": { urls: ["https://nid.naver.com/membership/join"], claim: { patterns: ["매월|선택", "스포티파이|Spotify"] } },
  "coupang-30d-free": { urls: ["https://loyalty.coupang.com/loyalty/sign-up/home"] },
  "coupang-promo": { urls: ["https://loyalty.coupang.com/loyalty/sign-up/home"] },
  "baemin-club-promo": { urls: ["https://baemin.com/"], claim: { patterns: ["배민클럽", "첫\\s*달|1\\s*개월|한\\s*달", "무료|0\\s*원"] } },
  "yogipass-promo": { urls: ["https://www.yogiyo.co.kr/"], claim: { patterns: ["요기패스"] } },
  "kakaotalk-emoticon-promo": { urls: ["https://e.kakao.com/"], claim: { patterns: ["이모티콘 플러스"] } },

  // 게임/학습
  "nintendo-7d-free": { urls: ["https://www.nintendo.com/kr/nintendo-switch-online/"] },
  // 공개 페이지에는 "패밀리 플랜" 존재만 나오고 최대 인원(8명)은 나오지 않는다
  "nintendo-family-plan": { urls: ["https://www.nintendo.com/kr/nintendo-switch-online/"], claim: { patterns: ["패밀리\\s*플랜", "8\\s*(?:명|인)|최대\\s*8"] } },
  "ps-plus-promo": { urls: ["https://www.playstation.com/ko-kr/ps-plus/"] },
  "apple-arcade-promo": { urls: ["https://www.apple.com/kr/apple-arcade/"] },
  "ea-play-promo": { urls: ["https://www.ea.com/ko-kr/ea-play"] },
  "wow-subscription-promo": { urls: ["https://worldofwarcraft.blizzard.com/ko-kr/"] },
  "speak-7d-free": { urls: ["https://www.usespeak.com/ko"] },
  "duolingo-14d-free": { urls: ["https://www.duolingo.com/super"] },
};

export function getPromotionSource(id) {
  return promotionSources[id] ?? {};
}
