import { parseReceiptText } from "../../api/_lib/receiptParser.js";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const DEFAULT_GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.5-flash-lite";

const FALLBACK_MODELS = [
  DEFAULT_GEMINI_MODEL,
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.6-flash",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isHighDemandOrOverloaded = (status, message = "") => {
  const lower = String(message).toLowerCase();
  return (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    lower.includes("high demand") ||
    lower.includes("spikes in demand") ||
    lower.includes("overloaded") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("unavailable")
  );
};

const callSingleGeminiModel = async ({ model, imageBase64, mimeType, apiKey, signal }) => {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(apiKey);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: imageBase64,
              },
            },
            {
              text: "영수증 또는 결제 내역 이미지의 모든 텍스트를 보이는 그대로 정확히 추출(OCR)해주세요. 요약이나 설명 없이 텍스트 원문만 줄바꿈하여 출력하세요.",
            },
          ],
        },
      ],
    }),
    signal,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const status = response.status || 500;
    const message = data.error?.message || ("Gemini OCR 호출 실패 (" + status + ")");
    const error = new Error(message);
    error.status = status;
    throw error;
  }

  return data.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text || "";
};

const fetchGeminiVisionWithFallback = async ({ imageBase64, mimeType, apiKey, signal }) => {
  const candidateModels = Array.from(new Set(FALLBACK_MODELS.filter(Boolean)));
  let lastError = null;

  for (const model of candidateModels) {
    try {
      return await callSingleGeminiModel({ model, imageBase64, mimeType, apiKey, signal });
    } catch (err) {
      lastError = err;
      if (signal?.aborted) throw err;
      if (!isHighDemandOrOverloaded(err.status, err.message) && err.status !== 404) {
        throw err;
      }
      await sleep(600);
    }
  }

  if (lastError && isHighDemandOrOverloaded(lastError.status, lastError.message)) {
    throw new Error(
      "AI 모델 서비스에 일시적인 트래픽이 몰려 지연되고 있습니다. 잠시 후 다시 시도해 주시거나 결제 문자로 입력해 주세요."
    );
  }
  throw lastError || new Error("Gemini OCR 호출에 실패했습니다.");
};

export const isDirectGeminiAvailable = () => Boolean(GEMINI_API_KEY);

export async function recognizeDirectly(payload) {
  // 1. 문자(SMS) 입력인 경우 로컬에서 즉시 파싱 (외부 네트워크 불필요)
  const pastedText = String(payload?.text || "").trim();
  if (pastedText) {
    const parsed = parseReceiptText(pastedText);
    if (!parsed.ok) {
      throw new Error(parsed.message || "결제 문자를 인식하지 못했습니다.");
    }
    return parsed;
  }

  // 2. 이미지 인식인 경우 Gemini Vision API 직접 호출
  if (!GEMINI_API_KEY) {
    throw new Error(
      "AI API 키(GEMINI_API_KEY)가 설정되어 있지 않습니다. .env.local 설정을 확인해 주세요."
    );
  }

  const { imageBase64, mimeType } = payload;
  const cleanBase64 = String(imageBase64 || "").replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  if (!cleanBase64) {
    throw new Error("인식할 이미지가 없습니다.");
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 28_000);

  try {
    const rawText = await fetchGeminiVisionWithFallback({
      imageBase64: cleanBase64,
      mimeType,
      apiKey: GEMINI_API_KEY,
      signal: controller.signal,
    });
    const parsed = parseReceiptText(rawText);
    if (!parsed.ok) {
      throw new Error(parsed.message || "영수증에서 결제 정보를 찾지 못했습니다.");
    }
    return parsed;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("이미지 인식 시간이 초과되었습니다. 네트워크 상태를 확인한 후 다시 시도해 주세요.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}
