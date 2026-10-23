
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { serviceCatalog } from "../src/data/subscriptionData.js";
import {
  ALTERNATIVE_TYPES,
  CANCEL_ALTERNATIVES,
  getCancelAlternatives,
} from "../src/data/cancelAlternatives.js";

describe("cancelAlternatives dataset and getter", () => {
  it("ALTERNATIVE_TYPES contains the required 6 types", () => {
    assert.deepEqual(ALTERNATIVE_TYPES, [
      "ad_tier",
      "lower_tier",
      "annual",
      "pause",
      "family",
      "retention_offer",
    ]);
  });

  it("every serviceId key in CANCEL_ALTERNATIVES exists in serviceCatalog", () => {
    const catalogServiceIds = new Set(serviceCatalog.map((s) => s.id));
    const alternativeServiceIds = Object.keys(CANCEL_ALTERNATIVES);

    assert.ok(
      alternativeServiceIds.length >= 18,
      `Expected at least 18 services, got ${alternativeServiceIds.length}`
    );

    for (const serviceId of alternativeServiceIds) {
      assert.ok(
        catalogServiceIds.has(serviceId),
        `serviceId "${serviceId}" does not exist in serviceCatalog`
      );
    }
  });

  it("all alternative entries conform to schema requirements", () => {
    for (const [serviceId, list] of Object.entries(CANCEL_ALTERNATIVES)) {
      assert.ok(
        Array.isArray(list) && list.length > 0,
        `Service ${serviceId} must have a non-empty array of alternatives`
      );

      for (const [idx, item] of list.entries()) {
        const itemLabel = `${serviceId}[${idx}]`;

        // 1. type is valid
        assert.ok(
          ALTERNATIVE_TYPES.includes(item.type),
          `${itemLabel}: type "${item.type}" must be one of ALTERNATIVE_TYPES`
        );

        // 2. title is a non-empty string
        assert.equal(
          typeof item.title,
          "string",
          `${itemLabel}: title must be a string`
        );
        assert.ok(item.title.trim().length > 0, `${itemLabel}: title cannot be empty`);

        // 3. monthlyPrice is null or non-negative integer
        if (item.monthlyPrice !== null) {
          assert.equal(
            typeof item.monthlyPrice,
            "number",
            `${itemLabel}: monthlyPrice must be null or number`
          );
          assert.ok(
            Number.isInteger(item.monthlyPrice) && item.monthlyPrice >= 0,
            `${itemLabel}: monthlyPrice must be an integer >= 0, got ${item.monthlyPrice}`
          );
        }

        // 4. note is string <= 60 characters
        assert.equal(
          typeof item.note,
          "string",
          `${itemLabel}: note must be a string`
        );
        assert.ok(
          item.note.length <= 60,
          `${itemLabel}: note length (${item.note.length}) must be <= 60 chars. Note: "${item.note}"`
        );

        // 5. sourceUrl starts with https://
        assert.equal(
          typeof item.sourceUrl,
          "string",
          `${itemLabel}: sourceUrl must be a string`
        );
        assert.ok(
          item.sourceUrl.startsWith("https://"),
          `${itemLabel}: sourceUrl must start with https://, got "${item.sourceUrl}"`
        );

        // 6. checkedAt format YYYY-MM-DD
        assert.equal(
          typeof item.checkedAt,
          "string",
          `${itemLabel}: checkedAt must be a string`
        );
        assert.match(
          item.checkedAt,
          /^\d{4}-\d{2}-\d{2}$/,
          `${itemLabel}: checkedAt must match YYYY-MM-DD`
        );
      }
    }
  });

  it("getCancelAlternatives returns array for existing service and empty array for unknown", () => {
    const netflixAlts = getCancelAlternatives("netflix");
    assert.ok(Array.isArray(netflixAlts));
    assert.ok(netflixAlts.length >= 2);
    assert.equal(netflixAlts[0].type, "ad_tier");

    // Unknown services
    assert.deepEqual(getCancelAlternatives("unknown-service-xyz"), []);
    assert.deepEqual(getCancelAlternatives(""), []);
    assert.deepEqual(getCancelAlternatives(null), []);
    assert.deepEqual(getCancelAlternatives(undefined), []);
    assert.deepEqual(getCancelAlternatives(123), []);
  });
});
