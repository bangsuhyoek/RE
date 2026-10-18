/**
 * 프로모션 페이지 수집기
 *
 * 대부분의 구독 서비스 페이지는 자바스크립트로 내용을 그리기 때문에 단순 fetch로는
 * 빈 껍데기만 받는다. 설치된 Chrome/Edge를 headless로 띄워 실제로 보이는 텍스트를 읽고,
 * 로그인 벽·봇 차단·404를 구분해 돌려준다. 브라우저가 없으면 fetch로 대체한다.
 */

import * as cheerio from "cheerio";
import { inspectCampaignHTML } from "../promotionValidator.js";

export const PageState = Object.freeze({
  OK: "OK",
  NOT_FOUND: "NOT_FOUND",
  LOGIN_REQUIRED: "LOGIN_REQUIRED",
  BLOCKED: "BLOCKED",
  EMPTY: "EMPTY",
  ERROR: "ERROR",
});

export const DESKTOP_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

export const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

export const DESKTOP_HEADERS = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "sec-ch-ua": '"Chromium";v="140", "Not?A_Brand";v="24", "Google Chrome";v="140"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};

export const MOBILE_HEADERS = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

const USER_AGENT = DESKTOP_USER_AGENT;

const LOGIN_URL_PATTERNS = [
  /\/(?:log-?in|sign-?in|signin|auth|nidlogin|oauth|sso)(?:[/?#.]|$)/i,
  /accounts\.google\.com/i,
  /login\.(?:microsoftonline|live)\.com/i,
  /nid\.naver\.com\/nidlogin/i,
  /appleid\.apple\.com/i,
];

export const BLOCK_TEXT_PATTERNS = [
  /just a moment/i,
  /verify (?:you are|that you're) (?:a )?human/i,
  /access denied/i,
  /are you a robot/i,
  /captcha/i,
  /비정상적인 접근/,
  /요청이 차단/,
  /access to this page has been denied/i,
  /automation tools/i,
  /datadome/i,
  /reference\s*#/i,
  /pardon our interruption/i,
  /unusual traffic/i,
];

const NOT_FOUND_TEXT_PATTERNS = [
  /페이지를 찾을 수 없/,
  /존재하지 않는 페이지/,
  /page (?:not found|could not be found)/i,
  /^404\b/m,
];

function isLoginUrl(url) {
  return LOGIN_URL_PATTERNS.some((re) => re.test(url));
}

/**
 * Content-Type 헤더 또는 <meta> 태그에서 charset을 감지하여 buffer를 디코딩한다.
 * euc-kr / cp949 / windows-949 등 한국어 레거시 인코딩을 지원한다.
 */
export function decodeHtmlBuffer(buffer, contentTypeHeader) {
  let charset = null;
  if (contentTypeHeader && typeof contentTypeHeader === "string") {
    const m = /charset\s*=\s*["']?([a-zA-Z0-9_-]+)/i.exec(contentTypeHeader);
    if (m) charset = m[1];
  }
  if (!charset && buffer && buffer.length > 0) {
    const maxScan = Math.min(buffer.length, 2048);
    let head = "";
    for (let i = 0; i < maxScan; i++) {
      head += String.fromCharCode(buffer[i]);
    }
    const m1 = /<meta[^>]+charset\s*=\s*["']?([a-zA-Z0-9_-]+)/i.exec(head);
    if (m1) {
      charset = m1[1];
    } else {
      const m2 = /<meta[^>]+content\s*=\s*["'][^"']*charset\s*=\s*([a-zA-Z0-9_-]+)/i.exec(head);
      if (m2) charset = m2[1];
    }
  }

  const raw = (charset || "utf-8").toLowerCase().trim();
  const encoding = ["cp949", "windows-949", "euckr", "euc-kr", "ks_c_5601-1987", "korean"].includes(raw)
    ? "euc-kr"
    : raw;
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

/** HTML 내 OpenGraph, meta description, JSON-LD 등 구조화 메타데이터 텍스트를 추출한다 */
export function extractStructuredMetadataText(html) {
  if (!html || typeof html !== "string") return "";
  try {
    const inspection = inspectCampaignHTML(html, {});
    const metaChunks = inspection.sources
      .filter((s) => ["structured-meta", "description", "json-ld", "title"].includes(s.kind))
      .map((s) => s.text)
      .filter(Boolean);
    return [...new Set(metaChunks)].join("\n");
  } catch {
    return "";
  }
}

/** 차단 원인 분석 */
export function detectBlockReason({ status, text }) {
  const body = String(text ?? "").trim();
  const matched = BLOCK_TEXT_PATTERNS.find((re) => re.test(body.slice(0, 3000)));
  if (matched) return `BLOCK_PATTERN: ${matched.source}`;
  if (status === 403 || status === 429 || status === 503) return `HTTP_${status}_BLOCKED`;
  return "BLOCKED";
}

/** 수집 결과 상태 판정 (브라우저/fetch 공통) */
export function classifyPage({ requestedUrl, finalUrl, status, text }, { withReason = false } = {}) {
  const body = String(text ?? "").trim();
  if (status === 404 || status === 410) {
    return withReason ? { state: PageState.NOT_FOUND } : PageState.NOT_FOUND;
  }
  if (finalUrl && isLoginUrl(finalUrl) && !isLoginUrl(requestedUrl)) {
    return withReason ? { state: PageState.LOGIN_REQUIRED } : PageState.LOGIN_REQUIRED;
  }
  if (status === 401) {
    return withReason ? { state: PageState.LOGIN_REQUIRED } : PageState.LOGIN_REQUIRED;
  }
  if (status === 403 || status === 429 || status === 503) {
    const isBlocked = !(body.length > 800 && !BLOCK_TEXT_PATTERNS.some((re) => re.test(body.slice(0, 2000))));
    if (isBlocked) {
      const blockReason = detectBlockReason({ status, text });
      return withReason ? { state: PageState.BLOCKED, blockReason } : PageState.BLOCKED;
    }
    return withReason ? { state: PageState.OK } : PageState.OK;
  }
  if (body.length < 800 && BLOCK_TEXT_PATTERNS.some((re) => re.test(body))) {
    const blockReason = detectBlockReason({ status, text });
    return withReason ? { state: PageState.BLOCKED, blockReason } : PageState.BLOCKED;
  }
  if (body.length < 1500 && NOT_FOUND_TEXT_PATTERNS.some((re) => re.test(body))) {
    return withReason ? { state: PageState.NOT_FOUND } : PageState.NOT_FOUND;
  }
  if (status >= 400) {
    return withReason ? { state: PageState.ERROR } : PageState.ERROR;
  }
  if (body.length < 80) {
    return withReason ? { state: PageState.EMPTY } : PageState.EMPTY;
  }
  return withReason ? { state: PageState.OK } : PageState.OK;
}

/** 일시적인 장애 상태 여부 판단 (재시도 대상) */
export function isTransientOutcome({ status, state, error }) {
  if (status === 404 || status === 410 || status === 401) return false;
  if (state === PageState.LOGIN_REQUIRED) return false;
  if (status === 429 || status === 502 || status === 503 || status === 504) return true;
  if (state === PageState.BLOCKED) return false;
  if (error) return true;
  return false;
}

/** 재시도 지연 시간(ms) 산출 (Retry-After 고려, 최대 15초 제한) */
export function calculateRetryDelay({ retryAfter, attempt = 0, jitter = true, maxDelayMs = 15000, now = Date.now() } = {}) {
  if (retryAfter) {
    const sec = Number(retryAfter);
    if (Number.isFinite(sec) && sec >= 0) {
      return Math.min(sec * 1000, maxDelayMs);
    }
    const dateMs = Date.parse(retryAfter);
    if (Number.isFinite(dateMs) && dateMs > now) {
      return Math.min(dateMs - now, maxDelayMs);
    }
  }
  const baseMs = attempt === 0 ? 1000 : 3000;
  const randomJitter = jitter ? Math.floor(Math.random() * 500) : 0;
  return Math.min(baseMs + randomJitter, maxDelayMs);
}

/** 두 페이지 수집 결과 중 더 우수한 것을 선택 (OK 우선, 그 외 텍스트 길이 우선) */
export function pickBetterPageResult(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.state === PageState.OK && b.state !== PageState.OK) return a;
  if (b.state === PageState.OK && a.state !== PageState.OK) return b;
  const lenA = (a.text ?? "").length;
  const lenB = (b.text ?? "").length;
  return lenA >= lenB ? a : b;
}

export async function fetchWithoutBrowser(url, { timeoutMs = 30000, userAgent = DESKTOP_USER_AGENT } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    const buffer = new Uint8Array(await res.arrayBuffer());
    const html = decodeHtmlBuffer(buffer, res.headers.get("content-type"));
    const metaText = extractStructuredMetadataText(html);
    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();
    $("br, p, div, li, h1, h2, h3, h4, section, tr").each((_, el) => {
      $(el).append("\n");
    });
    const bodyText = $("body").text();
    const combinedText = [bodyText, metaText].filter(Boolean).join("\n");
    return {
      finalUrl: res.url,
      status: res.status,
      title: $("title").text().trim(),
      text: combinedText,
      retryAfter: res.headers.get("retry-after") ?? undefined,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function launchBrowser({ headless }) {
  let playwright;
  try {
    playwright = await import("playwright-core");
  } catch {
    return { browser: null, reason: "playwright-core 미설치" };
  }
  const errors = [];
  for (const channel of ["chrome", "msedge"]) {
    try {
      const browser = await playwright.chromium.launch({
        channel,
        headless,
        args: ["--disable-blink-features=AutomationControlled"],
      });
      return { browser, channel };
    } catch (error) {
      errors.push(channel + ": " + String(error.message).split("\n")[0]);
    }
  }
  return { browser: null, reason: errors.join(" / ") };
}

async function configureContext(context) {
  // navigator.webdriver 속성 은폐
  await context.addInitScript(() => {
    try {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
    } catch {}
  }).catch(() => {});

  // 이미지, 미디어, 폰트 요청 차단 (DOM alt 텍스트는 보존됨)
  await context.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (type === "image" || type === "media" || type === "font") {
      return route.abort();
    }
    return route.continue();
  }).catch(() => {});
}

export async function createPageFetcher({
  headless = true,
  timeoutMs = 30000,
  settleMs = 6000,
  useBrowser = true,
  maxRetries = 2,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  const launched = useBrowser ? await launchBrowser({ headless }) : { browser: null, reason: "브라우저 사용 안 함" };
  const { browser } = launched;
  let desktopContext = null;
  let mobileContext = null;

  async function getBrowserContext(device = "desktop") {
    if (!browser) return null;
    if (device === "mobile") {
      if (!mobileContext) {
        mobileContext = await browser.newContext({
          locale: "ko-KR",
          timezoneId: "Asia/Seoul",
          userAgent: MOBILE_USER_AGENT,
          viewport: { width: 390, height: 844 },
          isMobile: true,
          hasTouch: true,
          extraHTTPHeaders: MOBILE_HEADERS,
        });
        await configureContext(mobileContext);
      }
      return mobileContext;
    }
    if (!desktopContext) {
      desktopContext = await browser.newContext({
        locale: "ko-KR",
        timezoneId: "Asia/Seoul",
        userAgent: DESKTOP_USER_AGENT,
        viewport: { width: 1366, height: 900 },
        extraHTTPHeaders: DESKTOP_HEADERS,
      });
      await configureContext(desktopContext);
    }
    return desktopContext;
  }

  async function attemptBrowserFetch(url, hints) {
    const context = await getBrowserContext(hints?.device);
    if (!context) throw new Error("브라우저 컨텍스트 사용 불가");
    const page = await context.newPage();
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
      await page.waitForLoadState("networkidle", { timeout: settleMs }).catch(() => {});
      if (hints?.waitFor) {
        await page.waitForSelector(hints.waitFor, { timeout: Math.min(settleMs, 10000) }).catch(() => {});
      }
      // 지연 로딩되는 요금/혜택 영역을 깨우기 위해 한 번 끝까지 스크롤
      await page
        .evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight && y < 20000; y += 900) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 120));
          }
        })
        .catch(() => {});
      if (hints?.extraWaitMs && hints.extraWaitMs > 0) {
        await page.waitForTimeout(Math.min(hints.extraWaitMs, 10000)).catch(() => {});
      } else {
        await page.waitForTimeout(800).catch(() => {});
      }

      // innerText + 캐러셀 슬라이더(aria-hidden 포함) + img[alt] + [aria-label] + [title] 추출
      const domTexts = await page
        .evaluate(() => {
          const bodyText = document.body?.innerText ?? "";
          const extraLines = [];
          const carouselEls = document.querySelectorAll('[class*="slide"], [class*="swiper"], [class*="carousel"]');
          for (const el of carouselEls) {
            const t = el.textContent?.trim();
            if (t) {
              for (const line of t.split(/\r?\n/)) {
                const trimmed = line.trim();
                if (trimmed) extraLines.push(trimmed);
              }
            }
          }
          const imgs = document.querySelectorAll("img[alt]");
          for (const img of imgs) {
            const alt = img.getAttribute("alt")?.trim();
            if (alt) extraLines.push(alt);
          }
          const ariaEls = document.querySelectorAll("[aria-label]");
          for (const el of ariaEls) {
            const label = el.getAttribute("aria-label")?.trim();
            if (label) extraLines.push(label);
          }
          const titleEls = document.querySelectorAll("[title]");
          for (const el of titleEls) {
            const title = el.getAttribute("title")?.trim();
            if (title) extraLines.push(title);
          }

          const existing = new Set(
            bodyText
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(Boolean)
          );
          const dedupedExtra = [];
          const seen = new Set();
          let totalChars = 0;
          const MAX_EXTRA = 20000;
          for (const line of extraLines) {
            if (!existing.has(line) && !seen.has(line)) {
              seen.add(line);
              if (totalChars + line.length + 1 > MAX_EXTRA) {
                const rem = MAX_EXTRA - totalChars;
                if (rem > 10) dedupedExtra.push(line.slice(0, rem));
                break;
              }
              dedupedExtra.push(line);
              totalChars += line.length + 1;
            }
          }
          return { bodyText, extraText: dedupedExtra.join("\n") };
        })
        .catch(() => ({ bodyText: "", extraText: "" }));

      const pageHtml = await page.content().catch(() => "");
      const metaText = extractStructuredMetadataText(pageHtml);
      const combinedText = [domTexts.bodyText, domTexts.extraText, metaText].filter(Boolean).join("\n");
      return {
        finalUrl: page.url(),
        status: response?.status() ?? 0,
        title: await page.title().catch(() => ""),
        text: combinedText,
        retryAfter: response?.headers()["retry-after"] ?? undefined,
      };
    } finally {
      await page.close().catch(() => {});
    }
  }

  async function fetchPage(url, hints = {}) {
    const startedAt = Date.now();
    const hasBrowser = Boolean(browser);
    const preferFetch = Boolean(hints?.preferFetch);
    const ua = hints?.device === "mobile" ? MOBILE_USER_AGENT : DESKTOP_USER_AGENT;

    async function executeWithRetry(fn, operationName) {
      let lastResult = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const snapshot = await fn();
          const classification = classifyPage({ requestedUrl: url, ...snapshot }, { withReason: true });
          const outcome = {
            requestedUrl: url,
            method: operationName,
            ...snapshot,
            state: classification.state,
            ...(classification.blockReason ? { blockReason: classification.blockReason } : {}),
            elapsedMs: Date.now() - startedAt,
          };
          lastResult = outcome;
          if (isTransientOutcome(outcome) && attempt < maxRetries) {
            const isThrottledOrDown = outcome.status === 429 || outcome.status === 503;
            if (isThrottledOrDown && attempt >= 1) {
              return outcome;
            }
            const delay = calculateRetryDelay({
              retryAfter: outcome.retryAfter,
              attempt,
              jitter: true,
              ...(isThrottledOrDown ? { maxDelayMs: 30000 } : {}),
            });
            await sleep(delay);
            continue;
          }
          return outcome;
        } catch (err) {
          const errorMsg = String(err?.message ?? err).split("\n")[0];
          const errOutcome = {
            requestedUrl: url,
            method: operationName,
            finalUrl: null,
            status: 0,
            title: "",
            text: "",
            state: PageState.ERROR,
            error: errorMsg,
            elapsedMs: Date.now() - startedAt,
          };
          lastResult = errOutcome;
          if (isTransientOutcome(errOutcome) && attempt < maxRetries) {
            const delay = calculateRetryDelay({ attempt, jitter: true });
            await sleep(delay);
            continue;
          }
          return errOutcome;
        }
      }
      return lastResult;
    }

    // 1. preferFetch인 경우 fetch 먼저 시도
    if (preferFetch) {
      const fetchResult = await executeWithRetry(
        () => fetchWithoutBrowser(url, { timeoutMs, userAgent: ua }),
        "fetch"
      );
      if (fetchResult.state === PageState.OK || !hasBrowser) {
        return fetchResult;
      }
      const browserResult = await executeWithRetry(
        () => attemptBrowserFetch(url, hints),
        "browser"
      );
      return pickBetterPageResult(fetchResult, browserResult);
    }

    // 2. 브라우저가 없으면 fetch만 수행
    if (!hasBrowser) {
      return executeWithRetry(
        () => fetchWithoutBrowser(url, { timeoutMs, userAgent: ua }),
        "fetch"
      );
    }

    // 3. 브라우저 기본 모드
    const browserResult = await executeWithRetry(
      () => attemptBrowserFetch(url, hints),
      "browser"
    );

    // 4. Per-page fallback: 브라우저 결과가 ERROR/EMPTY/BLOCKED면 fetch 시도
    if ([PageState.ERROR, PageState.EMPTY, PageState.BLOCKED].includes(browserResult.state)) {
      const fetchFallback = await executeWithRetry(
        () => fetchWithoutBrowser(url, { timeoutMs, userAgent: ua }),
        "fetch-fallback"
      );
      return pickBetterPageResult(browserResult, fetchFallback);
    }

    return browserResult;
  }

  return {
    mode: browser ? "browser:" + launched.channel : "fetch",
    fallbackReason: browser ? null : launched.reason,
    fetchPage,
    async close() {
      await mobileContext?.close().catch(() => {});
      await desktopContext?.close().catch(() => {});
      await browser?.close().catch(() => {});
    },
  };
}

