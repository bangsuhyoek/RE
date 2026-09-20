import { BenefitEligibility } from "../../../lib/benefitMatcher.js";

export const TruthValue = Object.freeze({
  TRUE: "TRUE",
  FALSE: "FALSE",
  UNKNOWN: "UNKNOWN",
});

function normalize(value = "") {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\uAC00-\uD7A3_]/g, "");
}

function activeSubscription(subscription = {}) {
  return !["CANCELLED", "CANCELED", "EXPIRED"].includes(
    String(subscription.status || "active").toUpperCase()
  );
}

function subscriptionId(subscription = {}) {
  return subscription.serviceId || subscription.service_id || subscription.id || "";
}

function matchingSubscriptions(subscriptions = [], offer = {}) {
  const target = normalize(offer.linkedServiceId);
  if (!target) return [];

  return subscriptions.filter((subscription) =>
    activeSubscription(subscription) &&
    normalize(subscriptionId(subscription)) === target
  );
}

function combineAnd(values = []) {
  if (values.some((value) => value === TruthValue.FALSE)) return TruthValue.FALSE;
  if (values.some((value) => value === TruthValue.UNKNOWN)) return TruthValue.UNKNOWN;
  return TruthValue.TRUE;
}

function combineOr(values = []) {
  if (values.some((value) => value === TruthValue.TRUE)) return TruthValue.TRUE;
  if (values.some((value) => value === TruthValue.UNKNOWN)) return TruthValue.UNKNOWN;
  return TruthValue.FALSE;
}

function compareKnown(actual, expected) {
  if (actual == null || actual === "") return TruthValue.UNKNOWN;
  return normalize(actual) === normalize(expected)
    ? TruthValue.TRUE
    : TruthValue.FALSE;
}

function hasKnownArray(context, key) {
  return Object.prototype.hasOwnProperty.call(context || {}, key) &&
    Array.isArray(context[key]);
}

function membershipTruth(required, subscriptions, userContext) {
  const wanted = normalize(required);
  if (!wanted) return TruthValue.UNKNOWN;

  if (subscriptions.some((subscription) =>
    activeSubscription(subscription) &&
    [subscriptionId(subscription), subscription.name]
      .map(normalize)
      .includes(wanted)
  )) {
    return TruthValue.TRUE;
  }

  if (!hasKnownArray(userContext, "memberships")) return TruthValue.UNKNOWN;
  return userContext.memberships.map(normalize).includes(wanted)
    ? TruthValue.TRUE
    : TruthValue.FALSE;
}

function planTruth(required, matchedSubscriptions) {
  const plans = matchedSubscriptions
    .map((subscription) => subscription.plan)
    .filter((value) => value != null && value !== "");
  if (plans.length === 0) return TruthValue.UNKNOWN;

  return plans.some((plan) => normalize(plan) === normalize(required))
    ? TruthValue.TRUE
    : TruthValue.FALSE;
}

function paymentTruth(required, matchedSubscriptions, userContext) {
  const methods = [
    ...(Array.isArray(userContext?.paymentMethods) ? userContext.paymentMethods : []),
    ...matchedSubscriptions.map((subscription) => subscription.paymentMethod),
  ].filter((value) => value != null && value !== "");

  if (methods.length === 0) return TruthValue.UNKNOWN;
  return methods.some((method) => normalize(method).includes(normalize(required)))
    ? TruthValue.TRUE
    : TruthValue.FALSE;
}

function audienceTruth(value, matchedSubscriptions) {
  const token = normalize(value);
  if (["BOTH", "ALL", "ANY", "NO_RESTRICTION"].includes(token)) {
    return TruthValue.TRUE;
  }
  if (["EXISTING", "EXISTING_SUBSCRIBER", "CURRENT_SUBSCRIBER"].includes(token)) {
    return matchedSubscriptions.length > 0 ? TruthValue.TRUE : TruthValue.FALSE;
  }
  if (["NEW", "NEW_ONLY", "NEW_SUBSCRIBER_ONLY"].includes(token)) {
    return matchedSubscriptions.length > 0 ? TruthValue.FALSE : TruthValue.UNKNOWN;
  }
  return TruthValue.UNKNOWN;
}

