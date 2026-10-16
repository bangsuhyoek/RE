import assert from "node:assert/strict";
import test from "node:test";
import {
  applyConversationContext,
  assessDetectedPayment,
  assessRefund,
  buildRenewalResponse,
  buildRefundDraft,
  calculateMonthlyTotal,
  calculateYearlyTotal,
  createApprovalRequest,
  createEvidenceCase,
  decideApproval,
  detectPaymentChannel,
  findSubscriptionInText,
  formatEvidenceSummary,
  getLastChargeDate,
  mergeApproval,
  parseAgentIntent,
  runAgent,
} from "../src/lib/subscriptionAgent.js";
import { normalizeInterpretation } from "../api/_lib/agentInterpretation.js";
import { mergeServerApprovals } from "../src/lib/approvalStore.js";

const NOW = new Date(2026, 9, 1, 10, 0, 0); // 2026-10-01 10:00

const subs = [
  { subscriptionId: "seed-netflix", id: "netflix", name: "Netflix", plan: "Standard 4K", amount: 17000, dueDay: 28, billingCycle: "매월", paymentMethod: "신한카드 ****4521", cancelUrl: "https://www.netflix.com/cancelplan" },
  { subscriptionId: "seed-spotify", id: "spotify", name: "Spotify", plan: "Individual", amount: 10900, dueDay: 2, billingCycle: "매월", paymentMethod: "신한카드 ****4521", cancelUrl: "https://www.spotify.com/account/cancel/" },
  { subscriptionId: "seed-chatgpt", id: "chatgpt", name: "ChatGPT Plus", plan: "Plus", amount: 27000, dueDay: 4, billingCycle: "매월", paymentMethod: "현대카드 ****8821", cancelUrl: "https://chatgpt.com/#settings" },
  { subscriptionId: "seed-icloud", id: "icloud", name: "iCloud+", plan: "200GB", amount: 1200, dueDay: 20, billingCycle: "매월", paymentMethod: "카카오페이", cancelUrl: "https://support.apple.com/HT207594" },
];

test("한국어 요청에서 의도와 구독을 찾는다", () => {
  assert.deepEqual(
    { ...parseAgentIntent("넷플릭스 해지하고 환불 받아줘", subs), subscription: parseAgentIntent("넷플릭스 해지하고 환불 받아줘", subs).subscription.id },
    { intent: "cancel_refund", subscription: "netflix" },
  );
  assert.equal(parseAgentIntent("챗지피티 그만 쓸래", subs).intent, "cancel");
  assert.equal(parseAgentIntent("챗지피티 그만 쓸래", subs).subscription.id, "chatgpt");
  assert.equal(parseAgentIntent("스포티파이 환불", subs).intent, "refund");
  assert.equal(parseAgentIntent("이번 주 결제 예정 알려줘", subs).intent, "upcoming");
  assert.equal(parseAgentIntent("안녕", subs).intent, "unknown");
});

test("결제 경로를 판단한다: Apple 결제 서비스, 앱스토어, 구글플레이, 통신사, 웹", () => {
  assert.equal(detectPaymentChannel(subs[3]), "app_store");
  assert.equal(detectPaymentChannel({ id: "x", paymentMethod: "App Store" }), "app_store");
  assert.equal(detectPaymentChannel({ id: "x", paymentMethod: "Google Play 결제" }), "google_play");
  assert.equal(detectPaymentChannel({ id: "x", paymentMethod: "SKT 휴대폰 결제" }), "carrier");
  assert.equal(detectPaymentChannel(subs[0]), "web");
});

test("최근 결제일과 청약철회 7일 기준으로 환불 가능성을 나눈다", () => {
  const last = getLastChargeDate(subs[0], NOW);
  assert.equal(last.getMonth(), 8);
  assert.equal(last.getDate(), 28);
  assert.equal(assessRefund({ daysSinceCharge: 3 }).level, "possible");
  assert.equal(assessRefund({ daysSinceCharge: 8, serviceName: "Netflix" }).level, "review");
  assert.equal(assessRefund({ daysSinceCharge: null }).level, "unknown");
});

