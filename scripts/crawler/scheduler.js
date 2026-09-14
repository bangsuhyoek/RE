/**
 * 확장 인프라 자동 스케줄러 (Crawler Scheduler)
 * 
 * 역할: 매일 자정 또는 지정된 인터벌 주기로 
 * 크롤링 및 검증 파이프라인(runCrawlerPipeline)을 자동 트리거.
 */

import { runCrawlerPipeline } from "./index.js";

export class CrawlerScheduler {
  constructor(cronIntervalMs = 86400000) { // 기본 24시간 (매일)
    this.cronIntervalMs = cronIntervalMs;
    this.timerId = null;
  }

  /**
   * 스케줄러 시작
   */
  start() {
    console.log(`[Scheduler] Starting crawler schedule every ${this.cronIntervalMs / 1000}s (Daily Midnight Task)`);
    
    // 최초 1회 즉시 실행
    this.executeTask();

    // 지정 인터벌 주기 실행
    this.timerId = setInterval(() => {
      this.executeTask();
    }, this.cronIntervalMs);
  }

  /**
   * 태스크 실행
   */
  async executeTask() {
    console.log(`\n[Scheduler Trigger] Running scheduled crawl task at ${new Date().toISOString()}...`);
    try {
      const result = await runCrawlerPipeline();
      console.log(`[Scheduler Success] Updated ${result.syncResult.updatedCount} service catalog items.`);
    } catch (err) {
      console.error(`[Scheduler Error] Task failed:`, err);
    }
  }

  /**
   * 스케줄러 중지
   */
  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      console.log("[Scheduler] Stopped crawler background task.");
    }
  }
}

// 직접 실행 시 스케줄러 가동
if (process.argv[1] && process.argv[1].endsWith("scheduler.js")) {
  const scheduler = new CrawlerScheduler();
  scheduler.start();
}
