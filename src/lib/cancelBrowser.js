import { Capacitor, registerPlugin } from "@capacitor/core";

const NativeCancelBrowser = registerPlugin("CancelBrowser");

/**
 * 네이티브 CancelBrowser 결과 객체를 검증 및 정규화
 * @param {any} raw
 * @returns {{
 *   serviceId: string,
 *   status: "completed" | "closed",
 *   detectedBy: "url" | "text" | "manual" | null,
 *   url: string | null,
 *   proofPath: string | null,
 *   proofWebPath: string | null,
 *   autoTaps: number,
 *   action: "COMPLETED" | "CLOSED"
 * } | null}
 */
export function normalizeCancelFlowResult(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  let status = null;
  if (typeof raw.status === "string") {
    const s = raw.status.toLowerCase().trim();
    if (s === "completed" || s === "closed") {
      status = s;
    }
  } else if (typeof raw.action === "string") {
    // 하위 호환: status 누락 시 action("COMPLETED" | "CLOSED")으로 매핑
    const a = raw.action.toUpperCase().trim();
    if (a === "COMPLETED") status = "completed";
    else if (a === "CLOSED") status = "closed";
  }

  if (!status) {
    return null;
  }

  const detectedBy =
    raw.detectedBy === "url" || raw.detectedBy === "text" || raw.detectedBy === "manual"
      ? raw.detectedBy
      : null;

  const serviceId =
    typeof raw.serviceId === "string"
      ? raw.serviceId
      : raw.serviceId != null
      ? String(raw.serviceId)
      : "";

  const url = typeof raw.url === "string" && raw.url.trim() ? raw.url.trim() : null;
  const proofPath = typeof raw.proofPath === "string" && raw.proofPath.trim() ? raw.proofPath.trim() : null;
  const proofWebPath = typeof raw.proofWebPath === "string" && raw.proofWebPath.trim() ? raw.proofWebPath.trim() : null;
  const autoTaps = Number.isFinite(Number(raw.autoTaps)) ? Number(raw.autoTaps) : 0;

  return {
    serviceId,
    status,
    detectedBy,
    url,
    proofPath,
    proofWebPath,
    autoTaps,
    action: status === "completed" ? "COMPLETED" : "CLOSED",
  };
}

/**
 * 해지 모달 상단에 표시할 카드 상태 결정 순수 함수
 * @param {Object} [params]
 * @param {boolean} [params.celebrating]
 * @param {boolean} [params.hasReturnedFromCancel]
 * @param {string|null} [params.flowStatus]
 * @param {boolean} [params.cancelSessionActive]
 * @param {boolean} [params.userDismissedQuestion]
 * @returns {"celebration" | "completion_question" | "action_ready"}
 */
export function decideCancelTopCard({
  celebrating = false,
  hasReturnedFromCancel = false,
  flowStatus = null,
  cancelSessionActive = false,
  userDismissedQuestion = false,
} = {}) {
  if (celebrating || flowStatus === "completed") {
    return "celebration";
  }
  if (!userDismissedQuestion && (flowStatus === "closed" || (cancelSessionActive && hasReturnedFromCancel))) {
    return "completion_question";
  }
  return "action_ready";
}

/**
 * 해지 시 즉각적인 금전적 불이익(잔여일 소멸, 위약금) 경고 여부 확인
 * @param {Object|null} timingAdvice
 * @returns {boolean}
 */
export function hasMoneyRelevantWarning(timingAdvice) {
  if (!timingAdvice) return false;
  return timingAdvice.kind === "immediate_loss" || timingAdvice.kind === "penalty";
}

/**
 * 자동 위치 안내(네이티브 인앱 해지 가이드)를 지원하는 서비스 목록
 */
export const NATIVE_GUIDE_SUPPORTED_SERVICES = ["netflix", "youtube", "naverplus", "naver"];

/**
 * 특정 서비스가 네이티브 자동 위치 안내를 지원하는지 확인
 * @param {string} serviceId
 * @returns {boolean}
 */
export function isNativeGuideSupported(serviceId) {
  if (!serviceId) return false;
  const sid = String(serviceId).toLowerCase().trim();
  return NATIVE_GUIDE_SUPPORTED_SERVICES.some((s) => sid === s || sid.includes(s));
}

/**
 * 해지 안내 문구 결정 순수 함수
 * - Android 네이티브 + 서비스 직접 해지 + 지원 서비스인 경우에만 자동 진행 안내 문구 노출
 * @param {Object} [params]
 * @param {string} [params.serviceId]
 * @param {string} [params.channel]
 * @param {string|boolean} [params.platform] "android" | "ios" | "web" 또는 isAndroid boolean
 * @param {boolean} [params.isNativePlatform] 하위 호환용 (권장: platform === "android")
 * @param {string} [params.targetName]
 * @returns {string}
 */
