import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Plus, Loader2, Bot, RefreshCw, Copy, Download, Check } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";

interface Report {
  id: number;
  profileId: number;
  userId: string;
  presetId: number;
  topic: string;
  outputType: string;
  title: string;
  contentText: string;
  reportStage: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string | null;
}

interface Profile {
  id: number;
  name: string;
  topic: string;
  isActive: boolean;
  presetName: string;
}

interface BotInfo {
  id: number;
  key: string;
  name: string;
  isEnabled: boolean;
  settings?: any;
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function getTopicColor(topic: string) {
  const colors: Record<string, string> = {
    investing: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    ai_art: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    tech: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    crypto: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };
  return colors[topic] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

function getStageClassName(stage: string): string {
  switch (stage) {
    case "fast":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "status":
      return "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200";
    case "full":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
    default:
      return "";
  }
}

function getStageLabelKey(stage: string): string | null {
  switch (stage) {
    case "fast": return "reports.stage.fast";
    case "status": return "reports.stage.status";
    case "full": return "reports.stage.full";
    default: return null;
  }
}

export default function Reports() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [copied, setCopied] = useState(false);

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["/api/profiles"],
  });

  const { data: botsData } = useQuery<{ bots: BotInfo[] }>({
    queryKey: ["/api/bots"],
  });
  const bots = botsData?.bots || [];

  const filterOptions = useMemo(() => {
    const options: { value: string; label: string; type: "profile" | "bot" }[] = [];
    
    const profileTopics = new Set(profiles.map(p => p.topic));
    
    profiles.filter(p => p.isActive).forEach(profile => {
      options.push({
        value: `profile:${profile.id}`,
        label: profile.name,
        type: "profile",
      });
    });
    
    bots.filter(b => b.isEnabled && !profileTopics.has(b.key)).forEach(bot => {
      options.push({
        value: `bot:${bot.id}`,
        label: bot.name,
        type: "bot",
      });
    });
    
    return options;
  }, [profiles, bots]);

  const selectedProfileIdForQuery = useMemo(() => {
    if (selectedFilter === "all") return undefined;
    if (selectedFilter.startsWith("profile:")) {
      return parseInt(selectedFilter.split(":")[1]);
    }
    return undefined;
  }, [selectedFilter]);

  const hasFastReportRef = useRef(false);

  const { data: reports, isLoading, refetch } = useQuery<Report[]>({
    queryKey: ["/api/reports", selectedProfileIdForQuery],
    queryFn: async () => {
      const url = selectedProfileIdForQuery 
        ? `/api/reports?profileId=${selectedProfileIdForQuery}` 
        : "/api/reports";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data: Report[] = await res.json();
      hasFastReportRef.current = data.some((r) => r.reportStage === "fast");
      return data;
    },
    refetchInterval: () => hasFastReportRef.current ? 10000 : false,
  });

  const selectedReport = useMemo(() => {
    if (!reports || selectedReportId == null) return null;
    return reports.find((r) => r.id === selectedReportId) ?? null;
  }, [reports, selectedReportId]);

  const handleCopyReport = useCallback(() => {
    if (!selectedReport) return;
    const text = `${selectedReport.title}\n\n${selectedReport.contentText}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast({ title: t("reports.copied") });
      setTimeout(() => setCopied(false), 2000);
    });
  }, [selectedReport, toast]);

  const handleDownloadReport = useCallback(() => {
    if (!selectedReport) return;
    const text = `# ${selectedReport.title}\n\n${t("reports.created")} ${formatDateTime(selectedReport.createdAt)}\n${t("reports.period")} ${formatDateTime(selectedReport.periodStart)} ~ ${formatDateTime(selectedReport.periodEnd)}\n\n${selectedReport.contentText}`;
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedReport.title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: t("reports.downloaded") });
  }, [selectedReport, toast]);

  const generateMutation = useMutation({
    mutationFn: async (params: { profileId?: number; botId?: number }) => {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Report generation failed");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      toast({
        title: t("reports.generated"),
        description: data.result ? t("reports.generatedDesc", { count: data.result.itemsCount }) : t("reports.generationComplete"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("reports.generationFailed"),
        description: error.message || t("reports.generationFailedDesc"),
        variant: "destructive",
      });
    },
  });

  const handleGenerate = useCallback(() => {
    if (selectedFilter === "all") return;
    
    if (selectedFilter.startsWith("profile:")) {
      generateMutation.mutate({ profileId: parseInt(selectedFilter.split(":")[1]) });
    } else if (selectedFilter.startsWith("bot:")) {
      generateMutation.mutate({ botId: parseInt(selectedFilter.split(":")[1]) });
    }
  }, [selectedFilter, generateMutation]);

  const canGenerate = selectedFilter !== "all";

  const getProfileName = (profileId: number) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) return profile.name;
    return `Profile #${profileId}`;
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-reports-title">
            <FileText className="h-5 w-5" />
            {t("reports.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("reports.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-48" data-testid="select-profile">
              <SelectValue placeholder="Select bot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("reports.allReports")}</SelectItem>
              {filterOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <Bot className="h-3 w-3" />
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh-reports"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !canGenerate}
            data-testid="button-generate-report"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {t("reports.generate")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        <Card className="h-[70vh] overflow-hidden">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-medium">{t("reports.recentReports")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[calc(70vh-52px)] overflow-auto">
              {isLoading && (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              )}

              {!isLoading && (!reports || reports.length === 0) && (
                <div className="p-6 text-center">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">{t("reports.noReports")}</p>
                  {canGenerate && (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={handleGenerate}
                      disabled={generateMutation.isPending}
                      data-testid="button-generate-first-report"
                    >
                      {generateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1" />
                      )}
                      {t("reports.generateReport")}
                    </Button>
                  )}
                  {!canGenerate && bots.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("reports.selectBotHint")}
                    </p>
                  )}
                  {!canGenerate && bots.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("reports.createBotFirst")}
                    </p>
                  )}
                </div>
              )}

              {reports?.map((report) => {
                const isActive = report.id === selectedReportId;
                return (
                  <button
                    key={report.id}
                    className={`w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors ${
                      isActive ? "bg-muted" : ""
                    }`}
                    onClick={() => setSelectedReportId(report.id)}
                    data-testid={`button-select-report-${report.id}`}
                  >
                    <div className="text-sm font-medium line-clamp-2">{report.title}</div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span>{formatDateTime(report.createdAt)}</span>
                      {report.reportStage && report.reportStage !== "full" && (() => {
                        const stageKey = getStageLabelKey(report.reportStage);
                        const stageClass = getStageClassName(report.reportStage);
                        return stageKey ? (
                          <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${stageClass}`} data-testid={`badge-stage-${report.id}`}>
                            {t(stageKey)}
                          </Badge>
                        ) : null;
                      })()}
                      {report.reportStage === "full" && report.updatedAt && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" data-testid={`badge-updated-${report.id}`}>
                          {t("reports.stage.updated")}
                        </Badge>
                      )}
                      <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${getTopicColor(report.topic)}`}>
                        {report.topic}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Bot className="h-3 w-3" />
                        {getProfileName(report.profileId)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="h-[70vh] overflow-hidden">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium line-clamp-1 flex-1 min-w-0">
                {selectedReport ? selectedReport.title : t("reports.selectReport")}
              </CardTitle>
              {selectedReport && (
                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyReport}
                        data-testid="button-copy-report"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("reports.copyToClipboard")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDownloadReport}
                        data-testid="button-download-report"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("reports.downloadMarkdown")}</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="h-[calc(70vh-52px)] overflow-auto p-4">
            {selectedReportId == null && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t("reports.selectReportHint")}
                </p>
              </div>
            )}

            {selectedReport && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span>{t("reports.created")} {formatDateTime(selectedReport.createdAt)}</span>
                  {selectedReport.updatedAt && (
                    <>
                      <span>·</span>
                      <span>{t("reports.updated")} {formatDateTime(selectedReport.updatedAt)}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{t("reports.period")} {formatDateTime(selectedReport.periodStart)} ~ {formatDateTime(selectedReport.periodEnd)}</span>
                  {selectedReport.reportStage && (() => {
                    const stageKey = getStageLabelKey(selectedReport.reportStage);
                    const stageClass = getStageClassName(selectedReport.reportStage);
                    return stageKey ? (
                      <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${stageClass}`} data-testid="badge-report-stage">
                        {t(stageKey)}
                      </Badge>
                    ) : null;
                  })()}
                </div>
                <pre 
                  className="whitespace-pre-wrap text-sm leading-6 font-sans"
                  data-testid="text-report-content"
                >
                  {selectedReport.contentText}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