test("환불 요청서에는 카드 끝 4자리만 들어간다", () => {
  const draft = buildRefundDraft({ subscription: { ...subs[0], paymentMethod: "신한카드 1234-5678-9012-4521" }, lastChargeDate: new Date(2026, 8, 28) });
  assert.match(draft.ko, /끝자리 4521/);
  assert.match(draft.en, /ending in 4521/);
  assert.match(draft.en, /Charge date: 2026-09-28/);
  assert.doesNotMatch(draft.ko + draft.en, /1234|5678|9012/);
});

test("해지+환불 요청은 승인 카드와 환불 요청서를 함께 만든다", () => {
  const response = runAgent({ text: "넷플릭스 해지하고 환불 받아줘", subscriptions: subs, now: NOW });
  assert.equal(response.type, "action");
  assert.equal(response.approval.status, "pending");
  assert.equal(response.steps.length, 2);
  assert.equal(response.refund.assessment.level, "possible");
  assert.equal(response.refund.requestTo, "Netflix 고객센터");
});

test("검증된 정책이 있는 서비스는 출처를 보여준다", () => {
  const response = runAgent({ text: "챗지피티 환불", subscriptions: subs, now: NOW });
  assert.ok(response.policy.sourceUrl.startsWith("https://help.openai.com/"));
  const netflix = runAgent({ text: "넷플릭스 환불", subscriptions: subs, now: NOW });
  assert.ok(netflix.policy.sourceUrl.startsWith("https://help.netflix.com/"));
  // Apple이 청구하는 구독은 Apple 환불 안내를 출처로 보여준다.
  const icloud = runAgent({ text: "아이클라우드 환불", subscriptions: subs, now: NOW });
  assert.ok(icloud.policy.sourceUrl.startsWith("https://support.apple.com/"));
});

test("구독을 특정하지 못하면 되묻고, AI 해석은 목록 안의 구독만 쓴다", () => {
  const clarify = runAgent({ text: "그거 해지해줘", subscriptions: subs, now: NOW });
  assert.equal(clarify.type, "clarify");
  const resolved = runAgent({ text: "그거 해지해줘", subscriptions: subs, now: NOW, interpretation: { intent: "cancel", subscriptionId: "seed-spotify" } });
  assert.equal(resolved.type, "action");
  assert.equal(resolved.serviceName, "Spotify");
});

test("결제 예정 요청은 7일 안의 결제마다 갱신 승인 카드를 만든다", () => {
  const response = runAgent({ text: "이번 주 결제 예정 알려줘", subscriptions: subs, now: NOW });
  assert.equal(response.type, "upcoming");
  assert.deepEqual(response.items.map((item) => item.serviceName), ["Spotify", "ChatGPT Plus"]);
  assert.equal(response.items[0].approval.kind, "renewal");
});

test("승인 요청은 한 번만 결정할 수 있고, 기한이 지나면 만료된다", () => {
  const request = createApprovalRequest({ kind: "renewal", subscription: subs[1], now: NOW, dueAt: new Date(2026, 9, 2, 23, 59, 59) });
  const first = decideApproval(request, "allow_once", NOW);
  assert.equal(first.ok, true);
  assert.equal(first.request.status, "approved_once");
  const second = decideApproval(first.request, "deny", NOW);
  assert.equal(second.ok, false);
  assert.equal(second.reason, "already_decided");

  let store = mergeApproval({}, first.request);
  store = mergeApproval(store, request);
  assert.equal(store[request.id].status, "approved_once");

  const late = decideApproval(request, "allow_once", new Date(2026, 9, 3));
  assert.equal(late.ok, false);
  assert.equal(late.request.status, "expired");
  assert.equal(decideApproval(request, "pay_now", NOW).reason, "invalid_decision");
});

test("AI 해석 결과는 허용된 의도와 사용자 구독 id만 통과시킨다", () => {
  const services = [{ id: "seed-netflix", name: "Netflix" }];
  assert.deepEqual(normalizeInterpretation('{"intent":"cancel","subscriptionId":"seed-netflix"}', services), { intent: "cancel", subscriptionId: "seed-netflix" });
  assert.deepEqual(normalizeInterpretation('{"intent":"pay","subscriptionId":"hacker"}', services), { intent: "unknown", subscriptionId: null });
  assert.deepEqual(normalizeInterpretation("not json", services), { intent: "unknown", subscriptionId: null });
});

// ---------- 결제 감지 경고·알림 승인 카드·서버 결정 병합 ----------

