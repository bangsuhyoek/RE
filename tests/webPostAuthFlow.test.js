import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const appSource = fs.readFileSync(path.join(process.cwd(), "src/App.jsx"), "utf8");
const cancelSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/CancelBrowserModal.jsx"),
  "utf8"
);
const detailSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/SubscriptionDetailScreen.jsx"),
  "utf8"
);

test("로그인 후 알림 설정 모달과 3.5초 Heads-up 체험 흐름이 연결되어 있다", () => {
  assert.match(appSource, /NotificationSetupModal/);
  assert.match(appSource, /createWelcomeHeadsUpNotification/);
  assert.match(appSource, /}, 3500\);/);
  assert.match(appSource, /PushNotificationBanner/);
});

test("웹 해지 컨시어지는 공식 페이지 프레임 가능 여부를 서버에서 확인한다", () => {
  assert.match(cancelSource, /\/api\/frame-check\?url=/);
  assert.match(cancelSource, /<iframe/);
  assert.match(cancelSource, /공식 사이트의 보안 정책상 페이지를 꾸독 안에 직접 넣을 수 없어요/);
});

test("구독 상세의 해지 CTA는 공식 사이트를 먼저 새 탭으로 강제 오픈하지 않는다", () => {
  assert.match(
    detailSource,
    /onStartCancel\(subscription\.subscriptionId, promotion, \{ autoOpen: true \}\)/
  );
  assert.doesNotMatch(
    detailSource,
    /subscription\.cancelUrl[\s\S]{0,180}window\.open\(subscription\.cancelUrl[\s\S]{0,180}onStartCancel/
  );
});

test("웹 컨시어지는 사용자가 언제든 첫 단계부터 다시 볼 수 있다", () => {
  assert.match(cancelSource, />\s*처음부터\s*</);
});
