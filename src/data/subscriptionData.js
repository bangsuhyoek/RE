// 서비스명·분류·해지 진입 주소처럼 UI에서 필요한 마스터 메타데이터만 둡니다.
// 사용자별 금액, 결제일, 결제수단, 체험 여부는 여기서 만들지 않습니다.
export const serviceCatalog = [
  { id: "netflix", name: "Netflix", monogram: "N", category: "OTT", cancelUrl: "https://www.netflix.com/cancelplan" },
  { id: "youtube", name: "YouTube Premium", monogram: "Y", category: "OTT", cancelUrl: "https://www.youtube.com/paid_memberships" },
  { id: "coupang", name: "쿠팡 와우", monogram: "C", category: "쇼핑", cancelUrl: "https://www.coupang.com/np/membership/benefit" },
  { id: "spotify", name: "Spotify", monogram: "S", category: "음악", cancelUrl: "https://www.spotify.com/account/subscription/" },
  { id: "chatgpt", name: "ChatGPT Plus", monogram: "G", category: "생산성", cancelUrl: "https://chatgpt.com/#settings" },
  { id: "tving", name: "티빙", monogram: "T", category: "OTT", cancelUrl: "https://www.tving.com/" },
  { id: "disney", name: "Disney+", monogram: "D", category: "OTT", cancelUrl: "https://www.disneyplus.com/ko-kr/account" },
  { id: "millie", name: "밀리의 서재", monogram: "M", category: "생산성", cancelUrl: "https://www.millie.co.kr/v3/customer/faq" },
  { id: "adobe", name: "Adobe Creative Cloud", monogram: "A", category: "생산성", cancelUrl: "https://account.adobe.com/plans" },
];

// 프로모션은 실제 API 응답이 들어오기 전까지 비워둡니다.
export const promotionCatalog = [];
