import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * 본인 확인
 * - Android 앱: 지문·얼굴 또는 기기 잠금(PIN·패턴)으로 확인한다. 꾸독은 생체 정보를 받지 않고 성공 여부만 받는다.
 * - 웹: 생체인증을 쓸 수 없어 화면의 확인 버튼을 누른 것을 본인 확인으로 기록한다(web_confirm).
 */
const DeviceAuth = registerPlugin("DeviceAuth");

export const canUseDeviceAuth = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export async function confirmUserPresence({ title, subtitle = "" }) {
  if (!canUseDeviceAuth()) return { ok: true, method: "web_confirm" };
  try {
    const result = await DeviceAuth.authenticate({ title, subtitle });
    if (result?.verified) return { ok: true, method: result.method === "biometric" ? "biometric" : "device_credential" };
    return { ok: false, reason: result?.reason || "failed" };
  } catch (error) {
    console.warn("DeviceAuth error:", error);
    return { ok: false, reason: "error" };
  }
}
