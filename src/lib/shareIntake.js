import { Capacitor, registerPlugin } from "@capacitor/core";
import { parseReceiptText } from "../../api/_lib/receiptParser.js";

// 다른 앱의 '공유'로 받은 결제 문자·영수증 캡처를 등록 흐름에 넘긴다. 사용자가 고른 내용만 받으므로 권한이 필요 없다.
export const SystemIntents = registerPlugin("SystemIntents");

export const SHARE_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export async function consumePendingShare() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const shared = await SystemIntents.getPending();
    return shared?.type ? shared : null;
  } catch (err) {
    console.warn("SystemIntents.getPending 실패:", err);
    return null;
  }
}

export function listenForShares(onShare) {
  if (!Capacitor.isNativePlatform()) return () => {};
  const handlePromise = SystemIntents.addListener("shareReceived", (shared) => {
    if (shared?.type) onShare(shared);
  });
  return () => {
    handlePromise.then((handle) => handle?.remove?.()).catch(() => {});
  };
}

// 공유받은 글을 기기 안에서 파싱해 빠른 등록 초안으로 바꾼다. 서비스명과 금액을 모두 못 찾으면 null.
export function sharedTextToDetected(text, now = new Date()) {
  const parsed = parseReceiptText(text);
  if (!parsed.ok) return null;
  const data = parsed.data || {};
  if (!data.name && !data.amount) return null;
  const dueDay = Number(data.dueDay);
  return {
    name: data.name || "",
    amount: Number(data.amount) || 0,
    plan: data.plan || "",
    paymentMethod: data.paymentMethod || "",
    serviceId: data.serviceId || "",
    category: "기타",
    dueDay: dueDay >= 1 && dueDay <= 31 ? dueDay : now.getDate(),
    billingCycle: data.billingCycle || "매월",
    sourceType: "sms",
    autoDetected: true,
    detectedAt: now.toISOString(),
  };
}

export function sharedImageToFile(shared) {
  const mimeType = String(shared?.mimeType || "").toLowerCase();
  if (!SHARE_IMAGE_TYPES.has(mimeType) || !shared?.base64) return null;
  const binary = atob(shared.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const extension = mimeType.split("/")[1] === "jpeg" || mimeType === "image/jpg" ? "jpg" : mimeType.split("/")[1];
  return new File([bytes], "shared-receipt." + extension, { type: mimeType === "image/jpg" ? "image/jpeg" : mimeType });
}
