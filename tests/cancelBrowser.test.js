import test from "node:test";
import assert from "node:assert/strict";
import {
  openCancelBrowser,
  normalizeCancelFlowResult,
  decideCancelTopCard,
  hasMoneyRelevantWarning,
  getCancelGuidanceCopy,
  NATIVE_GUIDE_SUPPORTED_SERVICES,
  isNativeGuideSupported,
  canShowManualComplete,
  isAutoCancelDetectionAvailable,
} from "../src/lib/cancelBrowser.js";

test("웹/테스트 환경에서 openCancelBrowser 호출 시 FALLBACK_WEB을 반환한다", async () => {
  const result = await openCancelBrowser({
    serviceId: "netflix",
    serviceName: "Netflix",
    cancelUrl: "https://www.netflix.com/cancelplan",
    guideSteps: [],
  });

  assert.deepEqual(result, { action: "FALLBACK_WEB" });
});

test("해지 완료 시 구독 ID 또는 구독 객체 모두 안전하게 식별하여 목록에서 제거한다", () => {
  const subs = [
    { subscriptionId: "sub-1", name: "Netflix", amount: 17000 },
    { subscriptionId: "sub-2", name: "Spotify", amount: 10900 },
  ];

  const finishCancellationHelper = (list, targetOrId, savedAmount) => {
    const subId = typeof targetOrId === "object" && targetOrId !== null
      ? (targetOrId.subscriptionId || targetOrId.id)
      : targetOrId;
    const target = list.find((s) => s.subscriptionId === subId || s.id === subId);
    if (!target) return { list, saved: 0 };
    const saved = savedAmount ?? (typeof targetOrId === "object" ? targetOrId.amount : target.amount);
    return {
      list: list.filter((s) => s.subscriptionId !== target.subscriptionId),
      saved,
    };
  };

  // 1. 문자열 ID 전달 케이스
  const res1 = finishCancellationHelper(subs, "sub-1", 17000);
  assert.equal(res1.list.length, 1);
  assert.equal(res1.list[0].subscriptionId, "sub-2");
  assert.equal(res1.saved, 17000);

  // 2. 객체 전달 케이스 (하위 호환)
  const res2 = finishCancellationHelper(subs, { subscriptionId: "sub-2", amount: 10900 });
  assert.equal(res2.list.length, 1);
  assert.equal(res2.list[0].subscriptionId, "sub-1");
  assert.equal(res2.saved, 10900);
});

test("직접 웹사이트 해지 시 autoOpen 플래그가 정상 설정되어 즉시 이동을 지원한다", () => {
  const subs = [
    { subscriptionId: "sub-netflix", id: "netflix", name: "Netflix", cancelUrl: "https://www.netflix.com/cancelplan" },
  ];

  let cancelTarget = null;
  const startCancellation = (subscriptionId, promotion = null, options = {}) => {
    const target = subs.find((s) => s.subscriptionId === subscriptionId || s.id === subscriptionId);
    if (!target) return;
    cancelTarget = {
      id: target.subscriptionId,
      subscription: target,
      promotion,
      autoOpen: Boolean(options?.autoOpen),
    };
  };

  startCancellation("sub-netflix", null, { autoOpen: true });
  assert.ok(cancelTarget);
  assert.equal(cancelTarget.autoOpen, true);
  assert.equal(cancelTarget.subscription.cancelUrl, "https://www.netflix.com/cancelplan");
});

test("보안 제한을 준수하는 게임 튜토리얼 위치 가이드 앵커가 올바르게 정의되어 있다", () => {
  const TUTORIAL_HINTS = [
    { step: 1, locationBadge: "📍 목표 위치: 화면 중앙 로그인 창" },
    { step: 2, locationBadge: "📍 목표 위치: 화면 우측 상단 프로필 / 메뉴 (↗)" },
    { step: 3, locationBadge: "📍 목표 위치: 페이지 하단 스크롤 영역 (⬇)" },
    { step: 4, locationBadge: "📍 목표 위치: 혜택 제안 넘긴 후 최종 완료 팝업 (✓)" },
  ];

  assert.equal(TUTORIAL_HINTS.length, 4);
  assert.match(TUTORIAL_HINTS[0].locationBadge, /화면 중앙/);
  assert.match(TUTORIAL_HINTS[1].locationBadge, /우측 상단/);
  assert.match(TUTORIAL_HINTS[1].locationBadge, /우측 상단/);
  assert.match(TUTORIAL_HINTS[2].locationBadge, /하단 스크롤/);
  assert.match(TUTORIAL_HINTS[3].locationBadge, /최종 완료/);
});

