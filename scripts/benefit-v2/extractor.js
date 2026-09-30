import { OfferCategory } from "./constants.js";
import { classifySourceAuthority } from "./sourceAuthority.js";

const KRW = /(?:₩|KRW\s*)?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,})(?:\s*원)?/i;
const NEW_USER = /(첫\s*가입|처음\s*가입|첫\s*구독|신규\s*(?:가입자|구독자|회원|고객|가입\s*(?:회원|고객))|new\s*(?:user|subscriber))/i;
const ELIGIBLE_RETURNING_USER = /(?:(?:조건에\s*부합하는|자격을\s*충족하는)\s*)?재구독자|eligible\s+returning\s+subscriber/i;
const STRONG_NEW_USER = /(?:(?:이전에|아직).{0,100}(?:Premium|프리미엄|요금제|구독).{0,100}(?:이용|체험|구독|구매).{0,100}(?:없|않)|이미.{0,100}(?:무료\s*체험|(?:Premium|프리미엄)(?:을|를)?\s*체험).{0,100}(?:이용할\s*수\s*없|대상에서\s*제외))/i;
const TRIAL = /(무료\s*체험|\d+\s*(?:일|주|개월)\s*(?:(?:동안|이용\s*시)\s*)?(?:무료|0원|₩\s*0)|(?:0원|₩\s*0)(?:으로)?\s*\d+\s*(?:일|주|개월)|free\s*trial)/i;
const REQUIREMENT_SIGNAL = /(가입\s*(?:필수|필요)|필수\s*(?:가입|이용)|이용\s*(?:중|고객|회원)|보유\s*(?:필수|필요)|대상\s*(?:회원|고객)|회원만|고객만|전용|조건|요건|with\s+(?:membership|card)|requires?)/i;
const HISTORICAL_OR_NEGATED_TRIAL = /(과거\s*혜택|이전\s*혜택|종료된\s*혜택|이미\s*종료|혜택이\s*종료되었|만료된|제공되지\s*않|더\s*이상\s*제공|받으신\s*이력|previously\s*offered|no\s*longer|already\s*ended|expired)/i;
const PARTNER = /(제휴|멤버십|통신사|카드|결합|번들|우주패스|네이버플러스|bundle|membership|carrier|card)/i;
const MONEY_VALUE = /(할인|무료|0원|캐시백|페이백|절약|discount|included|cashback)/i;
const NON_VALUE = /(추첨|경품|굿즈|응모|당첨|lottery|sweepstake|giveaway)/i;

