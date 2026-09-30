import crypto from "node:crypto";
import * as cheerio from "cheerio";
import {
  ActionabilityStatus,
  DEFAULT_FETCH_TIMEOUT_MS,
  DEFAULT_MAX_HTML_BYTES,
} from "./constants.js";

const ACTION_TEXT =
  /(혜택\s*받기|신청(?:하기)?|가입(?:하기)?|구독(?:하기|\s*신청|\s*시작)|무료\s*체험|무료로\s*시작|시작(?:하기)?|활성화|선택(?:하기)?|쿠폰\s*(?:받기|발급)|할인\s*적용|요금제\s*변경|마이\s*멤버십|subscribe|start\s*free|free\s*trial|claim|activate|apply|join|get\s*offer)/i;
const DETAIL_ONLY_LABEL = /(?:자세히\s*보기|상세\s*(?:정보|보기)|이용\s*안내|정보\s*보기)/i;
const INFO_PATH =
  /\/(?:help|support|faq|news|article|blog|press|notice|guide)(?:\/|$)/i;
const LOGIN_PATH = /\/(?:login|signin|sign-in|auth|account|nidlogin(?:\.login)?)(?:\/|$|\.)/i;
const LOGIN_LABEL = /(마이\s*멤버십|내\s*계정|계정\s*연결|로그인)/i;
const INFO_HOST = /^(?:help|support|faq|customer|customerservice)\./i;

function isInfoUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return INFO_HOST.test(url.hostname) || INFO_PATH.test(url.pathname);
  } catch {
    return false;
  }
}

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function safeHttpsUrl(raw, base) {
  try {
    const url = new URL(raw, base);
    if (url.protocol !== "https:") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timer };
}

function jsonLdObjects($) {
  const values = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text();
    if (!raw.trim()) return;
    try {
      const parsed = JSON.parse(raw);
      const stack = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (stack.length) {
        const item = stack.shift();
        if (!item || typeof item !== "object") continue;
        values.push(item);
        if (Array.isArray(item["@graph"])) stack.push(...item["@graph"]);
      }
    } catch {
      // Invalid JSON-LD is ignored; DOM extraction remains available.
    }
  });
  return values;
}

export function discoverActionCandidates(html = "", pageUrl = "") {
  const $ = cheerio.load(html || "");
  const candidates = [];
  const seen = new Set();

  $("a[href], button, [role=button]").each((_, element) => {
    const node = $(element);
    // Product heroes often use <main><header> for a plan-specific CTA.
    // Keep those links while excluding site navigation and global chrome.
    if (node.closest("nav, footer").length ||
        (node.closest("header").length && !node.closest("main").length)) return;
    const label = normalizeText([
      node.text(),
      node.attr("aria-label"),
      node.attr("title"),
      node.attr("data-label"),
    ].filter(Boolean).join(" "));
    if (!ACTION_TEXT.test(label) || DETAIL_ONLY_LABEL.test(label)) return;

    const rawUrl =
      node.attr("href") ||
      node.attr("data-href") ||
      node.attr("data-url") ||
      "";
    const url = rawUrl ? safeHttpsUrl(rawUrl, pageUrl) : null;
    const key = `${label.toLowerCase()}|${url || ""}`;
    if (seen.has(key)) return;
    seen.add(key);

    candidates.push({
      label,
      url,
      requiresLogin: Boolean(
        (url && LOGIN_PATH.test(new URL(url).pathname)) ||
        LOGIN_LABEL.test(label)
      ),
      sameOrigin: Boolean(url && new URL(url).origin === new URL(pageUrl).origin),
      infoLike: Boolean(url && isInfoUrl(url)),
    });
  });

  return candidates;
}

export function classifyPage(snapshot = {}) {
  if (!snapshot.ok) {
    return { pageType: "UNAVAILABLE", actionability: ActionabilityStatus.UNAVAILABLE };
  }
  const url = snapshot.finalUrl || snapshot.url;
  const path = new URL(url).pathname;
  const actions = snapshot.actionCandidates || [];

  const currentUrl = safeHttpsUrl(url, url);
  // A link back to the exact same page is not a signup or redemption action.
  // It can appear under a "구독하기" label on a product page and must not
  // displace a separately verified action entrypoint for this variant.
  const actionable = actions.find((item) => item.url && !item.infoLike &&
    safeHttpsUrl(item.url, url) !== currentUrl);
  if (actionable) {
    return {
      pageType: "ACTION_OR_LANDING",
      actionability: actionable.requiresLogin
        ? ActionabilityStatus.VERIFIED_ENTRYPOINT
        : ActionabilityStatus.VERIFIED_ACTION,
      primaryAction: actionable,
    };
  }

  if (LOGIN_PATH.test(path) && ACTION_TEXT.test(snapshot.text || "")) {
    return {
      pageType: "ACTION_ENTRYPOINT",
      actionability: ActionabilityStatus.VERIFIED_ENTRYPOINT,
      primaryAction: { label: "로그인 후 혜택 적용", url, requiresLogin: true },
    };
  }

  if (isInfoUrl(url)) {
    return { pageType: "INFO_ONLY", actionability: ActionabilityStatus.INFO_ONLY };
  }

  return {
    pageType: ACTION_TEXT.test(snapshot.text || "") ? "POSSIBLE_LANDING" : "UNKNOWN",
    actionability: ActionabilityStatus.UNKNOWN,
  };
}

