const DEFAULT_GEMINI_API_BASE = "https://generativelanguage.googleapis.com";
export const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * Returns candidate models for a given endpoint/purpose based on environment variables.
 *
 * @param {"chat"|"cancel"|"agent"|"ocr"|"general"} [purpose="general"]
 * @returns {string[]}
 */
export function getCandidateModels(purpose = "general") {
  let primaryModel;
  if (purpose === "chat") {
    primaryModel = process.env.GEMINI_CHAT_MODEL || process.env.GEMINI_MODEL || "gemini-3.5-flash";
  } else if (purpose === "cancel") {
    primaryModel = process.env.GEMINI_CANCEL_MODEL || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  } else if (purpose === "ocr") {
    primaryModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  } else if (purpose === "agent") {
    primaryModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  } else {
    primaryModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  }

  const fallbackDefaults = [
    primaryModel,
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-latest",
  ];

  return Array.from(new Set(fallbackDefaults.filter(Boolean)));
}

/**
 * Builds the Gemini API endpoint URL without embedding credentials in query string.
 *
 * @param {string} model
 * @param {"generateContent"|"streamGenerateContent"} action
 * @param {boolean} [streamSse=false]
 * @returns {string}
 */
export function buildGeminiUrl(model, action = "generateContent", streamSse = false) {
  const baseUrl = (process.env.GEMINI_API_BASE || DEFAULT_GEMINI_API_BASE).replace(/\/+$/, "");
  const sseQuery = streamSse ? "?alt=sse" : "";
  return `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:${action}${sseQuery}`;
}

/**
 * Checks whether an error or status code indicates temporary high demand/overload.
 *
 * @param {number} status
 * @param {string} [errorCode=""]
 * @returns {boolean}
 */
export function isOverloadedStatus(status, errorCode = "") {
  const code = String(errorCode).toUpperCase();
  return (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    code === "RESOURCE_EXHAUSTED" ||
    code === "UNAVAILABLE"
  );
}

/**
 * Logs Gemini error safely: only status code and short error code.
 *
 * @param {number} status
 * @param {string} [code]
 */
function logGeminiError(status, code) {
  const codeSuffix = code ? ` (${code})` : "";
  console.error(`Gemini request failed: status ${status}${codeSuffix}`);
}

/**
 * Calls Gemini generateContent with model fallbacks, x-goog-api-key header,
 * timeouts, maxOutputTokens, attempt cap, and sanitized error logging.
 *
 * @param {object} options
 * @param {Array<object>} options.contents
 * @param {object} [options.systemInstruction]
 * @param {object} [options.generationConfig]
 * @param {string} [options.purpose="general"]
 * @param {string[]} [options.candidateModels]
 * @param {string} [options.apiKey]
 * @param {number} [options.overallTimeoutMs=12000]
 * @param {number} [options.attemptTimeoutMs=5000]
 * @param {number} [options.maxAttempts=DEFAULT_MAX_ATTEMPTS]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<string>}
 */
