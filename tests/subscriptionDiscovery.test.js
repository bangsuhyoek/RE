import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDiscoveredSubscriptions,
  createSubscriptionId,
  inferServiceByPriceFingerprint,
  scanHubPageText,
  scanStatementText,
  SUBSCRIPTION_HUBS,
} from "../src/lib/subscriptionDiscovery.js";
import { sharedTextToDetected } from "../src/lib/shareIntake.js";

test("월 14만 원 Claude 결제는 금액이 커도 월간으로 분류하고, 주기 근거가 없음을 표시한다", () => {
  const { items } = scanStatementText("2026.10.10 [신한카드] Claude 140,000원 일시불 승인", { now: new Date(2026, 9, 19) });
  assert.equal(items.length, 1);
  assert.equal(items[0].serviceId, "claude-pro");
  assert.equal(items[0].billingCycle, "매월");
  assert.equal(items[0].nextBillingDate, null);
  assert.equal(items[0].cycleConfirmed, false);
});

test("주기 표시가 없어도 서비스의 연간 요금제 가격과 같으면 연간으로, 월간 요금제 가격이면 월간으로 판정한다", () => {
  const { items } = scanStatementText(
    ["2026.03.02 신한카드 승인 디즈니플러스 99,000원", "2026.10.05 신한카드 승인 넷플릭스 17,000원"].join("\n"),
    { now: new Date(2026, 9, 19) }
  );
  const byId = Object.fromEntries(items.map((item) => [item.serviceId, item]));
  assert.equal(byId.disney.billingCycle, "매년");
  assert.equal(byId.disney.nextBillingDate, "2027-03-02");
  assert.equal(byId.netflix.billingCycle, "매월");
  assert.equal(byId.netflix.cycleConfirmed, true);
});

test("숨은 구독 일괄 등록은 같은 순간에 만든 5건에도 모두 다른 ID 를 붙인다", () => {
  const items = ["넷플릭스", "티빙", "왓챠", "멜론", "마이폼 노트"].map((name, index) => ({ name, plan: "기본 플랜", amount: 1000 + index }));
  const { records, skippedCount } = buildDiscoveredSubscriptions(items, [], { now: new Date(2026, 9, 19) });
  assert.equal(records.length, 5);
  assert.equal(skippedCount, 0);
  assert.equal(new Set(records.map((r) => r.subscriptionId)).size, 5);
  assert.equal(new Set(records.map((r) => r.id)).size, 5);
});

test("randomUUID 가 없는 환경에서도 연달아 만든 구독 ID 가 겹치지 않는다", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { value: {}, configurable: true });
  try {
    const ids = Array.from({ length: 50 }, () => createSubscriptionId());
    assert.equal(new Set(ids).size, 50);
  } finally {
    Object.defineProperty(globalThis, "crypto", original);
  }
});

test("일괄 등록은 이미 있는 구독과 묶음 안에서 반복된 구독을 한 번만 넣는다", () => {
  const catalog = [
    { id: "netflix", name: "Netflix", category: "OTT", monogram: "N", cancelUrl: "https://netflix.com" },
    { id: "youtube", name: "YouTube Premium", category: "OTT", monogram: "Y", cancelUrl: "https://youtube.com" },
  ];
  const existing = [{ subscriptionId: "a", id: "netflix", serviceId: "netflix", name: "Netflix", plan: "스탠다드", status: "active" }];
  const items = [
    { serviceId: "netflix", name: "Netflix", plan: "프리미엄", amount: 17000 },
    { serviceId: "youtube", name: "YouTube Premium", plan: "개인 멤버십", amount: 14900 },
    { serviceId: "youtube", name: "YouTube Premium", plan: "개인 멤버십", amount: 14900 },
    { serviceId: "", name: "마이폼 노트", plan: "기본 플랜", amount: 3300 },
    { serviceId: "", name: "마이폼 노트", plan: "기본 플랜", amount: 3300 },
  ];
  const { records, skippedCount } = buildDiscoveredSubscriptions(items, existing, { catalog, now: new Date(2026, 9, 19) });
  assert.deepEqual(records.map((r) => r.name), ["YouTube Premium", "마이폼 노트"]);
  assert.equal(skippedCount, 3);
  assert.equal(records[0].id, "youtube");
  assert.equal(records[0].cancelUrl, "https://youtube.com");
  assert.match(records[1].id, /^custom-/);
  assert.match(records[1].subscriptionId, /^manual-/);
});

test("모달에서 연간으로 바꾼 항목은 결제 내역 날짜로 다음 결제일을 채운다", () => {
  const { records } = buildDiscoveredSubscriptions(
    [{ serviceId: "claude-pro", name: "Claude Pro", plan: "Max", amount: 140000, billingCycle: "매년", nextBillingDate: null, annualNextBillingDate: "2027-10-10" }],
    [],
    { now: new Date(2026, 9, 19) }
  );
  assert.equal(records[0].billingCycle, "매년");
  assert.equal(records[0].nextBillingDate, "2027-10-10");
});

test("PG사/인앱결제 마스킹('구글플레이 14,900원')을 가격 지문으로 YouTube Premium에 매칭한다", () => {
  const spec = inferServiceByPriceFingerprint(14900);
  assert.ok(spec);
  assert.equal(spec.id, "youtube");
  assert.equal(spec.name, "YouTube Premium");
});

