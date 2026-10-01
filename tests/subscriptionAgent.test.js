import assert from "node:assert/strict";
import test from "node:test";
import {
  assessDetectedPayment,
  assessRefund,
  buildRenewalResponse,
  buildRefundDraft,
  createApprovalRequest,
  createEvidenceCase,
  decideApproval,
  detectPaymentChannel,
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
  assert.equal(netflix.policy, null);
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
