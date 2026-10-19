// src/lib/deepLinks.js
import { registerPlugin } from "@capacitor/core";

export const NativePaymentCapture = registerPlugin("PaymentCapture");

/**
 * 딥링크 파싱 및 타입 식별
 * @param {string} rawUrl
 * @returns {{
 *   type: 'auth_callback' | 'quick_add' | 'unknown',
 *   code?: string,
 *   quickAdd?: object,
 *   nonce?: string,
 *   error?: string
 * }}
 */
export function parseDeepLink(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { type: "unknown" };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    return { type: "unknown", error: "INVALID_URL" };
  }

  // 1. OAuth Callback: Only submate://auth/callback is accepted for native deep link
  // submate://auth/callback?code=xxx
  if (parsed.protocol === "submate:" && parsed.hostname === "auth" && parsed.pathname === "/callback") {
    const code = parsed.searchParams.get("code");
    if (code) {
      return { type: "auth_callback", code };
    }
    return { type: "auth_callback", error: "NO_CODE" };
  }

  // 2. quick-add: submate://quick-add?name=...&amount=...&nonce=...
  if (parsed.protocol === "submate:" && (parsed.hostname === "quick-add" || parsed.pathname.includes("quick-add"))) {
    const params = parsed.searchParams;
    const nonce = params.get("nonce") || "";
    const detectedAt = Number(params.get("detectedAt")) || Date.now();
    const detectedDate = new Date(detectedAt);
    const dueDayFromLink = Number(params.get("dueDay"));
    const detectedDueDay =
      dueDayFromLink >= 1 && dueDayFromLink <= 31
        ? dueDayFromLink
        : detectedDate.getDate();

    const quickAdd = {
      name: params.get("name") || "",
      amount: Number(params.get("amount")) || 0,
      plan: params.get("plan") || "",
      paymentMethod: params.get("method") || "",
      category: params.get("category") || "기타",
      serviceId: params.get("serviceId") || "",
      dueDay: detectedDueDay,
      billingCycle: "매월",
      sourceType: "sms",
      autoDetected: true,
      detectedAt: detectedDate.toISOString(),
      nonce,
    };

    return {
      type: "quick_add",
      quickAdd,
      nonce,
    };
  }

  return { type: "unknown" };
}

/**
 * Quick-add 일회용 nonce 검증 및 소비
 * 네이티브 환경에서는 PaymentCapture.consumeQuickAddNonce({ nonce }) 호출,
 * 웹/테스트 환경에서는 customValidator 또는 mock 지원.
 * @param {string} nonce
 * @param {Function} [customValidator]
 * @returns {Promise<boolean>}
 */
export async function verifyAndConsumeNonce(nonce, customValidator = null) {
  if (!nonce || typeof nonce !== "string") {
    return false;
  }

  if (typeof customValidator === "function") {
    return Boolean(await customValidator(nonce));
  }

  try {
    const res = await NativePaymentCapture.consumeQuickAddNonce({ nonce });
    return Boolean(res && res.valid);
  } catch (err) {
    console.warn("Failed to consume quick-add nonce:", err);
    return false;
  }
}
