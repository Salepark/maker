import { storage } from "../storage";
import { checkPermission, logPermissionAction } from "../policy/engine";
import { AGENT_HARD_LIMITS, type AutonomyLevel, type PolicyContext } from "../policy/types";
import { getToolDef, TOOL_REGISTRY, type ToolDef } from "./tools";

export interface AgentPlanStep {
  toolKey: string;
  description: string;
  permissionKey: string;
  riskTier: string;
}

export interface AgentPlan {
  planId: string;
  goal: string;
  steps: AgentPlanStep[];
  requiredPermissions: string[];
  riskSummary: { high: number; medium: number; low: number };
  estimatedSteps: number;
}

export interface AgentRunResult {
  runId: number;
  status: "success" | "error" | "timeout" | "blocked" | "denied";
  stepCount: number;
  summary: string;
  steps: Array<{
    stepIndex: number;
    toolKey: string;
    status: string;
    outputSummary: string | null;
    durationMs: number | null;
  }>;
}

function generatePlanId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function getAutonomyLevel(perms: Record<string, any>): AutonomyLevel {
  const autonomyPerm = perms["AUTONOMY_LEVEL"];
  if (autonomyPerm?.resourceScope?.level) {
    return autonomyPerm.resourceScope.level as AutonomyLevel;
  }
  return "L1";
}

export async function generatePlan(
  ctx: PolicyContext,
  botId: number,
  goal: string,
): Promise<AgentPlan> {
  const isDesktop = typeof globalThis !== "undefined" && !!(globalThis as any).electronAPI;
  
  const planSteps: AgentPlanStep[] = [];

  if (goal.includes("수집") || goal.includes("collect") || goal.toLowerCase().includes("rss")) {
    planSteps.push({
      toolKey: "web.rss",
      description: "RSS 피드에서 새 콘텐츠 수집",
      permissionKey: "WEB_RSS",
      riskTier: "LOW",
    });
  }

  if (goal.includes("분석") || goal.includes("analyz") || goal.includes("report")) {
    planSteps.push({
      toolKey: "llm.analyze",
      description: "수집된 콘텐츠를 AI로 분석",
      permissionKey: "LLM_USE",
      riskTier: "MEDIUM",
    });
  }

  if (goal.includes("웹") || goal.includes("fetch") || goal.includes("url")) {
    planSteps.push({
      toolKey: "web.fetch",
      description: "웹 페이지에서 추가 정보 수집",
      permissionKey: "WEB_FETCH",
      riskTier: "MEDIUM",
    });
  }

  if (goal.includes("텔레그램") || goal.includes("telegram") || goal.includes("알림")) {
    planSteps.push({
      toolKey: "telegram.send",
      description: "결과를 텔레그램으로 전송",
      permissionKey: "TELEGRAM_SEND",
      riskTier: "MEDIUM",
    });
  }

  if (planSteps.length === 0) {
    planSteps.push(
      {
        toolKey: "web.rss",
        description: "RSS 피드에서 새 콘텐츠 수집",
        permissionKey: "WEB_RSS",
        riskTier: "LOW",
      },
      {
        toolKey: "llm.analyze",
        description: "수집된 콘텐츠를 AI로 분석",
        permissionKey: "LLM_USE",
        riskTier: "MEDIUM",
      },
    );
  }

  const limitedSteps = planSteps.slice(0, AGENT_HARD_LIMITS.maxSteps);

  const requiredPermissions = [...new Set(limitedSteps.map(s => s.permissionKey))];
  const riskSummary = {
    high: limitedSteps.filter(s => s.riskTier === "HIGH" || s.riskTier === "CRITICAL").length,
    medium: limitedSteps.filter(s => s.riskTier === "MEDIUM").length,
    low: limitedSteps.filter(s => s.riskTier === "LOW").length,
  };

  return {
    planId: generatePlanId(),
    goal,
    steps: limitedSteps,
    requiredPermissions,
    riskSummary,
    estimatedSteps: limitedSteps.length,
  };
}

