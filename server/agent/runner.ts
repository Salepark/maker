import { createHash } from "crypto";
import { storage } from "../storage";
import { checkPermission, getEffectivePermissions, logPermissionAction } from "../policy/engine";
import {
  AGENT_HARD_LIMITS,
  RISK_SCORE_MAP,
  RISK_BUDGET_BY_AUTONOMY,
  RISK_BUDGET_WEB_MAX,
  type AutonomyLevel,
  type PolicyContext,
  type RiskTier,
  type TerminationReason,
} from "../policy/types";
import { getToolDef, TOOL_REGISTRY, type ToolDef } from "./tools";

export interface AgentPlanStep {
  toolKey: string;
  description: string;
  permissionKey: string;
  riskTier: string;
  riskScore: number;
}

export interface AgentPlan {
  planId: string;
  planHash: string;
  goal: string;
  steps: AgentPlanStep[];
  requiredPermissions: string[];
  riskSummary: { high: number; medium: number; low: number; critical: number; totalRisk: number };
  estimatedSteps: number;
  riskBudget: number;
}

export interface AgentRunResult {
  runId: number;
  status: string;
  terminationReason: TerminationReason;
  stepCount: number;
  summary: string;
  riskScoreTotal: number;
  riskBudgetLimit: number;
  explainSummary: string;
  explainPolicy: string;
  explainRisk: string;
  steps: Array<{
    stepIndex: number;
    toolKey: string;
    status: string;
    riskScore: number;
    decisionReason: string;
    outputSummary: string | null;
    durationMs: number | null;
    blockedByPolicy: boolean;
    egressUsed: boolean;
  }>;
}

function generatePlanId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function computePlanHash(steps: AgentPlanStep[], requiredPermissions: string[]): string {
  const payload = JSON.stringify({
    steps: steps.map(s => ({ toolKey: s.toolKey, permissionKey: s.permissionKey, riskTier: s.riskTier })),
    permissions: [...requiredPermissions].sort(),
  });
  return createHash("sha256").update(payload).digest("hex");
}

function getRiskScore(riskTier: string): number {
  return RISK_SCORE_MAP[riskTier as RiskTier] ?? 1;
}

function getAutonomyLevel(perms: Record<string, any>): AutonomyLevel {
  const autonomyPerm = perms["AUTONOMY_LEVEL"];
  if (autonomyPerm?.resourceScope?.level) {
    return autonomyPerm.resourceScope.level as AutonomyLevel;
  }
  return "L1";
}

function getRiskBudget(perms: Record<string, any>, autonomyLevel: AutonomyLevel, isDesktop: boolean): number {
  const budgetPerm = perms["RISK_BUDGET_LIMIT"];
  if (budgetPerm?.resourceScope?.limit && typeof budgetPerm.resourceScope.limit === "number") {
    const customLimit = budgetPerm.resourceScope.limit;
    if (!isDesktop && customLimit > RISK_BUDGET_WEB_MAX) {
      return RISK_BUDGET_WEB_MAX;
    }
    return customLimit;
  }
  const defaultBudget = RISK_BUDGET_BY_AUTONOMY[autonomyLevel];
  if (!isDesktop && defaultBudget > RISK_BUDGET_WEB_MAX) {
    return RISK_BUDGET_WEB_MAX;
  }
  return defaultBudget;
}

function isCriticalAutoAllowed(perms: Record<string, any>, isDesktop: boolean): boolean {
  if (!isDesktop) return false;
  const perm = perms["CRITICAL_AUTO_ALLOW"];
  return perm?.enabled === true && perm?.approvalMode === "AUTO_ALLOWED";
}

function isExplainabilityRequired(perms: Record<string, any>): boolean {
  const perm = perms["EXPLAINABILITY_REQUIRED"];
  return perm?.enabled !== false;
}

function detectIsDesktop(): boolean {
  return process.env.MAKER_DB === "sqlite" || process.env.MAKER_DESKTOP === "true";
}

