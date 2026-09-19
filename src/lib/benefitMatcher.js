export const BenefitEligibility = Object.freeze({
  ELIGIBLE: "ELIGIBLE",
  NEEDS_CHECK: "NEEDS_CHECK",
  INELIGIBLE: "INELIGIBLE",
});

function normalize(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "");
}

function asArray(value) {
  if (value == null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function subscriptionServiceId(subscription = {}) {
  return subscription.serviceId || subscription.service_id || subscription.id || "";
}

function isActiveSubscription(subscription = {}) {
  return !["cancelled", "canceled", "expired"].includes(
    String(subscription.status || "active").toLowerCase()
  );
}
export function getTargetSubscriptions(subscriptions = [], benefit = {}) {
  const targetIds = asArray(
    benefit.targetServiceIds || benefit.target_service_ids || benefit.sourceServiceIds
  ).map(normalize).filter(Boolean);

  return subscriptions.filter((subscription) => {
    if (!isActiveSubscription(subscription)) return false;
    const id = normalize(subscriptionServiceId(subscription));
    return id && targetIds.includes(id);
  });
}

function membershipIsOwned(subscriptions, requiredMembership, userContext) {
  const required = normalize(requiredMembership);
  if (!required) return true;

  const contextMemberships = asArray(userContext?.memberships).map(normalize);
  if (contextMemberships.includes(required)) return true;

  return subscriptions.some((subscription) => {
    if (!isActiveSubscription(subscription)) return false;
    return [subscriptionServiceId(subscription), subscription.name]
      .map(normalize)
      .includes(required);
  });
}

function paymentMethodMatches(requiredPaymentMethod, targetSubscriptions, userContext) {
  const required = normalize(requiredPaymentMethod);
  if (!required) return { known: true, matches: true };

  const methods = [
    ...asArray(userContext?.paymentMethods),
    ...targetSubscriptions.map((subscription) => subscription.paymentMethod),
  ].map(normalize).filter(Boolean);
  if (methods.length === 0) return { known: false, matches: false };
  return {
    known: true,
    matches: methods.some((method) => method.includes(required) || required.includes(method)),
  };
}

function requiredPlanMatches(requiredPlan, targetSubscriptions) {
  const required = asArray(requiredPlan).map(normalize).filter(Boolean);
  if (required.length === 0) return { known: true, matches: true };

  const plans = targetSubscriptions
    .map((subscription) => normalize(subscription.plan))
    .filter(Boolean);
  if (plans.length === 0) return { known: false, matches: false };

  return {
    known: true,
    matches: plans.some((plan) =>
      required.some((item) => plan === item || plan.includes(item) || item.includes(plan))
    ),
  };
}

export function evaluateBenefitEligibility(
  subscriptions = [],
  benefit = {},
  userContext = {}
) {
  const matchedSubscriptions = getTargetSubscriptions(subscriptions, benefit);
  if (matchedSubscriptions.length === 0) {
    return {
      status: BenefitEligibility.INELIGIBLE,
      reasons: ["SERVICE_NOT_SUBSCRIBED"],
      matchedSubscriptions,
      actions: [],
    };
  }
  const reasons = [];
  const actions = [];
  let needsCheck = false;
  const audience = String(benefit.audience || "UNKNOWN").toUpperCase();

  if (audience === "NEW") {
    return {
      status: BenefitEligibility.INELIGIBLE,
      reasons: ["NEW_SUBSCRIBER_ONLY"],
      matchedSubscriptions,
      actions,
    };
  }
  if (!["EXISTING", "BOTH"].includes(audience)) {
    needsCheck = true;
    reasons.push("AUDIENCE_NEEDS_CONFIRMATION");
  }

  const planMatch = requiredPlanMatches(
    benefit.requiredPlan || benefit.required_plan,
    matchedSubscriptions
  );
  if (!planMatch.known) {
    needsCheck = true;
    reasons.push("PLAN_NEEDS_CONFIRMATION");
  } else if (!planMatch.matches) {
    return {
      status: BenefitEligibility.INELIGIBLE,
      reasons: ["CURRENT_PLAN_NOT_ELIGIBLE"],
      matchedSubscriptions,
      actions,
    };
  }

  const requiredCarrier = benefit.requiredCarrier || benefit.required_carrier;
  if (requiredCarrier) {
    const knownCarrier = normalize(userContext.carrier);
    if (!knownCarrier) {
      needsCheck = true;
      reasons.push("CARRIER_NEEDS_CONFIRMATION");
    } else if (knownCarrier !== normalize(requiredCarrier)) {
      return {
        status: BenefitEligibility.INELIGIBLE,
        reasons: ["CARRIER_NOT_ELIGIBLE"],
        matchedSubscriptions,
        actions,
      };
    }
  }

  const requiredPaymentMethod =
    benefit.requiredPaymentMethod || benefit.required_payment_method;
  const paymentMatch = paymentMethodMatches(
    requiredPaymentMethod,
    matchedSubscriptions,
    userContext
  );
  if (!paymentMatch.known) {
    needsCheck = true;
    reasons.push("PAYMENT_METHOD_NEEDS_CONFIRMATION");
  } else if (!paymentMatch.matches) {
    needsCheck = true;
    reasons.push("PAYMENT_METHOD_CHANGE_REQUIRED");
    actions.push("CHANGE_PAYMENT_METHOD");
  }

  const requiredMembership =
    benefit.requiredMembership || benefit.required_membership;
  if (requiredMembership && !membershipIsOwned(subscriptions, requiredMembership, userContext)) {
    const requiredCost = Number(benefit.requiredCost ?? benefit.required_cost);
    if (!Number.isFinite(requiredCost)) {
      needsCheck = true;
      reasons.push("MEMBERSHIP_COST_NEEDS_CONFIRMATION");
    }
    actions.push("JOIN_REQUIRED_MEMBERSHIP");
  }
  const rules = benefit.eligibilityRules || benefit.eligibility_rules || {};
  if (rules.requiresConfirmation === true) {
    needsCheck = true;
    reasons.push("ADDITIONAL_CONDITIONS_NEED_CONFIRMATION");
  }

  if (benefit.planChangeRequired || benefit.plan_change_required) {
    actions.push("CHANGE_PLAN");
  }

  return {
    status: needsCheck
      ? BenefitEligibility.NEEDS_CHECK
      : BenefitEligibility.ELIGIBLE,
    reasons,
    matchedSubscriptions,
    actions: [...new Set(actions)],
  };
}
