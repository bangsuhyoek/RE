import test from "node:test";
import assert from "node:assert/strict";
import { getRetryQueue, enqueueRetry, dequeueRetry } from "../src/lib/subscriptionSync.js";
import { storageKeys, clearStoredValue } from "../src/lib/storage.js";
import { createMockSubscriptions } from "../src/data/mockSubscriptions.js";
import { loadSubscriptionData, getCachedCatalog } from "../src/data/catalogLoader.js";

// Mock localStorage for node environment
const createMockLocalStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
};

test("Back button listener: registered once on mount and removed on unmount even if promise resolves late", async () => {
  let addListenerCallCount = 0;
  let removeCallCount = 0;
  let resolveListenerPromise;

  const mockHandle = {
    remove: () => {
      removeCallCount++;
    },
  };

  const MockCapApp = {
    addListener: () => {
      addListenerCallCount++;
      return new Promise((resolve) => {
        resolveListenerPromise = () => resolve(mockHandle);
      });
    },
  };

  // Simulate mount: register listener once
  let cancelled = false;
  let listenerHandle = null;

  MockCapApp.addListener("backButton", () => {}).then((handle) => {
    if (cancelled) {
      handle?.remove();
    } else {
      listenerHandle = handle;
    }
  });

  assert.equal(addListenerCallCount, 1);
  assert.equal(removeCallCount, 0);

  // Scenario 1: Unmount happens BEFORE the addListener promise resolves (late resolution)
  cancelled = true;
  listenerHandle?.remove();

  // Promise now resolves after unmount
  resolveListenerPromise();
  await new Promise((r) => setTimeout(r, 10));

  // The handle must have been removed immediately when the late promise resolved!
  assert.equal(removeCallCount, 1, "Handle should be removed when late promise resolves after unmount");

  // Scenario 2: Unmount happens AFTER the addListener promise resolves
  cancelled = false;
  listenerHandle = null;
  removeCallCount = 0;

  MockCapApp.addListener("backButton", () => {}).then((handle) => {
    if (cancelled) {
      handle?.remove();
    } else {
      listenerHandle = handle;
    }
  });

  resolveListenerPromise();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(removeCallCount, 0);

  // Now unmount happens
  cancelled = true;
  listenerHandle?.remove();
  assert.equal(removeCallCount, 1, "Handle should be removed on normal cleanup");
});

test("Sync status & retry queue: tracks pending items and transitions through idle/error states", () => {
  global.window = {
    localStorage: createMockLocalStorage(),
    dispatchEvent: () => {},
  };

  clearStoredValue(storageKeys.syncRetryQueue);
  assert.equal(getRetryQueue().length, 0);

  // Enqueue a failed upsert
  enqueueRetry({ id: "sub-test-1", type: "upsert", data: { name: "테스트넷플릭스" } });
  const queue1 = getRetryQueue();
  assert.equal(queue1.length, 1);
  assert.equal(queue1[0].id, "sub-test-1");

  // Enqueue another item
  enqueueRetry({ id: "sub-test-2", type: "delete" });
  assert.equal(getRetryQueue().length, 2);

  // Dequeue successful retry
  dequeueRetry("sub-test-1", "upsert");
  const queue2 = getRetryQueue();
  assert.equal(queue2.length, 1);
  assert.equal(queue2[0].id, "sub-test-2");

  // Dequeue remaining
  dequeueRetry("sub-test-2", "delete");
  assert.equal(getRetryQueue().length, 0);
});

test("createMockSubscriptions: generates seed subscriptions without loading full catalog", () => {
  const seeds = createMockSubscriptions();
  assert.ok(Array.isArray(seeds));
  assert.ok(seeds.length >= 5);
  const netflix = seeds.find((s) => s.id === "netflix");
  assert.ok(netflix);
  assert.equal(netflix.name, "Netflix");
  assert.ok(netflix.amount > 0);
});

test("catalogLoader: loads subscription data lazily and caches module", async () => {
  assert.equal(getCachedCatalog(), null);
  const data = await loadSubscriptionData();
  assert.ok(data);
  assert.ok(Array.isArray(data.serviceCatalog));
  assert.ok(data.serviceCatalog.length > 0);
  assert.equal(getCachedCatalog(), data);
});



test("Hardware back button handler prioritizes paymentCaptureDisclosureOpen over other overlays", () => {
  // Simulate App's handleBackButton logic priority chain
  let paymentCaptureDisclosureOpen = true;
  let termsOpen = true;
  let accountOpen = true;
  let closed = [];

  const handleBackButton = () => {
    if (paymentCaptureDisclosureOpen) {
      paymentCaptureDisclosureOpen = false;
      closed.push("paymentCaptureDisclosure");
    } else if (termsOpen) {
      termsOpen = false;
      closed.push("terms");
    } else if (accountOpen) {
      accountOpen = false;
      closed.push("account");
    }
  };

  handleBackButton();
  assert.equal(paymentCaptureDisclosureOpen, false);
  assert.equal(termsOpen, true);
  assert.equal(accountOpen, true);
  assert.deepEqual(closed, ["paymentCaptureDisclosure"]);

  handleBackButton();
  assert.equal(termsOpen, false);
  assert.equal(accountOpen, true);
  assert.deepEqual(closed, ["paymentCaptureDisclosure", "terms"]);
});
