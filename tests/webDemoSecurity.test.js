import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getApiEndpoint } from "../src/lib/apiBase.js";
import {
  MAX_OCR_REQUEST_BYTES,
  estimateOcrPayloadBytes,
  isOcrPayloadWithinLimit,
} from "../src/lib/ocrPayload.js";
import {
  CONTEST_DEMO_ACTIVE_KEY,
  contestDemoStorageKeys,
  isContestDemoActive,
  resetContestDemoStorage,
  setContestDemoActive,
  storageKeys,
  writeStoredValue,
} from "../src/lib/storage.js";

test("Web OCR uses same-origin /api/ocr when API base is empty", () => {
  assert.equal(getApiEndpoint("/api/ocr"), "/api/ocr");
});

test("OCR request guard stays below public function payload budget", () => {
  const payload = { imageBase64: "a".repeat(3_000_000), mimeType: "image/jpeg" };
  assert.equal(isOcrPayloadWithinLimit(payload), true);
  assert.ok(estimateOcrPayloadBytes(payload) < MAX_OCR_REQUEST_BYTES);
  const tooLarge = { imageBase64: "a".repeat(4_100_000), mimeType: "image/jpeg" };
  assert.equal(isOcrPayloadWithinLimit(tooLarge), false);
});

test("Vite config does not inject GEMINI_API_KEY into client define", () => {
  const source = fs.readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");
  assert.equal(source.includes('"import.meta.env.VITE_GEMINI_API_KEY"'), false);
  assert.equal(source.includes("JSON.stringify(geminiKey)"), false);
});

test("AddModal no longer uses direct browser Gemini fallback", () => {
  const source = fs.readFileSync(new URL("../src/components/AddModal.jsx", import.meta.url), "utf8");
  assert.equal(source.includes("recognizeDirectly"), false);
  assert.equal(source.includes("isDirectGeminiAvailable"), false);
  assert.match(source, /getApiEndpoint\("\/api\/ocr"\)/);
});

test("Contest demo storage is isolated from normal user storage and resettable", () => {
  const map = new Map();
  const localStorage = {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
  const previousWindow = global.window;
  global.window = { localStorage };
  try {
    assert.equal(isContestDemoActive(), false);
    const normalProfileKey = storageKeys.profile;
    setContestDemoActive(true);
    assert.equal(isContestDemoActive(), true);
    assert.notEqual(storageKeys.profile, normalProfileKey);
    assert.equal(storageKeys.profile, contestDemoStorageKeys.profile);
    writeStoredValue(storageKeys.profile, { contestDemo: true });
    assert.ok(map.has(contestDemoStorageKeys.profile));
    resetContestDemoStorage();
    assert.equal(map.has(contestDemoStorageKeys.profile), false);
    assert.equal(map.get(CONTEST_DEMO_ACTIVE_KEY), "1");
    setContestDemoActive(false);
    assert.equal(isContestDemoActive(), false);
  } finally {
    global.window = previousWindow;
  }
});
