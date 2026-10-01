import { buildInterpretationPrompt, normalizeInterpretation } from "./_lib/agentInterpretation.js";

const MAX_TEXT_LENGTH = 300;
const MAX_SERVICES = 60;

const send = (response, status, payload) => {
  response.status(status).json(payload);
};

const readBody = (request) => {
  if (typeof request.body === "string") return JSON.parse(request.body);
  return request.body || {};
};

const callGemini = async ({ prompt, apiKey }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  const models = Array.from(new Set([
    process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-latest",
  ]));
  let lastError = null;
  try {
    for (const model of models) {
      try {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(apiKey);
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, responseMimeType: "application/json" },
          }),
          signal: controller.signal,
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
        if (controller.signal.aborted || error.status === 401 || error.status === 403) throw error;
      }
    }
    throw lastError || new Error("Gemini 호출에 실패했습니다.");
  } finally {
    clearTimeout(timer);
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

