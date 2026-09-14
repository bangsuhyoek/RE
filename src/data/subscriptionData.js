const dayAfterToday = () => {
  const now = new Date();
  const lastDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.min(now.getDate() + 1, lastDate);
};

export const serviceCatalog = [
  {
    "id": "netflix",
    "name": "Netflix",
    "monogram": "N",
    "category": "OTT",
    "plan": "프리미엄",
    "amount": 17000,
    "brandColor": "#E50914",
    "brandBg": "#FEE8E8",
    "brandText": "#E50914",
    "availablePlans": [
      {
        "plan": "기본 플랜",
        "amount": 7000
      },
      {
        "plan": "스탠다드",
        "amount": 13500
      },
      {
        "plan": "프리미엄",
        "amount": 17000
      }
    ],
    "plans": [
      {
        "name": "기본 플랜",
        "amount": 7000,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "스탠다드",
        "amount": 13500,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "프리미엄",
        "amount": 17000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "cancelUrl": "https://www.netflix.com/cancelplan",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Netflix 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-14T07:07:35.056Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "youtube",
    "name": "YouTube Premium",
    "monogram": "Y",
    "category": "OTT",
    "plan": "개인 멤버십",
    "amount": 14900,
    "brandColor": "#FF0000",
    "brandBg": "#FFEBEB",
    "brandText": "#FF0000",
    "availablePlans": [
      {
        "plan": "개인 멤버십",
        "amount": 14900
      },
      {
        "plan": "가족 멤버십",
        "amount": 19900
      }
    ],
    "plans": [
      {
        "name": "개인 멤버십",
        "amount": 14900,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "가족 멤버십",
        "amount": 19900,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "cancelUrl": "https://www.youtube.com/paid_memberships",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "YouTube Premium 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-14T07:07:35.446Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "coupang",
    "name": "쿠팡 와우",
    "monogram": "C",
    "category": "쇼핑",
    "plan": "와우 멤버십",
    "amount": 7890,
    "brandColor": "#0073E6",
    "brandBg": "#EBF4FF",
    "brandText": "#0073E6",
    "availablePlans": [
      {
        "plan": "와우 멤버십",
        "amount": 7890
      }
    ],
    "plans": [
      {
        "name": "와우 멤버십",
        "amount": 7890,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "cancelUrl": "https://www.coupang.com/np/membership/benefit",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "쿠팡 와우 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-14T07:07:35.578Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "spotify",
    "name": "Spotify",
    "monogram": "S",
    "category": "음악",
    "plan": "개인",
    "amount": 10900,
    "brandColor": "#1DB954",
    "brandBg": "#E8F8EE",
    "brandText": "#1DB954",
    "availablePlans": [
      {
        "plan": "개인",
        "amount": 10900
      },
      {
        "plan": "듀오",
        "amount": 16350
      }
    ],
    "plans": [
      {
        "name": "개인",
        "amount": 10900,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "듀오",
        "amount": 16350,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "cancelUrl": "https://www.spotify.com/kr-ko/account/overview/",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Spotify 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-14T07:07:35.834Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "disney",
    "name": "Disney+",
    "monogram": "D",
    "category": "OTT",
    "plan": "스탠다드",
    "amount": 9900,
    "brandColor": "#0063E5",
    "brandBg": "#E8F1FD",
    "brandText": "#0063E5",
    "availablePlans": [
      {
        "plan": "기본 플랜",
        "amount": 15000
      },
      {
        "plan": "스탠다드",
        "amount": 18000
      },
      {
        "plan": "프리미엄",
        "amount": 21500
      }
    ],
    "plans": [
      {
        "name": "기본 플랜",
        "amount": 15000,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "스탠다드",
        "amount": 18000,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "프리미엄",
        "amount": 21500,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "cancelUrl": "https://www.disneyplus.com/ko-kr/account",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Disney+ 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-14T07:07:35.998Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "tving",
    "name": "TVING",
    "monogram": "T",
    "category": "OTT",
    "plan": "광고형 스탠다드",
    "amount": 5500,
    "brandColor": "#FF153C",
    "brandBg": "#FFEBEF",
    "brandText": "#FF153C",
    "availablePlans": [
      {
        "plan": "광고형 스탠다드",
        "amount": 5500
      },
      {
        "plan": "스탠다드",
        "amount": 13500
      },
      {
        "plan": "프리미엄",
        "amount": 17000
      }
    ],
    "plans": [
      {
        "name": "광고형 스탠다드",
        "amount": 5500,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "스탠다드",
        "amount": 13500,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "프리미엄",
        "amount": 17000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "cancelUrl": "https://www.tving.com/my/pass",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "TVING 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-14T07:07:36.283Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "chatgpt",
    "name": "ChatGPT Plus",
    "monogram": "G",
    "category": "소프트웨어",
    "plan": "ChatGPT Plus",
    "amount": 29000,
    "brandColor": "#10A37F",
    "brandBg": "#E6F6F2",
    "brandText": "#10A37F",
    "availablePlans": [
      {
        "plan": "ChatGPT Plus",
        "amount": 29000
      }
    ],
    "plans": [
      {
        "name": "ChatGPT Plus",
        "amount": 29000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "cancelUrl": "https://chatgpt.com/#settings/Subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "ChatGPT Plus 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-14T07:07:36.816Z",
    "parseStatus": "PARSED_SUCCESS"
  }
];

export const createMockSubscriptions = () =>
  (() => {
    const getOffsetDueDay = (offset) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return d.getDate();
    };

    const seeds = [
      {
        id: "netflix",
        name: "Netflix",
        monogram: "N",
        category: "엔터테인먼트",
        plan: "Standard 4K",
        amount: 17000,
        dueDay: getOffsetDueDay(0),
        paymentMethod: "신한카드 ****4521",
        cancelUrl: "https://www.netflix.com/cancelplan",
      },
      {
        id: "spotify",
        name: "Spotify",
        monogram: "S",
        category: "음악",
        plan: "Individual",
        amount: 10900,
        dueDay: getOffsetDueDay(1),
        paymentMethod: "신한카드 ****4521",
        cancelUrl: "https://www.spotify.com/account/cancel/",
      },
      {
        id: "chatgpt",
        name: "ChatGPT Plus",
        monogram: "G",
        category: "생산성",
        plan: "Plus",
        amount: 27000,
        dueDay: getOffsetDueDay(3),
        paymentMethod: "현대카드 ****8821",
        cancelUrl: "https://chatgpt.com/#settings",
      },
      {
        id: "adobe",
        name: "Adobe CC",
        monogram: "A",
        category: "생산성",
        plan: "Photography",
        amount: 14000,
        dueDay: getOffsetDueDay(12),
        paymentMethod: "신한카드 ****4521",
        cancelUrl: "https://account.adobe.com/plans",
      },
      {
        id: "icloud",
        name: "iCloud+",
        monogram: "i",
        category: "클라우드",
        plan: "200GB",
        amount: 1200,
        dueDay: getOffsetDueDay(18),
        paymentMethod: "카카오페이",
        cancelUrl: "https://support.apple.com/HT207594",
      },
    ];

    return seeds.map((service, index) => ({
      ...service,
      subscriptionId: `seed-${service.id}`,
      createdAt: new Date(Date.now() - index * 86_400_000).toISOString(),
      billingCycle: "매월",
      status: "active",
      alertD3: true,
      alertD1: true,
      renewalPending: false,
    }));
  })();

export const promotionCatalog = [
  {
    id: "lgu-nerget",
    category: "통신사/결합",
    kind: "LG U+ 너겟 요금제",
    title: "통신비 줄이고, OTT는 무료로!",
    subtitle: "너겟 5G 요금제 가입 시 티빙 & 디즈니+ 무료 이용 혜택",
    description: "약정 없는 무약정 너겟 요금제로 매월 통신비는 절약하고 보고 싶은 OTT는 공짜로 즐기세요.",
    saving: 23400,
    originalPrice: 23400,
    offerPrice: 0,
    dday: 5,
    sourceServiceIds: ["tving", "disney", "netflix"],
    link: "https://nerget.lguplus.com/",
    monogram: "U+",
  },
  {
    id: "youtube-promo",
    category: "경쟁사 프로모",
    kind: "경쟁사 프로모",
    title: "YouTube Premium",
    subtitle: "첫 3개월 ₩100",
    description: "첫 3개월간 월 100원으로 광고 없는 유튜브를 즐겨보세요.",
    saving: 14800,
    originalPrice: 14900,
    offerPrice: 100,
    dday: 3,
    sourceServiceIds: ["netflix", "spotify", "tving"],
    link: "https://www.youtube.com/premium",
    monogram: "Y",
  },
  {
    id: "spotify-annual",
    category: "연간 전환 팁",
    kind: "연간 전환 팁",
    title: "Spotify",
    subtitle: "연간 결제 시 2개월 무료",
    description: "연간 멤버십으로 전환하면 2개월 무료 혜택을 받을 수 있어요.",
    saving: 21800,
    originalPrice: 130800,
    offerPrice: 109000,
    dday: 7,
    sourceServiceIds: ["spotify", "youtube"],
    link: "https://www.spotify.com/kr-ko/premium/",
    monogram: "S",
  },
  {
    id: "watcha-switch",
    category: "100원/무료",
    kind: "환승 특가",
    title: "왓챠 첫 달 100원",
    description: "넷플릭스 대신 이번 달, 취향에 맞는 콘텐츠를 더 가볍게 시작해요.",
    saving: 16900,
    originalPrice: 17000,
    offerPrice: 100,
    dday: 3,
    sourceServiceIds: ["netflix", "disney", "tving"],
    link: "https://watcha.com/",
    monogram: "W",
  },
 {
   id: "tving-naver",
   category: "OTT",
   kind: "무료 전환",
   title: "티빙 네이버플러스 무료 연동",
   description: "네이버플러스 멤버십을 이미 쓴다면 추가 비용 없이 티빙 방송을 시청하세요.",
   saving: 13500,
   originalPrice: 13500,
   offerPrice: 0,
   dday: 3,
   sourceServiceIds: ["netflix", "disney", "tving"],
    link: "https://nid.naver.com/membership/partner",
   monogram: "T",
 },
  {
    id: "disney-annual",
    category: "학생/연간",
    kind: "연간 할인",
    title: "Disney+ 연간 결제 16% 할인",
    description: "월 결제보다 연간 결제로 바꾸면 1년 동안 더 아낄 수 있어요.",
    saving: 19800,
    originalPrice: 118800,
    offerPrice: 99000,
    dday: 12,
    sourceServiceIds: ["netflix", "youtube", "tving"],
    link: "https://www.disneyplus.com/ko-kr/",
    monogram: "D",
  },
  {
    id: "youtube-bundle",
    category: "통신사/결합",
    kind: "결합 혜택",
    title: "유튜브 프리미엄 통신사 결합",
    description: "우주패스와 함께 쓰면 월 구독료를 낮출 수 있어요.",
    saving: 4900,
    originalPrice: 14900,
    offerPrice: 10000,
    dday: 7,
    sourceServiceIds: ["youtube"],
    link: "https://www.youtube.com/premium",
    monogram: "Y",
  },
  {
    id: "flo-trial",
    category: "100원/무료",
    kind: "무료 체험",
    title: "FLO 1개월 무료 체험",
    description: "스포티파이 체험 종료 전에 새로운 플레이리스트를 비교해 보세요.",
    saving: 10900,
    originalPrice: 10900,
    offerPrice: 0,
    dday: 5,
    sourceServiceIds: ["spotify"],
    link: "https://www.music-flo.com/",
    monogram: "F",
  },
  {
    id: "millie-student",
    category: "학생/연간",
    kind: "학생 제휴",
    title: "밀리의 서재 첫 달 무료 + 학생 20%",
    description: "대학생 인증 시 첫 달 무료 이후에도 매월 7,900원에 이용할 수 있어요.",
    saving: 9900,
    originalPrice: 9900,
    offerPrice: 0,
    dday: 10,
    sourceServiceIds: ["chatgpt", "millie", "netflix"],
    link: "https://www.millie.co.kr/",
    monogram: "M",
  },
  {
    id: "adobe-student",
    category: "학생/연간",
    kind: "대학생 60% 할인",
    title: "Adobe CC 모든 앱 학생 60% 할인",
    description: "포토샵, 프리미어 등 20개 이상의 크리에이티브 앱을 반값 이하로 이용하세요.",
    saving: 39600,
    originalPrice: 66000,
    offerPrice: 26400,
    dday: 15,
    sourceServiceIds: ["adobe", "chatgpt"],
    link: "https://www.adobe.com/kr/creativecloud/buy/students.html",
    monogram: "A",
  },
];

export const POPULAR_PRESETS = [
  { id: "netflix", name: "Netflix", category: "OTT", plan: "스탠다드", amount: 13500, monogram: "N" },
  { id: "youtube", name: "YouTube Premium", category: "OTT", plan: "개인", amount: 14900, monogram: "Y" },
  { id: "coupang", name: "쿠팡 와우", category: "쇼핑", plan: "와우 멤버십", amount: 7890, monogram: "C" },
  { id: "tving", name: "티빙", category: "OTT", plan: "베이직", amount: 9500, monogram: "T" },
  { id: "disney", name: "Disney+", category: "OTT", plan: "스탠다드", amount: 9900, monogram: "D" },
  { id: "naver", name: "네이버플러스 멤버십", category: "쇼핑", plan: "월간", amount: 4900, monogram: "NP" },
  { id: "millie", name: "밀리의 서재", category: "도서", plan: "전자책 정기구독", amount: 9900, monogram: "M" },
  { id: "spotify", name: "Spotify", category: "음악", plan: "개인", amount: 10900, monogram: "S" },
];
