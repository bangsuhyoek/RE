import { detectPaymentChannel } from "./subscriptionAgent.js";
import { getPaymentMethodInfo } from "./paymentMethod.js";
import { CANCEL_CHANNELS, PAYMENT_CHANNEL_IDS } from "./paymentChannels.js";

export { CANCEL_CHANNELS };

// 결제한 곳에 따라 해지를 어디서 해야 하는지 고른다. 모든 경로는 공식 화면을 열 뿐이고, 해지 확정은 사용자가 직접 한다.
// 사용자가 고른 값은 구독의 paymentChannel(서버 subscriptions.payment_channel)에 저장되고, 없으면 결제수단으로 추정한다.

export const GOOGLE_PLAY_SUBSCRIPTIONS_URL = "https://play.google.com/store/account/subscriptions";
export const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";
export const ACCOUNTINFO_CARD_AUTOPAY_URL = "https://www.payinfo.or.kr/cdtrns/inq/qryListCard.do";

const STORE_ROUTES = {
  google_play: {
    kind: "google_play",
    label: "Google Play 구독 관리 열기",
    url: GOOGLE_PLAY_SUBSCRIPTIONS_URL,
    steps: [
      "구독을 결제한 Google 계정인지 확인해요.",
      "목록에서 이 서비스를 고르고 '구독 취소'를 눌러요.",
      "안내에 따라 취소를 확정해요. 남은 기간은 끝날 때까지 쓸 수 있어요.",
    ],
    note: "Google Play로 결제한 구독은 서비스 웹사이트가 아닌 Google Play에서 해지해요.",
    source: "https://developer.android.com/google/play/billing/subscriptions",
  },
  app_store: {
    kind: "app_store",
    label: "Apple 구독 관리 열기",
    url: APPLE_SUBSCRIPTIONS_URL,
    steps: [
      "구독을 결제한 Apple 계정으로 로그인해요.",
      "목록에서 이 서비스를 고르고 '구독 취소'를 눌러요.",
      "iPhone에서는 설정 → 내 이름 → 구독에서도 할 수 있어요.",
    ],
    note: "App Store로 결제한 구독은 Apple에서 해지해요.",
    source: "https://support.apple.com/en-us/118428",
  },
};

const ACCOUNTINFO_ROUTE = {
  kind: "card_autopay",
  label: "어카운트인포에서 카드 자동납부 해지",
  url: ACCOUNTINFO_CARD_AUTOPAY_URL,
  steps: [
    "본인인증 후 '카드자동납부 조회'에서 이 요금을 찾아요.",
    "해지할 항목을 골라 해지를 신청해요.",
    "요금을 받는 회사에도 해지 의사를 남겨요. 카드 연결만 끊으면 계약은 남아 미납이 생길 수 있어요.",
  ],
  note: "카드사에 등록된 자동납부(통신·보험·렌탈 등)를 한 곳에서 해지해요. 해지는 영업일 09:00~22:00에만 돼요. 새로 등록한 자동납부는 다음 영업일부터 보여요.",
  source: "https://www.payinfo.or.kr/guide/useguideCdtrns2.do",
};

const CARD_BRANDS = new Set(["card", "shinhan", "hyundai", "kb", "samsung", "lotte", "woori", "hana", "bc", "nh"]);

export function resolvePaymentChannel(subscription = {}) {
  if (PAYMENT_CHANNEL_IDS.includes(subscription.paymentChannel)) return subscription.paymentChannel;
  return detectPaymentChannel(subscription);
}

const isCardPayment = (subscription) => {
  const info = getPaymentMethodInfo(subscription?.paymentMethod);
  return info.isRegistered && CARD_BRANDS.has(info.brand);
};

// primary: 해지 버튼이 먼저 여는 곳. secondary: 함께 보여줄 다른 길.
export function getCancelRoutes(subscription = {}, { serviceCancelUrl = "" } = {}) {
  const channel = resolvePaymentChannel(subscription);
  const serviceRoute = {
    kind: "service",
    label: "해지 페이지 열기",
    url: serviceCancelUrl || subscription.cancelUrl || "",
  };

  if (channel === "google_play" || channel === "app_store") {
    return { channel, primary: STORE_ROUTES[channel], secondary: [] };
  }
  if (channel === "card_autopay") {
    return { channel, primary: ACCOUNTINFO_ROUTE, secondary: [{ ...serviceRoute, label: "요금 받는 회사 해지 페이지 열기" }] };
  }
  const secondary = isCardPayment(subscription)
    ? [{ ...ACCOUNTINFO_ROUTE, label: "카드 자동납부로 등록된 요금이면 어카운트인포에서 해지" }]
    : [];
  return {
    channel,
    primary: serviceRoute,
    secondary,
    note: channel === "carrier" ? "휴대폰 요금으로 결제했다면 서비스에서 해지한 뒤, 결제가 계속되면 통신사 고객센터(114)에 알려요." : null,
  };
}

// 상세 화면처럼 바로 해지 페이지를 띄워도 되는지 판단한다. 스토어·어카운트인포는 안내를 먼저 보여준다.
export function shouldAutoOpenServicePage(subscription = {}) {
  return getCancelRoutes(subscription).primary.kind === "service";
}