test("동일 가격대(9,900원) 후보가 여러 개일 때 기기에 설치된 앱(millie)을 최우선으로 특정한다", () => {
  const spec = inferServiceByPriceFingerprint(9900, ["millie"]);
  assert.ok(spec);
  assert.equal(spec.id, "millie");
  assert.equal(spec.name, "밀리의 서재");
});

test("명세서·결제내역 텍스트 일괄 스캔 시 일반 쇼핑/편의점 결제는 걸러내고 구독만 추출한다", () => {
  const sampleStatement = [
    "2026.10.01 신한카드 승인 GS25역삼점 4,500원 일시불",
    "2026.10.03 신한카드 승인 쿠팡 34,200원 일시불",
    "2026.10.05 신한카드 승인 넷플릭스 17,000원 일시불",
    "2026.10.07 KB국민카드 승인 구글플레이 14,900원 일시불",
    "2026.10.09 현대카드 승인 쿠팡(와우멤버십) 7,890원 일시불",
    "2026.10.11 토스페이 결제 네이버파이낸셜 4,900원",
    "2026.10.12 신한카드 승인취소 왓챠 7,900원",
  ].join("\n");

  const result = scanStatementText(sampleStatement, {
    installedServiceIds: ["youtube", "netflix"],
  });

  const ids = result.items.map((item) => item.serviceId);
  assert.deepEqual(ids, ["netflix", "youtube", "coupang", "naver"]);

  const yt = result.items.find((item) => item.serviceId === "youtube");
  assert.equal(yt.amount, 14900);
  assert.equal(yt.dueDay, 7);
});

test("카탈로그에 없는 생소한 서비스라도 명세서에서 2회 이상 동일 금액 반복 결제되면 정기구독으로 잡아낸다", () => {
  const sampleStatement = [
    "2026.08.15 신한카드 승인 어썸뉴스레터 5,900원 일시불",
    "2026.09.15 신한카드 승인 어썸뉴스레터 5,900원 일시불",
    "2026.10.15 신한카드 승인 어썸뉴스레터 5,900원 일시불",
    "2026.10.16 신한카드 승인 스타벅스 4,500원 일시불",
  ].join("\n");

  const result = scanStatementText(sampleStatement);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].name, "어썸뉴스레터");
  assert.equal(result.items[0].amount, 5900);
  assert.equal(result.items[0].occurrences, 3);
});

test("무료 체험 시작 알림/문자를 0원 체험 구독으로 감지한다", () => {
  const sample = "[Google Play] Duolingo Super 무료 체험이 시작되었습니다. 10월 25일 체험 종료 후 월 14,000원 자동결제";
  const result = scanStatementText(sample);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].serviceId, "duolingo-super");
  assert.equal(result.items[0].isTrial, true);
});

test("공유받은 익명 인앱결제 문자('[KB국민카드] 구글플레이 14,900원 승인')도 가격 지문으로 유튜브 프리미엄을 자동 채운다", () => {
  const detected = sharedTextToDetected("[KB국민카드] 구글플레이 14,900원 일시불 승인 10/12");
  assert.ok(detected);
  assert.equal(detected.serviceId, "youtube");
  assert.equal(detected.name, "YouTube Premium");
  assert.equal(detected.amount, 14900);
});

test("5대 결제 허브 바로가기 목록이 정의되어 있다", () => {
  assert.ok(SUBSCRIPTION_HUBS.length >= 5);
  assert.ok(SUBSCRIPTION_HUBS.some((h) => h.id === "google-play"));
  assert.ok(SUBSCRIPTION_HUBS.some((h) => h.id === "naver-pay"));
});

test("구글 플레이 정기 결제 화면 글에서 활성 구독만 읽고, 취소된 구독은 빼고, 연간 구독은 다음 결제일을 채운다", () => {
  const page = [
    "정기 결제",
    "활성",
    "YouTube Premium",
    "₩14,900/월",
    "다음 결제일: 2026. 11. 5.",
    "구독 취소",
    "Duolingo Super",
    "₩89,000/년",
    "다음 결제일: 2027. 3. 2.",
    "관리",
    "밀리의 서재",
    "₩9,900/월",
    "취소됨 · 2026. 10. 30.에 만료",
    "마이폼 노트",
    "₩3,300/월",
    "다음 결제일: 2026. 11. 12.",
  ].join("\n");

  const { items } = scanHubPageText(page, { hubName: "Google Play 정기 결제", now: new Date(2026, 9, 19) });
  const byName = Object.fromEntries(items.map((item) => [item.serviceId || item.name, item]));

  assert.deepEqual(Object.keys(byName).sort(), ["duolingo-super", "youtube", "마이폼 노트"].sort());
  assert.equal(byName.youtube.amount, 14900);
  assert.equal(byName.youtube.dueDay, 5);
  assert.equal(byName.youtube.billingCycle, "매월");
  assert.equal(byName["duolingo-super"].billingCycle, "매년");
  assert.equal(byName["duolingo-super"].nextBillingDate, "2027-03-02");
  assert.equal(byName["마이폼 노트"].amount, 3300);
  assert.equal(byName["마이폼 노트"].dueDay, 12);
});

test("명세서의 연간 결제는 다음 해 같은 날을 다음 결제일로 잡는다", () => {
  const { items } = scanStatementText("2026.03.02 신한카드 승인 듀오링고 연간 89,000원", { now: new Date(2026, 9, 19) });
  assert.equal(items[0].billingCycle, "매년");
  assert.equal(items[0].nextBillingDate, "2027-03-02");
});
