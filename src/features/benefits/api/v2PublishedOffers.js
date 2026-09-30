import {
  benefitFetchFailure,
  benefitFetchSuccess,
} from "./fetchState.js";

export function mapV2PublicOffer(row = {}) {
  const canonical = row.canonical_values || {};
  return {
    offerId: row.offer_id,
    offerVersion: row.offer_version,
    category: row.category,
    serviceId: row.service_id,
    canonical,
    actionUrl: row.action_url || canonical.action_url || null,
    requiresLogin: Boolean(row.requires_login ?? canonical.requires_login),
    exclusiveGroupId: row.exclusive_group_id || canonical.exclusive_group_id || null,
    selectionLimit: row.selection_limit ?? canonical.selection_limit ?? null,
    stackable: row.stackable ?? canonical.stackable ?? null,
    conflictsWith: row.conflicts_with || canonical.conflicts_with || [],
    validFrom: row.valid_from || canonical.start_at || null,
    validTo: row.valid_to || canonical.end_at || null,
    lastVerifiedAt: row.last_verified_at || null,
    nextVerifyAt: row.next_verify_at || null,
    freshnessStatus: row.freshness_status || "UNKNOWN",
    evidenceUrls: row.evidence_urls || [],
  };
}
export async function fetchPublishedV2Offers(client) {
  if (!client || typeof client.from !== "function") {
    return benefitFetchFailure(
      new Error("V2 published offer source is not configured"),
      "benefit_v2_public_offers"
    );
  }

  try {
    const { data, error } = await client
      .from("benefit_v2_public_offers")
      .select("*");

    if (error) throw error;
    return benefitFetchSuccess(
      (data || []).map(mapV2PublicOffer),
      "benefit_v2_public_offers"
    );
  } catch (error) {
    return benefitFetchFailure(error, "benefit_v2_public_offers");
  }
}

export async function fetchBenefitPipelineFlag(client) {
  if (!client || typeof client.from !== "function") {
    return { activeVersion: "v1", shadowMode: true, source: "default" };
  }
  try {
    const { data, error } = await client
      .from("benefit_pipeline_flags")
      .select("active_version,shadow_mode")
      .eq("pipeline_key", "benefits")
      .maybeSingle();

    if (error) throw error;
    return {
      activeVersion: data?.active_version || "v1",
      shadowMode: data?.shadow_mode !== false,
      source: data ? "database" : "default",
    };
  } catch {
    return {
      activeVersion: "v1",
      shadowMode: true,
      source: "fallback",
    };
  }
}
