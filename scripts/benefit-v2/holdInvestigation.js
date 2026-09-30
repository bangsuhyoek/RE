import { diagnosePublicationHold } from "./holdDiagnosis.js";

function officialPageLeads(related) {
  return related.flatMap((attempt) => {
    if (attempt.candidate?.trustedConstraints?.trustedEvidenceVerified !== true) return [];
    const allowed = attempt.candidate.trustedConstraints.conditionAllowedOrigins || [];
    return (attempt.snapshots || []).flatMap((page) => {
      try {
        const url = new URL(page.url);
        const final = new URL(page.finalUrl || page.url);
        if (!page.ok || url.protocol !== "https:" ||
            url.href !== final.href || !allowed.includes(url.origin)) return [];
        const body = String(page.text || "").slice(0, 100_000);
        const requiredPlan = attempt.candidate.trustedConstraints.requiredPlan;
        return [{ url: url.href, facets: [
          requiredPlan && body.includes(requiredPlan) ? "plan" : null,
          /(?:선택.{0,12}(?:옵션|혜택|상품)|택\s*1|OTT\s*[12])/i.test(body)
            ? "option" : null,
          /(?:결제\s*(?:수단|방법)|카드\s*결제)/.test(body) ? "paymentMethod" : null,
          /(?:전월.{0,12}(?:이용|실적)|월\s*이용\s*금액)/.test(body)
            ? "priorMonthSpendRequirement" : null,
          /(?:월.{0,15}할인.{0,10}한도|건당.{0,10}할인.{0,10}한도)/.test(body)
            ? "discountCap" : null,
          /(?:월말.{0,25}유지|갱신.{0,15}(?:월|일))/.test(body)
            ? "billingStage" : null,
          /(?:20\d{2}[.\-/]\d{1,2}[.\-/]\d{1,2}|20\d{2}년\s*\d{1,2}월)/.test(body)
            ? "effectivePeriod" : null,
        ].filter(Boolean) }];
      } catch { return []; }
    });
  });
}

function evidenceCombinationPlans(task, related) {
  const pageLeads = officialPageLeads(related);
  const sourceUrls = [...new Set(pageLeads.map((page) => page.url))].slice(0, 4);
  const observedFacets = [...new Set(pageLeads.flatMap((page) => page.facets))];
  const constraints = related.map((item) => item.candidate?.trustedConstraints || {});
  const hasCappedDiscount = constraints.some((item) => item.discountRate != null ||
    item.monthlyDiscountCap != null || item.perTransactionCap != null);
  const hasOptions = constraints.some((item) => item.bundleOptions?.length > 1 ||
    item.bundleSelectionLimit != null);
  const hasCatalogGroup = constraints.some((item) => item.priceReview?.catalogJoin);
  const isAction = task.field === "action_url" ||
    task.requiredConditions.includes("verifiedOfficialEntrypoint");
  const isPrice = ["offer_price", "regular_price", "post_trial_price",
    "trial_cost", "incremental_partner_cost"].includes(task.field) ||
    /(?:PRICE|CHARGE|TRIAL_VALUE)/.test(task.gateFailure);
  let combinations;
  let independentInputs = [];
  if (isAction) {
    combinations = [["product", "plan", "option", "signupPath",
      "verifiedOfficialEntrypoint", "authenticationBoundary"]];
  } else if (hasCappedDiscount && isPrice) {
    combinations = [["product", "plan", "eligiblePaymentChannel",
      "priorMonthSpendRequirement", "eligibleTransaction", "discountRate",
      "perTransactionCap", "monthlyDiscountCap", "billingStage"]];
    independentInputs = ["userPriorMonthSpend", "userEligiblePaymentAmount"];
  } else if (hasCatalogGroup && isPrice) {
    combinations = [["product", "plan", "catalogPrice", "officialUsageGuide",
      "signupPath", "eligibility", "billingStage", "currentOfficialPlan"]];
  } else if (hasOptions && isPrice) {
    combinations = [["product", "plan", "selectedOption", "signupPath",
      "billingStage", "effectivePeriod", "finalCharge"]];
  } else if (task.field === "incremental_partner_cost") {
    combinations = [["membershipProduct", "audience", "studentEligibility",
      "ownership", "membershipMonthlyCost", "effectivePeriod"]];
    independentInputs = ["userMembershipOwnership"];
  } else {
    combinations = [task.requiredConditions.length ? task.requiredConditions :
      ["product", "plan", "audience", "signupPath", "effectivePeriod"]];
  }
  const fromRows = related.flatMap((item) =>
    item.conditionLearning?.analysis?.proposedCombinations || []);
  return [...fromRows.map((dimensions) => ({
    dimensions, basis: "CURRENT_OFFICIAL_ROW",
  })), ...combinations.map((dimensions) => ({
    dimensions, basis: "UNVERIFIED_PROOF_OBLIGATION",
  }))].slice(0, 4).map((plan) => ({ ...plan,
    sourceUrls, observedOfficialFacets: observedFacets,
    independentInputs, proofStatus: "NEEDS_CURRENT_SCOPED_EVIDENCE",
    automaticRelease: false,
  }));
}