export async function executeAgentRun(
  ctx: PolicyContext,
  botId: number,
  goal: string,
  plan?: AgentPlan,
): Promise<AgentRunResult> {
  const permCheck = await checkPermission(ctx, "AGENT_RUN");
  if (!permCheck.allowed && !permCheck.requiresApproval) {
    return {
      runId: 0,
      status: "denied",
      stepCount: 0,
      summary: "에이전트 실행이 정책에 의해 차단되었습니다.",
      steps: [],
    };
  }

  const agentRun = await storage.createAgentRun({
    userId: ctx.userId,
    botId,
    trigger: "manual",
    autonomyLevel: "L1",
    goal,
    status: "running",
    planJson: plan ?? null,
    startedAt: new Date(),
  });

  await logPermissionAction(ctx, "agent_run_start", "AGENT_RUN", {
    runId: agentRun.id,
    goal,
    planSteps: plan?.steps?.length ?? 0,
  });

  const startTime = Date.now();
  const executedSteps: AgentRunResult["steps"] = [];
  let stepIndex = 0;
  let llmCalls = 0;
  let toolCalls = 0;
  let finalStatus: AgentRunResult["status"] = "success";
  let summary = "";

  const stepsToExecute = plan?.steps ?? [
    { toolKey: "web.rss", description: "기본 수집", permissionKey: "WEB_RSS", riskTier: "LOW" },
  ];

  for (const planStep of stepsToExecute) {
    if (Date.now() - startTime > AGENT_HARD_LIMITS.maxRuntimeMs) {
      finalStatus = "timeout";
      summary = `시간 제한 초과 (${AGENT_HARD_LIMITS.maxRuntimeMs / 1000}초)`;
      break;
    }

    if (stepIndex >= AGENT_HARD_LIMITS.maxSteps) {
      summary = `단계 제한 도달 (최대 ${AGENT_HARD_LIMITS.maxSteps}단계)`;
      break;
    }

    if (toolCalls >= AGENT_HARD_LIMITS.maxToolCalls) {
      summary = `도구 호출 제한 도달 (최대 ${AGENT_HARD_LIMITS.maxToolCalls}회)`;
      break;
    }

    const stepStartTime = Date.now();
    let stepStatus = "success";
    let outputSummary = "";

    const toolPermCheck = await checkPermission(ctx, planStep.permissionKey as any);
    if (!toolPermCheck.allowed) {
      if (toolPermCheck.requiresApproval) {
        stepStatus = "blocked";
        outputSummary = `승인 필요: ${planStep.permissionKey}`;
        finalStatus = "blocked";
      } else {
        stepStatus = "denied";
        outputSummary = `정책 차단: ${planStep.permissionKey}`;
      }
    } else {
      toolCalls++;
      if (planStep.toolKey === "llm.analyze") {
        llmCalls++;
      }
      outputSummary = `${planStep.description} - 완료`;
      stepStatus = "success";
    }

    const stepDuration = Date.now() - stepStartTime;

    await storage.createAgentStep({
      agentRunId: agentRun.id,
      stepIndex,
      toolKey: planStep.toolKey,
      permissionKey: planStep.permissionKey,
      status: stepStatus,
      inputSummary: planStep.description,
      outputSummary,
      rationale: `자동 실행: ${planStep.toolKey}`,
      durationMs: stepDuration,
    });

    executedSteps.push({
      stepIndex,
      toolKey: planStep.toolKey,
      status: stepStatus,
      outputSummary,
      durationMs: stepDuration,
    });

    stepIndex++;

    if (stepStatus === "blocked" || stepStatus === "denied") {
      if (finalStatus !== "blocked") finalStatus = "error";
      break;
    }
  }

  const totalDuration = Date.now() - startTime;
  if (!summary) {
    summary = finalStatus === "success"
      ? `${stepIndex}단계 완료 (${totalDuration}ms)`
      : `${stepIndex}단계 실행 중 ${finalStatus}`;
  }

  await storage.updateAgentRun(agentRun.id, {
    status: finalStatus,
    stepCount: stepIndex,
    llmCallCount: llmCalls,
    toolCallCount: toolCalls,
    summary,
    finishedAt: new Date(),
    durationMs: totalDuration,
  });

  await logPermissionAction(ctx, "agent_run_complete", "AGENT_RUN", {
    runId: agentRun.id,
    status: finalStatus,
    steps: stepIndex,
    duration: totalDuration,
  });

  return {
    runId: agentRun.id,
    status: finalStatus,
    stepCount: stepIndex,
    summary,
    steps: executedSteps,
  };
}
