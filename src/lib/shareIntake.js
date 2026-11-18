import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  parseReceiptText,
  isCancellationDocument,
  isOneTimeStoreReceipt,
  VERIFICATION_CHARGE_PATTERN,
} from "../../api/_lib/receiptParser.js";
import { detectTrialText } from "./trialGuard.js";
import { inferServiceByPriceFingerprint, isPgMaskedText, isShoppingPlatformOrder } from "./subscriptionDiscovery.js";

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
  // 환불·크레딧·결제 취소·해지 안내나 카드 인증 결제는 빠른 등록 초안으로 만들지 않는다.
  // 앱스토어 단건 구매(게임 아이템·웹툰 쿠키 등) 영수증도 구독이 아니다.
  if (
    isCancellationDocument(text) ||
    isOneTimeStoreReceipt(text) ||
    VERIFICATION_CHARGE_PATTERN.test(String(text || ""))
  ) {
    return null;
  }
  const parsed = parseReceiptText(text);
  const trial = detectTrialText(text, now);
  if (!parsed.ok) return null;
  const data = parsed.data || {};
  if (!data.name && !data.amount) return null;
  // 쿠팡 주문 영수증처럼 쇼핑 겸용 플랫폼의 일반 주문은 멤버십 구독 초안으로 만들지 않는다.
  if (isShoppingPlatformOrder(data.serviceId, data.amount, text)) return null;
  // '구글플레이 14,900원'처럼 PG사/인앱결제로만 적혀 서비스명이 비어 있을 때만 가격 지문으로 역추적한다.
  // 이름 모를 서비스의 영수증(예: 체험 종료 안내 20,250원)을 같은 가격의 다른 서비스로 바꾸지 않기 위해서다.
  const fingerprint =
    !data.serviceId && !data.name && Number(data.amount) > 0 && isPgMaskedText(text)
      ? inferServiceByPriceFingerprint(Number(data.amount))
      : null;
  // 무료체험 가입 문자면 체험이 끝나는 날을 결제일로 두고 체험 중으로 등록한다(무료체험 가드).
  const dueDay = trial.trialEndsOn ? trial.trialEndsOn.getDate() : Number(data.dueDay);
  return {
    name: data.name || fingerprint?.name || "",
    amount: Number(data.amount) || 0,
    plan: data.plan || fingerprint?.defaultPlan || "",
    paymentMethod: data.paymentMethod || "",
    serviceId: data.serviceId || fingerprint?.id || "",
    category: fingerprint?.category || "기타",
    dueDay: dueDay >= 1 && dueDay <= 31 ? dueDay : now.getDate(),
    billingCycle: data.billingCycle || "매월",
    sourceType: "sms",
    autoDetected: true,
    detectedAt: now.toISOString(),
    ...(trial.isTrial ? { isTrial: true, status: "trial" } : {}),
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
