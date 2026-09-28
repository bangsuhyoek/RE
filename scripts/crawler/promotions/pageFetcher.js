/**
 * 프로모션 페이지 수집기
 *
 * 대부분의 구독 서비스 페이지는 자바스크립트로 내용을 그리기 때문에 단순 fetch로는
 * 빈 껍데기만 받는다. 설치된 Chrome/Edge를 headless로 띄워 실제로 보이는 텍스트를 읽고,
 * 로그인 벽·봇 차단·404를 구분해 돌려준다. 브라우저가 없으면 fetch로 대체한다.
 */

import * as cheerio from "cheerio";

export const PageState = Object.freeze({
  OK: "OK",
  NOT_FOUND: "NOT_FOUND",
  LOGIN_REQUIRED: "LOGIN_REQUIRED",
  BLOCKED: "BLOCKED",
  EMPTY: "EMPTY",
  ERROR: "ERROR",
});

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const LOGIN_URL_PATTERNS = [
  /\/(?:log-?in|sign-?in|signin|auth|nidlogin|oauth|sso)(?:[/?#.]|$)/i,
  /accounts\.google\.com/i,
  /login\.(?:microsoftonline|live)\.com/i,
  /nid\.naver\.com\/nidlogin/i,
  /appleid\.apple\.com/i,
];
const BLOCK_TEXT_PATTERNS = [
  /just a moment/i,
  /verify (?:you are|that you're) (?:a )?human/i,
  /access denied/i,
  /are you a robot/i,
  /captcha/i,
  /비정상적인 접근/,
  /요청이 차단/,
];
const NOT_FOUND_TEXT_PATTERNS = [/페이지를 찾을 수 없/, /존재하지 않는 페이지/, /page (?:not found|could not be found)/i, /^404\b/m];

function isLoginUrl(url) {
  return LOGIN_URL_PATTERNS.some((re) => re.test(url));
}

/** 수집 결과 상태 판정 (브라우저/fetch 공통) */
export function classifyPage({ requestedUrl, finalUrl, status, text }) {
  const body = String(text ?? "").trim();
  if (status === 404 || status === 410) return PageState.NOT_FOUND;
  if (finalUrl && isLoginUrl(finalUrl) && !isLoginUrl(requestedUrl)) return PageState.LOGIN_REQUIRED;
  if (status === 401) return PageState.LOGIN_REQUIRED;
  if (status === 403 || status === 429 || status === 503) {
    return body.length > 800 && !BLOCK_TEXT_PATTERNS.some((re) => re.test(body.slice(0, 2000))) ? PageState.OK : PageState.BLOCKED;
  }
  if (body.length < 800 && BLOCK_TEXT_PATTERNS.some((re) => re.test(body))) return PageState.BLOCKED;
  if (body.length < 1500 && NOT_FOUND_TEXT_PATTERNS.some((re) => re.test(body))) return PageState.NOT_FOUND;
  if (status >= 400) return PageState.ERROR;
  if (body.length < 80) return PageState.EMPTY;
  return PageState.OK;
}

async function fetchWithoutBrowser(url, { timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8" },
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();
    $("br, p, div, li, h1, h2, h3, h4, section, tr").each((_, el) => {
      $(el).append("\n");
    });
    return { finalUrl: res.url, status: res.status, title: $("title").text().trim(), text: $("body").text() };
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
      const browser = await playwright.chromium.launch({ channel, headless });
      return { browser, channel };
    } catch (error) {
      errors.push(channel + ": " + String(error.message).split("\n")[0]);
    }
  }
  return { browser: null, reason: errors.join(" / ") };
}

export async function createPageFetcher({ headless = true, timeoutMs = 30000, settleMs = 6000, useBrowser = true } = {}) {
  const launched = useBrowser ? await launchBrowser({ headless }) : { browser: null, reason: "브라우저 사용 안 함" };
  const { browser } = launched;
  const context = browser
    ? await browser.newContext({
        locale: "ko-KR",
        timezoneId: "Asia/Seoul",
        userAgent: USER_AGENT,
        viewport: { width: 1366, height: 900 },
      })
    : null;

  async function fetchPage(url) {
    const startedAt = Date.now();
    const base = { requestedUrl: url, method: context ? "browser" : "fetch" };
    try {
      let snapshot;
      if (context) {
        const page = await context.newPage();
        try {
          const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
          await page.waitForLoadState("networkidle", { timeout: settleMs }).catch(() => {});
          // 지연 로딩되는 요금/혜택 영역을 깨우기 위해 한 번 끝까지 스크롤
          await page
            .evaluate(async () => {
              for (let y = 0; y < document.body.scrollHeight && y < 20000; y += 900) {
                window.scrollTo(0, y);
                await new Promise((r) => setTimeout(r, 120));
              }
            })
            .catch(() => {});
          await page.waitForTimeout(800);
          snapshot = {
            finalUrl: page.url(),
            status: response?.status() ?? 0,
            title: await page.title().catch(() => ""),
            text: await page.evaluate(() => document.body?.innerText ?? "").catch(() => ""),
          };
        } finally {
          await page.close().catch(() => {});
        }
      } else {
        snapshot = await fetchWithoutBrowser(url, { timeoutMs });
      }
      const state = classifyPage({ requestedUrl: url, ...snapshot });
      return { ...base, ...snapshot, state, elapsedMs: Date.now() - startedAt };
    } catch (error) {
      return {
        ...base,
        finalUrl: null,
        status: 0,
        title: "",
        text: "",
        state: PageState.ERROR,
        error: String(error?.message ?? error).split("\n")[0],
        elapsedMs: Date.now() - startedAt,
      };
    }
  }

  return {
    mode: context ? "browser:" + launched.channel : "fetch",
    fallbackReason: context ? null : launched.reason,
    fetchPage,
    async close() {
      await context?.close().catch(() => {});
      await browser?.close().catch(() => {});
    },
  };
}

/** 같은 URL은 한 번만 가져오고, 동시에 limit개까지만 연다. */
export function createCachedQueue(fetchPage, { limit = 4 } = {}) {
  const cache = new Map();
  let active = 0;
  const waiting = [];
  const acquire = () =>
    active < limit ? (active++, Promise.resolve()) : new Promise((resolve) => waiting.push(resolve));
  const release = () => {
    const next = waiting.shift();
    if (next) next();
    else active--;
  };
  return (url) => {
    if (!cache.has(url)) {
      cache.set(
        url,
        acquire().then(async () => {
          try {
            return await fetchPage(url);
          } finally {
            release();
          }
        })
      );
    }
    return cache.get(url);
  };
}
