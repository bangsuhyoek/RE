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
- Golden vs rebuilt APK payload parity excluding signing metadata: PASS (546/546 in runtime comparator)
- Package/version: `kr.co.re.subscription` / `2.0.2` / `202`
- Golden APK stable GitHub Actions artifact seed: run `35171158055`

## Candidate/payment diagnosis already resolved
- Run `35176184869` candidate-empty failure was QA malformed input, not production app logic.
- Unicode-safe synthetic payment input subsequently proved on Golden:
  - NotificationListener connection: PASS
  - notification from `com.re.cardtest`: PASS
  - parse `Netflix / 17000`: PASS
  - candidate store write + bridge read: PASS
  - concierge ON/OFF: PASS
- Do not restart candidate diagnosis unless new evidence regresses one of these gates.

## Deep-link progression
1. `35179938369`: candidate gate passed; first failure moved to `deep link id=`.
2. `35180300712`: shell invocation forced the package and Android rejected resolution; test-harness invocation failure.
3. `35237308326`: resolver probe still reported no activity because `UiAutomation.executeShellCommand` received literal quote characters around the URI; test-harness quoting failure.
4. `35237914859`: removing literal shell quotes fixed Android resolution and delivery. Evidence:
   - resolver => `kr.co.re.subscription/.MainActivity`
   - `am start` => `Status: ok`
   - Android reported intent delivered to the already-running top-most `MainActivity`
   - but injected JS listener still observed empty `re:payment-candidate` id.
   This moves the isolation boundary to Capacitor `App.appUrlOpen` / product JS dispatch versus instrumentation behavior. Production source has NOT been modified.
5. Run `35239031212`: diagnostic run started with an additional QA-only direct `Capacitor.Plugins.App.addListener('appUrlOpen', ...)` observer plus `App.getLaunchUrl()` evidence. This run must be followed to `completed` before classification.

## Current checkpoint
- Last completed runtime parity run: `35237914859` — FAILURE
- Last completed run HEAD: `e5c9b85689708f6fbb77c8ec54604a80ed960253`
- First failure: Android deep-link resolution/delivery PASS, JS `re:payment-candidate` observation FAIL (`deep link id=`).
- Latest diagnostic runtime run: `35239031212` — PENDING/IN_PROGRESS at checkpoint update.
- Diagnostic run HEAD: `93795877dfe52875922031a40712bf8735bdf666`
- QA-only diagnostic: record direct `appUrlOpen`, `getLaunchUrl`, and product `re:payment-candidate` separately.
- Next single step: wait for run `35239031212` to reach `completed`, inspect its first failure/evidence, then modify only QA infrastructure unless a Golden product defect is independently demonstrated.

## Golden runtime evidence already proven before current deep-link gate
- Home capture: PASS
- Subscriptions capture: PASS
- Subscription detail capture: PASS
- Benefits capture: PASS
- Notifications capture: PASS
- My Page capture: PASS
- Concierge toggle: PASS
- Payment candidate: PASS
- NotificationListener: PASS
- Android deep-link resolver: PASS (run `35237914859`)
- Android delivery to `MainActivity`: PASS (run `35237914859`)

## Final gates still pending
- Functional runtime parity: PENDING
- Home visual Golden↔rebuilt diff: PENDING
- Subscriptions visual Golden↔rebuilt diff: PENDING
- Subscription detail visual Golden↔rebuilt diff: PENDING
- Benefits visual Golden↔rebuilt diff: PENDING
- Notifications visual Golden↔rebuilt diff: PENDING
- My Page visual Golden↔rebuilt diff: PENDING
- NotificationListener parity: PARTIAL PASS (Golden proven; rebuilt pending)
- Payment path / candidate storage parity: PARTIAL PASS (Golden proven; rebuilt pending)
- Deep Link: PENDING
- Concierge ON/OFF parity: PARTIAL PASS (Golden proven; rebuilt pending)
- Crash / ANR: PENDING

Do not integrate 2.5D until every pending runtime and visual gate passes and `BASELINE PARITY = PASS` is recorded.
