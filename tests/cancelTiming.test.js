import test from "node:test";
import assert from "node:assert/strict";
import { getCancelTimingAdvice } from "../src/lib/cancelTiming.js";

test("period_end policy: keep_until advice with next charge date and no reminder", () => {
  const now = new Date("2026-10-16T12:00:00");
  const subscription = {
    id: "netflix",
    name: "넷플릭스",
    dueDay: 28,
    billingCycle: "매월",
    paymentChannel: "web",
  };
  const policy = {
    cancelType: "period_end",
    summary: "해지해도 다음 결제일까지 계속 시청할 수 있어요.",
    sourceUrl: "https://help.netflix.com/cancel",
    checkedAt: "2026-10-16",
  };

  const advice = getCancelTimingAdvice({ subscription, policy, now });
  assert.equal(advice.kind, "keep_until");
  assert.ok(advice.accessUntil instanceof Date);
  assert.equal(advice.accessUntil.getDate(), 28);
  assert.equal(advice.accessUntil.getMonth(), 9); // October (0-indexed: 9)
  assert.equal(advice.daysLeft, 12);
  assert.match(advice.headline, /지금 해지해도 10월 28일까지 이용할 수 있어요/);
  assert.equal(advice.detail, policy.summary);
  assert.equal(advice.reminderAt, null);
  assert.equal(advice.reminderLabel, null);
  assert.equal(advice.sourceUrl, policy.sourceUrl);
  assert.equal(advice.checkedAt, "2026-10-16");
});

test("store override: google_play and app_store subscriptions are treated as period_end even without policy", () => {
  const now = new Date("2026-10-16T12:00:00");
  const subGoogle = {
    id: "random-app",
    name: "랜덤앱",
    dueDay: 20,
    paymentChannel: "google_play",
  };
  const adviceGoogle = getCancelTimingAdvice({ subscription: subGoogle, policy: null, now });
  assert.equal(adviceGoogle.kind, "keep_until");
  assert.match(adviceGoogle.headline, /10월 20일까지 이용할 수 있어요/);
  assert.equal(adviceGoogle.reminderAt, null);
  assert.equal(adviceGoogle.sourceUrl, null);

  const subApple = {
    id: "random-app",
    name: "랜덤앱",
    dueDay: 20,
    paymentChannel: "app_store",
  };
  const policyWithUrl = {
    cancelType: "immediate_loss", // Should be overridden to period_end by store channel
    summary: "스토어 결제 안내",
    sourceUrl: "https://support.apple.com/billing",
    checkedAt: "2026-10-15",
  };
  const adviceApple = getCancelTimingAdvice({ subscription: subApple, policy: policyWithUrl, now });
  assert.equal(adviceApple.kind, "keep_until");
  assert.equal(adviceApple.sourceUrl, "https://support.apple.com/billing");
});

test("trial subscription: returns kind trial and reminderAt null", () => {
  const now = new Date("2026-10-16T12:00:00");
  const subTrial = {
    id: "trial-sub",
    name: "체험 구독",
    isTrial: true,
    dueDay: 25,
  };
  const advice = getCancelTimingAdvice({
    subscription: subTrial,
    policy: { cancelType: "immediate_loss" },
    now,
  });
  assert.equal(advice.kind, "trial");
  assert.match(advice.headline, /무료체험이 끝나기 전에 해지하면/);
  assert.equal(advice.reminderAt, null);
  assert.equal(advice.reminderLabel, null);
});

test("trial status string also triggers kind trial", () => {
  const now = new Date("2026-10-16T12:00:00");
  const subTrial = {
    id: "trial-sub-2",
    name: "체험 구독 2",
    status: "trial",
    dueDay: 25,
  };
  const advice = getCancelTimingAdvice({ subscription: subTrial, now });
  assert.equal(advice.kind, "trial");
  assert.equal(advice.reminderAt, null);
});

