// Explain why a held offer remains unpublished without changing the gate.
// Source quotations are carried only from recorded observations; possible
// conditions and next steps are diagnostic questions, never evidence.
const PRICE_FIELDS = new Set([
  "offer_price", "regular_price", "post_trial_price", "trial_cost",
  "incremental_partner_cost",
]);
const REQUIRED_PRICE_SCOPE = [
  "product", "plan", "audience", "signupPath", "eligibility",
  "billingStage", "priceBasis", "paymentMethod", "option", "effectivePeriod",
];
const REQUIRED_SCOPE = [
  "product", "plan", "audience", "signupPath", "eligibility", "effectivePeriod",
];

function evidenceFor(offer, field) {
  return [...new Set((offer?.fields?.[field]?.evidence || [])
    .map((item) => item.sourceUrl).filter(Boolean))];
}

function classify(failure, offer) {
  if (failure === "TRIAL_VALUE_NOT_COMPUTABLE") {
    return [{ gateFailure: failure, category: "OFFICIAL_EVIDENCE_MISSING", field: null,
      requiredConditions: ["trialDurationDays", "trialCost", ...REQUIRED_PRICE_SCOPE],
      evidenceUrls: [...new Set([
        ...evidenceFor(offer, "trial_duration_days"),
        ...evidenceFor(offer, "trial_cost"),
      ])],
      nextCheck: "Confirm a positive trial duration and a nonnegative payable trial cost " +
        "for the same current official variant, including its payment method.",
    }];
  }
  if (failure === "ACTION_NOT_VERIFIED" ||
      /^(action_url|actionability_status):(UNKNOWN|NO_AUTHORITATIVE_EVIDENCE)$/.test(failure)) {
    return [{ gateFailure: failure, category: "ACTION_BOUNDARY", field: "action_url",
      requiredConditions: ["verifiedOfficialEntrypoint", "authenticationBoundary"],
      evidenceUrls: evidenceFor(offer, "action_url"),
      nextCheck: "Verify the live official entrypoint, and keep post-login completion unasserted." }];
  }
  if (failure.startsWith("UNRESOLVED_CONFLICT:")) {
    return failure.slice("UNRESOLVED_CONFLICT:".length).split(",")
      .filter(Boolean).map((field) => ({
        gateFailure: failure, category: "OFFICIAL_FIELD_CONFLICT", field,
        requiredConditions: PRICE_FIELDS.has(field) ? REQUIRED_PRICE_SCOPE : REQUIRED_SCOPE,
        evidenceUrls: evidenceFor(offer, field),
        nextCheck: "Compare fresh official claims under the same verified conditions and effective period.",
      }));
  }
  const match = failure.match(/^([a-z][a-z_]+):(UNKNOWN|CONFLICT|NO_AUTHORITATIVE_EVIDENCE)$/);
  if (match) {
    const [, field, reason] = match;
    return [{ gateFailure: failure, category: reason === "CONFLICT"
      ? "OFFICIAL_FIELD_CONFLICT" : "OFFICIAL_EVIDENCE_MISSING", field,
    requiredConditions: PRICE_FIELDS.has(field) ? REQUIRED_PRICE_SCOPE : REQUIRED_SCOPE,
    evidenceUrls: evidenceFor(offer, field),
    nextCheck: "Check the field on a current official page for this exact variant." }];
  }
  if (failure.startsWith("VERIFICATION_HOLD:")) {
    const reason = failure.slice("VERIFICATION_HOLD:".length);
    const model = /(?:MODEL|PERCENT|CAP|DISCOUNT|PAYMENT_METHOD_DEPENDENT|OPTION_DEPENDENT|BUNDLE_SELECTION)/.test(reason);
    const action = /(?:ACTION|ENTRYPOINT|REGISTRATION_FLOW|ACCOUNT_REGISTRATION)/.test(reason);
    const price = /(?:PRICE|CHARGE|BILLING)/.test(reason);
    return [{ gateFailure: failure,
      category: model ? "MODEL_OR_VARIANT_REQUIRED" : action
        ? "ACTION_BOUNDARY" : "CONDITION_EVIDENCE_MISSING",
      field: null, requiredConditions: model
        ? ["userSelectionOrCalculationModel", ...REQUIRED_PRICE_SCOPE]
        : action ? ["verifiedOfficialEntrypoint", "authenticationBoundary"]
          : price ? REQUIRED_PRICE_SCOPE : REQUIRED_SCOPE,
      evidenceUrls: evidenceFor(offer, "verification_hold_reason"),
      nextCheck: model
        ? "Represent the selection or capped calculation before rechecking official evidence and UI safety."
        : action
          ? "Verify the official action entrypoint; a login redirect does not prove completion."
          : "Establish which official conditions apply to this variant." }];
  }
  if (failure === "PARTNERSHIP_PRICE_NOT_MONETARY") {
    const hasDiscountFormula = ["discount_rate", "fixed_discount_amount", "per_transaction_cap",
      "monthly_discount_cap"].some((field) => offer?.fields?.[field]?.value != null);
    return [{ gateFailure: failure, category: hasDiscountFormula
      ? "MODEL_OR_VARIANT_REQUIRED" : "OFFICIAL_EVIDENCE_MISSING",
    field: "offer_price", requiredConditions: REQUIRED_PRICE_SCOPE,
    evidenceUrls: evidenceFor(offer, "offer_price"), nextCheck: hasDiscountFormula
      ? "Model the eligible transaction, limits and spend conditions; do not invent a fixed price."
      : "Find the applicable official payable price for this variant." }];
  }
  if (failure === "OFFER_NOT_CURRENT" || failure.startsWith("FRESHNESS_")) {
    return [{ gateFailure: failure, category: "LIFECYCLE", field: null,
      requiredConditions: ["currentOfficialEffectivePeriod"],
      evidenceUrls: offer?.evidenceUrls || [],
      nextCheck: failure === "OFFER_NOT_CURRENT"
        ? "Keep this offer inactive; a new campaign needs its own current evidence and identity."
        : "Refresh official evidence within the configured revalidation window." }];
  }
  return [{ gateFailure: failure, category: "OTHER_GATE_FAILURE", field: null,
    requiredConditions: [], evidenceUrls: [], nextCheck: "Review the named gate failure." }];
}

