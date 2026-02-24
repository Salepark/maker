import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Bot, Play, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle, Shield, ChevronRight, Zap, Timer, FileText, ShieldAlert, Gauge } from "lucide-react";

type AutonomyLevel = "L0" | "L1" | "L2" | "L3";

interface AgentRunData {
  id: number;
  botId: number;
  trigger: string;
  autonomyLevel: string;
  goal: string;
  status: string;
  stepCount: number;
  summary: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  riskScoreTotal: number | null;
  terminationReason: string | null;
  explainSummary: string | null;
  explainPolicy: string | null;
  explainRisk: string | null;
  riskBudgetLimit: number | null;
}

interface AgentStepData {
  id: number;
  agentRunId: number;
  stepIndex: number;
  toolKey: string;
  permissionKey: string | null;
  status: string;
  inputSummary: string | null;
  outputSummary: string | null;
  rationale: string | null;
  durationMs: number | null;
  riskScore: number | null;
  decisionReason: string | null;
  blockedByPolicy: boolean | null;
  policyRuleTriggered: string | null;
  egressUsed: boolean | null;
}

interface PlanStep {
  toolKey: string;
  description: string;
  permissionKey: string;
  riskTier: string;
  riskScore: number;
}

interface AgentPlan {
  planId: string;
  planHash: string;
  goal: string;
  steps: PlanStep[];
  requiredPermissions: string[];
  riskSummary: { high: number; medium: number; low: number; critical: number; totalRisk: number };
  estimatedSteps: number;
  riskBudget: number;
}

function useIsDesktop() {
  return typeof window !== "undefined" && !!(window as any).electronAPI;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "success": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "error": return <XCircle className="h-4 w-4 text-red-500" />;
    case "timeout": return <Timer className="h-4 w-4 text-yellow-500" />;
    case "blocked": return <Shield className="h-4 w-4 text-yellow-500" />;
    case "denied": return <XCircle className="h-4 w-4 text-red-500" />;
    case "running": return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "success": return "default";
    case "error": case "denied": return "destructive";
    case "blocked": case "timeout": return "secondary";
    default: return "outline";
  }
}

function getRiskBadgeVariant(riskScore: number): "default" | "secondary" | "destructive" | "outline" {
  if (riskScore >= 15) return "destructive";
  if (riskScore >= 7) return "secondary";
  return "outline";
}

function formatDuration(ms: number | null): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTimeAgo(dateStr: string, language: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return language === "ko" ? "방금 전" : "just now";
  if (mins < 60) return language === "ko" ? `${mins}분 전` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return language === "ko" ? `${hours}시간 전` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return language === "ko" ? `${days}일 전` : `${days}d ago`;
}

