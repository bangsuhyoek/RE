import { parseReceiptText } from "./_lib/receiptParser.js";
import { verifySupabaseAuth } from "./_lib/auth.js";
import { consumeRateLimit } from "./_lib/rateLimit.js";
import { callGemini, getCandidateModels } from "./_lib/gemini.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 원본 약 3MB 한도 (Vercel 4.5MB 본문 한도 전 방어)
const MAX_RAW_BODY_BYTES = 4.2 * 1024 * 1024;

const send = (response, status, payload) => {
  response.status(status).json(payload);
};

const readBody = (request) => {
  if (typeof request.body === "string") return JSON.parse(request.body);
  return request.body || {};
};

const callGoogleVision = async ({ imageBase64, apiKey }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["ko", "en"] },
        }],
      }),
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!response.ok || payload.responses?.[0]?.error) {
      const message = payload.responses?.[0]?.error?.message || payload.error?.message || "OCR 서비스 호출에 실패했습니다.";
      throw new Error(message);
    }
    return payload.responses?.[0]?.fullTextAnnotation?.text || payload.responses?.[0]?.textAnnotations?.[0]?.description || "";
  } finally {
    clearTimeout(timer);
  }
};

export default async function handler(request, response) {
  // Support Cross-Origin Requests from mobile Capacitor apps (e.g. capacitor://localhost, http://localhost)
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    if (typeof response.status === "function") {
      return response.status(204).end();
    }
    response.statusCode = 204;
    return response.end();
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS");
    return send(response, 405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "POST 요청만 지원합니다." });
  }

  // Raw body size guard before JSON processing
  if (typeof request.body === "string" && Buffer.byteLength(request.body, "utf8") > MAX_RAW_BODY_BYTES) {
    return send(response, 413, { ok: false, code: "IMAGE_TOO_LARGE", message: "요청 크기가 제한을 초과했습니다." });
  }

  // 1. Supabase 인증 확인 (토큰 로깅 금지) - 로컬 개발 미들웨어(dev-only)는 미인증 허용
  let userId;
  const authHeader = request.headers?.authorization || request.headers?.Authorization;
  if (!request.__isLocalDev) {
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
  }

  let body;
  try {
    body = readBody(request);
  } catch {
    return send(response, 400, { ok: false, code: "INVALID_JSON", message: "요청 형식이 올바르지 않습니다." });
  }

  const pastedText = String(body.text || "").trim();
  if (pastedText) {
    const parsed = parseReceiptText(pastedText);
    return send(response, parsed.ok ? 200 : 422, parsed);
  }

  const mimeType = String(body.mimeType || "").toLowerCase();
  const imageBase64 = String(body.imageBase64 || "").replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  if (!allowedMimeTypes.has(mimeType)) {
    return send(response, 400, { ok: false, code: "UNSUPPORTED_IMAGE", message: "JPG, PNG, WEBP 이미지만 사용할 수 있습니다." });
  }
  if (!imageBase64) {
    return send(response, 400, { ok: false, code: "IMAGE_REQUIRED", message: "인식할 이미지가 없습니다." });
  }

  const estimatedBytes = Math.ceil(imageBase64.length * 0.75);
  if (estimatedBytes > MAX_IMAGE_BYTES) {
    return send(response, 413, { ok: false, code: "IMAGE_TOO_LARGE", message: "이미지는 3MB 이하만 사용할 수 있습니다." });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const visionKey = process.env.GOOGLE_VISION_API_KEY;
  if (!geminiKey && !visionKey) {
    return send(response, 503, { ok: false, code: "OCR_NOT_CONFIGURED", message: "OCR 환경변수가 설정되지 않았습니다." });
  }

  // 2. DB 기반 원자적 할당량 및 전역 호출 상한 확인 (fail-closed)
  if (!request.__isLocalDev) {
    const rateLimitResult = await consumeRateLimit({
      userId,
      bearerToken: authHeader,
      endpoint: "ocr",
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
        message: "요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.",
      });
    }
  }

  try {
    const normalizedMimeType = mimeType === "image/jpg" ? "image/jpeg" : mimeType;
    let rawText = "";
    if (geminiKey) {
      try {
        const candidateModels = Array.from(new Set([
          process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
          ...getCandidateModels("ocr"),
        ]));

        rawText = await callGemini({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: normalizedMimeType,
                    data: imageBase64,
                  },
                },
                {
                  text: "영수증 또는 결제 내역 이미지의 모든 텍스트를 보이는 그대로 정확히 추출(OCR)해주세요. 요약이나 설명 없이 텍스트 원문만 줄바꿈하여 출력하세요.",
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 2048,
          },
          candidateModels,
          apiKey: geminiKey,
          overallTimeoutMs: 25_000,
          attemptTimeoutMs: 8_000,
          maxAttempts: 3,
        });
      } catch (geminiError) {
        if (visionKey && !geminiError.name?.includes("Abort")) {
          rawText = await callGoogleVision({ imageBase64, apiKey: visionKey });
        } else {
          throw geminiError;
        }
      }
    } else {
      rawText = await callGoogleVision({ imageBase64, apiKey: visionKey });
    }
    const parsed = parseReceiptText(rawText);
    return send(response, parsed.ok ? 200 : 422, parsed);
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return send(response, timedOut ? 504 : 502, {
      ok: false,
      code: timedOut ? "OCR_TIMEOUT" : "OCR_PROVIDER_ERROR",
      message: timedOut
        ? "이미지 인식 시간이 초과되었습니다. 다시 시도해 주세요."
        : (error?.isHighDemand ? "AI 모델 서비스에 일시적인 트래픽이 몰려 지연되고 있습니다. 잠시 후 다시 시도해 주시거나 결제 문자로 입력해 주세요." : "이미지 인식 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요."),
    });
  }
}

