import test from "node:test";
import assert from "node:assert/strict";
import { POPULAR_SERVICE_SHORTCUTS } from "../src/data/popularServiceShortcuts.js";

test("구독 추가 화면의 자주 쓰는 서비스 shortcut은 9개이며 가격을 포함하지 않는다", () => {
  assert.equal(POPULAR_SERVICE_SHORTCUTS.length, 9);

  const ids = POPULAR_SERVICE_SHORTCUTS.map((item) => item.id);

  assert.ok(ids.includes("netflix"));
  assert.ok(ids.includes("youtube"));
  assert.ok(ids.includes("coupang"));
  assert.ok(ids.includes("tving"));
  assert.ok(ids.includes("disney"));
  assert.ok(ids.includes("spotify"));
  assert.ok(ids.includes("chatgpt"));
  assert.ok(ids.includes("naver"));
  assert.ok(ids.includes("millie"));

  for (const item of POPULAR_SERVICE_SHORTCUTS) {
    assert.equal("amount" in item, false);
    assert.equal("plan" in item, false);
    assert.equal("paymentMethod" in item, false);
  }
});
