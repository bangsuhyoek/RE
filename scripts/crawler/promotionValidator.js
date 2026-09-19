import * as cheerio from 'cheerio';

export const PromotionStatus = Object.freeze({ ACTIVE: 'ACTIVE', EXPIRED: 'EXPIRED', SUSPICIOUS: 'SUSPICIOUS' });
const DAY = 86400000;
const KST = 9 * 3600000;
const normalize = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const includes = (text, token) => normalize(text).toLowerCase().includes(normalize(token).toLowerCase());
const iso = ms => new Date(ms).toISOString();
const kstYear = ms => new Date(ms + KST).getUTCFullYear();
function instant(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return NaN;
  return Date.parse(value);
}
function dayInstant(y, m, d, end = false) {
  const utc = Date.UTC(y, m - 1, d);
  const dt = new Date(utc);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return utc - KST + (end ? DAY - 1 : 0);
}

/** No rollover guessing: yearless dates use referenceYear or the current KST year.
 * Ongoing describes a period, not proof that this particular campaign is live.
 */
export function parseKoreanCampaignPeriod(input, { now = Date.now(), referenceYear } = {}) {
  now = instant(now);
  if (!Number.isFinite(now)) throw new TypeError('now must be epoch milliseconds or a timezone-qualified ISO timestamp');
  const text = normalize(input);
  const dates = [];
  const occupied = [];
  let invalid = false;
  const year = referenceYear ?? kstYear(now);
  const add = (match, y, m, d, inferredYear = false) => {
    const start = dayInstant(y, m, d);
    if (start === null) invalid = true;
    dates.push({ start, end: start === null ? null : start + DAY - 1, index: match.index, length: match[0].length, inferredYear });
    occupied.push([match.index, match.index + match[0].length]);
  };
  for (const m of text.matchAll(/(?<!\d)(\d{4}|\d{2})\s*(?:[.\/-]|년)\s*(\d{1,2})\s*(?:[.\/-]|월)\s*(\d{1,2})(?:\s*일)?(?!\d)/g)) {
    const y = Number(m[1]); add(m, y < 100 ? 2000 + y : y, +m[2], +m[3]);
  }
  for (const m of text.matchAll(/(?<!\d)(?:(\d{4}|\d{2})\s*년\s*)?(\d{1,2})\s*월\s*말(?:일)?/g)) {
    const y = m[1] ? (+m[1] < 100 ? 2000 + +m[1] : +m[1]) : year;
    const month = +m[2]; add(m, y, month, new Date(Date.UTC(y, month, 0)).getUTCDate(), !m[1]);
  }
  for (const m of text.matchAll(/(?<![\d.\/-])(\d{1,2})\s*(?:[.\/-]|월)\s*(\d{1,2})(?:\s*일)?(?!\d)/g)) {
    if (occupied.some(([a, b]) => m.index < b && m.index + m[0].length > a)) continue;
    add(m, year, +m[1], +m[2], true);
  }
  dates.sort((a, b) => a.index - b.index);
  const ongoing = /상시|별도\s*공지\s*시까지|(?:한도|선착순|재고|예산)?\s*소진\s*시까지/.test(text);
  const unknown = reason => ({ kind: 'unknown', startAt: null, endAt: null, reason, inferredYear: false });
  if (invalid) return unknown('INVALID_CALENDAR_DATE');
  if (dates.length > 2) return unknown('MULTIPLE_DATE_CONTEXTS');
  let start = null, end = null;
  if (dates.length === 2) {
    const between = text.slice(dates[0].index + dates[0].length, dates[1].index);
    if (!/^\s*(?:[~～∼–—-]|부터)\s*$/.test(between)) return unknown('AMBIGUOUS_DATE_CONTEXT');
    start = dates[0].start; end = dates[1].end;
    if (start > end) return unknown('REVERSED_RANGE');
  } else if (dates.length === 1) {
    const d = dates[0];
    const suffix = text.slice(dates[0].index + dates[0].length);
    if (/^\s*부터/.test(suffix)) start = d.start;
    else if (/까지|마감|신청\s*기한|종료|[~～∼]/.test(text) || text === text.slice(d.index, d.index + d.length)) end = d.end;
    else return unknown('DATE_ROLE_UNKNOWN');
  } else if (!ongoing) return unknown('NO_ABSOLUTE_PERIOD');
  return { kind: end !== null ? 'bounded' : ongoing ? 'ongoing' : 'start-only', startAt: start === null ? null : iso(start), endAt: end === null ? null : iso(end), inferredYear: dates.some(d => d.inferredYear), reason: null };
}

