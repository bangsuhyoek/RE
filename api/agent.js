import { buildInterpretationPrompt, normalizeInterpretation } from "./_lib/agentInterpretation.js";
import { verifySupabaseAuth } from "./_lib/auth.js";
import { consumeRateLimit, _resetInMemoryRateLimits } from "./_lib/rateLimit.js";
import { callGemini, getCandidateModels } from "./_lib/gemini.js";

const MAX_TEXT_LENGTH = 300;
const MAX_SERVICES = 60;
const TOTAL_BUDGET_MS = 12_000;
const MODEL_TIMEOUT_MS = 5_000;

export const _resetRateLimits = () => {
  _resetInMemoryRateLimits();
};

const send = (response, status, payload) => {
  if (typeof response.status === "function") {
    response.status(status).json(payload);
  } else {
    response.statusCode = status;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(payload));
  }
};

const readBody = (request) => {
  if (typeof request.body === "string") return JSON.parse(request.body);
  return request.body;
};

export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    if (typeof response.status === "function") return response.status(204).end();
    response.statusCode = 204;
    return response.end();
  }
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS");
    return send(response, 405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "POST 요청만 지원합니다." });
  }

  // 1. Supabase 인증 확인 (토큰 로깅 금지)
  let userId;
  const authHeader = request.headers?.authorization || request.headers?.Authorization;
  try {
    userId = await verifySupabaseAuth(authHeader);
  } catch (err) {
    if (err.code === "AGENT_AUTH_NOT_CONFIGURED") {
      return send(response, 503, {
        ok: false,
        code: "AGENT_AUTH_NOT_CONFIGURED",
        message: "인증 서버 환경변수가 설정되지 않았습니다.",
      });
    }
    return send(response, 401, {
      ok: false,
      code: "AUTH_REQUIRED",
      message: "인증이 필요합니다.",
    });
  }

  if (!userId) {
    return send(response, 401, {
      ok: false,
      code: "AUTH_REQUIRED",
      message: "인증이 필요합니다.",
    });
  }

  let body;
  try {
    body = readBody(request);
  } catch {
    return send(response, 400, { ok: false, code: "INVALID_JSON", message: "요청 형식이 올바르지 않습니다." });
  }
  if (!body || typeof body !== "object") {
    return send(response, 400, { ok: false, code: "INVALID_JSON", message: "요청 형식이 올바르지 않습니다." });
  }

  const text = String(body.text || "").trim().slice(0, MAX_TEXT_LENGTH);
  if (!text) return send(response, 400, { ok: false, code: "TEXT_REQUIRED", message: "요청 문장이 없습니다." });
  const services = (Array.isArray(body.services) ? body.services : [])
    .slice(0, MAX_SERVICES)
    .map((service) => ({ id: String(service?.id || "").slice(0, 80), name: String(service?.name || "").slice(0, 80) }))
    .filter((service) => service.id);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return send(response, 503, { ok: false, code: "AGENT_NOT_CONFIGURED", message: "AI 해석 환경변수가 설정되지 않았습니다." });

  // 2. DB 기반 원자적 할당량 및 전역 호출 상한 확인 (fail-closed)
  const rateLimitResult = await consumeRateLimit({
    userId,
    bearerToken: authHeader,
    endpoint: "agent",
    checkGlobal: true,
  });

  if (rateLimitResult.failClosed) {
    response.setHeader("Retry-After", String(rateLimitResult.retryAfterSeconds || 60));
    return send(response, 503, {
      ok: false,
      code: "RATE_LIMIT_UNAVAILABLE",
      message: "일시적으로 사용량 확인이 불가능합니다. 잠시 후 다시 시도해 주세요.",
    });
  }

  if (!rateLimitResult.allowed) {
    response.setHeader("Retry-After", String(rateLimitResult.retryAfterSeconds || 60));
    return send(response, 429, {
      ok: false,
      code: "RATE_LIMITED",
      message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    });
  }

  // 3. Gemini 공통 모듈 호출
  try {
    const candidateModels = Array.from(new Set([
      process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      ...getCandidateModels("agent"),
    ]));

    const raw = await callGemini({
      contents: [{ parts: [{ text: buildInterpretationPrompt(text, services) }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        maxOutputTokens: 256,
      },
      candidateModels,
      apiKey,
      overallTimeoutMs: TOTAL_BUDGET_MS,
      attemptTimeoutMs: MODEL_TIMEOUT_MS,
      maxAttempts: 3,
    });

    return send(response, 200, { ok: true, ...normalizeInterpretation(raw, services) });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return send(response, timedOut ? 504 : 502, {
      ok: false,
      code: timedOut ? "AGENT_TIMEOUT" : "AGENT_PROVIDER_ERROR",
      message: timedOut ? "AI 해석 시간이 초과되었습니다." : "AI 해석 서비스에 연결하지 못했습니다.",
    });
  }
}