test("immediate_prorated policy: returns prorated_refund and no reminder", () => {
  const now = new Date("2026-10-16T12:00:00");
  const subscription = {
    id: "naver-plus",
    name: "네이버플러스 멤버십",
    dueDay: 30,
    paymentChannel: "web",
  };
  const policy = {
    cancelType: "immediate_prorated",
    summary: "미사용 일수만큼 일할 계산되어 환불됩니다.",
  };
  const advice = getCancelTimingAdvice({ subscription, policy, now });
  assert.equal(advice.kind, "prorated_refund");
  assert.match(advice.headline, /환불/);
  assert.equal(advice.reminderAt, null);
});

test("immediate_loss policy: returns immediate_loss with reminder 1 day prior at 09:00", () => {
  const now = new Date("2026-10-16T12:00:00");
  const subscription = {
    id: "loss-service",
    name: "손실 서비스",
    dueDay: 25,
    paymentChannel: "web",
  };
  const policy = {
    cancelType: "immediate_loss",
    summary: "해지 즉시 서비스가 중단되며 환불되지 않습니다.",
  };
  const advice = getCancelTimingAdvice({ subscription, policy, now });
  assert.equal(advice.kind, "immediate_loss");
  assert.match(advice.headline, /즉시 종료/);
  assert.ok(advice.reminderAt instanceof Date);
  // Next charge date is Oct 25 -> reminder should be Oct 24, 09:00:00
  assert.equal(advice.reminderAt.getFullYear(), 2026);
  assert.equal(advice.reminderAt.getMonth(), 9);
  assert.equal(advice.reminderAt.getDate(), 24);
  assert.equal(advice.reminderAt.getHours(), 9);
  assert.equal(advice.reminderAt.getMinutes(), 0);
  assert.match(advice.reminderLabel, /결제일 전날/);
});

test("contract_penalty policy: returns penalty with reminder 7 days prior at 09:00", () => {
  const now = new Date("2026-10-16T12:00:00");
  const subscription = {
    id: "adobe-annual",
    name: "Adobe CC",
    dueDay: 30,
    billingCycle: "매월",
    paymentChannel: "web",
  };
  const policy = {
    cancelType: "contract_penalty",
    summary: "연간 약정 중도 해지 시 잔여 약정액의 위약금이 발생합니다.",
  };
  const advice = getCancelTimingAdvice({ subscription, policy, now });
  assert.equal(advice.kind, "penalty");
  assert.match(advice.headline, /위약금/);
  assert.ok(advice.reminderAt instanceof Date);
  // Next charge date is Oct 30 -> 7 days prior is Oct 23, 09:00:00
  assert.equal(advice.reminderAt.getFullYear(), 2026);
  assert.equal(advice.reminderAt.getMonth(), 9);
  assert.equal(advice.reminderAt.getDate(), 23);
  assert.equal(advice.reminderAt.getHours(), 9);
  assert.match(advice.reminderLabel, /갱신 7일 전/);
});

test("reminder-in-past becomes null", () => {
  // Next charge date is Oct 17.
  // immediate_loss reminder is Oct 16 09:00:00.
  // If now is Oct 16 14:00:00, reminder is in the past!
  const now = new Date("2026-10-16T14:00:00");
  const subscription = {
    id: "loss-service",
    name: "손실 서비스",
    dueDay: 17,
    paymentChannel: "web",
  };
  const policy = {
    cancelType: "immediate_loss",
  };
  const advice = getCancelTimingAdvice({ subscription, policy, now });
  assert.equal(advice.kind, "immediate_loss");
  assert.equal(advice.reminderAt, null);
  assert.equal(advice.reminderLabel, null);
});

test("missing date: if next charge date cannot be computed, accessUntil and reminderAt are null and headline has no date", () => {
  const now = new Date("2026-10-16T12:00:00");
  const subscription = {
    id: "no-date-sub",
    name: "날짜 없는 구독",
    // no dueDay, no nextBillingDate
  };
  const policy = {
    cancelType: "period_end",
  };
  const advice = getCancelTimingAdvice({ subscription, policy, now });
  assert.equal(advice.accessUntil, null);
  assert.equal(advice.daysLeft, null);
  assert.equal(advice.reminderAt, null);
  assert.equal(advice.reminderLabel, null);
  assert.doesNotMatch(advice.headline, /월.*일/);
});

