import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, Globe, Brain, HardDrive, Settings2, AlertTriangle, RotateCcw, Clock, ChevronRight } from "lucide-react";

type ApprovalMode = "AUTO_ALLOWED" | "APPROVAL_REQUIRED" | "AUTO_DENIED";
type EgressLevel = "NO_EGRESS" | "METADATA_ONLY" | "FULL_CONTENT_ALLOWED";
type RiskLevel = "LOW" | "MED" | "HIGH";

interface EffPerm {
  enabled: boolean;
  approvalMode: ApprovalMode;
  egressLevel?: EgressLevel;
  source: "default" | "global" | "bot";
}

interface AuditEntry {
  id: number;
  eventType: string;
  permissionKey: string;
  createdAt: string;
  detailsJson: any;
}

interface PermKeyDef {
  key: string;
  labelEn: string;
  labelKo: string;
  descEn: string;
  descKo: string;
  risk: RiskLevel;
  isEgress?: boolean;
}

interface DashboardGroup {
  id: string;
  icon: typeof Globe;
  keys: PermKeyDef[];
}

const DASHBOARD_GROUPS: DashboardGroup[] = [
  {
    id: "data_collection",
    icon: Globe,
    keys: [
      { key: "WEB_RSS", labelEn: "RSS Feed Collection", labelKo: "RSS 피드 수집", descEn: "Allow collecting content from RSS/Atom feeds", descKo: "RSS/Atom 피드에서 콘텐츠를 수집하도록 허용", risk: "LOW" },
      { key: "WEB_FETCH", labelEn: "Web Page Fetching", labelKo: "웹 페이지 가져오기", descEn: "Allow fetching public web pages (including scraping/extraction)", descKo: "공개 웹 페이지 가져오기 허용 (스크래핑/본문 추출 포함)", risk: "MED" },
      { key: "SOURCE_WRITE", labelEn: "Manage Sources", labelKo: "소스 관리", descEn: "Allow adding, editing, and deleting bot sources", descKo: "봇의 소스 추가/수정/삭제 허용", risk: "LOW" },
    ],
  },
  {
    id: "ai_processing",
    icon: Brain,
    keys: [
      { key: "LLM_USE", labelEn: "AI Provider Usage", labelKo: "AI 제공자 사용", descEn: "Allow using external AI/LLM APIs for analysis and reports", descKo: "분석과 리포트를 위한 외부 AI/LLM API 사용 허용", risk: "MED" },
      { key: "LLM_EGRESS_LEVEL", labelEn: "Data Sent to AI", labelKo: "AI로 전송되는 데이터", descEn: "Control what content is sent to external AI providers", descKo: "외부 AI 제공자에게 전송되는 콘텐츠 범위를 제어", risk: "HIGH", isEgress: true },
    ],
  },
  {
    id: "local_system",
    icon: HardDrive,
    keys: [
      { key: "FS_READ", labelEn: "Read Local Files", labelKo: "로컬 파일 읽기", descEn: "Allow reading files from selected folders", descKo: "선택한 폴더에서 파일 읽기 허용", risk: "MED" },
      { key: "FS_WRITE", labelEn: "Write Local Files", labelKo: "로컬 파일 쓰기", descEn: "Allow creating and modifying files in designated folders", descKo: "지정된 폴더에서 파일 생성/수정 허용", risk: "MED" },
      { key: "FS_DELETE", labelEn: "Delete Files (Trash Only)", labelKo: "파일 삭제 (휴지통만)", descEn: "Allow moving files to trash (permanent deletion is never allowed)", descKo: "파일을 휴지통으로 이동 허용 (영구 삭제는 불가)", risk: "HIGH" },
      { key: "CAL_READ", labelEn: "Read Calendar", labelKo: "캘린더 읽기", descEn: "Allow reading calendar events for briefings", descKo: "브리핑을 위한 캘린더 이벤트 읽기 허용", risk: "LOW" },
      { key: "CAL_WRITE", labelEn: "Create/Update Events", labelKo: "일정 생성/수정", descEn: "Allow creating and modifying calendar events", descKo: "캘린더 이벤트 생성/수정 허용", risk: "MED" },
    ],
  },
  {
    id: "automation",
    icon: Settings2,
    keys: [
      { key: "SCHEDULE_WRITE", labelEn: "Modify Schedules", labelKo: "스케줄 변경", descEn: "Allow changing bot run schedules", descKo: "봇 실행 스케줄 변경 허용", risk: "LOW" },
    ],
  },
];

