import test from "node:test";
import assert from "node:assert/strict";
import { parseReceiptText } from "../api/_lib/receiptParser.js";

// Android PaymentParser.java 기준 완전 동기화 구현체
const KNOWN_SERVICES = [
  { id: "netflix", name: "Netflix", category: "OTT", aliases: ["netflix", "넷플릭스", "netflix.com"], allowedAmounts: [5500, 13500, 17000], strict: false },
  { id: "youtube", name: "YouTube Premium", category: "OTT", aliases: ["youtube", "유튜브", "google youtube", "구글유튜브"], allowedAmounts: [8690, 10450, 14900], strict: false },
  { id: "tving", name: "티빙", category: "OTT", aliases: ["tving", "티빙", "cj enm"], allowedAmounts: [5500, 9500, 13500, 17000], strict: false },
  { id: "disney", name: "Disney+", category: "OTT", aliases: ["disney+", "디즈니+", "디즈니플러스", "disneyplus", "disney"], allowedAmounts: [9900, 13900, 99000, 139000], strict: false },
  { id: "watcha", name: "왓챠", category: "OTT", aliases: ["watcha", "왓챠"], allowedAmounts: [7900, 12900], strict: false },
  { id: "wavve", name: "웨이브", category: "OTT", aliases: ["wavve", "웨이브"], allowedAmounts: [7900, 10900, 13900], strict: false },
  { id: "coupang", name: "쿠팡 와우", category: "쇼핑", aliases: ["coupang", "쿠팡", "쿠팡와우", "와우멤버십"], allowedAmounts: [4990, 7890], strict: true },
  { id: "naver", name: "네이버플러스 멤버십", category: "쇼핑", aliases: ["네이버플러스", "네이버멤버십", "네이버"], allowedAmounts: [4900, 46800], strict: true },
  { id: "spotify", name: "Spotify", category: "음악", aliases: ["spotify", "스포티파이"], allowedAmounts: [8690, 10900, 11990, 17900], strict: false },
  { id: "melon", name: "멜론", category: "음악", aliases: ["melon", "멜론"], allowedAmounts: [7900, 10900, 11900], strict: false },
  { id: "chatgpt", name: "ChatGPT Plus", category: "AI/생산성", aliases: ["chatgpt", "챗gpt", "openai", "챗지피티"], allowedAmounts: [27000, 29000], strict: false },
  { id: "notion", name: "Notion", category: "AI/생산성", aliases: ["notion", "노션"], allowedAmounts: [11000, 13500, 20000], strict: false },
  { id: "adobe", name: "Adobe", category: "AI/생산성", aliases: ["adobe", "어도비"], allowedAmounts: [13200, 26400, 35200, 61600], strict: false },
  { id: "claude", name: "Claude Pro", category: "AI/생산성", aliases: ["claude", "클로드", "anthropic"], allowedAmounts: [27000, 29000], strict: false },
  { id: "millie", name: "밀리의서재", category: "도서", aliases: ["millie", "밀리", "밀리의 서재", "밀리의서재"], allowedAmounts: [9900, 99000], strict: false },
  { id: "apple", name: "Apple One", category: "기타", aliases: ["apple.com/bill", "애플", "apple"], allowedAmounts: [14900, 20900, 3300, 4400, 8900], strict: true },
];

const AMOUNT_PATTERN = /([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})\s*원|[$]\s*([0-9]+(?:\.[0-9]{2})?)/i;
const RECURRING_KEYWORD = /(정기|자동결제|정기결제|매월|구독|멤버십|와우|플러스멤버십|월간)/;
const NEGATIVE_KEYWORD = /(취소|환불|승인취소|결제취소|반품|카드대금|후불교통|교통카드|송금|이체|출금|적금|대출|이자|현금서비스|배송완료|주문취소|장바구니)/;
const BUSINESS_SUFFIX = /(헤어|미용실|치과|식당|마트|로지스틱스|물류|카페|베이커리|의원|병원|모텔|호텔|빌딩|세탁|주유소|약국|분식|반점)/;

