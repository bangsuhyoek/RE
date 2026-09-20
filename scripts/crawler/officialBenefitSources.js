const BUILT_IN_SOURCES = [
  {
    id: "naverplus-partners",
    partnerType: "MEMBERSHIP",
    partnerId: "naverplus",
    partnerName: "네이버플러스",
    listUrl: "https://help.naver.com/service/23168",
    allowedOrigins: [
      "https://help.naver.com",
      "https://nid.naver.com",
    ],
    contentButtonPrefix: "help-button-",
    contentUrlTemplate: "https://help.naver.com/service/23168/contents/{id}",
    requiredMembership: "naverplus",
  },
  {
    id: "skt-subscriptions",
    partnerType: "CARRIER",
    partnerId: "skt",
    partnerName: "SKT",
    listUrl: "https://www.tworld.co.kr/web/benefits/benefits-list",
    allowedOrigins: [
      "https://www.tworld.co.kr",
      "https://m.tworld.co.kr",
      "https://shop.tworld.co.kr",
      "https://m.sktuniverse.co.kr",
    ],
    requiredCarrier: "SKT",
  },
];

function isValidSource(source) {
  if (!source?.id || !source?.listUrl) return false;
  try {
    const url = new URL(source.listUrl);
    return (
      url.protocol === "https:" &&
      Array.isArray(source.allowedOrigins) &&
      source.allowedOrigins.includes(url.origin)
    );
  } catch {
    return false;
  }
}

export function getOfficialBenefitSources(env = process.env) {
  const configured = env.BENEFIT_DISCOVERY_SOURCES_JSON;
  if (!configured) return BUILT_IN_SOURCES;

  try {
    const parsed = JSON.parse(configured);
    if (!Array.isArray(parsed)) throw new Error("Expected an array");
    const valid = parsed.filter(isValidSource);
    return valid.length > 0 ? valid : BUILT_IN_SOURCES;
  } catch (error) {
    console.warn(
      "[BenefitDiscovery] Invalid BENEFIT_DISCOVERY_SOURCES_JSON:",
      error.message
    );
    return BUILT_IN_SOURCES;
  }
}

export const OFFICIAL_BENEFIT_SOURCES = BUILT_IN_SOURCES;
