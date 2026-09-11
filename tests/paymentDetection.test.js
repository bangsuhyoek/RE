import test from "node:test";
import assert from "node:assert/strict";
import { checkPaymentCapturePermission, requestPaymentCapturePermission } from "../src/lib/paymentCapture.js";

// JS implementation mirror of the enhanced native PaymentParser
const KNOWN_SERVICES = [
  { id: "netflix", name: "Netflix", category: "OTT", aliases: ["netflix", "넷플릭스"], allowedAmounts: [5500, 13500, 17000], strict: false },
  { id: "youtube", name: "YouTube Premium", category: "OTT", aliases: ["youtube", "유튜브"], allowedAmounts: [8690, 10450, 14900], strict: false },
  { id: "coupang", name: "쿠팡 와우", category: "쇼핑", aliases: ["coupang", "쿠팡", "와우멤버십"], allowedAmounts: [4990, 7890], strict: true },
  { id: "spotify", name: "Spotify", category: "음악", aliases: ["spotify", "스포티파이"], allowedAmounts: [10900, 11990], strict: false },
  { id: "chatgpt", name: "ChatGPT Plus", category: "AI/생산성", aliases: ["chatgpt", "챗gpt", "openai"], allowedAmounts: [27000, 29000], strict: false },
  { id: "tving", name: "티빙", category: "OTT", aliases: ["tving", "티빙"], allowedAmounts: [5500, 13500, 17000], strict: false },
  { id: "disney", name: "Disney+", category: "OTT", aliases: ["disney+", "디즈니+", "디즈니플러스"], allowedAmounts: [9900, 13900], strict: false },
  { id: "wavve", name: "웨이브", category: "OTT", aliases: ["wavve", "웨이브"], allowedAmounts: [7900, 10900, 13900], strict: false },
];

const AMOUNT_PATTERN = /([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})\s*원|[$]\s*([0-9]+(?:\.[0-9]{2})?)/i;
const RECURRING_KEYWORD = /(정기|자동결제|정기결제|매월|구독|멤버십|와우|월간)/;
const NEGATIVE_KEYWORD = /(취소|환불|승인취소|결제취소|반품|카드대금|후불교통|교통카드|송금|이체|출금|적금|대출|이자|현금서비스|배송완료|주문취소|장바구니)/;
const BUSINESS_SUFFIX = /(헤어|미용실|치과|식당|마트|로지스틱스|물류|카페|베이커리|의원|병원|모텔|호텔|빌딩|세탁|주유소|약국|분식|반점)/;

function parsePaymentMock(packageName, title, body) {
  const combined = (title || "") + " " + (body || "");

  // 1. 제외 키워드 필터
  if (NEGATIVE_KEYWORD.test(combined)) {
    return null;
  }

  // 2. 금액 추출
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

  // 3. 서비스 매칭
  let matchedService = null;
  for (const s of KNOWN_SERVICES) {
    for (const alias of s.aliases) {
      const cAlias = alias.toLowerCase().replace(/[^a-zA-Z0-9가-힣]/g, "");
      if (cAlias && compact.includes(cAlias)) {
        matchedService = s;
        break;
      }
    }
    if (matchedService) break;
  }

  // 4. 일반 상호명 후치어 필터 (예: "웨이브헤어")
  if (matchedService) {
    const suffixMatch = combined.match(BUSINESS_SUFFIX);
    if (suffixMatch) {
      for (const alias of matchedService.aliases) {
        if (combined.includes(alias + suffixMatch[1])) {
          return null;
        }
      }
    }
  }

  const hasRecurring = RECURRING_KEYWORD.test(combined);

  // 5. 복합 플랫폼 금액 필수 대조 (Price Matcher)
  if (matchedService?.strict) {
    const isAmountMatched = matchedService.allowedAmounts.includes(amount);
    if (!isAmountMatched && !hasRecurring) {
      return null;
    }
  }

  if (!matchedService && !hasRecurring) {
    return null;
  }

  return {
    serviceName: matchedService ? matchedService.name : "신규 구독",
    category: matchedService ? matchedService.category : "기타",
    amount,
    isSubscription: true,
  };
}

test("신한카드 넷플릭스 17,000원 결제 알림을 정확히 감지한다", () => {
  const parsed = parsePaymentMock(
    "com.shcard.smartpay",
    "[신한카드] 승인안내",
    "09/07 17:00 넷플릭스 17,000원(일시불) 정상승인"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "Netflix");
  assert.equal(parsed.amount, 17000);
  assert.equal(parsed.category, "OTT");
  assert.equal(parsed.isSubscription, true);
});

test("KB Pay 유튜브 프리미엄 14,900원 결제 알림을 감지한다", () => {
  const parsed = parsePaymentMock(
    "com.kbcard.cxh.appcode",
    "KB Pay 결제완료",
    "유튜브 14,900원 결제완료 (매월 정기결제)"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "YouTube Premium");
  assert.equal(parsed.amount, 14900);
  assert.equal(parsed.isSubscription, true);
});

test("쿠팡 와우 멤버십 7,890원 결제 알림을 감지한다", () => {
  const parsed = parsePaymentMock(
    "com.samsung.android.messaging",
    "[Web발신]",
    "[현대카드] 쿠팡 와우 멤버십 7,890원 결제완료 09/07"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "쿠팡 와우");
  assert.equal(parsed.amount, 7890);
  assert.equal(parsed.category, "쇼핑");
});

