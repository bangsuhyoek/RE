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

# Warm RE once, then leave the launcher as the stable visual background.
timeout 30s adb shell am start -W -n kr.co.re.subscription/kr.co.re.subscription.MainActivity > visual-e2e/main-start.txt || true
sleep 1
timeout 30s adb shell input keyevent 3 || true
sleep 1

# Device-side screencap avoids the multi-second exec-out transport delay that can
# cause a short-lived Heads-up notification to disappear before capture.
timeout 10s adb shell screencap -p /sdcard/re-baseline.png
timeout 10s adb pull /sdcard/re-baseline.png visual-e2e/baseline.png

timeout 20s adb logcat -c
timeout 30s adb shell am broadcast \
  --receiver-foreground \
  -n kr.co.re.subscription/kr.co.re.subscription.payment.PocPaymentReceiver \
  -a kr.co.re.subscription.POC_NEW_SUBSCRIPTION \
  --es service netflix \
  --ez force_new true \
  --ez concierge_enabled true \
  --ez candidate_alert_enabled true \
  > visual-e2e/trigger.txt

# Burst-capture several early frames. At least one must contain both the system
# Heads-up and a visibly rendered concierge frame.
sleep 0.15
timeout 10s adb shell screencap -p /sdcard/re-active-1.png
sleep 0.25
timeout 10s adb shell screencap -p /sdcard/re-active-2.png
sleep 0.35
timeout 10s adb shell screencap -p /sdcard/re-active-3.png
timeout 10s adb pull /sdcard/re-active-1.png visual-e2e/active-1.png
timeout 10s adb pull /sdcard/re-active-2.png visual-e2e/active-2.png
timeout 10s adb pull /sdcard/re-active-3.png visual-e2e/active-3.png

# Collect the native evidence after capture so log polling cannot delay the frame.
for i in $(seq 1 30); do
  timeout 10s adb logcat -d -v epoch \
    -s REConciergeOverlay:I REPaymentCoordinator:I REPocReceiver:I REPaymentNotif:I AndroidRuntime:E '*:S' \
    > visual-e2e/active.log || true
  if grep -q "REConciergeOverlay: animation_start" visual-e2e/active.log; then
    break
  fi
  sleep 0.1
done

grep -q "REPaymentNotif: posted candidate=" visual-e2e/active.log
grep -q "headsUp=true overlay=true" visual-e2e/active.log
grep -q "REConciergeOverlay: animation_start" visual-e2e/active.log
grep -q "REConciergeOverlay: show event=NEW_SUBSCRIPTION_DETECTED" visual-e2e/active.log

timeout 20s adb shell dumpsys notification --noredact > visual-e2e/notification.txt
grep -q "kr.co.re.subscription" visual-e2e/notification.txt
grep -q "importance=4" visual-e2e/notification.txt

python3 build-support/check-poc-screenshots.py \
  visual-e2e/baseline.png \
  visual-e2e/active.log \
  visual-e2e/visual-analysis.json \
  visual-e2e/active-1.png \
  visual-e2e/active-2.png \
  visual-e2e/active-3.png

# Verify visual disappearance after animation end.
sleep 6
timeout 10s adb shell screencap -p /sdcard/re-after.png
timeout 10s adb pull /sdcard/re-after.png visual-e2e/after.png
timeout 10s adb logcat -d -v epoch \
  -s REConciergeOverlay:I REPaymentCoordinator:I REPocReceiver:I REPaymentNotif:I AndroidRuntime:E '*:S' \
  > visual-e2e/final.log || true
grep -q "REConciergeOverlay: removed reason=animation_end" visual-e2e/final.log

python3 - <<'PY'
import json, re
from pathlib import Path
import numpy as np
from PIL import Image

log=Path('visual-e2e/active.log').read_text(encoding='utf-8',errors='ignore')
m=re.search(r'bounds=x:(\d+),y:(\d+),w:(\d+),h:(\d+) screen=(\d+)x(\d+) statusBar=(\d+)', log)
assert m, 'overlay bounds missing'
x,y,w,h,sw,sh,status=map(int,m.groups())
full_y=y+status
baseline=np.array(Image.open('visual-e2e/baseline.png').convert('RGB'))
after=np.array(Image.open('visual-e2e/after.png').convert('RGB'))
assert baseline.shape == after.shape
roi_b=baseline[full_y:full_y+h,x:x+w].astype(np.int16)
roi_a=after[full_y:full_y+h,x:x+w].astype(np.int16)
post_ratio=float((np.max(np.abs(roi_b-roi_a),axis=2)>24).mean())
Path('visual-e2e/post-removal.json').write_text(json.dumps({
  'overlay_screenshot_y': full_y,
  'overlay_region_changed_ratio_after_removal': post_ratio
},indent=2))
assert post_ratio < 0.08, post_ratio
print('VISUAL_OVERLAY_REMOVAL_PASS', post_ratio)
PY

if grep -E "FATAL EXCEPTION|ANR in kr.co.re.subscription" visual-e2e/final.log; then
  echo "RE crash/ANR detected during visual E2E" >&2
  exit 1
fi

echo "VISUAL_E2E_PASS" | tee visual-e2e/result.txt
