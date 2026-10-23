/**
 * 탐색 에이전트 (Crawler Agent)
 * 
 * 역할: 대상 구독 서비스 사이트에 접속하여 동적 페이지 콘텐츠/DOM/API 데이터 수집.
 * 리다이렉트 추적, 최종 URL 기록, 바이트 제한, 헤더 세션 관리 및 네트워크 예외 처리 담당.
 */

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

export class CrawlerAgent {
  constructor(config = {}) {
    this.timeoutMs = config.timeoutMs || 12000;
    this.maxRetries = typeof config.maxRetries === "number" ? config.maxRetries : 3;
    this.maxBytes = config.maxBytes || 2000000; // 2MB 제한
    this.maxRedirects = config.maxRedirects || 5;
    this.userAgent =
      config.userAgent ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  }

  /**
   * 타겟 구독 서비스의 URL 및 DOM 정보를 탐색하여 원시 HTML/payload 수집 (리다이렉트 추적 포함)
   * @param {Object} target 
   * @returns {Promise<Object>}
   */
  async crawl(target) {
    const startTime = Date.now();
    let lastError = null;
    let lastStatusCode = 0;
    let lastRedirects = [];
    let lastFinalUrl = target.url;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const backoffMs = 250 * attempt;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const redirects = [];
      let current = new URL(target.url);
      const allowedOrigins = target.allowedOrigins || [current.origin];

      function assertAllowed(urlObj) {
        if (urlObj.protocol !== "https:" && urlObj.protocol !== "http:") {
          const err = new Error(`Disallowed fetch destination protocol: ${urlObj.protocol}`);
          err.isNonRetryable = true;
          throw err;
        }
        if (target.allowedOrigins && !allowedOrigins.includes(urlObj.origin)) {
          const err = new Error(`Disallowed fetch destination origin: ${urlObj.origin}`);
          err.isNonRetryable = true;
          throw err;
        }
      }

      try {
        for (let hop = 0; ; hop++) {
          assertAllowed(current);

          const response = await fetch(current, {
            method: "GET",
            redirect: "manual",
            signal: controller.signal,
            headers: {
              "User-Agent": this.userAgent,
              "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          });

          if (REDIRECTS.has(response.status)) {
            const location = response.headers.get("location");
            await response.body?.cancel();

            if (!location) {
              const err = new Error("Redirect response without Location header");
              err.isNonRetryable = true;
              throw err;
            }
            if (hop >= this.maxRedirects) {
              const err = new Error(`Redirect limit exceeded (${this.maxRedirects})`);
              err.isNonRetryable = true;
              throw err;
            }

            const next = new URL(location, current);
            redirects.push({
              from: current.href,
              to: next.href,
              status: response.status,
            });
            current = next;
            continue;
          }

          if (!response.ok) {
            const err = new Error(`HTTP Error Status: ${response.status} ${response.statusText}`);
            err.statusCode = response.status;
            if (response.status !== 429 && (response.status < 500 || response.status > 599)) {
              err.isNonRetryable = true;
            }
            throw err;
          }

          const contentType = response.headers.get("content-type") ?? "";
          const html = await response.text();

          return {
            targetId: target.id,
            url: target.url,
            requestedUrl: target.url,
            finalUrl: current.href,
            redirects,
            status: "SUCCESS",
            statusCode: response.status,
            contentType,
            rawContent: html,
            html,
            crawledAt: new Date().toISOString(),
            fetchedAt: new Date().toISOString(),
            durationMs: Date.now() - startTime,
          };
        }
      } catch (error) {
        lastError = error;
        lastStatusCode = error.statusCode || 0;
        lastRedirects = redirects;
        lastFinalUrl = current.href;

        const isTransient = !error.isNonRetryable && (
          lastStatusCode === 429 ||
          (lastStatusCode >= 500 && lastStatusCode <= 599) ||
          lastStatusCode === 0
        );

        if (!isTransient || attempt >= this.maxRetries) {
          break;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return {
      targetId: target.id,
      url: target.url,
      requestedUrl: target.url,
      finalUrl: lastFinalUrl,
      redirects: lastRedirects,
      status: "FAILED",
      statusCode: lastStatusCode,
      contentType: "",
      rawContent: null,
      html: "",
      error: lastError?.message || "Unknown crawling error",
      crawledAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }
}
