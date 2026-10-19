import { verifySupabaseAuth } from "./_lib/auth.js";
import { consumeRateLimit } from "./_lib/rateLimit.js";
import { callGemini, getCandidateModels } from "./_lib/gemini.js";
import {
  validateAndClamp,
  buildPrompt,
  normalize,
  cancelNextStepResponseSchema,
} from "./_lib/cancelNextStep.js";

const OVERALL_TIMEOUT_MS = 3000;
const MODEL_TIMEOUT_MS = 2200;

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
    response.setHeader("Allow", "POST, OPTIONS");
    return sendJson(response, 405, { error: "METHOD_NOT_ALLOWED" });
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

  // 3. Validate & clamp request body before consuming quota
  const rawBody = readBody(request);
  const validation = validateAndClamp(rawBody);
  if (!validation.valid) {
    return sendJson(response, 400, { error: "INVALID_REQUEST" });
  }
  const clampedInput = validation.value;

  // 4. Rate limiting: user quota + project-wide global Gemini quota
  const rateLimitResult = await consumeRateLimit({
    userId,
    bearerToken: authHeader,
    endpoint: "cancel_next_step",
    checkGlobal: true,
  });

  if (rateLimitResult.failClosed) {
    response.setHeader("Retry-After", String(rateLimitResult.retryAfterSeconds || 60));
    return sendJson(response, 503, { error: "RATE_LIMIT_UNAVAILABLE" });
  }

  if (!rateLimitResult.allowed) {
    response.setHeader("Retry-After", String(rateLimitResult.retryAfterSeconds || 60));
    return sendJson(response, 429, { error: "RATE_LIMIT_EXCEEDED" });
  }

  // 5. Build prompt & call Gemini with model fallback
  const prompt = buildPrompt(clampedInput);
  const configuredModel =
    process.env.GEMINI_CANCEL_MODEL ||
    process.env.GEMINI_MODEL ||
    "gemini-3.5-flash-lite";
  const candidateModels = Array.from(new Set([configuredModel, ...getCandidateModels("cancel")]));

  try {
    const rawText = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: cancelNextStepResponseSchema,
        maxOutputTokens: 256,
      },
      candidateModels,
      apiKey,
      overallTimeoutMs: OVERALL_TIMEOUT_MS,
      attemptTimeoutMs: MODEL_TIMEOUT_MS,
      maxAttempts: 3,
    });

    const normalized = normalize(rawText, clampedInput);
    return sendJson(response, 200, normalized);
  } catch (err) {
    const timedOut = err?.name === "AbortError";
    return sendJson(response, timedOut ? 504 : 502, {
      error: timedOut ? "CANCEL_AI_TIMEOUT" : "CANCEL_AI_FAILED",
    });
  }
}