export async function fetchSourceSnapshot(url, {
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
  maxBytes = DEFAULT_MAX_HTML_BYTES,
  now = Date.now(),
} = {}) {
  const normalizedUrl = safeHttpsUrl(url, url);
  if (!normalizedUrl) {
    return {
      ok: false,
      url,
      reason: "INVALID_HTTPS_URL",
      observedAt: new Date(now).toISOString(),
    };
  }

  const { controller, timer } = timeoutSignal(timeoutMs);
  try {
    const response = await fetchImpl(normalizedUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "KkudokBenefitVerifier/2.0",
      },
    });
    const finalUrl = safeHttpsUrl(response.url || normalizedUrl, normalizedUrl);
    if (!response.ok) {
      return {
        ok: false,
        url: normalizedUrl,
        finalUrl,
        httpStatus: response.status,
        reason: `HTTP_${response.status}`,
        observedAt: new Date(now).toISOString(),
      };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      return {
        ok: false,
        url: normalizedUrl,
        finalUrl,
        httpStatus: response.status,
        reason: "NON_HTML",
        observedAt: new Date(now).toISOString(),
      };
    }

    const html = await response.text();
    if (Buffer.byteLength(html, "utf8") > maxBytes) {
      return {
        ok: false,
        url: normalizedUrl,
        finalUrl,
        httpStatus: response.status,
        reason: "HTML_TOO_LARGE",
        observedAt: new Date(now).toISOString(),
      };
    }

    const $ = cheerio.load(html);
    const clean = cheerio.load(html);
    clean("script:not([type='application/ld+json']),style,noscript,svg").remove();
    const text = normalizeText(clean("body").text()).slice(0, 120_000);
    const title = normalizeText($("title").first().text());
    const actionCandidates = discoverActionCandidates(html, finalUrl || normalizedUrl);

    const snapshot = {
      ok: true,
      url: normalizedUrl,
      finalUrl: finalUrl || normalizedUrl,
      httpStatus: response.status,
      contentType,
      title,
      html,
      text,
      jsonLd: jsonLdObjects($),
      actionCandidates,
      contentHash: crypto.createHash("sha256").update(html).digest("hex"),
      observedAt: new Date(now).toISOString(),
    };
    return { ...snapshot, ...classifyPage(snapshot) };
  } catch (error) {
    return {
      ok: false,
      url: normalizedUrl,
      reason: error?.name === "AbortError" ? "FETCH_TIMEOUT" : (error?.message || "FETCH_FAILED"),
      observedAt: new Date(now).toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}

// Inspect only the first HTTPS response when a known plan CTA may redirect to
// an authentication service. Following the login page can fail independently
// of the official CTA; the Location header is enough to test that boundary.
export async function probeFirstHttpsRedirect(url, {
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
  now = Date.now(),
} = {}) {
  const sourceUrl = safeHttpsUrl(url, url);
  if (!sourceUrl) return { ok: false, reason: "INVALID_HTTPS_URL" };
  const { controller, timer } = timeoutSignal(timeoutMs);
  try {
    const response = await fetchImpl(sourceUrl, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "KkudokBenefitVerifier/2.0",
      },
    });
    const responseUrl = safeHttpsUrl(response.url || sourceUrl, sourceUrl);
    const location = response.headers?.get?.("location");
    const finalUrl = location ? safeHttpsUrl(location, responseUrl || sourceUrl) : null;
    const ok = [301, 302, 303, 307, 308].includes(response.status) &&
      responseUrl === sourceUrl && Boolean(finalUrl);
    return { ok, url: sourceUrl, finalUrl, httpStatus: response.status,
      observedAt: new Date(now).toISOString(),
      reason: ok ? "FIRST_HTTPS_REDIRECT" : "NO_FIRST_HTTPS_REDIRECT" };
  } catch (error) {
    return { ok: false, url: sourceUrl, observedAt: new Date(now).toISOString(),
      reason: error?.name === "AbortError" ? "FETCH_TIMEOUT" : "FETCH_FAILED" };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWithOptionalRenderer(url, options = {}) {
  const snapshot = await fetchSourceSnapshot(url, options);
  const renderer = options.renderer;
  if (!snapshot.ok || typeof renderer !== "function") return snapshot;
  if (
    snapshot.actionability === ActionabilityStatus.VERIFIED_ACTION ||
    snapshot.actionability === ActionabilityStatus.VERIFIED_ENTRYPOINT
  ) {
    return snapshot;
  }

  try {
    const rendered = await renderer(snapshot.finalUrl || url);
    if (!rendered?.html) return snapshot;
    const $ = cheerio.load(rendered.html);
    const clean = cheerio.load(rendered.html);
    clean("script:not([type='application/ld+json']),style,noscript,svg").remove();
    const renderedSnapshot = {
      ...snapshot,
      html: rendered.html,
      text: normalizeText(clean("body").text()).slice(0, 120_000),
      jsonLd: jsonLdObjects($),
      actionCandidates: (rendered.actionCandidates?.length
        ? rendered.actionCandidates
        : discoverActionCandidates(rendered.html, rendered.finalUrl || snapshot.finalUrl || url)),
      contentHash: crypto.createHash("sha256").update(rendered.html).digest("hex"),
      finalUrl: rendered.finalUrl || snapshot.finalUrl || url,
      renderFallbackUsed: true,
    };
    return { ...renderedSnapshot, ...classifyPage(renderedSnapshot) };
  } catch (error) {
    return { ...snapshot, renderFallbackError: error?.message || "RENDER_FAILED" };
  }
}
