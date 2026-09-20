import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { POPULAR_SERVICE_SHORTCUTS } from "../src/data/popularServiceShortcuts.js";
import {
  CancellationGuideMode,
  CancellationSupport,
  getCancellationGuide,
  isAllowedCancellationUrl,
} from "../src/features/cancellation/cancellationGuideRegistry.js";
import {
  CancellationGuideStatus,
  cancellationGuideAllowsAutoTargeting,
  prepareCancellationGuide,
} from "../src/features/cancellation/cancellationGuideEngine.js";

const root = process.cwd();

const expectedPopularIds = [
  "netflix",
  "youtube",
  "coupang",
  "tving",
  "disney",
  "spotify",
  "chatgpt",
  "naver",
  "millie",
];

const supportedIds = [
  "netflix",
  "youtube",
  "coupang",
  "disney",
  "spotify",
  "chatgpt",
  "naver",
];

const deferredIds = ["tving", "millie"];

test("자주 사용하는 서비스 9개 모두 cancellation registry에서 조회된다", () => {
  assert.deepEqual(
    POPULAR_SERVICE_SHORTCUTS.map((service) => service.id),
    expectedPopularIds
  );

  for (const service of POPULAR_SERVICE_SHORTCUTS) {
    const guide = getCancellationGuide(service.id, service.name);
    assert.ok(guide, `${service.name} registry가 필요합니다.`);
  }
});

test("검증된 SUPPORTED / DEFERRED 분류가 명시적으로 유지된다", () => {
  for (const id of supportedIds) {
    const guide = getCancellationGuide(id);
    assert.equal(guide?.support, CancellationSupport.SUPPORTED, id);
    assert.ok(guide.entryUrl.startsWith("https://"), id);
    assert.ok(guide.officialSourceUrl.startsWith("https://"), id);
    assert.ok(guide.steps.length > 0, id);
  }

  for (const id of deferredIds) {
    const guide = getCancellationGuide(id);
    assert.equal(guide?.support, CancellationSupport.DEFERRED, id);
    assert.equal(guide.steps.length, 0, id);
  }
});

test("unknown service는 임의 공식 URL이나 단계로 승격되지 않는다", () => {
  const prepared = prepareCancellationGuide({
    id: "not-in-popular-list",
    name: "Unknown Service",
  });
  assert.equal(prepared.status, CancellationGuideStatus.UNKNOWN);
  assert.equal(prepared.supported, false);
  assert.equal(prepared.cancelUrl, "");
  assert.deepEqual(prepared.guideSteps, []);
  assert.equal(prepared.nativePayload, null);
});

test("DEFERRED 서비스는 기존 catalog URL이 있어도 verified cancellation URL로 노출하지 않는다", () => {
  for (const id of deferredIds) {
    const prepared = prepareCancellationGuide({ id });
    assert.equal(prepared.status, CancellationGuideStatus.DEFERRED, id);
    assert.equal(prepared.supported, false, id);
    assert.equal(prepared.cancelUrl, "", id);
    assert.deepEqual(prepared.guideSteps, [], id);
  }
});

test("official allowlist는 HTTPS exact/subdomain만 허용하고 look-alike와 HTTP를 차단한다", () => {
  const youtube = getCancellationGuide("youtube");
  assert.equal(
    isAllowedCancellationUrl(youtube, "https://www.youtube.com/paid_memberships"),
    true
  );
  assert.equal(
    isAllowedCancellationUrl(youtube, "https://accounts.google.com/signin"),
    true
  );
  assert.equal(
    isAllowedCancellationUrl(youtube, "https://support.google.com/youtube/answer/6308278"),
    true
  );
  assert.equal(
    isAllowedCancellationUrl(youtube, "http://www.youtube.com/paid_memberships"),
    false
  );
  assert.equal(
    isAllowedCancellationUrl(youtube, "https://youtube.com.evil.example/cancel"),
    false
  );
  assert.equal(
    isAllowedCancellationUrl(youtube, "https://evil-exampleyoutube.com/cancel"),
    false
  );
});

test("네이버만 AUTO_SEMANTIC이고 신규 지원 서비스는 검증된 manual official guide다", () => {
  const naver = getCancellationGuide("naver");
  assert.equal(naver.guideMode, CancellationGuideMode.AUTO_SEMANTIC);
  assert.equal(cancellationGuideAllowsAutoTargeting({ id: "naver" }), true);

  for (const id of supportedIds.filter((value) => value !== "naver")) {
    const guide = getCancellationGuide(id);
    assert.equal(guide.guideMode, CancellationGuideMode.MANUAL_OFFICIAL, id);
    assert.equal(cancellationGuideAllowsAutoTargeting({ id }), false, id);
  }
});

