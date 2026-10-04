import { Capacitor } from "@capacitor/core";
import { SystemIntents } from "./shareIntake.js";

// 글을 다른 앱(카카오톡·문자 등)으로 보낸다. Android는 시스템 공유 창, 웹은 Web Share API, 안 되면 클립보드에 복사한다.
export async function shareText({ title = "", text = "" }) {
  if (!text) return { ok: false, method: "none" };
  if (Capacitor.isNativePlatform()) {
    try {
      await SystemIntents.shareText({ title, text });
      return { ok: true, method: "intent" };
    } catch (err) {
      console.warn("shareText 실패:", err);
    }
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text });
      return { ok: true, method: "web-share" };
    } catch (err) {
      if (err?.name === "AbortError") return { ok: false, method: "cancelled" };
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true, method: "clipboard" };
  } catch {
    return { ok: false, method: "none" };
  }
}

