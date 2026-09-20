import { createClient } from "@supabase/supabase-js";
import {
  CONTEST_SUPERSEDED_OFFERS,
  CONTEST_VERIFIED_OFFERS,
} from "./contestVerifiedOffers.js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Contest benefit publication requires SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(2);
}

const client = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const currentIds = CONTEST_VERIFIED_OFFERS.map((offer) => offer.service_offer_id);
const supersededIds = CONTEST_SUPERSEDED_OFFERS.map(
  (offer) => offer.service_offer_id
);

for (const correction of CONTEST_SUPERSEDED_OFFERS) {
  if (!currentIds.includes(correction.replacement_service_offer_id)) {
    throw new Error(
      "Missing replacement offer for " + correction.service_offer_id
    );
  }
}

const { data: visibleSuperseded, error: supersededLookupError } = await client
  .from("v7_public_offers")
  .select("service_offer_id")
  .in("service_offer_id", supersededIds);

if (supersededLookupError) throw supersededLookupError;

const visibleSupersededIds = new Set(
  (visibleSuperseded || []).map((row) => row.service_offer_id)
);

// Publish the replacement revision before withdrawing the stale revision.
// This keeps the last known published benefit available if publication fails.
const published = [];
for (const offer of CONTEST_VERIFIED_OFFERS) {
  const { data, error } = await client.rpc("v7_upsert_published_offer", {
    p_offer: offer,
    p_idempotency_key: "contest-benefit:" + offer.service_offer_id + ":v1",
    p_operator_reference: "user-authorized-contest-publication-20260920",
  });
  if (error) throw error;
  published.push(data);
}

const replacementIds = CONTEST_SUPERSEDED_OFFERS.map(
  (correction) => correction.replacement_service_offer_id
);

if (replacementIds.length > 0) {
  const { data: replacementRows, error: replacementError } = await client
    .from("v7_public_offers")
    .select("service_offer_id,selection_relation")
    .in("service_offer_id", replacementIds);

  if (replacementError) throw replacementError;

  const replacementsById = new Map(
    (replacementRows || []).map((row) => [row.service_offer_id, row])
  );

  for (const correction of CONTEST_SUPERSEDED_OFFERS) {
    const replacement = replacementsById.get(
      correction.replacement_service_offer_id
    );
    if (!replacement) {
      throw new Error(
        "Replacement offer is not visible through v7_public_offers: " +
          correction.replacement_service_offer_id
      );
    }

    const expected = CONTEST_VERIFIED_OFFERS.find(
      (offer) =>
        offer.service_offer_id === correction.replacement_service_offer_id
    );
    const expectedRelation = expected?.selection_relation || {};
    const actualRelation = replacement.selection_relation || {};

    for (const key of Object.keys(expectedRelation)) {
      if (actualRelation[key] !== expectedRelation[key]) {
        throw new Error(
          "Replacement selection_relation mismatch for " +
            correction.replacement_service_offer_id +
            " field " +
            key
        );
      }
    }
  }
}

const withdrawn = [];
for (const correction of CONTEST_SUPERSEDED_OFFERS) {
  if (!visibleSupersededIds.has(correction.service_offer_id)) continue;

  const { data, error } = await client.rpc("v7_withdraw_published_offer", {
    p_service_offer_id: correction.service_offer_id,
    p_idempotency_key:
      "contest-benefit-correction:" +
      correction.service_offer_id +
      ":withdraw-for:" +
      correction.replacement_service_offer_id,
    p_reason: correction.reason,
    p_operator_reference: "user-authorized-contest-correction-20260920",
  });
  if (error) throw error;
  withdrawn.push(data);
}

const { data: publicRows, error: publicError } = await client
  .from("v7_public_offers")
  .select("service_offer_id,service_id,benefit_name,source_url,selection_relation")
  .in("service_offer_id", currentIds);

if (publicError) throw publicError;
if ((publicRows || []).length !== currentIds.length) {
  throw new Error(
    "Published offers are not fully visible through v7_public_offers."
  );
}

const { data: staleRows, error: staleError } = await client
  .from("v7_public_offers")
  .select("service_offer_id")
  .in("service_offer_id", supersededIds);

if (staleError) throw staleError;
if ((staleRows || []).length > 0) {
  throw new Error(
    "Superseded offers remain visible through v7_public_offers: " +
      staleRows.map((row) => row.service_offer_id).join(",")
  );
}

console.log(
  JSON.stringify(
    {
      withdrawn: withdrawn.map(
        (item) => item?.service_offer_id || item?.status
      ),
      published: published.map(
        (item) => item?.service_offer_id || item?.status
      ),
      publicCount: publicRows.length,
      publicOfferIds: publicRows.map((row) => row.service_offer_id),
      selectionRelations: publicRows.map((row) => ({
        service_offer_id: row.service_offer_id,
        selection_relation: row.selection_relation,
      })),
    },
    null,
    2
  )
);
