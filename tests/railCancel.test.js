import test from "node:test";
import assert from "node:assert/strict";
import { PAYMENT_RAILS } from "../src/data/paymentRails.js";
import {
  WARNING_MESSAGE,
  detectCarrierId,
  getRailOpenUrl,
  getRailCancelPlan,
  openRailApp,
} from "../src/lib/railCancel.js";

test("PAYMENT_RAILS: data schema and required keys", () => {
  const requiredRails = ["kakaopay", "naverpay", "tosspay", "payco", "skt", "kt", "lguplus"];
  for (const railId of requiredRails) {
    const rail = PAYMENT_RAILS[railId];
    assert.ok(rail, `Missing rail ${railId}`);
    assert.equal(rail.id, railId);
    assert.ok(typeof rail.name === "string" && rail.name.length > 0);
    assert.ok(rail.kind === "simple_pay" || rail.kind === "carrier");
    assert.ok(Array.isArray(rail.menuPath) && rail.menuPath.length >= 3);
    assert.ok(typeof rail.androidPackage === "string" && rail.androidPackage.length > 0);
    assert.ok(typeof rail.iosAppStoreUrl === "string" && rail.iosAppStoreUrl.startsWith("https://apps.apple.com/"));
    assert.ok(typeof rail.contractEffect === "string" && rail.contractEffect.length > 0);
    assert.equal(rail.checkedAt, "2026-10-16");
  }
});

test("detectCarrierId: accurately detects SKT, KT, LGU+ and returns null on unknown", () => {
  assert.equal(detectCarrierId("SKT 통신요금"), "skt");
  assert.equal(detectCarrierId("SK텔레콤 소액결제"), "skt");
  assert.equal(detectCarrierId("T world 결제"), "skt");
  assert.equal(detectCarrierId("KT 휴대폰 결제"), "kt");
  assert.equal(detectCarrierId("마이케이티 콘텐츠이용료"), "kt");
  assert.equal(detectCarrierId("LG U+ 통신과금"), "lguplus");
  assert.equal(detectCarrierId("LG 유플러스"), "lguplus");
  assert.equal(detectCarrierId("당신의 U+"), "lguplus");
  assert.equal(detectCarrierId("신한카드"), null);
  assert.equal(detectCarrierId(""), null);
});

test("getRailOpenUrl: returns intent URL for Android, App Store URL for iOS, webUrl/helpUrl for Web", () => {
  const rail = PAYMENT_RAILS.kakaopay;

  const androidUrl = getRailOpenUrl(rail, "android");
  assert.ok(androidUrl.startsWith("intent://#Intent;package=com.kakaopay.app;S.browser_fallback_url="));
  assert.ok(androidUrl.endsWith(";end"));
  assert.ok(androidUrl.includes(encodeURIComponent("https://play.google.com/store/apps/details?id=com.kakaopay.app")));

  const iosUrl = getRailOpenUrl(rail, "ios");
  assert.equal(iosUrl, rail.iosAppStoreUrl);

  const webUrl = getRailOpenUrl(rail, "web");
  assert.equal(webUrl, rail.webUrl);

  assert.equal(getRailOpenUrl(null, "android"), "");
});

test("getRailCancelPlan: simple pay brand detection (kakaopay, naverpay, tosspay, payco)", () => {
  const simplePays = [
    { method: "카카오페이 머니", id: "kakaopay", name: "카카오페이" },
    { method: "네이버페이 포인트", id: "naverpay", name: "네이버페이" },
    { method: "토스페이 머니", id: "tosspay", name: "토스페이" },
    { method: "PAYCO 간편결제", id: "payco", name: "PAYCO" },
  ];

  for (const item of simplePays) {
    const plan = getRailCancelPlan({
      subscription: { name: "테스트서비스", paymentMethod: item.method, cancelUrl: "https://service.com/cancel" },
    });
    assert.ok(plan, `Plan should exist for ${item.method}`);
    assert.equal(plan.rail.id, item.id);
    assert.equal(plan.carrierOptions, null);
    assert.ok(plan.blockStep.title.includes(item.name));
    assert.ok(plan.blockStep.steps.length >= 3);
    assert.ok(plan.blockStep.actions.length >= 1);
    assert.ok(plan.contractStep.title.includes("테스트서비스"));
    assert.equal(plan.contractStep.url, "https://service.com/cancel");
    assert.equal(plan.warning, WARNING_MESSAGE);
    assert.equal(plan.checkedAt, "2026-10-16");
  }
});

