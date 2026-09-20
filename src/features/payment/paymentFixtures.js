export const DEMO_PAYMENT_FIXTURES = Object.freeze([
  {
    id: "netflix-shinhan",
    label: "Netflix 정상 결제",
    kind: "match",
    rawEvent: {
      packageName: "com.shcard.smartpay",
      title: "[신한카드] 승인",
      body: "넷플릭스 17,000원(일시불) 정상승인",
      receivedAt: "2026-09-20T11:20:00+09:00",
    },
    expected: { decision: "MATCH", serviceId: "netflix", amount: 17000, paymentMethod: "신한카드" },
  },
  {
    id: "youtube-kb",
    label: "YouTube Premium 정상 결제",
    kind: "match",
    rawEvent: {
      packageName: "com.kbcard.cxh.appcode",
      title: "[KB Pay] 결제안내",
      body: "GOOGLE*YouTube 14,900원 결제완료 (매월 정기결제)",
      receivedAt: "2026-09-20T11:20:00+09:00",
    },
    expected: { decision: "MATCH", serviceId: "youtube", amount: 14900, paymentMethod: "KB국민카드" },
  },
  {
    id: "coupang-wow",
    label: "쿠팡 와우 정상 결제",
    kind: "match",
    rawEvent: {
      packageName: "com.hyundaicard.appcard",
      title: "현대카드 승인",
      body: "쿠팡 와우 멤버십 7,890원 일시불 결제완료 (매월 정기결제)",
      receivedAt: "2026-09-20T11:20:00+09:00",
    },
    expected: { decision: "MATCH", serviceId: "coupang", amount: 7890, paymentMethod: "현대카드" },
  },
  {
    id: "naver-plus",
    label: "네이버플러스 정상 결제",
    kind: "match",
    rawEvent: {
      packageName: "com.nhn.android.search",
      title: "네이버페이",
      body: "네이버플러스 멤버십 월간이용권 4,900원 정기결제 완료",
      receivedAt: "2026-09-20T11:20:00+09:00",
    },
    expected: { decision: "MATCH", serviceId: "naverplus", amount: 4900, paymentMethod: "네이버페이" },
  },
  {
    id: "chatgpt-usd",
    label: "ChatGPT Plus 해외 결제",
    kind: "match",
    rawEvent: {
      packageName: "viva.republica.toss",
      title: "토스 결제알림",
      body: "OPENAI $20.00 해외 승인완료 (토스페이)",
      receivedAt: "2026-09-20T11:20:00+09:00",
    },
    expected: { decision: "MATCH", serviceId: "chatgpt", amount: 27000, paymentMethod: "토스페이" },
  },
  {
    id: "coupang-general",
    label: "쿠팡 일반 결제",
    kind: "reject",
    rawEvent: {
      packageName: "com.kbcard.cxh.appcode",
      title: "[KB국민카드] 승인",
      body: "쿠팡 34,000원 일시불 결제완료",
      receivedAt: "2026-09-20T11:20:00+09:00",
    },
    expected: { decision: "REJECT", reasonCode: "PRICE_MISMATCH" },
  },
  {
    id: "netflix-cancel",
    label: "Netflix 승인취소",
    kind: "reject",
    rawEvent: {
      packageName: "com.shcard.smartpay",
      title: "[신한카드] 승인취소",
      body: "넷플릭스 17,000원 결제취소 완료",
      receivedAt: "2026-09-20T11:20:00+09:00",
    },
    expected: { decision: "REJECT", reasonCode: "PAYMENT_CANCELLED" },
  },
  {
    id: "netflix-refund",
    label: "Netflix 환불",
    kind: "reject",
    rawEvent: {
      packageName: "com.shcard.smartpay",
      title: "[신한카드] 환불",
      body: "넷플릭스 17,000원 환불 처리 완료",
      receivedAt: "2026-09-20T11:20:00+09:00",
    },
    expected: { decision: "REJECT", reasonCode: "PAYMENT_CANCELLED" },
  },
  {
    id: "gs25",
    label: "GS25 일반 결제",
    kind: "reject",
    rawEvent: {
      packageName: "com.shcard.smartpay",
      title: "[신한카드] 승인",
      body: "GS25 역삼점 4,500원 일시불 결제완료",
      receivedAt: "2026-09-20T11:20:00+09:00",
    },
    expected: { decision: "REJECT", reasonCode: "NON_SUBSCRIPTION_PURCHASE" },
  },
  {
    id: "restaurant",
    label: "식당 일반 결제",
    kind: "reject",
    rawEvent: {
      packageName: "com.shcard.smartpay",
      title: "[신한카드] 승인",
      body: "한식당 강남점 28,000원 일시불 결제완료",
      receivedAt: "2026-09-20T11:20:00+09:00",
    },
    expected: { decision: "REJECT", reasonCode: "NON_SUBSCRIPTION_PURCHASE" },
  },
  {
    id: "card-bill",
    label: "카드대금 자동이체",
    kind: "reject",
    rawEvent: {
      packageName: "kr.co.samsungcard.mpocket",
      title: "[삼성카드]",
      body: "이번달 결제대금 380,000원 계좌 자동이체 출금완료",
      receivedAt: "2026-09-20T11:20:00+09:00",
    },
    expected: { decision: "REJECT", reasonCode: "NEGATIVE_PAYMENT_EVENT" },
  },
  {
    id: "transfer",
    label: "송금·출금",
    kind: "reject",
    rawEvent: {
      packageName: "viva.republica.toss",
      title: "토스 알림",
      body: "김OO님께 50,000원 송금 완료",
      receivedAt: "2026-09-20T11:20:00+09:00",
    },
    expected: { decision: "REJECT", reasonCode: "NEGATIVE_PAYMENT_EVENT" },
  },
  {
    id: "wavve-hair",
    label: "동음이의어 오프라인 매장",
    kind: "reject",
    rawEvent: {
      packageName: "com.shcard.smartpay",
      title: "[신한카드] 승인",
      body: "웨이브헤어 15,000원 일시불 결제",
      receivedAt: "2026-09-20T11:20:00+09:00",
    },
    expected: { decision: "REJECT", reasonCode: "AMBIGUOUS_MERCHANT" },
  },
]);

export const PRIMARY_DEMO_PAYMENT_FIXTURE_ID = "netflix-shinhan";

export function getDemoPaymentFixture(id = PRIMARY_DEMO_PAYMENT_FIXTURE_ID) {
  return DEMO_PAYMENT_FIXTURES.find((fixture) => fixture.id === id) || DEMO_PAYMENT_FIXTURES[0];
}