test("NATIVE_GUIDE_SUPPORTED_SERVICES 및 isNativeGuideSupported가 올바르게 동작한다", () => {
  assert.ok(Array.isArray(NATIVE_GUIDE_SUPPORTED_SERVICES));
  assert.ok(NATIVE_GUIDE_SUPPORTED_SERVICES.includes("netflix"));
  assert.ok(NATIVE_GUIDE_SUPPORTED_SERVICES.includes("youtube"));
  assert.ok(NATIVE_GUIDE_SUPPORTED_SERVICES.includes("naverplus"));

  assert.equal(isNativeGuideSupported("netflix"), true);
  assert.equal(isNativeGuideSupported("youtube"), true);
  assert.equal(isNativeGuideSupported("naverplus"), true);
  assert.equal(isNativeGuideSupported("naver"), true);
  assert.equal(isNativeGuideSupported("spotify"), false);
  assert.equal(isNativeGuideSupported(""), false);
  assert.equal(isNativeGuideSupported(null), false);
});

test("normalizeCancelFlowResult: 정상 결과 객체(url, text, manual)를 검증 및 정규화한다", () => {
  const completedRaw = {
    serviceId: "netflix",
    status: "completed",
    detectedBy: "url",
    url: "https://www.netflix.com/youraccount",
    proofPath: "/data/user/0/kr.kkudok/proof_netflix.png",
    proofWebPath: "http://localhost/_capacitor_file_/data/user/0/kr.kkudok/proof_netflix.png",
    autoTaps: 4,
  };

  const normCompleted = normalizeCancelFlowResult(completedRaw);
  assert.ok(normCompleted);
  assert.equal(normCompleted.serviceId, "netflix");
  assert.equal(normCompleted.status, "completed");
  assert.equal(normCompleted.detectedBy, "url");
  assert.equal(normCompleted.url, "https://www.netflix.com/youraccount");
  assert.equal(normCompleted.proofPath, "/data/user/0/kr.kkudok/proof_netflix.png");
  assert.equal(normCompleted.proofWebPath, "http://localhost/_capacitor_file_/data/user/0/kr.kkudok/proof_netflix.png");
  assert.equal(normCompleted.autoTaps, 4);
  assert.equal(normCompleted.action, "COMPLETED");

  // text detectedBy
  const textRaw = {
    serviceId: "youtube",
    status: "completed",
    detectedBy: "text",
    url: "https://youtube.com/paid_memberships",
    autoTaps: 2,
  };
  const normText = normalizeCancelFlowResult(textRaw);
  assert.equal(normText.detectedBy, "text");
  assert.equal(normText.proofPath, null);

  // manual detectedBy (사용자가 최종 해지 버튼을 직접 누른 경우 등)
  const manualRaw = {
    serviceId: "netflix",
    status: "completed",
    detectedBy: "manual",
    url: "https://www.netflix.com/cancelplan",
    autoTaps: 3,
  };
  const normManual = normalizeCancelFlowResult(manualRaw);
  assert.ok(normManual);
  assert.equal(normManual.detectedBy, "manual");
  assert.equal(normManual.status, "completed");

  // closed status
  const closedRaw = {
    serviceId: "netflix",
    status: "closed",
    detectedBy: null,
    url: "https://www.netflix.com",
    autoTaps: 1,
  };
  const normClosed = normalizeCancelFlowResult(closedRaw);
  assert.ok(normClosed);
  assert.equal(normClosed.status, "closed");
  assert.equal(normClosed.action, "CLOSED");

  // 하위 호환: status 누락 시 action: "COMPLETED" 또는 "CLOSED"로부터 status 매핑
  const legacyCompleted = normalizeCancelFlowResult({ serviceId: "netflix", action: "COMPLETED" });
  assert.equal(legacyCompleted.status, "completed");
  assert.equal(legacyCompleted.action, "COMPLETED");

  const legacyClosed = normalizeCancelFlowResult({ serviceId: "netflix", action: "CLOSED" });
  assert.equal(legacyClosed.status, "closed");
  assert.equal(legacyClosed.action, "CLOSED");

  // status와 action이 모두 전달될 때: status가 우선하며 action도 정상 포함됨
  const both = normalizeCancelFlowResult({ serviceId: "naver", status: "completed", action: "COMPLETED" });
  assert.equal(both.status, "completed");
  assert.equal(both.action, "COMPLETED");
});

