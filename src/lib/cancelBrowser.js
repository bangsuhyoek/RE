import { Capacitor, registerPlugin } from "@capacitor/core";

const NativeCancelBrowser = registerPlugin("CancelBrowser");

/**
 * 해지 웹뷰 및 20% 가이드 도크 브라우저 열기
 * @param {Object} options
 * @param {string} options.serviceId
 * @param {string} options.serviceName
 * @param {string} options.cancelUrl
 * @param {Array} options.guideSteps
 * @returns {Promise<{ action: 'COMPLETED' | 'CLOSED' }>}
 */
export async function openCancelBrowser(options) {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await NativeCancelBrowser.open({
        serviceId: options.serviceId || "",
        serviceName: options.serviceName || "",
        cancelUrl: options.cancelUrl || "",
        guideSteps: options.guideSteps || [],
      });
      return result;
    } catch (err) {
      console.warn("Native CancelBrowser 호출 실패, 웹 모드로 전환:", err);
    }
  }

  // 웹 플랫폼 또는 플러그인 폴백
  return { action: "FALLBACK_WEB" };
}
