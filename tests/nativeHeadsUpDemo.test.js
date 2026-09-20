import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const pluginSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "android/app/src/main/java/com/submate/app/HeadsUpDemoPlugin.java"
  ),
  "utf8"
);
const mainActivitySource = fs.readFileSync(
  path.join(
    process.cwd(),
    "android/app/src/main/java/com/submate/app/MainActivity.java"
  ),
  "utf8"
);
const setupModalSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/NotificationSetupModal.jsx"),
  "utf8"
);

test("Android Heads-up 체험 플러그인이 MainActivity에 등록되어 있다", () => {
  assert.match(mainActivitySource, /registerPlugin\(HeadsUpDemoPlugin\.class\)/);
});

test("설정 완료 후 Android 홈 런처로 이동하고 2~3초 범위에서 알림을 띄운다", () => {
  assert.match(pluginSource, /Intent\.ACTION_MAIN/);
  assert.match(pluginSource, /Intent\.CATEGORY_HOME/);
  assert.match(pluginSource, /Intent\.FLAG_ACTIVITY_NEW_TASK/);
  assert.doesNotMatch(pluginSource, /moveTaskToBack\(true\)/);
  assert.match(pluginSource, /DEFAULT_DELAY_MS = 2500/);
  assert.match(pluginSource, /Math\.max\(2000, Math\.min\(requestedDelay, 3000\)\)/);
});

test("체험 알림은 Heads-up에 필요한 HIGH 중요도와 우선순위를 사용한다", () => {
  assert.match(pluginSource, /NotificationManager\.IMPORTANCE_HIGH/);
  assert.match(pluginSource, /NotificationCompat\.PRIORITY_HIGH/);
  assert.match(pluginSource, /CHANNEL_ID = "submate-billing-channel"/);
});

test("알림 설정 화면은 홈 화면 2.5초 Heads-up 체험을 명시한다", () => {
  assert.match(setupModalSource, /홈 화면으로 내려가고 약 2\.5초 뒤 기존 스타일의 Heads-up 알림/);
  assert.doesNotMatch(setupModalSource, /3~5초/);
});