test("요금 인상: 등록 금액보다 많이 결제되면 경고하고, 같은 금액이면 경고하지 않는다", () => {
  const detected = { name: "넷플릭스", serviceId: "netflix", amount: 19000, paymentMethod: "신한카드 4521", detectedAt: NOW.toISOString() };
  const alert = assessDetectedPayment({ detected, subscriptions: subs, now: NOW });
  assert.equal(alert.type, "alert");
  assert.equal(alert.kind, "price_increase");
  assert.equal(alert.previousAmount, 17000);
  assert.equal(alert.approval.kind, "price_increase");
  assert.equal(alert.approval.subscriptionId, "seed-netflix");
  assert.equal(assessDetectedPayment({ detected: { ...detected, amount: 17000 }, subscriptions: subs, now: NOW }), null);
  assert.equal(assessDetectedPayment({ detected: { ...detected, amount: 9000 }, subscriptions: subs, now: NOW }), null);
});

test("공동 이용 구독은 1인 부담금이 아니라 카드에 찍히는 전체 금액과 비교한다", () => {
  const shared = [{ ...subs[0], amount: 4250, grossAmount: 17000, sharingEnabled: true, shareCount: 4 }];
  const detected = { name: "Netflix", serviceId: "netflix", amount: 17000, detectedAt: NOW.toISOString() };
  assert.equal(assessDetectedPayment({ detected, subscriptions: shared, now: NOW }), null);
});

test("무료체험으로 등록된 구독에서 결제되면 유료 전환 경고를 만든다", () => {
  const trial = [{ ...subs[1], amount: 0, isTrial: true, status: "trial" }];
  const alert = assessDetectedPayment({ detected: { name: "Spotify", serviceId: "spotify", amount: 10900, detectedAt: NOW.toISOString() }, subscriptions: trial, now: NOW });
  assert.equal(alert.kind, "trial_conversion");
  assert.equal(alert.approval.kind, "trial_conversion");
});

test("해지 기록 이후 같은 서비스 결제는 해지 후 결제로 보고 환불 요청서를 만든다", () => {
  const cancelHistory = [{ id: "disney", serviceId: "disney", name: "디즈니+", amount: 9900, paymentMethod: "현대카드 8821", cancelledAt: new Date(2026, 8, 20).toISOString() }];
  const detected = { name: "디즈니플러스", serviceId: "disney", amount: 9900, paymentMethod: "현대카드 8821", detectedAt: NOW.toISOString() };
  const alert = assessDetectedPayment({ detected, subscriptions: subs, cancelHistory, now: NOW });
  assert.equal(alert.kind, "charged_after_cancel");
  assert.equal(alert.approval, null);
  assert.match(alert.refund.draft.ko, /해지했는데 이후 결제/);
  assert.match(alert.refund.draft.ko, /8821/);
  // 해지보다 먼저 일어난 결제는 해지 후 결제가 아니다.
  const before = { ...detected, detectedAt: new Date(2026, 8, 1).toISOString() };
  assert.equal(assessDetectedPayment({ detected: before, subscriptions: subs, cancelHistory, now: NOW }), null);
});

test("증빙 기록에는 경과가 시간순으로 들어가고 카드번호는 끝 4자리만 남는다", () => {
  const cancelHistory = [{ id: "disney", serviceId: "disney", name: "디즈니+", amount: 9900, cancelledAt: new Date(2026, 8, 20).toISOString() }];
  const alert = assessDetectedPayment({
    detected: { name: "디즈니", serviceId: "disney", amount: 9900, paymentMethod: "현대카드 1234-5678-9012-8821", detectedAt: NOW.toISOString() },
    subscriptions: subs, cancelHistory, now: NOW,
  });
  const summary = formatEvidenceSummary(createEvidenceCase(alert, NOW));
  assert.ok(summary.indexOf("해지 기록") < summary.indexOf("결제 알림"));
  assert.match(summary, /8821/);
  assert.doesNotMatch(summary, /5678/);
});

test("결제 사전 알림으로 연 승인 카드는 대화에서 만든 카드와 같은 요청으로 묶인다", () => {
  const fromNotification = buildRenewalResponse({ subscription: subs[1], now: NOW });
  const fromChat = runAgent({ text: "이번 주 결제 예정 알려줘", subscriptions: subs, now: NOW });
  const chatItem = fromChat.items.find((item) => item.subscriptionId === "seed-spotify");
  assert.equal(fromNotification.items[0].approval.id, chatItem.approval.id);
  assert.match(fromNotification.summary, /내일 Spotify/);
  const trialCard = buildRenewalResponse({ subscription: { ...subs[1], isTrial: true }, now: NOW });
  assert.equal(trialCard.items[0].approval.kind, "trial_conversion");
});

