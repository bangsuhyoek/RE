#!/usr/bin/env bash
set -euo pipefail

TRANSPLANT_DIR="${1:?transplant apk dir required}"
GOLDEN_APK="${2:?golden apk required}"
QA_APK="${3:?qa instrumentation apk required}"
TARGET="kr.co.re.subscription"
QA_PACKAGE="com.re.cardtest"
LISTENER="$TARGET/kr.co.re.subscription.payment.PaymentNotificationListener"
TRANSPLANT_APK=$(find "$TRANSPLANT_DIR" -type f -name canonical-baseline.apk -print -quit)
EVIDENCE_DIR="/sdcard/Android/data/$TARGET/files/transplant"

# First prove the six Golden screens and the pre-existing payment/concierge runtime
# remain equivalent. The transplant branch's QA instrumentation grants overlay app-op
# before its concierge toggle, so the permission settings activity cannot perturb it.
bash build-support/run-canonical-parity-e2e.sh "$TRANSPLANT_DIR" "$GOLDEN_APK" "$QA_APK"

test -n "$TRANSPLANT_APK"
test -s "$TRANSPLANT_APK"
test -s "$QA_APK"
mkdir -p e2e-2.5d/screens

adb uninstall "$TARGET" >/dev/null 2>&1 || true
adb uninstall "$QA_PACKAGE" >/dev/null 2>&1 || true
adb install "$TRANSPLANT_APK" | tee e2e-2.5d/install-target.txt
adb install "$QA_APK" | tee e2e-2.5d/install-qa.txt
adb shell pm grant "$TARGET" android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
adb shell pm grant "$QA_PACKAGE" android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
adb shell appops set "$TARGET" SYSTEM_ALERT_WINDOW allow || true
# Baseline parity disables Android animator duration globally for deterministic screenshots.
# Re-enable ValueAnimator/ObjectAnimator timing before validating the real 5.5 s overlay.
adb shell settings put global animator_duration_scale 1.0 || true

if ! adb shell cmd notification allow_listener "$LISTENER"; then
  adb shell settings put secure enabled_notification_listeners "$LISTENER"
fi
sleep 2

adb shell rm -rf "$EVIDENCE_DIR" >/dev/null 2>&1 || true
adb logcat -c

set +e
adb shell am instrument -w "$QA_PACKAGE/.TransplantInstrumentation" | tee e2e-2.5d/instrumentation.txt
INST_STATUS=${PIPESTATUS[0]}
set -e

adb shell ls -la "$EVIDENCE_DIR" > e2e-2.5d/evidence-files.txt 2>&1 || true
for file in before-trigger.png heads-up-overlay.png overlay-only.png after-cleanup.png runtime-report.txt normal-log.txt known-service-log.txt concierge-off-log.txt permission-denied-log.txt; do
  if adb pull "$EVIDENCE_DIR/$file" "e2e-2.5d/screens/$file" >/dev/null 2>&1; then
    test -s "e2e-2.5d/screens/$file" || rm -f "e2e-2.5d/screens/$file"
  fi
done

adb logcat -d -v time > e2e-2.5d/logcat.txt
adb shell dumpsys notification --noredact > e2e-2.5d/notification.txt || adb shell dumpsys notification > e2e-2.5d/notification.txt
adb shell dumpsys window windows > e2e-2.5d/window.txt || true
adb shell dumpsys package "$TARGET" > e2e-2.5d/package.txt
sha256sum "$TRANSPLANT_APK" "$QA_APK" > e2e-2.5d/apks.sha256

[ "$INST_STATUS" -eq 0 ]
grep -q "RE_2_5D_RESULT=PASS" e2e-2.5d/instrumentation.txt
grep -q "android.permission.SYSTEM_ALERT_WINDOW" e2e-2.5d/package.txt
grep -q "re_payment_candidates_v106_runtime" e2e-2.5d/notification.txt
grep -q "결제 내역을 확인했어요" e2e-2.5d/notification.txt

python3 - <<'PY'
from pathlib import Path
from PIL import Image, ImageChops
import numpy as np, json, re, sys

root=Path('e2e-2.5d/screens')
required=['before-trigger.png','heads-up-overlay.png','overlay-only.png','after-cleanup.png','runtime-report.txt','normal-log.txt']
missing=[x for x in required if not (root/x).exists()]
if missing:
    raise SystemExit('missing evidence: '+','.join(missing))

before=np.asarray(Image.open(root/'before-trigger.png').convert('RGB'),dtype=np.int16)
early=np.asarray(Image.open(root/'heads-up-overlay.png').convert('RGB'),dtype=np.int16)
mid=np.asarray(Image.open(root/'overlay-only.png').convert('RGB'),dtype=np.int16)
after=np.asarray(Image.open(root/'after-cleanup.png').convert('RGB'),dtype=np.int16)
if not (before.shape==early.shape==mid.shape==after.shape):
    raise SystemExit('screenshot shape mismatch')

