import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/language-provider";
import { Shield, ShieldCheck, ShieldX, ShieldAlert, RotateCcw, Loader2, Clock, AlertTriangle, Monitor } from "lucide-react";

type ApprovalMode = "AUTO_ALLOWED" | "APPROVAL_REQUIRED" | "AUTO_DENIED";
type EgressLevel = "NO_EGRESS" | "METADATA_ONLY" | "FULL_CONTENT_ALLOWED";

function useIsDesktop() {
  return typeof window !== "undefined" && !!(window as any).electronAPI;
}

interface EffectivePermission {
  enabled: boolean;
  approvalMode: ApprovalMode;
  egressLevel?: EgressLevel;
  source: "default" | "global" | "bot";
  resourceScope?: Record<string, any>;
}

interface PermissionKeyDef {
  key: string;
  labelEn: string;
  labelKo: string;
  descEn: string;
  descKo: string;
  risk: "LOW" | "MED" | "HIGH";
  egressLevel?: EgressLevel;
  localOnly?: boolean;
}

interface PermissionGroupDef {
  group: string;
  keys: PermissionKeyDef[];
}

const PERMISSION_GROUPS: PermissionGroupDef[] = [
  {
    group: "web_sources",
    keys: [
      { key: "WEB_RSS", labelEn: "RSS Feed Collection", labelKo: "RSS 피드 수집", descEn: "Allow collecting content from RSS/Atom feeds", descKo: "RSS/Atom 피드에서 콘텐츠를 수집하도록 허용", risk: "LOW" },
      { key: "WEB_FETCH", labelEn: "Web Page Fetching", labelKo: "웹 페이지 가져오기", descEn: "Allow fetching public web pages (including scraping/extraction)", descKo: "공개 웹 페이지 가져오기 허용 (스크래핑/본문 추출 포함)", risk: "MED" },
      { key: "SOURCE_WRITE", labelEn: "Manage Sources", labelKo: "소스 관리", descEn: "Allow adding, editing, and deleting bot sources", descKo: "봇의 소스 추가/수정/삭제 허용", risk: "LOW" },
    ],
  },
  {
    group: "ai_data",
    keys: [
      { key: "LLM_USE", labelEn: "AI Provider Usage", labelKo: "AI 제공자 사용", descEn: "Allow using external AI/LLM APIs", descKo: "외부 AI/LLM API 사용 허용", risk: "MED" },
      { key: "LLM_EGRESS_LEVEL", labelEn: "Data Sent to AI", labelKo: "AI로 전송되는 데이터", descEn: "Control what content is sent to AI providers", descKo: "AI 제공자에게 전송되는 콘텐츠 범위를 제어", risk: "HIGH", egressLevel: "METADATA_ONLY" },
    ],
  },
  {
    group: "files",
    keys: [
      { key: "FS_READ", labelEn: "Read Local Files", labelKo: "로컬 파일 읽기", descEn: "Allow reading files from selected folders", descKo: "선택한 폴더에서 파일 읽기 허용", risk: "MED", localOnly: true },
      { key: "FS_WRITE", labelEn: "Write Local Files", labelKo: "로컬 파일 쓰기", descEn: "Allow creating and modifying files", descKo: "파일 생성/수정 허용", risk: "MED", localOnly: true },
      { key: "FS_DELETE", labelEn: "Delete Files (Trash Only)", labelKo: "파일 삭제 (휴지통만)", descEn: "Allow moving files to trash", descKo: "파일을 휴지통으로 이동 허용", risk: "HIGH", localOnly: true },
    ],
  },
  {
    group: "calendar",
    keys: [
      { key: "CAL_READ", labelEn: "Read Calendar", labelKo: "캘린더 읽기", descEn: "Allow reading calendar events", descKo: "캘린더 이벤트 읽기 허용", risk: "LOW", localOnly: true },
      { key: "CAL_WRITE", labelEn: "Create/Update Events", labelKo: "일정 생성/수정", descEn: "Allow creating and modifying events", descKo: "캘린더 이벤트 생성/수정 허용", risk: "MED", localOnly: true },
    ],
  },
  {
    group: "scheduling",
    keys: [
      { key: "SCHEDULE_WRITE", labelEn: "Modify Schedules", labelKo: "스케줄 변경", descEn: "Allow changing bot run schedules", descKo: "봇 실행 스케줄 변경 허용", risk: "LOW" },
    ],
  },
];

const APPROVAL_MODES: ApprovalMode[] = ["AUTO_ALLOWED", "APPROVAL_REQUIRED", "AUTO_DENIED"];

