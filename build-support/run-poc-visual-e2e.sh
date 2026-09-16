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

# Warm the app once, then return to the launcher. The actual visual trigger below
# is a broadcast receiver so it does not bring RE's Activity/task to the foreground.
timeout 30s adb shell am start -W -n kr.co.re.subscription/kr.co.re.subscription.MainActivity > visual-e2e/main-start.txt || true
sleep 1
timeout 30s adb shell input keyevent 3 || true
sleep 1

timeout 15s adb exec-out screencap -p > visual-e2e/baseline.png

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

# Wait until the native animation has really started.
for i in $(seq 1 40); do
  timeout 10s adb logcat -d -v epoch \
    -s REConciergeOverlay:I REPaymentCoordinator:I REPocReceiver:I REPaymentNotif:I AndroidRuntime:E '*:S' \
    > visual-e2e/active.log || true
  if grep -q "REConciergeOverlay: animation_start" visual-e2e/active.log; then
    break
  fi
  sleep 0.15
done

grep -q "REPaymentNotif: posted candidate=" visual-e2e/active.log
grep -q "headsUp=true overlay=true" visual-e2e/active.log
grep -q "REConciergeOverlay: animation_start" visual-e2e/active.log
grep -q "REConciergeOverlay: show event=NEW_SUBSCRIPTION_DETECTED" visual-e2e/active.log

# Give Lottie enough time to draw a visible frame after Animator.onAnimationStart.
sleep 0.45
timeout 15s adb exec-out screencap -p > visual-e2e/active.png

timeout 20s adb shell dumpsys notification --noredact > visual-e2e/notification.txt
grep -q "kr.co.re.subscription" visual-e2e/notification.txt
grep -q "importance=4" visual-e2e/notification.txt

python3 build-support/check-poc-screenshots.py \
  visual-e2e/active.png \
  visual-e2e/baseline.png \
  visual-e2e/active.log \
  visual-e2e/visual-analysis.json

# Preserve a post-animation frame and verify the native window was removed.
sleep 6
timeout 15s adb exec-out screencap -p > visual-e2e/after.png
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
m=re.search(r'bounds=x:(\d+),y:(\d+),w:(\d+),h:(\d+)', log)
assert m, 'overlay bounds missing'
x,y,w,h=map(int,m.groups())
baseline=np.array(Image.open('visual-e2e/baseline.png').convert('RGB'))
after=np.array(Image.open('visual-e2e/after.png').convert('RGB'))
assert baseline.shape == after.shape
roi_b=baseline[y:y+h,x:x+w].astype(np.int16)
roi_a=after[y:y+h,x:x+w].astype(np.int16)
post_ratio=float((np.max(np.abs(roi_b-roi_a),axis=2)>24).mean())
Path('visual-e2e/post-removal.json').write_text(json.dumps({'overlay_region_changed_ratio_after_removal':post_ratio},indent=2))
# The launcher clock can change slightly; the overlay region itself should return
# very close to the baseline once removeViewImmediate has executed.
assert post_ratio < 0.08, post_ratio
print('VISUAL_OVERLAY_REMOVAL_PASS', post_ratio)
PY

if grep -E "FATAL EXCEPTION|ANR in kr.co.re.subscription" visual-e2e/final.log; then
  echo "RE crash/ANR detected during visual E2E" >&2
  exit 1
fi

echo "VISUAL_E2E_PASS" | tee visual-e2e/result.txt