export function diagnosePublicationHold({ offer, gate } = {}) {
  const failures = [...new Set(gate?.failures || [])];
  const causes = failures.flatMap((failure) => classify(failure, offer));
  const resolutionTasks = causes.map((cause) => {
    const supportedPrice = ["offer_price", "regular_price", "post_trial_price",
      "trial_cost"].includes(cause.field);
    const reviewable = supportedPrice && ["OFFICIAL_FIELD_CONFLICT",
      "OFFICIAL_EVIDENCE_MISSING"].includes(cause.category);
    return {
      gateFailure: cause.gateFailure,
      field: cause.field,
      requiredConditions: cause.requiredConditions,
      evidenceUrls: cause.evidenceUrls,
      status: reviewable ? "AWAITING_SCOPED_OFFICIAL_PROOF" :
        cause.category === "MODEL_OR_VARIANT_REQUIRED" ? "MODEL_REQUIRED" :
          cause.category === "ACTION_BOUNDARY" ? "ACTION_VERIFICATION_REQUIRED" :
            cause.category === "LIFECYCLE" ? "CURRENT_CAMPAIGN_REQUIRED" :
              "UNSUPPORTED_AUTOMATIC_RELEASE",
      // This is a task, not an additional publication rule or an attestation.
      automaticRelease: false,
    };
  });
  return {
    offerId: offer?.offerId || null,
    offerVersion: offer?.offerVersion || null,
    decision: gate?.decision || null,
    causes,
    resolutionTasks,
    // A diagnostic can never change the publish gate or constitute proof.
    needsNewGoldAdjudication: causes.some((item) =>
      ["OFFICIAL_FIELD_CONFLICT", "MODEL_OR_VARIANT_REQUIRED", "CONDITION_EVIDENCE_MISSING"]
        .includes(item.category)),
  };
}
