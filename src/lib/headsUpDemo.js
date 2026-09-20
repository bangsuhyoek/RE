import { Capacitor, registerPlugin } from "@capacitor/core";

const NativeHeadsUpDemo = registerPlugin("HeadsUpDemo");

export async function showHeadsUpDemoOnHome({ title, body, delayMs = 2500 } = {}) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return { scheduled: false, reason: "NATIVE_ANDROID_REQUIRED" };
  }

  try {
    return await NativeHeadsUpDemo.showOnHome({ title, body, delayMs });
  } catch (error) {
    console.warn("Heads-up demo failed:", error);
    return { scheduled: false, reason: "NATIVE_DEMO_FAILED" };
  }
}
