import { pathToFileURL } from "node:url";
import { runBenefitPipelineV2 } from "./pipeline.js";

const RE_PROJECT_HOST = "ssukvsphufvdaanqlmgj.supabase.co";

export function validateREShadowEnvironment(env = process.env) {
  const rawUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  if (!rawUrl || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("RE_SHADOW_REQUIRES_PROJECT_URL_AND_SERVER_SIDE_KEY");
  }
  let parsed;
  try { parsed = new URL(rawUrl); } catch { /* Reject below. */ }
  if (parsed?.protocol !== "https:" || parsed.hostname !== RE_PROJECT_HOST ||
      parsed.username || parsed.password) {
    throw new Error("RE_SHADOW_PROJECT_MISMATCH");
  }
  return { ...env, SUPABASE_URL: parsed.origin, BENEFIT_PIPELINE_MODE: "shadow" };
}

export async function runREShadow(env = process.env, run = runBenefitPipelineV2) {
  return run({ env: validateREShadowEnvironment(env) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--active")) {
    console.error("RE_SHADOW_ONLY");
    process.exitCode = 2;
  } else {
    try {
      const result = await runREShadow();
      console.log(JSON.stringify({
        runId: result.runId,
        mode: result.mode,
        status: result.status,
        counts: result.counts,
        metrics: result.metrics,
        errors: result.errors,
      }, null, 2));
      if (result.status !== "SUCCESS") process.exitCode = 2;
    } catch (error) {
      console.error(`[RE Benefit V2 Shadow] ${error.message}`);
      process.exitCode = 2;
    }
  }
}