export function getCancelGuidanceCopy({
  serviceId = "",
  channel = "service",
  platform = "",
  isNativePlatform = false,
  targetName = "",
} = {}) {
  const isDirectService = channel === "service" || !channel;
  const isAndroid =
    platform === "android" ||
    (typeof platform === "boolean" ? platform : false) ||
    (!platform && isNativePlatform && Capacitor.getPlatform() === "android");

  if (isAndroid && isDirectService && isNativeGuideSupported(serviceId)) {
    return "꾸독이 해지 화면까지 데려가요. 마지막 해지 버튼만 직접 눌러 주세요.";
  }
  const entity =
    channel === "google_play"
      ? "Google Play"
      : channel === "app_store"
      ? "Apple"
      : channel === "card_autopay"
      ? "어카운트인포"
      : targetName || "해당 서비스";
  return `꾸독은 비밀번호를 받거나 대신 해지하지 않아요. ${entity} 화면에서 해지가 끝난 걸 확인한 뒤 완료를 눌러주세요.`;
}

/**
 * cancelFlowResult 이벤트 리스너 등록
 * @param {Function} callback
 * @returns {Promise<{ remove: () => void }>}
 */
export async function addCancelFlowListener(callback) {
  if (!Capacitor.isNativePlatform()) {
    return { remove: () => {} };
  }
  try {
    const handle = await NativeCancelBrowser.addListener("cancelFlowResult", (data) => {
      const normalized = normalizeCancelFlowResult(data);
      if (normalized && callback) {
        callback(normalized);
      }
    });
    return handle;
  } catch (err) {
    console.warn("addCancelFlowListener 등록 실패:", err);
    return { remove: () => {} };
  }
}

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
 * 해지 웹뷰 및 브라우저 열기
 * @param {Object} options
 * @param {string} options.serviceId
 * @param {string} options.serviceName
 * @param {string} options.cancelUrl
 * @param {Array} options.guideSteps
 * @param {Function} [onResult] 결과 수신 콜백 (중복 방지 및 정규화됨)
 * @returns {Promise<{ action: 'COMPLETED' | 'CLOSED' | 'FALLBACK_WEB', status?: string }>}
 */
export async function openCancelBrowser(options = {}, onResult = null) {
  if (Capacitor.isNativePlatform()) {
    let settled = false;
    let listenerHandle = null;

    return new Promise(async (resolve) => {
      const deliver = (result) => {
        if (settled) return;
        settled = true;
        if (listenerHandle) {
          try {
            listenerHandle.remove?.();
          } catch (e) {
            // ignore
          }
          listenerHandle = null;
        }
        try {
          onResult?.(result);
        } catch (e) {
          console.warn("openCancelBrowser onResult 콜백 에러:", e);
        }
        resolve(result);
      };

      try {
        try {
          listenerHandle = await NativeCancelBrowser.addListener("cancelFlowResult", (data) => {
            const normalized = normalizeCancelFlowResult(data);
            if (normalized) {
              deliver(normalized);
            }
          });
        } catch (listenerErr) {
          console.warn("cancelFlowResult 리스너 등록 실패:", listenerErr);
        }

        const rawResult = await NativeCancelBrowser.open({
          serviceId: options.serviceId || "",
          serviceName: options.serviceName || "",
          cancelUrl: options.cancelUrl || "",
          guideSteps: options.guideSteps || [],
        });

        const normalized = normalizeCancelFlowResult(rawResult);
        if (normalized) {
          deliver(normalized);
        }
      } catch (err) {
        console.warn("Native CancelBrowser 호출 실패, 웹 모드로 전환:", err);
        if (!settled) {
          if (listenerHandle) {
            listenerHandle.remove?.();
            listenerHandle = null;
          }
          settled = true;
          resolve({ action: "FALLBACK_WEB" });
        }
      }
    });
  }

  // 웹 플랫폼 또는 플러그인 폴백
  return { action: "FALLBACK_WEB" };
}


/**
 * 서비스 및 실행 환경에 따라 자동 해지 감지가 지원되는지 확인
 * - Android 네이티브 + 자동 위치 가이드 지원 서비스(Naver Plus 등)일 때만 true
 * @param {Object} [params]
 * @param {string} [params.serviceId]
 * @param {string|boolean} [params.platform]
 * @param {boolean} [params.isNativePlatform]
 * @returns {boolean}
 */
export function isAutoCancelDetectionAvailable({
  serviceId = "",
  platform = "",
  isNativePlatform = false,
} = {}) {
  const isAndroid =
    platform === "android" ||
    (typeof platform === "boolean" ? platform : false) ||
    (!platform && isNativePlatform && Capacitor.getPlatform() === "android") ||
    (!platform && !isNativePlatform && Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android");

  return Boolean(isAndroid && isNativeGuideSupported(serviceId));
}

/**
 * 수동 완료 버튼 노출 여부 결정
 * - Naver Plus는 Android 네이티브 자동 감지가 동작할 때만 숨기고, 웹/비Android 등 자동 감지 불가 환경에서는 노출
 * @param {Object} [params]
 * @param {string} [params.serviceId]
 * @param {boolean} [params.isNaverPlus]
 * @param {string|boolean} [params.platform]
 * @param {boolean} [params.isNativePlatform]
 * @returns {boolean}
 */
export function canShowManualComplete({
  serviceId = "",
  isNaverPlus = false,
  platform = "",
  isNativePlatform = false,
} = {}) {
  const naver = isNaverPlus || (serviceId && (serviceId === "naverplus" || serviceId === "naver" || String(serviceId).toLowerCase().includes("naver")));
  if (!naver) return true;
  return !isAutoCancelDetectionAvailable({ serviceId: serviceId || "naverplus", platform, isNativePlatform });
}