function getStatusColor(mode: ApprovalMode): string {
  switch (mode) {
    case "AUTO_ALLOWED": return "text-green-500";
    case "APPROVAL_REQUIRED": return "text-yellow-500";
    case "AUTO_DENIED": return "text-red-500";
  }
}

function getStatusDot(mode: ApprovalMode): string {
  switch (mode) {
    case "AUTO_ALLOWED": return "bg-green-500";
    case "APPROVAL_REQUIRED": return "bg-yellow-500";
    case "AUTO_DENIED": return "bg-red-500";
  }
}

function getRiskVariant(risk: RiskLevel): "default" | "secondary" | "destructive" {
  switch (risk) {
    case "HIGH": return "destructive";
    case "MED": return "secondary";
    case "LOW": return "default";
  }
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

interface PermissionDashboardProps {
  botId: number;
  t: (key: string, vars?: Record<string, any>) => string;
  language: string;
}

export function PermissionDashboard({ botId, t, language }: PermissionDashboardProps) {
  const { toast } = useToast();
  const [selectedPerm, setSelectedPerm] = useState<PermKeyDef | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [scope, setScope] = useState<"bot" | "global">("bot");
  const [pendingMode, setPendingMode] = useState<ApprovalMode>("AUTO_ALLOWED");
  const [pendingEgress, setPendingEgress] = useState<EgressLevel>("METADATA_ONLY");

  const { data: effective } = useQuery<Record<string, EffPerm>>({
    queryKey: ["/api/permissions/effective", botId],
    queryFn: () => fetch(`/api/permissions/effective?botId=${botId}`, { credentials: "include" }).then((r) => r.json()),
    enabled: !!botId,
  });

  const { data: auditLogs } = useQuery<AuditEntry[]>({
    queryKey: ["/api/audit-logs", botId, "recent"],
    queryFn: () => fetch(`/api/audit-logs?botId=${botId}&days=7&limit=5`, { credentials: "include" }).then((r) => r.json()),
    enabled: !!botId,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ permissionKey, value }: { permissionKey: string; value: any }) => {
      return apiRequest("PUT", "/api/permissions", {
        scope,
        scopeId: scope === "bot" ? botId : null,
        permissionKey,
        value,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permissions/effective", botId] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-logs", botId, "recent"] });
      toast({ title: t("perm.saved") });
      setModalOpen(false);
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (permissionKey: string) => {
      return apiRequest("DELETE", "/api/permissions", {
        scope: "bot",
        scopeId: botId,
        permissionKey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permissions/effective", botId] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-logs", botId, "recent"] });
      toast({ title: t("perm.deleted") });
    },
  });

  if (!effective) return null;

  const allKeys = DASHBOARD_GROUPS.flatMap(g => g.keys);
  const activeCount = allKeys.filter(k => effective[k.key]?.approvalMode === "AUTO_ALLOWED").length;
  const approvalCount = allKeys.filter(k => effective[k.key]?.approvalMode === "APPROVAL_REQUIRED").length;
  const deniedCount = allKeys.filter(k => effective[k.key]?.approvalMode === "AUTO_DENIED").length;

  const openDetail = (perm: PermKeyDef) => {
    setSelectedPerm(perm);
    const eff = effective[perm.key];
    if (eff) {
      setPendingMode(eff.approvalMode);
      setPendingEgress(eff.egressLevel || "METADATA_ONLY");
      setScope(eff.source === "bot" ? "bot" : "bot");
    }
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!selectedPerm) return;
    if (selectedPerm.isEgress) {
      saveMutation.mutate({
        permissionKey: selectedPerm.key,
        value: { enabled: true, approvalMode: "AUTO_ALLOWED", egressLevel: pendingEgress },
      });
    } else {
      saveMutation.mutate({
        permissionKey: selectedPerm.key,
        value: { enabled: pendingMode !== "AUTO_DENIED", approvalMode: pendingMode },
      });
    }
  };

  const recentAudit = (auditLogs || []).slice(0, 5);

  const isUpdating = saveMutation.isPending || resetMutation.isPending;

  return (
    <>
      <Card data-testid="card-permission-dashboard">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t("pd.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="flex items-center gap-4 p-3 rounded-md bg-muted/50 flex-wrap" data-testid="perm-summary">
            <div className="text-sm text-muted-foreground">
              {allKeys.length} {t("pd.totalPermissions")}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              <span className="text-sm font-medium" data-testid="count-active">{activeCount}</span>
              <span className="text-xs text-muted-foreground">{t("pd.active")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
              <span className="text-sm font-medium" data-testid="count-approval">{approvalCount}</span>
              <span className="text-xs text-muted-foreground">{t("pd.needsApproval")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              <span className="text-sm font-medium" data-testid="count-blocked">{deniedCount}</span>
              <span className="text-xs text-muted-foreground">{t("pd.blocked")}</span>
            </div>
          </div>

          <div className="grid gap-4">
            {DASHBOARD_GROUPS.map(group => {
              const GroupIcon = group.icon;
              return (
                <div key={group.id} data-testid={`perm-group-${group.id}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <GroupIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t(`pd.group.${group.id}`)}</span>
                  </div>
                  <div className="grid gap-1">
                    {group.keys.map(pk => {
                      const perm = effective[pk.key];
                      if (!perm) return null;
                      const label = language === "ko" ? pk.labelKo : pk.labelEn;
                      const isOverride = perm.source === "bot";
                      const isEgress = pk.isEgress;

                      return (
                        <div
                          key={pk.key}
                          className="flex items-center justify-between gap-2 p-2 rounded-md border hover-elevate cursor-pointer"
                          onClick={() => openDetail(pk)}
                          data-testid={`perm-row-${pk.key}`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDot(perm.approvalMode)}`} />
                            <span className="text-sm truncate">{label}</span>
                            {pk.risk === "HIGH" && (
                              <Badge variant="destructive" className="text-[10px] gap-0.5" data-testid={`risk-badge-${pk.key}`}>
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {t("pd.highRisk")}
                              </Badge>
                            )}
                            {isOverride && (
                              <Badge variant="outline" className="text-[10px]">{t("perm.source.bot")}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isEgress ? (
                              <Badge variant={perm.egressLevel === "NO_EGRESS" ? "destructive" : perm.egressLevel === "FULL_CONTENT_ALLOWED" ? "default" : "secondary"}>
                                {t(`perm.egress.${perm.egressLevel}` as any) || perm.egressLevel}
                              </Badge>
                            ) : (
                              <span className={`text-xs font-medium ${getStatusColor(perm.approvalMode)}`}>
                                {t(`perm.mode.${perm.approvalMode}` as any)}
                              </span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {recentAudit.length > 0 && (
            <div data-testid="perm-audit-history">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t("pd.recentHistory")}</span>
              </div>
              <div className="grid gap-1">
                {recentAudit.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs" data-testid={`audit-row-${entry.id}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {t(`audit.${entry.eventType}` as any) || entry.eventType}
                      </Badge>
                      <span className="text-muted-foreground truncate">{entry.permissionKey}</span>
                    </div>
                    <span className="text-muted-foreground shrink-0">{formatTimeAgo(entry.createdAt, language)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-permission-detail">
          {selectedPerm && effective[selectedPerm.key] && (() => {
            const perm = effective[selectedPerm.key];
            const label = language === "ko" ? selectedPerm.labelKo : selectedPerm.labelEn;
            const desc = language === "ko" ? selectedPerm.descKo : selectedPerm.descEn;

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${getStatusDot(perm.approvalMode)}`} />
                    {label}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div>
                    <p className="text-sm font-medium mb-1">{t("pd.currentStatus")}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${getStatusColor(perm.approvalMode)}`}>
                        {t(`perm.mode.${perm.approvalMode}` as any)}
                      </span>
                      {perm.source !== "default" && (
                        <Badge variant="outline" className="text-[10px]">{t(`perm.source.${perm.source}` as any)}</Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">{t("pd.description")}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">{t("pd.riskLevel")}</p>
                    <Badge variant={getRiskVariant(selectedPerm.risk)}>
                      {selectedPerm.risk === "HIGH" && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {t(`perm.risk.${selectedPerm.risk}` as any)}
                    </Badge>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">{t("pd.changeStatus")}</p>
                    {selectedPerm.isEgress ? (
                      <Select value={pendingEgress} onValueChange={(v) => setPendingEgress(v as EgressLevel)}>
                        <SelectTrigger data-testid="select-egress-level">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NO_EGRESS">{t("perm.egress.NO_EGRESS")}</SelectItem>
                          <SelectItem value="METADATA_ONLY">{t("perm.egress.METADATA_ONLY")}</SelectItem>
                          <SelectItem value="FULL_CONTENT_ALLOWED">{t("perm.egress.FULL_CONTENT_ALLOWED")}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <RadioGroup value={pendingMode} onValueChange={(v) => setPendingMode(v as ApprovalMode)} className="grid gap-2">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="AUTO_ALLOWED" id="mode-allowed" data-testid="radio-mode-allowed" />
                          <Label htmlFor="mode-allowed" className="flex items-center gap-1.5 cursor-pointer">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            {t("perm.mode.AUTO_ALLOWED")}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="APPROVAL_REQUIRED" id="mode-approval" data-testid="radio-mode-approval" />
                          <Label htmlFor="mode-approval" className="flex items-center gap-1.5 cursor-pointer">
                            <span className="w-2 h-2 rounded-full bg-yellow-500" />
                            {t("perm.mode.APPROVAL_REQUIRED")}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="AUTO_DENIED" id="mode-denied" data-testid="radio-mode-denied" />
                          <Label htmlFor="mode-denied" className="flex items-center gap-1.5 cursor-pointer">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            {t("perm.mode.AUTO_DENIED")}
                          </Label>
                        </div>
                      </RadioGroup>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">{t("pd.applyScope")}</p>
                    <RadioGroup value={scope} onValueChange={(v) => setScope(v as "bot" | "global")} className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="bot" id="scope-bot" data-testid="radio-scope-bot" />
                        <Label htmlFor="scope-bot" className="cursor-pointer">{t("pd.thisBotOnly")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="global" id="scope-global" data-testid="radio-scope-global" />
                        <Label htmlFor="scope-global" className="cursor-pointer">{t("pd.allBots")}</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t">
                    {perm.source === "bot" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          resetMutation.mutate(selectedPerm.key);
                          setModalOpen(false);
                        }}
                        disabled={isUpdating}
                        data-testid="button-reset-perm"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        {t("pd.resetToGlobal")}
                      </Button>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <Button variant="outline" onClick={() => setModalOpen(false)} data-testid="button-cancel-perm">
                        {t("approval.deny")}
                      </Button>
                      <Button onClick={handleSave} disabled={isUpdating} data-testid="button-save-perm">
                        {t("pd.changeStatus")}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
