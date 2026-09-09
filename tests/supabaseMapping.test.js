import test from "node:test";
import assert from "node:assert/strict";
import { mapSubscriptionToDb, mapDbToSubscription } from "../src/lib/supabase.js";

test("mapSubscriptionToDb는 클라이언트 객체를 DB 스키마 컬럼과 snake_case에 맞게 올바르게 매핑한다", () => {
  const sub = {
    id: "netflix",
    subscriptionId: "sub-12345",
    name: "Netflix",
    plan: "프리미엄",
    category: "OTT",
    amount: 17000,
    dueDay: 15,
    billingCycle: "매월",
    paymentMethod: "신한카드",
    cancelUrl: "https://netflix.com/cancel",
    status: "active",
    alertD3: true,
    alertD1: false,
    renewalPending: false,
    monogram: "N",
    markTone: "#E50914",
    nextBillingDate: "2026-09-15",
    renewalReviewedFor: "2026-09",
  };

  const mapped = mapSubscriptionToDb(sub, "user-uuid-1");
  assert.equal(mapped.user_id, "user-uuid-1");
  assert.equal(mapped.subscription_id, "sub-12345");
  assert.equal(mapped.service_id, "netflix");
  assert.equal(mapped.service_name, "Netflix");
  assert.equal(mapped.plan_name, "프리미엄");
  assert.equal(mapped.amount_krw, 17000);
  assert.equal(mapped.due_day, 15);
  assert.equal(mapped.renewal_reviewed_for, "2026-09");
  assert.equal(mapped.monogram, "N");
  assert.equal(mapped.mark_tone, "#E50914");
  assert.equal(mapped.next_billing_date, "2026-09-15");
});

test("mapDbToSubscription은 DB 레코드를 클라이언트 객체로 정확히 복원한다", () => {
  const row = {
    subscription_id: "sub-999",
    service_id: "youtube",
    service_name: "YouTube Premium",
    plan_name: "개인",
    category: "OTT",
    amount_krw: 14900,
    due_day: 20,
    billing_cycle: "매월",
    payment_method: "KB Pay",
    cancel_url: "https://youtube.com/paid_memberships",
    status: "active",
    source_type: "manual",
    alert_d3: true,
    alert_d1: false,
    renewal_pending: false,
    monogram: "Y",
    mark_tone: "#FF0000",
    next_billing_date: "2026-09-20",
    renewal_reviewed_for: "2026-09",
    created_at: "2026-09-01T00:00:00.000Z",
  };

  const clientObj = mapDbToSubscription(row);
  assert.equal(clientObj.subscriptionId, "sub-999");
  assert.equal(clientObj.id, "youtube");
  assert.equal(clientObj.name, "YouTube Premium");
  assert.equal(clientObj.plan, "개인");
  assert.equal(clientObj.amount, 14900);
  assert.equal(clientObj.dueDay, 20);
  assert.equal(clientObj.renewalReviewedFor, "2026-09");
  assert.equal(clientObj.monogram, "Y");
  assert.equal(clientObj.isTrial, false);
});
