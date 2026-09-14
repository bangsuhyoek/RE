/**
 * 탐색 에이전트 (Crawler Agent)
 * 
 * 역할: 대상 구독 서비스 사이트에 접속하여 동적 페이지 콘텐츠/DOM/API 데이터 수집.
 * 자격 증명/헤더 세션 관리 및 네트워크 예외 처리 담당.
 */

export class CrawlerAgent {
  constructor(config = {}) {
    this.timeoutMs = config.timeoutMs || 10000;
    this.userAgent =
      config.userAgent ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  }

  /**
   * 타겟 구독 서비스의 URL 및 DOM 정보를 탐색하여 원시 HTML/payload 수집
   * @param {Object} target 
   * @returns {Promise<Object>}
   */
  async crawl(target) {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(target.url, {
        method: "GET",
        headers: {
          "User-Agent": this.userAgent,
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();

      return {
        targetId: target.id,
        url: target.url,
        status: "SUCCESS",
        statusCode: response.status,
        rawContent: html,
        crawledAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        targetId: target.id,
        url: target.url,
        status: "FAILED",
        error: error.message || "Unknown crawling error",
        rawContent: null,
        crawledAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    }
  }
}