function normalize(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function sameHttpsPage(left, right) {
  try {
    const a = new URL(left);
    const b = new URL(right);
    if (a.protocol !== "https:" || b.protocol !== "https:") return false;
    a.hash = "";
    b.hash = "";
    a.pathname = a.pathname.replace(/\/+$/, "") || "/";
    b.pathname = b.pathname.replace(/\/+$/, "") || "/";
    return a.href === b.href;
  } catch {
    return false;
  }
}

function spotifyOfficialTrialPage(snapshot) {
  try {
    const page = new URL(snapshot.finalUrl || snapshot.url);
    if (page.protocol !== "https:" || page.hostname !== "www.spotify.com") return null;
    if (/^\/kr-ko\/student\/?$/.test(page.pathname)) return "STUDENT";
    if (/^\/kr-ko\/premium\/?$/.test(page.pathname)) return "PREMIUM";
  } catch {
    // Unparseable URLs cannot establish an official plan or payment condition.
  }
  return null;
}

function requirementIdentity(value = "") {
  return normalize(value)
    .toLowerCase()
    .replace(/(?:멤버십|membership|회원권)/gi, "")
    .replace(/[^a-z0-9가-힣]+/g, "");
}

function isSameRequirementAsService(value, service = {}) {
  const key = requirementIdentity(value);
  if (!key) return false;
  const safeService = service || {};
  return [safeService.id, safeService.name]
    .map(requirementIdentity)
    .filter(Boolean)
    .some((serviceKey) => key === serviceKey);
}

function contextAround(text, index, radius = 120) {
  return normalize(String(text || "").slice(Math.max(0, index - radius), index + radius));
}

function moneyValue(raw) {
  const match = String(raw || "").match(KRW);
  if (!match) return null;
  const numeric = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function serviceTerms(service = {}) {
  return [service.id, service.name, service.plan, ...(service.aliases || [])]
    .map((value) => normalize(value).toLowerCase())
    .filter((value) => value.length >= 2);
}
export function resolveTargetService(snapshot = {}, services = [], hintedServiceIds = []) {
  const hintSet = new Set(hintedServiceIds || []);
  const haystack = normalize(`${snapshot.title || ""} ${snapshot.text || ""}`).toLowerCase();
  const scored = services.map((service) => {
    const terms = serviceTerms(service);
    const matches = terms.filter((term) => haystack.includes(term));
    if (matches.length === 0) return { service, score: 0 };
    const hinted = hintSet.has(service.id) ? 4 : 0;
    return { service, score: hinted + Math.min(matches.length, 3) };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score);

  const hintedExact = scored.filter((entry) => hintSet.has(entry.service.id));
  if (hintedExact.length === 1) return hintedExact[0].service;
  if (hintedExact.length > 1 && hintedExact[0].score > hintedExact[1].score) {
    return hintedExact[0].service;
  }

  const genericTokens = new Set([
    "premium", "프리미엄", "plus", "플러스", "basic", "베이직",
    "standard", "스탠다드", "ultimate", "개인", "요금제", "멤버십",
  ]);
  const hintedFallback = services
    .filter((service) => hintSet.has(service.id))
    .map((service) => {
      const tokens = [service.name, ...(service.aliases || [])]
        .flatMap((value) => normalize(value).toLowerCase().split(/[^a-z0-9가-힣+]+/))
        .filter((token) => token.length >= 3 && !genericTokens.has(token));
      const uniqueTokens = [...new Set(tokens)];
      const matches = uniqueTokens.filter((token) => haystack.includes(token));
      return { service, matches };
    })
    .filter((entry) =>
      entry.matches.length >= 2 ||
      (entry.matches.length === 1 && entry.matches[0].length >= 6)
    )
    .sort((a, b) => b.matches.length - a.matches.length);
  if (
    hintedFallback.length === 1 ||
    (hintedFallback.length > 1 &&
      hintedFallback[0].matches.length > hintedFallback[1].matches.length)
  ) {
    return hintedFallback[0].service;
  }

  if (!scored.length) return null;
  if (scored.length > 1 && scored[0].score === scored[1].score && scored[0].score < 3) {
    return null;
  }
  return scored[0].service;
}

function trialContext(text = "") {
  const value = normalize(text);
  const trialMatches = [...value.matchAll(new RegExp(TRIAL.source, "ig"))];
  for (const match of trialMatches) {
    const context = contextAround(value, match.index, 180);
    if (HISTORICAL_OR_NEGATED_TRIAL.test(context)) continue;
    if (NEW_USER.test(context)) return context;
  }
  const newMatches = [...value.matchAll(new RegExp(NEW_USER.source, "ig"))];
  for (const match of newMatches) {
    const context = contextAround(value, match.index, 180);
    if (HISTORICAL_OR_NEGATED_TRIAL.test(context)) continue;
    if (TRIAL.test(context)) return context;
  }

  const strongMatch = value.match(STRONG_NEW_USER);
  const firstTrial = value.match(TRIAL);
  if (strongMatch && firstTrial) {
    const strongIndex = strongMatch.index ?? value.indexOf(strongMatch[0]);
    const trialIndex = firstTrial.index ?? value.indexOf(firstTrial[0]);
    const strongContext = contextAround(value, strongIndex, 220);
    const trialEvidence = contextAround(value, trialIndex, 220);
    if (!HISTORICAL_OR_NEGATED_TRIAL.test(trialEvidence)) {
      return normalize(`${trialEvidence} ${strongContext}`);
    }
  }
  return "";
}

export function classifyOfferCategory(text = "") {
  const value = normalize(text);
  if (!value || NON_VALUE.test(value)) return OfferCategory.IRRELEVANT;
  if (trialContext(value)) return OfferCategory.NEW_USER_FREE_TRIAL;
  if (PARTNER.test(value) && MONEY_VALUE.test(value)) return OfferCategory.PARTNERSHIP_SAVING;
  return OfferCategory.UNKNOWN;
}

function trialDurationDays(text = "") {
  const match = String(text).match(/(\d+)\s*(일|주|개월)\s*(?:(?:동안|이용\s*시)\s*)?(?:무료|0원|₩\s*0|free)/i);
  if (!match) return null;
  const count = Number(match[1]);
  if (!Number.isFinite(count) || count <= 0) return null;
  if (match[2] === "개월") return count * 30;
  if (match[2] === "주") return count * 7;
  return count;
}
function audienceValue(text = "") {
  const source = String(text || "");
  const hasNonMemberBranch = /(회원이\s*아닌\s*경우|비회원|미가입(?:자|고객)?)/i.test(source);
  const hasMemberBranch = /(회원인\s*경우|이미\s*(?:구독|가입)\s*중|기존\s*(?:가입자|회원|고객)|현재\s*(?:가입자|회원))/i.test(source);
  if (hasNonMemberBranch && hasMemberBranch) return "EXISTING_OR_ALL";
  if (NEW_USER.test(source)) return "NEW";
  if (/(기존\s*(?:가입자|회원|고객)|현재\s*(?:가입자|회원)|누구나|모든\s*(?:회원|고객)|(?:멤버십\s*)?회원(?:을|이)?\s*대상(?:으로)?)/i.test(source)) {
    return "EXISTING_OR_ALL";
  }
  return "UNKNOWN";
}

function autoRenewalValue(text = "") {
  if (/(자동\s*(?:결제|갱신)\s*(?:없음|안\s*됨|되지\s*않)|does\s*not\s*renew|will\s*not\s*renew)/i.test(text)) {
    return false;
  }
  if (/(자동\s*(?:결제|갱신)|무료\s*체험\s*(?:종료|후).*?(?:결제|갱신)|(?:이후|종료\s*후)\s*매월[^.]{0,100}(?:부과|청구)|automatically\s*renew)/i.test(text)) {
    return true;
  }
  return null;
}

function pricedTrialRenewalEvidence(text = "", postTrialPrice = null) {
  if (!Number.isFinite(postTrialPrice)) return "";
  const source = String(text || "");
  if (!/정기\s*결제\s*구독에는\s*월별\s*자동\s*결제가\s*포함/i.test(source)) return "";
  const tierPayment = /체험\s*기간\s*종료\s*후\s*매월\s*₩?\s*([\d,]+)\s*(?:원)?(?:\s*\([^)]{0,40}\))?\s*결제/gi;
  for (const match of source.matchAll(tierPayment)) {
    if (Number(match[1].replace(/,/g, "")) === postTrialPrice) {
      return normalize(`${match[0]} 정기 결제 구독에는 월별 자동 결제가 포함됩니다.`);
    }
  }
  return "";
}

function billingCycleValue(text = "") {
  const source = String(text || "");
  if (/(월\s*이용료|매월\s*별도\s*결제|월간\s*결제|매월|monthly|per\s*month|\/month)/i.test(source)) {
    return "MONTHLY";
  }
  if (/(연간\s*이용권|연\s*결제|매년|1년\s*(?:이용권|결제)|yearly|annual)/i.test(source)) {
    return "ANNUAL";
  }
  if (/(주간|매주|weekly)/i.test(source)) return "WEEKLY";
  return null;
}

function contextualEntity(text, entityRegex, {
  radius = 120,
  requirementSignal = REQUIREMENT_SIGNAL,
} = {}) {
  const source = String(text || "");
  const flags = entityRegex.flags.includes("g")
    ? entityRegex.flags
    : entityRegex.flags + "g";
  const regex = new RegExp(entityRegex.source, flags);

  for (const match of source.matchAll(regex)) {
    const context = contextAround(source, match.index, radius);
    if (!requirementSignal.test(context)) continue;
    return { value: normalize(match[0]), evidence: context };
  }
  return null;
}

function planLabeledMoney(text, plan) {
  const source = String(text || "");
  const label = normalize(plan);
  if (!label) return null;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    escaped + "[^0-9₩]{0,80}(₩?\\s*[0-9][0-9,]*\\s*원)",
    "i"
  );
  const match = source.match(regex);
  if (!match) return null;
  return { value: moneyValue(match[1]), evidence: contextAround(source, match.index, 180) };
}

function normalizeVatInclusiveMoney(value, evidence = "") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  if (/부가세\s*별도|VAT\s*(?:excluded|not\s*included)/i.test(String(evidence || ""))) {
    return Math.round(numeric * 1.1);
  }
  return numeric;
}