test("normalizeCancelFlowResult: 알 수 없거나 잘못된 형태의 결과는 null을 반환한다", () => {
  assert.equal(normalizeCancelFlowResult(null), null);
  assert.equal(normalizeCancelFlowResult(undefined), null);
  assert.equal(normalizeCancelFlowResult("completed"), null);
  assert.equal(normalizeCancelFlowResult(123), null);
  assert.equal(normalizeCancelFlowResult([]), null);
  assert.equal(normalizeCancelFlowResult({}), null);
  assert.equal(normalizeCancelFlowResult({ status: "in_progress" }), null);
  assert.equal(normalizeCancelFlowResult({ status: "unknown" }), null);
  assert.equal(normalizeCancelFlowResult({ action: "PENDING" }), null);
});

test("decideCancelTopCard: 모달 상단 노출 카드 상태를 올바르게 결정한다", () => {
  // 1. 이미 완료 축하 상태이거나 status가 completed인 경우
  assert.equal(decideCancelTopCard({ celebrating: true }), "celebration");
  assert.equal(decideCancelTopCard({ flowStatus: "completed" }), "celebration");

  // 2. 사용자가 브라우저에서 닫고 돌아왔거나 세션 진행 후 복귀한 경우 -> 확인 질문 카드
  assert.equal(
    decideCancelTopCard({
      flowStatus: "closed",
      userDismissedQuestion: false,
    }),
    "completion_question"
  );
  assert.equal(
    decideCancelTopCard({
      cancelSessionActive: true,
      hasReturnedFromCancel: true,
      userDismissedQuestion: false,
    }),
    "completion_question"
  );

  // 3. 질문 카드를 '아직이에요'로 닫은 경우 -> 일반 액션 대기 상태
  assert.equal(
    decideCancelTopCard({
      flowStatus: "closed",
      userDismissedQuestion: true,
    }),
    "action_ready"
  );
  assert.equal(
    decideCancelTopCard({
      cancelSessionActive: true,
      hasReturnedFromCancel: true,
      userDismissedQuestion: true,
    }),
    "action_ready"
  );

  // 4. 최초 진입 기본 상태
  assert.equal(decideCancelTopCard(), "action_ready");
});

test("hasMoneyRelevantWarning: 잔여일 소멸 또는 위약금 발생 시 true를 반환한다", () => {
  assert.equal(hasMoneyRelevantWarning({ kind: "immediate_loss" }), true);
  assert.equal(hasMoneyRelevantWarning({ kind: "penalty" }), true);

  assert.equal(hasMoneyRelevantWarning({ kind: "keep_until" }), false);
  assert.equal(hasMoneyRelevantWarning({ kind: "prorated_refund" }), false);
  assert.equal(hasMoneyRelevantWarning({ kind: "trial" }), false);
  assert.equal(hasMoneyRelevantWarning({ kind: "unknown" }), false);
  assert.equal(hasMoneyRelevantWarning(null), false);
  assert.equal(hasMoneyRelevantWarning(undefined), false);
});

