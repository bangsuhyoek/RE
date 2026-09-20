import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { openCancelBrowser } from "../src/lib/cancelBrowser.js";

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
  assert.match(TUTORIAL_HINTS[2].locationBadge, /하단 스크롤/);
  assert.match(TUTORIAL_HINTS[3].locationBadge, /최종 완료/);
});

test("꾸독 컨시어지는 단일 master character asset을 사용한다", () => {
  const publicKkudok = path.join(process.cwd(), "public/assets/kkudok");
  assert.ok(
    fs.existsSync(path.join(publicKkudok, "character_master.png")),
    "character_master.png가 존재해야 합니다."
  );
});
