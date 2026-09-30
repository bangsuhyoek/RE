export const OfferCategory = Object.freeze({
  PARTNERSHIP_SAVING: "PARTNERSHIP_SAVING",
  NEW_USER_FREE_TRIAL: "NEW_USER_FREE_TRIAL",
  IRRELEVANT: "IRRELEVANT",
  UNKNOWN: "UNKNOWN",
});

export const FieldState = Object.freeze({
  VERIFIED: "VERIFIED",
  UNKNOWN: "UNKNOWN",
  CONFLICT: "CONFLICT",
  NEEDS_VERIFICATION: "NEEDS_VERIFICATION",
});

export const ActionabilityStatus = Object.freeze({
  VERIFIED_ACTION: "VERIFIED_ACTION",
  VERIFIED_ENTRYPOINT: "VERIFIED_ENTRYPOINT",
  INFO_ONLY: "INFO_ONLY",
  UNKNOWN: "UNKNOWN",
  UNAVAILABLE: "UNAVAILABLE",
});

export const FreshnessStatus = Object.freeze({
  FRESH: "FRESH",
  STALE: "STALE",
  INACTIVE: "INACTIVE",
  UNKNOWN: "UNKNOWN",
});

export const PlanEquivalence = Object.freeze({
  EXACT: "EXACT",
  EQUIVALENT: "EQUIVALENT",
  DOWNGRADE: "DOWNGRADE",
  UPGRADE: "UPGRADE",
  UNKNOWN: "UNKNOWN",
});

export const EligibilityStatus = Object.freeze({
  ELIGIBLE: "ELIGIBLE",
  INELIGIBLE: "INELIGIBLE",
  UNKNOWN: "UNKNOWN",
});

export const PublishDecision = Object.freeze({
  PUBLISH: "PUBLISH",
  DO_NOT_PUBLISH: "DO_NOT_PUBLISH",
});

export const PARTNERSHIP_CRITICAL_FIELDS = Object.freeze([
  "target_service",
  "target_plan",
  "offer_price",
  "action_url",
  "actionability_status",
  "audience",
]);

export const TRIAL_CRITICAL_FIELDS = Object.freeze([
  "target_service",
  "target_plan",
  "trial_duration_days",
  "trial_cost",
  "post_trial_price",
  "new_user_rule",
  "auto_renewal",
  "action_url",
  "actionability_status",
]);

export const DEFAULT_REVERIFY_HOURS = 24;
export const DEFAULT_FETCH_TIMEOUT_MS = 12_000;
export const DEFAULT_MAX_HTML_BYTES = 2_000_000;