interface AuditLogEntry {
  id: number;
  userId: string;
  botId: number | null;
  threadId: string | null;
  eventType: string;
  permissionKey: string | null;
  payloadJson: any;
  createdAt: string;
}

function RiskBadge({ risk }: { risk: "LOW" | "MED" | "HIGH" }) {
  const { t } = useLanguage();
  const key = `perm.risk.${risk}` as any;
  if (risk === "HIGH") return <Badge variant="destructive" data-testid={`badge-risk-${risk}`}>{t(key)}</Badge>;
  if (risk === "MED") return <Badge variant="secondary" data-testid={`badge-risk-${risk}`}>{t(key)}</Badge>;
  return <Badge variant="outline" data-testid={`badge-risk-${risk}`}>{t(key)}</Badge>;
}

function SourceBadge({ source }: { source: "default" | "global" | "bot" }) {
  const { t } = useLanguage();
  const key = `perm.source.${source}` as any;
  if (source === "bot") return <Badge variant="default" data-testid={`badge-source-${source}`}>{t(key)}</Badge>;
  if (source === "global") return <Badge variant="secondary" data-testid={`badge-source-${source}`}>{t(key)}</Badge>;
  return <Badge variant="outline" data-testid={`badge-source-${source}`}>{t(key)}</Badge>;
}

