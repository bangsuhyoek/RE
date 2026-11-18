import test from "node:test";
import assert from "node:assert/strict";
import { buildAgentSuggestions } from "../src/components/agent/agentSuggestions.js";

const NOW = new Date(2026, 10, 8, 10, 0, 0); // 11월 8일
const sub = (id, name, dueDay, amount, extra = {}) => ({
  id, subscriptionId: "u-" + id, serviceId: id, name, dueDay, amount, billingCycle: "매월", status: "active", ...extra,
});

test("첫 화면 제안은 실제 구독만 쓰고, 해지 확인 중 → 임박 결제 → 이번 주 묶음 순서로 최대 3개", () => {
  const subscriptions = [
    sub("youtube", "유튜브 프리미엄", 10, 14900),
    sub("tving", "티빙", 9, 13900),
    // 해지 전에 등록한 구독(해지 후 다시 가입한 게 아님)
    sub("netflix", "넷플릭스", 25, 17000, { createdAt: new Date(2026, 0, 1).toISOString() }),
  ];
  const cancelHistory = [{
    id: "netflix", serviceId: "netflix", subscriptionId: "u-netflix", name: "넷플릭스", amount: 17000,
    cancelledAt: new Date(2026, 10, 1).toISOString(), expectedChargeOn: new Date(2026, 10, 25).toISOString(), verification: "watching",
  }];
  const { tasks, prompts, hasSubscriptions } = buildAgentSuggestions({ subscriptions, cancelHistory, now: NOW });

  assert.equal(hasSubscriptions, true);
  assert.equal(tasks.length, 3);
  assert.equal(tasks[0].title, "넷플릭스 해지 확인하기");
  assert.equal(tasks[1].title, "티빙 결제 확인하기");
  assert.equal(tasks[1].urgentText, "D-1");
  assert.equal(tasks[2].title, "이번 주 결제 2건 보기");
  assert.equal(tasks[2].prompt, "다음 주에 나갈 돈 알려줘");

  const names = subscriptions.map((s) => s.name);
  for (const prompt of prompts) {
    const mentionsService = /해지해줘$/.test(prompt);
    if (mentionsService) assert.ok(names.some((name) => prompt.startsWith(name)), prompt + " 는 구독 중인 서비스여야 한다");
    assert.ok(!/디즈니/.test(prompt));
  }
});

test("구독이 없으면 할 일과 질문 예시를 비운다", () => {
  const result = buildAgentSuggestions({ subscriptions: [], cancelHistory: [], now: NOW });
  assert.deepEqual(result.tasks, []);
  assert.deepEqual(result.prompts, []);
  assert.equal(result.hasSubscriptions, false);
});

