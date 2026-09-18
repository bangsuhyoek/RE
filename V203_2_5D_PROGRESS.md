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
- Candidate storage: PENDING
- Heads-up notification: PENDING
- Actual NotificationListener production path: PENDING
- New-subscription classification: PENDING
- 2.5D overlay: PENDING
- Transparent background: PENDING
- Heads-up non-overlap: PENDING
- Animation 5–6 sec: PENDING
- Overlay cleanup: PENDING
- Existing-service no-overlay classification: PENDING
- Concierge OFF fallback: PENDING
- Permission denied fallback: PENDING
- Home regression: PENDING
- Subscriptions regression: PENDING
- Subscription detail regression: PENDING
- Benefits regression: PENDING
- Notifications regression: PENDING
- My Page regression: PENDING
- NotificationListener regression: PENDING
- Crash / ANR: PENDING

## Latest CI
- Latest run: `35300573865`
- Latest conclusion: `failure`
- Last successful step: `Enable KVM acceleration`
- First failing step: `Run baseline regression plus 2.5D functional and visual E2E`
- Functional baseline parity: PASS (`RE_PARITY_RESULT=PASS` for Golden and rebuilt, runtime-report parity PASS).
- Visual baseline parity: FAIL only on Benefits. Home/subscriptions/detail/notifications/my-page passed; Benefits changed_pct 70.912%, mean_abs 16.436, RMS 33.388.
- Evidence comparison: the run's Golden Benefits screenshot matches the proven baseline-pass Golden/Rebuilt Benefits rendering, while the transplanted APK renders a materially different Benefits composition. This is a real Web-render parity regression, not an emulator-only Golden transient.
- Cause classification: minimal Web bridge patch timing. The startup bridge inserted an awaited native call before the original `initializeApp()` body, perturbing the Golden render timing/state. No native payment/overlay source change is needed for this failure.
- Applied fix: make startup concierge-state sync fire-and-forget (`void`) instead of awaiting the native bridge, preserving original Golden initialization timing while retaining state mirroring.
- 2.5D scenario execution: NOT REACHED because baseline visual regression gate correctly stopped the script first.
- Next single action: push this Web-bridge timing-only fix and follow the next transplant E2E run to completion.

Galaxy 실기기 검증: 미검증