function detectPaymentMethod(packageName, text) {
  const pkg = packageName || "";
  if (pkg.includes("shcard") || text.includes("신한")) return "신한카드";
  if (pkg.includes("kbcard") || pkg.includes("kbstar") || text.includes("KB") || text.includes("국민")) return "KB국민카드";
  if (pkg.includes("hyundaicard") || text.includes("현대")) return "현대카드";
  if (pkg.includes("samsungcard") || text.includes("삼성카드")) return "삼성카드";
  if (pkg.includes("wooricard") || text.includes("우리")) return "우리카드";
  if (pkg.includes("lotte") || text.includes("롯데")) return "롯데카드";
  if (pkg.includes("hana") || text.includes("하나")) return "하나카드";
  if (pkg.includes("nh.smart") || text.includes("농협")) return "NH농협카드";
  if (pkg.includes("kakaopay") || text.includes("카카오페이")) return "카카오페이";
  if (pkg.includes("toss") || text.includes("토스")) return "토스페이";
  if (pkg.includes("nhn") || text.includes("네이버페이")) return "네이버페이";
  if (pkg.includes("spay") || text.includes("삼성월렛") || text.includes("삼성페이")) return "삼성월렛";
  return "신용/체크카드";
}

function inferPlan(serviceId, amount, text) {
  if (text.includes("프리미엄") || text.toLowerCase().includes("premium")) return "프리미엄";
  if (text.includes("스탠다드") || text.toLowerCase().includes("standard")) return "스탠다드";
  if (text.includes("베이직") || text.toLowerCase().includes("basic")) return "베이직";
  if (text.includes("와우")) return "와우 멤버십";
  if (serviceId !== "disney" && text.includes("플러스")) return "Plus";

  if (serviceId === "netflix") {
    if (amount === 17000) return "프리미엄";
    if (amount === 13500) return "스탠다드";
    if (amount === 5500) return "광고형 스탠다드";
  } else if (serviceId === "youtube") {
    if (amount === 14900) return "개인 멤버십";
  } else if (serviceId === "coupang") {
    if (amount === 7890 || amount === 4990) return "와우 멤버십";
  } else if (serviceId === "disney") {
    if (amount === 9900) return "스탠다드";
    if (amount === 13900) return "프리미엄";
  } else if (serviceId === "tving") {
    if (amount === 13500) return "스탠다드";
    if (amount === 17000) return "프리미엄";
    if (amount === 5500) return "광고형 스탠다드";
  }
  return "기본 플랜";
}

function parsePaymentNative(packageName, title, body) {
  const combined = (title || "") + " " + (body || "");

  if (NEGATIVE_KEYWORD.test(combined)) return null;

  const amountMatch = combined.match(AMOUNT_PATTERN);
  let amount = 0;
  if (amountMatch) {
    if (amountMatch[1]) {
      amount = Number(amountMatch[1].replace(/,/g, ""));
    } else if (amountMatch[2]) {
      amount = Math.round(Number(amountMatch[2]) * 1350);
    }
  }
  if (!amount) return null;

  const compact = combined.toLowerCase().replace(/[^a-zA-Z0-9가-힣]/g, "");

  let bestMatch = null;
  let longestMatchLen = 0;
  for (const s of KNOWN_SERVICES) {
    for (const alias of s.aliases) {
      const cAlias = alias.toLowerCase().replace(/[^a-zA-Z0-9가-힣]/g, "");
      if (cAlias && compact.includes(cAlias)) {
        if (cAlias.length > longestMatchLen) {
          longestMatchLen = cAlias.length;
          bestMatch = s;
        }
      }
    }
  }

  if (bestMatch) {
    const suffixMatch = combined.match(BUSINESS_SUFFIX);
    if (suffixMatch) {
      for (const alias of bestMatch.aliases) {
        if (combined.includes(alias + suffixMatch[1])) {
          return null;
        }
      }
    }
  }

  const hasRecurring = RECURRING_KEYWORD.test(combined);

  if (bestMatch?.strict) {
    const isAmountMatched = bestMatch.allowedAmounts.includes(amount);
    if (!isAmountMatched && !hasRecurring) {
      return null;
    }
  }

  if (!bestMatch && !hasRecurring) {
    return null;
  }

  const serviceId = bestMatch ? bestMatch.id : "";
  const serviceName = bestMatch ? bestMatch.name : "신규 구독";
  const category = bestMatch ? bestMatch.category : "기타";
  const paymentMethod = detectPaymentMethod(packageName, combined);
  const plan = inferPlan(serviceId, amount, combined);

  return {
    serviceId,
    serviceName,
    category,
    amount,
    plan,
    paymentMethod,
    isSubscription: true,
  };
}