test("서버에서 확정된 결정이 기기 기록보다 우선하고, 서버의 대기 상태가 기기 결정을 지우지 않는다", () => {
  const row = { idempotency_key: "renewal:a:2026-10-02", kind: "renewal", subscription_id: "a", service_name: "A", amount_krw: 1000, previous_amount_krw: null, due_at: "2026-10-02T14:59:59.000Z", status: "declined", decided_at: "2026-10-01T01:00:00.000Z", created_at: "2026-10-01T00:00:00.000Z" };
  const local = { [row.idempotency_key]: { id: row.idempotency_key, status: "approved_once", decidedAt: "2026-10-01T02:00:00.000Z" } };
  assert.equal(mergeServerApprovals(local, [row])[row.idempotency_key].status, "declined");
  const pendingRow = { ...row, status: "pending", decided_at: null };
  assert.equal(mergeServerApprovals(local, [pendingRow])[row.idempotency_key].status, "approved_once");
});

// ---------- 신규 의도(spending, top_cost, unused, service_info) 검증 ----------

test("신규 의도 파싱: spending, top_cost, unused, service_info", () => {
  assert.equal(parseAgentIntent("이번 달 총 지출 얼마야?", subs).intent, "spending");
  assert.equal(parseAgentIntent("한 달에 구독료 총 얼마 나가?", subs).intent, "spending");
  assert.equal(parseAgentIntent("가장 비싼 구독이 뭐야?", subs).intent, "top_cost");
  assert.equal(parseAgentIntent("제일 비싼 거 알려줘", subs).intent, "top_cost");
  assert.equal(parseAgentIntent("안 쓰는 구독 있어?", subs).intent, "unused");
  assert.equal(parseAgentIntent("넷플릭스 얼마야?", subs).intent, "service_info");
  assert.equal(parseAgentIntent("넷플릭스 결제수단 뭐야?", subs).intent, "service_info");
  assert.equal(parseAgentIntent("넷플릭스 결제일 언제야?", subs).intent, "service_info");
  // 환불 및 해지 키워드 우선순위 유지
  assert.equal(parseAgentIntent("넷플릭스 얼마 환불돼?", subs).intent, "refund");
  assert.equal(parseAgentIntent("넷플릭스 얼마 환불돼?", subs).subscription.id, "netflix");
});

test("spending 의도: 홈 화면과 동일한 월 지출 합산 및 연간 지출 계산", () => {
  const testSubs = [
    ...subs,
    { subscriptionId: "seed-dropbox", id: "dropbox", name: "Dropbox", amount: 120000, billingCycle: "매년" },
  ];
  // 홈 화면 계산식: sub.billingCycle === "매년" ? Math.round(sub.amount / 12) : sub.amount
  const homeMonthly = testSubs.reduce((sum, sub) => {
    const amt = sub.billingCycle === "매년" ? Math.round(sub.amount / 12) : sub.amount;
    return sum + amt;
  }, 0);
  const homeYearly = testSubs.reduce((sum, sub) => {
    const amt = sub.billingCycle === "매년" ? sub.amount : sub.amount * 12;
    return sum + amt;
  }, 0);

  assert.equal(calculateMonthlyTotal(testSubs), homeMonthly);
  assert.equal(calculateYearlyTotal(testSubs), homeYearly);

  const res = runAgent({ text: "한 달 총 지출 얼마야?", subscriptions: testSubs, now: NOW });
  assert.equal(res.type, "spending");
  assert.equal(res.monthly, homeMonthly);
  assert.equal(res.yearly, homeYearly);
  assert.equal(res.count, testSubs.length);
});