export async function generatePlan(
  ctx: PolicyContext,
  botId: number,
  goal: string,
): Promise<AgentPlan> {
  const isDesktop = detectIsDesktop();
  const effective = await getEffectivePermissions(ctx);
  const autonomyLevel = getAutonomyLevel(effective);
  const riskBudget = getRiskBudget(effective, autonomyLevel, isDesktop);

  const planSteps: AgentPlanStep[] = [];

  if (goal.includes("수집") || goal.includes("collect") || goal.toLowerCase().includes("rss")) {
    planSteps.push({
      toolKey: "web.rss",
      description: "RSS 피드에서 새 콘텐츠 수집",
      permissionKey: "WEB_RSS",
      riskTier: "LOW",
      riskScore: RISK_SCORE_MAP.LOW,
    });
  }

  if (goal.includes("분석") || goal.includes("analyz") || goal.includes("report")) {
    planSteps.push({
      toolKey: "llm.analyze",
      description: "수집된 콘텐츠를 AI로 분석",
      permissionKey: "LLM_USE",
      riskTier: "MEDIUM",
      riskScore: RISK_SCORE_MAP.MEDIUM,
    });
  }

  if (goal.includes("웹") || goal.includes("fetch") || goal.includes("url")) {
    planSteps.push({
      toolKey: "web.fetch",
      description: "웹 페이지에서 추가 정보 수집",
      permissionKey: "WEB_FETCH",
      riskTier: "MEDIUM",
      riskScore: RISK_SCORE_MAP.MEDIUM,
    });
  }

  if (goal.includes("텔레그램") || goal.includes("telegram") || goal.includes("알림")) {
    planSteps.push({
      toolKey: "telegram.send",
      description: "결과를 텔레그램으로 전송",
      permissionKey: "TELEGRAM_SEND",
      riskTier: "MEDIUM",
      riskScore: RISK_SCORE_MAP.MEDIUM,
    });
  }

  if (goal.includes("파일") || goal.includes("file") || goal.includes("write")) {
    planSteps.push({
      toolKey: "files.write",
      description: "결과를 파일로 저장",
      permissionKey: "FS_WRITE",
      riskTier: "CRITICAL",
      riskScore: RISK_SCORE_MAP.CRITICAL,
    });
  }

  if (planSteps.length === 0) {
    planSteps.push(
      {
        toolKey: "web.rss",
        description: "RSS 피드에서 새 콘텐츠 수집",
        permissionKey: "WEB_RSS",
        riskTier: "LOW",
        riskScore: RISK_SCORE_MAP.LOW,
      },
      {
        toolKey: "llm.analyze",
        description: "수집된 콘텐츠를 AI로 분석",
        permissionKey: "LLM_USE",
        riskTier: "MEDIUM",
        riskScore: RISK_SCORE_MAP.MEDIUM,
      },
    );
  }

  const limitedSteps = planSteps.slice(0, AGENT_HARD_LIMITS.maxSteps);
  const requiredPermissions = [...new Set(limitedSteps.map(s => s.permissionKey))];
  const planHash = computePlanHash(limitedSteps, requiredPermissions);
  const totalRisk = limitedSteps.reduce((sum, s) => sum + s.riskScore, 0);

  const riskSummary = {
    critical: limitedSteps.filter(s => s.riskTier === "CRITICAL").length,
    high: limitedSteps.filter(s => s.riskTier === "HIGH").length,
    medium: limitedSteps.filter(s => s.riskTier === "MEDIUM").length,
    low: limitedSteps.filter(s => s.riskTier === "LOW").length,
    totalRisk,
  };

  return {
    planId: generatePlanId(),
    planHash,
    goal,
    steps: limitedSteps,
    requiredPermissions,
    riskSummary,
    estimatedSteps: limitedSteps.length,
    riskBudget,
  };
}