test("getCancelGuidanceCopy: Android 네이티브에서만 자동 진행 문구가 노출되고 iOS/웹에서는 방어 문구가 노출된다", () => {
  // 1. Android 네이티브 + 자동 위치 안내 지원 서비스 (넷플릭스, 유튜브, 네이버) -> 자동 안내 문구
  const netflixAndroid = getCancelGuidanceCopy({
    serviceId: "netflix",
    channel: "service",
    platform: "android",
    targetName: "Netflix",
  });
  assert.equal(netflixAndroid, "꾸독이 해지 화면까지 데려가요. 마지막 해지 버튼만 직접 눌러 주세요.");

  const youtubeAndroid = getCancelGuidanceCopy({
    serviceId: "youtube",
    channel: "service",
    platform: "android",
    targetName: "YouTube",
  });
  assert.equal(youtubeAndroid, "꾸독이 해지 화면까지 데려가요. 마지막 해지 버튼만 직접 눌러 주세요.");

  // 2. iOS 환경 (Capacitor.isNativePlatform()이 true여도 platform이 ios이면 자동 진행 문구 노출 금지)
  const netflixIos = getCancelGuidanceCopy({
    serviceId: "netflix",
    channel: "service",
    platform: "ios",
    targetName: "Netflix",
  });
  assert.match(netflixIos, /꾸독은 비밀번호를 받거나 대신 해지하지 않아요/);
  assert.match(netflixIos, /Netflix 화면에서 해지가 끝난 걸 확인한 뒤/);

  // 3. 웹 환경
  const netflixWeb = getCancelGuidanceCopy({
    serviceId: "netflix",
    channel: "service",
    platform: "web",
    targetName: "Netflix",
  });
  assert.match(netflixWeb, /꾸독은 비밀번호를 받거나 대신 해지하지 않아요/);
  assert.match(netflixWeb, /Netflix 화면에서 해지가 끝난 걸 확인한 뒤/);

  // 4. Android 네이티브이지만 미지원 서비스(스포티파이)
  const spotifyAndroid = getCancelGuidanceCopy({
    serviceId: "spotify",
    channel: "service",
    platform: "android",
    targetName: "Spotify",
  });
  assert.match(spotifyAndroid, /꾸독은 비밀번호를 받거나 대신 해지하지 않아요/);
  assert.match(spotifyAndroid, /Spotify 화면에서 해지가 끝난 걸 확인한 뒤/);

  // 5. 스토어 및 계좌이체 채널
  const gplay = getCancelGuidanceCopy({ channel: "google_play", platform: "android" });
  assert.match(gplay, /Google Play/);

  const appstore = getCancelGuidanceCopy({ channel: "app_store", platform: "ios" });
  assert.match(appstore, /Apple/);

  const cardAutopay = getCancelGuidanceCopy({ channel: "card_autopay", platform: "android" });
  assert.match(cardAutopay, /어카운트인포/);
});


test("canShowManualComplete: Naver Plus는 웹/비Android에서 수동 완료 버튼을 노출하고 Android 네이티브에서는 숨긴다", () => {
  // 웹 환경: Naver Plus라도 자동 감지가 불가하므로 수동 완료 버튼 노출
  assert.equal(
    canShowManualComplete({ serviceId: "naverplus", isNaverPlus: true, platform: "web" }),
    true
  );
  assert.equal(
    canShowManualComplete({ serviceId: "naver", isNaverPlus: true, platform: "web" }),
    true
  );

  // iOS 환경: Naver Plus라도 자동 감지가 불가하므로 수동 완료 버튼 노출
  assert.equal(
    canShowManualComplete({ serviceId: "naverplus", isNaverPlus: true, platform: "ios", isNativePlatform: true }),
    true
  );

  // Android 네이티브: Naver Plus는 자동 감지가 동작하므로 수동 완료 버튼 숨김
  assert.equal(
    canShowManualComplete({ serviceId: "naverplus", isNaverPlus: true, platform: "android", isNativePlatform: true }),
    false
  );
  assert.equal(
    canShowManualComplete({ serviceId: "naver", isNaverPlus: false, platform: "android", isNativePlatform: true }),
    false
  );

  // 기타 서비스(Netflix, Spotify 등): 모든 환경에서 수동 완료 가능
  assert.equal(
    canShowManualComplete({ serviceId: "netflix", isNaverPlus: false, platform: "android", isNativePlatform: true }),
    true
  );
  assert.equal(
    canShowManualComplete({ serviceId: "netflix", isNaverPlus: false, platform: "web" }),
    true
  );
});
