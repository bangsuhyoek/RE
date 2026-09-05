// 운영 화면에서 사용하는 서비스 마스터 메타데이터입니다.
// 사용자별 금액, 결제일, 결제수단, 체험 여부 같은 mock 값은 두지 않습니다.
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

// 실제 프로모션 API/제휴 데이터가 연결되기 전에는 운영 화면에 가짜 혜택을 만들지 않습니다.
export const promotionCatalog = [];