function labeledMoney(text, labels = []) {
  const source = String(text || "");
  for (const label of labels) {
    const regex = new RegExp(`${label}[^0-9₩]{0,40}(₩?\\s*[0-9][0-9,]*\\s*원?)`, "i");
    const match = source.match(regex);
    if (match) {
      const evidence = contextAround(source, match.index);
      return {
        value: normalizeVatInclusiveMoney(moneyValue(match[1]), evidence),
        evidence,
      };
    }
  }
  return null;
}

function dateValue(text = "", relation = "END") {
  const source = String(text || "");
  const patterns = [
    /(20\d{2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{1,2})/g,
    /(20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const before = normalize(source.slice(Math.max(0, match.index - 60), match.index));
      const after = normalize(
        source.slice(match.index + match[0].length, match.index + match[0].length + 60)
      );
      const isStart = (
        /(?:시작일|개시일|시작|개시)[^0-9]{0,24}$/i.test(before) ||
        /^(?:부터|에\s*시작|부터\s*시작)/i.test(after)
      );
      const isEnd = (
        /(?:종료일|마감일|종료|마감)[^0-9]{0,24}$/i.test(before) ||
        /^(?:까지|에\s*종료|에\s*마감|\s*종료|\s*마감)/i.test(after)
      );
      if (relation === "START" && !isStart) continue;
      if (relation === "END" && !isEnd) continue;
      const y = Number(match[1]);
      const m = String(Number(match[2])).padStart(2, "0");
      const d = String(Number(match[3])).padStart(2, "0");
      return {
        value: y + "-" + m + "-" + d,
        evidence: contextAround(source, match.index, 100),
      };
    }
  }
  return null;
}function observation(field, value, {
  snapshot,
  extractor = "DOM_RULE",
  authority,
  evidence = "",
  state = "EXTRACTED",
  sourceUrl = null,
} = {}) {
  if (value === null || value === undefined || value === "") return null;
  return {
    field,
    value,
    state,
    sourceUrl: sourceUrl || snapshot.finalUrl || snapshot.url,
    observedAt: snapshot.observedAt,
    extractor,
    authorityType: authority.type,
    authorityScore: authority.score,
    evidenceText: normalize(evidence).slice(0, 500),
  };
}

function structuredOfferObservations(snapshot, authority) {
  const out = [];
  for (const item of snapshot.jsonLd || []) {
    const type = Array.isArray(item["@type"]) ? item["@type"].join(" ") : String(item["@type"] || "");
    const offer = /offer/i.test(type) ? item : item.offers;
    const offers = Array.isArray(offer) ? offer : offer ? [offer] : [];
    for (const value of offers) {
      const price = Number(value?.price ?? value?.lowPrice);
      if (Number.isFinite(price)) {
        out.push(observation("offer_price", price, {
          snapshot,
          extractor: "JSON_LD",
          authority,
          evidence: JSON.stringify({ price: value.price ?? value.lowPrice, priceCurrency: value.priceCurrency }),
        }));
      }
      if (value?.priceCurrency) {
        out.push(observation("currency", String(value.priceCurrency).toUpperCase(), {
          snapshot, extractor: "JSON_LD", authority, evidence: JSON.stringify(value.priceCurrency),
        }));
      }
      if (value?.validFrom) out.push(observation("start_at", String(value.validFrom).slice(0, 10), {
        snapshot, extractor: "JSON_LD", authority, evidence: String(value.validFrom),
      }));
      if (value?.priceValidUntil || value?.validThrough) out.push(observation("end_at", String(value.priceValidUntil || value.validThrough).slice(0, 10), {
        snapshot, extractor: "JSON_LD", authority, evidence: String(value.priceValidUntil || value.validThrough),
      }));
    }
  }
  return out.filter(Boolean);
}
export function extractDeterministicObservations({
  snapshot,
  services = [],
  hintedServiceIds = [],
  authorityRegistry = [],
  trustedConstraints = {},
} = {}) {
  if (!snapshot?.ok) return { category: OfferCategory.UNKNOWN, service: null, observations: [] };
  const trustedService = trustedConstraints.trustedEvidenceVerified === true &&
    trustedConstraints.targetServiceId
    ? services.find((item) => item.id === trustedConstraints.targetServiceId) || null
    : null;
  const service = trustedService || resolveTargetService(snapshot, services, hintedServiceIds);
  const combined = normalize(`${snapshot.title || ""} ${snapshot.text || ""}`);
  const detectedCategory = classifyOfferCategory(combined);
  const trustedCategory =
    trustedConstraints.trustedEvidenceVerified === true &&
    [OfferCategory.PARTNERSHIP_SAVING, OfferCategory.NEW_USER_FREE_TRIAL].includes(
      trustedConstraints.categoryHint
    )
      ? trustedConstraints.categoryHint
      : null;
  const category =
    [OfferCategory.UNKNOWN, OfferCategory.IRRELEVANT].includes(detectedCategory) &&
    trustedCategory
      ? trustedCategory
      : detectedCategory;
  const sourcePageIsPreferredActionEntrypoint =
    trustedConstraints.preferSourcePageActionEntrypoint === true &&
    trustedConstraints.trustedEvidenceVerified === true &&
    sameHttpsPage(trustedConstraints.actionUrl, snapshot.finalUrl || snapshot.url);
  const cardApplicationControl = trustedConstraints.partnerType === "CARD"
    ? (snapshot.actionCandidates || []).find((candidate) =>
        /(?:온라인|간편)\s*신청(?:하기)?/i.test(candidate.label || "")
      )
    : null;
  const sourcePageIsVerifiedActionEntrypoint =
    sourcePageIsPreferredActionEntrypoint && (
      trustedConstraints.partnerType === "CARD"
        ? Boolean(cardApplicationControl)
        : Boolean(snapshot.primaryAction?.url) &&
          ["VERIFIED_ENTRYPOINT", "VERIFIED_ACTION"].includes(snapshot.actionability)
    );
  const preferredPlanActionRequested =
    trustedConstraints.trustedEvidenceVerified === true &&
    Boolean(trustedConstraints.preferredPlanActionUrl);
  const observedPlanAction = preferredPlanActionRequested
    ? (snapshot.actionCandidates || []).find((candidate) =>
        /(?:신청|가입)(?:하기)?/i.test(candidate.label || "") &&
        sameHttpsPage(candidate.url, trustedConstraints.preferredPlanActionUrl)
      )
    : null;
  const verifiedPlanLoginEntrypoint = Boolean(
    observedPlanAction && trustedConstraints.actionRequiresLogin === true
  );
  // A shared carrier page lists multiple plans. Never reuse its first signup link for another plan.
  const actionUrl = preferredPlanActionRequested
    ? observedPlanAction?.url || trustedConstraints.actionUrl || null
    : sourcePageIsVerifiedActionEntrypoint
    ? trustedConstraints.actionUrl
    : sourcePageIsPreferredActionEntrypoint
      ? trustedConstraints.actionUrl
      : (trustedConstraints.trustedEvidenceVerified === true
          ? trustedConstraints.actionUrl : null) ||
      snapshot.primaryAction?.url ||
      trustedConstraints.actionUrl ||
      (snapshot.actionability === "VERIFIED_ENTRYPOINT" || snapshot.actionability === "VERIFIED_ACTION"
      ? snapshot.finalUrl
      : null);
  const authority = classifySourceAuthority(snapshot.finalUrl || snapshot.url, {
    registry: authorityRegistry,
    targetServiceId: service?.id || null,
    actionUrl,
  });
  const observations = [];

  observations.push(observation("target_service", service?.id, {
    snapshot, authority, evidence: service?.name || "",
  }));
  const trustedPlan = trustedConstraints.targetPlan && (
    trustedConstraints.trustedEvidenceVerified === true ||
    combined.toLowerCase().includes(String(trustedConstraints.targetPlan).toLowerCase())
  )
    ? trustedConstraints.targetPlan
    : null;
  // Spotify's shared header contains "개인" even on its student offer page.
  // Require both the official student URL and its student page title before
  // selecting that plan instead of the service's generic personal plan.
  const spotifyTrialPage = category === OfferCategory.NEW_USER_FREE_TRIAL &&
    service?.id === "spotify" ? spotifyOfficialTrialPage(snapshot) : null;
  const scopedStudentPlan = spotifyTrialPage === "STUDENT" &&
    /학생/.test(snapshot.title || "") &&
    /학생은\s*1개월|Premium\s*학생/.test(combined)
      ? "학생" : null;
  const explicitPlan = trustedPlan || scopedStudentPlan || (
    service?.plan && combined.toLowerCase().includes(String(service.plan).toLowerCase())
      ? service.plan
      : null
  );
  observations.push(observation("target_plan", explicitPlan, {
    snapshot,
    authority,
    extractor: trustedPlan ? "TRUSTED_SOURCE_CONFIG" : "DOM_RULE",
    evidence: explicitPlan || "",
  }));
  if ([OfferCategory.PARTNERSHIP_SAVING, OfferCategory.NEW_USER_FREE_TRIAL].includes(category)) {
    observations.push(observation("category", category, {
      snapshot, authority, evidence: combined.slice(0, 250),
    }));
  }
  const detectedTrialContext = category === OfferCategory.NEW_USER_FREE_TRIAL
    ? trialContext(combined)
    : "";
  const trustedTrialMatch =
    category === OfferCategory.NEW_USER_FREE_TRIAL &&
    !detectedTrialContext &&
    trustedConstraints.trustedEvidenceVerified === true &&
    trustedConstraints.categoryHint === OfferCategory.NEW_USER_FREE_TRIAL
      ? combined.match(TRIAL)
      : null;
  const categoryTrialContext =
    detectedTrialContext ||
    (trustedTrialMatch
      ? contextAround(
          combined,
          trustedTrialMatch.index ?? combined.indexOf(trustedTrialMatch[0]),
          260
        )
      : "");
  const audienceEvidence = categoryTrialContext || combined;
  const trustedAudience =
    trustedConstraints.trustedEvidenceVerified === true &&
    ["NEW", "EXISTING_OR_ALL"].includes(trustedConstraints.trustedAudience)
      ? trustedConstraints.trustedAudience
      : null;
  const audience = trustedAudience || audienceValue(audienceEvidence);
  if (audience !== "UNKNOWN") {
    observations.push(observation("audience", audience, {
      snapshot,
      authority,
      extractor: trustedAudience ? "TRUSTED_SOURCE_CONFIG" : "DOM_RULE",
      evidence: trustedAudience
        ? "trusted official source audience"
        : audienceEvidence.match(/.{0,80}(?:신규|기존|누구나|모든 고객|new user|new subscriber).{0,120}/i)?.[0] || "",
    }));
  }
  if (trustedConstraints.partnerId) {
    observations.push(observation("partner_id", trustedConstraints.partnerId, {
      snapshot,
      authority,
      extractor: "TRUSTED_SOURCE_CONFIG",
      evidence: "trusted source partner",
    }));
  }
  if (
    trustedConstraints.trustedEvidenceVerified === true &&
    trustedConstraints.trustedBlockReason
  ) {
    observations.push(observation("verification_hold_reason", trustedConstraints.trustedBlockReason, {
      snapshot,
      authority,
      extractor: "TRUSTED_SOURCE_CONFIG",
      evidence: "trusted official evidence requires manual reconciliation",
    }));
  }
  if (spotifyTrialPage === "PREMIUM" && explicitPlan === "개인") {
    // The official page offers a zero-cost card trial and a paid wallet trial.
    // Payment-method eligibility is not modeled for free trials yet.
    observations.push(observation(
      "verification_hold_reason",
      "SPOTIFY_PAYMENT_METHOD_DEPENDENT_TRIAL_COST",
      { snapshot, authority, evidence: "Spotify individual trial payment method must be selected" }
    ));
  }
  if (trustedConstraints.exclusiveGroupId) {
    observations.push(observation("exclusive_group_id", trustedConstraints.exclusiveGroupId, {
      snapshot,
      authority,
      extractor: "TRUSTED_SOURCE_CONFIG",
      evidence: "trusted source exclusivity rule",
    }));
  }
  if (trustedConstraints.selectionLimit != null) {
    observations.push(observation("selection_limit", Number(trustedConstraints.selectionLimit), {
      snapshot,
      authority,
      extractor: "TRUSTED_SOURCE_CONFIG",
      evidence: "trusted source selection limit",
    }));
  }
  if (typeof trustedConstraints.stackable === "boolean") {
    observations.push(observation("stackable", trustedConstraints.stackable, {
      snapshot,
      authority,
      extractor: "TRUSTED_SOURCE_CONFIG",
      evidence: "trusted source stacking rule",
    }));
  }
  if (Array.isArray(trustedConstraints.conflictsWith) && trustedConstraints.conflictsWith.length) {
    observations.push(observation("conflicts_with", trustedConstraints.conflictsWith, {
      snapshot,
      authority,
      extractor: "TRUSTED_SOURCE_CONFIG",
      evidence: "trusted source conflict rule",
    }));
  }
  const trustedAction = Boolean(!preferredPlanActionRequested && trustedConstraints.actionUrl &&
    sameHttpsPage(actionUrl, trustedConstraints.actionUrl) &&
    !sameHttpsPage(snapshot.primaryAction?.url, actionUrl));
  const sourceActionExtractor = preferredPlanActionRequested
    ? (observedPlanAction ? "DOM_RULE" : "TRUSTED_SOURCE_CONFIG")
    : sourcePageIsPreferredActionEntrypoint
    ? (sourcePageIsVerifiedActionEntrypoint ? "DOM_RULE" : "TRUSTED_SOURCE_CONFIG")
    : trustedAction
      ? "TRUSTED_SOURCE_CONFIG"
      : "DOM_RULE";
  const sourceActionEvidence = preferredPlanActionRequested
    ? (observedPlanAction
      ? `${observedPlanAction.label} for the verified carrier plan`
      : "plan-specific action missing; official product overview fallback")
    : sourcePageIsVerifiedActionEntrypoint
    ? `${cardApplicationControl?.label || snapshot.primaryAction?.label || "action control"} on verified official landing page`
    : sourcePageIsPreferredActionEntrypoint
      ? "trusted official source landing page; action control unverified"
      : snapshot.primaryAction?.label || (trustedAction ? "trusted official action entrypoint" : "");
  observations.push(observation("action_url", actionUrl, {
    snapshot,
    authority,
    extractor: sourceActionExtractor,
    evidence: sourceActionEvidence,
  }));
  observations.push(observation(
    "requires_login",
    verifiedPlanLoginEntrypoint ? true :
    (trustedAction || sourcePageIsPreferredActionEntrypoint) &&
      typeof trustedConstraints.actionRequiresLogin === "boolean"
      ? trustedConstraints.actionRequiresLogin
      : Boolean(snapshot.primaryAction?.requiresLogin),
    {
      snapshot,
      authority,
      extractor: sourceActionExtractor,
      evidence: sourceActionEvidence,
    }
  ));
  observations.push(observation(
    "actionability_status",
    preferredPlanActionRequested && !observedPlanAction
      ? "UNKNOWN"
      : verifiedPlanLoginEntrypoint
      ? "VERIFIED_ENTRYPOINT"
      : sourcePageIsVerifiedActionEntrypoint
      ? "VERIFIED_ENTRYPOINT"
      : sourcePageIsPreferredActionEntrypoint
        ? "UNKNOWN"
        : trustedAction
        ? "UNKNOWN"
        : snapshot.actionability,
    {
      snapshot,
      authority,
      extractor: sourceActionExtractor,
      evidence: sourcePageIsVerifiedActionEntrypoint
        ? sourceActionEvidence
        : snapshot.primaryAction?.label || snapshot.pageType,
    }
  ));
  observations.push(...structuredOfferObservations(snapshot, authority));

  const regular = labeledMoney(combined, ["정상가", "정상 요금", "기존 가격", "정가", "regular price"]);
  const explicitlyLabeledOffer = labeledMoney(
    combined,
    ["할인가", "혜택가", "제휴가", "프로모션가", "할인 가격", "offer price"]
  );
  const planOffer = planLabeledMoney(combined, explicitPlan);
  const zeroOfferMatch = combined.match(
    /.{0,100}(?:추가\s*금액\s*없이|추가\s*비용\s*없이|별도\s*(?:금액|비용)\s*없이|요금이\s*청구되지\s*않).{0,120}/i
  );
  const hasTrustedOfferPrice =
    trustedConstraints.trustedOfferPrice !== null &&
    trustedConstraints.trustedOfferPrice !== undefined &&
    trustedConstraints.trustedOfferPrice !== "";
  const trustedOfferPrice = hasTrustedOfferPrice
    ? Number(trustedConstraints.trustedOfferPrice)
    : NaN;
  const trustedOffer = Number.isFinite(trustedOfferPrice)
    ? {
        value: trustedOfferPrice,
        evidence: `trusted official source price: ${trustedOfferPrice}`,
      }
    : null;
  const offer = trustedConstraints.suppressOfferPrice === true
    ? null
    : (
      trustedOffer
      || explicitlyLabeledOffer
      || planOffer
      || (zeroOfferMatch ? { value: 0, evidence: normalize(zeroOfferMatch[0]) } : null)
    );
  const postTrial = labeledMoney(combined, ["무료 체험 후", "무료체험 종료 후", "이후", "종료 후"]);
  const partnerCost = labeledMoney(combined, ["멤버십 월", "멤버십 이용료", "제휴 멤버십", "membership fee"]);
  const otherRequiredCost = labeledMoney(combined, ["가입비", "필수 비용", "추가 비용", "setup fee"]);

  if (regular) observations.push(observation("regular_price", regular.value, {
    snapshot, authority, evidence: regular.evidence,
  }));
  if (offer) observations.push(observation("offer_price", offer.value, {
    snapshot,
    authority,
    extractor: trustedOffer ? "TRUSTED_SOURCE_CONFIG" : "DOM_RULE",
    evidence: offer.evidence,
  }));
  if (trustedConstraints.trustedOfferBillingCycle) {
    observations.push(observation("offer_billing_cycle", trustedConstraints.trustedOfferBillingCycle, {
      snapshot,
      authority,
      extractor: "TRUSTED_SOURCE_CONFIG",
      evidence: String(trustedConstraints.trustedOfferBillingCycle),
    }));
  }
  const billingCycleEvidence = offer?.evidence || "";
  let billingCycle = billingCycleValue(billingCycleEvidence);
  let billingCycleSource = billingCycleEvidence;
  if (!billingCycle) {
    const explicitMonthly = combined.match(
      /.{0,100}(?:매월\s*별도\s*결제|매월\s*결제|월마다\s*결제).{0,100}/i
    );
    const explicitAnnual = combined.match(
      /.{0,100}(?:연간\s*이용권|연간\s*결제|매년\s*결제).{0,100}/i
    );
    if (explicitMonthly) {
      billingCycle = "MONTHLY";
      billingCycleSource = normalize(explicitMonthly[0]);
    } else if (explicitAnnual) {
      billingCycle = "ANNUAL";
      billingCycleSource = normalize(explicitAnnual[0]);
    }
  }
  observations.push(observation("offer_billing_cycle", billingCycle, {
    snapshot,
    authority,
    evidence: billingCycleSource,
  }));
  if (partnerCost) observations.push(observation("incremental_partner_cost", partnerCost.value, {
    snapshot, authority, evidence: partnerCost.evidence,
  }));
  if (otherRequiredCost) observations.push(observation("incremental_required_cost", otherRequiredCost.value, {
    snapshot, authority, evidence: otherRequiredCost.evidence,
  }));

  if (category === OfferCategory.NEW_USER_FREE_TRIAL) {
    const trialEvidence = categoryTrialContext;
    const duration = trialDurationDays(trialEvidence);
    observations.push(observation("trial_duration_days", duration, {
      snapshot, authority, evidence: trialEvidence,
    }));
    observations.push(observation("trial_cost", /(?:무료|0원|₩\s*0|free\s*trial)/i.test(trialEvidence) ? 0 : null, {
      snapshot, authority, evidence: trialEvidence,
    }));
    if (postTrial) observations.push(observation("post_trial_price", postTrial.value, {
      snapshot, authority, evidence: postTrial.evidence,
    }));
    observations.push(observation(
      "new_user_rule",
      NEW_USER.test(trialEvidence) && ELIGIBLE_RETURNING_USER.test(trialEvidence)
        ? "NEW_OR_ELIGIBLE_RETURNING"
        : NEW_USER.test(trialEvidence) || STRONG_NEW_USER.test(trialEvidence)
          ? "NEW_USER_ONLY"
          : null,
      {
        snapshot,
        authority,
        evidence: trialEvidence,
      }
    ));
    const directRenewal = autoRenewalValue(trialEvidence || combined);
    const pricedRenewalEvidence = directRenewal === null
      ? pricedTrialRenewalEvidence(combined, postTrial?.value)
      : "";
    const autoRenewal = directRenewal ?? (pricedRenewalEvidence ? true : null);
    observations.push(observation("auto_renewal", autoRenewal, {
      snapshot, authority, evidence: pricedRenewalEvidence || trialEvidence,
    }));
  }

  const membershipContext = contextualEntity(
    combined,
    /(네이버플러스(?:\s*멤버십)?|우주패스(?:\s*[A-Za-z가-힣0-9+._-]+)?|쿠팡\s*와우(?:\s*멤버십)?|KT\s*멤버십|LG\s*U\+\s*멤버십|SKT\s*멤버십|T\s*멤버십)/i
  );
  const carrierContext = contextualEntity(
    combined,
    /\b(?:SKT|KT|LG\s*U\+|LGU\+)\b/i
  );
  const cardContext = contextualEntity(
    combined,
    /(?:삼성|신한|현대|국민|KB|롯데|우리|하나|NH)\s*(?:국민)?카드/i
  );

  const requirementService = service || {
    id: trustedConstraints.targetServiceId || "",
    name: trustedConstraints.targetServiceName || "",
  };
  const trustedMembership =
    trustedConstraints.requiredMembership &&
    !isSameRequirementAsService(trustedConstraints.requiredMembership, requirementService)
      ? trustedConstraints.requiredMembership
      : null;
  const contextualMembership =
    trustedConstraints.suppressContextualMembership === true
      ? null
      : (
        membershipContext?.value &&
        !isSameRequirementAsService(membershipContext.value, requirementService)
          ? membershipContext.value
          : null
      );
  const membership = trustedMembership || contextualMembership || null;
  const carrier = trustedConstraints.requiredCarrier || carrierContext?.value || null;
  const card = trustedConstraints.requiredCard || cardContext?.value || null;
  const requiredPlan = trustedConstraints.requiredPlan && (
    trustedConstraints.trustedEvidenceVerified === true ||
    combined.toLowerCase().includes(String(trustedConstraints.requiredPlan).toLowerCase())
  )
    ? trustedConstraints.requiredPlan
    : null;
  const verifiedBundleOptions = Array.isArray(trustedConstraints.bundleOptions)
    ? trustedConstraints.bundleOptions.filter((option) =>
        combined.toLowerCase().includes(String(option).toLowerCase())
      )
    : [];
  const bundleSelectionLimit =
    trustedConstraints.bundleSelectionLimit != null &&
    /(?:추가\s*OTT\s*1(?:개|종)|중\s*택\s*1|택\s*1)/i.test(combined)
      ? Number(trustedConstraints.bundleSelectionLimit)
      : null;
  const hasTrustedPartnerCost =
    trustedConstraints.incrementalPartnerCost !== null &&
    trustedConstraints.incrementalPartnerCost !== undefined &&
    trustedConstraints.incrementalPartnerCost !== "";
  const trustedPartnerCost = hasTrustedPartnerCost
    ? Number(trustedConstraints.incrementalPartnerCost)
    : null;
  if (trustedMembership && Number.isFinite(trustedPartnerCost) && trustedPartnerCost >= 0) {
    observations.push(observation("incremental_partner_cost", trustedPartnerCost, {
      snapshot,
      authority,
      extractor: "TRUSTED_SOURCE_CONFIG",
      evidence: "official membership monthly price",
      sourceUrl: trustedConstraints.incrementalPartnerCostEvidenceUrl || null,
    }));
  }

  observations.push(observation("required_membership", membership, {
    snapshot,
    authority,
    extractor: trustedMembership ? "TRUSTED_SOURCE_CONFIG" : "DOM_RULE",
    evidence: trustedMembership ? "trusted source requirement" : (membershipContext?.evidence || ""),
  }));
  observations.push(observation("required_carrier", carrier, {
    snapshot,
    authority,
    extractor: trustedConstraints.requiredCarrier ? "TRUSTED_SOURCE_CONFIG" : "DOM_RULE",
    evidence: trustedConstraints.requiredCarrier ? "trusted source requirement" : (carrierContext?.evidence || ""),
  }));
  observations.push(observation("required_card", card, {
    snapshot,
    authority,
    extractor: trustedConstraints.requiredCard ? "TRUSTED_SOURCE_CONFIG" : "DOM_RULE",
    evidence: trustedConstraints.requiredCard ? "trusted source requirement" : (cardContext?.evidence || ""),
  }));
  if (trustedConstraints.trustedEvidenceVerified === true) {
    const numericCardConstraints = [
      ["discount_rate", trustedConstraints.discountRate],
      ["fixed_discount_amount", trustedConstraints.fixedDiscountAmount],
      ["per_transaction_cap", trustedConstraints.perTransactionCap],
      ["monthly_discount_cap", trustedConstraints.monthlyDiscountCap],
      ["minimum_transaction_amount", trustedConstraints.minimumTransactionAmount],
      ["prior_month_spend_requirement", trustedConstraints.priorMonthSpendRequirement],
      ["monthly_transaction_limit", trustedConstraints.monthlyTransactionLimit],
    ];
    for (const [field, rawValue] of numericCardConstraints) {
      if (rawValue === null || rawValue === undefined || rawValue === "") continue;
      const value = Number(rawValue);
      if (!Number.isFinite(value) || value < 0) continue;
      observations.push(observation(field, value, {
        snapshot,
        authority,
        extractor: "TRUSTED_SOURCE_CONFIG",
        evidence: `trusted official card constraint: ${field}`,
      }));
    }
    for (const [field, value] of [
      ["monthly_discount_cap_scope", trustedConstraints.monthlyDiscountCapScope],
      ["eligible_payment_channel", trustedConstraints.eligiblePaymentChannel],
    ]) {
      if (!value) continue;
      observations.push(observation(field, String(value), {
        snapshot,
        authority,
        extractor: "TRUSTED_SOURCE_CONFIG",
        evidence: `trusted official card constraint: ${field}`,
      }));
    }
  }
  observations.push(observation("required_plan", requiredPlan, {
    snapshot,
    authority,
    extractor: requiredPlan ? "TRUSTED_SOURCE_CONFIG" : "DOM_RULE",
    evidence: requiredPlan || "",
  }));
  observations.push(observation("bundle_options", verifiedBundleOptions.length ? verifiedBundleOptions : null, {
    snapshot,
    authority,
    extractor: "TRUSTED_SOURCE_CONFIG",
    evidence: verifiedBundleOptions.join(" / "),
  }));
  observations.push(observation("bundle_selection_limit", bundleSelectionLimit, {
    snapshot,
    authority,
    extractor: "TRUSTED_SOURCE_CONFIG",
    evidence: bundleSelectionLimit != null ? "추가 OTT 1종 선택" : "",
  }));

  const start = dateValue(combined, "START");
  const trustedEndAt =
    typeof trustedConstraints.trustedEndAt === "string" &&
    /^20\d{2}-\d{2}-\d{2}$/.test(trustedConstraints.trustedEndAt)
      ? trustedConstraints.trustedEndAt
      : null;
  const end = trustedEndAt
    ? { value: trustedEndAt, evidence: "trusted official source end date" }
    : dateValue(combined, "END");
  if (start) observations.push(observation("start_at", start.value, {
    snapshot, authority, evidence: start.evidence,
  }));
  if (end) observations.push(observation("end_at", end.value, {
    snapshot,
    authority,
    extractor: trustedEndAt ? "TRUSTED_SOURCE_CONFIG" : "DOM_RULE",
    evidence: end.evidence,
  }));

  return {
    category,
    service,
    authority,
    observations: observations.filter(Boolean),
  };
}
