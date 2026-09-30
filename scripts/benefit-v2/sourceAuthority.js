function hostname(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function domainMatches(host, domain) {
  const expected = String(domain || "").toLowerCase().replace(/^\./, "");
  return Boolean(expected) && (host === expected || host.endsWith(`.${expected}`));
}

const BUILT_IN_PARTNERS = [
  { domain: "naver.com", type: "OFFICIAL_PARTNER", name: "NAVER" },
  { domain: "tworld.co.kr", type: "OFFICIAL_PARTNER", name: "SKT" },
  { domain: "sktuniverse.co.kr", type: "OFFICIAL_PARTNER", name: "SKT" },
  { domain: "kt.com", type: "OFFICIAL_PARTNER", name: "KT" },
  { domain: "lguplus.com", type: "OFFICIAL_PARTNER", name: "LG U+" },
  { domain: "samsungcard.com", type: "OFFICIAL_PARTNER", name: "삼성카드" },
  { domain: "shinhancard.com", type: "OFFICIAL_PARTNER", name: "신한카드" },
  { domain: "kbcard.com", type: "OFFICIAL_PARTNER", name: "KB국민카드" },
  { domain: "hyundaicard.com", type: "OFFICIAL_PARTNER", name: "현대카드" },
];

export const AuthorityRank = Object.freeze({
  OFFICIAL_ACTION: 600,
  OFFICIAL_SERVICE: 550,
  OFFICIAL_PARTNER: 500,
  OFFICIAL_TERMS: 450,
  TRUSTED_BENEFIT_SOURCE: 300,
  OTHER_WEB: 100,
});
export function buildAuthorityRegistry(services = [], env = process.env) {
  const serviceDomains = [];
  for (const service of services) {
    const urls = [
      service.cancelUrl,
      service.url,
      ...(Array.isArray(service.officialUrls) ? service.officialUrls : []),
    ].filter(Boolean);
    for (const url of urls) {
      const domain = hostname(url);
      if (domain) {
        serviceDomains.push({
          domain,
          type: "OFFICIAL_SERVICE",
          serviceId: service.id,
          name: service.name,
        });
      }
    }
  }

  let configured = [];
  if (env.BENEFIT_TRUSTED_SOURCE_DOMAINS_JSON) {
    try {
      const parsed = JSON.parse(env.BENEFIT_TRUSTED_SOURCE_DOMAINS_JSON);
      if (Array.isArray(parsed)) configured = parsed;
    } catch {
      configured = [];
    }
  }
  return [...serviceDomains, ...BUILT_IN_PARTNERS, ...configured];
}

export function classifySourceAuthority(url, {
  registry = [],
  targetServiceId = null,
  actionUrl = null,
} = {}) {
  const host = hostname(url);
  const actionHost = hostname(actionUrl);
  if (!host) return { type: "OTHER_WEB", score: AuthorityRank.OTHER_WEB };

  const entries = registry.filter((entry) => domainMatches(host, entry.domain));
  const exactTarget = entries.find(
    (entry) => entry.type === "OFFICIAL_SERVICE" && entry.serviceId === targetServiceId
  );
  const partner = entries.find((entry) => entry.type === "OFFICIAL_PARTNER");
  const trusted = entries.find((entry) => entry.type === "TRUSTED_BENEFIT_SOURCE");

  if (actionHost && host === actionHost && (exactTarget || partner)) {
    return { type: "OFFICIAL_ACTION", score: AuthorityRank.OFFICIAL_ACTION };
  }
  if (exactTarget) return { type: exactTarget.type, score: AuthorityRank.OFFICIAL_SERVICE };
  if (partner) return { type: partner.type, score: AuthorityRank.OFFICIAL_PARTNER };
  if (trusted) return { type: trusted.type, score: AuthorityRank.TRUSTED_BENEFIT_SOURCE };
  return { type: "OTHER_WEB", score: AuthorityRank.OTHER_WEB };
}
