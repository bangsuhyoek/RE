import { buildInterpretationPrompt, normalizeInterpretation } from "./_lib/agentInterpretation.js";

const MAX_TEXT_LENGTH = 300;
const MAX_SERVICES = 60;
const TOTAL_BUDGET_MS = 12_000;
const MODEL_TIMEOUT_MS = 5_000;
const MIN_REMAINING_BUDGET_MS = 1_000;
const AUTH_TIMEOUT_MS = 3_000;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10분
const RATE_LIMIT_MAX_REQUESTS = 20;

// 인스턴스 메모리 기반 속도 제한 (per-instance only)
// 멀티 인스턴스/서버리스 환경에서는 인스턴스 단위 최선의 방어(best-effort)로 동작합니다.
const rateLimitMap = new Map();

export const _resetRateLimits = () => {
  rateLimitMap.clear();
};

const pruneRateLimitMap = (now) => {
  if (rateLimitMap.size < 500) return;
  for (const [key, record] of rateLimitMap.entries()) {
    if (!record.resetAt || record.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
};

const checkRateLimit = (userId) => {
  const now = Date.now();
  pruneRateLimitMap(now);

  const existing = rateLimitMap.get(userId);
  if (!existing || existing.resetAt <= now) {
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfter };
  }

  existing.count += 1;
  return { allowed: true };
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
  return request.body || {};
};

const verifySupabaseAuth = async (authHeader) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    const err = new Error("Supabase auth not configured");
    err.code = "AGENT_AUTH_NOT_CONFIGURED";
    throw err;
  }

  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  if (!token) return null;

  const authController = new AbortController();
  const timer = setTimeout(() => authController.abort(), AUTH_TIMEOUT_MS);
  try {
    const endpoint = supabaseUrl.replace(/\/+$/, "") + "/auth/v1/user";
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      signal: authController.signal,
    });

    if (!res.ok) {
      return null;
    }

    const userData = await res.json().catch(() => null);
    if (!userData?.id) {
      return null;
    }
    return userData.id;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const callGemini = async ({ prompt, apiKey }) => {
  const overallController = new AbortController();
  const overallTimer = setTimeout(() => overallController.abort(), TOTAL_BUDGET_MS);
  const startTime = Date.now();

  const models = Array.from(new Set([
    process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-latest",
  ]));

  let lastError = null;
  try {
    for (const model of models) {
      const elapsed = Date.now() - startTime;
      const remainingTotal = TOTAL_BUDGET_MS - elapsed;
      if (remainingTotal < MIN_REMAINING_BUDGET_MS) {
        break;
      }

      const modelTimeout = Math.min(MODEL_TIMEOUT_MS, remainingTotal);
      const modelController = new AbortController();
      const onOverallAbort = () => modelController.abort();
      overallController.signal.addEventListener("abort", onOverallAbort, { once: true });
      const modelTimer = setTimeout(() => modelController.abort(), modelTimeout);

      try {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(apiKey);
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, responseMimeType: "application/json" },
          }),
          signal: modelController.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.error) {
          const error = new Error(payload.error?.message || "Gemini 호출 실패 (" + response.status + ")");
          error.status = response.status;
          throw error;
        }
        return payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text || "";
      } catch (error) {
        lastError = error;
        if (overallController.signal.aborted || error.status === 401 || error.status === 403) {
          throw error;
        }
      } finally {
        clearTimeout(modelTimer);
        overallController.signal.removeEventListener("abort", onOverallAbort);
      }
    }

    if (overallController.signal.aborted) {
      const timeoutErr = new Error("AI 해석 총 예산 시간 초과");
      timeoutErr.name = "AbortError";
      throw timeoutErr;
    }

    throw lastError || new Error("Gemini 호출에 실패했습니다.");
  } finally {
    clearTimeout(overallTimer);
  }
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
  try {
    const authHeader = request.headers?.authorization || request.headers?.Authorization;
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

  // 2. 인스턴스 인메모리 속도 제한 (유저당 10분 20회)
  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    response.setHeader("Retry-After", String(rateLimit.retryAfter));
    return send(response, 429, {
      ok: false,
      code: "RATE_LIMITED",
      message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    });
  }

  let body;
  try {
    body = readBody(request);
  } catch {
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

  try {
    const raw = await callGemini({ prompt: buildInterpretationPrompt(text, services), apiKey });
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
