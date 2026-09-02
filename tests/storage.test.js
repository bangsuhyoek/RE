import assert from "node:assert/strict";
import test from "node:test";
import { removeDemoSubscriptions } from "../src/lib/storage.js";

test("일반 사용자에게 저장된 기존 더미 구독만 제거한다", () => {
  const subscriptions = [
    { subscriptionId: "seed-netflix", name: "Netflix" },
    { subscriptionId: "manual-123", name: "티빙" },
    { subscriptionId: "onboard-spotify-123-0", name: "Spotify" },
  ];

  assert.deepEqual(removeDemoSubscriptions(subscriptions), [
    { subscriptionId: "manual-123", name: "티빙" },
    { subscriptionId: "onboard-spotify-123-0", name: "Spotify" },
  ]);
});