test("annual unknown: offers reminder 7 days prior if next charge date computable", () => {
  const now = new Date("2026-10-16T12:00:00");
  const subscription = {
    id: "annual-unknown",
    name: "연간 구독",
    billingCycle: "매년",
    dueDay: 30,
    nextBillingDate: "2026-10-30",
    paymentChannel: "web",
  };
  const advice = getCancelTimingAdvice({ subscription, policy: null, now });
  assert.equal(advice.kind, "unknown");
  assert.ok(advice.reminderAt instanceof Date);
  assert.equal(advice.reminderAt.getDate(), 23); // 30 - 7
  assert.equal(advice.reminderAt.getHours(), 9);
  assert.match(advice.reminderLabel, /갱신 7일 전/);
});

test("monthly unknown: reminderAt is null", () => {
  const now = new Date("2026-10-16T12:00:00");
  const subscription = {
    id: "monthly-unknown",
    name: "월간 모르는 구독",
    billingCycle: "매월",
    dueDay: 25,
    paymentChannel: "web",
  };
  const advice = getCancelTimingAdvice({ subscription, policy: null, now });
  assert.equal(advice.kind, "unknown");
  assert.equal(advice.reminderAt, null);
  assert.equal(advice.reminderLabel, null);
});

test("conditional policy: policy.headline overrides generated headline while preserving kind and reminder logic", () => {
  const now = new Date("2026-10-16T12:00:00");
  const subscription = {
    id: "coupang",
    name: "쿠팡 와우",
    dueDay: 28,
    paymentChannel: "web",
  };
  const policy = {
    cancelType: "period_end",
    headline: "혜택 이용 여부에 따라 즉시 전액 환불 또는 결제 주기 말까지 유지돼요.",
    summary: "와우 혜택을 이용하지 않았다면 즉시 전액 환불, 이용했다면 다음 결제일까지 유지돼요.",
    sourceUrl: "https://www.coupang.com",
    checkedAt: "2026-10-16",
  };
  const advice = getCancelTimingAdvice({ subscription, policy, now });
  assert.equal(advice.kind, "keep_until");
  assert.equal(advice.headline, "혜택 이용 여부에 따라 즉시 전액 환불 또는 결제 주기 말까지 유지돼요.");
  assert.equal(advice.accessUntil.getDate(), 28);

  // Store override ignores policy.headline
  const storeSub = {
    ...subscription,
    paymentChannel: "google_play",
  };
  const storeAdvice = getCancelTimingAdvice({ subscription: storeSub, policy, now });
  assert.match(storeAdvice.headline, /10월 28일까지/);

  // Trial ignores policy.headline
  const trialSub = {
    ...subscription,
    isTrial: true,
  };
  const trialAdvice = getCancelTimingAdvice({ subscription: trialSub, policy, now });
  assert.match(trialAdvice.headline, /무료체험이 끝나기 전에/);
});

test("due day edge case (daysLeft === 0): period_end has specific headline and accessUntil null", () => {
  const now = new Date("2026-10-16T12:00:00");
  const subscription = {
    id: "netflix",
    name: "넷플릭스",
    dueDay: 16, // Today is the due day!
    paymentChannel: "web",
  };
  const policy = {
    cancelType: "period_end",
  };
  const advice = getCancelTimingAdvice({ subscription, policy, now });
  assert.equal(advice.kind, "keep_until");
  assert.equal(advice.daysLeft, 0);
  assert.equal(advice.accessUntil, null);
  assert.equal(advice.headline, "오늘이 결제일이에요. 이미 결제됐다면 다음 결제일까지 이용할 수 있어요");
  assert.equal(advice.reminderAt, null);
});

