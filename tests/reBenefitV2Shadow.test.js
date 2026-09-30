import test from "node:test";
import assert from "node:assert/strict";
import { runREShadow } from "../scripts/benefit-v2/reShadow.js";
import { createV2Store, persistDiscoveryCandidates } from "../scripts/benefit-v2/store.js";

const correctUrl = "https://ssukvsphufvdaanqlmgj.supabase.co";

test("RE shadow rejects the separate KKUDOK database before a write", async () => {
  let called = false;
  await assert.rejects(runREShadow({
    SUPABASE_URL: "https://sxdvczwxcqdhcxpcfwve.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "example-key",
  }, async () => { called = true; }), /RE_SHADOW_PROJECT_MISMATCH/);
  assert.equal(called, false);
  assert.throws(() => createV2Store({
    SUPABASE_URL: "https://sxdvczwxcqdhcxpcfwve.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "example-key",
  }), /RE_BENEFIT_V2_PROJECT_MISMATCH/);
  assert.throws(() => createV2Store({
    SUPABASE_URL: "http://ssukvsphufvdaanqlmgj.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "example-key",
  }), /RE_BENEFIT_V2_PROJECT_MISMATCH/);
});

test("RE shadow forces shadow mode even if caller requests active", async () => {
  const report = await runREShadow({
    SUPABASE_URL: correctUrl,
    SUPABASE_SERVICE_ROLE_KEY: "example-key",
    BENEFIT_PIPELINE_MODE: "active",
  }, async ({ env }) => ({ mode: env.BENEFIT_PIPELINE_MODE,
    project: env.SUPABASE_URL }));
  assert.deepEqual(report, { mode: "shadow", project: correctUrl });
});

test("RE deployed unique URL constraint accepts separate variants as one candidate", async () => {
  const written = [];
  const client = { from(table) {
    assert.equal(table, "benefit_v2_discovery_candidates");
    return { async upsert(rows) {
      assert.equal(rows.length, 1);
      assert.ok(rows.every((row) => !Object.hasOwn(row, "variant_id")));
      written.push(...rows);
      return { error: null };
    } };
  } };
  const result = await persistDiscoveryCandidates(client, "re-test", [
    { url: "https://official.example/plan", variantId: "basic", serviceIds: ["youtube"], discoveryRefs: [{ provider: "OFFICIAL" }] },
    { url: "https://official.example/plan", variantId: "premium", serviceIds: ["youtube"], discoveryRefs: [{ provider: "OFFICIAL" }] },
  ]);
  assert.equal(result.count, 1);
  assert.deepEqual(written[0].discovery_refs.map((ref) => ref.variantId), ["basic", "premium"]);
  assert.equal(result.rows[0].candidate_id, result.rows[1].candidate_id);
});
