import { Capacitor, registerPlugin } from "@capacitor/core";
import { getApiEndpoint } from "./apiBase.js";
import { supabase } from "./supabase.js";

const NativeCancelBrowser = registerPlugin("CancelBrowser");

export const CANCEL_AI_CONSENT_KEY = "submate.cancelAiConsent.v1";

/**
 * AI 해지 도우미(버튼 이름 Google Gemini 전송) 선택 동의 여부 조회
 * - 기본값은 false(미동의)이며 사용자가 명시적으로 켰을 때만 true 반환
 * @param {Storage|null} [storage]
 * @returns {boolean}
 */
export function readCancelAiConsent(storage = null) {
  try {
    const store = storage || (typeof window !== "undefined" ? window.localStorage : null);
    if (!store) return false;
    const raw = store.getItem(CANCEL_AI_CONSENT_KEY);
    return raw === "granted" || raw === "true";
  } catch {
    return false;
  }
}

/**
 * AI 해지 도우미 선택 동의 상태 저장
 * @param {boolean} granted
 * @param {Storage|null} [storage]
 * @returns {boolean}
 */
export function setCancelAiConsent(granted, storage = null) {
  const next = Boolean(granted);
  try {
    const store = storage || (typeof window !== "undefined" ? window.localStorage : null);
    if (store) {
      store.setItem(CANCEL_AI_CONSENT_KEY, next ? "granted" : "declined");
    }
  } catch {
    // ignore storage errors
  }
  return next;
}

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

        let aiEndpoint = "";
        let aiAuthToken = "";
        const aiAllowed =
          options.aiConsent === true ||
          (options.aiConsent === undefined && readCancelAiConsent());

        if (aiAllowed) {
          try {
            const endpoint = getApiEndpoint("/api/cancel-next-step");
            if (typeof endpoint === "string" && endpoint.startsWith("https://")) {
              aiEndpoint = endpoint;
            }
          } catch {}

          try {
            const sessionRes = await supabase?.auth?.getSession?.();
            aiAuthToken = sessionRes?.data?.session?.access_token || "";
          } catch {
            aiAuthToken = "";
          }
        }

        const rawResult = await NativeCancelBrowser.open({
          serviceId: options.serviceId || "",
          serviceName: options.serviceName || "",
          cancelUrl: options.cancelUrl || "",
          guideSteps: options.guideSteps || [],
          aiEndpoint,
          aiAuthToken,
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

const SERVICE_STEP_VISUALS = {
  naverplus: {
    brandLabel: "NAVER+",
    brandColor: "#03C75A",
    steps: {
      1: {
        screen: "마이 멤버십",
        action: "설정 ⚙",
        note: "오른쪽 위",
        where: "마이 멤버십 오른쪽 위 설정(⚙)",
        dialogue: "로그인이 필요하면 먼저 로그인해 주세요. 마이 멤버십이 열리면 오른쪽 위 [설정]을 누르면 돼요.",
        tip: "네이버 공식 안내도 이 화면에서 시작해요.",
      },
      2: {
        screen: "멤버십 설정",
        action: "네이버플러스 멤버십 관리",
        note: "관리 메뉴",
        where: "설정 > 네이버플러스 멤버십 관리",
        dialogue: "설정 화면에서 [네이버플러스 멤버십 관리]를 눌러 주세요.",
        tip: "프로필이나 계정 설정 대신 '네이버플러스 멤버십 관리'를 고르세요.",
      },
      3: {
        screen: "멤버십 관리",
        action: "네이버플러스 멤버십 해지하기",
        note: "해지 화면으로 이동",
        where: "멤버십 관리 > 해지하기",
        dialogue: "[네이버플러스 멤버십 해지하기]를 눌러 다음 화면으로 넘어가 주세요.",
        tip: "이 단계에서는 아직 해지되지 않아요.",
      },
      4: {
        screen: "이번 이용 기간 확인",
        action: "정기결제 해지",
        note: "다음 결제부터 중단",
        where: "멤버십 해지 화면",
        dialogue: "이번 이용 기간을 확인하고 [정기결제 해지]를 눌러 주세요.",
        tip: "다음 결제부터 멈추려면 '멤버십 즉시 종료' 대신 '정기결제 해지'를 고르세요.",
      },
      5: {
        screen: "최종 확인",
        action: "해지하기",
        note: "직접 누르기",
        where: "최종 확인 > 해지하기",
        dialogue: "마지막 [해지하기]를 누르면 실제로 해지돼요. 내용을 확인하고 직접 눌러 주세요.",
        tip: "꾸독이 해지 화면까지 데려가요. 마지막 해지 버튼만 직접 눌러 주세요.",
        userMustTap: true,
      },
    },
  },
  netflix: {
    brandLabel: "NETFLIX",
    brandColor: "#E50914",
    steps: {
      1: {
        screen: "넷플릭스 로그인 · 계정",
        action: "해지 페이지(cancelplan) 열기",
        note: "로그인 후 자동 이동",
        where: "netflix.com/cancelplan",
        dialogue: "넷플릭스에 로그인하면 멤버십 해지 확인 화면으로 바로 이동해요.",
        tip: "프로필 잠금이 있다면 기본 프로필을 선택해 주세요.",
      },
      2: {
        screen: "멤버십 관리",
        action: "멤버십 해지",
        note: "해지 절차 시작",
        where: "계정 > 멤버십 및 결제 > 멤버십 해지",
        dialogue: "멤버십 상세 영역에서 [멤버십 해지] 버튼을 눌러 주세요.",
        tip: "버튼이 보이지 않으면 앱스토어나 통신사 결합 상품인지 확인해 주세요.",
      },
      3: {
        screen: "해지 최종 확인",
        action: "해지 완료 (Finish Cancellation)",
        note: "직접 누르기",
        where: "최종 확인 > 해지 완료",
        dialogue: "마지막 [해지 완료] 버튼을 직접 누르면 해지가 확정돼요.",
        tip: "해지해도 이번 결제 주기 끝까지 계속 시청할 수 있어요.",
        userMustTap: true,
      },
    },
  },
  youtube: {
    brandLabel: "YouTube",
    brandColor: "#FF0000",
    steps: {
      1: {
        screen: "유료 멤버십 (paid_memberships)",
        action: "Google 계정 로그인",
        note: "결제한 계정 확인",
        where: "youtube.com/paid_memberships",
        dialogue: "유튜브 프리미엄을 결제 중인 Google 계정으로 로그인해 주세요.",
        tip: "목록에 멤버십이 없다면 오른쪽 위 프로필에서 다른 계정을 확인해 보세요.",
      },
      2: {
        screen: "유료 멤버십 목록",
        action: "멤버십 관리",
        note: "상세 설정 열기",
        where: "유료 멤버십 > 멤버십 관리",
        dialogue: "이용 중인 멤버십 카드에서 [멤버십 관리]를 눌러 주세요.",
        tip: "결제 수단과 다음 결제일이 함께 표시돼요.",
      },
      3: {
        screen: "멤버십 상세",
        action: "비활성화 → 그대로 취소",
        note: "일시중지 건너뛰기",
        where: "멤버십 관리 > 비활성화",
        dialogue: "[비활성화]를 누른 뒤 일시중지 제안이 나오면 [그대로 취소]를 선택해 주세요.",
        tip: "잠시 쉬고 싶다면 해지 대신 최대 6개월 일시중지를 고를 수도 있어요.",
      },
      4: {
        screen: "취소 사유 및 최종 확인",
        action: "다음 → 취소 (해지 확인)",
        note: "직접 누르기",
        where: "최종 확인 > 취소",
        dialogue: "취소 사유를 고르고 마지막 [취소] 버튼을 직접 눌러 마무리해 주세요.",
        tip: "해지 후에도 남은 결제 기간 끝까지 프리미엄 혜택이 유지돼요.",
        userMustTap: true,
      },
    },
  },
};

/**
 * 단계별 시각 가이드 메타데이터 반환
 */
export function getStepVisualMeta({
  serviceId = "",
  serviceName = "",
  stepNumber = 1,
  totalSteps = 1,
  step = null,
} = {}) {
  const sid = String(serviceId || "").toLowerCase().trim();
  const sname = String(serviceName || "").toLowerCase().trim();
  let key = null;
  if (sid === "naverplus" || sid === "naver" || sname.includes("네이버플러스")) {
    key = "naverplus";
  } else if (sid.includes("netflix") || sname.includes("넷플릭스") || sname.includes("netflix")) {
    key = "netflix";
  } else if (sid.includes("youtube") || sid.includes("ytmusic") || sname.includes("유튜브") || sname.includes("youtube")) {
    key = "youtube";
  }

  const isFinal = stepNumber === totalSteps;
  const presetGroup = key ? SERVICE_STEP_VISUALS[key] : null;
  const preset = presetGroup?.steps?.[stepNumber] || null;

  if (preset) {
    return {
      preset: true,
      brandLabel: presetGroup.brandLabel,
      brandColor: presetGroup.brandColor,
      screen: preset.screen,
      action: preset.action,
      note: preset.note,
      where: preset.where,
      dialogue: preset.dialogue,
      tip: preset.tip,
      userMustTap: Boolean(preset.userMustTap || isFinal),
    };
  }

  const actionText = step?.title || (isFinal ? "해지 최종 확인" : stepNumber + "단계 진행");
  return {
    preset: false,
    brandLabel: serviceName || "서비스",
    brandColor: "#3182F6",
    screen: (serviceName || "서비스") + " (" + stepNumber + "/" + totalSteps + "단계)",
    action: actionText,
    note: isFinal ? "직접 누르기" : "화면 안내 따라가기",
    where: null,
    dialogue: step?.description || "",
    tip: isFinal
      ? "마지막 해지 확정 버튼은 꾸독이 대신 누르지 않아요. 내용을 확인하고 직접 눌러 주세요."
      : null,
    userMustTap: isFinal,
  };
}
