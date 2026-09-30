import crypto from "node:crypto";
import { createBenefitAdminClient } from "../crawler/benefitStore.js";

function hash(value, length = 32) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, length);
}

export function createV2Store(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  if (url && env.SUPABASE_SERVICE_ROLE_KEY) {
    let parsed;
    try { parsed = new URL(url); } catch { /* Reject below. */ }
    if (parsed?.origin !== "https://ssukvsphufvdaanqlmgj.supabase.co" ||
        parsed.pathname !== "/" || parsed.username || parsed.password) {
      throw new Error("RE_BENEFIT_V2_PROJECT_MISMATCH");
    }
  }
  return createBenefitAdminClient(env);
}

export function createRunId(now = Date.now()) {
  return `benefitv2_${new Date(now).toISOString().replace(/[-:.TZ]/g, "")}_${hash(now, 8)}`;
}

export async function startRun(client, {
  runId,
  mode,
  startedAt,
  providerStatus = [],
} = {}) {
  if (!client) return { persisted: false, reason: "SERVICE_ROLE_NOT_CONFIGURED" };
  const { error } = await client.from("benefit_v2_runs").upsert({
    run_id: runId,
    mode,
    started_at: startedAt,
    status: "RUNNING",
    provider_status: providerStatus,
  });
  if (error) throw error;
  return { persisted: true };
}

export async function finishRun(client, {
  runId,
  status,
  completedAt,
  providerStatus,
  metrics,
  errors = [],
} = {}) {
  if (!client) return { persisted: false, reason: "SERVICE_ROLE_NOT_CONFIGURED" };
  const { error } = await client.from("benefit_v2_runs").update({
    completed_at: completedAt,
    status,
    provider_status: providerStatus || [],
    metrics: metrics || {},
    error_summary: errors,
  }).eq("run_id", runId);
  if (error) throw error;
  return { persisted: true };
}
export async function persistDiscoveryCandidates(client, runId, candidates = []) {
  if (!client || !candidates.length) return { persisted: Boolean(client), count: 0 };
  // RE's deployed table is unique on (run_id, url) and has no variant_id
  // column. Keep one source row per URL and retain each variant in its refs.
  const byUrl = new Map();
  for (const candidate of candidates) {
    let row = byUrl.get(candidate.url);
    if (!row) {
      row = {
        candidate_id: `cand_${hash(`${runId}|${candidate.url}`, 28)}`,
        run_id: runId,
        url: candidate.url,
        service_ids: [],
        discovery_refs: [],
      };
      byUrl.set(candidate.url, row);
    }
    row.service_ids = [...new Set([...row.service_ids, ...(candidate.serviceIds || [])])];
    row.discovery_refs.push(...(candidate.discoveryRefs || []).map((ref) => ({
      ...ref,
      variantId: candidate.variantId || null,
    })));
    if (!candidate.discoveryRefs?.length && candidate.variantId) {
      row.discovery_refs.push({ variantId: candidate.variantId });
    }
  }
  const rows = [...byUrl.values()];
  const { error } = await client
    .from("benefit_v2_discovery_candidates")
    .upsert(rows, { onConflict: "candidate_id" });
  if (error) throw error;
  return {
    persisted: true,
    count: rows.length,
    rows: candidates.map((candidate) => ({
      ...byUrl.get(candidate.url),
      variant_id: candidate.variantId || null,
    })),
  };
}

export async function persistSnapshot(client, {
  runId,
  candidateId = null,
  snapshot,
} = {}) {
  if (!client || !snapshot) return { persisted: Boolean(client), snapshotId: null };
  if (!candidateId) {
    throw new Error("A persisted discovery candidate is required for each source snapshot");
  }
  const snapshotId = `snap_${hash(
    `${runId}|${candidateId}|${snapshot.url}|${snapshot.finalUrl || ""}|${snapshot.contentHash || snapshot.reason || ""}`,
    28
  )}`;
  const primary = snapshot.primaryAction || {};
  const row = {
    snapshot_id: snapshotId,
    run_id: runId,
    candidate_id: candidateId,
    source_url: snapshot.url,
    final_url: snapshot.finalUrl || null,
    http_status: snapshot.httpStatus || null,
    page_type: snapshot.pageType || null,
    actionability_status: snapshot.actionability || null,
    requires_login: Boolean(primary.requiresLogin),
    content_hash: snapshot.contentHash || null,
    title: snapshot.title || null,
    text_excerpt: snapshot.text ? snapshot.text.slice(0, 8000) : null,
    structured_data: snapshot.jsonLd || [],
    observed_at: snapshot.observedAt,
    fetch_status: snapshot.ok ? "SUCCESS" : "FAILED",
    fetch_reason: snapshot.ok ? null : snapshot.reason,
  };
  const { error } = await client
    .from("benefit_v2_source_snapshots")
    .upsert(row, { onConflict: "snapshot_id" });
  if (error) throw error;
  return { persisted: true, snapshotId };
}

function fieldStateObject(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([field, result]) => [
      field,
      {
        state: result.state,
        conflicts: result.conflicts || [],
        alternatives: result.alternatives || [],
      },
    ])
  );
}

