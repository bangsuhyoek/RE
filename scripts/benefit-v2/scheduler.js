import { runBenefitPipelineV2 } from "./pipeline.js";

export class BenefitV2Scheduler {
  constructor(intervalMs = Number(process.env.BENEFIT_SCHEDULE_INTERVAL_MS) || 86_400_000) {
    this.intervalMs = Math.max(3_600_000, intervalMs);
    this.timer = null;
  }

  async execute() {
    const report = await runBenefitPipelineV2();
    console.log(
      `[BenefitV2Scheduler] run=${report.runId} status=${report.status} publishable=${report.counts.publishable}`
    );
    return report;
  }

  start() {
    if (this.timer) return;
    this.execute().catch((error) => console.error("[BenefitV2Scheduler] initial:", error));
    this.timer = setInterval(() => {
      this.execute().catch((error) => console.error("[BenefitV2Scheduler] scheduled:", error));
    }, this.intervalMs);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}

if (process.argv[1]?.endsWith("scheduler.js")) {
  new BenefitV2Scheduler().start();
}
