import { parseReceiptText } from "../../api/_lib/receiptParser.js";

export const isDirectGeminiAvailable = () => false;

export async function recognizeDirectly(payload) {
  // 문자(SMS) 입력인 경우 로컬에서 즉시 파싱 (외부 네트워크 불필요)
  const pastedText = String(payload?.text || "").trim();
  if (pastedText) {
    const parsed = parseReceiptText(pastedText);
    if (!parsed.ok) {
      throw new Error(parsed.message || "결제 문자를 인식하지 못했습니다.");
    }
    return parsed;
  }

  throw new Error("이미지 인식을 위해 서버 API(/api/ocr)를 이용해 주세요.");
}