function RiskBudgetBar({ consumed, budget, t }: { consumed: number; budget: number; t: (key: string) => string }) {
  const pct = budget > 0 ? Math.min((consumed / budget) * 100, 100) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="space-y-1.5" data-testid="risk-budget-bar">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1">
          <Gauge className="h-3 w-3" />
          {t("risk.title")}
        </span>
        <span className="font-medium">{consumed}/{budget} ({Math.round(pct)}%)</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface AutonomyCardProps {
  botId: number;
  t: (key: string, vars?: Record<string, any>) => string;
  language: string;
}

export function AutonomyCard({ botId, t, language }: AutonomyCardProps) {
  const { toast } = useToast();
  const isDesktop = useIsDesktop();
  const [goal, setGoal] = useState("");
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<AgentPlan | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: effective } = useQuery<Record<string, any>>({
    queryKey: ["/api/permissions/effective", botId],
    queryFn: () => fetch(`/api/permissions/effective?botId=${botId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!botId,
  });

  const currentLevel: AutonomyLevel = effective?.AUTONOMY_LEVEL?.resourceScope?.level || "L1";
  const maxLevel: AutonomyLevel = isDesktop ? "L3" : "L2";
  const levels: AutonomyLevel[] = ["L0", "L1", "L2", "L3"];
  const levelOrder = { L0: 0, L1: 1, L2: 2, L3: 3 };
  const isLevelDisabled = (level: AutonomyLevel) => levelOrder[level] > levelOrder[maxLevel];

  const riskBudgetLimit = effective?.RISK_BUDGET_LIMIT?.resourceScope?.limit ?? 10;

  const { data: agentRuns, isLoading: runsLoading } = useQuery<AgentRunData[]>({
    queryKey: ["/api/agent/runs", botId],
    queryFn: () => fetch(`/api/agent/runs?botId=${botId}&limit=5`, { credentials: "include" }).then(r => r.json()),
    enabled: !!botId,
    refetchInterval: 15000,
  });

  const { data: selectedSteps } = useQuery<AgentStepData[]>({
    queryKey: ["/api/agent/runs", selectedRunId, "steps"],
    queryFn: () => fetch(`/api/agent/runs/${selectedRunId}/steps`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedRunId && detailOpen,
  });

  const saveLevelMutation = useMutation({
    mutationFn: async (level: AutonomyLevel) => {
      return apiRequest("PUT", "/api/permissions", {
        scope: "bot",
        scopeId: botId,
        permissionKey: "AUTONOMY_LEVEL",
        value: { enabled: true, approvalMode: "AUTO_ALLOWED", resourceScope: { level } },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permissions/effective", botId] });
      toast({ title: language === "ko" ? "자율성 레벨이 변경되었습니다" : "Autonomy level updated" });
    },
  });

  const planMutation = useMutation({
    mutationFn: async (goalText: string) => {
      const res = await apiRequest("POST", "/api/agent/plan", { botId, goal: goalText });
      return res.json();
    },
    onSuccess: (plan: AgentPlan) => {
      setCurrentPlan(plan);
      setPlanModalOpen(true);
    },
    onError: (err: any) => {
      toast({ title: language === "ko" ? "계획 생성 실패" : "Plan generation failed", variant: "destructive" });
    },
  });

  const runMutation = useMutation({
    mutationFn: async ({ goal: goalText, planId, planHash }: { goal: string; planId?: string; planHash?: string }) => {
      const res = await apiRequest("POST", "/api/agent/run", { botId, goal: goalText, planId, planHash });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/runs", botId] });
      setPlanModalOpen(false);
      setGoal("");
      toast({ title: language === "ko" ? "에이전트 실행이 완료되었습니다" : "Agent run completed" });
    },
    onError: (err: any) => {
      toast({ title: language === "ko" ? "실행 실패" : "Execution failed", variant: "destructive" });
    },
  });

  const handlePlanOrRun = () => {
    if (!goal.trim()) return;
    if (currentLevel === "L0") {
      toast({ title: language === "ko" ? "수동 모드에서는 에이전트를 실행할 수 없습니다" : "Cannot run agent in manual mode" });
      return;
    }
    if (currentLevel === "L1") {
      planMutation.mutate(goal);
    } else {
      runMutation.mutate({ goal });
    }
  };

  const runs = Array.isArray(agentRuns) ? agentRuns : [];
  const selectedRun = runs.find(r => r.id === selectedRunId);

  return (
    <>
      <Card data-testid="card-autonomy">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {t("autonomy.title")}
          </CardTitle>
          <CardDescription>{t("autonomy.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div data-testid="autonomy-level-selector">
            <Label className="text-sm font-medium mb-3 block">{t("autonomy.level")}</Label>
            <RadioGroup
              value={currentLevel}
              onValueChange={(v) => saveLevelMutation.mutate(v as AutonomyLevel)}
              className="grid gap-2"
            >
              {levels.map(level => {
                const disabled = isLevelDisabled(level);
                return (
                  <div key={level} className={`flex items-center gap-3 p-2.5 rounded-md border transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"}`}>
                    <RadioGroupItem value={level} id={`level-${level}`} disabled={disabled} data-testid={`radio-level-${level}`} />
                    <Label htmlFor={`level-${level}`} className={`flex-1 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t(`autonomy.level.${level}`)}</span>
                        <div className="flex gap-1">
                          {level === "L1" && (
                            <Badge variant="outline" className="text-[10px]">{t("autonomy.globalDefault")}</Badge>
                          )}
                          {level === "L2" && !isDesktop && (
                            <Badge variant="outline" className="text-[10px]">{t("autonomy.webMax")}</Badge>
                          )}
                          {level === "L3" && !isDesktop && (
                            <Badge variant="secondary" className="text-[10px]">{t("autonomy.desktopOnly")}</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{t(`autonomy.level.${level}.desc`)}</p>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          <div className="p-3 rounded-md bg-muted/50" data-testid="autonomy-limits">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("autonomy.runLimits")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>{t("autonomy.maxSteps")}: <span className="font-medium text-foreground">5</span></div>
              <div>{t("autonomy.maxRuntime")}: <span className="font-medium text-foreground">30{t("autonomy.seconds")}</span></div>
              <div>{t("autonomy.maxLLMCalls")}: <span className="font-medium text-foreground">3</span></div>
              <div>{t("autonomy.maxToolCalls")}: <span className="font-medium text-foreground">5</span></div>
              <div>{t("autonomy.cooldown")}: <span className="font-medium text-foreground">60{t("autonomy.seconds")}</span></div>
              <div>{t("risk.budget")}: <span className="font-medium text-foreground">{riskBudgetLimit}</span></div>
            </div>
          </div>

          {currentLevel !== "L0" && (
            <div className="border-t pt-4" data-testid="agent-run-section">
              <Label className="text-sm font-medium mb-2 block">{t("agent.runAgent")}</Label>
              <div className="flex gap-2">
                <Input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder={t("agent.goalPlaceholder")}
                  onKeyDown={(e) => e.key === "Enter" && handlePlanOrRun()}
                  data-testid="input-agent-goal"
                />
                <Button
                  onClick={handlePlanOrRun}
                  disabled={!goal.trim() || planMutation.isPending || runMutation.isPending}
                  data-testid="button-agent-run"
                >
                  {planMutation.isPending || runMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">
                    {currentLevel === "L1" ? t("agent.plan") : t("agent.run")}
                  </span>
                </Button>
              </div>
            </div>
          )}

          <div className="border-t pt-4" data-testid="agent-runs-history">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("agent.recentRuns")}</span>
            </div>
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("agent.noRuns")}</p>
            ) : (
              <div className="grid gap-1.5">
                {runs.map(run => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => { setSelectedRunId(run.id); setDetailOpen(true); }}
                    data-testid={`agent-run-${run.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getStatusIcon(run.status)}
                      <span className="text-sm truncate">{run.goal || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={getStatusBadgeVariant(run.status)} className="text-[10px]">
                        {run.terminationReason ? t(`termination.${run.terminationReason}` as any) || run.terminationReason : (t(`agent.status.${run.status}` as any) || run.status)}
                      </Badge>
                      {run.riskScoreTotal != null && run.riskBudgetLimit != null && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {run.riskScoreTotal}/{run.riskBudgetLimit}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {run.stepCount}{t("agent.steps")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(run.durationMs)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(run.startedAt, language)}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-plan-approval">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t("agent.planApproval")}
            </DialogTitle>
          </DialogHeader>
          {currentPlan && (
            <div className="grid gap-4 py-2">
              <p className="text-sm text-muted-foreground">{t("agent.planApproval.desc")}</p>

              <RiskBudgetBar consumed={currentPlan.riskSummary.totalRisk} budget={currentPlan.riskBudget} t={t} />

              <div>
                <p className="text-sm font-medium mb-2">{t("agent.plan")}</p>
                <div className="grid gap-1.5">
                  {currentPlan.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
                      <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">#{i + 1}</span>
                      <span className="flex-1">{step.description}</span>
                      <Badge variant={getRiskBadgeVariant(step.riskScore)} className="text-[10px]">
                        {step.riskTier} ({step.riskScore})
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-md bg-muted/50 text-sm">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>CRITICAL: {currentPlan.riskSummary.critical}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>{t("agent.planApproval.high")}: {currentPlan.riskSummary.high}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>{t("agent.planApproval.medium")}: {currentPlan.riskSummary.medium}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span>{t("agent.planApproval.low")}: {currentPlan.riskSummary.low}</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">{t("agent.planApproval.permissions")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {currentPlan.requiredPermissions.map(p => (
                    <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground p-2 rounded bg-muted/30 font-mono">
                Plan Hash: {currentPlan.planHash.substring(0, 16)}...
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setPlanModalOpen(false)} data-testid="button-plan-cancel">
                  {t("agent.planApproval.cancel")}
                </Button>
                <Button
                  onClick={() => runMutation.mutate({ goal: currentPlan.goal, planId: currentPlan.planId, planHash: currentPlan.planHash })}
                  disabled={runMutation.isPending}
                  data-testid="button-plan-approve"
                >
                  {runMutation.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                  {t("agent.planApproval.approve")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto" data-testid="sheet-agent-detail">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {t("agent.stepDetail")}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid gap-4">
            {selectedRun && (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {getStatusIcon(selectedRun.status)}
                      <span className="font-medium">{t(`agent.status.${selectedRun.status}` as any)}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("agent.duration")}</span>
                    <p className="font-medium mt-0.5">{formatDuration(selectedRun.durationMs)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("agent.steps")}</span>
                    <p className="font-medium mt-0.5">{selectedRun.stepCount}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Level</span>
                    <p className="font-medium mt-0.5">{selectedRun.autonomyLevel}</p>
                  </div>
                </div>

                {selectedRun.riskScoreTotal != null && selectedRun.riskBudgetLimit != null && (
                  <RiskBudgetBar consumed={selectedRun.riskScoreTotal} budget={selectedRun.riskBudgetLimit} t={t} />
                )}

                {selectedRun.terminationReason && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{language === "ko" ? "종료 사유" : "Termination"}</span>
                    <Badge variant={selectedRun.terminationReason === "completed" ? "default" : "secondary"} className="ml-2 text-[10px]">
                      {t(`termination.${selectedRun.terminationReason}` as any) || selectedRun.terminationReason}
                    </Badge>
                  </div>
                )}

                {selectedRun.goal && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Goal</span>
                    <p className="mt-0.5">{selectedRun.goal}</p>
                  </div>
                )}

                {(selectedRun.explainSummary || selectedRun.explainPolicy || selectedRun.explainRisk) && (
                  <Tabs defaultValue="summary" className="w-full" data-testid="explain-tabs">
                    <TabsList className="w-full grid grid-cols-3">
                      <TabsTrigger value="summary" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        {t("explain.summary")}
                      </TabsTrigger>
                      <TabsTrigger value="policy" className="text-xs">
                        <ShieldAlert className="h-3 w-3 mr-1" />
                        {t("explain.policy")}
                      </TabsTrigger>
                      <TabsTrigger value="risk" className="text-xs">
                        <Gauge className="h-3 w-3 mr-1" />
                        {t("explain.risk")}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary" className="mt-2">
                      <pre className="text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap font-mono">{selectedRun.explainSummary}</pre>
                    </TabsContent>
                    <TabsContent value="policy" className="mt-2">
                      <pre className="text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap font-mono">{selectedRun.explainPolicy}</pre>
                    </TabsContent>
                    <TabsContent value="risk" className="mt-2">
                      <pre className="text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap font-mono">{selectedRun.explainRisk}</pre>
                    </TabsContent>
                  </Tabs>
                )}

                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">{t("agent.steps")}</p>
                  {Array.isArray(selectedSteps) && selectedSteps.length > 0 ? (
                    <div className="grid gap-2">
                      {selectedSteps.map(step => (
                        <div key={step.id} className={`p-2.5 rounded-md border text-sm ${step.blockedByPolicy ? "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20" : ""}`} data-testid={`step-detail-${step.stepIndex}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground">#{step.stepIndex + 1}</span>
                              {getStatusIcon(step.status)}
                              <span className="font-medium">{step.toolKey}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {step.riskScore != null && (
                                <Badge variant={getRiskBadgeVariant(step.riskScore)} className="text-[10px]">
                                  {t("risk.score")}: {step.riskScore}
                                </Badge>
                              )}
                              {step.blockedByPolicy && (
                                <Badge variant="destructive" className="text-[10px]">
                                  {t("agent.step.blocked")}
                                </Badge>
                              )}
                              {step.egressUsed && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {t("agent.step.egress")}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">{formatDuration(step.durationMs)}</span>
                            </div>
                          </div>
                          {step.inputSummary && (
                            <p className="text-xs text-muted-foreground">{t("agent.step.input")}: {step.inputSummary}</p>
                          )}
                          {step.outputSummary && (
                            <p className="text-xs mt-0.5">{t("agent.step.output")}: {step.outputSummary}</p>
                          )}
                          {step.decisionReason && (
                            <p className="text-xs mt-0.5 text-muted-foreground italic">{step.decisionReason}</p>
                          )}
                          {step.policyRuleTriggered && (
                            <p className="text-xs mt-0.5 text-yellow-600 dark:text-yellow-400">
                              {language === "ko" ? "정책 규칙" : "Policy Rule"}: {step.policyRuleTriggered}
                            </p>
                          )}
                          {step.permissionKey && (
                            <Badge variant="outline" className="text-[10px] mt-1">{step.permissionKey}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{language === "ko" ? "단계 정보가 없습니다" : "No steps recorded"}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