function jsonText(value, depth = 0, budget = { remaining: 12000 }) {
  if (depth > 15 || budget.remaining <= 0 || value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).slice(0, budget.remaining); budget.remaining -= text.length; return text;
  }
  if (typeof value !== 'object') return '';
  return Object.values(value).slice(0, 500).map(v => jsonText(v, depth + 1, budget)).join(' ');
}
// Parse ONLY a balanced JSON object/array. Never eval website JavaScript.
function assignedJSON(script) {
  const assignment = /(?:window\.)?__INITIAL_STATE__\s*=\s*/.exec(script);
  if (!assignment) return null;
  const start = assignment.index + assignment[0].length;
  if (!['{', '['].includes(script[start])) return null;
  let depth = 0, quoted = false, escape = false;
  for (let i = start; i < script.length; i++) {
    const c = script[i];
    if (quoted) { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    else if (c === '{' || c === '[') depth++;
    else if ((c === '}' || c === ']') && --depth === 0) { try { return JSON.parse(script.slice(start, i + 1)); } catch { return null; } }
  }
  return null;
}

export function inspectCampaignHTML(html, promotion) {
  const $ = cheerio.load(html);
  const sources = [];
  const push = (kind, text) => { text = normalize(text); if (text) sources.push({ kind, text: text.slice(0, 24000) }); };
  $('meta[property^="og:"], meta[name^="twitter:"]').each((_, el) => {
    const key = $(el).attr('property') ?? $(el).attr('name');
    if (/(?:title|description)$/.test(key)) push('structured-meta', $(el).attr('content'));
  });
  $('script[type="application/ld+json"]').each((_, el) => { try { push('json-ld', jsonText(JSON.parse($(el).text()))); } catch {} });
  $('script').each((_, el) => {
    const node = $(el), raw = node.text();
    if (node.attr('type') === 'application/ld+json') return;
    if (node.attr('id') === '__NEXT_DATA__' || /application\/(?:json|[^;]+\+json)/.test(node.attr('type') ?? '')) {
      try { push('hydration', jsonText(JSON.parse(raw))); } catch {}
    } else { const data = assignedJSON(raw); if (data) push('hydration', jsonText(data)); }
  });
  push('description', $('meta[name="description"]').attr('content'));
  push('title', $('title').text());
  let containerCount = 0, containerText = '', selectorError = false;
  if (promotion.campaignSelector) {
    try {
      const nodes = $(promotion.campaignSelector); containerCount = nodes.length;
      if (containerCount === 1) { const clone = nodes.clone(); clone.find('script,style,template,noscript,[hidden],[aria-hidden="true"]').remove(); containerText = normalize(clone.text()); }
    } catch { selectorError = true; }
  }
  const shellRoot = $('#root, #app, #__next').length > 0;
  $('script,style,template,noscript,[hidden],[aria-hidden="true"]').remove();
  const bodyText = normalize($('body').text());
  if (containerText) push('container', containerText);
  return { sources, bodyText, containerText, containerCount, selectorError, isSpaShell: shellRoot && bodyText.length < 200 };
}

const TERMINATED = /이벤트\s*가?\s*종료되었습니다|프로모션\s*이?\s*종료되었습니다|마감되었습니다/;
const BLOCKED = /cf-chl-|challenge-platform|verify you are human|just a moment|access denied|g-recaptcha|hcaptcha|captcha[-_ ](?:challenge|container|widget)/i;

export class PromotionStatusDetector {
  detect({ inspection, period, now, httpStatus, irrelevantRedirect = false }) {
    if (httpStatus === 404 || httpStatus === 410) return 'OFFICIAL_PAGE_GONE';
    if (irrelevantRedirect) return 'IRRELEVANT_REDIRECT';
    if (period.endAt && instant(period.endAt) < now) return 'DEADLINE_PASSED';
    // Do not search arbitrary hydration objects: they often contain historical campaigns.
    if (inspection && TERMINATED.test(inspection.containerText)) return 'TERMINATION_BANNER';
    return null;
  }
}

export class SemanticPromotionVerifier {
  verify(inspection, promotion, period, previousValid = false) {
    const brandTokens = promotion.brandTokens ?? [promotion.serviceName];
    const campaignTokens = (promotion.campaignTokens ?? []).filter(t => normalize(t));
    const brandFound = inspection.sources.some(s => brandTokens.some(t => normalize(t) && includes(s.text, t)));
    // Tokens must identify this campaign (offer/name/code), not merely the service.
    const matchesCampaign = text => campaignTokens.length > 0 && campaignTokens.every(t => includes(text, t));
    const campaignSources = inspection.sources.filter(s => matchesCampaign(s.text));
    const campaignFound = campaignSources.length > 0;
    const signals = [];
    const add = (name, points, condition) => { if (condition) signals.push({ name, points }); };
    add('SERVICE_BRANDING', 20, brandFound);
    add('CAMPAIGN_IDENTITY', 35, campaignFound);
    add('STRUCTURED_CAMPAIGN_EVIDENCE', 10, campaignSources.some(s => ['structured-meta', 'json-ld', 'hydration'].includes(s.kind)));
    add('SCOPED_CONTAINER', 10, inspection.containerCount === 1 && matchesCampaign(inspection.containerText));
    add('KNOWN_PERIOD', 15, period.kind !== 'unknown');
    add('PREVIOUS_VERIFICATION', 10, previousValid);
    return { score: Math.min(100, signals.reduce((sum, s) => sum + s.points, 0)), signals, brandFound, campaignFound, matchesCampaign };
  }
}

async function fetchPage(url, { fetchImpl, timeoutMs, maxBytes, allowedOrigins }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = new URL(url);
    for (let hop = 0; hop <= 5; hop++) {
      if (current.protocol !== 'https:' || current.username || current.password || !allowedOrigins.includes(current.origin)) throw new Error('URL_NOT_ALLOWLISTED');
      const response = await fetchImpl(current.href, { signal: controller.signal, redirect: 'manual', headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'SubMatePromotionVerifier/2.0' } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location) throw new Error('INVALID_REDIRECT');
        current = new URL(location, current); continue;
      }
      const contentType = response.headers.get('content-type') ?? '';
      if (response.status >= 400 || !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
        await response.body?.cancel();
        return { httpStatus: response.status, finalUrl: current.href, contentType, html: '' };
      }
      const reader = response.body?.getReader();
      const chunks = []; let size = 0;
      if (reader) {
        try {
          while (true) {
            const { value, done } = await reader.read(); if (done) break;
            size += value.byteLength;
            if (size > maxBytes) { await reader.cancel(); throw new Error('RESPONSE_TOO_LARGE'); }
            chunks.push(Buffer.from(value));
          }
        } finally { reader.releaseLock(); }
      }
      return { httpStatus: response.status, finalUrl: current.href, contentType, html: Buffer.concat(chunks).toString('utf8') };
    }
    throw new Error('REDIRECT_LIMIT');
  } finally { clearTimeout(timer); }
}

