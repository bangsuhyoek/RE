/**
 * 확장 인프라 자동 스케줄러 (Crawler Scheduler)
 * 
 * 역할: 매일 자정 또는 지정된 인터벌 주기로 
 * 크롤링 및 검증 파이프라인(runCrawlerPipeline)을 자동 트리거.
 */

import { runCrawlerPipeline } from "./index.js";
import { runPromotionPipeline } from "./runPromotionPipeline.js";
import { runRefundPolicyCheck } from "./refundPolicyCheck.js";

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

    // 프로모션 재확인: 확인된 혜택만 앱 데이터에 남기고 나머지는 삭제한다.
    try {
      const report = await runPromotionPipeline({ apply: true });
      console.log(`[Scheduler Success] Promotions kept ${report.applied.kept}, removed ${report.applied.removed.length}.`);
    } catch (err) {
      console.error(`[Scheduler Error] Promotion check failed:`, err);
    }

    // 환불 정책 출처 확인: 문구가 사라진 정책은 사람이 원문을 다시 확인한다.
    try {
      const results = await runRefundPolicyCheck();
      const needsReview = results.filter((result) => result.status !== "OK");
      if (needsReview.length) {
        console.warn(`[Scheduler Warning] Refund policies to review: ${needsReview.map((r) => r.id + "(" + r.status + ")").join(", ")}`);
      } else {
        console.log(`[Scheduler Success] Refund policy sources unchanged (${results.length}).`);
      }
    } catch (err) {
      console.error(`[Scheduler Error] Refund policy check failed:`, err);
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
