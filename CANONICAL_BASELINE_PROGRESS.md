# RE Canonical Baseline Progress

## Fixed reference
- Branch: `chatgpt/v2.0.3-canonical-baseline`
- Golden Product Baseline: `v2.0.2_수정.apk`
- Golden APK SHA-256: `c52bd20769fb84d8d4d882c7a985f3f792aa038184750dce9a86104efe77e7ac`
- Native donor commit: `d3d85ff816fd7ae340e72b8be5b0a2181e666b1f`
- 2.5D state: NOT INTEGRATED
- `SYSTEM_ALERT_WINDOW`: NOT PRESENT in baseline

## Proven gates
- Canonical source clean build: PASS — run `35173609637`
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
8. `35173781288`: API 30 emulator WebView could not parse the exact Golden vendor JavaScript bundle; emulator compatibility failure, not app failure. Runtime parity moved to API 33.
9. `35174291655`: API 33 shared external path `/sdcard/REParity` was blocked by scoped-storage (`EPERM`); QA evidence-path failure, not app failure.
10. `35174767608`: QA instrumentation attempted to write to `com.re.cardtest` private internal storage, but Android instrumentation executes in the target app process/UID. Test-infrastructure UID/context mismatch, not app failure.
11. `35175728666`: instrumentation posted the synthetic notification under the wrong UID and Android rejected it with `SecurityException`; QA notification-publisher infrastructure failure.
12. `35176184869`: QA publisher UID path worked and the real RE NotificationListener received the notification, but the synthetic title/body stored in `NotificationPublisher.java` had been corrupted to question marks (`title=????`, body contained `17,000?`). Runtime log proved `received package=com.re.cardtest ...` followed by `ignored: parser rejected notification`; `PaymentParser` requires a KRW amount ending in `원`, so no candidate was created. This is malformed QA test input, not an app baseline failure.

## Recurrence prevention applied
- Golden APK is stored as a reusable GitHub Actions artifact instead of relying on a temporary signed URL for runtime parity.
- Runtime parity prints and validates actual artifact paths before use.
- APK inputs are checked with `test -n`, `test -s`, SHA-256 and payload parity before emulator runtime.
- Golden, rebuilt and QA instrumentation runtime copies are common-signed without changing non-signing payload.
- Emulator runner explicitly waits for device boot and package-manager readiness.
- Runtime parity uses API 33 so the exact Golden WebView bundle runs on a compatible WebView.
- Canonical source packaging uses root-anchored exclusions so `android/app/src` is not accidentally removed.
- QA evidence writes to the target app-specific external files directory and is pulled with adb.
- Synthetic payment notification is posted by an exported receiver in the QA package, so it originates from the QA package UID.
- Synthetic payment strings now use Java Unicode escapes to avoid source/transport encoding corruption. The canonical body is `Netflix 정기결제 17,000원 승인`.
- Test harness failures are treated separately from app failures.

## Current checkpoint
- Last completed runtime parity run: `35176184869` — FAILURE
- Last successful workflow step: `Enable KVM acceleration`
- First failing workflow step: `Run Golden vs rebuilt functional and visual parity`
- Golden runtime progress before failure:
  - Home screen/capture: PASS
  - Concierge toggle: PASS
  - Subscriptions screen/capture: PASS
  - Subscription detail screen/capture: PASS
  - Benefits screen/capture: PASS
  - Notifications screen/capture: PASS
  - My Page screen/capture: PASS
  - NotificationListener connection: PASS
  - Synthetic notification reached listener: PASS (`package=com.re.cardtest`)
  - Parser: FAIL because QA body was malformed (`17,000?` instead of `17,000원`)
  - Candidate count: 0
- Classification: QA test-input encoding corruption; app baseline failure proven: NO
- Minimal fix applied: `NotificationPublisher.java` now emits Unicode-safe `신한카드 승인` / `Netflix 정기결제 17,000원 승인` and logs the posted payload.
- Fix commit: `4ef3dd6d56b57936fa5046b53a8e737f5ac50c2f`
- Next single step: trigger a new Golden-vs-rebuilt runtime parity run and follow it to `completed`.

## Required final gates still pending
- Functional runtime parity: PENDING
- Home visual parity: PENDING (Golden capture exists; Golden vs rebuilt comparison not yet completed)
- Subscriptions visual parity: PENDING
- Subscription detail visual parity: PENDING
- Benefits visual parity: PENDING
- Notifications visual parity: PENDING
- My Page visual parity: PENDING
- NotificationListener runtime connection: PARTIAL PASS (Golden proven; rebuilt pending)
- Payment path / candidate storage: PENDING
- Deep Link: PENDING
- Concierge ON/OFF: PARTIAL PASS (Golden proven; rebuilt pending)
- Crash / ANR: PENDING

Do not integrate 2.5D until all pending runtime and visual gates pass and `BASELINE PARITY = PASS` is recorded.
