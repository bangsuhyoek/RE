import { Capacitor } from "@capacitor/core";
import { SystemIntents } from "./shareIntake.js";
import { PAYMENT_RAILS } from "../data/paymentRails.js";
import { getPaymentMethodInfo } from "./paymentMethod.js";
import { resolvePaymentChannel } from "./cancelRoutes.js";

export const CARRIER_OPTIONS = [
  { id: "skt", name: "SKT (T world)", rail: PAYMENT_RAILS.skt },
  { id: "kt", name: "KT (마이케이티)", rail: PAYMENT_RAILS.kt },
  { id: "lguplus", name: "LG U+ (당신의 U+)", rail: PAYMENT_RAILS.lguplus },
];

export const WARNING_MESSAGE =
  "결제만 막으면 계약은 남아 있어 미납·연체가 생길 수 있어요. 2단계까지 꼭 진행해 주세요.";

/**
 * Returns open URL depending on platform:
 * - android: intent://#Intent;package=<pkg>;S.browser_fallback_url=<encoded play url>;end
 * - ios: iosAppStoreUrl
 * - web: webUrl or helpUrl
 */

/**
 * 결제 경로 앱 열기
 * - native android: SystemIntents.openApp({ package, fallbackUrl }) 호출
 * - iOS: App Store URL 열기
 * - web: webUrl 또는 helpUrl 열기
 */
export async function openRailApp(rail, { platform = null, isNative = null } = {}) {
  if (!rail) return { status: "NO_RAIL" };
  const p = String(platform || (typeof Capacitor !== "undefined" && Capacitor.getPlatform ? Capacitor.getPlatform() : "web")).toLowerCase();
  const native = isNative !== null
    ? Boolean(isNative)
    : (typeof Capacitor !== "undefined" && Capacitor.isNativePlatform ? Capacitor.isNativePlatform() : (p === "android" || p === "ios"));

  if (native && p === "android" && rail.androidPackage) {
    const fallbackUrl = "https://play.google.com/store/apps/details?id=" + rail.androidPackage;
    try {
      const res = await SystemIntents.openApp({
        package: rail.androidPackage,
        fallbackUrl,
      });
      return res || { status: "LAUNCHED" };
    } catch (err) {
      if (typeof window !== "undefined") {
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      }
      return { status: "FALLBACK_OPENED", error: err?.message };
    }
  }

  if (p === "ios" && rail.iosAppStoreUrl) {
    if (typeof window !== "undefined") {
      window.open(rail.iosAppStoreUrl, "_blank", "noopener,noreferrer");
    }
    return { status: "IOS_APPSTORE_OPENED", url: rail.iosAppStoreUrl };
  }

  const webUrl = rail.webUrl || rail.helpUrl || "";
  if (webUrl && typeof window !== "undefined") {
    window.open(webUrl, "_blank", "noopener,noreferrer");
  }
  return { status: "WEB_OPENED", url: webUrl };
}

export function getRailOpenUrl(rail, platform = "web") {
  if (!rail) return "";
  const p = String(platform || "").toLowerCase();

  if (p === "android" && rail.androidPackage) {
    const playUrl = "https://play.google.com/store/apps/details?id=" + rail.androidPackage;
    return "intent://#Intent;package=" + rail.androidPackage + ";S.browser_fallback_url=" + encodeURIComponent(playUrl) + ";end";
  }

  if (p === "ios" && rail.iosAppStoreUrl) {
    return rail.iosAppStoreUrl;
  }

  return rail.webUrl || rail.helpUrl || "";
}

/**
 * Detect carrier ID ('skt' | 'kt' | 'lguplus' | null) from text
 */
export function detectCarrierId(text = "") {
  const raw = String(text || "").trim().toLowerCase().replace(/\s+/g, "");
  if (/skt|sk텔레콤|tworld|티월드/.test(raw)) return "skt";
  if (/kt|케이티|olleh|올레|마이케이티/.test(raw)) return "kt";
  if (/lgu\+|lguplus|lg유플러스|유플러스|당신의u\+/.test(raw)) return "lguplus";
  return null;
}

/**
 * Generates a two-step rail cancellation plan
 * @param {Object} options
 * @param {Object} options.subscription
 * @param {string} [options.channel]
 * @param {string} [options.serviceCancelUrl]
 * @param {string} [options.platform]
 * @returns {Object|null}
 */