test("getRailCancelPlan: carrier detection when carrier is known vs unknown", () => {
  // Known carrier
  const knownPlan = getRailCancelPlan({
    subscription: { name: "지니뮤직", paymentMethod: "KT 휴대폰 결제" },
    channel: "carrier",
  });
  assert.ok(knownPlan);
  assert.equal(knownPlan.rail.id, "kt");
  assert.equal(knownPlan.carrierOptions, null);
  assert.ok(knownPlan.blockStep.title.includes("KT (마이케이티)"));
  assert.ok(knownPlan.blockStep.actions.length >= 1);

  // Unknown carrier: offers 3 carrier options
  const unknownPlan = getRailCancelPlan({
    subscription: { name: "지니뮤직", paymentMethod: "휴대폰 요금 결제" },
    channel: "carrier",
  });
  assert.ok(unknownPlan);
  assert.equal(unknownPlan.rail, null);
  assert.ok(Array.isArray(unknownPlan.carrierOptions));
  assert.equal(unknownPlan.carrierOptions.length, 3);
  assert.deepEqual(
    unknownPlan.carrierOptions.map((o) => o.id),
    ["skt", "kt", "lguplus"]
  );
  assert.ok(unknownPlan.blockStep.title.includes("통신사 결제 차단"));
});

test("getRailCancelPlan: card_autopay channel returns null (handled by AccountInfoRoute)", () => {
  const plan = getRailCancelPlan({
    subscription: { name: "한국전력", paymentMethod: "신한카드 자동이체" },
    channel: "card_autopay",
  });
  assert.equal(plan, null);
});

test("getRailCancelPlan: explicit channel choice wins over simple-pay brand", () => {
  // If paymentMethod is kakaopay but user selected carrier
  const carrierPlan = getRailCancelPlan({
    subscription: { name: "넷플릭스", paymentMethod: "카카오페이 머니" },
    channel: "carrier",
  });
  assert.ok(carrierPlan);
  assert.equal(carrierPlan.rail, null);
  assert.ok(Array.isArray(carrierPlan.carrierOptions));
  assert.ok(carrierPlan.blockStep.title.includes("통신사 결제 차단"));

  // If paymentMethod is kakaopay but user selected card_autopay
  const autopayPlan = getRailCancelPlan({
    subscription: { name: "넷플릭스", paymentMethod: "카카오페이 머니" },
    channel: "card_autopay",
  });
  assert.equal(autopayPlan, null);

  // If paymentMethod is kakaopay but user selected google_play / app_store
  assert.equal(
    getRailCancelPlan({
      subscription: { name: "넷플릭스", paymentMethod: "카카오페이 머니" },
      channel: "google_play",
    }),
    null
  );
  assert.equal(
    getRailCancelPlan({
      subscription: { name: "넷플릭스", paymentMethod: "카카오페이 머니" },
      channel: "app_store",
    }),
    null
  );

  // If channel is web (or omitted), simple pay plan is returned
  const webPlan = getRailCancelPlan({
    subscription: { name: "넷플릭스", paymentMethod: "카카오페이 머니" },
    channel: "web",
  });
  assert.ok(webPlan);
  assert.equal(webPlan.rail.id, "kakaopay");
});

test("getRailCancelPlan: returns null for store channels and direct web card payments", () => {
  // Google Play
  assert.equal(
    getRailCancelPlan({ subscription: { name: "YouTube", paymentMethod: "Google Play" }, channel: "google_play" }),
    null
  );

  // App Store
  assert.equal(
    getRailCancelPlan({ subscription: { name: "iCloud", paymentMethod: "App Store" }, channel: "app_store" }),
    null
  );

  // Direct card on web channel without simple pay
  assert.equal(
    getRailCancelPlan({ subscription: { name: "Netflix", paymentMethod: "현대카드 1234" }, channel: "web" }),
    null
  );
});

test("openRailApp: routes correctly for Android native, iOS, and Web", async () => {
  const rail = PAYMENT_RAILS.kakaopay;

  // Web fallback: returns WEB_OPENED
  const webRes = await openRailApp(rail, { platform: "web", isNative: false });
  assert.equal(webRes.status, "WEB_OPENED");
  assert.equal(webRes.url, rail.webUrl);

  // iOS: returns IOS_APPSTORE_OPENED
  const iosRes = await openRailApp(rail, { platform: "ios", isNative: true });
  assert.equal(iosRes.status, "IOS_APPSTORE_OPENED");
  assert.equal(iosRes.url, rail.iosAppStoreUrl);

  // Android native: calls plugin / returns status
  const androidRes = await openRailApp(rail, { platform: "android", isNative: true });
  assert.ok(androidRes.status === "LAUNCHED" || androidRes.status === "FALLBACK_OPENED");

  // null rail guard
  const nullRes = await openRailApp(null);
  assert.equal(nullRes.status, "NO_RAIL");
});
