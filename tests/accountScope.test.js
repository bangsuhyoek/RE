import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  shouldClearUserDataOnAccountSwitch,
} from "../src/lib/storage.js";

test("알림 기록·순환 계획 정리는 실사용자 A→B 전환에서만 수행한다", () => {
  assert.equal(shouldClearUserDataOnAccountSwitch("user:user-a", "user:user-b"), true);
  assert.equal(shouldClearUserDataOnAccountSwitch("guest", "user:user-b"), false);
  assert.equal(shouldClearUserDataOnAccountSwitch("guest", "signed-out"), false);
  assert.equal(shouldClearUserDataOnAccountSwitch("user:user-a", "signed-out"), false);
});

test("비자발적 SIGNED_OUT 경로는 사용자 데이터를 지우지 않고 로그아웃 토스트는 최상위에 남는다", () => {
  const source = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const start = source.indexOf('event === "SIGNED_OUT"');
  const end = source.indexOf("setProfile(null);", start);
  const involuntaryBlock = source.slice(start, end);

  assert.match(involuntaryBlock, /explicitLogoutInProgressRef/);
  assert.doesNotMatch(involuntaryBlock, /clearUserScopedData|clearLocalAccountData|clearAllCancelProofs|clearAll\(/);
  assert.match(source, /onAccountToast\?\.\("로그아웃되었습니다\."\)/);
  assert.match(source, /onAccountToast\?\.\("로그아웃하지 못했어요/);
  assert.match(source, /<Toast toast=\{accountToast\}/);
});
