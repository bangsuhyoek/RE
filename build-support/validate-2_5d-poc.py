#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "poc-build-src").resolve()

def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")

def require(text: str, needle: str, label: str) -> None:
    if needle not in text:
        raise AssertionError(f"{label}: missing {needle!r}")

manifest = read("android/app/src/main/AndroidManifest.xml")
gradle = read("android/app/build.gradle")
variables = read("android/variables.gradle")
main_activity = read("android/app/src/main/java/kr/co/re/subscription/MainActivity.java")
plugin = read("android/app/src/main/java/kr/co/re/subscription/payment/PaymentCapturePlugin.java")
listener = read("android/app/src/main/java/kr/co/re/subscription/payment/PaymentNotificationListener.java")
coordinator = read("android/app/src/main/java/kr/co/re/subscription/payment/PaymentDetectionCoordinator.java")
overlay = read("android/app/src/main/java/kr/co/re/subscription/payment/AnimatedConciergeOverlayController.java")
app = read("app.js")
integration = read("src/re-integration.js")
native = read("src/native.js")

require(gradle, 'namespace "kr.co.re.subscription"', "namespace")
require(gradle, 'applicationId "kr.co.re.subscription"', "applicationId")
require(gradle, "versionCode 203", "versionCode")
require(gradle, 'versionName "2.0.3-poc1"', "versionName")
require(variables, "targetSdkVersion = 36", "targetSdk")
require(variables, "compileSdkVersion = 36", "compileSdk")
require(gradle, 'com.airbnb.android:lottie:6.6.7', "Lottie Android dependency")

require(manifest, "android.permission.SYSTEM_ALERT_WINDOW", "overlay special permission")
if "android.permission.CAMERA" in manifest:
    raise AssertionError("CAMERA must not be present")
if "android.permission.READ_SMS" in manifest:
    raise AssertionError("READ_SMS must not be present")
require(manifest, "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE", "NotificationListener service permission")
require(manifest, "kr.co.re.subscription.payment.PaymentNotificationListener", "NotificationListener service")
require(manifest, 'android:scheme="reapp"', "RE deep link scheme")
require(manifest, 'android:host="auth"', "auth deep link")
require(manifest, 'android:host="payment"', "payment deep link")

require(main_activity, "PaymentCapturePlugin.class", "PaymentCapture plugin registration")
require(main_activity, "ensureListenerConnected", "listener reconnect from MainActivity")
require(plugin, "NotificationListenerService.requestRebind", "listener rebind implementation")
require(plugin, "requestListenerRebind", "listener rebind API")
require(plugin, "checkAnimatedConciergePermission", "overlay permission API")
require(plugin, "requestAnimatedConciergePermission", "overlay permission request API")
require(plugin, "syncSubscriptionSnapshot", "subscription snapshot API")

require(listener, "PaymentDetectionCoordinator.handle", "listener -> coordinator wiring")
require(coordinator, "PaymentCandidateStore.save", "candidate save")
require(coordinator, "PaymentCapturePreferences.candidateNotificationsEnabled", "candidate notification preference")
require(coordinator, "PaymentNotificationHelper.dispatch", "heads-up dispatch")
require(coordinator, 'EVENT_NEW_SUBSCRIPTION = "NEW_SUBSCRIPTION_DETECTED"', "new subscription event")
require(coordinator, "KnownSubscriptionSnapshotStore.isNewService", "new-service determination")
require(coordinator, "AnimatedConciergeOverlayController.show", "event -> overlay wiring")

require(overlay, "TYPE_APPLICATION_OVERLAY", "native overlay type")
require(overlay, "LottieAnimationView", "native Lottie renderer")
require(overlay, "EXPECTED_DURATION_MS = 5500L", "5.5s duration contract")
require(overlay, 'setAnimation("concierge/new_subscription_detected.json")', "PoC motion binding")
require(overlay, "removeViewImmediate", "overlay cleanup")
require(overlay, "statusBarHeight", "safe-area positioning")
require(overlay, "Settings.canDrawOverlays", "overlay permission guard")

# v2.0.2 Source of Truth capabilities that must survive the merge.
for needle in [
    "registerConciergeTap",
    "renderPaymentSheetConcierge",
    "isConciergeEnvironmentBusy",
    "data-concierge-toggle",
    "resend-confirmation",
]:
    require(app, needle, "v2.0.2 app capability")

for needle in [
    "signInWithOAuth",
    'provider: "google"',
    "reapp://auth/callback",
    "subscriptions",
    "syncSubscriptionSnapshot",
]:
    require(integration, needle, "v2.0.2 integration capability")

for needle in [
    "requestListenerRebind",
    "checkListenerConnection",
    "setPaymentCandidateNotifications",
    "BILLING_REMINDER_DAYS",
]:
    require(native, needle, "v2.0.2 native bridge capability")

# Arbitrary reminder days 0..30 must remain supported.
if "Array.from({ length: 31 }" not in native:
    raise AssertionError("BILLING_REMINDER_DAYS must support every integer 0..30")

meta = json.loads((ROOT / "POC_2_5D_METADATA.json").read_text(encoding="utf-8"))
assert meta["event"] == "NEW_SUBSCRIPTION_DETECTED"
assert meta["duration_ms"] == 5500
assert meta["fps"] == 30
assert meta["frames"] == 165
assert len(meta["layers"]) == 9

lottie = json.loads(
    (ROOT / "android/app/src/main/assets/concierge/new_subscription_detected.json")
    .read_text(encoding="utf-8")
)
assert round((lottie["op"] - lottie["ip"]) / lottie["fr"] * 1000) == 5500
assert len(lottie["layers"]) == 9
for layer in lottie["layers"]:
    ks = layer["ks"]
    assert ks["p"]["a"] == 1, layer["nm"]
    assert ks["s"]["a"] == 1, layer["nm"]
    assert ks["r"]["a"] == 1, layer["nm"]

expected_images = {
    "hair_back.png","body.png","head_face.png","hair_front.png","left_arm.png",
    "right_arm.png","phone.png","eyes.png","shadow.png"
}
image_dir = ROOT / "android/app/src/main/assets/concierge/images"
actual = {p.name for p in image_dir.glob("*.png")}
assert expected_images <= actual, sorted(expected_images - actual)

print("CURRENT_V202_PLUS_POC_CONTRACT_PASS")
print("package=kr.co.re.subscription")
print("targetSdk=36")
print("versionName=2.0.3-poc1")
print("lottie_duration_ms=5500")
print("layer_count=9")
