import test from "node:test";
import assert from "node:assert/strict";
import { executeTool, CHAT_TOOL_DECLARATIONS, TOOL_LABELS } from "../api/_lib/chatTools.js";

const sampleSnapshot = {
  today: "2026-10-18",
  subscriptions: [
    {
      id: "sub-1",
      name: "넷플릭스",
      serviceId: "netflix",
      plan: "스탠다드",
      category: "OTT",
      amount: 13500,
      billingCycle: "매월",
      nextChargeDate: "2026-10-25",
      paymentMethod: "현대카드",
      status: "active",
    },
    {
      id: "sub-2",
      name: "유튜브 프리미엄",
      serviceId: "youtube",
      plan: "개인",
      category: "OTT",
      amount: 14900,
      billingCycle: "매월",
      nextChargeDate: "2026-11-05",
      paymentMethod: "신한카드",
      status: "active",
    },
    {
      id: "sub-3",
      name: "ChatGPT Plus",
      serviceId: "chatgpt",
      plan: "Plus",
      category: "AI",
      amount: 290000,
      billingCycle: "매년",
      nextChargeDate: "2026-12-10",
      paymentMethod: "현대카드",
      status: "active",
    },
    {
      id: "sub-4",
      name: "디즈니+",
      serviceId: "disney-plus",
      plan: "스탠다드",
      category: "OTT",
      amount: 9900,
      billingCycle: "매월",
      nextChargeDate: "2026-10-20",
      paymentMethod: "신한카드",
      status: "cancelled",
    },
  ],
};

test("CHAT_TOOL_DECLARATIONS and TOOL_LABELS exist for all tools", () => {
  const toolNames = CHAT_TOOL_DECLARATIONS.map((t) => t.name);
  assert.ok(toolNames.includes("list_subscriptions"));
  assert.ok(toolNames.includes("get_spending"));
  assert.ok(toolNames.includes("get_upcoming_payments"));
  assert.ok(toolNames.includes("compare_subscriptions"));
  assert.ok(toolNames.includes("find_subscription"));
  assert.ok(toolNames.includes("get_cancel_info"));
  assert.ok(toolNames.includes("propose_add_subscription"));
  assert.ok(toolNames.includes("propose_update_subscription"));
  assert.ok(toolNames.includes("propose_set_alerts"));
  assert.ok(toolNames.includes("propose_open_cancel"));

  for (const name of toolNames) {
    assert.ok(TOOL_LABELS[name], `Label missing for ${name}`);
  }
});

test("list_subscriptions filters by status and category", () => {
  const all = executeTool({ name: "list_subscriptions", args: {}, snapshot: sampleSnapshot });
  assert.equal(all.totalCount, 4);

  const activeOnly = executeTool({ name: "list_subscriptions", args: { status: "active" }, snapshot: sampleSnapshot });
  assert.equal(activeOnly.totalCount, 3);

  const ottOnly = executeTool({ name: "list_subscriptions", args: { category: "OTT" }, snapshot: sampleSnapshot });
  assert.equal(ottOnly.totalCount, 3);
});

test("get_spending calculates month and year correctly and excludes cancelled", () => {
  // Active: Netflix 13500/mo, Youtube 14900/mo, ChatGPT 290000/yr (monthly = round(290000/12) = 24167)
  // Total month = 13500 + 14900 + 24167 = 52567
  const monthSpending = executeTool({
    name: "get_spending",
    args: { period: "month", groupBy: "category" },
    snapshot: sampleSnapshot,
  });
  assert.equal(monthSpending.period, "month");
  assert.equal(monthSpending.total, 52567);
  assert.equal(monthSpending.subscriptionCount, 3);
  assert.equal(monthSpending.breakdown["OTT"], 13500 + 14900);
  assert.equal(monthSpending.breakdown["AI"], 24167);

  // Total year = 13500*12 (162000) + 14900*12 (178800) + 290000 = 630800
  const yearSpending = executeTool({
    name: "get_spending",
    args: { period: "year", groupBy: "paymentMethod" },
    snapshot: sampleSnapshot,
  });
  assert.equal(yearSpending.period, "year");
  assert.equal(yearSpending.total, 630800);
  assert.equal(yearSpending.breakdown["신한카드"], 14900 * 12);
  assert.equal(yearSpending.breakdown["현대카드"], 13500 * 12 + 290000);
});

