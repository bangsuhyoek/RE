// 서비스별 해지 가이드.
// 모든 가이드는 공식 고객센터 문서를 근거로 작성하고 sources와 checkedAt을 남긴다.
// 공식 자료로 확인하지 못한 서비스는 여기에 넣지 않는다. getCancelGuide가 공통 안내와 도움말 링크를 대신 돌려준다.

const CHECKED_AT = "2026-10-01";

const GOOGLE_PLAY_SOURCE = "https://support.google.com/googleplay/answer/7018481?hl=ko";
const APPLE_SOURCE = "https://support.apple.com/ko-kr/118428";

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

const youtubeGuide = (label) => ({
  sources: [
    "https://support.google.com/youtube/answer/6308278?hl=ko",
  ],
  cancelUrl: "https://www.youtube.com/paid_memberships",
  steps: [
    { title: "유료 멤버십 열기", description: "컴퓨터에서 youtube.com/paid_memberships에 로그인하세요." },
    { title: "멤버십 관리", description: `${label}의 [멤버십 관리]를 누르세요.` },
    { title: "비활성화", description: "[비활성화] → [계속]을 누르세요. 일시중지 제안은 넘어가세요." },
    { title: "취소", description: "취소 사유를 고르고 [다음] → [취소]를 직접 누르세요." },
  ],
  notes: [
    "휴대전화 앱에서는 프로필 → [구매 항목 및 멤버십] → 멤버십 → [그대로 취소] 순서예요.",
    "결제한 기간이 끝날 때까지 계속 이용할 수 있어요.",
    "취소 여부는 youtube.com/paid_memberships에서 확인할 수 있어요.",
  ],
  altRoutes: ["appStore", "googlePlay"],
});

const storeBilledGuide = (appName, { primary = "googlePlay", alternate = "appStore" } = {}) => ({
  sources: [primary === "googlePlay" ? GOOGLE_PLAY_SOURCE : APPLE_SOURCE],
  primaryRoute: primary,
  altRoutes: alternate ? [alternate] : [],
  notes: [
    "앱 안에서 결제했다면 결제한 스토어에서 해지해야 해요.",
    `웹사이트에서 직접 결제했다면 ${appName} 계정 설정에서 해지하세요.`,
  ],
});

