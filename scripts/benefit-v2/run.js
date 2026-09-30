import { runBenefitPipelineV2 } from "./pipeline.js";

const modeArg = process.argv.find((arg) => arg === "--active" || arg === "--shadow");
if (modeArg === "--active") process.env.BENEFIT_PIPELINE_MODE = "active";
if (modeArg === "--shadow") process.env.BENEFIT_PIPELINE_MODE = "shadow";

try {
  const report = await runBenefitPipelineV2();
  console.log(JSON.stringify({
    runId: report.runId,
    mode: report.mode,
    status: report.status,
    providers: report.providers,
    renderer: report.renderer,
    llm: report.llm,
    counts: report.counts,
    metrics: report.metrics,
    errors: report.errors,
  }, null, 2));
  if (report.status === "FAILED") process.exitCode = 1;
} catch (error) {
  console.error("[BenefitV2] fatal:", error);
  process.exitCode = 1;
}
