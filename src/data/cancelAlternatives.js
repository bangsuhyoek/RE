
export const ALTERNATIVE_TYPES = [
  "ad_tier",
  "lower_tier",
  "annual",
  "pause",
  "family",
  "retention_offer",
];

export const CANCEL_ALTERNATIVES = {
  // 1. Netflix
  netflix: [
    {
      type: "ad_tier",
      title: "광고형 스탠다드 요금제",
      monthlyPrice: 7000,
      note: "월 7,000원에 풀HD 화질 및 2대 동시 접속 가능",
      sourceUrl: "https://help.netflix.com/ko/node/24926",
      checkedAt: "2026-10-16",
    },
    {
      type: "lower_tier",
      title: "스탠다드 요금제 전환",
      monthlyPrice: 13500,
      note: "프리미엄 대비 월 3,500원 절약 (광고 없이 풀HD 2대)",
      sourceUrl: "https://help.netflix.com/ko/node/24926",
      checkedAt: "2026-10-16",
    },
  ],

  // 2. YouTube Premium
  youtube: [
    {
      type: "pause",
      title: "멤버십 일시정지 (최대 6개월)",
      monthlyPrice: null,
      note: "최대 6개월까지 결제 없이 멤버십 정지 후 언제든 재개",
      sourceUrl: "https://support.google.com/youtube/answer/6308278?hl=ko",
      checkedAt: "2026-10-16",
    },
    {
      type: "lower_tier",
      title: "YouTube Music Premium 전환",
      monthlyPrice: 11990,
      note: "영상 배경 재생 대신 음악 스트리밍 전용으로 전환",
      sourceUrl: "https://support.google.com/youtube/answer/6308278?hl=ko",
      checkedAt: "2026-10-16",
    },
  ],

  // 3. Disney+
  disney: [
    {
      type: "lower_tier",
      title: "스탠다드 요금제 전환",
      monthlyPrice: 9900,
      note: "프리미엄 대비 매월 4,000원 절약 (풀HD 2대 동시시청)",
      sourceUrl: "https://help.disneyplus.com/ko/article/disneyplus-price",
      checkedAt: "2026-10-16",
    },
    {
      type: "annual",
      title: "스탠다드 연간 플랜 결제",
      monthlyPrice: 8250,
      note: "연 99,000원 일시불 결제로 월 환산 약 16% 절약",
      sourceUrl: "https://help.disneyplus.com/ko/article/disneyplus-price",
      checkedAt: "2026-10-16",
    },
    {
      type: "annual",
      title: "프리미엄 연간 플랜 결제",
      monthlyPrice: 11583,
      note: "연 139,000원 결제로 월 환산 약 16% 절약 (4K 4대)",
      sourceUrl: "https://help.disneyplus.com/ko/article/disneyplus-price",
      checkedAt: "2026-10-16",
    },
  ],

  // 4. TVING
  tving: [
    {
      type: "ad_tier",
      title: "광고형 스탠다드 요금제",
      monthlyPrice: 5500,
      note: "월 5,500원, 광고가 포함된 요금제",
      sourceUrl: "https://www.tving.com/bill/subscription/plan",
      checkedAt: "2026-10-17",
    },
    {
      type: "lower_tier",
      title: "스탠다드 요금제 전환",
      monthlyPrice: 13500,
      note: "프리미엄(월 17,000원)보다 월 3,500원 저렴",
      sourceUrl: "https://www.tving.com/bill/subscription/plan",
      checkedAt: "2026-10-17",
    },
    {
      type: "annual",
      title: "프리미엄 연간 이용권 결제",
      monthlyPrice: 14083,
      note: "프리미엄 연 169,000원 결제 시 월 환산 약 14,083원",
      sourceUrl: "https://www.tving.com/bill/subscription/plan",
      checkedAt: "2026-10-17",
    },
  ],

  // 5. Wavve
  wavve: [
    {
      type: "lower_tier",
      title: "베이직 요금제 전환",
      monthlyPrice: 7900,
      note: "월 7,900원에 HD 화질 1회선 모바일/PC 시청",
      sourceUrl: "https://www.wavve.com/voucher/index.html",
      checkedAt: "2026-10-17",
    },
    {
      type: "annual",
      title: "베이직 연간 이용권 결제",
      monthlyPrice: 6583,
      note: "베이직 연 79,000원 결제 시 월 환산 6,583원 (16% 할인)",
      sourceUrl: "https://www.wavve.com/voucher/index.html",
      checkedAt: "2026-10-17",
    },
  ],

  // 6. Coupang Play
  coupangplay: [
    {
      type: "lower_tier",
      title: "쿠팡 와우 멤버십 연동 유지",
      monthlyPrice: 7890,
      note: "쿠팡 로켓배송·반품 무료 혜택과 함께 무료 시청 유지",
      sourceUrl: "https://play.coupang.com/faq",
      checkedAt: "2026-10-16",
    },
  ],

  // 7. Watcha
  watcha: [
    {
      type: "lower_tier",
      title: "베이직 요금제 전환",
      monthlyPrice: 7900,
      note: "프리미엄(월 12,900원)보다 월 5,000원 저렴, 동시 감상 불가",
      sourceUrl: "https://help.watcha.com/hc/ko/articles/12820787376409",
      checkedAt: "2026-10-17",
    },
  ],

  // 8. Spotify
  spotify: [
    {
      type: "lower_tier",
      title: "베이직 요금제 전환",
      monthlyPrice: 8690,
      note: "월 8,690원(부가세 포함)에 오프라인 다운로드 제외 스트리밍",
      sourceUrl: "https://www.spotify.com/kr-ko/premium/",
      checkedAt: "2026-10-16",
    },
    {
      type: "family",
      title: "듀오 요금제 (2인 공유)",
      monthlyPrice: 8993,
      note: "월 17,985원(부가세 포함) 듀오로 1인당 월 약 8,993원",
      sourceUrl: "https://www.spotify.com/kr-ko/premium/",
      checkedAt: "2026-10-16",
    },
  ],

  // 9. Melon
  melon: [
    {
      type: "lower_tier",
      title: "모바일 스트리밍클럽 전환",
      monthlyPrice: 7590,
      note: "모바일 무제한 듣기 정기결제 월 7,590원(부가세 포함)",
      sourceUrl: "https://www.melon.com/buy/pamphlet/all.htm",
      checkedAt: "2026-10-17",
    },
    {
      type: "pause",
      title: "이용권 일시정지 (최대 3회/총 90일)",
      monthlyPrice: null,
      note: "마이뮤직에서 결제 주기당 최대 30일씩 일시정지 가능",
      sourceUrl: "https://help.melon.com/web/faq/content.htm?faqId=2212",
      checkedAt: "2026-10-16",
    },
  ],

  // 10. Genie
  genie: [
    {
      type: "lower_tier",
      title: "스마트 음악감상 (모바일 전용)",
      monthlyPrice: 8140,
      note: "모바일 무제한 스트리밍 전용(월 8,140원)으로 전환하여 절감",
      sourceUrl: "https://www.genie.co.kr/buy/recommend",
      checkedAt: "2026-10-16",
    },
    {
      type: "pause",
      title: "정기결제 일시정지 (최대 90일)",
      monthlyPrice: null,
      note: "설정 메뉴에서 1회 최대 30일, 연간 최대 90일 정지",
      sourceUrl: "https://www.genie.co.kr/support/service/helpView?ct=6",
      checkedAt: "2026-10-16",
    },
  ],

  // 11. ChatGPT
  chatgpt: [
    {
      type: "lower_tier",
      title: "무료 플랜 (Free Tier) 전환",
      monthlyPrice: 0,
      note: "구독 해지 시 결제 만료 후 GPT 기본 모델 무료 사용 가능",
      sourceUrl: "https://help.openai.com/en/articles/7232927-how-do-i-cancel-my-chatgpt-plus-subscription",
      checkedAt: "2026-10-16",
    },
  ],

  // 12. Claude Pro
  "claude-pro": [
    {
      type: "lower_tier",
      title: "무료 티어 (Free Plan) 전환",
      monthlyPrice: 0,
      note: "해지 후에도 무료 티어로 일일 사용 한도 내 질문 가능",
      sourceUrl: "https://support.anthropic.com/en/articles/8325617-how-do-i-cancel-my-paid-claude-subscription",
      checkedAt: "2026-10-16",
    },
  ],

  // 13. MS 365
  ms365: [
    {
      type: "family",
      title: "Microsoft 365 Family 공유 (최대 6인)",
      monthlyPrice: 2583,
      note: "Family 연 155,000원 결제 후 6인 공유 시 1인당 월 2,583원",
      sourceUrl: "https://www.microsoft.com/ko-kr/microsoft-365/buy/compare-all-microsoft-365-products",
      checkedAt: "2026-10-16",
    },
    {
      type: "annual",
      title: "Personal 연간 플랜 결제",
      monthlyPrice: 10417,
      note: "Personal 연 125,000원 결제 시 월 환산 약 10,417원",
      sourceUrl: "https://www.microsoft.com/ko-kr/microsoft-365/buy/compare-all-microsoft-365-products",
      checkedAt: "2026-10-16",
    },
  ],

  // 14. Google One
  "google-one": [
    {
      type: "lower_tier",
      title: "Basic 100GB 플랜 전환",
      monthlyPrice: 2400,
      note: "고용량 플랜에서 월 2,400원 기본 100GB로 다운그레이드",
      sourceUrl: "https://one.google.com/about/plans",
      checkedAt: "2026-10-16",
    },
    {
      type: "annual",
      title: "100GB 연간 결제 할인",
      monthlyPrice: 2000,
      note: "연 24,000원 일시불 결제로 월 결제 대비 17% 절약",
      sourceUrl: "https://one.google.com/about/plans",
      checkedAt: "2026-10-16",
    },
    {
      type: "family",
      title: "가족 그룹 저장용량 공유 (최대 5인)",
      monthlyPrice: null,
      note: "추가 요금 없이 가족 그룹원 최대 5명과 100GB 이상 용량 공유",
      sourceUrl: "https://support.google.com/googleone/answer/9056360?hl=ko",
      checkedAt: "2026-10-16",
    },
  ],

  // 15. 밀리의 서재
  millie: [
    {
      type: "annual",
      title: "연 정기구독 결제",
      monthlyPrice: 8250,
      note: "연 99,000원 결제로 월 정기구독(9,900원) 대비 2개월분 무료",
      sourceUrl: "https://www.millie.co.kr/v3/customer",
      checkedAt: "2026-10-16",
    },
    {
      type: "pause",
      title: "정기구독 일시정지 (최대 3개월)",
      monthlyPrice: null,
      note: "설정에서 최대 90일까지 구독 결제 일시정지 가능",
      sourceUrl: "https://www.millie.co.kr/v3/customer",
      checkedAt: "2026-10-16",
    },
  ],

  // 17. 네이버플러스 멤버십
  naverplus: [
    {
      type: "annual",
      title: "연간 이용권 결제",
      monthlyPrice: 3900,
      note: "연 46,800원 일시불 결제로 월 요금(4,900원) 대비 20% 절약",
      sourceUrl: "https://help.naver.com/service/23168/contents/13775",
      checkedAt: "2026-10-16",
    },
    {
      type: "family",
      title: "패밀리 멤버 초대 (최대 3인 무료)",
      monthlyPrice: null,
      note: "추가 결제 없이 최대 3명 패밀리 멤버와 쇼핑 적립 혜택 공유",
      sourceUrl: "https://help.naver.com/service/23168/contents/13775",
      checkedAt: "2026-10-16",
    },
  ],

  // 18. Adobe Creative Cloud
  adobe: [
    {
      type: "lower_tier",
      title: "포토그래피 플랜 또는 단일 앱 전환",
      monthlyPrice: 13200,
      note: "전체 앱 대신 포토샵+라이트룸 포토그래피(월 13,200원)로 다운그레이드",
      sourceUrl: "https://helpx.adobe.com/kr/manage-account/using/creative-cloud-subscription-terms.html",
      checkedAt: "2026-10-16",
    },
    {
      type: "pause",
      title: "플랜 일시정지 (계정 관리)",
      monthlyPrice: null,
      note: "계정 관리 페이지 플랜 변경에서 일시 중단 옵션 선택",
      sourceUrl: "https://helpx.adobe.com/kr/manage-account/using/creative-cloud-subscription-terms.html",
      checkedAt: "2026-10-16",
    },
  ],

  // 19. Laftel
  laftel: [
    {
      type: "lower_tier",
      title: "베이직 멤버십 전환",
      monthlyPrice: 9900,
      note: "프리미엄(14,900원) 대신 베이직(9,900원 1회선 FHD) 이용",
      sourceUrl: "https://help.laftel.net/hc/ko/articles/6011133529231",
      checkedAt: "2026-10-16",
    },
  ],

  // 20. 윌라 오디오북
  welaaa: [
    {
      type: "annual",
      title: "오디오북+클래스 연간 멤버십",
      monthlyPrice: 9900,
      note: "연 118,800원 결제로 월 멤버십 대비 할인 이용",
      sourceUrl: "https://www.welaaa.com/membership",
      checkedAt: "2026-10-16",
    },
    {
      type: "pause",
      title: "멤버십 일시정지 (연간 최대 90일)",
      monthlyPrice: null,
      note: "1회당 최대 30일, 연 최대 3회 일시정지 지원",
      sourceUrl: "https://www.welaaa.com/membership",
      checkedAt: "2026-10-16",
    },
  ],

  // 21. Duolingo
  duolingo: [
    {
      type: "annual",
      title: "Super Duolingo 연간 플랜",
      monthlyPrice: 5825,
      note: "연 69,900원 일시불 결제로 월간 플랜 대비 약 40% 절약",
      sourceUrl: "https://support.duolingo.com/hc/ko/articles/115004068043",
      checkedAt: "2026-10-16",
    },
    {
      type: "family",
      title: "패밀리 플랜 공유 (최대 6인)",
      monthlyPrice: 1517,
      note: "패밀리 연 109,200원 6인 분담 시 1인당 월 1,517원",
      sourceUrl: "https://support.duolingo.com/hc/ko/articles/115004068043",
      checkedAt: "2026-10-16",
    },
  ],

  // 22. Speak
  speak: [
    {
      type: "annual",
      title: "프리미엄 연간 플랜 결제",
      monthlyPrice: 10750,
      note: "연 129,000원 결제로 월 단위 대비 대폭 할인",
      sourceUrl: "https://www.usespeak.com/ko",
      checkedAt: "2026-10-16",
    },
  ],

  // 23. Dropbox
  dropbox: [
    {
      type: "annual",
      title: "Plus 연간 청구 플랜",
      monthlyPrice: null,
      note: "연간 청구 시 월 US$9.99 (월간 청구는 US$11.99)",
      sourceUrl: "https://www.dropbox.com/ko/plans",
      checkedAt: "2026-10-17",
    },
  ],

  // 24. Notion
  notion: [
    {
      type: "annual",
      title: "Plus 연간 결제 할인",
      monthlyPrice: null,
      note: "연간 결제 시 1인 월 ₩14,000 (월간 결제 ₩16,800), 부가세 표기 없음",
      sourceUrl: "https://www.notion.com/ko/pricing",
      checkedAt: "2026-10-17",
    },
  ],
};

export function getCancelAlternatives(serviceId) {
  if (!serviceId || typeof serviceId !== "string") return [];
  const alternatives = CANCEL_ALTERNATIVES[serviceId];
  return Array.isArray(alternatives) ? alternatives : [];
}
