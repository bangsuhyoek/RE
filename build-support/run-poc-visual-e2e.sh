#!/usr/bin/env bash
set -euxo pipefail

ARTIFACT_DIR="${1:-artifact}"
mkdir -p visual-e2e
APK="$(find "$ARTIFACT_DIR" -type f -name '*.apk' -print -quit)"
test -n "$APK"
test -s "$APK"

sha256sum "$APK" | tee visual-e2e/apk.sha256
timeout 120s adb install -r "$APK"
timeout 30s adb shell pm grant kr.co.re.subscription android.permission.POST_NOTIFICATIONS
timeout 30s adb shell appops set kr.co.re.subscription SYSTEM_ALERT_WINDOW allow
timeout 30s adb shell settings put global heads_up_notifications_enabled 1

timeout 30s adb shell am start -W -n kr.co.re.subscription/kr.co.re.subscription.MainActivity > visual-e2e/main-start.txt || true
sleep 1
timeout 30s adb shell input keyevent 3 || true
sleep 1

# Stable pre-event reference frame.
timeout 15s adb exec-out screencap -p > visual-e2e/baseline.png

timeout 20s adb logcat -c
timeout 30s adb shell am start -W   -n kr.co.re.subscription/kr.co.re.subscription.payment.PocPaymentTriggerActivity   --es service netflix   --ez force_new true   --ez concierge_enabled true   --ez candidate_alert_enabled true   > visual-e2e/trigger.txt

# Wait only until the native overlay animation has begun; this keeps the system
# heads-up notification visible for the active evidence frame.
for i in $(seq 1 30); do
  timeout 10s adb logcat -d -v epoch     -s REConciergeOverlay:I REPaymentCoordinator:I REPocTrigger:I REPaymentNotif:I '*:S'     > visual-e2e/active.log || true
  if grep -q "REConciergeOverlay: animation_start" visual-e2e/active.log; then
    break
  fi
  sleep 0.2
done

grep -q "REPaymentNotif: posted candidate=" visual-e2e/active.log
grep -q "headsUp=true overlay=true" visual-e2e/active.log
grep -q "REConciergeOverlay: animation_start" visual-e2e/active.log

# Capture an actual frame where Heads-up + animated concierge are simultaneously active.
timeout 15s adb exec-out screencap -p > visual-e2e/active.png

timeout 20s adb shell dumpsys notification --noredact > visual-e2e/notification.txt
grep -q "kr.co.re.subscription" visual-e2e/notification.txt
grep -q "importance=4" visual-e2e/notification.txt

python3 build-support/check-poc-screenshots.py   visual-e2e/active.png visual-e2e/baseline.png visual-e2e/visual-analysis.json

# Preserve a post-animation frame as supporting removal evidence.
sleep 6
timeout 15s adb exec-out screencap -p > visual-e2e/after.png
timeout 10s adb logcat -d -v epoch   -s REConciergeOverlay:I REPaymentCoordinator:I REPocTrigger:I REPaymentNotif:I AndroidRuntime:E '*:S'   > visual-e2e/final.log || true
grep -q "REConciergeOverlay: removed reason=animation_end" visual-e2e/final.log

if grep -E "FATAL EXCEPTION|ANR in kr.co.re.subscription" visual-e2e/final.log; then
  echo "RE crash/ANR detected during visual E2E" >&2
  exit 1
fi

echo "VISUAL_E2E_PASS" | tee visual-e2e/result.txt