export async function persistOfferVersion(client, {
  runId,
  offer,
  gate,
  mode = "shadow",
  reverifyHours = 24,
} = {}) {
  if (!client) return { persisted: false, reason: "SERVICE_ROLE_NOT_CONFIGURED" };

  const canonical = offer.canonical || {};
  const publishState =
    gate.decision === "PUBLISH"
      ? mode === "active" ? "PUBLISHED" : "SHADOW_READY"
      : gate.freshness === "INACTIVE" ? "INACTIVE"
      : gate.freshness === "STALE" ? "STALE"
      : "BLOCKED";
  const nextVerifyAt = new Date(
    Date.parse(offer.lastVerifiedAt || offer.observedAt) + reverifyHours * 3600_000
  ).toISOString();

  const row = {
    offer_id: offer.offerId,
    offer_version: offer.offerVersion,
    run_id: runId,
    category: offer.category,
    service_id: offer.serviceId,
    canonical_values: canonical,
    field_states: fieldStateObject(offer.fields),
    evidence_urls: offer.evidenceUrls || [],
    action_url: canonical.action_url || null,
    requires_login: Boolean(canonical.requires_login),
    exclusive_group_id: canonical.exclusive_group_id || null,
    selection_limit: canonical.selection_limit == null ? null : Number(canonical.selection_limit),
    stackable: canonical.stackable == null ? null : Boolean(canonical.stackable),
    conflicts_with: Array.isArray(canonical.conflicts_with) ? canonical.conflicts_with : [],
    valid_from: offer.validFrom || null,
    valid_to: offer.validTo || null,
    observed_at: offer.observedAt,
    last_verified_at: offer.lastVerifiedAt,
    next_verify_at: nextVerifyAt,
    freshness_status: gate.freshness,
    publish_state: publishState,
    publish_gate: gate,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client
    .from("benefit_v2_offer_versions")
    .upsert(row, { onConflict: "offer_id,offer_version" });
  if (error) throw error;

  const observationRows = [];
  for (const [field, result] of Object.entries(offer.fields || {})) {
    for (const item of result.evidence || []) {
      observationRows.push({
        observation_id: `obs_${hash(
          `${offer.offerId}|${offer.offerVersion}|${field}|${item.sourceUrl}|${stableValue(item.value)}|${item.evidenceText || ""}`,
          30
        )}`,
        offer_id: offer.offerId,
        offer_version: offer.offerVersion,
        field_name: field,
        value_json: item.value,
        field_state: result.state,
        source_url: item.sourceUrl,
        evidence_text: item.evidenceText || null,
        extractor: item.extractor || null,
        authority_type: item.authorityType || null,
        authority_score: Number(item.authorityScore) || 0,
        observed_at: item.observedAt,
      });
    }
  }
  if (observationRows.length) {
    const uniqueObservationRows = [
      ...new Map(
        observationRows.map((row) => [row.observation_id, row])
      ).values(),
    ];
    const { error: observationError } = await client
      .from("benefit_v2_field_observations")
      .upsert(uniqueObservationRows, { onConflict: "observation_id" });
    if (observationError) throw observationError;
  }

  return { persisted: true, publishState, nextVerifyAt };
}

function stableValue(value) {
  if (value === undefined) return "undefined";
  return JSON.stringify(value);
}

export async function loadDueOffers(client, now = Date.now()) {
  if (!client) return [];
  const { data, error } = await client
    .from("benefit_v2_offer_versions")
    .select("offer_id,offer_version,category,service_id,canonical_values,evidence_urls,action_url,next_verify_at,publish_state")
    .in("publish_state", ["PUBLISHED", "SHADOW_READY"])
    .lte("next_verify_at", new Date(now).toISOString());
  if (error) throw error;
  return data || [];
}

export async function markOfferStale(client, offerId, offerVersion, reason = "REVALIDATION_FAILED") {
  if (!client) return { persisted: false };
  const { error } = await client
    .from("benefit_v2_offer_versions")
    .update({
      freshness_status: "STALE",
      publish_state: "STALE",
      publish_gate: { decision: "DO_NOT_PUBLISH", failures: [reason], freshness: "STALE" },
      updated_at: new Date().toISOString(),
    })
    .eq("offer_id", offerId)
    .eq("offer_version", offerVersion);
  if (error) throw error;
  return { persisted: true };
}
export async function persistMetrics(client, runId, metrics = {}) {
  if (!client) return { persisted: false };
  const row = {
    run_id: runId,
    candidate_precision: metrics.candidatePrecision ?? null,
    classification_precision: metrics.classificationPrecision ?? null,
    field_accuracy: metrics.fieldAccuracy ?? null,
    canonical_value_accuracy: metrics.canonicalValueAccuracy ?? null,
    action_url_accuracy: metrics.actionUrlAccuracy ?? null,
    publish_precision: metrics.publishPrecision ?? null,
    false_publish_rate: metrics.falsePublishRate ?? null,
    coverage: metrics.coverage ?? null,
    sample_size: metrics.sampleSize ?? null,
    details: metrics.details || {},
    measured_at: new Date().toISOString(),
  };
  const { error } = await client
    .from("benefit_v2_metrics")
    .upsert(row, { onConflict: "run_id" });
  if (error) throw error;
  return { persisted: true };
}

export async function readPipelineFlag(client) {
  if (!client) return { activeVersion: "v1", shadowMode: true, source: "default" };
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
}
