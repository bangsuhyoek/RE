import test from "node:test";
import assert from "node:assert/strict";
import { parseReceiptText, MIN_SUBSCRIPTION_AMOUNT_KRW } from "../api/_lib/receiptParser.js";
import { scanStatementText } from "../src/lib/subscriptionDiscovery.js";
import { sharedTextToDetected } from "../src/lib/shareIntake.js";

const now = new Date(2026, 10, 15);

test("구독 최소 금액은 안드로이드 결제 알림 파서와 같은 1,000원이다", () => {
  assert.equal(MIN_SUBSCRIPTION_AMOUNT_KRW, 1000);
});

test("공유·영수증 파서: 1,000원 미만 금액은 결제 금액으로 쓰지 않고, 포인트 소액이 있어도 실제 결제 금액을 고른다", () => {
  const small = parseReceiptText("[카카오페이] 결제 완료 300원 · 웹툰 구독 쿠키");
  assert.equal(small.data.amount, "");

  const withPoints = parseReceiptText("[카카오페이] 넷플릭스 17,000원 결제 완료 · 포인트 300원 적립");
  assert.equal(withPoints.data.serviceId, "netflix");
  assert.equal(withPoints.data.amount, 17000);

  // 환율로 바꾼 뒤에도 1,000원 미만이면 결제 금액이 아니다.
  assert.equal(parseReceiptText("[신한카드] 해외승인 USD 0.50 APPLE.COM/BILL").data.amount, "");

  // '누적 승인금액'은 결제 금액 표시처럼 보여도 결제 금액이 아니다.
  const cumulative = parseReceiptText("[신한카드] 넷플릭스 17,000원 일시불 승인 (누적 승인금액 523,400원)");
  assert.equal(cumulative.data.amount, 17000);
});

const statementCases = [
  {
    label: "쿠팡 일반 주문 영수증은 쿠팡 와우로 잡지 않는다",
    text: "쿠팡 주문 영수증 32,500원 결제 완료",
    expectedIds: [],
  },
  {
    label: "네이버페이 쇼핑 결제의 '멤버십 적립' 문구로 네이버플러스 멤버십을 만들지 않는다",
    text: "네이버페이 15,800원 결제 완료 · 네이버플러스 멤버십 적립 4%",
    expectedIds: [],
  },
  {
    label: "쿠팡 와우 정기결제는 그대로 잡는다",
    text: "쿠팡 와우 멤버십 7,890원 정기결제 승인",
    expectedIds: ["coupang"],
  },
  {
    label: "네이버플러스 멤버십 정기결제는 그대로 잡는다",
    text: "[네이버페이] 네이버플러스 멤버십 4,900원 정기결제 완료",
    expectedIds: ["naver"],
  },
  {
    label: "연간 요금(46,800원) 근처의 네이버페이 쇼핑 결제는 멤버십으로 잡지 않는다",
    text: "네이버페이 35,000원 결제 완료 · 네이버플러스 멤버십 적립 4%",
    expectedIds: [],
  },
  {
    label: "누적 사용 금액이 앞에 있어도 쿠팡 와우 결제 금액을 고른다",
    text: "신한카드 승인 홍*동 누적사용 523,400원 쿠팡 와우 7,890원",
    expectedIds: ["coupang"],
  },
  {
    label: "단독 '취소' 카드 알림은 영수증 분석 대체 경로로도 되살리지 않는다",
    text: "[KB국민카드]1234 취소 홍*동 17,000원 11/03 넷플릭스",
    expectedIds: [],
  },
  {
    label: "'취소문의'·'환불불가' 안내 문구가 있는 결제 줄은 버리지 않는다",
    text: "넷플릭스 17,000원 결제완료 (취소문의: 1588-0000)\n스포티파이 10,900원 결제완료 (환불불가)\n티빙 13,500원 승인",
    expectedIds: ["netflix", "spotify", "tving"],
  },
];

