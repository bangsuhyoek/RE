const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const FALLBACK_MODELS = Object.freeze([
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.6-flash",
  "gemini-2.5-flash",
]);
const ALLOWED_FIELDS = new Set([
  "target_plan",
  "regular_price",
  "offer_price",
  "start_at",
  "end_at",
  "audience",
  "required_membership",
  "required_card",
  "required_carrier",
  "discount_rate",
  "fixed_discount_amount",
  "per_transaction_cap",
  "monthly_discount_cap",
  "monthly_discount_cap_scope",
  "minimum_transaction_amount",
  "prior_month_spend_requirement",
  "monthly_transaction_limit",
  "eligible_payment_channel",
  "incremental_partner_cost",
  "incremental_required_cost",
  "offer_billing_cycle",
  "trial_duration_days",
  "trial_cost",
  "post_trial_price",
  "new_user_rule",
  "former_subscriber_rule",
  "auto_renewal",
  "exclusive_group_id",
  "selection_limit",
  "discount_rate",
  "fixed_discount_amount",
  "per_transaction_cap",
  "monthly_discount_cap",
  "minimum_transaction_amount",
  "prior_month_spend_requirement",
  "monthly_transaction_limit",
  "stackable",
  "conflicts_with",
]);

function normalize(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function extractJson(text = "") {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || raw;
  const first = fenced.indexOf("{");
  const last = fenced.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("LLM_JSON_NOT_FOUND");
  return JSON.parse(fenced.slice(first, last + 1));
}
async function callGeminiJson(prompt, env = process.env, fetchImpl = globalThis.fetch) {
  const key = env.GEMINI_API_KEY;
  if (!key) return { configured: false, payload: null, error: "GEMINI_NOT_CONFIGURED" };

  const preferred = env.BENEFIT_LLM_MODEL || env.GEMINI_MODEL || DEFAULT_MODEL;
  const models = [...new Set([preferred, ...FALLBACK_MODELS].filter(Boolean))];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  let lastError = null;
  let lastModel = preferred;

  try {
    for (const model of models) {
      lastModel = model;
      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) +
        ":generateContent?key=" +
        encodeURIComponent(key);
      try {
        const response = await fetchImpl(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0,
            },
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body.error) {
          const message = body.error?.message || `GEMINI_HTTP_${response.status}`;
          lastError = message;
          // A quota failure belongs to the run, not an extraction guess.
          // Trying every fallback model can exhaust the remaining request
          // budget without adding any official evidence.
          if ([401, 403, 429].includes(response.status)) {
            return { configured: true, payload: null, error: message, model };
          }
          continue;
        }

        const text = body.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text || "";
        return { configured: true, payload: extractJson(text), error: null, model };
      } catch (error) {
        if (error?.name === "AbortError") {
          return { configured: true, payload: null, error: "GEMINI_TIMEOUT", model };
        }
        lastError = error?.message || "GEMINI_REQUEST_FAILED";
      }
    }

    return {
      configured: true,
      payload: null,
      error: lastError || "GEMINI_NO_COMPATIBLE_MODEL",
      model: lastModel,
    };
  } finally {
    clearTimeout(timer);
  }
}
export async function rankSnapshotWithLlm(snapshot, {
  serviceHint = null,
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!snapshot?.ok) return { configured: false, score: 0, category: "UNKNOWN", reason: "NO_SNAPSHOT" };
  const page = normalize(snapshot.text).slice(0, 16_000);
  const prompt = [
    "You classify Korean subscription benefit pages for KKUDOK.",
    "Use ONLY the supplied page text. Do not infer missing facts.",
    "Wanted categories: PARTNERSHIP_SAVING or NEW_USER_FREE_TRIAL.",
    "PARTNERSHIP_SAVING requires a monetary subscription-saving partnership.",
    "NEW_USER_FREE_TRIAL requires a real trial restricted to new/eligible new users.",
    "Lotteries, goods, generic points, news, FAQ-only, and non-monetary events are irrelevant.",
    "Return JSON only: {score:0..1, category:string, reason:string}.",
    `Service hint: ${serviceHint?.name || serviceHint?.id || "unknown"}`,
    `URL: ${snapshot.finalUrl || snapshot.url}`,
    `PAGE:\n${page}`,
  ].join("\n");

  const result = await callGeminiJson(prompt, env, fetchImpl);
  if (!result.payload) {
    return {
      configured: result.configured,
      score: null,
      category: "UNKNOWN",
      reason: result.error,
      model: result.model,
    };
  }
  const score = Number(result.payload.score);
  return {
    configured: true,
    score: Number.isFinite(score) ? Math.max(0, Math.min(score, 1)) : null,
    category: String(result.payload.category || "UNKNOWN"),
    reason: String(result.payload.reason || ""),
    model: result.model,
  };
}
function evidenceExists(pageText, evidence) {
  const haystack = normalize(pageText).toLowerCase();
  const needle = normalize(evidence).toLowerCase();
  return needle.length >= 2 && haystack.includes(needle);
}

const NUMERIC_FIELDS = new Set([
  "regular_price",
  "offer_price",
  "incremental_partner_cost",
  "incremental_required_cost",
  "trial_duration_days",
  "trial_cost",
  "post_trial_price",
  "selection_limit",
]);

