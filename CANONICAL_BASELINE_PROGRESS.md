# RE Canonical Baseline Progress

## Fixed reference
- Branch: `chatgpt/v2.0.3-canonical-baseline`
- Golden Product Baseline: `v2.0.2_수정.apk`
- Golden APK SHA-256: `c52bd20769fb84d8d4d882c7a985f3f792aa038184750dce9a86104efe77e7ac`
- Native donor commit: `d3d85ff816fd7ae340e72b8be5b0a2181e666b1f`
- Package/version: `kr.co.re.subscription` / `2.0.2` / `202`
- 2.5D state: NOT INTEGRATED
- `SYSTEM_ALERT_WINDOW`: NOT PRESENT in baseline

## Proven static gates
- Canonical source clean build: PASS — run `35173609637`
- Golden WebView parity: PASS (133/133)
- Golden vs rebuilt APK payload parity excluding signing metadata: PASS
  - latest runtime comparator: 546/546 files
  - missing: 0
  - extra: 0
  - changed: 0
- Golden APK stable GitHub Actions artifact seed: run `35171158055`
- Common-sign runtime copies preserve all non-signing payload: PASS

## Resolved QA/test-infrastructure failures
- Candidate-empty failure in `35176184869`: malformed QA Korean payment text, not production logic.
- Unicode-safe synthetic payment input fixed the parser stimulus.
- Deep-link shell quoting/package-forcing failures were isolated and fixed in QA invocation.
- Android deep-link resolution and delivery to `MainActivity`: PASS.
- Capacitor `App.appUrlOpen` receives the exact candidate URL on both Golden and rebuilt: PASS.
- Visual false differences caused by transient toast/animation timing were removed by QA-only stabilization before capture; product source was not modified.
- Target `POST_NOTIFICATIONS` permission is granted by the QA harness so the existing candidate heads-up path is observable.

## Known Golden product behavior retained, not treated as a reconstruction regression
- URI: `reapp://payment/candidate?id=baseline-smoke&source=parity-shell`
- Golden and rebuilt both resolve and deliver the URI to `MainActivity`.
- Golden and rebuilt both expose the exact URI through Capacitor `App.appUrlOpen`.
- Golden and rebuilt both do NOT emit the expected Web `re:payment-candidate` product event in this runtime path.
- This identical behavior is recorded as `known_golden_product_deep_link_gap=true`.
- It is a separate product-improvement issue and was intentionally NOT repaired in the canonical baseline, because the baseline task is Golden reconstruction parity.

## Final validated runtime parity
- Final runtime parity run: `35241949845` — SUCCESS
- Validated run HEAD: `79ef9ca6db2a9d7a623b3d5a99bdbd295353aaff`
- Parity job: SUCCESS
- Evidence artifact: `re-v2.0.2-golden-runtime-parity`
- Evidence artifact ID: `10505229611`
- Evidence artifact ZIP SHA-256: `9683001c9a9a577f1932bb5952f1e8373245333271e5700263facc584634f019`
- Golden instrumentation: `RE_PARITY_RESULT=PASS`
- Rebuilt instrumentation: `RE_PARITY_RESULT=PASS`
- `RUNTIME_REPORT_PARITY=PASS`
- `BASELINE_RUNTIME_PARITY=PASS`

## Functional runtime parity — PASS
Golden and rebuilt produced the same functional result:
- NotificationListener connected: PASS
- Synthetic payment notification delivered: PASS
- Payment parser/detection `Netflix / 17000`: PASS
- Candidate store write / bridge read: PASS
- Candidate notification/channel: PASS
- Concierge ON/OFF: PASS
- Native Deep Link resolution/delivery: PASS
- Capacitor `App.appUrlOpen`: PASS
- Product `re:payment-candidate` event: identically missing on Golden and rebuilt; recorded as known Golden product gap, not a canonical divergence
- Crash / ANR: NONE observed
- `behavior_parity=true`
- `functional_pass=true`

## Visual parity — PASS
Comparator ROI excludes only emulator system-bar regions (top 60 px, bottom 110 px). Product UI is not masked.

- Home: PASS — changed_pct 0.0, mean_abs 0.0, RMS 0.0, max_abs 0
- Subscriptions: PASS — changed_pct 0.0, mean_abs ~0.000386, RMS ~0.019659, max_abs 1
- Subscription detail: PASS — changed_pct 0.0, mean_abs 0.0, RMS 0.0, max_abs 0
- Benefits: PASS — changed_pct 0.0, mean_abs 0.0, RMS 0.0, max_abs 0
- Notifications: PASS — changed_pct 0.0, mean_abs 0.0, RMS 0.0, max_abs 0
- My Page: PASS — changed_pct 0.0, mean_abs 0.0, RMS 0.0, max_abs 0
- Overall visual parity: PASS

## Final gate status
- Canonical source clean build: PASS
- WebView parity: PASS
- APK payload parity: PASS
- Functional runtime parity: PASS
- Home visual parity: PASS
- Subscriptions visual parity: PASS
- Subscription detail visual parity: PASS
- Benefits visual parity: PASS
- Notifications visual parity: PASS
- My Page visual parity: PASS
- NotificationListener: PASS
- Payment path: PASS
- Candidate storage: PASS
- Deep Link parity: PASS (native/Capacitor behavior matches Golden; known Golden product-event gap recorded separately)
- Concierge ON/OFF: PASS
- Crash / ANR: PASS

## Baseline decision
`BASELINE PARITY = PASS`

The canonical baseline is now frozen as a proven reconstruction of the Golden Product Baseline for the validated emulator conditions. No 2.5D feature has been integrated in this task. Any subsequent 2.5D transplant must start from this checkpoint without rewriting the verified baseline.

Galaxy real-device verification has not been performed.