/** previous must come from trusted server-side verification storage, never scraper input.
 * acceptedUrls and allowedOrigins are operator-maintained exact allowlists.
 */
export async function validatePromotion(promotion, {
  previous = null, now = Date.now(), fetchImpl = globalThis.fetch,
  timeoutMs = 12000, maxBytes = 2_000_000, threshold = 60,
  maxVerificationAgeMs = 7 * DAY, maxSoftDegradationMs = 48 * 3600000,
} = {}) {
  now = instant(now);
  if (!Number.isFinite(now)) throw new TypeError('Invalid now');
  if (!promotion.id || !promotion.url) throw new TypeError('id and url are required');
  const previousAt = instant(previous?.lastVerifiedAt);
  const sameCampaign = previous?.id === promotion.id && previous?.url === promotion.url;
  const previousValid = sameCampaign && previous?.status === 'ACTIVE' && previous?.verification?.verified === true && Number.isFinite(previousAt) && previousAt <= now && now - previousAt <= maxVerificationAgeMs;
  const priorPeriod = sameCampaign && previous?.verification?.verified === true ? previous.verifiedPeriod : null;
  let period = parseKoreanCampaignPeriod(promotion.periodText, { now, referenceYear: promotion.referenceYear });
  // A previously verified deadline cannot be extended by untrusted scrape output.
  if (priorPeriod?.endAt && Number.isFinite(instant(priorPeriod.endAt)) && (!period.endAt || instant(priorPeriod.endAt) < instant(period.endAt))) period = priorPeriod;
  const detector = new PromotionStatusDetector();
  const finish = (status, reason, extra = {}) => ({ id: promotion.id, status, reason, score: 0, checkedAt: iso(now), period, isSoftDegraded: false, lastVerifiedAt: previous?.lastVerifiedAt ?? null, ...extra });
  const expired = detector.detect({ period, now });
  if (expired) return finish('EXPIRED', expired);
  const soft = reason => {
    const since = instant(previous?.softDegradedSince ?? iso(now));
    const deadline = instant(priorPeriod?.endAt);
    const start = priorPeriod?.startAt ? instant(priorPeriod.startAt) : null;
    const eligible = previousValid && deadline >= now && (start === null || start <= now) && Number.isFinite(since) && since <= now && now - since <= maxSoftDegradationMs;
    return finish(eligible ? 'ACTIVE' : 'SUSPICIOUS', reason, {
      score: eligible ? 65 : 0, isSoftDegraded: eligible,
      warnings: [reason], softDegradedSince: iso(Number.isFinite(since) ? since : now),
      ...(eligible ? { verifiedPeriod: priorPeriod, verification: previous.verification } : {}),
    });
  };
  let page;
  try {
    page = await fetchPage(promotion.url, { fetchImpl, timeoutMs, maxBytes, allowedOrigins: promotion.allowedOrigins ?? [new URL(promotion.url).origin] });
  } catch (error) {
    if (/URL_NOT_ALLOWLISTED|INVALID_REDIRECT|REDIRECT_LIMIT|RESPONSE_TOO_LARGE/.test(error.message)) return finish('SUSPICIOUS', error.message);
    return soft(error.name === 'AbortError' ? 'CRAWL_TIMEOUT' : 'CRAWL_FAILED');
  }
  const gone = detector.detect({ period, now, httpStatus: page.httpStatus });
  if (gone) return finish('EXPIRED', gone);
  if ([401, 403, 408, 429].includes(page.httpStatus) || page.httpStatus >= 500) return soft(`HTTP_${page.httpStatus}`);
  if (page.httpStatus < 200 || page.httpStatus >= 300) return finish('SUSPICIOUS', `HTTP_${page.httpStatus}`);
  if (!/text\/html|application\/xhtml\+xml/i.test(page.contentType)) return finish('SUSPICIOUS', 'NON_HTML_RESPONSE');
  if (BLOCKED.test(page.html)) return soft('BOT_CHALLENGE');
  // Tracking parameters/hash do not make a redirect irrelevant. Other URL changes
  // are reviewed unless explicitly declared irrelevant; locale/login redirects are not expiration proof.
  const canonical = value => { const u = new URL(value); u.hash = ''; for (const key of [...u.searchParams.keys()]) if (/^(utm_|gclid$|fbclid$)/.test(key)) u.searchParams.delete(key); u.searchParams.sort(); return u.href; };
  if ((promotion.irrelevantUrls ?? []).some(u => canonical(u) === canonical(page.finalUrl))) return finish('EXPIRED', 'IRRELEVANT_REDIRECT');
  if (![promotion.url, ...(promotion.acceptedUrls ?? [])].some(u => canonical(u) === canonical(page.finalUrl))) return finish('SUSPICIOUS', 'UNAPPROVED_REDIRECT');
  const inspection = inspectCampaignHTML(page.html, promotion);
  let hard = detector.detect({ inspection, period, now });
  if (hard) return finish('EXPIRED', hard);
  const verifier = new SemanticPromotionVerifier();
  let evidence = verifier.verify(inspection, promotion, period, previousValid);
  // A visible full-page termination notice is valid only on a campaign-specific URL
  // or alongside this campaign's identity. Shared homepages must not be marked dedicated.
  if (TERMINATED.test(inspection.bodyText) && (promotion.isCampaignPage === true || evidence.matchesCampaign(inspection.bodyText))) return finish('EXPIRED', 'TERMINATION_BANNER');
  // Parse live periods only from a unique campaign-scoped container or a narrow,
  // campaign-matching description. Never infer a deadline from a whole hydration tree.
  const texts = [inspection.containerCount === 1 && evidence.matchesCampaign(inspection.containerText) ? inspection.containerText : '', ...inspection.sources.filter(s => ['structured-meta', 'description'].includes(s.kind) && evidence.matchesCampaign(s.text)).map(s => s.text)].filter(Boolean);
  for (const text of texts) {
    const live = parseKoreanCampaignPeriod(text, { now, referenceYear: promotion.referenceYear });
    if (live.kind === 'unknown') continue;
    if (live.endAt && instant(live.endAt) < now) return finish('EXPIRED', 'LIVE_DEADLINE_PASSED', { period: live });
    if (period.kind === 'unknown' || (live.endAt && (!period.endAt || instant(live.endAt) < instant(period.endAt)))) period = live;
  }
  if (period.startAt && instant(period.startAt) > now) return finish('SUSPICIOUS', 'NOT_STARTED');
  if (period.kind === 'unknown') return finish('SUSPICIOUS', 'UNRESOLVED_PERIOD');
  evidence = verifier.verify(inspection, promotion, period, previousValid);
  const { matchesCampaign, ...report } = evidence;
  const active = evidence.brandFound && evidence.campaignFound && evidence.score >= threshold;
  return finish(active ? 'ACTIVE' : 'SUSPICIOUS', active ? 'VERIFIED' : 'INSUFFICIENT_CAMPAIGN_EVIDENCE', {
    ...report, isSpaShell: inspection.isSpaShell,
    warnings: inspection.selectorError ? ['INVALID_SELECTOR'] : inspection.containerCount !== 1 ? ['DOM_CONTAINER_UNAVAILABLE_METADATA_USED'] : [],
    ...(active ? { lastVerifiedAt: iso(now), verifiedPeriod: period, verification: { verified: true, method: 'multi-signal-v2' }, softDegradedSince: null } : {}),
  });
}