export function getRailCancelPlan({ subscription = {}, channel: rawChannel, serviceCancelUrl = "", platform = "web" } = {}) {
  const channel = rawChannel || resolvePaymentChannel(subscription);
  const serviceUrl = serviceCancelUrl || subscription.cancelUrl || "";

  // Explicit channel choice wins
  // Store channels are handled by store management, not rail cancellation
  if (channel === "google_play" || channel === "app_store") {
    return null;
  }

  // Card autopay channel is handled by AccountInfoRoute in CancelModal
  if (channel === "card_autopay") {
    return null;
  }

  // Carrier channel
  if (channel === "carrier") {
    const carrierId = detectCarrierId(subscription.paymentMethod) || detectCarrierId(subscription.name);
    const rail = carrierId ? PAYMENT_RAILS[carrierId] : null;

    let actions = [];
    let steps = [];
    let effect = "";
    let checkedAt = "2026-10-16";

    if (rail) {
      const openUrl = getRailOpenUrl(rail, platform);
      if (openUrl) {
        actions.push({
          label: platform === "android" || platform === "ios" ? rail.name + " 앱 열기" : rail.name + " 관리 바로가기",
          url: openUrl,
        });
      }
      if (rail.webUrl && openUrl !== rail.webUrl) {
        actions.push({
          label: "웹에서 관리",
          url: rail.webUrl,
        });
      }
      steps = rail.menuPath;
      effect = rail.contractEffect;
      checkedAt = rail.checkedAt;
    } else {
      steps = [
        "이용 중인 통신사(SKT, KT, LG U+) 고객센터 앱 또는 웹사이트에 접속해요.",
        "휴대폰결제/콘텐츠이용료 메뉴에서 결제 차단 또는 이용제한을 설정해요.",
        "통신사 제휴 부가서비스로 가입한 상품이라면 부가서비스 해지를 진행해요.",
      ];
      effect = "휴대폰결제 차단은 결제만 막는 것이며, 서비스 계약은 서비스에서 직접 해지해야 미납을 막을 수 있어요.";
    }

    return {
      rail,
      carrierOptions: rail ? null : CARRIER_OPTIONS,
      blockStep: {
        title: rail ? "1단계: " + rail.name + " 결제 차단" : "1단계: 통신사 결제 차단",
        steps,
        actions,
        effect,
      },
      contractStep: {
        title: "2단계: " + (subscription.name || "서비스") + " 계약 해지",
        steps: [
          (subscription.name || "서비스") + " 웹사이트 또는 앱의 계정/구독 설정으로 이동해요.",
          "구독 관리 메뉴에서 '해지' 또는 '구독 취소'를 신청해요.",
          "해지 신청 완료 메시지와 남은 이용 기간을 확인해요.",
        ],
        url: serviceUrl,
      },
      warning: WARNING_MESSAGE,
      checkedAt,
    };
  }

  // Only channel "web" (or unknown) uses the simple-pay brand
  if (channel === "web" || !channel) {
  // Check simple pay brand from paymentMethod
  const methodInfo = getPaymentMethodInfo(subscription.paymentMethod);
  const brand = methodInfo?.brand;

  if (brand && PAYMENT_RAILS[brand]) {
    const rail = PAYMENT_RAILS[brand];
    const openUrl = getRailOpenUrl(rail, platform);
    const actions = [];
    if (openUrl) {
      actions.push({
        label: platform === "android" || platform === "ios" ? rail.name + " 앱 열기" : rail.name + " 관리 바로가기",
        url: openUrl,
      });
    }
    if (rail.webUrl && openUrl !== rail.webUrl) {
      actions.push({
        label: "웹에서 관리",
        url: rail.webUrl,
      });
    }

    return {
      rail,
      carrierOptions: null,
      blockStep: {
        title: "1단계: " + rail.name + " 자동결제 차단",
        steps: rail.menuPath,
        actions,
        effect: rail.contractEffect,
      },
      contractStep: {
        title: "2단계: " + (subscription.name || "서비스") + " 계약 해지",
        steps: [
          (subscription.name || "서비스") + " 웹사이트 또는 앱의 계정/구독 설정으로 이동해요.",
          "구독 관리 메뉴에서 '해지' 또는 '구독 취소'를 신청해요.",
          "해지 신청 완료 메시지와 위약금/남은 기간 혜택을 확인해요.",
        ],
        url: serviceUrl,
      },
      warning: WARNING_MESSAGE,
      checkedAt: rail.checkedAt,
    };
  }
  }

  // Direct card on web or other standard web channels without simple pay rail
  return null;
}

export default {
  CARRIER_OPTIONS,
  WARNING_MESSAGE,
  getRailOpenUrl,
  detectCarrierId,
  getRailCancelPlan,
  openRailApp,
};