test("get_spending filters by subscriptionIds and returns monthly/yearly totals including annual plans", () => {
  // sub-1: 넷플릭스 13500/mo (monthly: 13500, yearly: 162000)
  // sub-3: ChatGPT Plus 290000/yr (monthly: 24167, yearly: 290000)
  const res = executeTool({
    name: "get_spending",
    args: { period: "month", subscriptionIds: ["sub-1", "sub-3"] },
    snapshot: sampleSnapshot,
  });

  assert.equal(res.count, 2);
  assert.equal(res.subscriptionCount, 2);
  assert.equal(res.monthlyTotal, 13500 + 24167);
  assert.equal(res.yearlyTotal, 162000 + 290000);
  assert.equal(res.total, 13500 + 24167);
  assert.equal(res.items.length, 2);
  assert.deepEqual(res.items[0], {
    id: "sub-1",
    name: "넷플릭스",
    billingCycle: "매월",
    amount: 13500,
    monthlyEquivalent: 13500,
    yearlyEquivalent: 162000,
  });
  assert.deepEqual(res.items[1], {
    id: "sub-3",
    name: "ChatGPT Plus",
    billingCycle: "매년",
    amount: 290000,
    monthlyEquivalent: 24167,
    yearlyEquivalent: 290000,
  });
});

test("get_upcoming_payments across month end and excludes cancelled", () => {
  // Today is 2026-10-18
  // Netflix: 2026-10-25 (+7 days)
  // Youtube: 2026-11-05 (+18 days)
  // ChatGPT: 2026-12-10 (+53 days)
  // Disney+: cancelled (excluded)
  const upTo20Days = executeTool({
    name: "get_upcoming_payments",
    args: { days: 20 },
    snapshot: sampleSnapshot,
  });
  assert.equal(upTo20Days.upcomingCount, 2);
  assert.equal(upTo20Days.payments[0].name, "넷플릭스");
  assert.equal(upTo20Days.payments[0].daysLeft, 7);
  assert.equal(upTo20Days.payments[1].name, "유튜브 프리미엄");
  assert.equal(upTo20Days.payments[1].daysLeft, 18);
  assert.equal(upTo20Days.totalAmount, 13500 + 14900);

  // Up to 60 days includes ChatGPT
  const upTo60Days = executeTool({
    name: "get_upcoming_payments",
    args: { days: 60 },
    snapshot: sampleSnapshot,
  });
  // Netflix charges on 10/25 and 11/25; Youtube on 11/05 and 12/05; ChatGPT on 12/10
  assert.equal(upTo60Days.upcomingCount, 5);
  assert.equal(upTo60Days.totalAmount, 13500 * 2 + 14900 * 2 + 290000);
});

test("get_upcoming_payments with range=this_month excludes next-month dates", () => {
  const liveTestSnapshot = {
    today: "2026-10-18",
    subscriptions: [
      { id: "sub-1", name: "디즈니+", amount: 9900, billingCycle: "매월", nextChargeDate: "2026-10-20", status: "active" },
      { id: "sub-2", name: "넷플릭스", amount: 17000, billingCycle: "매월", nextChargeDate: "2026-10-25", status: "active" },
      { id: "sub-3", name: "쿠팡 와우", amount: 7890, billingCycle: "매월", nextChargeDate: "2026-10-29", status: "active" },
      { id: "sub-4", name: "유튜브 프리미엄", amount: 14900, billingCycle: "매월", nextChargeDate: "2026-11-02", status: "active" },
    ],
  };

  const res = executeTool({
    name: "get_upcoming_payments",
    args: { range: "this_month" },
    snapshot: liveTestSnapshot,
  });

  assert.equal(res.from, "2026-10-18");
  assert.equal(res.to, "2026-10-31");
  assert.equal(res.total, 34790);
  assert.equal(res.totalAmount, 34790);
  assert.equal(res.upcomingCount, 3);
  assert.deepEqual(res.payments.map((p) => p.name), ["디즈니+", "넷플릭스", "쿠팡 와우"]);
  assert.deepEqual(res.payments.map((p) => p.date), ["2026-10-20", "2026-10-25", "2026-10-29"]);
  assert.deepEqual(res.payments.map((p) => p.dDay), [2, 7, 11]);
});

