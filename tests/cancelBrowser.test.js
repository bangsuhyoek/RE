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
