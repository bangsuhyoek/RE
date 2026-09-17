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
12. `35176184869`: QA publisher UID path worked, but the synthetic title/body had been corrupted to question marks (`title=????`, body contained `17,000?`). The real RE listener received the QA notification and logged `ignored: parser rejected notification`, so no candidate was created. Malformed QA input, not an app failure.
13. `35179448328`: Unicode-safe QA payment input fixed the prior failure. Golden runtime then proved `listener connected`, received `package=com.re.cardtest`, parsed `Netflix / 17000`, saved a candidate, and passed `payment_candidate`. The next failure was `deep link id=`. The harness was dispatching this link from the target instrumentation process itself. This does not model a real external deep-link caller, so the next diagnostic uses the QA app process to dispatch the same `reapp://payment/candidate?id=baseline-smoke` intent externally before deciding whether any product code is wrong.

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
- Synthetic payment strings use Java Unicode escapes to avoid source/transport encoding corruption.
- Candidate deep-link diagnosis now also dispatches the test deep link from the QA app process, which matches a real external caller better than target-process self-dispatch.
- Test harness failures are treated separately from app failures.

## Current checkpoint
- Last completed runtime parity run: `35179448328` — FAILURE
- Run HEAD: `14047d1fef2db1ec802245c318ec472d84f245ac`
- Last successful runtime gate: Golden `payment_candidate=PASS`
- First runtime failure after that: `deep link id=`
- Golden evidence already proven in this run:
  - Home screen/capture: PASS
  - Concierge toggle: PASS
  - Subscriptions screen/capture: PASS
  - Subscription detail screen/capture: PASS
  - Benefits screen/capture: PASS
  - Notifications screen/capture: PASS
  - My Page screen/capture: PASS
  - NotificationListener connection: PASS
  - QA notification published from `com.re.cardtest`: PASS
  - Listener received QA notification: PASS
  - Parser output `Netflix / 17000`: PASS
  - Candidate store write / bridge read: PASS
- Current deep-link classification: test-harness dispatch method is still being isolated; app baseline failure is NOT yet proven.
- Minimal diagnostic fix applied: `NotificationPublisher` schedules the candidate deep link from the QA app process (external caller) after the real notification is posted.
- Diagnostic fix commit: `3608be56e7c2b50a892f9cdca66902be17a94af1`
- Next single step: trigger a new Golden-vs-rebuilt runtime parity run, follow it to `completed`, then classify only the next first failure if one remains.

## Required final gates still pending
- Functional runtime parity: PENDING
- Home visual parity: PENDING (Golden capture exists; Golden vs rebuilt comparison pending)
- Subscriptions visual parity: PENDING
- Subscription detail visual parity: PENDING
- Benefits visual parity: PENDING
- Notifications visual parity: PENDING
- My Page visual parity: PENDING
- NotificationListener runtime connection: PARTIAL PASS (Golden proven; rebuilt pending)
- Payment path / candidate storage: PARTIAL PASS (Golden proven; rebuilt pending)
- Deep Link: PENDING
- Concierge ON/OFF: PARTIAL PASS (Golden proven; rebuilt pending)
- Crash / ANR: PENDING

Do not integrate 2.5D until all pending runtime and visual gates pass and `BASELINE PARITY = PASS` is recorded.
