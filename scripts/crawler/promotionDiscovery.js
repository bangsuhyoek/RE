import crypto from "node:crypto";
import * as cheerio from "cheerio";

const BENEFIT_SIGNAL = /(제휴|할인|캐시백|무료|혜택|결합|번들|구독|이벤트|쿠폰|지원|멤버십데이)/i;
const NEW_ONLY = /(신규|첫\s*가입|첫\s*달|첫\s*정기결제|처음\s*가입|신규\s*회원|웰컴|무료\s*체험)/i;
const EXISTING_SIGNAL = /(기존\s*(?:가입자|회원|고객)|현재\s*(?:가입자|회원)|모든\s*고객|누구나)/i;

function normalize(value = "") {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function fingerprintText(value = "") {
  return normalize(value)
    .toLowerCase()
    .replace(/\d{4}[./-]\d{1,2}[./-]\d{1,2}/g, "")
    .replace(/[^a-z0-9가-힣%]/g, "");
}

function serviceTerms(service = {}) {
  return [
    service.id,
    service.name,
    ...(Array.isArray(service.aliases) ? service.aliases : []),
  ]
    .map(normalize)
    .filter((term) => term.length >= 2);
}

export function findMentionedServices(text, services = []) {
  const haystack = normalize(text).toLowerCase();
  return services.filter((service) =>
    serviceTerms(service).some((term) =>
      haystack.includes(term.toLowerCase())
    )
  );
}

export function inferAudience(text = "") {
  if (NEW_ONLY.test(text)) return "NEW";
  if (EXISTING_SIGNAL.test(text)) return "BOTH";
  return "UNKNOWN";
}

export function inferBenefitType(text = "") {
  if (/캐시백|페이백/i.test(text)) return "CASHBACK";
  if (/번들|결합/i.test(text)) return "BUNDLE_PRICE";
  if (/무료\s*(?:제공|이용|연동)|0원/i.test(text)) return "FREE_INCLUDED";
  if (/%\s*할인|퍼센트/i.test(text)) return "PERCENT_DISCOUNT";
  if (/할인|쿠폰/i.test(text)) return "FIXED_DISCOUNT";
  return "";
}

export function inferSavingPeriod(text = "") {
  if (/연간|연\s*\d|1년|12개월/i.test(text)) return "ANNUAL";
  if (/일회|1회|한\s*번/i.test(text)) return "ONE_TIME";
  if (/기간\s*동안|총\s*\d/i.test(text)) return "CAMPAIGN_TOTAL";
  return "MONTHLY_RECURRING";
}
export function buildCampaignFingerprint({
  partnerId,
  targetServiceIds = [],
  campaignIdentity = "",
}) {
  const stable = [
    normalize(partnerId).toLowerCase(),
    [...targetServiceIds].map((id) => normalize(id).toLowerCase()).sort().join(","),
    fingerprintText(campaignIdentity),
  ].join("|");
  return crypto.createHash("sha256").update(stable).digest("hex").slice(0, 24);
}

function benefitKeyword(text = "") {
  const match = normalize(text).match(
    /(캐시백|페이백|할인|무료|제휴|결합|번들|쿠폰|지원)/
  );
  return match?.[1] || "혜택";
}

function allowedUrl(rawUrl, source) {
  try {
    const url = new URL(rawUrl, source.listUrl);
    if (url.protocol !== "https:") return null;
    if (!source.allowedOrigins.includes(url.origin)) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function candidateFromText({ source, url, text, services, now }) {
  const mentioned = findMentionedServices(text, services);
  if (mentioned.length === 0 || !BENEFIT_SIGNAL.test(text)) return null;

  const targetServiceIds = [...new Set(mentioned.map((service) => service.id))];
  const keyword = benefitKeyword(text);
  const title = normalize(text).slice(0, 120);
  const campaignFingerprint = buildCampaignFingerprint({
    partnerId: source.partnerId,
    targetServiceIds,
    campaignIdentity: title,
  });

  return {
    id: `benefit-${campaignFingerprint}`,
    campaignFingerprint,
    title,
    kind: title,
    description: normalize(text).slice(0, 500),
    category: "제휴 이벤트",
    targetServiceIds,
    sourceServiceIds: targetServiceIds,
    audience: inferAudience(text),
    partnerType: source.partnerType,
    partnerId: source.partnerId,
    partnerName: source.partnerName,
    benefitType: inferBenefitType(text),
    savingPeriod: inferSavingPeriod(text),
    eligibilityRules: {},
    requiredCarrier: source.requiredCarrier || "",
    requiredMembership: source.requiredMembership || "",
    requiredCost: null,
    sourceUrl: url,
    sourceListUrl: source.listUrl,
    officialOrigin: new URL(url).origin,
    discoveredAt: new Date(now).toISOString(),
    url,
    allowedOrigins: source.allowedOrigins,
    brandTokens: mentioned.map((service) => service.name).filter(Boolean),
    campaignTokens: [mentioned[0]?.name, keyword].filter(Boolean),
    periodText: text,
    isCampaignPage: true,
  };
}
export function discoverPromotionCandidatesFromHtml({
  source,
  html,
  services = [],
  now = Date.now(),
}) {
  const $ = cheerio.load(html || "");
  const candidates = [];
  const seen = new Set();

  $("a[href]").each((_, element) => {
    const anchor = $(element);
    const url = allowedUrl(anchor.attr("href"), source);
    if (!url) return;

    const context = normalize([
      anchor.text(),
      anchor.attr("title"),
      anchor.attr("aria-label"),
      anchor.parent().text().slice(0, 300),
    ].filter(Boolean).join(" "));

    const candidate = candidateFromText({
      source,
      url,
      text: context,
      services,
      now,
    });
    if (!candidate || seen.has(candidate.campaignFingerprint)) return;
    seen.add(candidate.campaignFingerprint);
    candidates.push(candidate);
  });

  if (source.contentButtonPrefix && source.contentUrlTemplate) {
    $(`[id^="${source.contentButtonPrefix}"]`).each((_, element) => {
      const id = String($(element).attr("id") || "").slice(
        source.contentButtonPrefix.length
      );
      if (!id) return;
      const rawUrl = source.contentUrlTemplate.replace("{id}", id);
      const url = allowedUrl(rawUrl, source);
      if (!url) return;

      const context = normalize([
        $(element).text(),
        $(element).attr("aria-label"),
        $(element).parent().text().slice(0, 300),
      ].filter(Boolean).join(" "));
      const candidate = candidateFromText({
        source,
        url,
        text: context,
        services,
        now,
      });
      if (!candidate || seen.has(candidate.campaignFingerprint)) return;
      seen.add(candidate.campaignFingerprint);
      candidates.push(candidate);
    });
  }

  const pageText = normalize($("body").text()).slice(0, 6000);
  const selfCandidate = candidateFromText({
    source,
    url: source.listUrl,
    text: pageText,
    services,
    now,
  });
  if (
    source.allowSelfCandidate === true &&
    candidates.length === 0 &&
    selfCandidate &&
    !seen.has(selfCandidate.campaignFingerprint)
  ) {
    seen.add(selfCandidate.campaignFingerprint);
    candidates.push(selfCandidate);
  }

  return candidates;
}

async function fetchOfficialSource(source, fetchImpl, timeoutMs, maxBytes) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(source.listUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "KkudokBenefitDiscovery/1.0",
      },
    });

    const finalUrl = response.url || source.listUrl;
    const finalOrigin = new URL(finalUrl).origin;
    if (!source.allowedOrigins.includes(finalOrigin)) {
      throw new Error("UNAPPROVED_SOURCE_REDIRECT");
    }
    if (!response.ok) {
      throw new Error(`SOURCE_HTTP_${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      throw new Error("SOURCE_NON_HTML");
    }
    const html = await response.text();
    if (Buffer.byteLength(html, "utf8") > maxBytes) {
      throw new Error("SOURCE_TOO_LARGE");
    }
    return { html, finalUrl };
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverOfficialBenefits({
  sources = [],
  services = [],
  fetchImpl = globalThis.fetch,
  now = Date.now(),
  timeoutMs = 12000,
  maxBytes = 2_000_000,
} = {}) {
  const candidates = [];
  const failures = [];

  for (const source of sources) {
    try {
      const page = await fetchOfficialSource(
        source,
        fetchImpl,
        timeoutMs,
        maxBytes
      );
      const discovered = discoverPromotionCandidatesFromHtml({
        source: { ...source, listUrl: page.finalUrl },
        html: page.html,
        services,
        now,
      });
      candidates.push(...discovered);
    } catch (error) {
      failures.push({
        sourceId: source.id,
        reason: error.name === "AbortError" ? "SOURCE_TIMEOUT" : error.message,
      });
    }
  }
  const unique = new Map();
  for (const candidate of candidates) {
    if (!unique.has(candidate.campaignFingerprint)) {
      unique.set(candidate.campaignFingerprint, candidate);
    }
  }

  return {
    candidates: [...unique.values()],
    failures,
  };
}

function similarity(a = "", b = "") {
  const tokens = (value) => new Set(
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 2)
  );
  const left = tokens(a);
  const right = tokens(b);
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  left.forEach((token) => {
    if (right.has(token)) overlap += 1;
  });
  return overlap / Math.max(left.size, right.size);
}

export function rediscoverCampaign(previous = {}, candidates = []) {
  const exact = candidates.find((candidate) =>
    previous.campaignFingerprint &&
    candidate.campaignFingerprint === previous.campaignFingerprint
  );
  if (exact) return exact;

  const previousTargets = new Set(
    previous.targetServiceIds || previous.sourceServiceIds || []
  );
  return candidates
    .filter((candidate) => {
      if (previous.partnerId && candidate.partnerId !== previous.partnerId) {
        return false;
      }
      const overlaps = (candidate.targetServiceIds || [])
        .some((id) => previousTargets.has(id));
      return overlaps;
    })
    .map((candidate) => ({
      candidate,
      score: similarity(
        previous.title || previous.kind,
        candidate.title || candidate.kind
      ),
    }))
    .filter((entry) => entry.score >= 0.5)
    .sort((a, b) => b.score - a.score)[0]?.candidate || null;
}