test("쿠팡 일반 쇼핑몰 34,000원 결제는 와우 구독으로 오판하지 않고 차단한다 (Price Matcher)", () => {
  const parsed = parsePaymentMock(
    "com.kbcard.cxh.appcode",
    "[KB국민카드] 승인",
    "쿠팡 34,000원 일시불 결제완료 09/08"
  );
  assert.equal(parsed, null);
});

test("쿠팡 34,000원이라도 와우 멤버십 키워드가 명시되면 통과한다", () => {
  const parsed = parsePaymentMock(
    "com.kbcard.cxh.appcode",
    "[KB국민카드] 승인",
    "쿠팡 와우멤버십 연회비 34,000원 결제완료 09/08"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "쿠팡 와우");
  assert.equal(parsed.amount, 34000);
});

test("동음이의어 오프라인 상호(웨이브헤어 미용실) 결제는 차단한다", () => {
  const parsed = parsePaymentMock(
    "com.shcard.smartpay",
    "[신한카드] 결제승인",
    "웨이브헤어 15,000원 일시불 결제 09/08"
  );
  assert.equal(parsed, null);
});

test("결제 취소 및 환불 알림은 구독으로 감지하지 않는다 (Negative Keyword)", () => {
  const parsed = parsePaymentMock(
    "com.shcard.smartpay",
    "[신한카드] 승인취소",
    "넷플릭스 17,000원 결제취소 완료"
  );
  assert.equal(parsed, null);
});

test("카드대금 및 자동이체 알림은 구독으로 감지하지 않는다 (Negative Keyword)", () => {
  const parsed = parsePaymentMock(
    "com.samsung.android.spay",
    "[삼성카드]",
    "이번달 카드대금 250,000원 자동이체 출금완료"
  );
  assert.equal(parsed, null);
});

test("일반 편의점이나 식당 결제는 구독으로 감지하지 않고 무시한다", () => {
  const parsed = parsePaymentMock(
    "com.shcard.smartpay",
    "[신한카드] 승인",
    "GS25 역삼점 4,500원 일시불 결제완료"
  );
  assert.equal(parsed, null);
});

test("달러 결제($20.00 ChatGPT Plus)를 감지하고 환산 금액을 산출한다", () => {
  const parsed = parsePaymentMock(
    "com.hyundaicard.appcard",
    "현대카드 해외승인",
    "OPENAI $20.00 승인완료 (정기과금)"
  );
  assert.ok(parsed);
  assert.equal(parsed.amount, 27000);
  assert.equal(parsed.isSubscription, true);
});

test("웹 환경에서 paymentCapture 권한 체크 시 안전하게 비활성화 상태를 반환한다", async () => {
  const status = await checkPaymentCapturePermission();
  assert.equal(status.hasPermission, false);
  assert.equal(status.isSupported, false);

  const req = await requestPaymentCapturePermission();
  assert.equal(req.status, "UNSUPPORTED");
});

test("딥링크 파라미터가 AddModal 프리필 데이터로 정상 매핑된다", () => {
  const rawUrl = "submate://quick-add?name=Netflix&amount=17000&plan=%ED%94%84%EB%A6%AC%EB%AF%B8%EC%97%84&method=%EC%8B%A0%ED%95%9C%EC%B9%B4%EB%93%9C&category=OTT&dueDay=8&detectedAt=1788831000000";
  const url = new URL(rawUrl);
  assert.equal(url.protocol, "submate:");
  assert.equal(url.hostname, "quick-add");

  const params = url.searchParams;
  const mapped = {
    name: params.get("name") || "",
    amount: Number(params.get("amount")) || 0,
    plan: params.get("plan") || "",
    paymentMethod: params.get("method") || "",
    category: params.get("category") || "기타",
    dueDay: Number(params.get("dueDay")) || 0,
    sourceType: "sms",
    autoDetected: true,
  };

  assert.equal(mapped.name, "Netflix");
  assert.equal(mapped.amount, 17000);
  assert.equal(mapped.plan, "프리미엄");
  assert.equal(mapped.paymentMethod, "신한카드");
  assert.equal(mapped.category, "OTT");
  assert.equal(mapped.dueDay, 8);
  assert.equal(mapped.sourceType, "sms");
  assert.equal(mapped.autoDetected, true);
});


test("실제 KB국민카드 유튜브 구글 알림톡 형식(GOOGLE*YouTube 14,900원)을 감지한다", () => {
  const parsed = parsePaymentMock(
    "com.kbcard.cxh.appcode",
    "[KB국민카드] 승인알림",
    "홍*동님 KB국민카드 ****-1234 일시: 2026.09.08 10:30 금액: 14,900원 가맹점: GOOGLE*YouTube 승인번호: 123456"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "YouTube Premium");
  assert.equal(parsed.amount, 14900);
});

test("실제 신한카드 표준 결제알림 포맷(가맹점: 넷플릭스 17,000원)을 감지한다", () => {
  const parsed = parsePaymentMock(
    "com.shcard.smartpay",
    "[신한카드] 승인",
    "홍길동님 일시불 17,000원 가맹점: 넷플릭스 승인일시: 2026.09.08 14:32 카드번호: ****1234"
  );
  assert.ok(parsed);
  assert.equal(parsed.serviceName, "Netflix");
  assert.equal(parsed.amount, 17000);
});