export async function executeAgentRun(
  ctx: PolicyContext,
  botId: number,
  goal: string,
  plan?: AgentPlan,
  submittedPlanHash?: string,
): Promise<AgentRunResult> {
  const isDesktop = detectIsDesktop();
  const effective = await getEffectivePermissions(ctx);
  const autonomyLevel = getAutonomyLevel(effective);
  const riskBudget = getRiskBudget(effective, autonomyLevel, isDesktop);
  const criticalAutoOk = isCriticalAutoAllowed(effective, isDesktop);
  const explainRequired = isExplainabilityRequired(effective);

  const permCheck = await checkPermission(ctx, "AGENT_RUN");
  if (!permCheck.allowed && !permCheck.requiresApproval) {
    return makeTerminatedResult("policy_denied", "에이전트 실행이 정책에 의해 차단되었습니다.", riskBudget, effective);
  }

  if (plan && submittedPlanHash) {
    const verifyHash = computePlanHash(plan.steps, plan.requiredPermissions);
    if (verifyHash !== submittedPlanHash) {
      return makeTerminatedResult("plan_mismatch", "계획 해시가 일치하지 않습니다. 계획이 변조되었을 수 있습니다.", riskBudget, effective);
    }
  }

  const policySnapshot = buildPolicySnapshot(effective, autonomyLevel, riskBudget, isDesktop);
  const planHash = plan ? computePlanHash(plan.steps, plan.requiredPermissions) : null;

  const agentRun = await storage.createAgentRun({
    userId: ctx.userId,
    botId,
    trigger: "manual",
    autonomyLevel,
    goal,
    status: "running",
    planJson: plan ?? null,
    planHash,
    policySnapshot,
    riskScoreTotal: 0,
    riskBudgetLimit: riskBudget,
    startedAt: new Date(),
  });

  await logPermissionAction(ctx, "agent_run_start", "AGENT_RUN", {
    runId: agentRun.id,
    goal,
    planSteps: plan?.steps?.length ?? 0,
    riskBudget,
    autonomyLevel,
  });

  const startTime = Date.now();
  const executedSteps: AgentRunResult["steps"] = [];
  let stepIndex = 0;
  let llmCalls = 0;
  let toolCalls = 0;
  let riskAccumulated = 0;
  let terminationReason: TerminationReason = "completed";
  let summary = "";

  const stepsToExecute = plan?.steps ?? [
    { toolKey: "web.rss", description: "기본 수집", permissionKey: "WEB_RSS", riskTier: "LOW", riskScore: RISK_SCORE_MAP.LOW },
  ];

  for (const planStep of stepsToExecute) {
    if (Date.now() - startTime > AGENT_HARD_LIMITS.maxRuntimeMs) {
      terminationReason = "timeout";
      summary = `시간 제한 초과 (${AGENT_HARD_LIMITS.maxRuntimeMs / 1000}초)`;
      break;
    }

    if (stepIndex >= AGENT_HARD_LIMITS.maxSteps) {
      terminationReason = "step_limit";
      summary = `단계 제한 도달 (최대 ${AGENT_HARD_LIMITS.maxSteps}단계)`;
      break;
    }

    if (toolCalls >= AGENT_HARD_LIMITS.maxToolCalls) {
      terminationReason = "tool_limit";
      summary = `도구 호출 제한 도달 (최대 ${AGENT_HARD_LIMITS.maxToolCalls}회)`;
      break;
    }

    const stepRiskScore = getRiskScore(planStep.riskTier);
    if (riskAccumulated + stepRiskScore > riskBudget) {
      terminationReason = "risk_limit_reached";
      summary = `위험 예산 초과 (${riskAccumulated}+${stepRiskScore} > ${riskBudget})`;
      break;
    }

    if (planStep.riskTier === "CRITICAL" && !criticalAutoOk) {
      const stepStartTime = Date.now();
      await storage.createAgentStep({
        agentRunId: agentRun.id,
        stepIndex,
        toolKey: planStep.toolKey,
        permissionKey: planStep.permissionKey,
        status: "blocked",
        inputSummary: planStep.description,
        outputSummary: "CRITICAL 단계 — 수동 승인 필요",
        rationale: "CRITICAL 위험 등급은 자동 실행이 차단됩니다",
        riskScore: stepRiskScore,
        decisionReason: "CRITICAL 위험 단계는 CRITICAL_AUTO_ALLOW가 활성화되지 않은 경우 승인이 필요합니다",
        blockedByPolicy: true,
        policyRuleTriggered: "CRITICAL_AUTO_ALLOW",
        egressUsed: false,
        durationMs: Date.now() - stepStartTime,
      });

      executedSteps.push({
        stepIndex,
        toolKey: planStep.toolKey,
        status: "blocked",
        riskScore: stepRiskScore,
        decisionReason: "CRITICAL 단계 수동 승인 필요",
        outputSummary: "CRITICAL 단계 — 수동 승인 필요",
        durationMs: Date.now() - stepStartTime,
        blockedByPolicy: true,
        egressUsed: false,
      });

      terminationReason = "policy_denied";
      summary = `CRITICAL 위험 단계가 정책에 의해 차단됨: ${planStep.toolKey}`;
      stepIndex++;
      break;
    }

    const stepStartTime = Date.now();
    let stepStatus = "success";
    let outputSummary = "";
    let decisionReason = "";
    let blockedByPolicy = false;
    let policyRuleTriggered: string | null = null;
    let egressUsed = false;

    const toolPermCheck = await checkPermission(ctx, planStep.permissionKey as any);
    if (!toolPermCheck.allowed) {
      if (toolPermCheck.requiresApproval) {
        stepStatus = "blocked";
        outputSummary = `승인 필요: ${planStep.permissionKey}`;
        decisionReason = `권한 ${planStep.permissionKey}이(가) 승인 대기 상태입니다`;
        blockedByPolicy = true;
        policyRuleTriggered = planStep.permissionKey;
        terminationReason = "policy_denied";
      } else {
        stepStatus = "denied";
        outputSummary = `정책 차단: ${planStep.permissionKey}`;
        decisionReason = `권한 ${planStep.permissionKey}이(가) 정책에 의해 거부되었습니다`;
        blockedByPolicy = true;
        policyRuleTriggered = planStep.permissionKey;
        terminationReason = "policy_denied";
      }
    } else {
      toolCalls++;
      riskAccumulated += stepRiskScore;

      if (planStep.toolKey === "llm.analyze") {
        llmCalls++;
        egressUsed = true;
        if (llmCalls > AGENT_HARD_LIMITS.maxLLMCalls) {
          terminationReason = "llm_limit";
          summary = `LLM 호출 제한 도달 (최대 ${AGENT_HARD_LIMITS.maxLLMCalls}회)`;
          stepStatus = "error";
          outputSummary = "LLM 호출 한도 초과";
          decisionReason = "LLM 호출 횟수가 하드 리밋을 초과했습니다";
        } else {
          outputSummary = `${planStep.description} - 완료`;
          decisionReason = `권한 허용됨, 위험 점수 ${stepRiskScore} 누적 (총 ${riskAccumulated}/${riskBudget})`;
        }
      } else {
        outputSummary = `${planStep.description} - 완료`;
        decisionReason = `권한 허용됨, 위험 점수 ${stepRiskScore} 누적 (총 ${riskAccumulated}/${riskBudget})`;
      }
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
      riskScore: stepRiskScore,
      decisionReason,
      blockedByPolicy,
      policyRuleTriggered,
      egressUsed,
      durationMs: stepDuration,
    });

    executedSteps.push({
      stepIndex,
      toolKey: planStep.toolKey,
      status: stepStatus,
      riskScore: stepRiskScore,
      decisionReason,
      outputSummary,
      durationMs: stepDuration,
      blockedByPolicy,
      egressUsed,
    });

    stepIndex++;

    if (stepStatus === "blocked" || stepStatus === "denied") {
      break;
    }

    if (terminationReason !== "completed") break;
  }

  const totalDuration = Date.now() - startTime;
  if (!summary) {
    summary = terminationReason === "completed"
      ? `${stepIndex}단계 완료 (${totalDuration}ms, 위험 ${riskAccumulated}/${riskBudget})`
      : `${stepIndex}단계 실행 중 ${terminationReason}`;
  }

  const explainSummary = buildExplainSummary(goal, executedSteps, terminationReason, autonomyLevel);
  const explainPolicy = buildExplainPolicy(policySnapshot, executedSteps);
  const explainRisk = buildExplainRisk(riskAccumulated, riskBudget, executedSteps, terminationReason);

  const finalStatus = terminationReason === "completed" ? "success"
    : terminationReason === "policy_denied" || terminationReason === "user_denied" ? "blocked"
    : terminationReason === "timeout" ? "timeout"
    : "error";

  await storage.updateAgentRun(agentRun.id, {
    status: finalStatus,
    stepCount: stepIndex,
    llmCallCount: llmCalls,
    toolCallCount: toolCalls,
    riskScoreTotal: riskAccumulated,
    terminationReason,
    explainSummary,
    explainPolicy,
    explainRisk,
    summary,
    finishedAt: new Date(),
    durationMs: totalDuration,
  });

  await logPermissionAction(ctx, "agent_run_complete", "AGENT_RUN", {
    runId: agentRun.id,
    status: finalStatus,
    terminationReason,
    steps: stepIndex,
    riskTotal: riskAccumulated,
    riskBudget,
    duration: totalDuration,
  });

  return {
    runId: agentRun.id,
    status: finalStatus,
    terminationReason,
    stepCount: stepIndex,
    summary,
    riskScoreTotal: riskAccumulated,
    riskBudgetLimit: riskBudget,
    explainSummary,
    explainPolicy,
    explainRisk,
    steps: executedSteps,
  };
}

