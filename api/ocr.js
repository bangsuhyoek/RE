import { parseReceiptText } from "./_lib/receiptParser.js";

export const config = {
  api: {
    bodyParser: { sizeLimit: "12mb" },
  },
};

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const send = (response, status, payload) => {
  response.status(status).json(payload);
};

const readBody = (request) => {
  if (typeof request.body === "string") return JSON.parse(request.body);
  return request.body || {};
};

const callGoogleVision = async ({ imageBase64, apiKey }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
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
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return send(response, 405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "POST 요청만 지원합니다." });
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
    return send(response, 413, { ok: false, code: "IMAGE_TOO_LARGE", message: "이미지는 8MB 이하만 사용할 수 있습니다." });
  }

  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    return send(response, 503, { ok: false, code: "OCR_NOT_CONFIGURED", message: "OCR 환경변수가 설정되지 않았습니다." });
  }

  try {
    const rawText = await callGoogleVision({ imageBase64, apiKey });
    const parsed = parseReceiptText(rawText);
    return send(response, parsed.ok ? 200 : 422, parsed);
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return send(response, timedOut ? 504 : 502, {
      ok: false,
      code: timedOut ? "OCR_TIMEOUT" : "OCR_PROVIDER_ERROR",
      message: timedOut ? "이미지 인식 시간이 초과되었습니다. 다시 시도해 주세요." : "이미지 인식 서비스에 연결하지 못했습니다.",
    });
  }
}
