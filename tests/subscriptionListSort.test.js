import test from "node:test";
import assert from "node:assert/strict";
import { compareSubscriptions, sortSubscriptions } from "../src/lib/subscriptionSort.js";

test("금액 높은순 정렬은 단순 결제금액이 아닌 월 환산 금액을 기준으로 정렬한다", () => {
  const subscriptions = [
    { id: "sub-annual", name: "연간 저장소", amount: 120000, billingCycle: "매년" }, // 월 10,000원
    { id: "sub-monthly-cheap", name: "월간 음악", amount: 8000, billingCycle: "매월" }, // 월 8,000원
    { id: "sub-monthly-expensive", name: "월간 OTT", amount: 17000, billingCycle: "매월" }, // 월 17,000원
  ];

  const sorted = sortSubscriptions(subscriptions, "amount");

  assert.deepEqual(
    sorted.map((s) => s.id),
    ["sub-monthly-expensive", "sub-annual", "sub-monthly-cheap"]
  );
  // 화면이 쓰는 비교 함수 자체도 같은 순서를 만든다
  assert.ok(compareSubscriptions(subscriptions[1], subscriptions[2], "amount") > 0);
});

test("최근 등록순 정렬은 createdAt 내림차순으로 정렬한다", () => {
  const subscriptions = [
    { id: "old", name: "오래된 구독", amount: 9900, createdAt: "2026-01-05T00:00:00.000Z" },
    { id: "newest", name: "최근 구독", amount: 9900, createdAt: "2026-10-20T00:00:00.000Z" },
    { id: "middle", name: "중간 구독", amount: 9900, createdAt: "2026-06-11T00:00:00.000Z" },
  ];

  assert.deepEqual(
    sortSubscriptions(subscriptions, "recent").map((s) => s.id),
    ["newest", "middle", "old"]
  );
});

test("기본 정렬은 결제일이 가까운 구독을 먼저 보여준다", () => {
  const reference = new Date(2026, 9, 29); // 2026-10-29
  const subscriptions = [
    { id: "later", name: "다음 달 결제", amount: 9900, dueDay: 20, nextBillingDate: "2026-11-20" },
    { id: "sooner", name: "곧 결제", amount: 9900, dueDay: 30, nextBillingDate: "2026-10-30" },
  ];

  const sorted = sortSubscriptions(subscriptions, "due");
  const daysUntil = (sub) => {
    const charge = new Date(sub.nextBillingDate + "T00:00:00");
    return Math.round((charge - reference) / 86400000);
  };
  assert.ok(daysUntil(sorted[0]) <= daysUntil(sorted[1]));
  assert.equal(sorted.length, 2);
});

