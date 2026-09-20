import { runBenefitPromotionPipeline } from "./runPromotionPipeline.js";

export class BenefitCrawlerScheduler {
  constructor(intervalMs = 86400000) {
    this.intervalMs = intervalMs;
    this.timerId = null;
  }

  async executeTask() {
    console.log(
      `[BenefitScheduler] Running at ${new Date().toISOString()}`
    );
    const report = await runBenefitPromotionPipeline();
    console.log(
      `[BenefitScheduler] active=${report.counts.ACTIVE}, expired=${report.counts.EXPIRED}, suspicious=${report.counts.SUSPICIOUS}`
    );
    return report;
  }

  start() {
    if (this.timerId) return;
    this.executeTask().catch((error) => {
      console.error("[BenefitScheduler] Initial run failed:", error);
    });
    this.timerId = setInterval(() => {
      this.executeTask().catch((error) => {
        console.error("[BenefitScheduler] Scheduled run failed:", error);
      });
    }, this.intervalMs);
  }
  stop() {
    if (!this.timerId) return;
    clearInterval(this.timerId);
    this.timerId = null;
  }
}

if (
  process.argv[1] &&
  process.argv[1].endsWith("benefitScheduler.js")
) {
  const scheduler = new BenefitCrawlerScheduler();
  scheduler.start();
}
