import { registerPlugin } from "@capacitor/core";
import { isNativePlatform } from "./platform.js";
import {
  readUserConsent,
  setUserConsent,
  revokeUserConsent,
} from "./consentStore.js";

export const PaymentCapture = registerPlugin("PaymentCapture", {
  web: {
    checkPermission: async () => ({ hasPermission: false, isSupported: false }),
    requestPermission: async () => ({ status: "UNSUPPORTED" }),
    simulatePayment: async (options) => {
      console.log("[PaymentCapture Web Mock] Simulate payment:", options);
      return { detected: true, serviceName: options?.serviceName || "Netflix", amount: options?.amount || 17000 };
    },
    scanInstalledApps: async () => ({ apps: [], count: 0, isSupported: false }),
    scanActiveNotifications: async () => ({ items: [], count: 0, isSupported: false }),
    getCaptureSourceSettings: async () => ({ messaging: false, messenger: false, email: false }),
    setCaptureSourceSettings: async (settings) => ({
      success: true,
      messaging: Boolean(settings?.messaging),
      messenger: Boolean(settings?.messenger),
      email: Boolean(settings?.email),
    }),
  },
});

export const PAYMENT_CAPTURE_CONSENT_KIND = "payment_capture";

/**
 * 결제 알림 감지 사전 고지 동의 여부 조회
 * @param {Storage|null} [storage]
 * @param {string|null} [userId]
 * @returns {boolean}
 */
export function readPaymentCaptureConsent(storage = null, userId = null) {
  return readUserConsent(userId, PAYMENT_CAPTURE_CONSENT_KIND, storage);
}

/**
 * 결제 알림 감지 사전 고지 동의 상태 저장
 * @param {boolean} granted
 * @param {Storage|null} [storage]
 * @param {string|null} [userId]
 * @returns {boolean}
 */
export function setPaymentCaptureConsent(granted, storage = null, userId = null) {
  return setUserConsent(userId, PAYMENT_CAPTURE_CONSENT_KIND, granted, {}, storage);
}

/**
 * 결제 알림 감지 사전 고지 동의 철회
 * @param {Storage|null} [storage]
 * @param {string|null} [userId]
 */
export function revokePaymentCaptureConsent(storage = null, userId = null) {
  revokeUserConsent(userId, PAYMENT_CAPTURE_CONSENT_KIND, storage);
}

/**
 * 사전 동의 여부를 확인하고 게이팅(gating)하여 권한 설정을 요청하는 함수
 * - 동의가 확인된 경우에만 requestPaymentCapturePermission()을 호출합니다.
 * - 동의가 없는 경우 onRequireDisclosure 콜백을 실행하거나 거부 상태를 반환합니다.
 *
 * @param {object} [options]
 * @param {string|null} [options.userId]
 * @param {Storage|null} [options.storage]
 * @param {Function} [options.onRequireDisclosure]
 * @returns {Promise<{ status: string }>}
 */
export async function gatedRequestPaymentCapturePermission({
  userId = null,
  storage = null,
  onRequireDisclosure = null,
} = {}) {
  const hasConsent = readPaymentCaptureConsent(storage, userId);
  if (!hasConsent) {
    if (typeof onRequireDisclosure === "function") {
      onRequireDisclosure();
      return { status: "DISCLOSURE_REQUIRED" };
    }
    return { status: "CONSENT_REQUIRED" };
  }
  return await requestPaymentCapturePermission();
}

export async function checkPaymentCapturePermission() {
  if (!isNativePlatform()) {
    return { hasPermission: false, isSupported: false };
  }
  try {
    const res = await PaymentCapture.checkPermission();
    return { hasPermission: Boolean(res?.hasPermission), isSupported: true };
  } catch (err) {
    console.warn("checkPaymentCapturePermission error:", err);
    return { hasPermission: false, isSupported: false };
  }
}

