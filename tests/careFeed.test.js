import test from "node:test";
import assert from "node:assert/strict";
import { buildCareItems, buildCareNotifications, rebuildRotationPlan, rotationSuggestion } from "../src/lib/careFeed.js";

const now = new Date(2026, 9, 4, 10);
const subs = [
  { subscriptionId: "n", id: "netflix", name: "Netflix", category: "OTT", amount: 13500, dueDay: 6, billingCycle: "매월", status: "active" },
  { subscriptionId: "d", id: "disney", name: "Disney+", category: "OTT", amount: 9900, dueDay: 20, billingCycle: "매월", status: "active" },
  { subscriptionId: "t", id: "tving", name: "TVING", category: "OTT", amount: 5500, dueDay: 5, billingCycle: "매월", status: "trial", isTrial: true },
  { subscriptionId: "y", id: "youtube", name: "YouTube Premium", category: "OTT", amount: 4975, grossAmount: 19900, sharingEnabled: true, shareCount: 4, dueDay: 5, billingCycle: "매월", status: "active" },
];
const history = [{ subscriptionId: "w", name: "Wavve", amount: 10900, cancelledAt: new Date(2026, 8, 1).toISOString(), expectedChargeOn: new Date(2026, 8, 15).toISOString(), verification: "asking" }];

test("오늘 챙길 일은 해지 확인 질문을 맨 위에 두고 체험·정산·사용 체크를 모은다", () => {
  const items = buildCareItems({ subscriptions: subs, cancelHistory: history, now });
  const types = items.map((item) => item.type);
  assert.equal(types[0], "cancel_ask");
  assert.ok(types.includes("trial_guard"));
  assert.ok(types.includes("settlement"));
  assert.ok(types.includes("usage_ask"));
  const settle = items.find((item) => item.type === "settlement");
  assert.equal(settle.request.perPerson, 4975);
});

test("처리한 항목(acks)은 다시 보이지 않는다", () => {
  const first = buildCareItems({ subscriptions: subs, now });
  const settle = first.find((item) => item.type === "settlement");
  const acks = { [settle.key]: true, rotation_suggest: true };
  const again = buildCareItems({ subscriptions: subs, acks, now });
  assert.ok(!again.some((item) => item.type === "settlement" || item.type === "rotation_suggest"));
});

test("OTT 월 구독이 2개 이상이면 순환을 제안하고, 계획을 저장하면 해지할 날을 보여준다", () => {
  const suggestion = rotationSuggestion(subs);
  assert.equal(suggestion.category, "OTT");
  assert.ok(suggestion.plan.monthlySaving > 0);
  const rotation = { category: "OTT", order: ["d", "n"], createdAt: now.toISOString(), months: 6 };
  const items = buildCareItems({ subscriptions: subs, rotation, now, acks: { rotation_suggest: true } });
  const due = items.find((item) => item.type === "rotation_due");
  assert.ok(due, "순환 해지 알림이 있어야 한다");
  assert.equal(due.subscriptionId, "n");
});

test("앱 밖 알림은 해지 확인·무료체험 D-2·정산일·순환 알림을 미래 시각으로만 만든다", () => {
  const watching = [{ ...history[0], verification: "watching", expectedChargeOn: new Date(2026, 9, 15).toISOString() }];
  const list = buildCareNotifications({
    subscriptions: subs.map((s) => (s.subscriptionId === "t" ? { ...s, dueDay: 20 } : s)),
    cancelHistory: watching,
    rotation: { category: "OTT", order: ["d", "n"], createdAt: now.toISOString() },
    now,
  });
  const types = new Set(list.map((item) => item.type));
  for (const type of ["cancel_check", "trial_d2", "settlement_due", "rotation_cancel"]) assert.ok(types.has(type), type);
  assert.ok(list.every((item) => item.at > now && item.at.getHours() === 9));
  assert.equal(new Set(list.map((item) => item.key)).size, list.length);
});

test("해지해서 목록에서 빠진 구독도 저장한 순환 계획으로 일정을 이어간다", () => {
  const rotation = {
    category: "OTT",
    order: ["d", "n"],
    createdAt: now.toISOString(),
    services: subs.filter((s) => s.subscriptionId === "d" || s.subscriptionId === "n"),
  };
  const remaining = subs.filter((s) => s.subscriptionId !== "n");
  const plan = rebuildRotationPlan(rotation, remaining);
  assert.ok(plan, "저장한 서비스 정보로 계획을 다시 만든다");
  assert.equal(plan.months[1].resume[0].subscriptionId, "n");
  // 이미 해지해 목록에 없는 구독의 해지 알림은 보이지 않는다.
  const items = buildCareItems({ subscriptions: remaining, rotation, now, acks: { rotation_suggest: true } });
  assert.ok(!items.some((item) => item.reminderType === "rotation_cancel" && item.subscriptionId === "n"));
});
