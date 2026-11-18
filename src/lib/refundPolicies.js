// 공식 출처 원문으로 확인한 정책만 넣는다. 없으면 "확인 필요"로 답한다.
// verifiedAt은 원문을 마지막으로 확인한 날이다. 정책이 바뀌면 출처를 다시 확인하고 날짜를 고친다.
// checkPhrases는 sourceUrl 원문에 그대로 있는 문구다. 크롤러(npm run crawl:refunds)가 문구가 사라졌는지 주기적으로 확인한다.
// Apple이 청구하는 구독(iCloud+, Apple Music 등)은 Apple 환불 절차를 따른다.
const APPLE_REFUND_POLICY = {
  summary: "Apple이 청구한 구독은 reportaproblem.apple.com에서 '문제 선택' → '환불 요청'으로 신청해요. 환불 가능 여부는 국가·지역에 따라 다르고, 청구가 보류 중이면 영수증을 받은 뒤에 요청할 수 있어요.",
  sourceUrl: "https://support.apple.com/ko-kr/118223",
  sourceLabel: "Apple 환불 요청 안내",
  verifiedAt: "2026-10-02",
  checkPhrases: ["'문제 선택'을 탭하거나 클릭한 후 '환불 요청'을 선택합니다", "환불 적합성은 국가 또는 지역에 따라 다를 수 있습니다"],
};

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
  ytmusic: {
    summary: "활성 멤버십이 있으면 로그인해 YouTube에 환불을 요청해요. 마지막 결제 후 14일이 지났다면 YouTube 지원팀에 문의해요.",
    sourceUrl: "https://support.google.com/youtube/answer/12014038?hl=ko",
    sourceLabel: "YouTube 고객센터 환불 안내",
    verifiedAt: "2026-10-02",
    checkPhrases: ["YouTube Music Premium 환불받기", "마지막 결제 주기 후 14일이 지났다면 지원팀에 문의하여 환불을 요청하세요"],
  },
  adobe: {
    summary: "모든 플랜은 처음 구매하고 14일 안에 취소하면 전액 환불돼요. 14일이 지나면 플랜마다 달라요. 연간 플랜(매월 결제)은 할인받은 금액과 약정 금액의 10%를 내야 하고, 연간 선불은 같은 금액을 빼고 남은 기간을 환불해요. 약정 없는 월별 플랜은 환불되지 않고 그달 결제 기간까지 쓸 수 있어요.",
    sourceUrl: "https://helpx.adobe.com/kr/account/individual/terms-policies-and-regulations/adobe-subscription-terms.html",
    sourceLabel: "Adobe 구독 약관 및 환불 정책",
    verifiedAt: "2026-10-02",
    checkPhrases: [
      "모든 플랜은 최초 구매 후 14일 이내에 취소하면 전액 환불을 받습니다",
      "연간 약정 금액의 10%를 더한 금액",
      "14일 이후에는 환불이 불가하며 서비스는 해당 월의 결제 기간이 종료되는 시점까지 지속됩니다",
    ],
  },
  ms365: {
    summary: "Microsoft에서 직접 샀다면 처음 구매 후 30일 안(첫 정기 결제일 전)에 취소하면 환불받을 수 있어요. 정기 결제 후 30일 안에 취소하면 가장 최근 결제 금액을 환불받는데, 제품마다 계정당 한 번만 돼요. 환불 여부는 취소 과정에서 정해지고, 환불되지 않으면 결제 기간 끝까지 쓸 수 있어요. Google Play·App Store 결제는 그 스토어에 요청해요.",
    sourceUrl: "https://support.microsoft.com/ko-kr/accounts-billing/subscriptions/microsoft-subscription-refund-policy",
    sourceLabel: "Microsoft 구독 환불 정책",
    verifiedAt: "2026-10-02",
    checkPhrases: [
      "첫 번째 되풀이 청구 날짜(둘 중 더 빠른 날짜) 이전에",
      "이 환불 권한은 구독 제품별로 Microsoft 계정당 한 번으로 제한됩니다",
      "취소 프로세스 중에 자격이 자동으로 결정됩니다",
    ],
  },
  canva: {
    summary: "대부분 환불되지 않지만 Canva가 요청을 하나씩 검토해요. 해지해도 현재 결제 기간이 끝날 때까지 프리미엄 기능을 쓸 수 있어요. App Store로 구독했다면 Apple에 요청해요.",
    sourceUrl: "https://www.canva.com/ko_kr/help/subscription-refunds/",
    sourceLabel: "Canva 구독 환불",
    verifiedAt: "2026-10-19",
    checkPhrases: ["다만 모든 환불 요청을 검토하며", "Apple에 직접 환불을 요청해야 합니다", "현재 청구 기간이 끝날 때까지 프리미엄 기능을 계속 이용할 수 있습니다"],
  },
  "ps-plus": {
    summary: "처음 구매하거나 갱신한 날부터 14일 안에 취소하면 전액 환불돼요. 14일이 지나면 쓰지 않은 기간만큼 일할 계산해 환불해요. 자동 갱신만 해지하면 만료일까지 쓸 수 있어요. PS Store 밖에서 산 이용권은 그 구매처에 문의해요.",
    sourceUrl: "https://www.playstation.com/ko-kr/legal/playstation-store-cancellation-policy/",
    sourceLabel: "PlayStation Store 환불 규정",
    verifiedAt: "2026-10-02",
    checkPhrases: [
      "최초 구매일 또는 갱신일로부터 14일 이내 구매 취소 요청의 경우, 결제 금액 전체 환불이 가능합니다",
      "미사용 기간에 해당하는 금액이 일할 계산되어",
      "자동 갱신을 해지하더라도 만료일까지 멤버십이 유지됩니다",
    ],
  },
  ...Object.fromEntries(["icloud", "applemusic", "appletv", "apple-arcade"].map((id) => [id, APPLE_REFUND_POLICY])),
  "claude-pro": {
    summary: "약관에 정한 경우나 법이 요구하는 경우가 아니면 결제 금액은 환불되지 않아요. 웹 결제는 Claude 고객지원 메신저의 'Claude Refund Request'로 자격을 확인해요. iOS 앱에서 결제했다면 Apple만 환불할 수 있어 reportaproblem.apple.com에 요청해요.",
    sourceUrl: "https://support.claude.com/en/articles/12386328-request-a-refund-for-a-paid-claude-plan",
    sourceLabel: "Claude 환불 안내",
    verifiedAt: "2026-10-02",
    checkPhrases: ["all payments are non-refundable", "Claude Refund Request", "only Apple can review and issue a refund"],
  },
  notion: {
    summary: "보통 월간 결제는 청구서 발행일부터 3일 안, 연간 결제는 30일 안에 문의하면 환불해 줘요. 워크스페이스 소유자나 청구 이메일로 요청해요. App Store 결제는 Apple에 요청해요.",
    sourceUrl: "https://www.notion.com/ko/help/refunds",
    sourceLabel: "Notion 환불 요청 안내",
    verifiedAt: "2026-10-02",
    checkPhrases: [
      "월별 청구의 경우 청구서 발행일로부터 3일 이내, 연간 청구의 경우 청구서 발행일로부터 30일 이내",
      "Apple 앱 스토어를 통해 구독을 구매한 경우, Apple에 직접 문의하여 환불을 요청하셔야 합니다",
    ],
  },
  duolingo: {
    summary: "법이 요구하는 경우가 아니면 결제 금액과 부분적으로 쓴 기간은 환불되지 않아요. 해지해도 현재 결제 기간이 끝날 때까지 쓸 수 있어요. Apple·Google 앱 스토어 결제는 그 회사가 환불을 처리해요.",
    sourceUrl: "https://www.duolingo.com/terms",
    sourceLabel: "Duolingo 서비스 약관(환불 정책)",
    verifiedAt: "2026-10-02",
    checkPhrases: [
      "모든 결제는 환불되지 않으며",
      "현재 청구 기간이 종료될 때까지 서비스에 계속 접근할 수 있습니다",
      "결제 및 환불은 각각 Apple 또는 Google이 처리하며",
    ],
  },
  melon: {
    summary: "무제한 다운로드가 없는 유료 이용권은 중도해지하면 실제 이용 금액을 빼고 환불해요. 무제한 다운로드가 포함된 이용권은 중도해지되지 않고, 무료 이벤트 이용권은 환불되지 않아요. 가입 후 7일 안에 사용 이력이 없으면 결제가 취소돼요.",
    sourceUrl: "https://help.melon.com/web/faq/content.htm?faqId=2216",
    sourceLabel: "멜론 고객센터 중도해지 환불 안내",
    verifiedAt: "2026-10-02",
    checkPhrases: [
      "환불 금액 = 이용권의 구매 가격 - 고객님의 실제 서비스 이용 금액",
      "이용권 가입 후 7일 이내에 사용이력이 없는 경우 결제 취소처리 됩니다",
    ],
  },
  naverplus: {
    summary: "디지털 콘텐츠를 쓰지 않았다면 '멤버십 즉시 종료'로 환불받아요. 이용 시작 다음 날부터 7일 안이면 100%, 그 뒤면 90%를 돌려받아요. 디지털 콘텐츠를 썼다면 정기결제 해지만 할 수 있고, 이용 기간이 끝난 회차는 환불되지 않아요.",
    sourceUrl: "https://help.naver.com/service/23168/contents/13774?osType=COMMONOS",
    sourceLabel: "네이버플러스 멤버십 해지 및 환불 안내",
    verifiedAt: "2026-10-02",
    checkPhrases: [
      "네이버플러스 멤버십 청약철회 기한은 이용 시작 다음 날부터 7일 이내입니다",
      "청약철회 기간 이후에 즉시 종료할 경우: 90% 환불",
      "디지털 콘텐츠를 사용했다면 멤버십 즉시 종료 버튼은 노출되지 않고 정기결제 해지만 가능합니다",
    ],
  },
  disney: {
    summary: "멤버십을 취소하면 구독 기간이 끝날 때까지 볼 수 있어요. 첫 결제일부터 7일 안이고 시청하지 않았다면 전액 환불돼요. 그 밖에 즉시 취소하고 남은 기간을 환불받으려면 고객서비스팀에 채팅이나 전화로 요청해요. 앱스토어 등 제3자로 결제했다면 그 회사 정책을 따라요.",
    sourceUrl: "https://www.disneyplus.com/ko-kr/legal/",
    sourceLabel: "디즈니+ 이용약관(취소 및 환불 정책)",
    verifiedAt: "2026-10-02",
    checkPhrases: [
      "고객서비스팀으로 온라인 채팅 또는 전화 문의를 통해 이를 요청하시기 바랍니다",
      "해당 구독 기간에 대해 지불한 결제액 전액을 환불받게 됩니다",
      "해당 제3자의 취소 및 환불 정책이 적용되며",
    ],
  },
  millie: {
    summary: "'해지예약'은 다음 결제만 멈추고 남은 기간은 그대로 쓸 수 있어요. '즉시해지'는 이용한 기간 금액을 빼고, 남은 금액의 10%를 위약금으로 더 빼고 환불해요. 콘텐츠를 다운로드하거나 열어보지 않았다면 '구독취소'로 결제일부터 7일 안에는 100%, 그 뒤에는 90%를 돌려받아요.",
    sourceUrl: "https://corp.millie.co.kr/policy/terms/",
    sourceLabel: "밀리의 서재 이용약관",
    verifiedAt: "2026-10-02",
    checkPhrases: [
      "그 잔여금액에서 위약금(잔여금액의 10%)을 추가공제하여 환불합니다",
      "결제일로부터 7일 전에는 100%, 결제일로부터 7일이 지난 경우에는 90%에 해당하는 금액을 환불받을 수 있습니다",
    ],
  },
  laftel: {
    summary: "웹에서 결제했다면 콘텐츠 재생·다운로드 이력이 없고 결제일부터 7일 안일 때 AI 챗봇으로 직접 환불할 수 있어요. App Store는 Apple, Google Play는 Google Play, LG U+ IPTV는 LG U+ 고객센터(101)에 요청해요.",
    sourceUrl: "https://help.laftel.net/hc/ko/articles/6011122387343",
    sourceLabel: "라프텔 멤버십 환불 안내",
    verifiedAt: "2026-10-02",
    checkPhrases: ["콘텐츠 재생 이력 없음", "결제일 기준 7일 이내", "App Store 인앱 결제: Apple에 환불을 요청해 주세요"],
  },
  tving: {
    summary: "해지해도 이미 결제한 기간이 끝날 때까지 볼 수 있어요. 계약 후 7일 안에 적법하게 청약철회하면 전액 환불돼요. 이용 중 해지해 환불받으면 결제 금액에서 정상가 기준 이용 일수만큼 빼고, 환불 금액의 10%를 수수료로 뺄 수 있어요. 앱마켓·통신사·제휴사 결제는 그 회사 정책을 따를 수 있어요.",
    sourceUrl: "https://www.tving.com/policy/pay-terms",
    sourceLabel: "TVING 유료서비스 이용약관",
    verifiedAt: "2026-10-02",
    checkPhrases: [
      "이미 결제된 이용기간 만료일까지 유료서비스를 이용할 수 있고",
      "실제 결제금액에서 기 이용금액을 공제하여 산정합니다",
      "환불대상금액의 10%를 환불수수료로 공제한 후 환불할 수 있으며",
    ],
  },
  genie: {
    summary: "계약 내용을 받은 날부터 7일 안에는 청약철회를 할 수 있어요(약관이 정한 제한 사유가 있으면 제한돼요). 청약철회나 해지가 받아들여지면 3영업일 안에 결제한 방법으로 환불해요.",
    sourceUrl: "https://rele.genie.co.kr/guide/serviceAgreement",
    sourceLabel: "지니 이용약관",
    verifiedAt: "2026-10-02",
    checkPhrases: ["7일 이내에는 청약의 철회를 할 수 있습니다", "3영업일 이내에 대금의 결제와 동일한 방법으로 이를 환불하여야 하며"],
  },
  flo: {
    summary: "이용권을 산 뒤에는 원칙적으로 청약철회가 안 돼요. 다만 음악 콘텐츠를 전혀 쓰지 않았다면 결제일부터 7일 안에 1:1 이메일 문의로 철회를 신청할 수 있어요. 자동결제는 결제 예정일 전에 마이페이지 > 계정관리 > 이용권 현황에서 해지해요.",
    sourceUrl: "https://www.music-flo.com/docs/terms/150201",
    sourceLabel: "FLO 이용약관",
    verifiedAt: "2026-10-02",
    checkPhrases: [
      "음악 채널 콘텐츠를 전혀 사용하지 아니하였을 경우에 한하여 결제일로부터 7일 이내에",
      "청약 철회 신청은 1:1 이메일 문의를 통해 할 수 있으며",
    ],
  },
  "nyt-digital": {
    summary: "약관에 따로 정한 경우가 아니면 요금은 환불되지 않아요. Google Play·iOS 등 제3자를 통해 구독했다면 그 회사가 관리하니 그쪽에 문의해요.",
    sourceUrl: "https://help.nytimes.com/115014893968-terms-of-sale",
    sourceLabel: "The New York Times Terms of Sale",
    verifiedAt: "2026-10-02",
    checkPhrases: ["Unless expressly specified otherwise in these Terms of Sale, all charges are nonrefundable", "are managed directly by the applicable third party"],
  },
  midjourney: {
    summary: "계정 전체 GPU 사용 시간이 20분 미만일 때만 환불받을 수 있어요. 자격이 되면 구독을 취소할 때 환불 선택지가 자동으로 보이고, 보이지 않으면 환불되지 않아요. 처리에는 최대 영업일 10일이 걸릴 수 있어요.",
    sourceUrl: "https://docs.midjourney.com/hc/en-us/articles/25386088618253-Requesting-a-Refund",
    sourceLabel: "Midjourney Requesting a Refund",
    verifiedAt: "2026-10-02",
    checkPhrases: ["used less than 20 GPU minutes throughout the lifetime of your account", "If you don't see the refund option, we're unable to provide a refund"],
  },
  figma: {
    summary: "Figma 구독 결제는 환불되지 않아요. Professional 플랜을 취소하면 현재 결제 기간이 끝날 때까지 기능을 쓰고, 그 뒤 무료 Starter로 바뀌어요.",
    sourceUrl: "https://help.figma.com/hc/en-us/articles/360046216313-Upgrade-or-downgrade-your-plan",
    sourceLabel: "Figma 플랜 변경·취소 안내",
    verifiedAt: "2026-10-19",
    checkPhrases: ["Payments for Figma subscriptions are non-refundable", "At the end of your billing period, Figma will downgrade your team to the free Starter plan"],
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
