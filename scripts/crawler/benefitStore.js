import { createClient } from "@supabase/supabase-js";

function adminConfig(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function createBenefitAdminClient(env = process.env) {
  const config = adminConfig(env);
  if (!config) return null;
  return createClient(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function previousRecord(row) {
  const details = row.verification_details || {};
  return {
    id: row.id,
    url: row.source_url || row.link,
    status: row.verification_status,
    lastVerifiedAt: row.last_verified_at,
    softDegradedSince: row.soft_degraded_since,
    verifiedPeriod: row.start_at || row.end_at
      ? {
          kind: row.end_at ? "bounded" : "ongoing",
          startAt: row.start_at,
          endAt: row.end_at,
          inferredYear: false,
        }
      : null,
    verification: details.verification || (
      row.verification_status === "ACTIVE"
        ? { verified: true, method: "persisted-active" }
        : null
    ),
  };
}

export async function loadPreviousBenefitState(client) {
  if (!client) return new Map();
  const { data, error } = await client
    .from("benefits")
    .select(
      "id,link,source_url,verification_status,last_verified_at,soft_degraded_since,start_at,end_at,verification_details"
    );
  if (error) throw error;
  return new Map((data || []).map((row) => [row.id, previousRecord(row)]));
}

function rowForOutcome(candidate, result) {
  const period = result.verifiedPeriod || result.period || {};
  return {
    id: candidate.id,
    title: candidate.title || candidate.partnerName || candidate.id,
    subtitle: candidate.partnerName || null,
    kind: candidate.kind || candidate.title || "제휴 혜택",
    category: candidate.category || "제휴 이벤트",
    description: candidate.description || "",
    saving: 0,
    original_price: Number(candidate.originalPrice) || 0,
    offer_price: Number.isFinite(Number(candidate.offerPrice))
      ? Number(candidate.offerPrice)
      : 0,
    link: candidate.sourceUrl || candidate.url,
    benefit_period: candidate.benefitPeriod || null,
    campaign_period: candidate.periodText || null,
    verified_status: result.status === "ACTIVE" ? "active" : "inactive",
    audience: candidate.audience || "UNKNOWN",
    partner_type: candidate.partnerType || null,
    partner_id: candidate.partnerId || null,
    partner_name: candidate.partnerName || null,
    benefit_type: candidate.benefitType || null,
    benefit_amount: candidate.benefitAmount ?? null,
    benefit_rate: candidate.benefitRate ?? null,
    benefit_cap: candidate.benefitCap ?? null,
    saving_period: candidate.savingPeriod || null,
    eligibility_rules: candidate.eligibilityRules || {},
    required_payment_method: candidate.requiredPaymentMethod || null,
    required_carrier: candidate.requiredCarrier || null,
    required_membership: candidate.requiredMembership || null,
    required_plan: candidate.requiredPlan || null,
    required_cost: candidate.requiredCost ?? null,
    target_plan: candidate.targetPlan || null,
    plan_change_required: Boolean(candidate.planChangeRequired),
    start_at: period.startAt || null,
    end_at: period.endAt || null,
    source_url: candidate.sourceUrl || candidate.url,
    source_list_url: candidate.sourceListUrl || null,
    official_origin: candidate.officialOrigin || null,
    discovered_at: candidate.discoveredAt || result.checkedAt,
    last_checked_at: result.checkedAt,
    last_verified_at: result.lastVerifiedAt || null,
    verification_status: result.status,
    verification_details: {
      reason: result.reason,
      score: result.score,
      warnings: result.warnings || [],
      verification: result.verification || null,
      campaignTokens: candidate.campaignTokens || [],
      brandTokens: candidate.brandTokens || [],
      allowedOrigins: candidate.allowedOrigins || [],
      targetServiceIds: candidate.targetServiceIds || [],
    },
    soft_degraded_since: result.softDegradedSince || null,
    campaign_fingerprint: candidate.campaignFingerprint || null,
    exclusive_group: candidate.exclusiveGroup || null,
    stackable: Boolean(candidate.stackable),
    updated_at: new Date().toISOString(),
  };
}

export async function publishBenefitOutcomes(client, outcomes = []) {
  if (!client) {
    return { published: false, reason: "SUPABASE_ADMIN_NOT_CONFIGURED", count: 0 };
  }

  let count = 0;
  for (const { candidate, result } of outcomes) {
    const row = rowForOutcome(candidate, result);
    const { error } = await client
      .from("benefits")
      .upsert(row, { onConflict: "id" });
    if (error) throw error;

    for (const serviceId of candidate.targetServiceIds || []) {
      const { error: relationError } = await client
        .from("service_benefits")
        .upsert(
          {
            service_id: serviceId,
            benefit_id: candidate.id,
            role: (candidate.targetServiceIds || []).length > 1
              ? "bundle_member"
              : "target",
            is_primary: serviceId === candidate.targetServiceIds?.[0],
          },
          { onConflict: "service_id,benefit_id" }
        );
      if (relationError) throw relationError;
    }
    count += 1;
  }

  return { published: true, reason: null, count };
}

export async function loadTrackedBenefitCandidates(client) {
  if (!client) return [];
  const { data, error } = await client
    .from("benefits")
    .select(`
      *,
      service_benefits (
        service_id,
        role,
        is_primary
      )
    `)
    .in("verification_status", ["ACTIVE", "SUSPICIOUS"]);

  if (error) throw error;

  return (data || []).map((row) => {
    const details = row.verification_details || {};
    const links = Array.isArray(row.service_benefits) ? row.service_benefits : [];
    const targetServiceIds = details.targetServiceIds?.length
      ? details.targetServiceIds
      : links
          .filter((link) => link.role === "target" || link.role === "bundle_member")
          .map((link) => link.service_id);
    return {
      id: row.id,
      campaignFingerprint: row.campaign_fingerprint,
      title: row.title,
      kind: row.kind,
      description: row.description,
      category: row.category,
      targetServiceIds,
      sourceServiceIds: targetServiceIds,
      audience: row.audience || "UNKNOWN",
      partnerType: row.partner_type || "",
      partnerId: row.partner_id || "",
      partnerName: row.partner_name || "",
      benefitType: row.benefit_type || "",
      benefitAmount: row.benefit_amount,
      benefitRate: row.benefit_rate == null ? null : Number(row.benefit_rate),
      benefitCap: row.benefit_cap,
      savingPeriod: row.saving_period || "",
      eligibilityRules: row.eligibility_rules || {},
      requiredPaymentMethod: row.required_payment_method || "",
      requiredCarrier: row.required_carrier || "",
      requiredMembership: row.required_membership || "",
      requiredCost: row.required_cost,
      requiredPlan: row.required_plan || "",
      targetPlan: row.target_plan || "",
      planChangeRequired: Boolean(row.plan_change_required),
      originalPrice: row.original_price,
      offerPrice: row.offer_price,
      exclusiveGroup: row.exclusive_group || "",
      stackable: Boolean(row.stackable),
      sourceUrl: row.source_url || row.link,
      sourceListUrl: row.source_list_url || "",
      officialOrigin: row.official_origin || "",
      discoveredAt: row.discovered_at,
      url: row.source_url || row.link,
      allowedOrigins: details.allowedOrigins || (
        row.official_origin ? [row.official_origin] : []
      ),
      brandTokens: details.brandTokens || [],
      campaignTokens: details.campaignTokens || [],
      periodText: row.campaign_period || "",
      isCampaignPage: true,
      previousStatus: row.verification_status,
    };
  });
}

export async function expirePastBenefits(client, now = Date.now()) {
  if (!client) return { updated: false, count: 0 };
  const isoNow = new Date(now).toISOString();
  const { data, error } = await client
    .from("benefits")
    .update({
      verification_status: "EXPIRED",
      last_checked_at: isoNow,
      updated_at: isoNow,
    })
    .eq("verification_status", "ACTIVE")
    .lt("end_at", isoNow)
    .select("id");

  if (error) throw error;
  return { updated: true, count: data?.length || 0 };
}
