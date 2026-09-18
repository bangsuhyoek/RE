# RE v2.0.3 2.5D Transplant Progress

## Frozen baseline
- Baseline branch: `chatgpt/v2.0.3-canonical-baseline`
- Baseline checkpoint HEAD: `8812521359643c3c680c15bd60556a36be70dec5`
- Final canonical runtime parity run: `35241949845`
- Baseline decision: `BASELINE PARITY = PASS`
- Golden Product Baseline: `v2.0.2_수정.apk`

## Transplant source
- Working branch: `chatgpt/v2.0.3-2.5d-transplant`
- Starting HEAD: `8812521359643c3c680c15bd60556a36be70dec5`
- Donor branch: `chatgpt/v2.0.3-2.5d-poc`
- Donor HEAD: `7ab60e312faf1f017a7fc40836f2e3eb2cddc921`
- Canonical baseline and transplant starting point were confirmed identical before implementation.

## Production design
- Existing parser, package registry, candidate store schema, heads-up helper, six product screens, and known Golden deep-link behavior are preserved.
- Production trigger remains `PaymentNotificationListener`; QA direct store/overlay injection is not used as final proof.
- New-subscription classification uses a native snapshot of existing `service_id` values synced from the existing WebView subscription query.
- Snapshot uninitialized/unknown service fails closed for overlay only; candidate + heads-up remain intact.
- Existing concierge on/off state is mirrored to native through the existing Capacitor plugin.
- `SYSTEM_ALERT_WINDOW` is required because the requested character must appear while RE is not foreground; the implementation uses `TYPE_APPLICATION_OVERLAY` only for the temporary 2.5D view.
- Permission missing/denied suppresses only the 2.5D overlay. Candidate persistence and heads-up remain available.
- Overlay is non-focusable and non-touchable and is automatically removed after the animation.
- Target animation duration: 5500 ms, safety cleanup: 6200 ms.
- Existing RE `re_motion_15_notification.webp` artwork is split at build time into transparent 2.5D PNG planes; no redesigned character artwork is introduced.

## Planned/changed production files
- `android/app/src/main/java/com/submate/app/payment/PaymentNotificationListener.java`
- `android/app/src/main/java/com/submate/app/payment/PaymentCapturePlugin.java`
- `android/app/src/main/java/com/submate/app/payment/PaymentDetectionCoordinator.java`
- `android/app/src/main/java/com/submate/app/payment/KnownSubscriptionSnapshotStore.java`
- `android/app/src/main/java/com/submate/app/payment/ConciergePreferences.java`
- `android/app/src/main/java/com/submate/app/payment/AnimatedConciergeOverlayController.java`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/build.gradle`
- `build-support/patch-golden-web-for-2.5d.py`
- `build-support/generate-2.5d-assets.py`

## QA-only files
- `build-support/parity-instrumentation/src/main/java/com/re/cardtest/NotificationPublisher.java`
- `build-support/parity-instrumentation/src/main/java/com/re/cardtest/TransplantInstrumentation.java`
- `build-support/parity-instrumentation/src/main/AndroidManifest.xml`
- `build-support/run-v203-2.5d-e2e.sh`
- `.github/workflows/v203-2.5d-e2e.yml`
- Existing `ParityInstrumentation.java` receives QA-only overlay app-op setup so the pre-existing concierge toggle regression remains deterministic.

## Gates
- Candidate storage: PASS
- Heads-up notification: PASS
- Actual NotificationListener production path: PASS
- New-subscription classification: PASS
- 2.5D overlay: PASS
- Transparent background: PASS
- Heads-up non-overlap: PASS
- Animation 5–6 sec: PASS (5509 ms)
- Overlay cleanup: PASS
- Existing-service no-overlay classification: PASS
- Concierge OFF fallback: PASS
- Permission denied fallback: PASS
- Home regression: PASS
- Subscriptions regression: PASS
- Subscription detail regression: PASS
- Benefits regression: PASS
- Notifications regression: PASS
- My Page regression: PASS
- NotificationListener regression: PASS
- Crash / ANR: PASS

## Latest CI
- Validated implementation HEAD: 6fc64d07df40f074db79163e6cb43040822214a1
- Final validating run: 35303261282
- Run conclusion: success
- Last workflow step: Upload 2.5D evidence and APK PASS; job conclusion SUCCESS.
- RUNTIME_REPORT_PARITY=PASS
- BASELINE_RUNTIME_PARITY=PASS
- RE_2_5D_RESULT=PASS
- V203_2_5D_E2E=PASS
- Golden/transplant six-screen visual regression: PASS for home, subscriptions, subscription-detail, benefits, notifications, and my-page.
- Normal new-subscription path: NotificationListener -> parser -> candidate persistence -> existing RE heads-up -> NEW_SUBSCRIPTION_DETECTED -> concierge/permission gates -> 2.5D overlay -> animation end cleanup: PASS.
- Existing subscription suppression: PASS (youtube classified non-new; candidate + heads-up retained, overlay suppressed).
- Concierge OFF fallback: PASS (candidate + heads-up retained, overlay suppressed).
- Overlay permission denied fallback: PASS (candidate + heads-up retained, overlay suppressed, no crash).
- Screenshot transparency: PASS (overlay_occupancy=0.5494587362; no solid rectangular background).
- Screenshot heads-up non-overlap: PASS (heads_up_bbox=[8,15,1072,342], overlay reserved Y=479, clear vertical separation).
- Cleanup screenshot: PASS (cleanup_mean_abs=0.0, cleanup_changed_pct=0.0 in overlay ROI).
- Measured animation duration: PASS (5509 ms).
- Crash / ANR: PASS.
- Evidence artifact id: 10530835930
- Evidence artifact digest: sha256:b398d8fac431c604fc9d8ad9b82b5d8e566812b038b24716a8f921cc000f2cbb
- SYSTEM_ALERT_WINDOW decision: retained because the requested concierge must render while RE is not foreground; the temporary character uses TYPE_APPLICATION_OVERLAY. Permission denial fails closed for overlay only.
- Previous run failures were isolated to workflow/QA timing/analyzer issues and fixed without changing production source for those failures.
- Next single action: Galaxy real-device validation before distribution/release if required.

Galaxy 실기기 검증: 미검증

2.5D TRANSPLANT = PASS