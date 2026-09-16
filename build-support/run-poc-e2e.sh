#!/usr/bin/env bash
set -euo pipefail

ARTIFACT_DIR="${1:-artifact}"
mkdir -p e2e
APK="$(find "$ARTIFACT_DIR" -type f -name '*.apk' -print -quit)"
test -n "$APK"
test -s "$APK"

echo "APK=$APK"
sha256sum "$APK" | tee e2e/apk.sha256

adb install -r "$APK"
adb shell monkey -p kr.co.re.subscription -c android.intent.category.LAUNCHER 1
sleep 2
adb shell pm grant kr.co.re.subscription android.permission.POST_NOTIFICATIONS
adb shell appops set kr.co.re.subscription SYSTEM_ALERT_WINDOW allow
adb shell settings put global heads_up_notifications_enabled 1
adb shell input keyevent 3
sleep 1

adb logcat -c
adb shell am broadcast -a kr.co.re.subscription.POC_NEW_SUBSCRIPTION -p kr.co.re.subscription --es service netflix --ez force_new true --ez concierge_enabled true --ez candidate_alert_enabled true
sleep 0.8
adb exec-out screencap -p > e2e/overlay_0_8s.png
sleep 2.0
adb exec-out screencap -p > e2e/overlay_2_8s.png
sleep 3.4
adb exec-out screencap -p > e2e/after_6_2s.png
adb logcat -d -v epoch > e2e/enabled.log

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
assert delta <= 500, delta
print(f'Measured overlay duration: {ms}ms')
print(f'Heads-up/overlay dispatch delta: {delta:.1f}ms')
Path('e2e/timing.txt').write_text(f'overlay_duration_ms={ms}\nheads_up_overlay_delta_ms={delta:.1f}\n')
PY

adb shell run-as kr.co.re.subscription cat shared_prefs/re_payment_candidates.xml > e2e/candidates.xml
grep -qi "netflix" e2e/candidates.xml

adb shell dumpsys notification --noredact > e2e/notification.txt
grep -q "kr.co.re.subscription" e2e/notification.txt
grep -q "importance=4" e2e/notification.txt

python3 build-support/check-poc-screenshots.py e2e/overlay_0_8s.png e2e/after_6_2s.png e2e/visual-analysis.json

adb shell appops set kr.co.re.subscription SYSTEM_ALERT_WINDOW deny
adb logcat -c
adb shell am broadcast -a kr.co.re.subscription.POC_NEW_SUBSCRIPTION -p kr.co.re.subscription --es service youtube --ez force_new true --ez concierge_enabled true --ez candidate_alert_enabled true
sleep 1
adb logcat -d -v epoch > e2e/overlay-denied.log
grep -q "overlay_permission_missing" e2e/overlay-denied.log
grep -q "headsUp=true overlay=false" e2e/overlay-denied.log
adb shell run-as kr.co.re.subscription cat shared_prefs/re_payment_candidates.xml > e2e/candidates-after-denied.xml
grep -qi "youtube" e2e/candidates-after-denied.xml

adb shell appops set kr.co.re.subscription SYSTEM_ALERT_WINDOW allow
adb logcat -c
adb shell am broadcast -a kr.co.re.subscription.POC_NEW_SUBSCRIPTION -p kr.co.re.subscription --es service netflix --ez force_new true --ez concierge_enabled false --ez candidate_alert_enabled true
sleep 1
adb logcat -d -v epoch > e2e/concierge-off.log
grep -q "headsUp=true overlay=false conciergeEnabled=false" e2e/concierge-off.log
adb shell run-as kr.co.re.subscription cat shared_prefs/re_payment_candidates.xml > e2e/candidates-after-off.xml
grep -qi "netflix" e2e/candidates-after-off.xml

adb logcat -c
adb shell am start -a android.intent.action.VIEW -d "reapp://payment/candidate?id=smoke-final" kr.co.re.subscription
sleep 2
adb shell pidof kr.co.re.subscription | tee e2e/pid.txt
test -s e2e/pid.txt
adb logcat -d -v epoch > e2e/deeplink.log

cat e2e/enabled.log e2e/overlay-denied.log e2e/concierge-off.log e2e/deeplink.log > e2e/all.log
if grep -E "FATAL EXCEPTION|ANR in kr.co.re.subscription" e2e/all.log; then
  echo "Crash/ANR detected" >&2
  exit 1
fi

echo "EMULATOR_E2E_PASS" | tee e2e/result.txt
