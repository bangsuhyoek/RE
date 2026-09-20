import { SavingPeriod } from "../../../lib/savingsCalculator.js";
import {
  SubscriptionRelevance,
  classifySubscriptionRelevance,
  isSubscriptionBase,
} from "./subscriptionRelevance.js";

export const MonetaryComputability = Object.freeze({
  CONFIRMED: "CONFIRMED",
  CONDITIONAL: "CONDITIONAL",
  NOT_COMPUTABLE: "NOT_COMPUTABLE",
});

const SUBSCRIPTION_RELEVANT = new Set([
  SubscriptionRelevance.SUBSCRIPTION_COST_REDUCTION,
  SubscriptionRelevance.SUBSCRIPTION_INCLUDED,
  SubscriptionRelevance.BUNDLE_COST_REDUCTION,
  SubscriptionRelevance.PAYMENT_CASHBACK,
  SubscriptionRelevance.SUBSCRIPTION_CREDIT,
]);

function normalize(value = "") {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\uAC00-\uD7A3_]/g, "");
}

function numberValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return NaN;
  const parsed = Number(value.replace(/,/g, "").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function resolveSavingPeriod(offer = {}) {
  const family = normalize(offer.frequency?.family);
  if (/MONTHLY/.test(family)) return SavingPeriod.MONTHLY_RECURRING;
  if (/ANNUAL|YEARLY/.test(family)) return SavingPeriod.ANNUAL;
  if (/ONCE|ONE_TIME|ONETIME/.test(family)) return SavingPeriod.ONE_TIME;

  const explicit =
    offer.displayContract?.saving_period || offer.displayContract?.savingPeriod;
  const token = normalize(explicit);
  if (Object.values(SavingPeriod).includes(token)) return token;
  return null;
}

export function evaluateMonetaryComputability(offer = {}, relevance) {
  const resolvedRelevance = relevance || classifySubscriptionRelevance(offer);
  if (!SUBSCRIPTION_RELEVANT.has(resolvedRelevance)) {
    return {
      status: MonetaryComputability.NOT_COMPUTABLE,
      reason: "NOT_SUBSCRIPTION_MONETARY",
    };
  }

  const type = normalize(offer.benefitType);
  const unit = normalize(offer.benefitUnit);
  const value = numberValue(offer.benefitValue);
  const unresolvedText = JSON.stringify({
    benefitBase: offer.benefitBase,
    displayContract: offer.displayContract,
  });

  if (unresolvedText.includes("RATE_BASE_UNKNOWN")) {
    return {
      status: MonetaryComputability.NOT_COMPUTABLE,
      reason: "RATE_BASE_UNKNOWN",
    };
  }

  if (/POINT/.test(type) || unit === "POINT" || unit === "POINTS") {
    return {
      status: MonetaryComputability.NOT_COMPUTABLE,
      reason: "POINT_VALUE_NOT_PROVEN_IN_KRW",
    };
  }

  if (/FREE|INCLUDED/.test(type) && isSubscriptionBase(offer)) {
    return {
      status: resolveSavingPeriod(offer)
        ? MonetaryComputability.CONFIRMED
        : MonetaryComputability.CONDITIONAL,
      reason: resolveSavingPeriod(offer) ? null : "SAVING_PERIOD_UNKNOWN",
    };
  }

  if (/PERCENT|RATE/.test(type)) {
    if (!Number.isFinite(value)) {
      return {
        status: MonetaryComputability.NOT_COMPUTABLE,
        reason: "RATE_VALUE_UNKNOWN",
      };
    }
    if (!isSubscriptionBase(offer)) {
      return {
        status: MonetaryComputability.NOT_COMPUTABLE,
        reason: "RATE_BASE_UNKNOWN",
      };
    }
    return {
      status: MonetaryComputability.CONDITIONAL,
      reason: resolveSavingPeriod(offer) ? null : "SAVING_PERIOD_UNKNOWN",
    };
  }

  if (
    /FIXED_DISCOUNT|DISCOUNT|CASHBACK|PRICE_OVERRIDE|BUNDLE_PRICE/.test(type) &&
    Number.isFinite(value) &&
    (unit === "KRW" || unit === "\uC6D0")
  ) {
    return {
      status: resolveSavingPeriod(offer)
        ? MonetaryComputability.CONFIRMED
        : MonetaryComputability.CONDITIONAL,
      reason: resolveSavingPeriod(offer) ? null : "SAVING_PERIOD_UNKNOWN",
    };
  }

  return {
    status: MonetaryComputability.NOT_COMPUTABLE,
    reason: "ECONOMIC_FACT_INCOMPLETE",
  };
}
