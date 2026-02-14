import { storage } from "../storage";

interface StartRunParams {
  userId: string;
  botId: number | null;
  botKey: string;
  jobType: string;
  trigger: string;
  meta?: Record<string, any>;
}

interface EndRunOkParams {
  itemsCollected?: number;
  itemsAnalyzed?: number;
  outputId?: number;
  reportStage?: string;
  meta?: Record<string, any>;
}

interface EndRunErrorParams {
  errorCode: string;
  errorMessage: string;
  errorDetailJson?: Record<string, any>;
  reportStage?: string;
}

const runStartTimes = new Map<number, number>();

export async function startRun(params: StartRunParams): Promise<number> {
  try {
    const t = Date.now();
    const run = await storage.createJobRun({
      userId: params.userId,
      botId: params.botId,
      botKey: params.botKey,
      jobType: params.jobType,
      trigger: params.trigger,
      status: "started",
      startedAt: new Date(),
      metaJson: params.meta || null,
    });
    runStartTimes.set(run.id, t);
    return run.id;
  } catch (e) {
    console.error("[runLogger] Failed to start run:", e);
    return -1;
  }
}

function popStartTime(runId: number): number {
  const t = runStartTimes.get(runId);
  runStartTimes.delete(runId);
  return t ?? Date.now();
}

export async function endRunOk(runId: number, params: EndRunOkParams): Promise<void> {
  if (runId < 0) return;
  try {
    await storage.finishJobRun(runId, {
      status: "ok",
      finishedAt: new Date(),
      durationMs: Date.now() - popStartTime(runId),
      itemsCollected: params.itemsCollected ?? null,
      itemsAnalyzed: params.itemsAnalyzed ?? null,
      outputId: params.outputId ?? null,
      reportStage: params.reportStage ?? null,
      metaJson: params.meta ?? undefined,
    });
  } catch (e) {
    console.error("[runLogger] Failed to end run ok:", e);
  }
}

export async function endRunError(runId: number, params: EndRunErrorParams): Promise<void> {
  if (runId < 0) return;
  try {
    await storage.finishJobRun(runId, {
      status: "error",
      finishedAt: new Date(),
      durationMs: Date.now() - popStartTime(runId),
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      errorDetailJson: params.errorDetailJson ?? null,
      reportStage: params.reportStage ?? null,
    });
  } catch (e) {
    console.error("[runLogger] Failed to end run error:", e);
  }
}

export async function endRunTimeout(runId: number, message?: string): Promise<void> {
  if (runId < 0) return;
  try {
    await storage.finishJobRun(runId, {
      status: "timeout",
      finishedAt: new Date(),
      durationMs: Date.now() - popStartTime(runId),
      errorCode: "TIMEOUT",
      errorMessage: message || "Operation timed out",
    });
  } catch (e) {
    console.error("[runLogger] Failed to end run timeout:", e);
  }
}

export async function endRunSkipped(runId: number, reason: string): Promise<void> {
  if (runId < 0) return;
  try {
    await storage.finishJobRun(runId, {
      status: "skipped",
      finishedAt: new Date(),
      durationMs: 0,
      errorCode: reason,
      errorMessage: reason,
    });
  } catch (e) {
    console.error("[runLogger] Failed to end run skipped:", e);
  }
}