/**
 * 도메인별 예의(호스트당 최대 1개 동시 실행, 요청 간 최소 gap 유지),
 * 전역 concurrency 제한, URL+device 기반 캐시를 지원하는 큐 생성기.
 */
export function createCachedQueue(
  fetchPage,
  {
    limit = 4,
    minGapMs = 800,
    jitterMs = 400,
    clock = { now: () => Date.now() },
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    random = () => Math.random(),
  } = {}
) {
  const cache = new Map();
  let globalActive = 0;
  const hostActive = new Set();
  const hostNextAllowedTime = new Map();
  const waitingTasks = [];
  let nextPumpScheduledAt = null;

  function getHostname(url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "unknown";
    }
  }

  function pump() {
    const now = clock.now();
    let nextWaitMs = Infinity;

    while (globalActive < limit) {
      let candidateIndex = -1;
      for (let i = 0; i < waitingTasks.length; i++) {
        const task = waitingTasks[i];
        if (hostActive.has(task.hostname)) {
          continue;
        }
        const allowedAt = hostNextAllowedTime.get(task.hostname) ?? 0;
        if (now >= allowedAt) {
          candidateIndex = i;
          break;
        } else {
          const diff = allowedAt - now;
          if (diff < nextWaitMs) {
            nextWaitMs = diff;
          }
        }
      }

      if (candidateIndex === -1) {
        break;
      }

      const [task] = waitingTasks.splice(candidateIndex, 1);
      globalActive++;
      hostActive.add(task.hostname);

      (async () => {
        try {
          const result = await fetchPage(task.url, task.options);
          task.resolve(result);
        } catch (err) {
          task.reject(err);
        } finally {
          const finishTime = clock.now();
          const gap = minGapMs + (jitterMs > 0 ? Math.floor(random() * jitterMs) : 0);
          hostNextAllowedTime.set(task.hostname, finishTime + gap);
          hostActive.delete(task.hostname);
          globalActive--;
          pump();
        }
      })();
    }

    if (waitingTasks.length > 0 && Number.isFinite(nextWaitMs) && nextWaitMs > 0 && nextWaitMs < 60000) {
      const targetTime = now + nextWaitMs;
      if (nextPumpScheduledAt === null || targetTime < nextPumpScheduledAt) {
        nextPumpScheduledAt = targetTime;
        sleep(nextWaitMs).then(() => {
          nextPumpScheduledAt = null;
          pump();
        });
      }
    }
  }

  return (url, options) => {
    const device = options?.device ?? options?.fetch?.device ?? "desktop";
    const cacheKey = `${device}::${url}`;
    if (!cache.has(cacheKey)) {
      const p = new Promise((resolve, reject) => {
        const hostname = getHostname(url);
        waitingTasks.push({ url, options, hostname, resolve, reject });
        pump();
      });
      cache.set(cacheKey, p);
    }
    return cache.get(cacheKey);
  };
}