// 1. 주요 카드사별 정상 결제 메시지 레퍼런스 검증
test("[레퍼런스 검증] 신한카드 넷플릭스 프리미엄 결제 알림", () => {
  const parsed = parsePaymentNative(
    "com.shcard.smartpay",
    "[신한카드] 승인",
    "09/09 14:20 넷플릭스 17,000원(일시불) 정상승인 카드번호: ****-1234"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "Netflix");
  assert.equal(parsed.amount, 17000);
  assert.equal(parsed.plan, "프리미엄");
  assert.equal(parsed.paymentMethod, "신한카드");
});

test("[레퍼런스 검증] KB국민카드 KB Pay 유튜브 프리미엄 결제 알림", () => {
  const parsed = parsePaymentNative(
    "com.kbcard.cxh.appcode",
    "[KB Pay] 결제안내",
    "홍*동님 GOOGLE*YouTube 14,900원 결제완료 (정기결제)"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "YouTube Premium");
  assert.equal(parsed.amount, 14900);
  assert.equal(parsed.paymentMethod, "KB국민카드");
});

test("[레퍼런스 검증] 현대카드 쿠팡 와우 멤버십 정기결제 알림", () => {
  const parsed = parsePaymentNative(
    "com.hyundaicard.appcard",
    "현대카드 승인",
    "쿠팡 와우 멤버십 7,890원 일시불 결제완료 (매월 정기결제)"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "쿠팡 와우");
  assert.equal(parsed.amount, 7890);
  assert.equal(parsed.plan, "와우 멤버십");
  assert.equal(parsed.paymentMethod, "현대카드");
});

test("[레퍼런스 검증] 삼성카드 티빙 스탠다드 결제 알림", () => {
  const parsed = parsePaymentNative(
    "kr.co.samsungcard.mpocket",
    "[삼성카드] 승인안내",
    "티빙(TVING) 13,500원 일시불 결제 09/09 10:15"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "티빙");
  assert.equal(parsed.amount, 13500);
  assert.equal(parsed.plan, "스탠다드");
  assert.equal(parsed.paymentMethod, "삼성카드");
});

test("[레퍼런스 검증] 우리카드 디즈니플러스 결제 알림", () => {
  const parsed = parsePaymentNative(
    "com.wooricard.smartapp",
    "[우리WON카드] 승인알림",
    "디즈니플러스 9,900원 결제완료 우리카드(5678)"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "Disney+");
  assert.equal(parsed.amount, 9900);
  assert.equal(parsed.plan, "스탠다드");
  assert.equal(parsed.paymentMethod, "우리카드");
});

test("[레퍼런스 검증] 롯데카드 스포티파이 개인 요금제 결제 알림", () => {
  const parsed = parsePaymentNative(
    "com.lotte.lottesmartpay",
    "[디지로카] 승인",
    "스포티파이 10,900원 일시불 결제완료 롯데카드"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "Spotify");
  assert.equal(parsed.amount, 10900);
  assert.equal(parsed.paymentMethod, "롯데카드");
});

test("[레퍼런스 검증] 카카오페이 멜론 스트리밍 정기결제 알림톡", () => {
  const parsed = parsePaymentNative(
    "com.kakaopay.app",
    "카카오페이 결제완료",
    "가맹점: 멜론 스트리밍 클럽 / 결제금액: 10,900원 / 매월 자동결제"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "멜론");
  assert.equal(parsed.amount, 10900);
  assert.equal(parsed.paymentMethod, "카카오페이");
});

test("[레퍼런스 검증] 네이버페이 네이버플러스 멤버십 정기결제 알림", () => {
  const parsed = parsePaymentNative(
    "com.nhn.android.search",
    "네이버페이",
    "네이버플러스 멤버십 월간이용권 4,900원 정기결제 완료"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "네이버플러스 멤버십");
  assert.equal(parsed.amount, 4900);
  assert.equal(parsed.paymentMethod, "네이버페이");
});

test("[레퍼런스 검증] 토스페이 ChatGPT Plus 해외 결제 알림", () => {
  const parsed = parsePaymentNative(
    "viva.republica.toss",
    "토스 결제알림",
    "OPENAI $20.00 해외 승인완료 (토스페이)"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "ChatGPT Plus");
  assert.equal(parsed.amount, 27000);
  assert.equal(parsed.paymentMethod, "토스페이");
});

