import test from "node:test";
import assert from "node:assert/strict";
import {
  ACCOUNTINFO_CARD_AUTOPAY_URL,
  APPLE_SUBSCRIPTIONS_URL,
  GOOGLE_PLAY_SUBSCRIPTIONS_URL,
  getCancelRoutes,
  resolvePaymentChannel,
  shouldAutoOpenServicePage,
} from "../src/lib/cancelRoutes.js";

test("Google Play로 결제한 구독은 Google Play 구독 목록을 먼저 연다", () => {
  const routes = getCancelRoutes({ id: "youtube", paymentMethod: "Google Play 결제" }, { serviceCancelUrl: "https://youtube.com/paid_memberships" });
  assert.equal(routes.channel, "google_play");
  assert.equal(routes.primary.url, GOOGLE_PLAY_SUBSCRIPTIONS_URL);
  assert.equal(shouldAutoOpenServicePage({ id: "youtube", paymentMethod: "Google Play 결제" }), false);
});

test("Apple이 청구하는 구독과 App Store 결제는 Apple 구독 관리로 보낸다", () => {
  assert.equal(getCancelRoutes({ id: "icloud" }, {}).primary.url, APPLE_SUBSCRIPTIONS_URL);
  assert.equal(getCancelRoutes({ id: "x", paymentMethod: "App Store" }, {}).primary.kind, "app_store");
});

test("카드로 결제한 웹 구독은 서비스 해지 페이지가 먼저고, 어카운트인포를 함께 보여준다", () => {
  const routes = getCancelRoutes({ id: "netflix", paymentMethod: "신한카드 ****4521" }, { serviceCancelUrl: "https://www.netflix.com/cancelplan" });
  assert.equal(routes.primary.kind, "service");
  assert.equal(routes.primary.url, "https://www.netflix.com/cancelplan");
  assert.deepEqual(routes.secondary.map((route) => route.kind), ["card_autopay"]);
  assert.equal(shouldAutoOpenServicePage({ id: "netflix", paymentMethod: "신한카드" }), true);
});

test("간편결제·결제수단 미등록이면 어카운트인포를 권하지 않는다", () => {
  assert.equal(getCancelRoutes({ id: "netflix", paymentMethod: "카카오페이" }, {}).secondary.length, 0);
  assert.equal(getCancelRoutes({ id: "netflix", paymentMethod: "" }, {}).secondary.length, 0);
});

test("사용자가 카드 자동납부로 고르면 어카운트인포가 먼저고 요금 받는 회사 해지도 남긴다", () => {
  const subscription = { subscriptionId: "sub-1", id: "kt", paymentMethod: "현대카드", paymentChannel: "card_autopay" };
  assert.equal(resolvePaymentChannel(subscription), "card_autopay");
  const routes = getCancelRoutes(subscription, { serviceCancelUrl: "https://example.com/cancel" });
  assert.equal(routes.primary.url, ACCOUNTINFO_CARD_AUTOPAY_URL);
  assert.equal(routes.secondary[0].kind, "service");
  assert.equal(routes.secondary[0].url, "https://example.com/cancel");
});

test("모르는 결제 경로 값은 무시하고 결제수단으로 판단한다", () => {
  assert.equal(resolvePaymentChannel({ subscriptionId: "s", paymentMethod: "Google Play", paymentChannel: "bank_magic" }), "google_play");
});

test("휴대폰 요금 결제는 서비스 해지 후 통신사 안내를 붙인다", () => {
  const routes = getCancelRoutes({ id: "x", paymentMethod: "SKT 휴대폰 결제" }, {});
  assert.equal(routes.channel, "carrier");
  assert.match(routes.note, /114/);
});
