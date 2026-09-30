import { pathToFileURL } from "node:url";
import { runBenefitPipelineV2 } from "./pipeline.js";
import { validateREShadowEnvironment } from "./reShadow.js";

export function validateREProductEnvironment(env = process.env) {
  const validated = validateREShadowEnvironment(env);
  const mode = env.BENEFIT_PIPELINE_MODE === "shadow" ? "shadow" : "active";
  if (mode === "active" && !env.BENEFIT_GOLD_SET_PATH) throw new Error("RE_ACTIVE_REQUIRES_CURRENT_INDEPENDENT_GOLD_SET");
  return { ...validated, BENEFIT_PIPELINE_MODE: mode, RE_BENEFIT_V2_ALLOW_ACTIVE: "true" };
}

export async function runREProduct(env = process.env, run = runBenefitPipelineV2) {
  const report = await run({ env: validateREProductEnvironment(env) });
  if (report.status !== "SUCCESS" || (report.mode === "active" && report.activePublication?.persistedAs !== "active")) {
    throw new Error(`RE_V2_RUN_INCOMPLETE:${report.runId || "unknown"}:${report.status}`);
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const env = { ...process.env, BENEFIT_PIPELINE_MODE: process.argv.includes("--shadow") ? "shadow" : "active" };
    const report = await runREProduct(env);
    console.log(JSON.stringify({ runId: report.runId, status: report.status, mode: report.mode, counts: report.counts }));
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
