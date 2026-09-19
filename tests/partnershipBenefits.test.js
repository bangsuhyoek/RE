import test from "node:test";
import assert from "node:assert/strict";
import {
  BenefitEligibility,
  evaluateBenefitEligibility,
} from "../src/lib/benefitMatcher.js";
import {
  calculateBenefitSavings,
  SavingPeriod,
  summarizeConfirmedMonthlySavings,
} from "../src/lib/savingsCalculator.js";

const netflix = {
  id: "netflix",
  name: "Netflix",
  plan: "프리미엄",
  amount: 17000,
  billingCycle: "매월",
  paymentMethod: "신한카드",
  status: "active",
};

const youtube = {
  id: "youtube",
  name: "YouTube Premium",
  plan: "개인",
  amount: 14900,
  billingCycle: "매월",
  paymentMethod: "",
  status: "active",
};
test("Case A: 기존 Netflix 구독자 + 기존 가입자 가능 제휴 => ELIGIBLE", () => {
  const benefit = {
    id: "netflix-existing",
    targetServiceIds: ["netflix"],
    audience: "EXISTING",
    benefitType: "FIXED_DISCOUNT",
    benefitAmount: 5000,
    savingPeriod: SavingPeriod.MONTHLY_RECURRING,
  };
  const result = evaluateBenefitEligibility([netflix], benefit);
  assert.equal(result.status, BenefitEligibility.ELIGIBLE);
});

test("Case B: 기존 Netflix 구독자 + 신규회원 전용 => INELIGIBLE", () => {
  const result = evaluateBenefitEligibility([netflix], {
    targetServiceIds: ["netflix"],
    audience: "NEW",
  });
  assert.equal(result.status, BenefitEligibility.INELIGIBLE);
  assert.ok(result.reasons.includes("NEW_SUBSCRIBER_ONLY"));
});

test("Case C: 특정 카드 필요 + 카드 정보 없음 => NEEDS_CHECK", () => {
  const result = evaluateBenefitEligibility([youtube], {
    targetServiceIds: ["youtube"],
    audience: "EXISTING",
    requiredPaymentMethod: "삼성카드",
  });
  assert.equal(result.status, BenefitEligibility.NEEDS_CHECK);
});
test("Case D: 새 멤버십 가입비를 차감한 순절약액", () => {
  const benefit = {
    targetServiceIds: ["netflix"],
    audience: "EXISTING",
    benefitType: "FREE_INCLUDED",
    savingPeriod: SavingPeriod.MONTHLY_RECURRING,
    requiredMembership: "naverplus",
    requiredCost: 4900,
  };
  const eligibility = evaluateBenefitEligibility([netflix], benefit);
  const savings = calculateBenefitSavings([netflix], benefit, eligibility);

  assert.equal(eligibility.status, BenefitEligibility.ELIGIBLE);
  assert.equal(savings.amount, 12100);
  assert.equal(savings.requiredCost, 4900);
});

test("Case E: 이미 필요한 멤버십 이용 중이면 추가비용 0원", () => {
  const naverPlus = {
    id: "naverplus",
    name: "네이버플러스",
    amount: 4900,
    billingCycle: "매월",
    status: "active",
  };
  const benefit = {
    targetServiceIds: ["netflix"],
    audience: "EXISTING",
    benefitType: "FREE_INCLUDED",
    savingPeriod: SavingPeriod.MONTHLY_RECURRING,
    requiredMembership: "naverplus",
    requiredCost: 4900,
  };
  const eligibility = evaluateBenefitEligibility(
    [netflix, naverPlus],
    benefit
  );
  const savings = calculateBenefitSavings(
    [netflix, naverPlus],
    benefit,
    eligibility
  );

  assert.equal(savings.amount, 17000);
  assert.equal(savings.requiredCost, 0);
  assert.equal(savings.membershipOwned, true);
});

test("Case F: 3개 번들에서 실제 이용 중인 2개 비용만 baseline", () => {
  const subscriptions = [
    {
      id: "disney",
      name: "Disney+",
      amount: 9900,
      billingCycle: "매월",
      status: "active",
    },
    {
      id: "tving",
      name: "TVING",
      amount: 13500,
      billingCycle: "매월",
      status: "active",
    },
  ];
  const benefit = {
    targetServiceIds: ["disney", "tving", "wavve"],
    audience: "EXISTING",
    benefitType: "BUNDLE_PRICE",
    offerPrice: 22300,
    savingPeriod: SavingPeriod.MONTHLY_RECURRING,
  };
  const eligibility = evaluateBenefitEligibility(subscriptions, benefit);
  const savings = calculateBenefitSavings(subscriptions, benefit, eligibility);
  assert.equal(savings.baselineMonthly, 23400);
  assert.equal(savings.amount, 1100);
});

test("Case G: 배타적 동일 서비스 제휴를 총절약액에 중복 합산하지 않음", () => {
  const base = {
    targetServiceIds: ["netflix"],
    audience: "EXISTING",
    savingPeriod: SavingPeriod.MONTHLY_RECURRING,
    stackable: false,
  };
  const high = {
    benefit: { ...base, id: "high", exclusiveGroup: "netflix-choice" },
    eligibility: { status: BenefitEligibility.ELIGIBLE },
    savings: {
      amount: 5000,
      period: SavingPeriod.MONTHLY_RECURRING,
      isConfirmed: true,
    },
  };
  const low = {
    benefit: { ...base, id: "low", exclusiveGroup: "netflix-choice" },
    eligibility: { status: BenefitEligibility.ELIGIBLE },
    savings: {
      amount: 3000,
      period: SavingPeriod.MONTHLY_RECURRING,
      isConfirmed: true,
    },
  };

  const summary = summarizeConfirmedMonthlySavings([low, high]);
  assert.equal(summary.amount, 5000);
  assert.equal(summary.count, 1);
  assert.equal(summary.selected[0].benefit.id, "high");
});

test("Case K: 무료체험 신규 프로모션은 기존 구독자의 메인 추천 대상이 아님", () => {
  const benefit = {
    id: "netflix-free-trial",
    targetServiceIds: ["netflix"],
    audience: "NEW",
    benefitType: "FREE_INCLUDED",
    savingPeriod: SavingPeriod.CAMPAIGN_TOTAL,
  };
  const result = evaluateBenefitEligibility([netflix], benefit);
  assert.equal(result.status, BenefitEligibility.INELIGIBLE);
});
