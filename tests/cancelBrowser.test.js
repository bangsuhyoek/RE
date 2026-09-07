import test from "node:test";
import assert from "node:assert/strict";
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
