import { parseReceiptText } from "../../api/_lib/receiptParser.js";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.5-flash";

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
  const timer = window.setTimeout(() => controller.abort(), 25_000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: cleanBase64,
                  },
                },
                {
                  text: "영수증 또는 결제 내역 이미지의 모든 텍스트를 보이는 그대로 정확히 추출(OCR)해주세요. 요약이나 설명 없이 텍스트 원문만 줄바꿈하여 출력하세요.",
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      }
    );

    const data = await response.json();
    if (!response.ok || data.error) {
      const message = data.error?.message || "Gemini OCR 호출에 실패했습니다.";
      throw new Error(message);
    }

    const rawText = data.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text || "";
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