test("top_cost 의도: 월 환산 기준 상위 3개 구독 반환", () => {
  const testSubs = [
    { subscriptionId: "s1", id: "sub1", name: "싼 거", amount: 3000, billingCycle: "매월" },
    { subscriptionId: "s2", id: "sub2", name: "중간 거", amount: 10000, billingCycle: "매월" },
    { subscriptionId: "s3", id: "sub3", name: "비싼 연간", amount: 240000, billingCycle: "매년" }, // 월 20,000
    { subscriptionId: "s4", id: "sub4", name: "가장 비싼 월간", amount: 25000, billingCycle: "매월" },
  ];
  const res = runAgent({ text: "가장 비싼 구독 3개 알려줘", subscriptions: testSubs, now: NOW });
  assert.equal(res.type, "top_cost");
  assert.equal(res.items.length, 3);
  assert.equal(res.items[0].name, "가장 비싼 월간"); // 25,000
  assert.equal(res.items[1].name, "비싼 연간"); // 20,000
  assert.equal(res.items[2].name, "중간 거"); // 10,000
});

test("unused 의도: 사용 체크 답변이 없을 때와 있을 때의 처리", () => {
  const emptyRes = runAgent({ text: "안 쓰는 구독 있어?", subscriptions: subs, now: NOW, usageAnswers: {} });
  assert.equal(emptyRes.type, "unused");
  assert.equal(emptyRes.hasRecords, false);
  assert.match(emptyRes.summary, /사용 체크 답변이 없어요/);

  const usageAnswers = {
    "seed-netflix@2026-09-28": { answer: "unused", subscriptionId: "seed-netflix" },
    "seed-netflix@2026-08-28": { answer: "unused", subscriptionId: "seed-netflix" },
    "seed-spotify@2026-09-02": { answer: "used", subscriptionId: "seed-spotify" },
  };
  const answeredRes = runAgent({ text: "안 쓰는 구독 찾아줘", subscriptions: subs, now: NOW, usageAnswers });
  assert.equal(answeredRes.type, "unused");
  assert.equal(answeredRes.hasRecords, true);
  assert.equal(answeredRes.items.length, 1);
  assert.equal(answeredRes.items[0].name, "Netflix");
  assert.equal(answeredRes.items[0].streak, 2);
});

test("service_info 의도: 특정 구독의 금액, 다음 결제일, 결제수단 안내 및 미지정 시 clarify", () => {
  const res = runAgent({ text: "넷플릭스 얼마야?", subscriptions: subs, now: NOW });
  assert.equal(res.type, "service_info");
  assert.equal(res.serviceName, "Netflix");
  assert.equal(res.amount, 17000);
  assert.match(res.paymentMethod, /신한카드/);
  assert.match(res.paymentMethod, /4521/);
  assert.ok(res.nextPaymentDate);

  // 구독명이 없고 단기 기억도 없으면 unknown으로 떨어져 AI fallback 또는 일반 안내가 처리
  const unknownRes = runAgent({ text: "얼마야?", subscriptions: subs, now: NOW });
  assert.equal(unknownRes.type, "unknown");

  // AI 해석이나 컨텍스트를 통해 service_info로 판별되었으나 subscription이 비어 있는 경우 clarify
  const clarifyRes = runAgent({ text: "얼마야?", subscriptions: subs, now: NOW, interpretation: { intent: "service_info", subscriptionId: null } });
  assert.equal(clarifyRes.type, "clarify");
  assert.equal(clarifyRes.intent, "service_info");
});

// ---------- 단기 대화 컨텍스트 규칙 (a, b, c) 검증 ----------

test("단기 대화 컨텍스트 규칙: (a) 참조어와 lastSubscriptionId가 있으면 해당 구독 사용", () => {
  const context = { lastSubscriptionId: "seed-netflix", lastIntent: "service_info" };
  const parsed = parseAgentIntent("그거 해지해줘", subs);
  const applied = applyConversationContext(parsed, context, subs, "그거 해지해줘");
  assert.equal(applied.intent, "cancel");
  assert.equal(applied.subscription.id, "netflix");

  const res = runAgent({ text: "그거 해지해줘", subscriptions: subs, now: NOW, context });
  assert.equal(res.type, "action");
  assert.equal(res.serviceName, "Netflix");
  assert.equal(res.approval.status, "pending");
});

test("단기 대화 컨텍스트 규칙: (b) 구독은 있지만 intent가 unknown이고 lastIntent가 재사용 가능이면 재사용", () => {
  const context = { lastSubscriptionId: "seed-netflix", lastIntent: "cancel" };
  const parsed = parseAgentIntent("스포티파이는?", subs);
  assert.equal(parsed.intent, "unknown");
  assert.equal(parsed.subscription.id, "spotify");

  const applied = applyConversationContext(parsed, context, subs, "스포티파이는?");
  assert.equal(applied.intent, "cancel");
  assert.equal(applied.subscription.id, "spotify");

  const res = runAgent({ text: "스포티파이는?", subscriptions: subs, now: NOW, context });
  assert.equal(res.type, "action");
  assert.equal(res.serviceName, "Spotify");
  assert.equal(res.intent, "cancel");
});