test("[레퍼런스 검증] 삼성월렛 밀리의서재 전자책 정기구독 결제 알림", () => {
  const parsed = parsePaymentNative(
    "com.samsung.android.spay",
    "[삼성월렛] 결제",
    "밀리의 서재 전자책 정기구독 9,900원 결제완료"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "밀리의서재");
  assert.equal(parsed.amount, 9900);
  assert.equal(parsed.paymentMethod, "삼성월렛");
});

// 2. 오탐 방지 차단 (Negative) 케이스 검증
test("[레퍼런스 검증] 오탐 차단: 쿠팡 일반 상품 34,000원 결제는 와우로 오인하지 않음", () => {
  const parsed = parsePaymentNative(
    "com.kbcard.cxh.appcode",
    "[KB국민카드] 승인",
    "쿠팡 34,000원 일시불 결제완료 09/09"
  );
  assert.equal(parsed, null);
});

test("[레퍼런스 검증] 오탐 차단: 네이버 쇼핑 일반 결제 25,000원 차단", () => {
  const parsed = parsePaymentNative(
    "com.nhn.android.search",
    "네이버페이 결제완료",
    "네이버 스마트스토어 의류 25,000원 결제완료"
  );
  assert.equal(parsed, null);
});

test("[레퍼런스 검증] 오탐 차단: 동음이의어 오프라인 미용실(웨이브헤어) 결제 차단", () => {
  const parsed = parsePaymentNative(
    "com.shcard.smartpay",
    "[신한카드] 승인",
    "웨이브헤어 15,000원 일시불 결제 09/09"
  );
  assert.equal(parsed, null);
});

test("[레퍼런스 검증] 오탐 차단: 결제 승인취소 및 환불 알림 차단", () => {
  const parsed = parsePaymentNative(
    "com.shcard.smartpay",
    "[신한카드] 승인취소",
    "넷플릭스 17,000원 결제취소 정상접수"
  );
  assert.equal(parsed, null);
});

test("[레퍼런스 검증] 오탐 차단: 카드대금 청구 및 자동이체 출금 차단", () => {
  const parsed = parsePaymentNative(
    "kr.co.samsungcard.mpocket",
    "[삼성카드]",
    "이번달 결제대금 380,000원 계좌 자동이체 출금완료"
  );
  assert.equal(parsed, null);
});

test("[레퍼런스 검증] 오탐 차단: 일반 식당/편의점 영수증 차단", () => {
  const parsed = parsePaymentNative(
    "com.shcard.smartpay",
    "[신한카드] 승인",
    "스타벅스 강남점 6,000원 일시불 결제"
  );
  assert.equal(parsed, null);
});

// 3. 영수증 및 OCR 텍스트 파서(receiptParser) 레퍼런스 검증
test("[레퍼런스 검증] 영수증 파서: 넷플릭스 카드 영수증 텍스트 파싱", () => {
  const text = `
    [카드승인전표]
    가맹점명: NETFLIX
    이용금액: 17,000원
    결제일시: 2026-09-09 15:30
    결제수단: 신한카드 9876
  `;
  const res = parseReceiptText(text);
  assert.equal(res.ok, true);
  assert.equal(res.data.serviceId, "netflix");
  assert.equal(res.data.name, "Netflix");
  assert.equal(res.data.amount, 17000);
  assert.equal(res.data.plan, "프리미엄");
  assert.equal(res.data.dueDay, 9);
});

test("[레퍼런스 검증] 영수증 파서: 유튜브 프리미엄 영수증 텍스트 파싱", () => {
  const text = `
    주문 영수증
    서비스: YouTube Premium
    청구 금액: 14,900원
    다음 결제일: 2026.10.12
    지불 수단: 카카오페이
  `;
  const res = parseReceiptText(text);
  assert.equal(res.ok, true);
  assert.equal(res.data.serviceId, "youtube");
  assert.equal(res.data.name, "YouTube Premium");
  assert.equal(res.data.amount, 14900);
  assert.equal(res.data.dueDay, 12);
  assert.equal(res.data.paymentMethod, "카카오페이");
});
