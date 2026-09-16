#!/usr/bin/env bash
set -euxo pipefail

ARTIFACT_DIR="${1:-artifact}"
mkdir -p e2e
APK="$(find "$ARTIFACT_DIR" -type f -name '*.apk' -print -quit)"
test -n "$APK"
test -s "$APK"

echo "APK=$APK"
sha256sum "$APK" | tee e2e/apk.sha256

timeout 180s adb install -r "$APK"
timeout 30s adb shell pm grant kr.co.re.subscription android.permission.POST_NOTIFICATIONS
timeout 30s adb shell appops set kr.co.re.subscription SYSTEM_ALERT_WINDOW allow
timeout 30s adb shell settings put global heads_up_notifications_enabled 1

timeout 30s adb shell dumpsys package kr.co.re.subscription > e2e/package.txt
grep -q "PocPaymentTriggerActivity" e2e/package.txt
grep -q "PocPaymentReceiver" e2e/package.txt
grep -q "PaymentNotificationListener" e2e/package.txt

timeout 60s adb shell am start -W -n kr.co.re.subscription/kr.co.re.subscription.MainActivity > e2e/activity-start.txt || true
sleep 3
timeout 30s adb shell input keyevent 3 || true
sleep 2

capture_re_logs() {
  local out="$1"
  timeout 15s adb logcat -d -v epoch \
    -s REConciergeOverlay:I REPaymentCoordinator:I REPocTrigger:I REPocReceiver:I REPaymentNotif:I AndroidRuntime:E '*:S' \
    > "$out" || true
}

wait_for_log() {
  local pattern="$1"
  local out="$2"
  local limit="${3:-90}"
  local i
  for ((i=0;i<limit;i++)); do
    capture_re_logs "$out"
    if grep -q "$pattern" "$out"; then
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for log pattern: $pattern" >&2
  cat "$out" >&2 || true
  return 1
}

trigger_event() {
  local service="$1"
  local concierge="$2"
  local outfile="$3"
  timeout 90s adb shell am start -W \
    -n kr.co.re.subscription/kr.co.re.subscription.payment.PocPaymentTriggerActivity \
    --es service "$service" \
    --ez force_new true \
    --ez concierge_enabled "$concierge" \
    --ez candidate_alert_enabled true \
    > "$outfile" 2>&1
}

timeout 30s adb logcat -c
trigger_event netflix true e2e/trigger-enabled.txt
wait_for_log "REConciergeOverlay: animation_start" e2e/enabled-live.log 60

sleep 0.35
timeout 25s adb exec-out screencap -p > e2e/overlay_active.png
sleep 5.65
timeout 25s adb exec-out screencap -p > e2e/after_overlay.png
capture_re_logs e2e/enabled.log

grep -q "REPaymentNotif: posted candidate=" e2e/enabled.log
grep -q "event=NEW_SUBSCRIPTION_DETECTED" e2e/enabled.log
grep -q "headsUp=true overlay=true" e2e/enabled.log
grep -q "REConciergeOverlay: animation_start" e2e/enabled.log
grep -q "REConciergeOverlay: removed reason=animation_end" e2e/enabled.log
grep -q "REConciergeOverlay: show event=NEW_SUBSCRIPTION_DETECTED" e2e/enabled.log

python3 - <<'PY'
import re
from pathlib import Path
t=Path('e2e/enabled.log').read_text(encoding='utf-8',errors='ignore')
m=re.search(r'removed reason=animation_end elapsedMs=(\d+)',t)
assert m, 'animation end timing missing'
ms=int(m.group(1))
assert 5000 <= ms <= 6000, ms
posted=re.search(r'^(\d+\.\d+).*REPaymentNotif: posted candidate=',t,re.M)
shown=re.search(r'^(\d+\.\d+).*REConciergeOverlay: show event=NEW_SUBSCRIPTION_DETECTED',t,re.M)
assert posted and shown, 'notification/overlay timestamps missing'
delta=abs(float(shown.group(1))-float(posted.group(1)))*1000
assert delta <= 1000, delta
print(f'Measured overlay duration: {ms}ms')
print(f'Heads-up/overlay dispatch delta: {delta:.1f}ms')
Path('e2e/timing.txt').write_text(f'overlay_duration_ms={ms}\nheads_up_overlay_delta_ms={delta:.1f}\n')
PY

timeout 20s adb shell run-as kr.co.re.subscription cat shared_prefs/re_payment_candidates.xml > e2e/candidates.xml
grep -qi "netflix" e2e/candidates.xml

timeout 30s adb shell dumpsys notification --noredact > e2e/notification.txt
grep -q "kr.co.re.subscription" e2e/notification.txt
grep -q "importance=4" e2e/notification.txt

python3 build-support/check-poc-screenshots.py \
  e2e/overlay_active.png e2e/after_overlay.png e2e/visual-analysis.json

timeout 30s adb shell appops set kr.co.re.subscription SYSTEM_ALERT_WINDOW deny
timeout 30s adb logcat -c
trigger_event youtube true e2e/trigger-denied.txt
wait_for_log "headsUp=true overlay=false" e2e/overlay-denied.log 60
grep -q "overlay_permission_missing" e2e/overlay-denied.log
grep -q "headsUp=true overlay=false" e2e/overlay-denied.log
timeout 20s adb shell run-as kr.co.re.subscription cat shared_prefs/re_payment_candidates.xml > e2e/candidates-after-denied.xml
grep -qi "youtube" e2e/candidates-after-denied.xml

timeout 30s adb shell appops set kr.co.re.subscription SYSTEM_ALERT_WINDOW allow
timeout 30s adb logcat -c
trigger_event netflix false e2e/trigger-off.txt
wait_for_log "conciergeEnabled=false" e2e/concierge-off.log 60
grep -q "headsUp=true overlay=false conciergeEnabled=false" e2e/concierge-off.log
timeout 20s adb shell run-as kr.co.re.subscription cat shared_prefs/re_payment_candidates.xml > e2e/candidates-after-off.xml
grep -qi "netflix" e2e/candidates-after-off.xml

timeout 30s adb logcat -c
timeout 45s adb shell am start -a android.intent.action.VIEW \
  -d "reapp://payment/candidate?id=smoke-final" kr.co.re.subscription \
  > e2e/deeplink-start.txt
sleep 3
timeout 20s adb shell pidof kr.co.re.subscription | tee e2e/pid.txt
test -s e2e/pid.txt
capture_re_logs e2e/deeplink.log

cat e2e/enabled.log e2e/overlay-denied.log e2e/concierge-off.log e2e/deeplink.log > e2e/all.log
if grep -E "FATAL EXCEPTION|ANR in kr.co.re.subscription" e2e/all.log; then
  echo "Crash/ANR detected" >&2
  exit 1
fi

echo "EMULATOR_E2E_PASS" | tee e2e/result.txt