test("단기 대화 컨텍스트 규칙: (c) 변경 없음 및 clarify 시 이전 구독이 최상단 옵션으로 정렬", () => {
  const context = { lastSubscriptionId: "seed-icloud", lastIntent: "cancel" };
  // 일반 대화에서는 변경 없음
  const res = runAgent({ text: "해지해줘", subscriptions: subs, now: NOW, context });
  assert.equal(res.type, "clarify");
  // context의 lastSubscriptionId인 seed-icloud가 첫 번째 옵션에 와야 함
  assert.equal(res.options[0].id, "seed-icloud");
  assert.equal(res.options[0].name, "iCloud+");
});

// ---------- SERVICE_ALIAS_CATALOG 연동 및 별칭 매칭 / 쿠팡 모호성 검증 ----------

test("SERVICE_ALIAS_CATALOG 기반 별칭 매칭 및 쿠팡플레이 vs 쿠팡 와우 모호성 해결", () => {
  const testSubs = [
    { subscriptionId: "seed-coupang", id: "coupang", name: "쿠팡 와우" },
    { subscriptionId: "seed-coupangplay", id: "coupangplay", name: "쿠팡플레이" },
    { subscriptionId: "seed-claude", id: "claude", name: "Claude" },
  ];

  assert.equal(findSubscriptionInText("쿠팡플레이 해지해줘", testSubs)?.id, "coupangplay");
  assert.equal(findSubscriptionInText("쿠팡플레이 결제일 언제야", testSubs)?.id, "coupangplay");
  assert.equal(findSubscriptionInText("쿠플 환불", testSubs)?.id, "coupangplay");
  assert.equal(findSubscriptionInText("쿠팡 와우 해지해줘", testSubs)?.id, "coupang");
  assert.equal(findSubscriptionInText("쿠팡 해지해줘", testSubs)?.id, "coupang");
  assert.equal(findSubscriptionInText("클로드 해지해줘", testSubs)?.id, "claude");
});

test("일반 단어 오탐 방지: 구독명이 없으면 service_info가 아닌 unknown으로 처리", () => {
  assert.equal(parseAgentIntent("카드 등록 어떻게 해?", subs).intent, "unknown");
  assert.equal(parseAgentIntent("내 정보 수정", subs).intent, "unknown");
  assert.equal(parseAgentIntent("시간 낭비야", subs).intent, "unknown");
  assert.equal(parseAgentIntent("비용 처리 어떻게 해?", subs).intent, "unknown");
  assert.equal(parseAgentIntent("결제수단 추가", subs).intent, "unknown");

  // 구독명이 명시되면 정상적으로 service_info로 인식
  assert.equal(parseAgentIntent("넷플릭스 결제일 언제야", subs).intent, "service_info");
  assert.equal(parseAgentIntent("넷플릭스 결제일 언제야", subs).subscription.id, "netflix");
});

test("spending 합산 일치: calculateMonthlyTotal과 HomeScreen의 계산 결과가 항상 일치하며 cancelled 제외", () => {
  const testSubs = [
    { subscriptionId: "s1", id: "netflix", name: "Netflix", amount: 17000, billingCycle: "매월", status: "active" },
    { subscriptionId: "s2", id: "dropbox", name: "Dropbox", amount: 120000, billingCycle: "매년", status: "active" },
    { subscriptionId: "s3", id: "tving", name: "TVING", amount: 5500, billingCycle: "매월", status: "cancelled" },
  ];

  const monthly = calculateMonthlyTotal(testSubs);
  const yearly = calculateYearlyTotal(testSubs);

  // active만 반영되어야 함: 17000 + 10000 = 27000 (cancelled인 5500 제외)
  assert.equal(monthly, 27000);
  assert.equal(yearly, 17000 * 12 + 120000);

  const res = runAgent({ text: "총 지출 얼마야?", subscriptions: testSubs, now: NOW });
  assert.equal(res.monthly, monthly);
  assert.equal(res.yearly, yearly);
  assert.equal(res.count, 2);
});
