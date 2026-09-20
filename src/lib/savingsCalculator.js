import { BenefitEligibility, getTargetSubscriptions } from "./benefitMatcher.js";

export const SavingPeriod = Object.freeze({
  MONTHLY_RECURRING: "MONTHLY_RECURRING",
  ONE_TIME: "ONE_TIME",
  CAMPAIGN_TOTAL: "CAMPAIGN_TOTAL",
  ANNUAL: "ANNUAL",
});

function normalize(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "");
}

function monthlyAmount(subscription = {}) {
  const amount = Number(subscription.amount) || 0;
  const cycle = String(subscription.billingCycle || "").toLowerCase();
  if (cycle.includes("년") || cycle.includes("annual") || cycle.includes("year")) {
    return amount / 12;
  }
  return amount;
}

function ownsMembership(subscriptions, requiredMembership) {
  const required = normalize(requiredMembership);
  if (!required) return true;
  return subscriptions.some((subscription) =>
    [subscription.id, subscription.serviceId, subscription.service_id, subscription.name]
      .map(normalize)
      .includes(required)
  );
}
function capped(value, cap) {
  const numeric = Math.max(0, Number(value) || 0);
  const numericCap = Number(cap);
  return Number.isFinite(numericCap) && numericCap >= 0
    ? Math.min(numeric, numericCap)
    : numeric;
}

function periodBaseline(monthlyBaseline, period) {
  return period === SavingPeriod.ANNUAL
    ? monthlyBaseline * 12
    : monthlyBaseline;
}

export function calculateBenefitSavings(
  subscriptions = [],
  benefit = {},
  eligibility = null
) {
  const period = String(
    benefit.savingPeriod || benefit.saving_period || SavingPeriod.MONTHLY_RECURRING
  ).toUpperCase();
  const matchedSubscriptions = eligibility?.matchedSubscriptions?.length
    ? eligibility.matchedSubscriptions
    : getTargetSubscriptions(subscriptions, benefit);
  const baselineMonthly = matchedSubscriptions.reduce(
    (sum, subscription) => sum + monthlyAmount(subscription),
    0
  );

  if (baselineMonthly <= 0) {
    return {
      amount: null,
      period,
      isConfirmed: false,
      reason: "NO_CURRENT_COST",
      baselineMonthly,
    };
  }
  const requiredMembership =
    benefit.requiredMembership || benefit.required_membership;
  const membershipOwned = ownsMembership(subscriptions, requiredMembership);
  const rawRequiredCost = benefit.requiredCost ?? benefit.required_cost;
  const requiredCostKnown =
    !requiredMembership || membershipOwned || Number.isFinite(Number(rawRequiredCost));

  if (!requiredCostKnown) {
    return {
      amount: null,
      period,
      isConfirmed: false,
      reason: "REQUIRED_COST_UNKNOWN",
      baselineMonthly,
    };
  }

  const requiredCost = requiredMembership && !membershipOwned
    ? Math.max(0, Number(rawRequiredCost) || 0)
    : 0;
  const baseline = periodBaseline(baselineMonthly, period);
  const type = String(benefit.benefitType || benefit.benefit_type || "").toUpperCase();
  const benefitAmount = Number(benefit.benefitAmount ?? benefit.benefit_amount);
  const benefitRate = Number(benefit.benefitRate ?? benefit.benefit_rate);
  const benefitCap = benefit.benefitCap ?? benefit.benefit_cap;
  const offerPrice = Number(benefit.offerPrice ?? benefit.offer_price);

  let saving = null;
  let afterCost = null;
  if (type === "CASHBACK" || type === "FIXED_DISCOUNT" || type === "COUPON") {
    if (Number.isFinite(benefitAmount)) {
      saving = capped(benefitAmount, benefitCap) - requiredCost;
      afterCost = Math.max(0, baseline - saving);
    }
  } else if (type === "PERCENT_DISCOUNT") {
    if (Number.isFinite(benefitRate)) {
      const rate = benefitRate > 1 ? benefitRate / 100 : benefitRate;
      saving = capped(baseline * Math.max(0, rate), benefitCap) - requiredCost;
      afterCost = Math.max(0, baseline - saving);
    }
  } else if (type === "FREE_INCLUDED") {
    saving = baseline - requiredCost;
    afterCost = requiredCost;
  } else if (type === "BUNDLE_PRICE" || type === "PRICE_OVERRIDE") {
    if (Number.isFinite(offerPrice)) {
      afterCost = Math.max(0, offerPrice + requiredCost);
      saving = baseline - afterCost;
    }
  } else if (Number.isFinite(benefitAmount) && type) {
    saving = capped(benefitAmount, benefitCap) - requiredCost;
    afterCost = Math.max(0, baseline - saving);
  }

  if (!Number.isFinite(saving)) {
    return {
      amount: null,
      period,
      isConfirmed: false,
      reason: "SAVING_NOT_COMPUTABLE",
      baselineMonthly,
      requiredCost,
    };
  }
  const amount = Math.max(0, Math.round(saving));
  const status = eligibility?.status || BenefitEligibility.NEEDS_CHECK;
  return {
    amount,
    period,
    isConfirmed: status === BenefitEligibility.ELIGIBLE && amount > 0,
    isPositive: amount > 0,
    baselineMonthly,
    baselinePeriod: Math.round(baseline),
    afterCost: Number.isFinite(afterCost) ? Math.round(afterCost) : null,
    requiredCost,
    membershipOwned,
    reason: amount > 0 ? null : "NO_NET_SAVING",
  };
}