const BOOLEAN_FIELDS = new Set(["auto_renewal", "stackable"]);

function normalizeLlmValue(field, value) {
  if (NUMERIC_FIELDS.has(field)) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const cleaned = String(value ?? "").replace(/[₩원,\s]/g, "");
    if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : null;
  }

  if (BOOLEAN_FIELDS.has(field)) {
    if (typeof value === "boolean") return value;
    const lowered = String(value ?? "").trim().toLowerCase();
    if (lowered === "true") return true;
    if (lowered === "false") return false;
    return null;
  }

  if (field === "conflicts_with") {
    if (!Array.isArray(value)) return null;
    return value.map((item) => normalize(item)).filter(Boolean);
  }

  if (field === "audience") {
    const normalized = String(value ?? "").trim().toUpperCase();
    return ["NEW", "EXISTING_OR_ALL"].includes(normalized) ? normalized : null;
  }

  if (field === "offer_billing_cycle") {
    const normalized = String(value ?? "").trim().toUpperCase();
    return ["MONTHLY", "ANNUAL", "WEEKLY"].includes(normalized) ? normalized : null;
  }

  if (field === "new_user_rule") {
    const normalized = String(value ?? "").trim().toUpperCase();
    return ["NEW_USER_ONLY", "NEW_OR_ELIGIBLE_RETURNING"].includes(normalized)
      ? normalized
      : null;
  }

  if (field === "start_at" || field === "end_at") {
    const raw = normalize(value);
    const match = raw.match(
      /(20\d{2})(?:[.\/-]|\s*년\s*)(\d{1,2})(?:[.\/-]|\s*월\s*)(\d{1,2})(?:\s*일)?/
    );
    if (!match) return null;
    const year = match[1];
    const month = String(Number(match[2])).padStart(2, "0");
    const day = String(Number(match[3])).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return normalize(value);
}

function stableValue(value) {
  if (Array.isArray(value)) return JSON.stringify([...value].sort());
  if (value && typeof value === "object") return JSON.stringify(value);
  return JSON.stringify(value);
}

export async function extractObservationsWithLlm(snapshot, {
  targetService = null,
  authority = { type: "OTHER_WEB", score: 100 },
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!snapshot?.ok) return { configured: false, observations: [], error: "NO_SNAPSHOT" };
  const page = normalize(snapshot.text).slice(0, 24_000);
  const prompt = [
    "Extract subscription-benefit facts from the supplied page.",
    "Never infer or calculate a value that is not explicitly stated.",
    "For discount_rate, use the whole percent number (30 for 30%), never a fraction.",
    "Never convert a card discount rate, cap, or fixed discount into offer_price.",
    "Every field MUST contain a verbatim evidence quote from PAGE.",
    "For start_at, emit a date only when the benefit/campaign itself explicitly starts on that date; never use post-trial billing dates.",
    "For end_at, emit a date only when the benefit/promotion ends, expires, or has an explicit signup deadline on that date.",
    "If a fact is absent, omit it. Do not emit action_url.",
    "Allowed fields:",
    [...ALLOWED_FIELDS].join(", "),
    "Return JSON only: {fields:[{field,value,evidence}]}",
    `Target service hint: ${targetService?.name || targetService?.id || "unknown"}`,
    `PAGE:\n${page}`,
  ].join("\n");

  const result = await callGeminiJson(prompt, env, fetchImpl);
  if (!result.payload) {
    return { configured: result.configured, observations: [], error: result.error, model: result.model };
  }

  const candidates = [];
  for (const item of Array.isArray(result.payload.fields) ? result.payload.fields : []) {
    const field = String(item?.field || "");
    if (!ALLOWED_FIELDS.has(field)) continue;
    if (!evidenceExists(page, item?.evidence)) continue;
    const evidence = normalize(item?.evidence);
    if (
      field === "start_at" &&
      !/(?:시작일|개시일|혜택|프로모션|이벤트|캠페인).{0,100}(?:시작|개시|부터)/i.test(evidence)
    ) {
      continue;
    }
    if (
      field === "end_at" &&
      !/(?:종료|마감|까지|expires?|ends?|valid\s+until|signup\s+deadline)/i.test(evidence)
    ) {
      continue;
    }
    const value = normalizeLlmValue(field, item?.value);
    if (value === undefined || value === null || value === "") continue;
    candidates.push({
      field,
      value,
      state: "EXTRACTED",
      sourceUrl: snapshot.finalUrl || snapshot.url,
      observedAt: snapshot.observedAt,
      extractor: "LLM_EVIDENCE_BOUND",
      authorityType: authority.type,
      authorityScore: authority.score,
      evidenceText: normalize(item.evidence).slice(0, 500),
      model: result.model,
    });
  }

  const observations = [];
  const ambiguousFields = [];
  const byField = new Map();
  for (const item of candidates) {
    if (!byField.has(item.field)) byField.set(item.field, []);
    byField.get(item.field).push(item);
  }
  for (const [field, items] of byField.entries()) {
    const unique = new Map(items.map((item) => [stableValue(item.value), item]));
    if (unique.size > 1) {
      ambiguousFields.push(field);
      continue;
    }
    observations.push(items[0]);
  }

  return {
    configured: true,
    observations,
    error: null,
    model: result.model,
    ambiguousFields,
  };
}
