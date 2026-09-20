import test from "node:test";
import assert from "node:assert/strict";
import {
  getNotificationSetupIdentity,
  shouldShowNotificationSetup,
} from "../src/lib/notificationSetup.js";

test("로컬 계정과 구글 계정은 안정적인 알림 설정 식별자를 만든다", () => {
  assert.equal(
    getNotificationSetupIdentity({ accountId: "User_01", provider: "꾸독" }),
    "local:user_01"
  );
  assert.equal(
    getNotificationSetupIdentity({ user_id: "google-user-1", provider: "Google" }),
    "google:google-user-1"
  );
});

test("최초 로그인 사용자는 알림 설정 안내 대상이다", () => {
  assert.equal(
    shouldShowNotificationSetup({
      profile: { accountId: "new-user" },
      permission: "default",
      record: null,
      seenThisSession: false,
    }),
    true
  );
});

test("설정을 완료하고 권한이 허용된 사용자는 반복 안내하지 않는다", () => {
  assert.equal(
    shouldShowNotificationSetup({
      profile: { accountId: "ready-user" },
      permission: "granted",
      record: { completed: true },
      seenThisSession: false,
    }),
    false
  );
});

test("기존 사용자라도 브라우저 알림이 차단되면 로그인 세션에서 다시 안내한다", () => {
  assert.equal(
    shouldShowNotificationSetup({
      profile: { accountId: "blocked-user" },
      permission: "denied",
      record: { completed: true },
      seenThisSession: false,
    }),
    true
  );
});

test("같은 로그인 세션에서는 권한 안내를 중복해서 띄우지 않는다", () => {
  assert.equal(
    shouldShowNotificationSetup({
      profile: { accountId: "blocked-user" },
      permission: "denied",
      record: { completed: true },
      seenThisSession: true,
    }),
    false
  );
});