function targetKey(benefit = {}) {
  const ids = benefit.targetServiceIds || benefit.target_service_ids || benefit.sourceServiceIds || [];
  return [...ids].map(normalize).filter(Boolean).sort().join("+");
}

function conflictMeta(item = {}) {
  const benefit = item.benefit || item;
  const exclusiveGroup =
    benefit.exclusiveGroup || benefit.exclusive_group || null;
  const stackable =
    typeof benefit.stackable === "boolean" ? benefit.stackable : undefined;

  return {
    item,
    benefit,
    exclusiveGroup,
    targetKey: targetKey(benefit),
    stackable,
    // A named exclusive group establishes cross-offer compatibility boundaries.
    // Explicit stackable=true also proves that the offer may coexist.
    // stackable=false without a group only says "not stackable" locally and is
    // not enough to prove compatibility with offers for a different target.
    relationKnown: Boolean(exclusiveGroup) || stackable === true,
  };
}

function benefitsConflict(left, right) {
  if (
    left.exclusiveGroup &&
    right.exclusiveGroup &&
    left.exclusiveGroup === right.exclusiveGroup
  ) {
    return true;
  }

  if (
    left.targetKey &&
    right.targetKey &&
    left.targetKey === right.targetKey &&
    !(left.stackable === true && right.stackable === true)
  ) {
    return true;
  }

  return false;
}

function greedyCompatibleSelection(metaItems = []) {
  const selected = [];
  for (const candidate of metaItems) {
    if (selected.some((chosen) => benefitsConflict(candidate, chosen))) continue;
    selected.push(candidate);
  }
  return selected;
}

function selectBestCompatibleKnown(metaItems = []) {
  if (metaItems.length <= 1) return [...metaItems];

  // Exact branch-and-bound for the normal recommendation set. Fall back to the
  // safe greedy selector for unusually large sets so UI calculation cannot
  // become exponential.
  if (metaItems.length > 22) {
    return greedyCompatibleSelection(metaItems);
  }

  const suffixAmounts = new Array(metaItems.length + 1).fill(0);
  for (let index = metaItems.length - 1; index >= 0; index -= 1) {
    suffixAmounts[index] =
      suffixAmounts[index + 1] + metaItems[index].item.savings.amount;
  }

  let best = [];
  let bestAmount = 0;

  function visit(index, selected, total) {
    if (total + suffixAmounts[index] <= bestAmount) return;
    if (index >= metaItems.length) {
      if (total > bestAmount) {
        best = [...selected];
        bestAmount = total;
      }
      return;
    }

    const candidate = metaItems[index];
    if (!selected.some((chosen) => benefitsConflict(candidate, chosen))) {
      selected.push(candidate);
      visit(index + 1, selected, total + candidate.item.savings.amount);
      selected.pop();
    }
    visit(index + 1, selected, total);
  }

  visit(0, [], 0);
  return best;
}

export function summarizeConfirmedMonthlySavings(recommendations = []) {
  const eligible = recommendations
    .filter((item) =>
      item?.eligibility?.status === BenefitEligibility.ELIGIBLE &&
      item?.savings?.isConfirmed &&
      item.savings.period === SavingPeriod.MONTHLY_RECURRING &&
      item.savings.amount > 0
    )
    .sort((a, b) => b.savings.amount - a.savings.amount);

  const meta = eligible.map(conflictMeta);
  const known = meta.filter((entry) => entry.relationKnown);
  const uncertain = meta.filter((entry) => !entry.relationKnown);
  const knownSelected = selectBestCompatibleKnown(known);
  const knownAmount = knownSelected.reduce(
    (sum, entry) => sum + entry.item.savings.amount,
    0
  );

  let selectedMeta = knownSelected;
  if (eligible.length === 1 && uncertain.length === 1) {
    selectedMeta = uncertain;
  } else if (uncertain.length > 0) {
    const bestUncertain = uncertain[0];
    if (!knownSelected.length || bestUncertain.item.savings.amount > knownAmount) {
      selectedMeta = [bestUncertain];
    }
  }

  const selected = selectedMeta.map((entry) => entry.item);
  const groupMap = new Map();
  for (const entry of known) {
    if (!entry.exclusiveGroup) continue;
    if (!groupMap.has(entry.exclusiveGroup)) groupMap.set(entry.exclusiveGroup, []);
    groupMap.get(entry.exclusiveGroup).push(entry);
  }
  const exclusiveChoices = [...groupMap.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([group, entries]) => ({
      group,
      items: entries.map((entry) => entry.item),
      selected: entries.find((entry) => selectedMeta.includes(entry))?.item || null,
    }));

  return {
    amount: selected.reduce((sum, item) => sum + item.savings.amount, 0),
    count: selected.length,
    candidateCount: eligible.length,
    selected,
    exclusiveChoices,
    uncertainItems: uncertain.map((entry) => entry.item),
    hasUncertainCompatibility: eligible.length > 1 && uncertain.length > 0,
  };
}