test("native payload에 official route contract가 손실 없이 포함된다", () => {
  const prepared = prepareCancellationGuide({ id: "netflix", name: "Netflix" });
  assert.equal(prepared.status, CancellationGuideStatus.SUPPORTED);
  assert.equal(prepared.nativePayload.serviceId, "netflix");
  assert.equal(prepared.nativePayload.cancelUrl, "https://www.netflix.com/cancelplan");
  assert.deepEqual(prepared.nativePayload.allowedDomains, ["netflix.com"]);
  assert.equal(prepared.nativePayload.guideMode, CancellationGuideMode.MANUAL_OFFICIAL);
  assert.match(prepared.nativePayload.officialSourceUrl, /^https:\/\/help\.netflix\.com\//);
});

test("지원 서비스는 로그인/결제 채널 상태를 명시하고 최종 실행은 사용자에게 남긴다", () => {
  for (const id of supportedIds) {
    const guide = getCancellationGuide(id);
    assert.equal(guide.requiresLogin, true, id);
    assert.ok(guide.billingChannel, id);
    const finalStep = guide.steps.at(-1);
    assert.match(
      `${finalStep.title} ${finalStep.description}`,
      /사용자|직접|확인/,
      id
    );
  }
});

test("native CancelBrowser가 allowlist와 guideMode를 실제 Activity까지 전달하고 강제한다", () => {
  const plugin = fs.readFileSync(
    path.join(root, "android/app/src/main/java/com/submate/app/CancelBrowserPlugin.java"),
    "utf8"
  );
  const activity = fs.readFileSync(
    path.join(root, "android/app/src/main/java/com/submate/app/CancelBrowserActivity.java"),
    "utf8"
  );
  const policy = fs.readFileSync(
    path.join(root, "android/app/src/main/java/com/submate/app/webguide/WebSecurityPolicy.java"),
    "utf8"
  );

  assert.match(plugin, /allowedDomainsJson/);
  assert.match(plugin, /guideMode/);
  assert.match(plugin, /officialSourceUrl/);
  assert.match(plugin, /fallbackOfficialUrl/);
  assert.match(activity, /new WebSecurityPolicy\(allowedDomains\)/);
  assert.match(activity, /isAllowedNavigation/);
  assert.match(activity, /공식 사이트 범위를 벗어나 이동을 중단했어요/);
  assert.match(activity, /MIXED_CONTENT_NEVER_ALLOW/);
  assert.match(policy, /"https"\.equals\(scheme\)/);
  assert.match(policy, /host\.equals\(normalized\) \|\| host\.endsWith\("\." \+ normalized\)/);
});

test("Naver semantic controller는 유지되고 자동 final click 코드는 추가되지 않는다", () => {
  const activity = fs.readFileSync(
    path.join(root, "android/app/src/main/java/com/submate/app/CancelBrowserActivity.java"),
    "utf8"
  );
  const controller = fs.readFileSync(
    path.join(root, "android/app/src/main/java/com/submate/app/webguide/KkudokNaverGuideController.java"),
    "utf8"
  );
  const webguideDir = path.join(
    root,
    "android/app/src/main/java/com/submate/app/webguide"
  );

  assert.match(activity, /AUTO_SEMANTIC/);
  assert.match(activity, /KkudokNaverGuideController/);
  assert.match(controller, /TargetResolution/);

  const javaSources = fs
    .readdirSync(webguideDir, { recursive: true })
    .filter((file) => String(file).endsWith(".java"))
    .map((file) => fs.readFileSync(path.join(webguideDir, file), "utf8"))
    .join("\n");

  assert.doesNotMatch(javaSources, /\.click\s*\(\s*\)/);
  assert.doesNotMatch(javaSources, /performClick\s*\(/);
});


test("신규 SUPPORTED 서비스별 official route가 고정 검증된다", () => {
  const expected = {
    netflix: "https://www.netflix.com/cancelplan",
    youtube: "https://www.youtube.com/paid_memberships",
    coupang: "https://loyalty.coupang.com/loyalty/management/home",
    disney: "https://www.disneyplus.com/account/cancel-subscription",
    spotify: "https://www.spotify.com/kr-ko/account/overview/",
    chatgpt: "https://chatgpt.com/",
    naver: "https://nid.naver.com/membership/subscribe",
  };

  for (const [id, url] of Object.entries(expected)) {
    const prepared = prepareCancellationGuide({ id });
    assert.equal(prepared.status, CancellationGuideStatus.SUPPORTED, id);
    assert.equal(prepared.cancelUrl, url, id);
    assert.equal(prepared.nativePayload.cancelUrl, url, id);
    assert.ok(prepared.nativePayload.officialSourceUrl.startsWith("https://"), id);
    assert.ok(prepared.nativePayload.fallbackOfficialUrl.startsWith("https://"), id);
  }
});