test("get_upcoming_payments with range=next_month covers full next calendar month", () => {
  const liveTestSnapshot = {
    today: "2026-10-18",
    subscriptions: [
      { id: "sub-1", name: "디즈니+", amount: 9900, billingCycle: "매월", nextChargeDate: "2026-10-20", status: "active" },
      { id: "sub-2", name: "유튜브 프리미엄", amount: 14900, billingCycle: "매월", nextChargeDate: "2026-11-02", status: "active" },
      { id: "sub-3", name: "연간 구독", amount: 50000, billingCycle: "매년", nextChargeDate: "2026-11-15", status: "active" },
      { id: "sub-4", name: "연간 구독(12월)", amount: 80000, billingCycle: "매년", nextChargeDate: "2026-12-05", status: "active" },
    ],
  };

  const res = executeTool({
    name: "get_upcoming_payments",
    args: { range: "next_month" },
    snapshot: liveTestSnapshot,
  });

  assert.equal(res.from, "2026-11-01");
  assert.equal(res.to, "2026-11-30");
  // sub-1 (monthly): 11/20 charge in range (9900)
  // sub-2 (monthly): 11/02 charge in range (14900)
  // sub-3 (annual): 11/15 charge in range (50000)
  // sub-4 (annual): 12/05 charge out of range
  assert.equal(res.total, 9900 + 14900 + 50000);
  assert.equal(res.upcomingCount, 3);
  assert.deepEqual(res.payments.map((p) => p.date), ["2026-11-02", "2026-11-15", "2026-11-20"]);
});

test("get_upcoming_payments month-end edge case (today 2026-01-31)", () => {
  const monthEndSnapshot = {
    today: "2026-01-31",
    subscriptions: [
      { id: "sub-1", name: "말일 구독", amount: 10000, billingCycle: "매월", nextChargeDate: "2026-01-31", status: "active" },
      { id: "sub-2", name: "다음달 1일 구독", amount: 15000, billingCycle: "매월", nextChargeDate: "2026-02-01", status: "active" },
      { id: "sub-3", name: "이미 지난 구독", amount: 8000, billingCycle: "매월", nextChargeDate: "2026-01-30", status: "active" },
    ],
  };

  const res = executeTool({
    name: "get_upcoming_payments",
    args: { range: "this_month" },
    snapshot: monthEndSnapshot,
  });

  assert.equal(res.from, "2026-01-31");
  assert.equal(res.to, "2026-01-31");
  assert.equal(res.upcomingCount, 1);
  assert.equal(res.payments[0].name, "말일 구독");
  assert.equal(res.payments[0].date, "2026-01-31");
  assert.equal(res.payments[0].dDay, 0);
  assert.equal(res.total, 10000);
});

test("find_subscription performs fuzzy search with aliases and Korean/English", () => {
  // Alias search: "챗지피티" -> ChatGPT Plus
  const res1 = executeTool({
    name: "find_subscription",
    args: { query: "챗지피티" },
    snapshot: sampleSnapshot,
  });
  assert.equal(res1.count, 1);
  assert.equal(res1.results[0].id, "sub-3");

  // Partial English search: "net" -> Netflix
  const res2 = executeTool({
    name: "find_subscription",
    args: { query: "net" },
    snapshot: sampleSnapshot,
  });
  assert.equal(res2.count, 1);
  assert.equal(res2.results[0].id, "sub-1");

  // Korean partial: "유튜브"
  const res3 = executeTool({
    name: "find_subscription",
    args: { query: "유튜브" },
    snapshot: sampleSnapshot,
  });
  assert.equal(res3.count, 1);
  assert.equal(res3.results[0].id, "sub-2");
});