log=(root/'normal-log.txt').read_text(errors='replace')
m=re.search(r'bounds=x:(\d+),y:(\d+),w:(\d+),h:(\d+).*reservedTopPx=(\d+)',log)
if not m:
    raise SystemExit('overlay bounds missing from log')
x,y,w,h,reserved=map(int,m.groups())
H,W=before.shape[:2]
x2=min(W,x+w); y2=min(H,y+h)
if x<0 or y<0 or x2<=x or y2<=y:
    raise SystemExit(f'invalid overlay bounds {(x,y,w,h)} for {(W,H)}')

def pixel_mask(a,b,threshold=12):
    return np.max(np.abs(a-b),axis=2)>threshold

# The overlay-only frame is captured after the QA harness cancels the RE heads-up notification.
# Comparing it with the pre-trigger frame isolates the character pixels directly.
overlay_mask=pixel_mask(mid,before)
roi=overlay_mask[y:y2,x:x2]
overlay_pixels=int(roi.sum())
occupancy=float(roi.mean()) if roi.size else 1.0
outside=overlay_mask.copy(); outside[y:y2,x:x2]=False
outside_pixels=int(outside.sum())

# A solid rectangular window/background would change almost every pixel in its box.
# The transparent 2.5D character should remain materially sparse, with unchanged corners.
corner=max(4,min(18,w//12,h//12))
corner_ratios=[
    float(roi[:corner,:corner].mean()),
    float(roi[:corner,-corner:].mean()),
    float(roi[-corner:,:corner].mean()),
    float(roi[-corner:,-corner:].mean()),
]
transparent_pass=overlay_pixels>1200 and occupancy<0.82

# Heads-up evidence is the early-vs-before change strictly above the reserved overlay Y.
early_delta=pixel_mask(early,before)
top=early_delta[:y,:]
heads_up_pixels=int(top.sum())
ys,xs=np.where(top)
heads_up_bbox=None if len(xs)==0 else [int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
heads_up_pass=heads_up_pixels>500
non_overlap_pass=heads_up_pass and y>=reserved and (heads_up_bbox is None or heads_up_bbox[3] <= y)

# After cleanup, the overlay rectangle should return close to the pre-trigger image.
cleanup_diff=np.abs(after[y:y2,x:x2]-before[y:y2,x:x2])
cleanup_mean=float(cleanup_diff.mean()) if cleanup_diff.size else 999.0
cleanup_changed=float((np.max(cleanup_diff,axis=2)>12).mean()*100.0) if cleanup_diff.size else 100.0
cleanup_pass=cleanup_mean<2.0 and cleanup_changed<1.0

report_text=(root/'runtime-report.txt').read_text(errors='replace')
dur_match=re.search(r'animation_duration_ms=(\d+)',report_text)
duration=int(dur_match.group(1)) if dur_match else 0
duration_pass=5000<=duration<=6200
functional_keys=[
 'candidate_storage=PASS','heads_up_notification=PASS','new_subscription_classification=PASS',
 'overlay_requested=PASS','overlay_cleanup=PASS','existing_service_no_overlay=PASS',
 'concierge_off_fallback=PASS','permission_denied_fallback=PASS','crash_anr=PASS','result=PASS'
]
functional_pass=all(k in report_text for k in functional_keys)

report={
 'overlay_bounds':{'x':x,'y':y,'w':w,'h':h,'reservedTopPx':reserved},
 'overlay_pixels':overlay_pixels,
 'overlay_occupancy':occupancy,
 'corner_change_ratios':corner_ratios,
 'outside_overlay_changed_pixels':outside_pixels,
 'transparent_background_pass':transparent_pass,
 'heads_up_pixels_above_overlay':heads_up_pixels,
 'heads_up_bbox':heads_up_bbox,
 'heads_up_non_overlap_pass':non_overlap_pass,
 'cleanup_mean_abs':cleanup_mean,
 'cleanup_changed_pct':cleanup_changed,
 'cleanup_visual_pass':cleanup_pass,
 'animation_duration_ms':duration,
 'animation_duration_pass':duration_pass,
 'functional_pass':functional_pass,
}
report['pass']=all([
    report['transparent_background_pass'],report['heads_up_non_overlap_pass'],
    report['cleanup_visual_pass'],report['animation_duration_pass'],report['functional_pass']
])
Path('e2e-2.5d/visual-functional-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
if not report['pass']:
    sys.exit(1)
PY

echo "V203_2_5D_E2E=PASS" | tee e2e-2.5d/result.txt