export async function callGemini({
  contents,
  systemInstruction,
  generationConfig = {},
  purpose = "general",
  candidateModels,
  apiKey,
  overallTimeoutMs = 12000,
  attemptTimeoutMs = 5000,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  signal: parentSignal,
}) {
  const resolvedApiKey = apiKey || process.env.GEMINI_API_KEY;
  if (!resolvedApiKey) {
    const err = new Error("GEMINI_API_KEY is not configured");
    err.code = "GEMINI_NOT_CONFIGURED";
    throw err;
  }

  const models = candidateModels && candidateModels.length > 0
    ? candidateModels
    : getCandidateModels(purpose);

  const attemptLimit = Math.min(models.length, Math.max(1, maxAttempts));
  const startTime = Date.now();

  const overallController = new AbortController();
  const overallTimer = setTimeout(() => overallController.abort(), overallTimeoutMs);

  const onParentAbort = () => overallController.abort();
  if (parentSignal) {
    if (parentSignal.aborted) {
      clearTimeout(overallTimer);
      const abortErr = new Error("Operation aborted");
      abortErr.name = "AbortError";
      throw abortErr;
    }
    parentSignal.addEventListener("abort", onParentAbort, { once: true });
  }

  let lastError = null;

  try {
    for (let i = 0; i < attemptLimit; i++) {
      const model = models[i];

      const elapsed = Date.now() - startTime;
      const remainingTotal = overallTimeoutMs - elapsed;
      if (remainingTotal <= 200) {
        break;
      }

      const attemptTimeout = Math.min(attemptTimeoutMs, remainingTotal);
      const attemptController = new AbortController();
      const onOverallAbort = () => attemptController.abort();
      overallController.signal.addEventListener("abort", onOverallAbort, { once: true });
      const attemptTimer = setTimeout(() => attemptController.abort(), attemptTimeout);

      try {
        const url = buildGeminiUrl(model, "generateContent", false);
        const bodyPayload = {
          contents,
          ...(systemInstruction ? { systemInstruction } : {}),
          generationConfig: {
            ...generationConfig,
            ...(generationConfig.maxOutputTokens ? { maxOutputTokens: generationConfig.maxOutputTokens } : {}),
          },
        };

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": resolvedApiKey,
          },
          body: JSON.stringify(bodyPayload),
          signal: attemptController.signal,
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          const shortCode = payload?.error?.status || payload?.error?.code || "";
          logGeminiError(res.status, shortCode);

          const err = new Error(`Gemini provider error (${res.status})`);
          err.status = res.status;
          err.code = shortCode;
          if (isOverloadedStatus(res.status, shortCode)) {
            err.isHighDemand = true;
          }

          if (res.status === 401 || res.status === 403) {
            throw err;
          }

          lastError = err;
          continue;
        }

        const data = await res.json().catch(() => ({}));
        const text = data?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text || "";
        return text;
      } catch (err) {
        lastError = err;
        if (overallController.signal.aborted || err.status === 401 || err.status === 403) {
          throw err;
        }
      } finally {
        clearTimeout(attemptTimer);
        overallController.signal.removeEventListener("abort", onOverallAbort);
      }
    }

    if (overallController.signal.aborted || parentSignal?.aborted) {
      const timeoutErr = new Error("Gemini operation timed out");
      timeoutErr.name = "AbortError";
      throw timeoutErr;
    }

    throw lastError || new Error("Gemini request failed");
  } finally {
    clearTimeout(overallTimer);
    if (parentSignal) {
      parentSignal.removeEventListener("abort", onParentAbort);
    }
  }
}

/**
 * Fetches a Gemini stream for chat SSE with x-goog-api-key header and sanitized error logging.
 *
 * @param {object} options
 * @param {string} options.model
 * @param {Array<object>} options.contents
 * @param {object} [options.systemInstruction]
 * @param {Array<object>} [options.tools]
 * @param {object} [options.generationConfig]
 * @param {string} [options.apiKey]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Response>}
 */
export async function fetchGeminiStream({
  model,
  contents,
  systemInstruction,
  tools,
  generationConfig = {},
  apiKey,
  signal,
}) {
  const resolvedApiKey = apiKey || process.env.GEMINI_API_KEY;
  if (!resolvedApiKey) {
    const err = new Error("GEMINI_API_KEY is not configured");
    err.code = "GEMINI_NOT_CONFIGURED";
    throw err;
  }

  const url = buildGeminiUrl(model, "streamGenerateContent", true);
  const bodyPayload = {
    contents,
    ...(systemInstruction ? { systemInstruction } : {}),
    ...(tools ? { tools } : {}),
    generationConfig: {
      ...generationConfig,
      maxOutputTokens: generationConfig.maxOutputTokens || 2048,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": resolvedApiKey,
    },
    body: JSON.stringify(bodyPayload),
    signal,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const shortCode = payload?.error?.status || payload?.error?.code || "";
    logGeminiError(res.status, shortCode);

    const err = new Error(`Gemini stream provider error (${res.status})`);
    err.status = res.status;
    err.code = shortCode;
    throw err;
  }

  return res;
}

