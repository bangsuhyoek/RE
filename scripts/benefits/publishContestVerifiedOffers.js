import { createClient } from "@supabase/supabase-js";
import { CONTEST_VERIFIED_OFFERS } from "./contestVerifiedOffers.js";

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
const ids = CONTEST_VERIFIED_OFFERS.map((offer) => offer.service_offer_id);
const { data: publicRows, error: publicError } = await client
  .from("v7_public_offers")
  .select("service_offer_id,service_id,benefit_name,source_url")
  .in("service_offer_id", ids);

if (publicError) throw publicError;
if ((publicRows || []).length !== ids.length) {
  throw new Error(
    "Published offers are not fully visible through v7_public_offers."
  );
}

console.log(
  JSON.stringify(
    {
      published: published.map((item) => item?.service_offer_id || item?.status),
      publicCount: publicRows.length,
      publicOfferIds: publicRows.map((row) => row.service_offer_id),
    },
    null,
    2
  )
);
