import test from "node:test";
import assert from "node:assert/strict";
import { checkPaymentCapturePermission, requestPaymentCapturePermission } from "../src/lib/paymentCapture.js";

// JS implementation mirror of the native PaymentParser to verify matching rules
const KNOWN_SERVICES = [
  { id: "netflix", name: "Netflix", category: "OTT", aliases: ["netflix", "넷플릭스"] },
  { id: "youtube", name: "YouTube Premium", category: "OTT", aliases: ["youtube", "유튜브"] },
  { id: "coupang", name: "쿠팡 와우", category: "쇼핑", aliases: ["coupang", "쿠팡", "와우멤버십"] },
  { id: "spotify", name: "Spotify", category: "음악", aliases: ["spotify", "스포티파이"] },
  { id: "chatgpt", name: "ChatGPT Plus", category: "AI/생산성", aliases: ["chatgpt", "챗gpt", "openai"] },
  { id: "tving", name: "티빙", category: "OTT", aliases: ["tving", "티빙"] },
  { id: "disney", name: "Disney+", category: "OTT", aliases: ["disney+", "디즈니+", "디즈니플러스"] },
];

const AMOUNT_PATTERN = /([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})\s*원|[$]\s*([0-9]+(?:\.[0-9]{2})?)/i;
const RECURRING_KEYWORD = /(정기|자동결제|정기결제|매월|구독|멤버십|월간)/;

function parsePaymentMock(packageName, title, body) {
  const combined = (title || "") + " " + (body || "");
  const compact = combined.toLowerCase().replace(/[^a-zA-Z0-9가-힣]/g, "");

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

  const hasRecurring = RECURRING_KEYWORD.test(combined);
  if (!matchedService && !hasRecurring) {
    return null; // 일반 일회성 결제는 무시
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
  assert.equal(parsed.serviceName, "ChatGPT Plus");
  assert.equal(parsed.amount, 27000); // 20 * 1350
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
  const rawUrl = "submate://quick-add?name=Netflix&amount=17000&plan=%ED%94%84%EB%A6%AC%EB%AF%B8%EC%97%84&method=%EC%8B%A0%ED%95%9C%EC%B9%B4%EB%93%9C&category=OTT";
  const url = new URL(rawUrl);
  assert.equal(url.protocol, "submate:");
  assert.equal(url.hostname, "quick-add");

  const params = url.searchParams;
  const mapped = {
    name: params.get("name") || "",
    amount: Number(params.get("amount")) || 0,
    plan: params.get("plan") || "",
    paymentMethod: params.get("method") || "카드",
    category: params.get("category") || "기타",
    autoDetected: true,
  };

  assert.equal(mapped.name, "Netflix");
  assert.equal(mapped.amount, 17000);
  assert.equal(mapped.plan, "프리미엄");
  assert.equal(mapped.paymentMethod, "신한카드");
  assert.equal(mapped.category, "OTT");
  assert.equal(mapped.autoDetected, true);
});
