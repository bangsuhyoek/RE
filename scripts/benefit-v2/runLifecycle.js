import { finishRun, startRun } from "./store.js";

// Only exceptions that reach this process can be recorded. A killed process still
// needs an operator to inspect its last persisted stage before changing status.
export async function runTrackedBenefitV2({
  store,
  runId,
  mode,
  startedAt,
  providerStatus = [],
  execute,
}) {
  await startRun(store, { runId, mode, startedAt, providerStatus });
  try {
    return await execute();
  } catch (error) {
    try {
      await finishRun(store, {
        runId,
        status: "FAILED",
        completedAt: new Date().toISOString(),
        providerStatus,
        metrics: {},
        errors: [{ stage: "PIPELINE_FATAL", reason: error?.message || String(error) }],
      });
    } catch (statusError) {
      console.error("[BenefitV2] failed to record fatal run status:", statusError);
    }
    throw error;
  }
}
