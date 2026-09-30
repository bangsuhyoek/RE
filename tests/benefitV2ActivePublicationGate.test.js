import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assessActivePublicationReadiness,
  persistenceModeForRun,
} from "../scripts/benefit-v2/activePublicationGate.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const now = Date.parse("2026-09-27T09:00:00+09:00");

test("expired real Gold Set prevents active publication before any offer write", () => {
  const readiness = assessActivePublicationReadiness({
    goldSetPath: path.join(directory, "benefit-v2-independent-gold-20260922.json"),
    now,
  });
  assert.equal(readiness.allowed, false);
  assert.ok(readiness.reasons.includes("GOLD_SET_REQUIRES_ADJUDICATION"));
  assert.equal(persistenceModeForRun("active", readiness), "shadow");
});

test("a missing Gold Set, a partial reference set, and a prior extraction error stay in Shadow", () => {
  assert.equal(assessActivePublicationReadiness({ now }).allowed, false);
  assert.equal(persistenceModeForRun("active", { allowed: false }), "shadow");
  assert.equal(persistenceModeForRun("shadow", { allowed: true }), "shadow");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kkudok-gold-"));
  try {
    const pathToGold = path.join(tmp, "gold.json");
    fs.writeFileSync(pathToGold, JSON.stringify([{ offerId: "one", publish: true }]));
    const readiness = assessActivePublicationReadiness({ goldSetPath: pathToGold, now });
    assert.ok(readiness.reasons.includes("INDEPENDENT_GOLD_SET_INCOMPLETE"));
    assert.ok(readiness.goldSetSize < 52);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("even one published action mismatch or false publish blocks the complete active batch", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kkudok-gold-"));
  try {
    const pathToGold = path.join(tmp, "gold.json");
    const gold = Array.from({ length: 52 }, (_, index) => ({
      caseId: `case-${index}`,
      offerId: `offer-${index}`,
      category: "PARTNERSHIP_SAVING",
      fields: { offer_price: index + 1000 },
      actionUrl: `https://official.example/offer/${index}`,
      publish: index < 14,
    }));
    fs.writeFileSync(pathToGold, JSON.stringify(gold));
    const samples = gold.map((item) => ({
      offerId: item.offerId,
      category: item.category,
      canonical: { offer_price: item.fields.offer_price },
      actionUrl: item.actionUrl,
      decision: item.publish ? "PUBLISH" : "DO_NOT_PUBLISH",
    }));
    const args = { goldSetPath: pathToGold, qualitySamples: samples, now };
    const ready = assessActivePublicationReadiness(args);
    assert.equal(ready.allowed, true);
    assert.equal(persistenceModeForRun("active", ready), "active");

    const wrongAction = samples.map((item, index) => index === 0
      ? { ...item, actionUrl: "https://other.example/offer" } : item);
    assert.ok(assessActivePublicationReadiness({ ...args,
      qualitySamples: wrongAction }).reasons.includes("GOLD_EXPECTATIONS_MISMATCH"));

    const falsePublish = samples.map((item, index) => index === 51
      ? { ...item, decision: "PUBLISH" } : item);
    assert.ok(assessActivePublicationReadiness({ ...args,
      qualitySamples: falsePublish }).reasons.includes("GOLD_EXPECTATIONS_MISMATCH"));
    assert.ok(assessActivePublicationReadiness({ ...args,
      qualitySamples: [...samples, { offerId: "unlabelled", decision: "PUBLISH" }] }).reasons
      .includes("PUBLISHABLE_OFFER_OUTSIDE_GOLD_SET"));
    assert.ok(assessActivePublicationReadiness({ ...args,
      priorErrors: [{ stage: "TRUSTED_DISCOVERY" }] }).reasons.includes(
        "PIPELINE_ERRORS_BEFORE_PUBLICATION"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
