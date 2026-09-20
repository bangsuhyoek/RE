import { registerPlugin } from "@capacitor/core";
import { isNativePlatform } from "./platform.js";
import { detectPaymentNotification, PaymentDecision } from "../features/payment/paymentDetection.js";

export const PaymentCapture = registerPlugin("PaymentCapture", {
  web: {
    checkPermission: async () => ({ hasPermission: false, isSupported: false }),
    requestPermission: async () => ({ status: "UNSUPPORTED" }),
    simulatePayment: async (options = {}) => {
      const result = detectPaymentNotification({
        packageName: options.packageName || options.package || "",
        title: options.title || "",
        body: options.body || "",
        receivedAt: options.receivedAt || new Date().toISOString(),
      });
      return result.decision === PaymentDecision.MATCH
        ? { detected: true, ...result.candidate, rawEvent: result.rawEvent }
        : { detected: false, reasonCode: result.reasonCode, rawEvent: result.rawEvent };
    },
  },
});

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
