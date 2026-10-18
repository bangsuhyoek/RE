import test from "node:test";
import assert from "node:assert/strict";
import {
  getSubscriptionMonthlyAmount,
  getAlternativeOptions,
  canJoinRotation,
} from "../src/lib/cancelAlternativesView.js";

test("getSubscriptionMonthlyAmount: monthly and annual subscriptions", () => {
  // Monthly
  assert.equal(getSubscriptionMonthlyAmount({ amount: 17000, billingCycle: "매월" }), 17000);
  assert.equal(getSubscriptionMonthlyAmount({ amount: 9900 }), 9900);

  // Annual
  assert.equal(getSubscriptionMonthlyAmount({ amount: 120000, billingCycle: "매년" }), 10000);
  assert.equal(getSubscriptionMonthlyAmount({ amount: 99000, billingCycle: "매년" }), 8250);

  // Edge cases
  assert.equal(getSubscriptionMonthlyAmount(null), 0);
  assert.equal(getSubscriptionMonthlyAmount({}), 0);
});

test("getAlternativeOptions: savings math, exclusions, and sorting", () => {
  // Netflix with Premium plan (17,000 KRW)
  // Netflix alternatives in dataset:
  // 1) ad_tier: 7,000 KRW
  // 2) lower_tier: 13,500 KRW
  const sub = {
    id: "sub-1",
    serviceId: "netflix",
    amount: 17000,
    billingCycle: "매월",
  };

  const options = getAlternativeOptions({ subscription: sub });
  assert.equal(options.length, 2);

  // Sort order: largest savings first
  // ad_tier savings: 17000 - 7000 = 10000
  // lower_tier savings: 17000 - 13500 = 3500
  assert.equal(options[0].type, "ad_tier");
  assert.equal(options[0].monthlySavings, 10000);
  assert.equal(options[0].isCheaper, true);

  assert.equal(options[1].type, "lower_tier");
  assert.equal(options[1].monthlySavings, 3500);
  assert.equal(options[1].isCheaper, true);
});

test("getAlternativeOptions: excludes alternatives that cost same or more, except pause and family", () => {
  // Disney+ has alternatives:
  // lower_tier: 9,900
  // annual (Standard): 8,250
  // annual (Premium): 11,583
  // If user is already on standard monthly at 9,900 KRW:
  // - lower_tier (9,900) costs the same -> excluded!
  // - annual (Premium 11,583) costs more -> excluded!
  // - annual (Standard 8,250) costs less -> included!
  const standardSub = {
    id: "disney-sub",
    serviceId: "disney",
    amount: 9900,
    billingCycle: "매월",
  };

  const options = getAlternativeOptions({ subscription: standardSub });
  assert.equal(options.length, 1);
  assert.equal(options[0].title, "스탠다드 연간 플랜 결제");
  assert.equal(options[0].monthlySavings, 9900 - 8250);
});

test("getAlternativeOptions: preserves pause and family even if price is null or not cheaper", () => {
  // YouTube Premium has pause (monthlyPrice: null) and lower_tier (11,990)
  const ytSub = {
    id: "yt-1",
    serviceId: "youtube",
    amount: 14900,
    billingCycle: "매월",
  };

  const ytOptions = getAlternativeOptions({ subscription: ytSub });
  assert.equal(ytOptions.some((o) => o.type === "pause"), true);
  const pauseOption = ytOptions.find((o) => o.type === "pause");
  assert.equal(pauseOption.monthlyPrice, null);
  assert.equal(pauseOption.monthlySavings, null);
  assert.equal(pauseOption.isCheaper, false);

  // Spotify has family (8,993) and basic (8,690). If user is on 8,800:
  const spSub = {
    id: "sp-1",
    serviceId: "spotify",
    amount: 8800,
    billingCycle: "매월",
  };
  const spOptions = getAlternativeOptions({ subscription: spSub });
  // family is 8,993 which is > 8,800, but family must be preserved!
  assert.equal(spOptions.some((o) => o.type === "family"), true);
  // basic (8,690) < 8,800 is cheaper -> included
  assert.equal(spOptions.some((o) => o.type === "lower_tier"), true);
});

test("getAlternativeOptions: annual subscription correctly calculates monthly savings", () => {
  // Annual Disney+ subscription paying 139,000 KRW/year (11,583 KRW/month)
  const annualSub = {
    id: "disney-ann",
    serviceId: "disney",
    amount: 139000,
    billingCycle: "매년",
  };
  const monthlyAmt = Math.round(139000 / 12); // 11583
  const options = getAlternativeOptions({ subscription: annualSub });

  // Should compare against 11,583
  // lower_tier 9,900 is cheaper (savings: 11583 - 9900 = 1683)
  // annual standard 8,250 is cheaper (savings: 11583 - 8250 = 3333)
  // annual premium 11,583 is same -> excluded
  assert.equal(options.length, 2);
  assert.equal(options[0].monthlyPrice, 8250);
  assert.equal(options[0].monthlySavings, monthlyAmt - 8250);
  assert.equal(options[1].monthlyPrice, 9900);
  assert.equal(options[1].monthlySavings, monthlyAmt - 9900);
});

test("getAlternativeOptions: returns empty array when service has no data or unknown serviceId", () => {
  assert.deepEqual(getAlternativeOptions({ serviceId: "unknown-svc" }), []);
  assert.deepEqual(getAlternativeOptions({ subscription: { id: "custom-sub" } }), []);
  assert.deepEqual(getAlternativeOptions(), []);
});

test("canJoinRotation: evaluates candidate eligibility and categories", () => {
  const subNetflix = {
    id: "netflix-1",
    category: "OTT",
    amount: 17000,
    billingCycle: "매월",
    status: "active",
  };

  const subTving = {
    id: "tving-1",
    category: "OTT",
    amount: 13500,
    billingCycle: "매월",
    status: "active",
  };

  const subMelon = {
    id: "melon-1",
    category: "음악",
    amount: 7900,
    billingCycle: "매월",
    status: "active",
  };

  // 1. When user has only 1 OTT subscription -> ineligible (need at least 2)
  const res1 = canJoinRotation({
    subscription: subNetflix,
    subscriptions: [subNetflix, subMelon],
  });
  assert.equal(res1.eligible, false);
  assert.equal(res1.reason, "NEED_TWO_IN_CATEGORY");

  // 2. When user has 2 OTT subscriptions -> eligible!
  const res2 = canJoinRotation({
    subscription: subNetflix,
    subscriptions: [subNetflix, subTving, subMelon],
  });
  assert.equal(res2.eligible, true);

  // 3. Annual or cancelled subscriptions cannot join rotation
  const annualSub = { ...subNetflix, billingCycle: "매년" };
  assert.equal(
    canJoinRotation({ subscription: annualSub, subscriptions: [annualSub, subTving] }).eligible,
    false
  );

  const cancelledSub = { ...subNetflix, status: "cancelled" };
  assert.equal(
    canJoinRotation({ subscription: cancelledSub, subscriptions: [cancelledSub, subTving] }).eligible,
    false
  );

  // 4. Existing rotation plan evaluation
  const existingPlan = {
    category: "OTT",
    order: ["netflix-1", "tving-1"],
  };
  const resWithPlan = canJoinRotation({
    subscription: subNetflix,
    subscriptions: [subNetflix, subTving],
    rotationPlan: existingPlan,
  });
  assert.equal(resWithPlan.eligible, true);
  assert.equal(resWithPlan.alreadyInPlan, true);
  assert.equal(resWithPlan.reason, "ALREADY_IN_PLAN");
});