const GUIDES = {
  netflix: {
    sources: ["https://help.netflix.com/ko/node/407"],
    cancelUrl: "https://www.netflix.com/cancelplan",
    steps: [
      { title: "해지 페이지 로그인", description: "웹 브라우저에서 넷플릭스에 로그인하세요. 해지 페이지(netflix.com/cancelplan)가 열려요." },
      { title: "멤버십 해지", description: "[멤버십 해지]를 누르세요." },
      { title: "해지 완료", description: "[해지 완료]를 직접 눌러야 끝나요. 등록된 이메일로 확인 메일이 와요." },
    ],
    notes: [
      "앱을 지우거나 로그아웃해도 해지되지 않아요.",
      "결제한 기간이 끝날 때까지 볼 수 있어요.",
      "[멤버십 해지] 버튼이 없으면 통신사·앱스토어 등 결제한 곳에서 해지해야 해요.",
      "다른 사람이 다시 가입하지 못하게 하려면 비밀번호를 바꾸고 모든 디바이스에서 로그아웃하세요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  youtube: youtubeGuide("YouTube Premium"),
  ytmusic: youtubeGuide("YouTube Music Premium"),
  tving: {
    sources: [
      "https://image.tving.com/public/app_change_guide.html",
      "https://www.tving.com/membership/double",
    ],
    steps: [
      { title: "MY", description: "티빙에 로그인하고 [MY]로 가세요." },
      { title: "이용권/캐시 내역", description: "[이용권/캐시 내역]에서 이용 중인 이용권을 찾으세요." },
      { title: "자동결제 해지", description: "[변경/해지] 또는 [자동결제 해지]를 누르세요." },
      { title: "최종 확인", description: "해지 사유를 고르고 마지막 확인 버튼을 직접 누르세요." },
    ],
    notes: [
      "다음 결제일 최소 24시간 전에 해지하세요. 그보다 늦으면 결제될 수 있어요.",
      "해지해도 현재 이용 기간이 끝날 때까지 볼 수 있어요.",
      "통신사나 제휴처(배달의민족 등)로 가입했다면 가입한 곳에서 해지해야 해요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  disney: {
    sources: [
      "https://help.disneyplus.com/en-GB/article/disneyplus-en-pt-cancel",
      "https://help.disneyplus.com/article/disneyplus-it-it-payment-methods",
    ],
    steps: [
      { title: "계정 열기", description: "웹 브라우저에서 디즈니+에 로그인하고 프로필 → [계정]을 여세요." },
      { title: "구독 선택", description: "구독 항목에서 이용 중인 Disney+ 구독을 고르세요." },
      { title: "구독 취소", description: "[구독 취소]를 누르고 안내를 끝까지 진행하세요." },
    ],
    notes: [
      "결제한 기간이 끝날 때까지 볼 수 있어요.",
      "구독 취소와 계정 삭제는 서로 다른 절차예요.",
      "통신사 등으로 가입했다면 가입한 곳에서 해지해야 해요.",
      "공식 안내가 영문 고객센터 기준이라 한국어 메뉴 이름은 조금 다를 수 있어요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "google-play-pass": storeBilledGuide("Google Play Pass", { primary: "googlePlay", alternate: null }),
  watcha: {
    sources: [
      "https://help.watcha.com/hc/ko/articles/31326576396825",
      "https://help.watcha.com/hc/ko/articles/9580952320281",
    ],
    steps: [
      { title: "프로필", description: "왓챠 앱 오른쪽 위 [프로필]을 누르세요. 해지 메뉴는 가장 왼쪽 기본 프로필에서만 보일 수 있어요." },
      { title: "구독 정보", description: "[구독 정보] → [해지하기]를 누르세요. PC에서는 [나의 왓챠] → [구독권 변경 및 해지] → [구독을 해지하고 싶어요] 순서예요." },
      { title: "해지할게요", description: "[해지할게요]를 직접 눌러 마무리하세요." },
    ],
    notes: [
      "결제일 당일에 해지하면 다음 결제가 될 수 있어요. 결제일 전에 해지하세요.",
      "남은 기간은 끝까지 볼 수 있지만, 그만큼 환불되지는 않아요.",
      "스카이라이프로 가입했다면 스카이라이프 고객센터(1588-3002)에서 해지해야 해요.",
    ],
    altRoutes: ["appStore"],
  },
  coupangplay: {
    sources: ["https://play.coupang.com/faq", "https://news.coupang.com/archives/64377/"],
    cancelUrl: "https://play.coupang.com/faq",
    steps: [
      { title: "설정", description: "쿠팡플레이 앱에서 [프로필] → 오른쪽 위 [설정]을 누르세요." },
      { title: "쿠팡 계정 관리", description: "[쿠팡 계정 관리]를 누르세요." },
      { title: "와우 멤버십 해지", description: "[와우 멤버십 해지]를 누르고 안내를 끝까지 진행하세요." },
    ],
    notes: [
      "쿠팡플레이는 와우 멤버십을 해지하는 방식이에요.",
      "[쿠팡 회원 탈퇴]는 쿠팡 전체 탈퇴예요. 와우 멤버십 해지와 헷갈리지 마세요.",
      "쿠팡플레이 패스에 가입했다면 패스 구독부터 해지해야 할 수 있어요.",
      "해지 후에도 쿠팡 일반 회원이면 와우 전용이 아닌 콘텐츠는 계속 볼 수 있어요.",
    ],
  },
  coupang: {
    sources: ["https://news.coupang.com/archives/64216/", "https://news.coupang.com/archives/64772/"],
    steps: [
      { title: "마이쿠팡", description: "쿠팡 앱에서 [마이쿠팡]을 여세요." },
      { title: "와우 멤버십", description: "[와우 멤버십]을 누르세요." },
      { title: "해지하기", description: "[해지하기]를 누르고 안내를 끝까지 진행하세요." },
    ],
    notes: [
      "이번 달에 와우 혜택을 쓰지 않았다면 이번 달 회비를 돌려받아요. 썼다면 종료 예정일까지 혜택이 유지돼요.",
      "환불은 결제 수단에 따라 최대 7일(일부 해외 카드는 14일) 걸려요.",
      "은행 점검 시간에는 해지가 안 될 수 있어요.",
      "문의: 쿠팡 고객센터 1577-7011(24시간).",
    ],
  },
  "apple-arcade": storeBilledGuide("Apple Arcade", { primary: "appStore", alternate: null }),
  naverplus: {
    sources: [
      "https://help.naver.com/service/23168/contents/13775",
      "https://help.naver.com/service/23168/contents/20281",
      "https://help.naver.com/service/23168/contents/25388",
    ],
    steps: [
      { title: "설정", description: "네이버플러스 마이 멤버십 오른쪽 위 [설정]을 누르세요." },
      { title: "네이버플러스 멤버십 관리", description: "설정 화면에서 [네이버플러스 멤버십 관리]를 누르세요." },
      { title: "네이버플러스 멤버십 해지하기", description: "멤버십 관리 화면에서 [네이버플러스 멤버십 해지하기]를 누르세요." },
      { title: "정기결제 해지", description: "이번 이용 기간을 확인한 뒤 [정기결제 해지]를 누르세요." },
      { title: "해지하기", description: "최종 확인 화면에서 [해지하기]를 직접 눌러야 해지가 끝나요." },
    ],
    notes: [
      "정기결제를 해지해도 이번 이용 기간 마지막 날까지 혜택이 유지돼요.",
      "이미 결제한 멤버십을 바로 끝내고 환불받으려면 [정기결제 해지] 대신 [멤버십 즉시 종료]를 고르세요.",
      "디지털 콘텐츠 업그레이드를 따로 설정했다면 그것도 해지해야 추가 결제가 멈춰요.",
      "네이버 앱에서는 [MY] → 오른쪽 위 설정 → [멤버십 해지하기]로도 들어갈 수 있어요.",
    ],
  },
  melon: {
    sources: ["https://help.melon.com/web/faq/content.htm?faqId=2212"],
    steps: [
      { title: "내정보", description: "멜론에 로그인하고 [내정보]를 여세요." },
      {
        title: "이용권 메뉴",
        description: "PC는 [멜론 이용권/결제정보] → [멜론 이용권], 모바일은 [이용권/쿠폰/캐시] → [변경/해지] → [결제방법 변경/해지]로 가세요.",
      },
      { title: "해지 신청", description: "[이용권 해지신청] 또는 [해지]를 누르고 해지 방식을 골라 마무리하세요." },
    ],
    notes: [
      "정기결제 해지는 다음 결제일까지 이용할 수 있고, 중도 해지는 바로 끝나요. 환불 대상인지 해지 화면에서 확인하세요.",
      "문의: 멜론 고객센터 1566-7727(평일 09:00~18:00).",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  spotify: {
    sources: ["https://support.spotify.com/kr-ko/article/cancel-premium/"],
    steps: [
      { title: "계정 페이지", description: "웹 브라우저에서 Spotify 계정 페이지에 로그인하세요." },
      { title: "요금제 변경", description: "[요금제 관리하기]에서 [요금제 변경]을 누르세요." },
      { title: "Premium 해지", description: "아래쪽 [Spotify 구독 해지]를 누르고 [Premium 해지]를 직접 누르세요." },
    ],
    notes: [
      "다음 결제일까지 Premium을 쓰고, 그 뒤 무료 요금제로 바뀌어요. 플레이리스트는 그대로 남아요.",
      "해지 버튼이 없으면 통신사 같은 파트너로 가입한 경우예요. 가입한 파트너에서 해지하세요.",
    ],
  },
  chatgpt: {
    sources: ["https://help.openai.com/en/articles/7232927-how-do-i-cancel-my-chatgpt-plus-subscription"],
    cancelUrl: "https://chatgpt.com/#settings/Subscription",
    steps: [
      { title: "설정 열기", description: "chatgpt.com에 로그인하고 프로필 메뉴에서 [Settings]를 여세요." },
      { title: "결제 관리", description: "[Billing](결제) 항목으로 가세요." },
      { title: "플랜 취소", description: "[Cancel plan]을 누르고 [Cancel]을 직접 눌러 확인하세요." },
    ],
    notes: [
      "다음 결제일 최소 24시간 전에 해지하세요.",
      "해지해도 이번 결제 기간이 끝날 때까지 Plus를 쓸 수 있어요.",
      "앱을 지워도 구독은 해지되지 않고, 해지한다고 자동 환불되지는 않아요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "claude-pro": {
    sources: ["https://support.anthropic.com/en/articles/8325617-how-do-i-cancel-my-paid-claude-subscription"],
    cancelUrl: "https://claude.ai/settings/billing",
    steps: [
      { title: "설정 열기", description: "웹이나 데스크톱 앱에서 왼쪽 아래 이름을 누르고 [Settings]를 여세요. 휴대전화 앱은 오른쪽 위 이니셜을 누르세요." },
      { title: "Billing", description: "[Billing]으로 가세요. 휴대전화 앱은 [Billing] → [Manage subscription]이에요." },
      { title: "취소", description: "[Cancel]을 누르고 안내를 끝까지 진행하세요." },
    ],
    notes: [
      "다음 결제일 최소 24시간 전에 해지하세요.",
      "해지해도 이번 결제 기간이 끝날 때까지 Pro를 쓸 수 있어요.",
    ],
  },
  "github-copilot": {
    sources: ["https://docs.github.com/en/copilot/how-tos/manage-your-account/view-and-change-your-copilot-plan"],
    cancelUrl: "https://github.com/settings/billing",
    steps: [
      { title: "설정 열기", description: "GitHub 오른쪽 위 프로필 사진 → [Settings]로 가세요." },
      { title: "Licensing", description: "[Billing & licensing] → [Licensing]을 여세요. 예전 화면에서는 [Plans and usage]예요." },
      { title: "구독 관리", description: "GitHub Copilot 항목의 [Manage subscription]을 누르세요." },
      { title: "구독 취소", description: "[Cancel subscription]을 누르고 취소를 직접 확인하세요." },
    ],
    notes: [
      "이번 결제 기간이 끝나면 Copilot Free로 바뀌어요.",
      "회사나 단체 계정으로 받은 Copilot은 그 조직의 관리자가 해지해야 해요.",
    ],
  },
  ms365: {
    sources: [
      "https://support.microsoft.com/ko-kr/accounts-billing/subscriptions/cancel-a-microsoft-365-subscription",
      "https://support.microsoft.com/ko-KR/accounts-billing/subscriptions/where-can-i-manage-my-microsoft-365-subscription",
    ],
    cancelUrl: "https://account.microsoft.com/services",
    steps: [
      { title: "서비스 및 구독", description: "account.microsoft.com/services에 구독한 Microsoft 계정으로 로그인하세요." },
      { title: "관리", description: "Microsoft 365 항목의 [관리]를 누르세요." },
      { title: "반복 청구 끄기", description: "[반복 청구 끄기]를 누르고 안내를 끝까지 진행하세요. [반복 청구 켜기]가 보이면 이미 꺼진 상태예요." },
    ],
    notes: [
      "현재 결제 기간이 끝날 때까지 계속 쓸 수 있어요.",
      "만료되면 OneDrive 저장 공간이 무료 5GB로 돌아갈 수 있어요.",
      "Amazon 같은 판매처에서 샀다면 그 판매처에서 해지하세요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "google-one": {
    sources: [
      "https://support.google.com/googleone/answer/9056360?hl=ko",
      "https://support.google.com/googleone/answer/9003633?hl=ko",
    ],
    cancelUrl: "https://one.google.com/settings",
    steps: [
      { title: "Google One 설정", description: "one.google.com에 로그인하고 [설정]을 여세요." },
      { title: "멤버십 취소", description: "[멤버십 취소]를 누르세요." },
      { title: "확인", description: "안내를 읽고 [멤버십 취소]를 한 번 더 직접 누르세요." },
    ],
    notes: [
      "현재 결제 주기가 끝날 때까지 혜택이 유지되고, 그 뒤 무료 15GB가 적용돼요.",
      "15GB를 넘게 쓰고 있으면 Gmail과 Drive 사용이 제한될 수 있어요.",
      "통신사로 가입했다면 가입한 통신사에서 해지하세요.",
    ],
    altRoutes: ["appStore"],
  },
  notion: {
    sources: ["https://www.notion.com/help/upgrade-or-downgrade-your-plan"],
    cancelUrl: "https://www.notion.so/settings",
    steps: [
      { title: "Settings", description: "데스크톱 앱이나 웹에서 [Settings]를 여세요." },
      { title: "Billing", description: "[Billing] → [Change plan]으로 가세요." },
      { title: "Free로 변경", description: "[Free] → [Continue] → [Downgrade]를 직접 누르세요." },
    ],
    notes: [
      "결제 변경은 워크스페이스 소유자만 할 수 있어요.",
      "현재 결제 기간이 끝날 때까지 유료 기능을 쓸 수 있어요.",
    ],
    altRoutes: ["appStore"],
  },
  dropbox: {
    sources: [
      "https://help.dropbox.com/ko-kr/plans/downgrade-dropbox-individual-plans",
      "https://help.dropbox.com/ko-kr/plans/cancel-mobile",
    ],
    cancelUrl: "https://www.dropbox.com/account/plan",
    steps: [
      { title: "계정 관리", description: "dropbox.com에 로그인하고 왼쪽 아래 프로필 → [계정 관리]로 가세요." },
      { title: "요금제 해지", description: "아래쪽 [요금제 해지]를 누르세요." },
      { title: "계속 취소", description: "사유를 고르고 [계속 취소]를 직접 누르세요. 확인 메일이 와요." },
    ],
    notes: [
      "현재 결제 기간이 끝나면 2GB 무료 요금제(Dropbox Basic)로 바뀌어요.",
      "앱을 지우는 것만으로는 해지되지 않아요.",
      "Family·팀 요금제와 무료 체험은 해지 방법이 따로 있어요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  canva: {
    sources: [
      "https://www.canva.com/ja_jp/help/cancel-canva-plan/",
      "https://www.canva.com/en_gb/help/subscription-refunds-variantb/",
    ],
    cancelUrl: "https://www.canva.com/settings/billing-and-teams",
    steps: [
      { title: "설정", description: "Canva 웹에서 프로필 → [설정]을 여세요." },
      { title: "결제 및 요금제", description: "[결제 및 요금제]에서 [플랜 취소]를 누르세요." },
      { title: "구독 취소", description: "[취소 계속]을 누르고 사유를 고른 뒤 [구독 취소]를 직접 누르세요." },
    ],
    notes: [
      "현재 결제 기간이 끝날 때까지 Pro를 쓸 수 있고, 이미 낸 금액은 보통 환불되지 않아요.",
      "버튼이 안 보이면 다른 계정이나 다른 팀으로 로그인했는지 확인하세요.",
      "공식 안내가 외국어 도움말 기준이라 한국어 메뉴 이름은 조금 다를 수 있어요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  adobe: {
    sources: [
      "https://helpx.adobe.com/kr/account/individual/subscriptions-and-plans/renewals-and-cancellations/cancel-adobe-subscription.html",
      "https://helpx.adobe.com/kr/account/individual/subscriptions-and-plans/renewals-and-cancellations/account-access-after-plan-cancellation.html",
    ],
    cancelUrl: "https://account.adobe.com/plans",
    steps: [
      { title: "플랜", description: "account.adobe.com에 로그인하고 [플랜]을 여세요." },
      { title: "플랜 관리", description: "Creative Cloud 플랜의 [플랜 관리]를 누르세요." },
      { title: "내 플랜 취소", description: "[내 플랜 취소]를 누르고 사유를 고른 뒤 [계속]을 누르세요." },
      { title: "취소 확인", description: "할인 제안을 넘기고 [취소 확인]을 직접 누르세요." },
    ],
    notes: [
      "대부분의 플랜은 처음 구매한 지 14일 안에 취소하면 전액 환불돼요.",
      "결제가 처리 중이면 24시간 뒤에 다시 시도해야 할 수 있어요.",
      "취소 후 클라우드 저장 공간이 5GB로 줄어들 수 있어요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "adobe-lightroom": {
    sources: [
      "https://helpx.adobe.com/kr/account/individual/subscriptions-and-plans/renewals-and-cancellations/cancel-adobe-subscription.html",
      "https://helpx.adobe.com/kr/account/individual/subscriptions-and-plans/renewals-and-cancellations/account-access-after-plan-cancellation.html",
    ],
    cancelUrl: "https://account.adobe.com/plans",
    steps: [
      { title: "플랜", description: "account.adobe.com에 로그인하고 [플랜]을 여세요." },
      { title: "플랜 관리", description: "Lightroom 플랜의 [플랜 관리]를 누르세요." },
      { title: "내 플랜 취소", description: "[내 플랜 취소]를 누르고 사유를 고른 뒤 [계속]을 누르세요." },
      { title: "취소 확인", description: "할인 제안을 넘기고 [취소 확인]을 직접 누르세요." },
    ],
    notes: [
      "대부분의 플랜은 처음 구매한 지 14일 안에 취소하면 전액 환불돼요.",
      "결제가 처리 중이면 24시간 뒤에 다시 시도해야 할 수 있어요.",
      "취소 후 클라우드 저장 공간이 5GB로 줄어들 수 있어요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  icloud: {
    sources: ["https://support.apple.com/ko-kr/108318", "https://support.apple.com/ko-kr/121290"],
    cancelUrl: "https://support.apple.com/ko-kr/108318",
    steps: [
      { title: "iCloud 열기", description: "iPhone [설정] → 맨 위 내 이름 → [iCloud]로 가세요." },
      { title: "요금제 관리", description: "[요금제 관리](또는 [계정 저장 공간 관리]) → [다운그레이드 옵션]을 누르세요." },
      { title: "무료로 변경", description: "무료 5GB를 고르고 [완료]를 직접 누르세요." },
    ],
    notes: [
      "변경은 현재 청구 기간이 끝난 뒤 적용돼요.",
      "사용량이 5GB보다 많으면 사진 동기화와 백업이 멈출 수 있으니 미리 정리하세요.",
      "Mac은 시스템 설정 → Apple 계정 → iCloud → [요금제 관리], Windows는 Windows용 iCloud → [관리]에서 바꿀 수 있어요.",
    ],
  },
  applemusic: {
    sources: [
      "https://support.apple.com/ko-kr/118428",
      "https://support.apple.com/ko-kr/guide/music-web/apdm8de77edb/web",
    ],
    steps: [
      { title: "구독 열기", description: "iPhone [설정] → 맨 위 내 이름 → [구독]으로 가세요. 웹은 music.apple.com 오른쪽 위 [계정] → [설정] → [구독] → [관리]예요." },
      { title: "Apple Music 선택", description: "구독 목록에서 Apple Music을 고르세요." },
      { title: "구독 취소", description: "[구독 취소]를 직접 누르세요. 버튼이 없으면 이미 취소된 상태예요." },
    ],
    notes: ["현재 결제 기간이 끝날 때까지 이용할 수 있어요."],
    altRoutes: ["googlePlay"],
  },
  appletv: storeBilledGuide("Apple TV+", { primary: "appStore", alternate: null }),
  duolingo: {
    sources: ["https://kn.duolingo.com/help/cancel-my-super-duolingo-subscription"],
    steps: [
      { title: "설정", description: "앱에서 Super 아이콘 → [설정]으로 가세요. 웹은 프로필 사진 → [설정] → [Super Duolingo]예요." },
      { title: "구독 관리", description: "[구독 관리]를 누르세요." },
      { title: "구독 취소", description: "[구독 취소]를 누르세요. 앱에서는 App Store나 Google Play 화면에서 취소를 확인해요." },
    ],
    notes: [
      "앱이나 계정을 지워도 구독은 해지되지 않아요.",
      "현재 결제 기간이 끝날 때까지 Super 기능을 쓸 수 있어요.",
      "공식 안내가 외국어 도움말 기준이라 한국어 메뉴 이름은 조금 다를 수 있어요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "perplexity-pro": {
    sources: ["https://www.perplexity.ai/help-center/en/articles/10352901-what-is-perplexity-pro"],
    cancelUrl: "https://www.perplexity.ai/settings/account",
    steps: [
      { title: "Settings", description: "perplexity.ai에 로그인하고 [Settings]를 여세요." },
      { title: "Subscription", description: "[Subscription]에서 [Manage Plan] 또는 [Manage Subscription]을 누르세요." },
      { title: "Cancel", description: "[Cancel]을 누르고 안내를 끝까지 진행하세요." },
    ],
    notes: [
      "현재 결제 기간이 끝날 때까지 Pro를 쓸 수 있어요.",
      "계정을 지우기 전에 먼저 구독을 해지하세요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  midjourney: {
    sources: ["https://docs.midjourney.com/hc/en-us/articles/25384024738573-Canceling-Your-Subscription"],
    cancelUrl: "https://www.midjourney.com/account",
    steps: [
      { title: "계정 페이지", description: "midjourney.com에 로그인하고 [Manage Subscription]을 여세요." },
      { title: "Cancel Plan", description: "[Cancel Plan]을 누르세요." },
      { title: "확인", description: "취소 확인 버튼을 직접 누르세요." },
    ],
    notes: [
      "해지는 현재 결제 주기가 끝날 때 적용되고, 그때까지 남은 GPU 시간을 쓸 수 있어요.",
      "해지해도 만든 이미지와 계정 기록은 지워지지 않아요.",
      "플랜 변경이 예약돼 있으면 [Cancel Change]로 먼저 취소하세요.",
    ],
  },
  "cursor-ai": {
    sources: [
      "https://prod.cursor.com/help/account-and-billing/cancel",
      "https://cursor.com/help/account-and-billing/google-play-subscription",
    ],
    cancelUrl: "https://cursor.com/dashboard/billing",
    steps: [
      { title: "결제 페이지", description: "cursor.com/dashboard/billing에 로그인하세요." },
      { title: "구독 관리", description: "[Manage Subscription]을 눌러 결제 화면으로 가세요." },
      { title: "구독 취소", description: "[Cancel Subscription]을 누르고 취소를 직접 확인하세요." },
    ],
    notes: [
      "현재 결제 기간이 끝날 때까지 유료 기능을 쓸 수 있어요.",
      "App Store나 Google Play로 결제했다면 그 스토어에서만 해지할 수 있어요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "xbox-gamepass": {
    sources: [
      "https://support.microsoft.com/en-us/accounts-billing/subscriptions/cancel-your-microsoft-subscription",
      "https://support.microsoft.com/en-US/accounts-billing/subscriptions/turn-recurring-billing-on-or-off-for-a-microsoft-subscription",
      "https://support.microsoft.com/en-us/accounts-billing/subscriptions/how-to-get-a-refund-on-a-microsoft-subscription",
    ],
    cancelUrl: "https://account.microsoft.com/services",
    steps: [
      { title: "서비스 및 구독", description: "account.microsoft.com/services에 Xbox에서 쓰는 Microsoft 계정으로 로그인하세요." },
      { title: "관리", description: "Xbox Game Pass 항목의 [관리]를 누르세요." },
      { title: "구독 취소", description: "[구독 취소] 또는 [업그레이드 또는 취소]를 누르고 안내를 끝까지 진행하세요." },
    ],
    notes: [
      "보통 현재 결제 기간이 끝날 때까지 쓸 수 있어요.",
      "한국에서는 조건에 따라 남은 기간만큼 환불받을 수 있어요.",
      "다른 판매처에서 결제했다면 그곳에서 해지하세요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "ps-plus": {
    sources: [
      "https://www.playstation.com/ko-kr/support/store/cancel-ps-store-subscription/",
      "https://www.playstation.com/ko-kr/support/subscriptions/cancel-playstation-plus/",
    ],
    steps: [
      { title: "계정 관리", description: "웹에서 PlayStation 계정으로 로그인하고 [계정 관리]를 여세요." },
      { title: "정기 구독 서비스", description: "[정기 구독 서비스]에서 PlayStation Plus를 찾으세요." },
      { title: "취소", description: "[취소]를 누르고 안내를 끝까지 진행하세요." },
    ],
    notes: [
      "PS5에서는 [설정] → [유저 및 계정] → [계정] → [결제 및 정기 구독 서비스] → [정기 구독 서비스] → PlayStation Plus → [정기 구독 서비스 취소하기] 순서예요.",
      "이미 결제한 기간에는 혜택이 그대로 유지돼요.",
    ],
  },
  "nintendo-online": {
    sources: [
      "https://support.nintendo.com/kr/switch/nintendo_switch_online/05.html",
      "https://support.nintendo.com/kr/switch/nintendo_switch_online/06.html",
    ],
    steps: [
      { title: "숍 메뉴", description: "웹에서 닌텐도 어카운트에 로그인하고 [숍 메뉴]를 여세요." },
      { title: "이용권 확인·설정", description: "[이용권의 확인·설정]으로 가세요." },
      { title: "자동 연장 해제", description: "[자동 연장 결제 해제]를 직접 누르세요." },
    ],
    notes: [
      "본체에서는 [HOME 메뉴] → [마이 페이지] → [유저 설정] → [이용 상황 확인] → e숍 [어카운트 정보] → [이용 상황]에서 해제해요.",
      "해제해도 남은 기간은 그대로 쓸 수 있어요.",
      "유저를 지우거나 본체를 초기화해도 구독은 멈추지 않아요.",
    ],
  },
  figma: {
    sources: [
      "https://help.figma.com/hc/en-us/articles/360046216313-Upgrade-or-downgrade-your-plan",
      "https://help.figma.com/hc/en-us/articles/4420557724439-Admins-in-Figma",
    ],
    steps: [
      { title: "팀 선택", description: "Figma 파일 브라우저 사이드바에서 Professional 팀을 고르세요." },
      { title: "Admin 설정", description: "[Admin] → [Settings]로 가세요." },
      { title: "Cancel plan", description: "Plan 항목의 [Cancel plan]을 누르고 사유를 고른 뒤 [Cancel plan]을 한 번 더 직접 누르세요." },
    ],
    notes: [
      "팀 관리자만 플랜을 바꿀 수 있어요.",
      "현재 결제 기간이 끝나면 무료 Starter 플랜으로 바뀌고, 계정은 그대로 남아요.",
      "Starter 한도를 넘는 파일은 편집할 수 없게 될 수 있어요. 해지 전에 프로젝트당 Figma Design 3개, FigJam 3개 이하로 정리하세요.",
    ],
  },
  grammarly: {
    sources: ["https://support.grammarly.com/hc/en-us/articles/115000090172-How-do-I-cancel-my-subscription"],
    cancelUrl: "https://account.grammarly.com/subscription",
    steps: [
      { title: "Subscription", description: "Grammarly 계정에 로그인하고 왼쪽 [Account] → [Subscription]으로 가세요." },
      { title: "Cancel Subscription", description: "아래쪽 [Cancel Subscription] → [Continue]를 누르세요." },
      { title: "확인", description: "사유를 고르고 [Cancel Subscription]을 한 번 더 직접 누르세요." },
    ],
    notes: [
      "자동 갱신만 멈추고, 이번 결제 기간이 끝날 때까지 Pro 기능을 쓸 수 있어요.",
      "해지 버튼이 없으면 결제한 계정으로 로그인했는지 확인하세요.",
    ],
    altRoutes: ["appStore"],
  },
  "slack-pro": {
    sources: [
      "https://slack.com/help/articles/48764458651795-Change-or-cancel-your-paid-Slack-plan",
      "https://slack.com/help/articles/27204752526611-Feature-limitations-on-the-free-version-of-Slack",
    ],
    steps: [
      { title: "결제 관리", description: "데스크톱 Slack에서 [Admin](없으면 워크스페이스 이름 → [Workspace settings]) → [Manage billing]으로 가세요." },
      { title: "플랜 변경", description: "[Overview] 탭의 [Change plan details] → [Downgrade to Free]를 누르세요." },
      { title: "다운그레이드", description: "즉시 또는 다음 갱신일을 고르고 [Continue to Checkout] → [Downgrade Slack]을 직접 누르세요." },
    ],
    notes: [
      "워크스페이스 소유자나 처음 업그레이드한 사람만 바꿀 수 있어요.",
      "무료 플랜에서는 최근 90일치 메시지·파일만 볼 수 있고, 1년이 지난 데이터는 삭제돼요.",
    ],
  },
  "zoom-pro": {
    sources: [
      "https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0060999",
      "https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0062585",
    ],
    cancelUrl: "https://zoom.us/billing",
    steps: [
      { title: "결제 관리", description: "Zoom 웹 포털에 로그인하고 [Account Management] → [Billing]으로 가세요." },
      { title: "Current Plans", description: "[Current Plans] 탭에서 이용 중인 플랜을 찾으세요." },
      { title: "Cancel Subscription", description: "[Cancel Subscription]을 누르고 안내를 끝까지 진행하세요." },
    ],
    notes: [
      "계정 소유자나 결제 관리자만 해지할 수 있어요.",
      "이번 결제 기간이 끝날 때까지 계속 쓸 수 있어요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  millie: {
    sources: ["https://www.millie.co.kr/v3/customer", "https://www.millie.co.kr/v3/customer/qna"],
    steps: [
      { title: "설정", description: "웹은 오른쪽 위 [설정] → [마이 정보], 앱은 [관리] → [설정] → [정기결제 관리]로 가세요." },
      { title: "해지 신청", description: "[정기결제 해지 신청] 또는 [구독 해지]를 누르세요." },
      { title: "해지하기", description: "사유를 고르고 [다음] → [해지하기]를 직접 누르세요." },
    ],
    notes: ["해지 신청 후에도 남은 기간은 이용할 수 있어요."],
    altRoutes: ["appStore", "googlePlay"],
  },
  coursera: {
    sources: ["https://www.coursera.support/s/article/208280056-Cancel-a-subscription-or-Coursera-Plus"],
    cancelUrl: "https://www.coursera.org/my-purchases",
    steps: [
      { title: "구매 내역", description: "Coursera에 로그인하고 [My Purchases]를 여세요. [My Coursera] → [Updates] → [Manage subscriptions]로도 갈 수 있어요." },
      { title: "Manage", description: "Coursera Plus 항목의 [Manage]를 누르세요." },
      { title: "Cancel Subscription", description: "[Cancel Subscription]을 누르고 안내를 끝까지 진행하세요." },
    ],
    notes: [
      "연간 플랜은 자동 갱신만 꺼져요.",
      "월간 플랜은 이번 결제 기간이 끝날 때까지 쓸 수 있어요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  ridiselect: {
    sources: ["https://ridihelp.ridibooks.com/support/solutions/articles/154000201591"],
    cancelUrl: "https://ridihelp.ridibooks.com/support/solutions/articles/154000201591",
    steps: [
      { title: "마이리디", description: "리디에 로그인하고 [마이리디]를 여세요." },
      { title: "결제 관리", description: "[결제 관리]에서 [구독 해지]를 누르세요." },
      { title: "해지 확인", description: "안내를 확인하고 해지 버튼을 직접 누르세요." },
    ],
    notes: [
      "리디셀렉트는 지금 '리디 셀렉트 플러스'라는 이름으로 운영돼요.",
      "해지해도 다음 결제일까지 이용할 수 있어요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "baemin-club": {
    sources: ["https://www.baemin.com/customer/policy/4"],
    steps: [
      { title: "마이배민", description: "배달의민족 앱에서 [마이배민] → 배민클럽으로 가세요." },
      { title: "멤버십 관리", description: "[멤버십 관리]를 누르세요." },
      { title: "해지하기", description: "[배민클럽 해지하기] → [해지하기]를 직접 누르세요." },
    ],
    notes: [
      "해지 시점에 따라 바로 끝나거나 다음 결제일까지 이어져요. 환불 조건은 해지 화면에서 확인하세요.",
      "문의: 배달의민족 고객센터 1600-0025.",
    ],
  },
  todoist: {
    sources: ["https://www.todoist.com/help/account-and-billing/plans/cancel-a-todoist-subscription-08AmJLVkC"],
    cancelUrl: "https://app.todoist.com/app/settings/subscription",
    steps: [
      { title: "설정", description: "todoist.com 웹이나 데스크톱 앱에서 왼쪽 위 아바타 → [Settings]로 가세요. 모바일 앱에는 이 메뉴가 없어요." },
      { title: "Subscription", description: "[Subscription]에서 [Cancel plan]을 누르세요." },
      { title: "Cancel subscription", description: "사유를 고르고 [Cancel subscription]을 직접 눌러 확인하세요." },
    ],
    notes: [
      "현재 결제 기간이 끝날 때까지 Pro를 쓰고, 그 뒤 Beginner 플랜으로 바뀌어요. 작업과 프로젝트는 남아요.",
      "연간 플랜을 30일 안에 해지하면 즉시 종료하고 환불받는 옵션이 나와요.",
      "Beginner 플랜은 개인 프로젝트 5개까지라 나머지는 읽기 전용이 돼요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "nyt-digital": {
    sources: ["https://help.nytimes.com/115003007668-Manage-Account/360003499613-Cancel-Your-Subscription"],
    cancelUrl: "https://www.nytimes.com/account",
    steps: [
      { title: "Account", description: "nytimes.com/account에 로그인하세요." },
      { title: "Subscription Overview", description: "[Subscription Overview]를 여세요." },
      { title: "Cancel", description: "Manage Subscription 항목의 [Cancel your Subscription]을 누르고 안내를 끝까지 진행하세요." },
    ],
    notes: [
      "해지 후에는 NYT 기사를 제한적으로만 볼 수 있어요.",
      "고객센터 채팅으로도 해지할 수 있어요(미국 동부 시간 기준 운영).",
      "The Athletic으로 결제했다면 The Athletic 계정 설정에서 해지하세요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "ft-digital": {
    sources: ["https://help.ft.com/faq/manage-my-subscription/how-do-i-cancel-my-subscription/"],
    steps: [
      { title: "My Account", description: "FT.com에 로그인하고 [My Account]를 여세요." },
      { title: "Subscription", description: "[Subscription] 탭으로 가세요." },
      { title: "Cancel subscription", description: "[Cancel subscription]을 누르고 안내를 끝까지 진행하세요." },
    ],
    notes: ["구독 옵션을 상담하고 싶다면 FT 고객센터 채팅이나 전화를 이용하세요."],
  },
  "the-economist": {
    sources: ["https://myaccount.economist.com/s/article/How-do-I-cancel-my-subscription"],
    steps: [
      { title: "My Account", description: "Economist 웹사이트에 로그인하고 [My Account]를 여세요." },
      { title: "Manage subscription", description: "My subscription 항목의 [Manage subscription]을 누르세요." },
      { title: "해지", description: "구독 해지를 선택하고 안내를 끝까지 진행하세요. 전화나 채팅 상담으로도 해지할 수 있어요." },
    ],
    notes: [
      "구독 대행사(agent)를 통해 가입했다면 그 대행사에 직접 연락하세요.",
      "회사에서 Team 구독으로 가입했다면 회사 관리자에게 문의하세요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  audible: {
    sources: ["https://help.audible.com/s/article/cancel-membership?language=en_US"],
    cancelUrl: "https://www.audible.com/account/overview",
    steps: [
      { title: "Membership details", description: "Audible 웹사이트에서 위쪽 내 이름 → [Membership details]로 가세요. 모바일 웹은 메뉴 → 내 이름 → [Membership details]예요." },
      { title: "Cancel membership", description: "[Cancel membership]을 누르세요." },
      { title: "Confirm cancellation", description: "[Confirm cancellation]을 직접 누르세요. 확인 메일이 와요." },
    ],
    notes: [
      "앱을 지워도 멤버십은 해지되지 않아요.",
      "해지해도 크레딧이나 카드로 산 책은 계속 들을 수 있어요. 남은 크레딧이 아깝다면 일시정지를 고려하세요.",
      "해지 메뉴가 없으면 다른 이메일 계정으로 가입했는지 확인하세요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  scribd: {
    sources: ["https://support.scribd.com/hc/en-us/articles/210134046-How-to-cancel-your-Scribd-subscription"],
    steps: [
      { title: "Your account", description: "Scribd 웹사이트에 로그인하고 [Your account]로 가세요." },
      { title: "Manage Subscription", description: "Your subscription 항목에서 Plan details 옆 [Manage Subscription]을 누르세요." },
      { title: "Cancel subscription", description: "[Pause subscription] 아래의 [Cancel subscription] 링크를 누르고 안내대로 확인하세요." },
    ],
    notes: [
      "해지하면 Scribd와 Slideshare가 함께 해지돼요. Everand 구독은 따로예요.",
      "일시정지 중이면 먼저 재개한 뒤 바로 해지해야 결제를 피할 수 있어요.",
      "해지 후 종료일이 적힌 완료 화면과 확인 메일이 와요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "runway-gen": {
    sources: ["https://help.runwayml.com/hc/en-us/articles/21668396605971-How-do-I-cancel-my-plan"],
    cancelUrl: "https://app.runwayml.com/settings/billing",
    steps: [
      { title: "결제 페이지", description: "app.runwayml.com/settings/billing에 로그인하세요." },
      { title: "Cancel plan", description: "[Cancel plan]을 누르고 의견을 남긴 뒤 [Continue to cancel plan]을 누르세요." },
      { title: "확인", description: "결제 화면에서 [Confirm cancellation]을 직접 누르세요." },
    ],
    notes: [
      "결제 주기가 끝날 때까지 유료 기능을 쓸 수 있고, 갱신되지 않아요.",
      "[Cancel plan] 버튼이 비활성화돼 있으면 이미 해지 예약된 상태예요. 종료일은 Expires on에 나와요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  evernote: {
    sources: ["https://help.evernote.com/hc/en-us/articles/115005949208-How-to-cancel-your-Evernote-subscription"],
    steps: [
      { title: "Billing", description: "Evernote 웹의 계정 설정에 로그인하고 왼쪽 [Billing]을 여세요." },
      { title: "Manage", description: "Your plan 옆 [Manage]를 누르고 아래쪽 [Cancel plan]을 누르세요. 이 화면이 없으면 Billing 페이지 맨 아래 [Cancel subscription]을 누르세요." },
      { title: "확인", description: "맨 아래 [Cancel and lose all benefits] 또는 [Continue to cancel] → 사유 선택 → [Cancel subscription]을 직접 누르세요." },
    ],
    notes: [
      "결제 주기가 끝날 때까지 쓸 수 있고, 그 뒤 Evernote Free로 바뀌어요. 노트는 지워지지 않아요.",
      "Free에서 노트가 50개를 넘으면 새 노트는 만들 수 없어요.",
      "기기가 여러 대 연결돼 있으면 하나만 남기고 연결을 끊어야 해요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  webflow: {
    sources: ["https://help.webflow.com/hc/en-us/articles/33961220410003-Downgrade-or-cancel-your-Workspace-plan"],
    steps: [
      { title: "Workspace 열기", description: "해지할 Webflow Workspace를 여세요." },
      { title: "Plans", description: "[Plans] → [Downgrade to Starter]를 누르세요." },
      { title: "확인", description: "사유를 고르고 [Downgrade Workspace plan]을 직접 눌러 확인하세요." },
    ],
    notes: [
      "유료 플랜을 해지하기 전에 팀원과 좌석을 모두 정리해야 해요.",
      "결제 기간이 끝날 때까지 유료 플랜이 유지되고, 그 뒤 무료 Starter로 바뀌어요.",
      "Webflow 결제는 환불되지 않아요. Site 플랜은 해지 방법이 따로 있어요.",
    ],
  },
  tidal: {
    sources: ["https://support.tidal.com/hc/en-us/articles/201314601-Cancel-Tidal-Subscription-or-Trial"],
    cancelUrl: "https://account.tidal.com",
    steps: [
      { title: "계정 페이지", description: "account.tidal.com에 로그인하세요." },
      { title: "Subscription", description: "[Subscription]으로 가세요. Android 앱은 하트 아이콘 → 톱니바퀴 → [Edit] → [Manage Subscription]이에요." },
      { title: "Cancel Subscription", description: "[Cancel Subscription]을 누르고 해지를 직접 확인하세요." },
    ],
    notes: ["App Store나 Google Play에 활성 구독이 안 보이면 다른 결제 수단이나 다른 계정으로 가입한 경우예요."],
    altRoutes: ["appStore", "googlePlay"],
  },
  nordvpn: {
    sources: ["https://support.nordvpn.com/hc/en-us/articles/19556844985489-How-to-cancel-auto-renewal-for-your-NordVPN-subscription"],
    steps: [
      { title: "Nord Account", description: "Nord Account에 로그인하세요." },
      { title: "Billing", description: "[Billing] 탭을 여세요." },
      { title: "자동 갱신 취소", description: "자동 갱신 옆 [Cancel] → [Cancel auto-renewal]을 직접 누르세요. 상태가 Off로 바뀌고 확인 메일이 와요." },
    ],
    notes: [
      "같은 방법으로 NordPass, NordLocker 등 다른 Nord 구독도 해지할 수 있어요.",
      "Amazon 앱스토어로 결제했다면 Amazon에서 해지하세요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "deepl-pro": {
    sources: ["https://support.deepl.com/hc/en-us/articles/360020723719-Cancel-subscription"],
    steps: [
      { title: "계정 로그인", description: "DeepL 계정에 로그인하세요." },
      { title: "Subscription", description: "[Subscription]에서 해지할 구독을 고르세요." },
      { title: "Cancel subscription", description: "[Cancel subscription]을 직접 누르세요." },
    ],
    notes: [
      "다음 결제일 최소 하루 전에 해지해야 다음 기간 요금이 나가지 않아요.",
      "로그아웃하거나 앱을 지워도 해지되지 않아요.",
      "해지가 끝나고 비활성화되면 90일 뒤 저장한 용어집 등이 삭제돼요.",
    ],
    altRoutes: ["appStore"],
  },
  "1password": {
    sources: ["https://support.1password.com/manage-subscription/"],
    cancelUrl: "https://my.1password.com/billing",
    steps: [
      { title: "로그인", description: "1Password.com에 로그인하세요." },
      { title: "Billing", description: "사이드바의 [Billing]을 여세요. 안 보이면 결제 관리 권한이 없는 경우라 가족 관리자나 팀 소유자에게 요청하세요." },
      { title: "Cancel subscription", description: "아래로 내려 [Cancel subscription]을 누르고 화면 안내를 끝까지 진행하세요." },
    ],
    notes: ["현재 결제 기간이 끝날 때까지 쓸 수 있고, 그 뒤 계정이 잠겨요(frozen). 언제든 다시 구독할 수 있어요."],
    altRoutes: ["appStore", "googlePlay"],
  },
  "ea-play": {
    sources: ["https://help.ea.com/en/articles/ea-account/how-to-cancel-ea-play/"],
    cancelUrl: "https://myaccount.ea.com/cp-ui/subscription/index",
    steps: [
      { title: "EA 계정", description: "EA Play에 가입한 EA 계정으로 EA Account에 로그인하세요." },
      { title: "구독 및 멤버십", description: "[Subscriptions and Memberships] 탭을 여세요." },
      { title: "Cancel membership", description: "Your membership 항목의 [Cancel membership]을 누르고, 새로 열린 화면에서 [Cancel membership]을 한 번 더 직접 누르세요." },
    ],
    notes: [
      "다음 결제일까지 멤버십을 쓸 수 있고, 그 전에 해지를 되돌릴 수 있어요.",
      "기간이 끝나면 The Play List 게임은 못 하지만 저장 데이터는 남아요.",
      "PlayStation·Xbox·Steam·Epic으로 가입했다면 그 플랫폼에서 해지해요. PlayStation은 계정 → [Subscription] → [Turn Off Auto-Renew]예요.",
      "EA Play 멤버십은 원칙적으로 환불되지 않아요.",
    ],
  },
  storytel: {
    sources: ["https://support.storytel.com/hc/ko/articles/360010486719"],
    steps: [
      { title: "계정 페이지", description: "Storytel 홈페이지에서 계정 페이지에 로그인하세요." },
      { title: "관리", description: "구독 항목 옆 [관리] 버튼을 누르세요." },
      { title: "구독 취소", description: "아래로 내려 [구독 취소]를 누르고 취소를 직접 확정하세요. 확인 메일이 와요." },
    ],
    notes: [
      "홈페이지에서 무료 체험 중에 취소하면 체험 기간과 상관없이 바로 끝나요.",
      "LG유플러스(유독) 등 통신사로 가입했다면 그 파트너사에 문의하세요.",
      "결제 내역에 Apple_IAS·Google_IAS가 보이면 각 스토어, Partner가 보이면 파트너사에서 해지해요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "jetbrains-all": {
    sources: ["https://sales.jetbrains.com/hc/en-gb/articles/16269809436690-Cancel-a-personal-subscription"],
    cancelUrl: "https://account.jetbrains.com/licenses",
    steps: [
      { title: "JetBrains Account", description: "JetBrains Account에 로그인하세요." },
      { title: "구독 찾기", description: "해지할 구독을 찾아 [Cancel subscription]을 누르세요." },
      { title: "Confirm", description: "확인 창에서 [Confirm]을 직접 누르세요." },
    ],
    notes: [
      "현재 결제 기간이 끝날 때까지 쓸 수 있고, 해지한다고 자동 환불되지는 않아요.",
      "해지 후 만료되면 최대 40% 연속 구독 할인이 사라져요. 자동 갱신만 끄는 방법도 있어요.",
      "회사(commercial) 구독은 조직 관리자가 해지해요.",
    ],
  },
  vibe: {
    sources: [
      "https://help.naver.com/service/20370/contents/8862",
      "https://help.naver.com/service/20370/contents/12110",
    ],
    steps: [
      { title: "My 멤버십", description: "VIBE 앱은 [보관함] → [설정] → [My 멤버십/구독] → [My 멤버십], 웹은 VIBE → [설정] → [My 멤버십]으로 가세요." },
      { title: "멤버십 해지", description: "[결제(해지) 관리] → [멤버십 결제 관리] → [멤버십 해지]를 누르세요." },
      { title: "해지하기", description: "[해지하기] → 'OOOO년 O월 O일까지 사용하고 해지하기'를 직접 누르세요." },
    ],
    notes: [
      "정기 구독을 해지해도 이번 회차가 끝날 때까지 쓸 수 있어요.",
      "바로 끝내고 환불받으려면 마지막 단계에서 [즉시 종료하고 환불받기]를 고르세요. 환불 결과는 Npay 결제내역에서 확인해요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "naver-mybox": {
    sources: ["https://help.naver.com/service/5594/contents/9110"],
    steps: [
      { title: "내 이용 현황", description: "PC 웹은 왼쪽 아래 용량을 눌러 [내 이용 현황]으로, 모바일 웹은 메뉴(≡) → [MYBOX+ 업그레이드]로 가세요." },
      { title: "결제 관리", description: "[MYBOX+] → [결제 관리]를 누르세요." },
      { title: "정기결제 해지", description: "[정기결제 해지] 또는 [환불]을 직접 누르세요." },
    ],
    notes: [
      "정기결제를 해지해도 이용권은 만료일까지 쓸 수 있어요.",
      "웹 결제는 사용한 날짜만큼 빼고 환불돼요. 30GB 넘게 쓰고 있으면 환불이 안 되니 먼저 정리하세요(휴지통 포함).",
      "만료 후 30GB를 넘으면 올리기·내려받기·공유가 막혀요.",
      "Android 앱 결제는 MYBOX 앱 → 프로필 → 용량 → [내 이용 현황] → [결제 관리]에서도 해지할 수 있어요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "strava-sub": {
    sources: ["https://support.strava.com/en-us/articles/15401936-how-do-i-cancel-my-subscription"],
    cancelUrl: "https://www.strava.com/account",
    steps: [
      { title: "로그인", description: "Strava 웹사이트에 로그인하세요." },
      { title: "설정", description: "오른쪽 위 프로필 사진 → [Settings] → [My Account]로 가세요." },
      { title: "Cancel Subscription", description: "[Cancel Subscription]을 누르고 안내를 끝까지 진행하세요." },
    ],
    notes: [
      "갱신일 최소 24시간 전에 해지해야 자동 갱신되지 않아요.",
      "가입한 곳(웹·Google Play·App Store)에서 해지해야 해요.",
      "웹 결제는 구매 후 14일 안에 고객지원에 요청하면 전액 환불받을 수 있어요.",
      "해지해도 활동 기록은 지워지지 않아요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  crunchyroll: {
    sources: ["https://help.crunchyroll.com/ko/article/how-do-i-cancel-my-membership"],
    cancelUrl: "https://www.crunchyroll.com/account/membership",
    steps: [
      { title: "로그인", description: "웹 브라우저에서 Crunchyroll.com에 로그인하세요." },
      { title: "멤버십 정보", description: "프로필 아이콘 → [설정] → [멤버십 정보]에서 결제처를 확인하세요." },
      { title: "멤버십 취소", description: "Crunchyroll.com에서 직접 결제했다면 이 화면에서 취소를 진행하세요. 다른 곳에서 결제했다면 그곳에서 취소하세요." },
    ],
    notes: [
      "앱을 지우거나 로그아웃하거나 결제 수단을 지워도 구독은 취소되지 않아요.",
      "앱으로 가입하지 않았다면 앱에는 취소 메뉴가 보이지 않아요.",
      "PlayStation·Amazon 등으로 가입했다면 그 서비스에서 해지하세요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  mubi: {
    sources: ["https://help.mubi.com/article/68-how-do-i-cancel-my-subscription-if-i-purchased-it-online-through-the-web"],
    cancelUrl: "https://mubi.com/settings/subscription",
    steps: [
      { title: "로그인", description: "mubi.com에 로그인하세요." },
      { title: "구독 설정", description: "구독 설정(subscription settings)에서 구독을 해지하세요." },
    ],
    notes: ["해지해도 이미 결제한 기간은 그대로 쓸 수 있어요."],
    altRoutes: ["appStore", "googlePlay"],
  },
  wavve: {
    sources: ["https://www.wavve.com/customer/faq?faqId=3872"],
    steps: [
      { title: "MY", description: "PC는 [MY] → [이용 중 이용권] → [이용권내역], 앱은 오른쪽 아래 [MY] → 위쪽 프로필(이름) → [나의 이용권]으로 가세요." },
      { title: "자동결제해지", description: "[자동결제해지]를 누르세요." },
      { title: "확인", description: "안내를 끝까지 진행해 해지를 마치세요." },
    ],
    notes: [
      "결제일 전날까지 해지해야 다음 결제가 막혀요.",
      "중도 해지는 사용 이력만큼 빼고 환불돼요. 구매 후 7일이 지났거나 이미 사용했다면 고객센터(1599-3709)에 문의하세요.",
      "iPhone에서 원화로 샀다면 앱 [MY]에서, 달러로 샀다면 Apple 구독에서 해지해요.",
      "스마트TV에서는 해지할 수 없어요. PC·모바일이나 고객센터를 이용하세요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  framer: {
    sources: ["https://www.framer.com/help/articles/cancel-your-framer-plan/"],
    steps: [
      { title: "워크스페이스 설정", description: "Framer에서 워크스페이스 설정을 여세요." },
      { title: "Plans", description: "[Plans] 탭에서 해지할 사이트 옆 점 세 개 메뉴를 누르세요." },
      { title: "Cancel Plan", description: "[Cancel Plan]을 누르고 의견을 남긴 뒤 해지를 직접 확인하세요." },
    ],
    notes: [
      "현재 결제 주기가 끝날 때까지 플랜 혜택이 유지돼요.",
      "에디터 요금은 워크스페이스의 사이트 플랜을 모두 해지하면 결제 주기 끝에 함께 끝나요.",
      "남은 기간은 환불되지 않아요. [Cancel Plan]이 없으면 그 프로젝트에 활성 구독이 없는 거예요.",
    ],
  },
  primevideo: {
    sources: ["https://www.primevideo.com/-/ko/help?nodeId=GWGDSNXVPJ93UW5V"],
    steps: [
      { title: "계정 및 설정", description: "Prime Video에 로그인하고 [계정 및 설정]으로 가세요." },
      { title: "내 계정", description: "[내 계정] 탭을 여세요." },
      { title: "구독 종료", description: "Prime Video 단독 구독이면 [구독 종료]를, 아마존 프라임 멤버십이면 [아마존에서 수정하기]를 눌러 해지하세요." },
    ],
    notes: [
      "아마존 프라임 멤버십이 끝나면 거기에 연결된 추가 구독도 갱신되지 않아요.",
      "통신사 같은 다른 업체로 구독했다면 그 업체에 문의하세요.",
    ],
  },
  laftel: {
    sources: ["https://help.laftel.net/hc/ko/articles/6011133529231"],
    cancelUrl: "https://laftel.net",
    steps: [
      { title: "라프텔 멤버십", description: "웹은 laftel.net 오른쪽 위 메뉴 → [라프텔 멤버십], 앱은 아래 [MY] → [라프텔 멤버십]으로 가세요." },
      { title: "내 멤버십 관리", description: "웹은 [내 멤버십 관리], 앱은 [결제 예정]을 누르세요." },
      { title: "멤버십 해지", description: "[멤버십 해지하기]를 직접 누르세요." },
    ],
    notes: [
      "해지해도 남은 기간은 모든 프로필에서 볼 수 있고, 다음 결제가 되지 않아요.",
      "앱을 지우거나 로그아웃해도 해지되지 않아요.",
      "이용 기간이 끝나고 3일 뒤 라프텔 등급이 초기화돼요.",
      "고객센터 AI 챗봇의 [멤버십 해지]로도 해지할 수 있어요. LG U+ 제휴 멤버십은 해지 방법이 따로 있어요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  dazn: {
    sources: ["https://www.dazn.com/en-GB/help/articles/16194539395613-how-do-i-cancel-my-subscription"],
    steps: [
      { title: "My Account", description: "DAZN 앱에서 오른쪽 위 프로필 아이콘 → [My Account]로 가세요." },
      { title: "Subscription", description: "[Subscription]을 열고 맨 아래 [Cancel subscription] → [Continue]를 누르세요." },
      { title: "해지 완료", description: "사유를 고르고, 혜택 제안은 [No thanks]로 넘긴 뒤 비밀번호를 입력해 해지를 마치세요." },
    ],
    notes: [
      "선택한 해지일까지 DAZN을 볼 수 있어요.",
      "Monthly Flex 요금제는 30일 해지 기간이 있어 해지 후에도 한 번 더 결제될 수 있어요.",
    ],
  },
  weverse: {
    sources: [
      "https://help.weverse.io/weverse/article?faq-id=000005680",
      "https://help.weverse.io/weverse/article?faq-id=000006704",
    ],
    steps: [
      { title: "커뮤니티 홈", description: "위버스 웹에서 구독 중인 아티스트의 커뮤니티 홈으로 가세요." },
      { title: "디지털 멤버십", description: "[디지털 멤버십 혜택 보기]를 누르세요." },
      { title: "구독 취소", description: "[구독 취소]를 직접 누르세요." },
    ],
    notes: [
      "해지하면 다음 회차부터 갱신되지 않고, 남은 기간은 만료일까지 쓸 수 있어요.",
      "이미 결제된 기간은 부분 취소·환불이 안 돼요. 혜택을 하나라도 썼다면 환불받을 수 없어요.",
      "웹 결제 환불은 젤리로 돌려받아요. 카드 환불을 원하면 문의할 때 함께 요청하세요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  "wow-subscription": {
    sources: ["https://us.support.blizzard.com/en/help/article/124492"],
    steps: [
      { title: "게임 및 구독", description: "Battle.net 계정의 [게임 및 구독(Games & Subscriptions)] 페이지에 로그인하세요." },
      { title: "관리", description: "해지할 WoW 계정 옆 [관리(Manage)]를 누르세요." },
      { title: "구독 취소", description: "[구독 취소(Cancel Subscription)]를 누르세요. 이 버튼이 없으면 구독이 없거나 이미 취소된 상태예요." },
    ],
    notes: [
      "해지해도 남은 게임 시간이 끝날 때까지 플레이할 수 있어요.",
      "해지 대신 구독을 일시정지할 수도 있어요.",
    ],
  },
  podbbang: {
    sources: ["https://www.podbbang.com/helps/faqs"],
    cancelUrl: "https://www.podbbang.com",
    steps: [
      { title: "매거진", description: "PC나 모바일 웹에서 podbbang.com에 접속해 [매거진] 메뉴를 누르세요. 모바일은 [괜찮아요, 웹으로 볼게요]를 고르세요." },
      { title: "정기구독 내역", description: "구독한 매거진 상품 → 오른쪽 위 점 세 개 → [정기구독 내역보기]를 누르세요." },
      { title: "정기 결제 해지", description: "[정기 결제 해지하기]를 직접 누르세요." },
    ],
    notes: ["해지해도 남은 기간은 계속 이용할 수 있고, 다음 결제는 되지 않아요."],
    altRoutes: ["appStore", "googlePlay"],
  },
  longblack: {
    sources: ["https://www.longblack.co/faq"],
    cancelUrl: "https://www.longblack.co/membership",
    steps: [
      { title: "멤버십 페이지", description: "롱블랙에 로그인하고 멤버십 페이지(longblack.co/membership)를 여세요." },
      { title: "멤버십 해지", description: "멤버십 해지를 진행하세요. 같은 페이지에서 해지를 철회할 수도 있어요." },
    ],
    notes: [
      "해지 후 이용 기간이 끝나면 일반회원으로 바뀌고 자동결제가 멈춰요.",
      "멤버십이 끝나면 저장한 노트와 샷추가권은 다시 결제할 때까지 쓸 수 없어요.",
      "당일 결제 건은 콘텐츠를 열람하지 않았다면 [마이페이지 → 멤버십]에서 결제를 취소할 수 있어요.",
    ],
  },
  class101: {
    sources: ["https://help.class101.tv/classmate/class101-subscription-refund-request"],
    steps: [
      { title: "마이페이지", description: "클래스101 웹이나 앱에 로그인하고 오른쪽 위 프로필 → [마이페이지]로 가세요." },
      { title: "구독관리", description: "[클래스101+ 구독관리] → [구독 해지하기]를 누르세요." },
      { title: "해지하기", description: "[해지하기]를 누르고 해지 이유를 고른 뒤 마무리하세요. 환불 대상이면 [환불받기]가 나와요." },
    ],
    notes: [
      "결제 후 7일 안에 콘텐츠를 쓰지 않았다면 전액 환불돼요. 그 뒤에는 쓴 개월 수를 빼고 남은 금액의 90%가 환불돼요.",
      "환불해도 신청일이 포함된 달의 구독 종료일까지는 수강할 수 있어요.",
      "그룹 플랜은 대표 계정만 해지할 수 있고, 구성원을 모두 내보낸 뒤에 가능해요.",
      "외부 상점이나 App Store에서 샀다면 그곳에 환불을 요청하세요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  speak: {
    sources: ["https://help.speak.com/ko/articles/5355569"],
    steps: [
      { title: "설정", description: "스픽 앱에서 [프로필] → [설정]으로 가세요." },
      { title: "멤버십 관리", description: "[멤버십 관리] → [멤버십 취소하기]를 누르세요." },
      { title: "취소 확인", description: "[아쉽지만 취소할게요]를 직접 누르세요." },
    ],
    notes: [
      "위 방법은 스픽 웹사이트에서 결제한 경우예요. 앱에서 결제했다면 App Store나 Google Play에서 해지하세요.",
      "구독을 취소해도 만료일까지 프리미엄을 쓸 수 있고, 자동 환불되지 않아요. 할부도 멈추지 않아요.",
      "Paddle이나 NICE Payments가 아니라 스픽(support@speak.com)에 문의하세요.",
    ],
    altRoutes: ["appStore", "googlePlay"],
  },
  cambly: {
    sources: [
      "https://studentsupport.cambly.com/hc/ko/articles/360000300606",
      "https://studentsupport.cambly.com/hc/ko/articles/360052534872",
    ],
    steps: [
      { title: "계정 설정", description: "Cambly에 로그인하고 계정 설정의 [구독] 섹션으로 가세요." },
      { title: "갱신 끄기", description: "페이지 아래쪽 [취소]를 눌러 구독 갱신을 끄세요." },
      { title: "확인", description: "갱신이 꺼졌는지 확인하세요. 만료 전이면 [켜기]로 되돌릴 수 있어요." },
    ],
    notes: [
      "갱신을 꺼도 플랜이 끝날 때까지 수업을 들을 수 있어요. 만료일 이후 예약된 수업은 취소돼요.",
      "바로 취소하려면 도움말 센터에서 로그인한 채 [요청 제출] → 주제 [계정 관리]로 요청하세요. 남은 수업은 사라져요.",
      "조기 취소하면 할인 없이 정가로 다시 계산돼서 환불이 없을 수 있어요.",
    ],
  },
  fastcampus: {
    sources: ["https://support.fastcampus.co.kr/hc/ko/articles/7577151058457"],
    cancelUrl: "https://support.fastcampus.co.kr/hc/ko/articles/7577151058457",
    steps: [
      { title: "고객센터 문서", description: "패스트캠퍼스 고객센터의 '결제 취소나 환불은 어떻게 하나요?' 문서를 여세요." },
      { title: "문의 등록", description: "문서 아래 [문의 등록]을 누르고 카테고리 [취소/환불]을 고르세요." },
      { title: "정보 입력", description: "가입 정보(이메일·연락처·이름), 강의명, 환불 사유를 적어 제출하세요." },
    ],
    notes: [
      "고객센터 운영시간(평일 10~18시) 밖에 접수해도 제출 날짜 기준으로 환불 규정이 적용돼요.",
      "카드 환불은 처리 후 실제 환불까지 3~7일 걸릴 수 있어요. 내역은 마이페이지 [거래내역]에서 확인해요.",
      "국비지원 과정은 취소 방법이 따로 있어요.",
    ],
  },
  "v0-vercel": {
    sources: ["https://v0.app/docs/account"],
    cancelUrl: "https://v0.app/chat/settings/billing",
    steps: [
      { title: "범위 선택", description: "v0 왼쪽 위 드롭다운에서 해지할 구독이 있는 개인 또는 팀을 고르세요." },
      { title: "Billing", description: "왼쪽 아래 사용자 메뉴 → [Settings] → 사이드바 [Billing]으로 가세요." },
      { title: "Cancel Plan", description: "Current Plan 항목의 [Cancel Plan]을 직접 누르세요." },
    ],
    notes: ["현재 결제 기간이 끝나면 무료 플랜으로 바뀌어요."],
  },
  "the-joongang-plus": {
    sources: ["https://www.joongang.co.kr/atoz/47"],
    steps: [
      { title: "결제 내역", description: "중앙일보에 로그인하고 더중앙플러스 이용권 결제 내역을 여세요." },
      { title: "이용권 해지", description: "이용권 정보 아래, 다음 결제일 오른쪽의 [이용권 해지]를 직접 누르세요." },
    ],
    notes: [
      "해지 버튼이 없으면 그 이용권은 해지할 수 없는 상품이에요.",
      "이용권을 바꾸려면 지금 이용권을 해지한 뒤 새로 구매해야 해요.",
    ],
  },
  welaaa: {
    sources: ["https://www.welaaa.com/support/faq"],
    steps: [
      { title: "멤버십 현황", description: "앱은 [프로필] → [멤버십 현황], 웹은 로그인 → [계정/구매관리]로 가세요." },
      { title: "해지 신청", description: "[해지 신청]을 누르고 안내를 끝까지 진행하세요." },
    ],
    notes: [
      "해지해도 만료일까지 이용할 수 있어요.",
      "무료 기간 중에 해지하면 바로 이용이 끝날 수 있어요.",
      "문의: 윌라 고객센터 02-6206-3240, cs@welaaa.com.",
    ],
    altRoutes: ["appStore"],
  },
  genie: {
    sources: [
      "https://www.genie.co.kr/support/service/helpView?ct=6",
      "https://pay.genie.co.kr/cancel/myProductCancel",
    ],
    cancelUrl: "https://pay.genie.co.kr/cancel/myProductCancel",
    steps: [
      { title: "이용권 메뉴", description: "앱은 [내정보] → [정기 결제 설정], 웹은 로그인 후 [마이뮤직] → [이용권 내역]으로 가세요." },
      { title: "해지 신청", description: "[해지 신청] 또는 [이용권 해지/취소 신청]을 누르세요." },
      { title: "마무리", description: "안내를 끝까지 진행하고 해지 신청이 완료됐는지 확인하세요." },
    ],
    notes: [
      "해지해도 지금 이용권은 만료일까지 쓸 수 있고, 그 뒤 자동결제가 멈춰요.",
      "의무 사용기간이 있는 이용권은 고객센터(1577-5337)에 문의하세요.",
    ],
    altRoutes: ["googlePlay"],
  },
  bugs: {
    sources: ["https://music.bugs.co.kr/m/help/nextbugs?category=11"],
    steps: [
      { title: "이용권 관리", description: "PC는 [내 정보] → [이용권 관리], Android 앱은 오른쪽 위 [이용권] → [MY] → [이용권 관리]로 가세요." },
      { title: "결제 변경/관리", description: "비밀번호를 입력하고 [결제 변경/관리]를 누르세요." },
      { title: "해지예약", description: "[해지예약]을 누르고 사유를 고른 뒤 [자동결제 해지]를 직접 누르세요." },
    ],
    notes: [
      "해지예약을 해도 현재 이용 기간까지 쓸 수 있어요.",
      "iPhone은 모바일 웹(m.bugs.co.kr)의 [이용권 구매] → [MY] → [자동결제 이용권]에서 해지예약해요.",
      "환불이나 즉시 해지가 필요하면 고객센터(1566-4882)에 문의하세요.",
    ],
    altRoutes: ["appStore"],
  },
  "bubble-sm": storeBilledGuide("DearU bubble"),
  fromm: storeBilledGuide("fromm"),
  malhaeboca: storeBilledGuide("말해보카"),
  "burnfit-pro": storeBilledGuide("번핏"),
};

// 공식 자료로 단계를 확인하지 못한 서비스의 공식 안내 링크.
const HELP_LINKS = {
  // 2026-10-01에 직접 열어 확인한 공식 해지 도움말 또는 공식 고객센터.
  "kurly-pass": "https://www.kurly.com/board/faq",
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
    checkedAt: CHECKED_AT,
    cancelUrl: guide.cancelUrl || cancelUrl || "",
    helpUrl: sources[0],
    helpLabel: "공식 도움말",
  };
}

export const verifiedCancelGuideIds = Object.keys(GUIDES);