for (const { label, text, expectedIds } of statementCases) {
  test("명세서·문자 분석: " + label, () => {
    const { items } = scanStatementText(text, { now });
    assert.deepEqual(items.map((item) => item.serviceId || item.name), expectedIds);
  });
}

// ── 실제 메일함 교차검증에서 찾은 형태를 개인정보(이름·주소·주문/승인번호 등) 없이 다시 쓴 사례 ──

const WOW_FEE_MAIL = [
  "[쿠팡] 고객님, 와우 멤버십 월회비가 결제되었습니다.",
  "로켓와우클럽 월회비 결제내역",
  "와우 멤버십",
  "월회비가 결제되었습니다",
  "다양한 와우 혜택을 이용해보세요",
  "쿠팡플레이 특별 혜택",
  "쿠팡이츠 배달비 0원",
  "로켓배송 30일 무료반품",
  "월회비 결제 정보",
  "| 결제금액 | 7,890원 |",
  "| 결제수단 | 쿠페이(계좌이체) / 은행 |",
  "쿠팡고객센터 운영시간 : 365일 24시간 운영",
].join("\n");

const COUPANG_ORDER_MAIL = [
  "[쿠팡] 고객님 주문하신 내역을 확인해주세요.",
  "주문내역",
  "| 구매 상세내역 | 쿠팡가 | 수량 | 구매금액 | 판매자 |",
  "| 젤리, 100g, 6개 | 8,860원 | 1 | 8,860원 | 쿠팡(주) |",
  "| 무릎 보호대, 2개 | 21,800원 | 1 | 21,800원 | 쿠팡(주) |",
  "| 결제 정보 |",
  "| 상품 가격 | 30,660원 |",
  "| 배송비 | 0원 |",
  "| 쿠페이(계좌이체) / 은행 | 30,660원 |",
  "| 총 결제금액 | 30,660원 |",
  "쿠팡(주) | 고객센터 안내",
].join("\n");

test("메일 교차검증: 쿠팡 와우 월회비 메일은 쿠팡플레이가 아니라 쿠팡 와우 7,890원이다", () => {
  const shared = sharedTextToDetected(WOW_FEE_MAIL, now);
  assert.equal(shared.serviceId, "coupang");
  assert.equal(shared.amount, 7890);
  const { items } = scanStatementText(WOW_FEE_MAIL, { now });
  assert.deepEqual(items.map((item) => [item.serviceId, item.amount]), [["coupang", 7890]]);
});

test("메일 교차검증: 쿠팡 일반 주문 메일은 상품 가격이 와우 요금 근처여도 구독이 아니다", () => {
  assert.equal(sharedTextToDetected(COUPANG_ORDER_MAIL, now), null);
  assert.deepEqual(scanStatementText(COUPANG_ORDER_MAIL, { now }).items, []);
});

test("메일 교차검증: 환불·크레딧·해지 예약 안내는 공유해도 빠른 등록 초안을 만들지 않는다", () => {
  const docs = [
    "Your refund from Figma, Inc.\nRefund from Figma, Inc. $22.00 Refunded on June 12, 2026\nProfessional Full seats (monthly) Qty 1 $22.00",
    "Credit note from OpenAI for invoice\nCredit note from OpenAI $22.00 Issued January 9, 2026\nRefund issued $22.00",
    "ChatGPT - 플랜이 갱신되지 않습니다\nChatGPT Plus 구독이 갱신되지 않고 취소되지만 결제 기간이 끝나는 날까지는 이용할 수 있습니다.",
    "Colab: Colab 구독 취소\n구독 취소\nColab 구독이 2026년 9월 14일에 취소되었습니다.",
  ];
  for (const doc of docs) {
    assert.equal(sharedTextToDetected(doc, now), null, doc.split("\n")[0]);
    assert.deepEqual(scanStatementText(doc, { now }).items, [], doc.split("\n")[0]);
  }
});