test("compare_subscriptions compares given IDs", () => {
  const res = executeTool({
    name: "compare_subscriptions",
    args: { subscriptionIds: ["sub-1", "sub-2"] },
    snapshot: sampleSnapshot,
  });
  assert.equal(res.comparedCount, 2);
  assert.equal(res.subscriptions[0].id, "sub-1");
  assert.equal(res.subscriptions[1].id, "sub-2");
});

test("get_cancel_info retrieves cancel guide if available", () => {
  const res = executeTool({
    name: "get_cancel_info",
    args: { subscriptionId: "sub-1" },
    snapshot: sampleSnapshot,
  });
  assert.equal(res.subscriptionId, "sub-1");
  assert.equal(res.name, "넷플릭스");
  assert.ok(typeof res.hasGuide === "boolean");
});

test("propose_add_subscription validates strictly and emits action", () => {
  const actions = [];
  const emitAction = (a) => actions.push(a);

  // Missing name
  const err1 = executeTool({
    name: "propose_add_subscription",
    args: { amount: 1000, billingCycle: "매월" },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.ok(err1.error);

  // Negative amount
  const err2 = executeTool({
    name: "propose_add_subscription",
    args: { name: "웨이브", amount: -500, billingCycle: "매월" },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.ok(err2.error);

  // Invalid billingCycle
  const err3 = executeTool({
    name: "propose_add_subscription",
    args: { name: "웨이브", amount: 7900, billingCycle: "주간" },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.ok(err3.error);

  // Invalid date
  const err4 = executeTool({
    name: "propose_add_subscription",
    args: { name: "웨이브", amount: 7900, billingCycle: "매월", nextChargeDate: "invalid-date" },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.ok(err4.error);

  // Valid
  const success = executeTool({
    name: "propose_add_subscription",
    args: {
      name: "웨이브",
      serviceId: "wavve",
      plan: "베이직",
      amount: 7900,
      billingCycle: "매월",
      nextChargeDate: "2026-11-01",
      billingDay: 1,
      paymentMethod: "국민카드",
    },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.equal(success.status, "proposed_to_user");
  assert.ok(success.actionId);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, "add_subscription");
  assert.equal(actions[0].payload.name, "웨이브");
  assert.equal(actions[0].payload.amount, 7900);
});

test("propose_update_subscription validates subscription existence and changes", () => {
  const actions = [];
  const emitAction = (a) => actions.push(a);

  // Non-existent id
  const err1 = executeTool({
    name: "propose_update_subscription",
    args: { subscriptionId: "non-existent", changes: { amount: 15000 } },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.ok(err1.error);

  // Empty changes
  const err2 = executeTool({
    name: "propose_update_subscription",
    args: { subscriptionId: "sub-1", changes: {} },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.ok(err2.error);

  // Invalid amount
  const err3 = executeTool({
    name: "propose_update_subscription",
    args: { subscriptionId: "sub-1", changes: { amount: "천원" } },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.ok(err3.error);

  // Valid update
  const success = executeTool({
    name: "propose_update_subscription",
    args: { subscriptionId: "sub-1", changes: { amount: 17000, plan: "프리미엄" } },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.equal(success.status, "proposed_to_user");
  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, "update_subscription");
  assert.equal(actions[0].payload.subscriptionId, "sub-1");
  assert.equal(actions[0].payload.changes.amount, 17000);
  assert.equal(actions[0].payload.changes.plan, "프리미엄");
});

test("propose_set_alerts validates subscriptionId and settings", () => {
  const actions = [];
  const emitAction = (a) => actions.push(a);

  // Missing subscriptionId
  const err1 = executeTool({
    name: "propose_set_alerts",
    args: { alertD3: true },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.ok(err1.error);

  // No alerts specified
  const err2 = executeTool({
    name: "propose_set_alerts",
    args: { subscriptionId: "sub-1" },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.ok(err2.error);

  // Valid for specific id
  const success1 = executeTool({
    name: "propose_set_alerts",
    args: { subscriptionId: "sub-1", alertD3: true, alertD1: false },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.equal(success1.status, "proposed_to_user");
  assert.equal(actions[0].type, "set_alerts");
  assert.equal(actions[0].payload.subscriptionId, "sub-1");
  assert.equal(actions[0].payload.alertD3, true);
  assert.equal(actions[0].payload.alertD1, false);

  // Valid for 'all'
  const success2 = executeTool({
    name: "propose_set_alerts",
    args: { subscriptionId: "all", alertD1: true },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.equal(success2.status, "proposed_to_user");
  assert.equal(actions[1].payload.subscriptionId, "all");
});

test("propose_open_cancel validates subscriptionId", () => {
  const actions = [];
  const emitAction = (a) => actions.push(a);

  const err = executeTool({
    name: "propose_open_cancel",
    args: { subscriptionId: "non-existent" },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.ok(err.error);

  const success = executeTool({
    name: "propose_open_cancel",
    args: { subscriptionId: "sub-1" },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.equal(success.status, "proposed_to_user");
  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, "open_cancel");
  assert.equal(actions[0].payload.subscriptionId, "sub-1");
});

test("propose_update_subscription drops unchanged keys and rejects when all unchanged", () => {
  const actions = [];
  const emitAction = (a) => actions.push(a);

  // sub-1 in sampleSnapshot: amount: 13500, plan: "스탠다드", billingCycle: "매월", nextChargeDate: "2026-10-25", paymentMethod: "현대카드"
  // 1. All unchanged -> error returned, no action emitted
  const allSame = executeTool({
    name: "propose_update_subscription",
    args: {
      subscriptionId: "sub-1",
      changes: {
        amount: 13500,
        plan: "스탠다드",
        billingCycle: "매월",
      },
    },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.equal(allSame.error, "요청한 값이 현재 값과 같아요. 바꿀 내용이 없어요.");
  assert.equal(actions.length, 0);

  // 2. Partially unchanged -> unchanged keys dropped, action emitted with only changed keys
  const partial = executeTool({
    name: "propose_update_subscription",
    args: {
      subscriptionId: "sub-1",
      changes: {
        amount: 13500, // unchanged
        plan: "프리미엄", // changed
      },
    },
    snapshot: sampleSnapshot,
    emitAction,
  });
  assert.equal(partial.status, "proposed_to_user");
  assert.equal(actions.length, 1);
  assert.equal(actions[0].payload.subscriptionId, "sub-1");
  assert.deepEqual(actions[0].payload.changes, { plan: "프리미엄" });
  assert.equal(actions[0].payload.changes.amount, undefined);
});

test("propose_set_alerts rejects when values are already identical", () => {
  const actions = [];
  const emitAction = (a) => actions.push(a);

  const snapshotWithAlerts = {
    today: "2026-10-18",
    subscriptions: [
      { id: "sub-1", name: "넷플릭스", status: "active", alertD3: true, alertD1: false },
      { id: "sub-2", name: "왓챠", status: "active", alertD3: true, alertD1: false },
      { id: "sub-3", name: "디즈니+", status: "cancelled", alertD3: false, alertD1: false },
    ],
  };

  // 1. Specific subscription with already same values
  const sameSpecific = executeTool({
    name: "propose_set_alerts",
    args: { subscriptionId: "sub-1", alertD3: true, alertD1: false },
    snapshot: snapshotWithAlerts,
    emitAction,
  });
  assert.equal(sameSpecific.error, "요청한 값이 현재 값과 같아요. 바꿀 내용이 없어요.");
  assert.equal(actions.length, 0);

  // 2. 'all' when all non-cancelled already have those alert values
  const sameAll = executeTool({
    name: "propose_set_alerts",
    args: { subscriptionId: "all", alertD3: true, alertD1: false },
    snapshot: snapshotWithAlerts,
    emitAction,
  });
  assert.equal(sameAll.error, "요청한 값이 현재 값과 같아요. 바꿀 내용이 없어요.");
  assert.equal(actions.length, 0);

  // 3. 'all' when at least one active subscription differs -> allowed
  const diffAll = executeTool({
    name: "propose_set_alerts",
    args: { subscriptionId: "all", alertD1: true },
    snapshot: snapshotWithAlerts,
    emitAction,
  });
  assert.equal(diffAll.status, "proposed_to_user");
  assert.equal(actions.length, 1);
});