// Every held cause gets an observable route. A diagnostic task alone is never
// counted as a verification attempt and cannot change the publication gate.
export function summarizeHoldInvestigations(outcomes = [], attempts = []) {
  return outcomes.filter(({ gate }) => gate.decision !== "PUBLISH")
    .flatMap(({ offer, gate }) => {
      const sources = attempts.filter((item) => item.processed &&
        offer.sourceCandidates.includes(item.processed));
      return diagnosePublicationHold({ offer, gate }).resolutionTasks.map((task) => {
        const priceReview = sources.find((item) =>
          item.candidate?.trustedConstraints?.priceReview);
        const discovery = sources.find((item) => item.conditionLearning);
        const explicitReview = sources.find((item) => item.conditionReviewResult);
        const automaticReview = sources.find((item) => item.automaticConditionResult);
        const relevantPrice = task.field === "offer_price" ||
          /PRICE_CONTEXT/.test(task.gateFailure);
        let strategy = "NONE";
        let status = "SKIPPED";
        let reason = task.status;
        if (relevantPrice && discovery) {
          strategy = "OFFICIAL_CONDITION_DISCOVERY";
          status = "ATTEMPTED";
          reason = discovery.conditionLearning.status;
        } else if (relevantPrice && priceReview) {
          strategy = "OFFICIAL_PRICE_REVIEW";
          status = "ATTEMPTED";
          reason = (priceReview.candidate.discoveryRefs || [])
            .find((ref) => ref.priceReview)?.priceReview?.status || "UNVERIFIED_CONTEXT";
        } else if (explicitReview && task.field ===
          explicitReview.candidate.trustedConstraints?.conditionReview?.field) {
          strategy = "EXPLICIT_CONDITION_REVIEW";
          status = "ATTEMPTED";
          reason = explicitReview.conditionReviewResult.status;
        } else if (automaticReview && task.field === automaticReview.automaticConditionResult.field) {
          strategy = "AUTOMATIC_PRICE_REVIEW";
          status = "ATTEMPTED";
          reason = automaticReview.automaticConditionResult.status;
        } else if (task.status === "AWAITING_SCOPED_OFFICIAL_PROOF") {
          reason = "NO_SUPPORTED_OFFICIAL_SCOPE_RESOLVER";
        }
        return { offerId: offer.offerId, gateFailure: task.gateFailure,
          strategy, status, reason, automaticRelease: false };
      });
    });
}

// Preserve each field's own condition combination. Joining every failure into
// one synthetic price claim would manufacture evidence across separate pages.
export function summarizeHeldConditionBundles(outcomes = [], attempts = []) {
  return outcomes.filter(({ gate }) => gate.decision !== "PUBLISH")
    .map(({ offer, gate }) => {
      const related = attempts.filter((item) => item.processed &&
        offer.sourceCandidates.includes(item.processed));
      const tasks = diagnosePublicationHold({ offer, gate }).resolutionTasks;
      return { offerId: offer.offerId, status: "PROOF_REQUIRED",
        unresolvedFailures: [...new Set(gate.failures || [])],
        combinations: tasks.map((task) => {
          const matching = related.filter((attempt) => attempt.conditionLearning &&
            (task.field === attempt.conditionLearning.target?.field ||
              (task.field === "offer_price" &&
                /PRICE_CONTEXT/.test(task.gateFailure))));
          const observed = matching.flatMap((attempt) =>
            attempt.conditionLearning.analysis?.proposedCombinations || []);
          return { gateFailure: task.gateFailure, field: task.field,
            requiredConditions: task.requiredConditions,
            officialEvidenceUrls: [...new Set(task.evidenceUrls || [])],
            proposedFromOfficialRows: [...new Map(observed.map((fields) =>
              [fields.join("|"), fields])).values()].slice(0, 8),
            newConditionCandidates: matching.flatMap((attempt) =>
              attempt.conditionLearning.analysis?.newConditionCandidates || []).slice(0, 4),
            investigation: matching.map((attempt) => ({
              variantId: attempt.candidate.variantId,
              status: attempt.conditionLearning.status,
              missingIndependentConditions:
                attempt.conditionLearning.analysis?.missingIndependentConditions || [],
              missingStructuredConditions:
                attempt.conditionLearning.analysis?.missingStructuredConditions || [],
            })),
            evidenceCombinationPlans: evidenceCombinationPlans(task, related),
            resolutionStatus: task.status,
            // No bundle or proposed dimension can change the publish gate.
            automaticRelease: false,
          };
        }),
      };
    });
}
