import { Capacitor, registerPlugin } from "@capacitor/core";

const NativeCancelBrowser = registerPlugin("CancelBrowser");

/**
 * 오버레이(다른 앱 위에 그리기) 권한 보유 여부 확인
 * @returns {Promise<boolean>}
 */
export async function checkOverlayPermission() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await NativeCancelBrowser.checkOverlayPermission();
    return !!res?.hasPermission;
  } catch (err) {
    console.warn("checkOverlayPermission 실패:", err);
    return false;
  }
}

/**
 * 오버레이 권한 설정 화면 열기
 */
export async function requestOverlayPermission() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await NativeCancelBrowser.requestOverlayPermission();
  } catch (err) {
    console.warn("requestOverlayPermission 실패:", err);
  }
}

/**
 * 플로팅 버블 가이드 시작 및 외부 브라우저 호출
 * @param {Object} options
 * @param {string} options.serviceId
 * @param {string} options.serviceName
 * @param {string} options.cancelUrl
 * @param {Array} options.guideSteps
 * @param {Function} onCompleteCallback
 */
export async function startFloatingGuide(options, onCompleteCallback) {
  if (Capacitor.isNativePlatform()) {
    try {
      await NativeCancelBrowser.removeAllListeners();
      if (onCompleteCallback) {
        await NativeCancelBrowser.addListener("onCancelCompleted", (data) => {
          onCompleteCallback(data);
        });
      }
      await NativeCancelBrowser.startFloatingGuide({
        serviceId: options.serviceId || "",
        serviceName: options.serviceName || "",
        cancelUrl: options.cancelUrl || "",
        guideSteps: options.guideSteps || [],
      });
      return { success: true };
    } catch (err) {
      console.warn("startFloatingGuide 실패:", err);
      return { success: false, error: err };
    }
  }
  return { success: false, fallback: true };
}

/**
 * 플로팅 버블 가이드 종료
 */
export async function stopFloatingGuide() {
  if (Capacitor.isNativePlatform()) {
    try {
      await NativeCancelBrowser.stopFloatingGuide();
    } catch (err) {
      console.warn("stopFloatingGuide 실패:", err);
    }
  }
}

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
