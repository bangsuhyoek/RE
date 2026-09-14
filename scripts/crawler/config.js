/**
 * 크롤링 대상 구독 서비스 설정 (Target Services Config)
 */

export const CRAWLER_CONFIG = {
  timeoutMs: 10000,
  maxRetries: 3,
  targets: [
    {
      id: "netflix",
      name: "Netflix",
      monogram: "N",
      category: "OTT",
      url: "https://www.netflix.com/kr/",
      brandColor: "#E50914",
      brandBg: "#FEE8E8",
      brandText: "#E50914",
      cancelUrl: "https://www.netflix.com/cancelplan",
      selectors: {
        container: ".plan-card",
        title: ".plan-title",
        price: ".plan-price",
      },
      fallbackData: {
        plan: "프리미엄",
        amount: 17000,
        availablePlans: [
          { plan: "광고형 스탠다드", amount: 5500 },
          { plan: "스탠다드", amount: 13500 },
          { plan: "프리미엄", amount: 17000 },
        ],
      },
    },
    {
      id: "youtube",
      name: "YouTube Premium",
      monogram: "Y",
      category: "OTT",
      url: "https://www.youtube.com/premium",
      brandColor: "#FF0000",
      brandBg: "#FFEBEB",
      brandText: "#FF0000",
      cancelUrl: "https://www.youtube.com/paid_memberships",
      selectors: {
        container: ".yt-premium-plan",
        title: ".yt-plan-title",
        price: ".yt-plan-price",
      },
      fallbackData: {
        plan: "개인 멤버십",
        amount: 14900,
        availablePlans: [
          { plan: "개인 멤버십", amount: 14900 },
          { plan: "가족 멤버십", amount: 19900 },
        ],
      },
    },
    {
      id: "coupang",
      name: "쿠팡 와우",
      monogram: "C",
      category: "쇼핑",
      url: "https://www.coupang.com/np/membership/benefit",
      brandColor: "#0073E6",
      brandBg: "#EBF4FF",
      brandText: "#0073E6",
      cancelUrl: "https://www.coupang.com/np/membership/benefit",
      selectors: {
        container: ".wow-membership-info",
        title: ".wow-title",
        price: ".wow-price",
      },
      fallbackData: {
        plan: "와우 멤버십",
        amount: 7890,
        availablePlans: [
          { plan: "와우 멤버십", amount: 7890 },
        ],
      },
    },
    {
      id: "spotify",
      name: "Spotify",
      monogram: "S",
      category: "음악",
      url: "https://www.spotify.com/kr-ko/premium/",
      brandColor: "#1DB954",
      brandBg: "#E8F8EE",
      brandText: "#1DB954",
      cancelUrl: "https://www.spotify.com/kr-ko/account/overview/",
      selectors: {
        container: ".spotify-plan-card",
        title: ".spotify-plan-name",
        price: ".spotify-plan-price",
      },
      fallbackData: {
        plan: "개인",
        amount: 10900,
        availablePlans: [
          { plan: "개인", amount: 10900 },
          { plan: "듀오", amount: 16350 },
        ],
      },
    },
    {
      id: "disney",
      name: "Disney+",
      monogram: "D",
      category: "OTT",
      url: "https://www.disneyplus.com/ko-kr",
      brandColor: "#0063E5",
      brandBg: "#E8F1FD",
      brandText: "#0063E5",
      cancelUrl: "https://www.disneyplus.com/ko-kr/account",
      selectors: {
        container: ".disney-plan",
        title: ".disney-title",
        price: ".disney-price",
      },
      fallbackData: {
        plan: "스탠다드",
        amount: 9900,
        availablePlans: [
          { plan: "스탠다드", amount: 9900 },
          { plan: "프리미엄", amount: 13900 },
        ],
      },
    },
    {
      id: "tving",
      name: "TVING",
      monogram: "T",
      category: "OTT",
      url: "https://www.tving.com/",
      brandColor: "#FF153C",
      brandBg: "#FFEBEF",
      brandText: "#FF153C",
      cancelUrl: "https://www.tving.com/my/pass",
      selectors: {
        container: ".tving-pass-item",
        title: ".tving-title",
        price: ".tving-price",
      },
      fallbackData: {
        plan: "광고형 스탠다드",
        amount: 5500,
        availablePlans: [
          { plan: "광고형 스탠다드", amount: 5500 },
          { plan: "스탠다드", amount: 13500 },
          { plan: "프리미엄", amount: 17000 },
        ],
      },
    },
    {
      id: "chatgpt",
      name: "ChatGPT Plus",
      monogram: "G",
      category: "소프트웨어",
      url: "https://chatgpt.com/",
      brandColor: "#10A37F",
      brandBg: "#E6F6F2",
      brandText: "#10A37F",
      cancelUrl: "https://chatgpt.com/#settings/Subscription",
      selectors: {
        container: ".gpt-pricing",
        title: ".gpt-title",
        price: ".gpt-price",
      },
      fallbackData: {
        plan: "ChatGPT Plus",
        amount: 29000,
        availablePlans: [
          { plan: "ChatGPT Plus", amount: 29000 },
        ],
      },
    },
  ],
};
