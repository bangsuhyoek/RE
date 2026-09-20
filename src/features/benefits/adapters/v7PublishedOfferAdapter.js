function own(row, key) {
  return Object.prototype.hasOwnProperty.call(row || {}, key)
    ? row[key]
    : undefined;
}

function cloneJson(value) {
  if (value == null || typeof value !== "object") return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export const V7_PUBLIC_PROJECTION = "v7_public_offers";

export function validateV7PublicOfferRow(row = {}) {
  const errors = [];
  for (const field of ["service_offer_id", "service_id", "source_url"]) {
    if (typeof own(row, field) !== "string" || own(row, field).length === 0) {
      errors.push(`MISSING_${field.toUpperCase()}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function mapV7PublicOffer(row = {}) {
  const validation = validateV7PublicOfferRow(row);
  if (!validation.valid) {
    throw new TypeError(`Invalid V7 public offer: ${validation.errors.join(",")}`);
  }

  return {
    source: "TRUSTFIX_V7",
    projection: V7_PUBLIC_PROJECTION,
    publicationState: "PUBLISHED",
    serviceOfferId: own(row, "service_offer_id"),
    linkedServiceId: own(row, "service_id"),
    serviceName: own(row, "service_name"),
    partner: own(row, "partner"),
    benefitName: own(row, "benefit_name"),
    benefitType: own(row, "benefit_type"),
    benefitValue: own(row, "benefit_value"),
    benefitUnit: own(row, "benefit_unit"),
    benefitBase: own(row, "benefit_base"),
    minimumPurchase: {
      value: own(row, "minimum_purchase_value"),
      unit: own(row, "minimum_purchase_unit"),
      sourceExpression: own(row, "minimum_purchase_source_expression"),
    },
    maximumBenefit: cloneJson(own(row, "maximum_benefit")),
    frequency: {
      family: own(row, "frequency_family"),
      count: own(row, "frequency_count"),
      sourceExpression: own(row, "frequency_source_expression"),
    },
    audienceCondition: cloneJson(own(row, "audience_condition")),
    paymentCondition: cloneJson(own(row, "payment_condition")),
    channelCondition: own(row, "channel_condition"),
    exclusions: cloneJson(own(row, "exclusions")),
    selectionRelation: cloneJson(own(row, "selection_relation")),
    lottery: {
      awardMechanism: own(row, "lottery_award_mechanism"),
      certainty: own(row, "lottery_certainty"),
      allocationMethod: own(row, "allocation_method"),
    },
    certainty: own(row, "certainty"),
    temporal: {
      start: own(row, "temporal_start"),
      end: own(row, "temporal_end"),
    },
    sourceUrl: own(row, "source_url"),
    displayContract: cloneJson(own(row, "display_contract")),
    rawPublicOffer: cloneJson(row),
  };
}
