import { verifySupabaseAuth } from "./_lib/auth.js";
import { consumeRateLimit } from "./_lib/rateLimit.js";
import {
  validateAndClamp,
  buildPrompt,
  normalize,
  cancelNextStepResponseSchema,
} from "./_lib/cancelNextStep.js";

const OVERALL_TIMEOUT_MS = 3000;
const MODEL_TIMEOUT_MS = 2200;
const MIN_REMAINING_BUDGET_MS = 400;

const DEFAULT_CANCEL_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-latest",
];

const sendJson = (response, status, payload) => {
  if (typeof response.status === "function") {
    response.status(status).json(payload);
  } else {
    response.statusCode = status;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify(payload));
  }
};

const readBody = (request) => {
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return null;
    }
  }
  return request.body || null;
};

export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (request.method === "OPTIONS") {
    response.statusCode = 200;
    response.end();
    return;
  }

  if (request.method !== "POST") {
    return sendJson(response, 400, { error: "INVALID_REQUEST" });
  }

  // 1. Auth check
  const authHeader = request.headers?.authorization || request.headers?.Authorization;
  if (!authHeader) {
    return sendJson(response, 401, { error: "UNAUTHORIZED" });
  }

  let userId;
  try {
    userId = await verifySupabaseAuth(authHeader);
  } catch (err) {
    if (err?.code === "AGENT_AUTH_NOT_CONFIGURED") {
      return sendJson(response, 503, { error: "CANCEL_AI_NOT_CONFIGURED" });
    }
    return sendJson(response, 401, { error: "UNAUTHORIZED" });
  }

  if (!userId) {
    return sendJson(response, 401, { error: "UNAUTHORIZED" });
  }

  // 2. Environment check: Gemini API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(response, 503, { error: "CANCEL_AI_NOT_CONFIGURED" });
  }

  // 3. Rate limiting
  const rateLimitResult = await consumeRateLimit({
    userId,
    bearerToken: authHeader,
  });
  if (!rateLimitResult.allowed) {
    return sendJson(response, 429, { error: "RATE_LIMIT_EXCEEDED" });
  }

  // 4. Validate & clamp request body
  const rawBody = readBody(request);
  const validation = validateAndClamp(rawBody);
  if (!validation.valid) {
    return sendJson(response, 400, { error: "INVALID_REQUEST" });
  }
  const clampedInput = validation.value;

  // 5. Build prompt & prepare Gemini call
  const prompt = buildPrompt(clampedInput);
  const configuredModel =
    process.env.GEMINI_CANCEL_MODEL ||
    process.env.GEMINI_MODEL ||
    DEFAULT_CANCEL_MODELS[0];
  const models = Array.from(new Set([configuredModel, ...DEFAULT_CANCEL_MODELS]));
  const baseUrl = (
    process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com"
  ).replace(/\/+$/, "");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OVERALL_TIMEOUT_MS);
  const startTime = Date.now();

  try {
    let lastTimedOut = false;
    for (const model of models) {
      const remaining = OVERALL_TIMEOUT_MS - (Date.now() - startTime);
      if (remaining < MIN_REMAINING_BUDGET_MS) {
        break;
      }
      const attemptController = new AbortController();
      const onOverallAbort = () => attemptController.abort();
      controller.signal.addEventListener("abort", onOverallAbort, { once: true });
      const attemptTimer = setTimeout(
        () => attemptController.abort(),
        Math.min(MODEL_TIMEOUT_MS, remaining)
      );

      try {
        const url =
          baseUrl +
          "/v1beta/models/" +
          encodeURIComponent(model) +
          ":generateContent?key=" +
          encodeURIComponent(apiKey);

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0,
              responseMimeType: "application/json",
              responseSchema: cancelNextStepResponseSchema,
            },
          }),
          signal: attemptController.signal,
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            break;
          }
          continue;
        }

        const data = await res.json().catch(() => null);
        const textPart = data?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
        if (!textPart) {
          continue;
        }

        const normalized = normalize(textPart, clampedInput);
        return sendJson(response, 200, normalized);
      } catch (err) {
        if (controller.signal.aborted || attemptController.signal.aborted || err?.name === "AbortError") {
          lastTimedOut = true;
          if (controller.signal.aborted) break;
        }
      } finally {
        clearTimeout(attemptTimer);
        controller.signal.removeEventListener("abort", onOverallAbort);
      }
    }

    if (lastTimedOut || controller.signal.aborted) {
      return sendJson(response, 504, { error: "CANCEL_AI_TIMEOUT" });
    }
    return sendJson(response, 502, { error: "CANCEL_AI_FAILED" });
  } catch (err) {
    if (controller.signal.aborted || err?.name === "AbortError") {
      return sendJson(response, 504, { error: "CANCEL_AI_TIMEOUT" });
    }
    return sendJson(response, 502, { error: "CANCEL_AI_FAILED" });
  } finally {
    clearTimeout(timer);
  }
}