test("메일 교차검증: Google Play 단건 구매 영수증(게임 아이템·웹툰 쿠키)은 구독이 아니다", () => {
  const receipt = [
    "Google Play 주문 영수증(2026. 7. 27.)",
    "Google Play의 (유)예시웹툰에서 구매하셨습니다.",
    "쿠키 10개 (SERIES) ₩1,200",
    "합계: ₩1,200",
    "(VAT ₩0 포함)",
  ].join("\n");
  assert.equal(sharedTextToDetected(receipt, now), null);
  assert.deepEqual(scanStatementText(receipt, { now }).items, []);
});

test("메일 교차검증: Google Play 구독 영수증은 같은 가격의 다른 서비스가 아니라 적힌 판매자 이름을 쓴다", () => {
  const receipt = [
    "Google Play 주문 영수증(2026. 12. 12.)",
    "Google Play에서 Example Games, LLC의 구독권을 구매하셨습니다. 정기 결제를 취소하지 않으면 2027. 12. 12.에 자동으로 갱신됩니다.",
    "Yearly Diamond Membership (Example Chess) ₩139,000/연",
    "자동 갱신되는 정기 결제",
  ].join("\n");
  const shared = sharedTextToDetected(receipt, now);
  assert.equal(shared.name, "Example Games, LLC");
  assert.equal(shared.serviceId, "");
  assert.equal(shared.amount, 139000);
});

test("메일 교차검증: 표 형식 결제 메일은 할인 전 금액·누적 결제액이 아니라 최종 결제 금액을 읽는다", () => {
  const mail = [
    "[STOVE] 게임 결제 내역을 알려드립니다.",
    "| 상품정보 |",
    "| ₩ 10,000 |",
    "| 총 결제 금액 | 10,000 |",
    "| 할인 금액 | ₩ 4,590 |",
    "| 최종 결제 금액 | ₩ 5,410 |",
    "| 결제 한도 | ₩ 10,000,000 / 월 |",
    "| 누적 결제액 | ₩ 131,000 |",
  ].join("\n");
  assert.equal(parseReceiptText(mail).data.amount, 5410);
});

test("메일 교차검증: '원' 없이 ₩만 붙은 금액과 월간 표시를 읽고, 링크 주소 안 숫자·연간 안내 문구에 속지 않는다", () => {
  const spotify = parseReceiptText(
    "Spotify Premium 개인 주문 확인\n체험 기간이 종료되기 전에 구독을 해지하지 않을 경우, 해지할 때까지 매달 ₩11,990의 Premium 요금이 자동으로 청구되는 것에 동의합니다."
  );
  assert.equal(spotify.data.serviceId, "spotify");
  assert.equal(spotify.data.amount, 11990);

  const figma = parseReceiptText(
    [
      "구독 결제 영수증",
      "Figma의 정기 프로페셔널 팀 (월간) 구독 정기 결제가 성공적으로 처리되었습니다.",
      "[영수증 보기](https://click.example.com/ls/click?upn=u001.88usd2Fq0)",
      "시작: 6월 06, 2026 종료: 7월 06, 2026 총액: $22.00 USD",
      "연간 요금제를 보유하고 있는 경우, 연간 요금제가 갱신되기 30일 전에 알림을 받게 됩니다.",
    ].join("\n")
  );
  assert.equal(figma.data.serviceId, "figma");
  assert.equal(figma.data.amount, Math.round(22 * 1350));
  assert.equal(figma.data.billingCycle, "매월");
});

test("메일 교차검증: 무료체험 안내의 금액 없는 줄은 이름 모를 구독 후보가 되지 않는다", () => {
  const trial = [
    "Google Play 주문 영수증(2025. 1. 16.)",
    "Google Play에서 Example Labs의 무료 체험 구독을 신청하셨습니다. 무료 체험은",
    "2025. 1. 23.에 종료됩니다. 유료 전환일 이전에 취소되지 않는 한, 무료 체험이",
    "끝난 후 정기 구독 요금이 자동 청구됩니다.",
    "자동 갱신되는 정기 결제",
  ].join("\n");
  const { items } = scanStatementText(trial, { now });
  assert.ok(items.every((item) => item.amount > 0), JSON.stringify(items.map((item) => [item.name, item.amount])));
});