test("due day edge case (daysLeft === 0): immediate_loss does not claim 남은 0일 and reminderAt is null", () => {
  const now = new Date("2026-10-16T12:00:00");
  const subscription = {
    id: "loss-sub",
    name: "손실 서비스",
    dueDay: 16, // Today is the due day!
    paymentChannel: "web",
  };
  const policy = {
    cancelType: "immediate_loss",
  };
  const advice = getCancelTimingAdvice({ subscription, policy, now });
  assert.equal(advice.kind, "immediate_loss");
  assert.equal(advice.daysLeft, 0);
  assert.equal(advice.headline, "오늘이 결제일이에요. 결제 전이라면 지금 해지해야 다음 결제를 막을 수 있어요");
  assert.equal(advice.reminderAt, null);
  assert.equal(advice.reminderLabel, null);
});

test("guard against invalid or zero dueDay: null/0/'' gives headline without date", () => {
  const now = new Date("2026-10-16T12:00:00");
  const policy = { cancelType: "period_end" };

  for (const invalidDueDay of [0, null, "", undefined, 32, -1]) {
    const sub = {
      id: "test-sub",
      name: "테스트",
      dueDay: invalidDueDay,
      paymentChannel: "web",
    };
    const advice = getCancelTimingAdvice({ subscription: sub, policy, now });
    assert.equal(advice.accessUntil, null, `accessUntil should be null for dueDay: ${invalidDueDay}`);
    assert.equal(advice.daysLeft, null, `daysLeft should be null for dueDay: ${invalidDueDay}`);
    assert.equal(advice.headline, "지금 해지해도 이용 기간 끝까지 유지돼요");
  }

  // If nextBillingDate is valid date, billing date is treated as known even if dueDay is 0
  const subWithNext = {
    id: "test-sub-next",
    name: "테스트",
    dueDay: 0,
    nextBillingDate: "2026-10-25",
    paymentChannel: "web",
  };
  const adviceWithNext = getCancelTimingAdvice({ subscription: subWithNext, policy, now });
  assert.ok(adviceWithNext.accessUntil instanceof Date);
  assert.equal(adviceWithNext.accessUntil.getDate(), 25);
  assert.match(adviceWithNext.headline, /10월 25일까지/);
});

test("accessUntil은 keep_until 유형이면서 잔여일이 남았을 때만 날짜를 반환하고 즉시 종료/위약금/체험 등에서는 null을 반환한다", () => {
  const now = new Date("2026-10-16T12:00:00");
  const baseSub = { id: "sub-1", name: "테스트", dueDay: 25, paymentChannel: "web" };

  // 1. keep_until (period_end) with daysLeft > 0 -> Date
  const keepAdvice = getCancelTimingAdvice({
    subscription: baseSub,
    policy: { cancelType: "period_end" },
    now,
  });
  assert.equal(keepAdvice.kind, "keep_until");
  assert.ok(keepAdvice.accessUntil instanceof Date);
  assert.equal(keepAdvice.accessUntil.getDate(), 25);

  // 2. immediate_loss -> accessUntil should be null even if nextDate computable
  const lossAdvice = getCancelTimingAdvice({
    subscription: baseSub,
    policy: { cancelType: "immediate_loss" },
    now,
  });
  assert.equal(lossAdvice.kind, "immediate_loss");
  assert.equal(lossAdvice.accessUntil, null);

  // 3. immediate_prorated -> accessUntil should be null
  const proratedAdvice = getCancelTimingAdvice({
    subscription: baseSub,
    policy: { cancelType: "immediate_prorated" },
    now,
  });
  assert.equal(proratedAdvice.kind, "prorated_refund");
  assert.equal(proratedAdvice.accessUntil, null);

  // 4. contract_penalty -> accessUntil should be null
  const penaltyAdvice = getCancelTimingAdvice({
    subscription: baseSub,
    policy: { cancelType: "contract_penalty" },
    now,
  });
  assert.equal(penaltyAdvice.kind, "penalty");
  assert.equal(penaltyAdvice.accessUntil, null);

  // 5. trial -> accessUntil should be null
  const trialAdvice = getCancelTimingAdvice({
    subscription: { ...baseSub, isTrial: true },
    policy: { cancelType: "period_end" },
    now,
  });
  assert.equal(trialAdvice.kind, "trial");
  assert.equal(trialAdvice.accessUntil, null);
});
