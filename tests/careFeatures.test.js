import test from "node:test";
import assert from "node:assert/strict";
import { detectTrialText, trialGuardItems, trialReminderAt, trialAckKey } from "../src/lib/trialGuard.js";
import { answerUsage, findCheaperPlan, unusedStreak, usageCheckItems } from "../src/lib/usageCheck.js";
import { buildRotationPlan } from "../src/lib/rotationPlanner.js";

const now = new Date(2026, 9, 4, 10);

test("공유받은 글에서 무료체험과 끝나는 날을 찾는다", () => {
  const found = detectTrialText("[디즈니+] 7일 무료 체험이 시작됐어요. 2026.10.11에 ₩9,900 결제 예정", now);
  assert.equal(found.isTrial, true);
  assert.equal(found.trialEndsOn.getDate(), 11);
  assert.equal(detectTrialText("넷플릭스 17,000원 승인", now).isTrial, false);
  assert.equal(detectTrialText("첫 달 0원 이용권 가입 완료", now).isTrial, true);
});

test("무료체험은 유료 전환 3일 전부터 홈에 뜨고, 계속 쓰기로 하면 숨긴다", () => {
  const trial = { subscriptionId: "t1", name: "디즈니+", amount: 9900, dueDay: 6, isTrial: true, status: "trial" };
  const items = trialGuardItems([trial, { ...trial, subscriptionId: "t2", dueDay: 20 }], {}, now);
  assert.equal(items.length, 1);
  assert.equal(items[0].days, 2);
  assert.match(items[0].body, /9,900/);
  assert.equal(trialGuardItems([trial], { [trialAckKey(trial, now)]: true }, now).length, 0);
  const at = trialReminderAt({ ...trial, dueDay: 20 }, now);
  assert.equal(at.getDate(), 18);
  assert.equal(at.getHours(), 9);
});

test("결제 1~3일 전 구독에만 사용 여부를 묻는다", () => {
  const subs = [
    { subscriptionId: "a", id: "netflix", name: "Netflix", amount: 17000, plan: "프리미엄", dueDay: 6, billingCycle: "매월" },
    { subscriptionId: "b", id: "x", name: "X", amount: 5000, dueDay: 20, billingCycle: "매월" },
    { subscriptionId: "c", id: "y", name: "Y", amount: 5000, dueDay: 6, billingCycle: "매년" },
  ];
  const items = usageCheckItems(subs, {}, { now });
  assert.deepEqual(items.map((item) => item.subscriptionId), ["a"]);
  assert.equal(items[0].type, "usage_ask");
});

test("안 썼다고 하면 더 싼 요금제나 해지를 권하고 연속 횟수를 센다", () => {
  const sub = { subscriptionId: "a", id: "netflix", name: "Netflix", amount: 17000, plan: "프리미엄", dueDay: 6, billingCycle: "매월" };
  const catalog = [{ id: "netflix", availablePlans: [{ plan: "광고형 스탠다드", amount: 7000 }, { plan: "스탠다드", amount: 13500 }, { plan: "프리미엄", amount: 17000 }] }];
  assert.equal(findCheaperPlan(sub, catalog).amount, 7000);
  let answers = answerUsage({}, sub, "unused", new Date(2026, 8, 4));
  answers = answerUsage(answers, sub, "unused", now);
  assert.equal(unusedStreak(answers, sub), 2);
  const [item] = usageCheckItems([sub], answers, { now, catalog });
  assert.equal(item.type, "usage_suggest");
  assert.match(item.title, /2달째/);
  assert.match(item.body, /10,000/);
  const used = answerUsage({}, sub, "used", now);
  assert.equal(usageCheckItems([sub], used, { now, catalog }).length, 0);
});

test("순환 계획 첫 달: 이번 달 결제일이 지난 구독은 다음 결제일 전날에 해지한다", () => {
  const plan = buildRotationPlan({
    subscriptions: [
      { subscriptionId: "n", name: "Netflix", amount: 13500, dueDay: 2, billingCycle: "매월" },
      { subscriptionId: "d", name: "Disney+", amount: 9900, dueDay: 20, billingCycle: "매월" },
    ],
    order: ["d", "n"],
    start: now,
  });
  const cancel = plan.months[0].cancel[0];
  assert.equal(cancel.subscriptionId, "n");
  assert.equal(cancel.cancelBy.getMonth(), 10);
  assert.equal(cancel.cancelBy.getDate(), 1);
});

test("다시 가입한 날이 새 결제일이 되어 다음 해지일도 그 날짜 전날로 잡힌다", () => {
  const plan = buildRotationPlan({
    subscriptions: [
      { subscriptionId: "a", name: "Apple TV+", amount: 6500, dueDay: 15, billingCycle: "매월" },
      { subscriptionId: "y", name: "YouTube", amount: 14900, dueDay: 22, billingCycle: "매월" },
      { subscriptionId: "n", name: "Netflix", amount: 17000, dueDay: 15, billingCycle: "매월" },
    ],
    order: ["a", "y", "n"],
    start: new Date(2026, 9, 4),
  });
  // 11월: YouTube를 11/15에 다시 가입 → 12월에는 12/14까지 해지해야 12/15 결제를 피한다.
  assert.equal(plan.months[1].resume[0].startOn.getDate(), 15);
  const decCancel = plan.months[2].cancel[0];
  assert.equal(decCancel.subscriptionId, "y");
  assert.equal(decCancel.cancelBy.getMonth(), 11);
  assert.equal(decCancel.cancelBy.getDate(), 14);
});