function evaluateObjectCondition(condition, matchedSubscriptions, userContext) {
  const operator = normalize(condition.operator || condition.op);
  const children = condition.children || condition.conditions;

  if (operator === "AND" && Array.isArray(children)) {
    return combineAnd(children.map((item) =>
      evaluateCondition(item, matchedSubscriptions, userContext)
    ));
  }
  if (operator === "OR" && Array.isArray(children)) {
    return combineOr(children.map((item) =>
      evaluateCondition(item, matchedSubscriptions, userContext)
    ));
  }
  if (operator === "NOT" && Array.isArray(children) && children.length === 1) {
    const value = evaluateCondition(children[0], matchedSubscriptions, userContext);
    if (value === TruthValue.TRUE) return TruthValue.FALSE;
    if (value === TruthValue.FALSE) return TruthValue.TRUE;
    return TruthValue.UNKNOWN;
  }

  const checks = [];
  const audience = condition.audience || condition.audience_type || condition.type;
  if (audience) checks.push(audienceTruth(audience, matchedSubscriptions));

  const requiredCarrier = condition.required_carrier || condition.requiredCarrier;
  if (requiredCarrier) checks.push(compareKnown(userContext?.carrier, requiredCarrier));

  const requiredPlan = condition.required_plan || condition.requiredPlan;
  if (requiredPlan) checks.push(planTruth(requiredPlan, matchedSubscriptions));

  const requiredPayment =
    condition.required_payment_method || condition.requiredPaymentMethod;
  if (requiredPayment) {
    checks.push(paymentTruth(requiredPayment, matchedSubscriptions, userContext));
  }

  const requiredMembership =
    condition.required_membership || condition.requiredMembership;
  if (requiredMembership) {
    const owned = membershipTruth(requiredMembership, matchedSubscriptions, userContext);
    checks.push(condition.allow_join === true && owned !== TruthValue.TRUE
      ? TruthValue.TRUE
      : owned);
  }

  return checks.length > 0 ? combineAnd(checks) : TruthValue.UNKNOWN;
}

export function evaluateCondition(condition, matchedSubscriptions, userContext = {}) {
  if (condition === undefined || condition === null) return TruthValue.UNKNOWN;
  if (condition === true) return TruthValue.TRUE;
  if (condition === false) return TruthValue.FALSE;
  if (typeof condition === "string") {
    return audienceTruth(condition, matchedSubscriptions);
  }
  if (Array.isArray(condition)) {
    return combineAnd(condition.map((item) =>
      evaluateCondition(item, matchedSubscriptions, userContext)
    ));
  }
  if (typeof condition === "object") {
    if (Object.keys(condition).length === 0) return TruthValue.TRUE;
    return evaluateObjectCondition(condition, matchedSubscriptions, userContext);
  }
  return TruthValue.UNKNOWN;
}

function channelTruth(condition, userContext) {
  if (condition === undefined || condition === null) return TruthValue.UNKNOWN;
  const token = normalize(condition);
  if (["ANY", "ALL", "NO_RESTRICTION"].includes(token)) return TruthValue.TRUE;

  if (!userContext || userContext.channel == null || userContext.channel === "") {
    return TruthValue.UNKNOWN;
  }
  if (token === "APP_ONLY") {
    return normalize(userContext.channel) === "APP"
      ? TruthValue.TRUE
      : TruthValue.FALSE;
  }
  return compareKnown(userContext.channel, condition);
}

function exclusionsTruth(exclusions, matchedSubscriptions, userContext) {
  if (exclusions === undefined || exclusions === null) return TruthValue.UNKNOWN;
  if (!Array.isArray(exclusions)) return TruthValue.UNKNOWN;
  if (exclusions.length === 0) return TruthValue.TRUE;

  const results = exclusions.map((item) =>
    evaluateCondition(item, matchedSubscriptions, userContext)
  );
  if (results.some((value) => value === TruthValue.TRUE)) return TruthValue.FALSE;
  if (results.some((value) => value === TruthValue.UNKNOWN)) return TruthValue.UNKNOWN;
  return TruthValue.TRUE;
}

export function evaluateUserConstraints(
  offer = {},
  subscriptions = [],
  userContext = {}
) {
  const matchedSubscriptions = matchingSubscriptions(subscriptions, offer);
  const values = [
    evaluateCondition(offer.audienceCondition, matchedSubscriptions, userContext),
    evaluateCondition(offer.paymentCondition, matchedSubscriptions, userContext),
    channelTruth(offer.channelCondition, userContext),
    exclusionsTruth(offer.exclusions, matchedSubscriptions, userContext),
  ];

  const truth = combineAnd(values);
  return {
    truth,
    status: truth === TruthValue.TRUE
      ? BenefitEligibility.ELIGIBLE
      : truth === TruthValue.FALSE
        ? BenefitEligibility.INELIGIBLE
        : BenefitEligibility.NEEDS_CHECK,
    matchedSubscriptions,
    checks: {
      audience: values[0],
      payment: values[1],
      channel: values[2],
      exclusions: values[3],
    },
  };
}