function makeTerminatedResult(
  reason: TerminationReason,
  summary: string,
  riskBudget: number,
  effective: Record<string, any>,
): AgentRunResult {
  return {
    runId: 0,
    status: reason === "policy_denied" ? "blocked" : "error",
    terminationReason: reason,
    stepCount: 0,
    summary,
    riskScoreTotal: 0,
    riskBudgetLimit: riskBudget,
    explainSummary: summary,
    explainPolicy: `종료 사유: ${reason}`,
    explainRisk: "실행 전 종료 — 위험 누적 없음",
    steps: [],
  };
}

function buildPolicySnapshot(
  effective: Record<string, any>,
  autonomyLevel: AutonomyLevel,
  riskBudget: number,
  isDesktop: boolean,
): Record<string, any> {
  return {
    autonomyLevel,
    riskBudget,
    platform: isDesktop ? "desktop" : "web",
    egressLevel: effective["LLM_EGRESS_LEVEL"]?.egressLevel ?? "NO_EGRESS",
    agentRunAllowed: effective["AGENT_RUN"]?.enabled ?? false,
    toolUseAllowed: effective["TOOL_USE"]?.enabled ?? false,
    criticalAutoAllow: effective["CRITICAL_AUTO_ALLOW"]?.enabled ?? false,
    deniedPermissions: Object.entries(effective)
      .filter(([_, v]) => v?.approvalMode === "AUTO_DENIED")
      .map(([k]) => k),
  };
}

