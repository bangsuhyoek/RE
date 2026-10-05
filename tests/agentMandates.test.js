import assert from "node:assert/strict";
import test from "node:test";
import {
  createApprovalRequest,
  createMandate,
  decideApproval,
  findApplicableMandate,
  mergeMandates,
  revokeMandate,
} from "../src/lib/subscriptionAgent.js";
import { mapCaseToRow, mergeEvidenceCases } from "../src/lib/evidenceStore.js";

const NOW = new Date(2026, 9, 1, 10, 0, 0);
const DAY = 86_400_000;
const netflix = { subscriptionId: "sub-netflix", id: "netflix", name: "Netflix", amount: 17000 };

const renewal = (amount = 17000, kind = "renewal") => createApprovalRequest({
  kind,
  subscription: netflix,
  amount,
  now: NOW,
  dueAt: new Date(NOW.getTime() + DAY),
});

const mandatesWith = (maxAmount = 17000, now = NOW) => {
  const mandate = createMandate({ subscriptionId: "sub-netflix", serviceName: "Netflix", maxAmount, verifiedWith: "biometric", now });
  return { [mandate.subscriptionId]: mandate };
};

test("항상 허용 범위는 한도 이하 갱신만 자동 허용한다", () => {
  const mandates = mandatesWith(17000);
  const result = decideApproval(renewal(17000), "allow_mandate", NOW, mandates);
  assert.equal(result.ok, true);
  assert.equal(result.request.status, "approved_mandate");
  assert.equal(result.request.mandateId, mandates["sub-netflix"].id);

  assert.equal(decideApproval(renewal(17001), "allow_mandate", NOW, mandates).reason, "mandate_not_applicable");
  assert.equal(decideApproval(renewal(17000, "price_increase"), "allow_mandate", NOW, mandates).reason, "mandate_not_applicable");
  assert.equal(decideApproval(renewal(17000, "trial_conversion"), "allow_mandate", NOW, mandates).reason, "mandate_not_applicable");
  assert.equal(decideApproval(renewal(17000), "allow_mandate", NOW, {}).reason, "mandate_not_applicable");
});

test("해제했거나 1년이 지난 범위는 쓰지 않는다", () => {
  const revoked = revokeMandate(mandatesWith(), "sub-netflix", NOW);
  assert.equal(findApplicableMandate(revoked, renewal(), NOW), null);

  const later = new Date(NOW.getTime() + 366 * DAY);
  const lateRequest = createApprovalRequest({ kind: "renewal", subscription: netflix, now: later, dueAt: new Date(later.getTime() + DAY) });
  assert.equal(findApplicableMandate(mandatesWith(), lateRequest, later), null);
});

test("이미 결정한 요청은 범위가 있어도 바꾸지 않는다", () => {
  const once = decideApproval(renewal(), "allow_once", NOW).request;
  assert.equal(decideApproval(once, "allow_mandate", NOW, mandatesWith()).reason, "already_decided");
});

test("범위 기록은 구독마다 가장 최근에 만들거나 해제한 것이 남는다", () => {
  const local = mandatesWith(17000, NOW);
  const newer = createMandate({ subscriptionId: "sub-netflix", maxAmount: 20000, verifiedWith: "device_credential", now: new Date(NOW.getTime() + DAY) });
  assert.equal(mergeMandates(local, [newer])["sub-netflix"].maxAmount, 20000);

  const revokedLater = revokeMandate({ "sub-netflix": newer }, "sub-netflix", new Date(NOW.getTime() + 2 * DAY))["sub-netflix"];
  assert.ok(mergeMandates({ "sub-netflix": newer }, [revokedLater])["sub-netflix"].revokedAt);
  assert.equal(mergeMandates({ "sub-netflix": revokedLater }, [newer])["sub-netflix"].revokedAt, revokedLater.revokedAt);
});

test("증빙 서버 보관 기간은 기기에서 만든 날부터 1년이다", () => {
  const createdAt = new Date(2026, 0, 15).toISOString();
  const row = mapCaseToRow({ id: "case:x", kind: "price_increase", serviceName: "Netflix", amount: 19000, previousAmount: 17000, createdAt, items: [] });
  assert.equal(new Date(row.expires_at) - new Date(row.created_at), 365 * DAY);
  assert.equal(row.amount_krw, 19000);
});

test("서버 증빙을 합칠 때 같은 항목은 한 번만 남긴다", () => {
  const item = { type: "payment_message", capturedAt: "2026-10-01T01:00:00.000Z", detail: "Netflix 19,000원" };
  const decision = { type: "decision_log", capturedAt: "2026-10-01T02:00:00.000Z", detail: "거절하고 해지 진행", approvalId: "a1" };
  const local = { "case:x": { id: "case:x", kind: "price_increase", items: [item] } };
  const merged = mergeEvidenceCases(local, [{ id: "case:x", kind: "price_increase", items: [item, decision] }]);
  assert.equal(merged["case:x"].items.length, 2);
});