function PermissionRow({
  keyDef,
  effective,
  onUpdate,
  onReset,
  isUpdating,
  isDesktop,
}: {
  keyDef: PermissionKeyDef;
  effective: EffectivePermission | undefined;
  onUpdate: (key: string, value: any) => void;
  onReset: (key: string) => void;
  isUpdating: boolean;
  isDesktop: boolean;
}) {
  const { t, language } = useLanguage();
  const label = language === "ko" ? keyDef.labelKo : keyDef.labelEn;
  const desc = language === "ko" ? keyDef.descKo : keyDef.descEn;
  const isEnabled = effective?.enabled ?? false;
  const mode = effective?.approvalMode ?? "AUTO_DENIED";
  const source = effective?.source ?? "default";
  const isEgressKey = keyDef.key === "LLM_EGRESS_LEVEL";
  const egressLevel = effective?.egressLevel ?? "NO_EGRESS";
  const egressLevels: EgressLevel[] = isDesktop
    ? ["NO_EGRESS", "METADATA_ONLY", "FULL_CONTENT_ALLOWED"]
    : ["NO_EGRESS", "METADATA_ONLY"];

  return (
    <div className="flex flex-col gap-2 p-3 rounded-md border" data-testid={`perm-row-${keyDef.key}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
          <span className="font-medium text-sm">{label}</span>
          <RiskBadge risk={keyDef.risk} />
          <SourceBadge source={source} />
          {isDesktop && keyDef.localOnly && (
            <Badge variant="outline" className="text-[10px] gap-0.5" data-testid={`local-badge-${keyDef.key}`}>
              <Monitor className="w-2.5 h-2.5" />
              {t("pd.localOnly")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {source !== "default" && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onReset(keyDef.key)}
              disabled={isUpdating}
              data-testid={`button-reset-${keyDef.key}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) =>
              onUpdate(keyDef.key, {
                enabled: checked,
                approvalMode: checked ? "AUTO_ALLOWED" : "AUTO_DENIED",
                ...(isEgressKey ? { egressLevel: checked ? "METADATA_ONLY" : "NO_EGRESS" } : {}),
              })
            }
            disabled={isUpdating}
            data-testid={`switch-${keyDef.key}`}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{desc}</p>
      {isEnabled && !isEgressKey && (
        <div className="flex items-center gap-2">
          <Select
            value={mode}
            onValueChange={(val: ApprovalMode) =>
              onUpdate(keyDef.key, { enabled: true, approvalMode: val })
            }
            disabled={isUpdating}
          >
            <SelectTrigger className="w-[180px]" data-testid={`select-mode-${keyDef.key}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPROVAL_MODES.map((m) => (
                <SelectItem key={m} value={m} data-testid={`option-mode-${m}`}>
                  {t(`perm.mode.${m}` as any)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {isEnabled && isEgressKey && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Select
              value={egressLevel}
              onValueChange={(val: EgressLevel) =>
                onUpdate(keyDef.key, { enabled: true, approvalMode: "AUTO_ALLOWED", egressLevel: val })
              }
              disabled={isUpdating}
            >
              <SelectTrigger className="w-[200px]" data-testid={`select-egress-${keyDef.key}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {egressLevels.map((lvl) => (
                  <SelectItem key={lvl} value={lvl} data-testid={`option-egress-${lvl}`}>
                    {t(`perm.egress.${lvl}` as any)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isDesktop && (
            <p className="text-xs text-muted-foreground">{t("pd.egressWebNote")}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Permissions() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const isDesktop = useIsDesktop();
  const [activeTab, setActiveTab] = useState<string>("permissions");

  const filteredGroups = PERMISSION_GROUPS.map(group => ({
    ...group,
    keys: group.keys.filter(k => isDesktop || !k.localOnly),
  })).filter(group => group.keys.length > 0);
  const hasHiddenPerms = !isDesktop && filteredGroups.flatMap(g => g.keys).length < PERMISSION_GROUPS.flatMap(g => g.keys).length;

  const { data: effective, isLoading } = useQuery<Record<string, EffectivePermission>>({
    queryKey: ["/api/permissions/effective"],
    queryFn: () => fetch("/api/permissions/effective", { credentials: "include" }).then((r) => r.json()),
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/audit-logs"],
    queryFn: () => fetch("/api/audit-logs", { credentials: "include" }).then((r) => r.json()),
    enabled: activeTab === "audit",
  });

  const updateMutation = useMutation({
    mutationFn: async ({ permissionKey, value }: { permissionKey: string; value: any }) => {
      return apiRequest("PUT", "/api/permissions", {
        scope: "global",
        scopeId: null,
        permissionKey,
        value,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permissions/effective"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-logs"] });
      toast({ title: t("perm.saved") });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (permissionKey: string) => {
      return apiRequest("DELETE", "/api/permissions", {
        scope: "global",
        scopeId: null,
        permissionKey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permissions/effective"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-logs"] });
      toast({ title: t("perm.deleted") });
    },
  });

  const isUpdating = updateMutation.isPending || resetMutation.isPending;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" data-testid="page-permissions">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-permissions-title">
          <Shield className="w-6 h-6" />
          {t("perm.title")}
        </h1>
        <p className="text-muted-foreground mt-1" data-testid="text-permissions-subtitle">{t("perm.subtitle")}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-permissions">
          <TabsTrigger value="permissions" data-testid="tab-permissions">
            <ShieldCheck className="w-4 h-4 mr-1" />
            {t("perm.globalDefaults")}
          </TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">
            <Clock className="w-4 h-4 mr-1" />
            {t("audit.title")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-4 mt-4">
          {hasHiddenPerms && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 text-xs text-muted-foreground" data-testid="web-hidden-notice-global">
              <Monitor className="w-3.5 h-3.5 shrink-0" />
              {t("pd.webHidden")}
            </div>
          )}
          {filteredGroups.map((group) => (
            <Card key={group.group} data-testid={`card-group-${group.group}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg" data-testid={`text-group-title-${group.group}`}>
                  {t(`perm.group.${group.group}` as any)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.keys.map((keyDef) => (
                  <PermissionRow
                    key={keyDef.key}
                    keyDef={keyDef}
                    effective={effective?.[keyDef.key]}
                    onUpdate={(key, value) => updateMutation.mutate({ permissionKey: key, value })}
                    onReset={(key) => resetMutation.mutate(key)}
                    isUpdating={isUpdating}
                    isDesktop={isDesktop}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card data-testid="card-audit-log">
            <CardHeader>
              <CardTitle data-testid="text-audit-title">{t("audit.title")}</CardTitle>
              <CardDescription data-testid="text-audit-subtitle">{t("audit.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !auditLogs?.length ? (
                <p className="text-muted-foreground text-sm py-4 text-center" data-testid="text-no-audit-logs">
                  {t("audit.noLogs")}
                </p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-md border text-sm"
                      data-testid={`audit-log-${log.id}`}
                    >
                      <div className="mt-0.5">
                        {log.eventType === "PERMISSION_DENIED" ? (
                          <ShieldX className="w-4 h-4 text-destructive" />
                        ) : log.eventType === "PERMISSION_CHANGED" ? (
                          <ShieldAlert className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <RotateCcw className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={log.eventType === "PERMISSION_DENIED" ? "destructive" : "secondary"}>
                            {t(`audit.${log.eventType}` as any) || log.eventType}
                          </Badge>
                          {log.permissionKey && (
                            <Badge variant="outline">{log.permissionKey}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.createdAt).toLocaleString(language === "ko" ? "ko-KR" : "en-US")}
                          {log.botId && ` | Bot #${log.botId}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
