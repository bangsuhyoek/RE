import test from "node:test";
import assert from "node:assert/strict";
import { selectREProductBenefits, loadREProductBenefits } from "../src/features/benefits/api/reProductBenefits.js";
import { runREProduct } from "../scripts/benefit-v2/reProduct.js";

const now = Date.parse("2026-10-01T00:00:00Z");
const legacy = [{ id: "same", link: "https://official.example/benefit", sourceServiceIds: ["netflix"] }, { id: "other", link: "https://official.example/annual", sourceServiceIds: ["netflix"] }];
const subscriptions = [{ id: "netflix", serviceId: "netflix", name: "Netflix", amount: 17000, plan: "프리미엄", billingCycle: "매월" }];
const offer = { offerId: "v2-netflix", offerVersion: "1", serviceId: "netflix", category: "PARTNERSHIP_SAVING", actionUrl: legacy[0].link,
  canonical: { target_service: "netflix", target_plan: "프리미엄", offer_price: 0, incremental_partner_cost: 0, duration_months: 1, plan_equivalence: "EXACT" },
  freshnessStatus: "FRESH", lastVerifiedAt: "2026-09-30T23:00:00Z", nextVerifyAt: "2026-10-01T23:00:00Z", evidenceUrls: ["https://official.example/terms"] };
const select = (offers) => selectREProductBenefits({ offers, legacy, subscriptions, now });

test("V2 replaces identical official action and preserves other benefits of same service", () => {
  const result = select([offer]);
  assert.deepEqual(result.map((item) => item.id), ["v2-netflix", "other"]);
  assert.equal(result[0].saving, 0);
  assert.match(result[0].savingText, /가능|조건/);
  assert.equal(result[0].link, legacy[0].link);
});
test("expired, stale, unsafe, or unproven public records cannot displace legacy", () => {
  for (const patch of [{ freshnessStatus: "STALE" }, { nextVerifyAt: "2026-09-29" }, { actionUrl: "javascript:alert(1)" }, { evidenceUrls: [] }, { lastVerifiedAt: "invalid" }, { validTo: "2026-09-29" }, { validFrom: "2026-10-02" }]) {
    assert.deepEqual(select([{ ...offer, ...patch }]), legacy);
  }
  assert.deepEqual(select([]), legacy);
});
test("multiple public versions select most recently verified version", () => {
  assert.equal(select([{ ...offer, offerVersion: "old", lastVerifiedAt: "2026-09-30T20:00:00Z" }, offer]).filter((item) => item.pipelineV2).length, 1);
});
function client({ flag = { active_version: "v2", shadow_mode: false }, rows = [], error = null } = {}) {
  return { from(table) { return { select() {
    return table === "benefit_pipeline_flags"
      ? { eq() { return { maybeSingle: async () => ({ data: flag, error: null }) }; } }
      : Promise.resolve({ data: rows, error });
  } }; } };
}
test("V2 empty or failed query and inactive flags preserve existing benefits", async () => {
  for (const c of [null, client(), client({ error: new Error("offline") }), client({ flag: { active_version: "v1", shadow_mode: true } })]) {
    const result = await loadREProductBenefits({ client: c, legacy, subscriptions, now });
    assert.deepEqual(result.promotions, legacy);
  }
});
test("product runner fails before execution without keys or current reference and never reports partial as success", async () => {
  let called = false;
  const run = async () => { called = true; return { status: "SUCCESS" }; };
  await assert.rejects(runREProduct({}, run), /RE_SHADOW_REQUIRES/);
  const env = { SUPABASE_URL: "https://ssukvsphufvdaanqlmgj.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "example" };
  await assert.rejects(runREProduct(env, run), /RE_ACTIVE_REQUIRES/);
  assert.equal(called, false);
  await assert.rejects(runREProduct({ ...env, BENEFIT_PIPELINE_MODE: "shadow" }, async () => ({ status: "PARTIAL", runId: "test" })), /RE_V2_RUN_INCOMPLETE/);
  const result = await runREProduct({ ...env, BENEFIT_GOLD_SET_PATH: "independent.json" }, async ({ env }) => {
    assert.equal(env.BENEFIT_PIPELINE_MODE, "active");
    assert.equal(env.RE_BENEFIT_V2_ALLOW_ACTIVE, "true");
    return { status: "SUCCESS", mode: "active", activePublication: { persistedAs: "active" } };
  });
  assert.equal(result.status, "SUCCESS");
});
