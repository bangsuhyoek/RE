function clean(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function primaryTerms(service = {}) {
  const terms = [service.name, service.plan, ...(service.aliases || [])]
    .map(clean)
    .filter((value) => value.length >= 2);
  return [...new Set(terms)].slice(0, 4);
}

export function buildBenefitQueries(service = {}) {
  const [name = clean(service.id), plan = ""] = primaryTerms(service);
  if (!name) return [];
  const subject = plan && plan !== name ? `"${name}" "${plan}"` : `"${name}"`;

  return [
    `${subject} 제휴 할인 혜택`,
    `${subject} 무료체험 신규가입`,
    `${subject} 멤버십 제휴 무료`,
    `${subject} 카드 통신사 할인`,
    `${subject} 결합 번들 할인`,
    `${subject} 프로모션 이벤트 가입`,
  ];
}
export function selectDiscoveryServices(services = [], env = process.env) {
  const requested = String(env.BENEFIT_DISCOVERY_SERVICE_IDS || "")
    .split(",")
    .map(clean)
    .filter(Boolean);

  if (requested.length > 0) {
    const allow = new Set(requested);
    return services.filter((service) => allow.has(service.id));
  }

  const limit = Number(env.BENEFIT_DISCOVERY_MAX_SERVICES);
  if (Number.isFinite(limit) && limit > 0) return services.slice(0, Math.floor(limit));
  return services;
}

function candidateKey(item = {}) {
  try {
    const url = new URL(item.url);
    url.hash = "";
    return url.href.toLowerCase();
  } catch {
    return String(item.url || "").toLowerCase();
  }
}

export function evaluateLiveSearchReadiness(providerRuns = [], requiredIds = ["NAVER", "GOOGLE"]) {
  const byId = new Map(providerRuns.map((run) => [run.provider, run]));
  const failures = [];

  for (const id of requiredIds) {
    const run = byId.get(id);
    if (!run?.configured) {
      failures.push(`${id}_NOT_CONFIGURED`);
      continue;
    }
    if ((run.attemptedCalls || 0) < 1) {
      failures.push(`${id}_NOT_CALLED`);
      continue;
    }
    if ((run.successfulCalls || 0) < 1) {
      failures.push(`${id}_NO_SUCCESSFUL_LIVE_CALL`);
    }
  }

  return {
    requiredProviders: requiredIds,
    ready: failures.length === 0,
    failures,
  };
}

export async function runSearchDiscovery({
  providers = [],
  services = [],
  env = process.env,
  perQuery = 10,
} = {}) {
  const selectedServices = selectDiscoveryServices(services, env);
  const byUrl = new Map();
  const providerRuns = [];

  for (const provider of providers) {
    const providerRun = {
      provider: provider.id,
      mode: provider.mode,
      configured: Boolean(provider.configured),
      queryCount: 0,
      attemptedCalls: 0,
      successfulCalls: 0,
      resultCount: 0,
      failures: [],
    };

    if (!provider.configured) {
      providerRun.failures.push(`${provider.id}_NOT_CONFIGURED`);
      providerRuns.push(providerRun);
      continue;
    }
    const queryLimit = Math.max(
      1,
      Number(env.BENEFIT_SEARCH_QUERY_LIMIT_PER_SERVICE) || Number.POSITIVE_INFINITY
    );
    for (const service of selectedServices) {
      for (const query of buildBenefitQueries(service).slice(0, queryLimit)) {
        providerRun.queryCount += 1;
        providerRun.attemptedCalls += 1;
        const result = await provider.search(query, { display: perQuery, start: 1 });
        if (result.error) {
          providerRun.failures.push({ query, reason: result.error });
          continue;
        }
        providerRun.successfulCalls += 1;

        for (const item of result.items || []) {
          const key = candidateKey(item);
          if (!key) continue;
          const existing = byUrl.get(key);
          const discoveryRef = {
            provider: provider.id,
            query,
            rank: item.rank,
            title: item.title,
            snippet: item.snippet,
            discoveredAt: item.discoveredAt,
          };

          if (existing) {
            existing.discoveryRefs.push(discoveryRef);
            existing.serviceIds = [...new Set([...existing.serviceIds, service.id])];
          } else {
            byUrl.set(key, {
              url: item.url,
              serviceIds: [service.id],
              discoveryRefs: [discoveryRef],
            });
          }
          providerRun.resultCount += 1;
        }
      }
    }

    providerRuns.push(providerRun);
  }

  return {
    candidates: [...byUrl.values()],
    providerRuns,
    serviceCount: selectedServices.length,
    liveSearch: evaluateLiveSearchReadiness(providerRuns),
  };
}
