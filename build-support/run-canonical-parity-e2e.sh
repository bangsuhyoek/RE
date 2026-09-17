#!/usr/bin/env bash
set -euo pipefail

ARTIFACT_DIR="${1:?artifact dir required}"
GOLDEN_APK="${2:?golden apk required}"
QA_APK="${3:?qa instrumentation apk required}"
TARGET="kr.co.re.subscription"
QA_PACKAGE="com.re.cardtest"
LISTENER="$TARGET/kr.co.re.subscription.payment.PaymentNotificationListener"
REBUILT_APK=$(find "$ARTIFACT_DIR" -type f -name canonical-baseline.apk -print -quit)
EVIDENCE_DIR="/sdcard/Android/data/$TARGET/files/parity"

test -n "$REBUILT_APK"
test -s "$REBUILT_APK"
test -s "$GOLDEN_APK"
test -s "$QA_APK"

mkdir -p e2e/golden e2e/rebuilt

declare -A CASE_FAILURES

wait_for_emulator() {
  adb wait-for-device
  local booted=0
  for _ in $(seq 1 90); do
    if [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; then
      booted=1
      break
    fi
    sleep 2
  done
  test "$booted" -eq 1
  adb shell pm list packages >/dev/null
  adb shell getprop ro.build.version.release | tee e2e/emulator-android-version.txt
  adb shell wm size | tee e2e/emulator-size.txt
  adb shell wm density | tee e2e/emulator-density.txt
}

configure_system_ui() {
  adb shell settings put global window_animation_scale 0 || true
  adb shell settings put global transition_animation_scale 0 || true
  adb shell settings put global animator_duration_scale 0 || true
  adb shell settings put system font_scale 1.0 || true
  adb shell settings put system system_locales ko-KR || true
  adb shell settings put global sysui_demo_allowed 1 || true
  adb shell am broadcast -a com.android.systemui.demo -e command enter >/dev/null 2>&1 || true
  adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 1012 >/dev/null 2>&1 || true
  adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false >/dev/null 2>&1 || true
  adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4 >/dev/null 2>&1 || true
}

collect_qa_evidence() {
  local out="$1"
  mkdir -p "$out/screens"
  adb shell ls -la "$EVIDENCE_DIR" > "$out/evidence-files.txt" 2>&1 || true
  for file in home.png subscriptions.png subscription-detail.png benefits.png notifications.png my-page.png runtime-report.txt; do
    local dest="$out/screens/$file"
    if adb pull "$EVIDENCE_DIR/$file" "$dest" >/dev/null 2>&1; then
      test -s "$dest" || rm -f "$dest"
    else
      rm -f "$dest"
    fi
  done
}

check_or_record_failure() {
  local label="$1"
  local message="$2"
  CASE_FAILURES[$label]="${CASE_FAILURES[$label]:-}${CASE_FAILURES[$label]:+; }$message"
  echo "CASE_GATE_FAIL[$label]=$message"
}

run_case() {
  local label="$1"
  local apk="$2"
  local out="e2e/$label"
  CASE_FAILURES[$label]=""

  adb uninstall "$TARGET" >/dev/null 2>&1 || true
  adb uninstall "$QA_PACKAGE" >/dev/null 2>&1 || true
  adb install "$apk" | tee "$out/install-target.txt"
  adb install "$QA_APK" | tee "$out/install-instrumentation.txt"
  adb shell pm grant "$QA_PACKAGE" android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true

  adb shell rm -rf "$EVIDENCE_DIR" >/dev/null 2>&1 || true

  configure_system_ui
  adb logcat -c

  if ! adb shell cmd notification allow_listener "$LISTENER"; then
    adb shell settings put secure enabled_notification_listeners "$LISTENER"
  fi
  sleep 2

  set +e
  adb shell am instrument -w "$QA_PACKAGE/.ParityInstrumentation" | tee "$out/instrumentation.txt"
  local inst_status=${PIPESTATUS[0]}
  set -e

  # Always collect evidence before evaluating gates. This deliberately lets the
  # rebuilt case run even when the Golden case exposes a known product-level
  # functional failure, so parity can be distinguished from functionality.
  collect_qa_evidence "$out"
  adb logcat -d -v time > "$out/logcat.txt"
  adb shell dumpsys package "$TARGET" > "$out/package.txt"
  adb shell dumpsys notification --noredact > "$out/notification.txt" || adb shell dumpsys notification > "$out/notification.txt"
  adb shell dumpsys activity activities > "$out/activity.txt"
  adb shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 || true
  adb pull /sdcard/window.xml "$out/window.xml" >/dev/null 2>&1 || true
  sha256sum "$apk" > "$out/apk.sha256"

  [ "$inst_status" -eq 0 ] || check_or_record_failure "$label" "instrumentation_exit=$inst_status"
  grep -q "RE_PARITY_RESULT=PASS" "$out/instrumentation.txt" || check_or_record_failure "$label" "instrumentation_result_not_pass"
  grep -q "listener connected" "$out/logcat.txt" || check_or_record_failure "$label" "listener_not_connected"
  grep -q "detected service=Netflix amount=17000" "$out/logcat.txt" || check_or_record_failure "$label" "payment_not_detected"
  grep -q "re_payment_candidates_v106_runtime" "$out/notification.txt" || check_or_record_failure "$label" "candidate_channel_missing"
  grep -q "결제 내역을 확인했어요" "$out/notification.txt" || check_or_record_failure "$label" "candidate_notification_missing"
  if grep -E "FATAL EXCEPTION|ANR in $TARGET|Process: $TARGET" "$out/logcat.txt"; then
    check_or_record_failure "$label" "crash_or_anr"
  fi

  for name in home subscriptions subscription-detail benefits notifications my-page; do
    test -s "$out/screens/$name.png" || check_or_record_failure "$label" "missing_screen_$name"
  done
  test -s "$out/screens/runtime-report.txt" || check_or_record_failure "$label" "missing_runtime_report"

  printf '%s\n' "${CASE_FAILURES[$label]}" > "$out/case-failures.txt"
}

wait_for_emulator
run_case golden "$GOLDEN_APK"
run_case rebuilt "$REBUILT_APK"

OVERALL_FAIL=0

if test -s e2e/golden/screens/runtime-report.txt && test -s e2e/rebuilt/screens/runtime-report.txt; then
  if ! diff -u e2e/golden/screens/runtime-report.txt e2e/rebuilt/screens/runtime-report.txt > e2e/runtime-report.diff; then
    cat e2e/runtime-report.diff
    echo "RUNTIME_REPORT_PARITY=FAIL"
    OVERALL_FAIL=1
  else
    echo "RUNTIME_REPORT_PARITY=PASS"
  fi
else
  echo "RUNTIME_REPORT_PARITY=UNAVAILABLE"
  OVERALL_FAIL=1
fi

set +e
python3 - <<'PY'
from pathlib import Path
from PIL import Image, ImageChops, ImageEnhance
import numpy as np, json, sys

names = ["home","subscriptions","subscription-detail","benefits","notifications","my-page"]
report = {"thresholds":{"changed_pct":0.05,"mean_abs":0.5,"rms":1.0},"screens":{},"pass":True}
for name in names:
    gp=Path("e2e/golden/screens")/(name+".png")
    rp=Path("e2e/rebuilt/screens")/(name+".png")
    if not gp.exists() or not rp.exists():
        report["screens"][name]={"pass":False,"reason":"missing"}
        report["pass"]=False
        continue
    g=np.asarray(Image.open(gp).convert("RGB"),dtype=np.int16)
    r=np.asarray(Image.open(rp).convert("RGB"),dtype=np.int16)
    if g.shape != r.shape:
        report["screens"][name]={"pass":False,"reason":"shape","golden":list(g.shape),"rebuilt":list(r.shape)}
        report["pass"]=False
        continue
    d=np.abs(g-r)
    pixel=np.max(d,axis=2)
    changed=float(np.mean(pixel>3)*100.0)
    mean_abs=float(np.mean(d))
    rms=float(np.sqrt(np.mean(np.square(d.astype(np.float64)))))
    ok=changed<=0.05 and mean_abs<=0.5 and rms<=1.0
    report["screens"][name]={"pass":ok,"changed_pct":changed,"mean_abs":mean_abs,"rms":rms,"max_abs":int(d.max())}
    report["pass"] = report["pass"] and ok

    diff=ImageChops.difference(Image.open(gp).convert("RGB"),Image.open(rp).convert("RGB"))
    if diff.getbbox():
        diff=ImageEnhance.Contrast(diff).enhance(4.0)
    diff.save(Path("e2e")/(f"diff-{name}.png"))

Path("e2e/visual-parity.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(report,ensure_ascii=False,indent=2))
if not report["pass"]:
    sys.exit(1)
PY
VISUAL_STATUS=$?
set -e
[ "$VISUAL_STATUS" -eq 0 ] || OVERALL_FAIL=1

set +e
python3 - <<'PY'
from pathlib import Path
import json, re, sys
out={}
for label in ("golden","rebuilt"):
    log=Path(f"e2e/{label}/logcat.txt").read_text(errors="replace") if Path(f"e2e/{label}/logcat.txt").exists() else ""
    notif=Path(f"e2e/{label}/notification.txt").read_text(errors="replace") if Path(f"e2e/{label}/notification.txt").exists() else ""
    rp=Path(f"e2e/{label}/screens/runtime-report.txt")
    runtime=rp.read_text(errors="replace") if rp.exists() else ""
    out[label]={
      "listener_connected": "listener connected" in log,
      "payment_detected": "detected service=Netflix amount=17000" in log,
      "candidate_notification": "re_payment_candidates_v106_runtime" in notif and "결제 내역을 확인했어요" in notif,
      "concierge_toggle": "concierge_toggle=PASS" in runtime,
      "deep_link_native_appUrlOpen": "deep_link_appUrlOpen=reapp://payment/candidate?id=baseline-smoke&source=parity-shell" in runtime,
      "deep_link_product_event": "deep_link=PASS" in runtime,
      "payment_candidate": "payment_candidate=PASS" in runtime,
      "crash_or_anr": bool(re.search(r"FATAL EXCEPTION|ANR in kr\.co\.re\.subscription|Process: kr\.co\.re\.subscription", log)),
    }
out["behavior_parity"] = all(out["golden"].get(k) == out["rebuilt"].get(k) for k in out["golden"])
out["functional_pass"]=all(
    v["listener_connected"] and v["payment_detected"] and v["candidate_notification"]
    and v["concierge_toggle"] and v["deep_link_native_appUrlOpen"] and v["deep_link_product_event"]
    and v["payment_candidate"] and not v["crash_or_anr"]
    for v in (out["golden"],out["rebuilt"])
)
Path("e2e/functional-parity.json").write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(out,ensure_ascii=False,indent=2))
if not out["functional_pass"]:
    sys.exit(1)
PY
FUNCTIONAL_STATUS=$?
set -e
[ "$FUNCTIONAL_STATUS" -eq 0 ] || OVERALL_FAIL=1

for label in golden rebuilt; do
  if [ -n "${CASE_FAILURES[$label]}" ]; then
    OVERALL_FAIL=1
  fi
done

if [ "$OVERALL_FAIL" -eq 0 ]; then
  echo "BASELINE_RUNTIME_PARITY=PASS" | tee e2e/result.txt
  exit 0
fi

echo "BASELINE_RUNTIME_PARITY=NOT_YET_PASS" | tee e2e/result.txt
exit 1