function buildExplainSummary(
  goal: string,
  steps: AgentRunResult["steps"],
  terminationReason: TerminationReason,
  autonomyLevel: AutonomyLevel,
): string {
  const successCount = steps.filter(s => s.status === "success").length;
  const blockedCount = steps.filter(s => s.blockedByPolicy).length;
  const totalRisk = steps.reduce((sum, s) => sum + (s.status === "success" ? s.riskScore : 0), 0);

  let text = `목표: "${goal}"\n`;
  text += `자율성 레벨: ${autonomyLevel}\n`;
  text += `실행된 단계: ${successCount}/${steps.length}`;
  if (blockedCount > 0) text += ` (${blockedCount}개 차단됨)`;
  text += `\n위험 점수: ${totalRisk}\n`;
  text += `종료 사유: ${terminationReason}`;
  return text;
}

function buildExplainPolicy(
  snapshot: Record<string, any>,
  steps: AgentRunResult["steps"],
): string {
  const denied = snapshot.deniedPermissions ?? [];
  const blocked = steps.filter(s => s.blockedByPolicy).map(s => s.toolKey);
  let text = `플랫폼: ${snapshot.platform}\n`;
  text += `자율성 레벨: ${snapshot.autonomyLevel}\n`;
  text += `위험 예산: ${snapshot.riskBudget}\n`;
  text += `Egress 레벨: ${snapshot.egressLevel}\n`;
  if (denied.length > 0) text += `거부된 권한: ${denied.join(", ")}\n`;
  if (blocked.length > 0) text += `차단된 도구: ${blocked.join(", ")}`;
  return text;
}

function buildExplainRisk(
  accumulated: number,
  budget: number,
  steps: AgentRunResult["steps"],
  terminationReason: TerminationReason,
): string {
  const highestStep = steps.reduce((max, s) => s.riskScore > (max?.riskScore ?? 0) ? s : max, steps[0]);
  let text = `총 위험 점수: ${accumulated}/${budget}`;
  if (terminationReason === "risk_limit_reached") text += ` (예산 초과로 종료)`;
  text += `\n소진율: ${budget > 0 ? Math.round((accumulated / budget) * 100) : 0}%`;
  if (highestStep) {
    text += `\n최고 위험 단계: ${highestStep.toolKey} (${highestStep.riskScore}점)`;
  }
  const blockedSteps = steps.filter(s => s.blockedByPolicy);
  if (blockedSteps.length > 0) {
    text += `\n차단된 작업: ${blockedSteps.map(s => s.toolKey).join(", ")}`;
  }
  return text;
}