export async function requestPaymentCapturePermission() {
  if (!isNativePlatform()) {
    return { status: "UNSUPPORTED" };
  }
  try {
    return await PaymentCapture.requestPermission();
  } catch (err) {
    console.warn("requestPaymentCapturePermission error:", err);
    return { status: "ERROR" };
  }
}

export async function simulatePaymentDetection(payload = {}) {
  try {
    return await PaymentCapture.simulatePayment(payload);
  } catch (err) {
    console.warn("simulatePaymentDetection error:", err);
    return { detected: false };
  }
}

export async function scanInstalledSubscriptionApps() {
  if (!isNativePlatform()) {
    return { apps: [], count: 0, isSupported: false };
  }
  try {
    const res = await PaymentCapture.scanInstalledApps();
    return {
      apps: Array.isArray(res?.apps) ? res.apps : [],
      count: Number(res?.count) || 0,
      isSupported: true,
    };
  } catch (err) {
    console.warn("scanInstalledSubscriptionApps error:", err);
    return { apps: [], count: 0, isSupported: false };
  }
}

export async function scanActivePaymentNotifications() {
  if (!isNativePlatform()) {
    return { items: [], count: 0, isSupported: false };
  }
  try {
    const res = await PaymentCapture.scanActiveNotifications();
    return {
      items: Array.isArray(res?.items) ? res.items : [],
      count: Number(res?.count) || 0,
      isSupported: true,
    };
  } catch (err) {
    console.warn("scanActivePaymentNotifications error:", err);
    return { items: [], count: 0, isSupported: false };
  }
}

export const CAPTURE_SETTINGS_STORAGE_KEY = "submate.paymentCaptureSettings.v1";

export function readCaptureSourceSettingsLocal() {
  if (typeof window === "undefined" || !window.localStorage) {
    return { messaging: false, messenger: false, email: false };
  }
  try {
    const raw = window.localStorage.getItem(CAPTURE_SETTINGS_STORAGE_KEY);
    if (!raw) return { messaging: false, messenger: false, email: false };
    const parsed = JSON.parse(raw);
    return {
      messaging: Boolean(parsed?.messaging),
      messenger: Boolean(parsed?.messenger),
      email: Boolean(parsed?.email),
    };
  } catch {
    return { messaging: false, messenger: false, email: false };
  }
}

export function writeCaptureSourceSettingsLocal(settings) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const val = {
      messaging: Boolean(settings?.messaging),
      messenger: Boolean(settings?.messenger),
      email: Boolean(settings?.email),
    };
    window.localStorage.setItem(CAPTURE_SETTINGS_STORAGE_KEY, JSON.stringify(val));
  } catch {
    /* storage write fallback */
  }
}

export async function getCaptureSourceSettings() {
  if (!isNativePlatform()) {
    return readCaptureSourceSettingsLocal();
  }
  try {
    const res = await PaymentCapture.getCaptureSourceSettings();
    const settings = {
      messaging: Boolean(res?.messaging),
      messenger: Boolean(res?.messenger),
      email: Boolean(res?.email),
    };
    writeCaptureSourceSettingsLocal(settings);
    return settings;
  } catch (err) {
    console.warn("getCaptureSourceSettings error:", err);
    return readCaptureSourceSettingsLocal();
  }
}

export async function setCaptureSourceSettings(settings = {}) {
  const payload = {
    messaging: Boolean(settings.messaging),
    messenger: Boolean(settings.messenger),
    email: Boolean(settings.email),
  };
  writeCaptureSourceSettingsLocal(payload);
  if (!isNativePlatform()) {
    return { success: true, ...payload };
  }
  try {
    const res = await PaymentCapture.setCaptureSourceSettings(payload);
    return {
      success: Boolean(res?.success),
      messaging: Boolean(res?.messaging),
      messenger: Boolean(res?.messenger),
      email: Boolean(res?.email),
    };
  } catch (err) {
    console.warn("setCaptureSourceSettings error:", err);
    return { success: false, ...payload };
  }
}
