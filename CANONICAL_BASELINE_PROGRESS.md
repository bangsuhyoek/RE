# RE Canonical Baseline Progress

## Fixed reference
- Branch: `chatgpt/v2.0.3-canonical-baseline`
- Golden Product Baseline: `v2.0.2_수정.apk`
- Golden APK SHA-256: `c52bd20769fb84d8d4d882c7a985f3f792aa038184750dce9a86104efe77e7ac`
- Native donor commit: `d3d85ff816fd7ae340e72b8be5b0a2181e666b1f`
- 2.5D state: NOT INTEGRATED
- `SYSTEM_ALERT_WINDOW`: NOT PRESENT in baseline

## Proven gates
- Golden WebView parity: PASS (133/133)
- Golden vs rebuilt APK payload parity excluding signing metadata: PASS
- Package: `kr.co.re.subscription`
- versionName: `2.0.2`
- versionCode: `202`
- Golden APK stable GitHub Actions artifact seed: run `35171158055`, artifact `re-v2.0.2-golden-product-baseline`

## Repeated interruption root causes found
1. `35134466992`: emulator smoke script used shell options unsupported by `/bin/sh`; CI script failure, not app failure.
2. `35135721151`: emulator script selected an empty APK path; artifact-path test infrastructure failure, not app failure.
3. `35170454087`: parity QA Gradle project had no repositories for detached aapt2 resolution; test harness build failure.
4. `35171231037`: parity instrumentation signature did not match the target app; test harness infrastructure failure.
5. `35171482044`: common signing succeeded, but the parity harness could not create its evidence directory; test harness evidence-path failure.
6. `35171281062`: first clean-source repair attempt exposed that the source ZIP had lost nested `android/app/src` because rsync used unanchored `--exclude 'src'`; source packaging failure.
7. `35171406840`: WebView restoration passed, then clean rebuild failed because `android/app/src/main/AndroidManifest.xml` was absent; same packaging root cause confirmed.

## Recurrence prevention applied
- Golden APK is stored as a reusable GitHub Actions artifact instead of relying on a temporary signed URL for runtime parity.
- Runtime parity now prints and validates actual artifact paths before use.
- APK inputs are checked with `test -n`, `test -s`, SHA-256 and payload parity before emulator runtime.
- Golden, rebuilt and QA instrumentation runtime copies are common-signed without changing non-signing payload.
- Emulator runner script explicitly waits for device boot and package-manager readiness.
- QA harness has a stable shared evidence path and external-storage compatibility for API 30.
- Canonical source packaging now uses root-anchored exclusions so `android/app/src` is not accidentally removed.
- Test harness failures are treated separately from app failures.

## Current active runs
- Runtime parity: `35173490649` — PENDING
- Clean source rebuild: `35173472079` — PENDING

## Current checkpoint
Do not integrate 2.5D yet. Wait for both active runs to reach `completed`, then:
1. If a run fails, inspect the first failing step and fix only that test-infrastructure/source-packaging issue.
2. If clean-source passes, preserve its artifact as the canonical source package.
3. If runtime parity passes, record functional and six-screen visual parity results.
4. Declare `BASELINE PARITY = PASS` only when all required gates pass.
