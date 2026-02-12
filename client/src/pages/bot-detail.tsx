import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";
import { ArrowLeft, Save, Loader2, Brain, Clock, FileText, Filter, Rss, AlertTriangle, Layers, Plus, X, CheckCircle2, XCircle, Timer, SkipForward, Play, Activity, Info } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface JobRunData {
  id: number;
  botId: number;
  botKey: string;
  jobType: string;
  trigger: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  itemsCollected: number | null;
  errorCode: string | null;
  errorMessage: string | null;
}

interface DiagnosticItem {
  rule: string;
  severity: "error" | "warning" | "info";
  messageEn: string;
  messageKo: string;
}

interface DiagnosisData {
  health: "healthy" | "warning" | "error";
  items: DiagnosticItem[];
}

interface BotSettings {
  id: number;
  botId: number;
  timezone: string;
  scheduleRule: string;
  scheduleTimeLocal: string;
  format: string;
  markdownLevel: string;
  verbosity: string;
  sectionsJson: Record<string, boolean>;
  filtersJson: Record<string, number>;
  llmProviderId: number | null;
  modelOverride: string | null;
}

interface LlmProviderSafe {
  id: number;
  name: string;
  providerType: string;
  defaultModel: string | null;
}

interface BotData {
  id: number;
  userId: string;
  key: string;
  name: string;
  isEnabled: boolean;
  createdAt: string;
  settings: BotSettings | null;
}

interface SourceLink {
  id: number;
  name: string;
  url: string;
  topic: string;
  weight: number;
  isEnabled: boolean;
}

const MODEL_HINTS: Record<string, string[]> = {
  anthropic: ["claude-sonnet-4-5-20250929", "claude-3-5-haiku-latest", "claude-3-5-sonnet-latest"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini"],
  google: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  custom: [],
};

const SCHEDULE_TIMES = [
  { value: "06:00", label: "6:00 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "22:00", label: "10:00 PM" },
  { value: "23:00", label: "11:00 PM" },
];

export default function BotDetail() {
  const [, params] = useRoute("/bots/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const botId = params?.id ? parseInt(params.id) : null;

  const [name, setName] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [scheduleRule, setScheduleRule] = useState("DAILY");
  const [scheduleTimeLocal, setScheduleTimeLocal] = useState("21:00");
  const [verbosity, setVerbosity] = useState("normal");
  const [markdownLevel, setMarkdownLevel] = useState("minimal");
  const [sections, setSections] = useState({
    tldr: true, drivers: true, risk: true, checklist: true, sources: true,
  });
  const [minImportanceScore, setMinImportanceScore] = useState(0);
  const [llmProviderId, setLlmProviderId] = useState<string>("");
  const [modelOverride, setModelOverride] = useState("");

  const { data: botResponse, isLoading } = useQuery<{ bot: BotData }>({
    queryKey: ["/api/bots", botId],
    queryFn: () => fetch(`/api/bots/${botId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!botId,
  });

  const { data: settingsResponse } = useQuery<{ settings: BotSettings | null }>({
    queryKey: ["/api/bots", botId, "settings"],
    queryFn: () => fetch(`/api/bots/${botId}/settings`, { credentials: "include" }).then(r => r.json()),
    enabled: !!botId,
  });

  const { data: sourcesResponse } = useQuery<{ links: SourceLink[] }>({
    queryKey: ["/api/bots", botId, "sources"],
    queryFn: () => fetch(`/api/bots/${botId}/sources`, { credentials: "include" }).then(r => r.json()),
    enabled: !!botId,
  });

  const { data: allSourcesResponse } = useQuery<{ id: number; name: string; url: string; topic: string }[]>({
    queryKey: ["/api/sources"],
  });

  const { data: providersResponse } = useQuery<{ providers: LlmProviderSafe[] }>({
    queryKey: ["/api/llm-providers"],
    queryFn: () => fetch("/api/llm-providers", { credentials: "include" }).then(r => r.json()),
  });

  const { data: runsData } = useQuery<JobRunData[]>({
    queryKey: ["/api/bots", botId, "runs"],
    queryFn: () => fetch(`/api/bots/${botId}/runs?limit=50`, { credentials: "include" }).then(r => r.json()),
    enabled: !!botId,
    refetchInterval: 30000,
  });

  const { data: diagnosisData } = useQuery<DiagnosisData>({
    queryKey: ["/api/bots", botId, "diagnosis"],
    queryFn: () => fetch(`/api/bots/${botId}/diagnosis`, { credentials: "include" }).then(r => r.json()),
    enabled: !!botId,
    refetchInterval: 60000,
  });

  const bot = botResponse?.bot;
  const botSettings = settingsResponse?.settings;
  const botSources = sourcesResponse?.links ?? [];
  const allSources = allSourcesResponse ?? [];
  const availableProviders = providersResponse?.providers ?? [];

  const linkedSourceIds = new Set(botSources.map(s => s.id));
  const unlinkedSources = allSources.filter(s => !linkedSourceIds.has(s.id));

  const selectedProvider = availableProviders.find(p => String(p.id) === llmProviderId);
  const providerType = selectedProvider?.providerType || "anthropic";
  const modelHints = MODEL_HINTS[providerType] || [];

  const providerWasDeleted = botSettings?.llmProviderId != null
    && llmProviderId === ""
    && !availableProviders.some(p => p.id === botSettings?.llmProviderId);

  useEffect(() => {
    if (bot) {
      setName(bot.name);
      setIsEnabled(bot.isEnabled);
    }
  }, [bot]);

  useEffect(() => {
    if (botSettings) {
      setTimezone(botSettings.timezone);
      setScheduleRule(botSettings.scheduleRule);
      setScheduleTimeLocal(botSettings.scheduleTimeLocal);
      setVerbosity(botSettings.verbosity);
      setMarkdownLevel(botSettings.markdownLevel);
      if (botSettings.sectionsJson) {
        setSections(prev => ({ ...prev, ...botSettings.sectionsJson }));
      }
      if (botSettings.filtersJson?.minImportanceScore != null) {
        setMinImportanceScore(botSettings.filtersJson.minImportanceScore);
      }
      if (botSettings.llmProviderId) {
        const providerExists = availableProviders.some(p => p.id === botSettings.llmProviderId);
        setLlmProviderId(providerExists ? String(botSettings.llmProviderId) : "");
      } else {
        setLlmProviderId("");
      }
      setModelOverride(botSettings.modelOverride || "");
    }
  }, [botSettings, availableProviders]);

  const addSourceMutation = useMutation({
    mutationFn: async (sourceId: number) => {
      const currentLinks = botSources.map(s => ({ sourceId: s.id, weight: s.weight, isEnabled: s.isEnabled }));
      currentLinks.push({ sourceId, weight: 3, isEnabled: true });
      await apiRequest("PUT", `/api/bots/${botId}/sources`, { links: currentLinks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots", botId, "sources"] });
      toast({ title: t("botDetail.sources.linked") });
    },
    onError: () => {
      toast({ title: t("botDetail.sources.linkFailed"), variant: "destructive" });
    },
  });

  const removeSourceMutation = useMutation({
    mutationFn: async (sourceId: number) => {
      const currentLinks = botSources
        .filter(s => s.id !== sourceId)
        .map(s => ({ sourceId: s.id, weight: s.weight, isEnabled: s.isEnabled }));
      await apiRequest("PUT", `/api/bots/${botId}/sources`, { links: currentLinks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots", botId, "sources"] });
      toast({ title: t("botDetail.sources.removed") });
    },
    onError: () => {
      toast({ title: t("botDetail.sources.removeFailed"), variant: "destructive" });
    },
  });

  const saveBotMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/bots/${botId}`, { name, isEnabled });
      await apiRequest("PUT", `/api/bots/${botId}/settings`, {
        timezone,
        scheduleRule,
        scheduleTimeLocal,
        verbosity,
        markdownLevel,
        sectionsJson: sections,
        filtersJson: { minImportanceScore },
        llmProviderId: llmProviderId ? parseInt(llmProviderId) : null,
        modelOverride: modelOverride || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bots", botId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bots", botId, "settings"] });
      toast({ title: t("botDetail.saved") });
    },
    onError: () => {
      toast({ title: t("botDetail.saveFailed"), variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p className="text-muted-foreground">{t("botDetail.notFound")}</p>
        <Button variant="ghost" onClick={() => setLocation("/bots")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t("botDetail.back")}
        </Button>
      </div>
    );
  }

  const scheduleLabel = botSettings
    ? `${botSettings.scheduleRule === "DAILY" ? t("botDetail.schedule.daily2") : botSettings.scheduleRule === "WEEKDAYS" ? t("botDetail.schedule.weekdays2") : t("botDetail.schedule.weekends2")} ${botSettings.scheduleTimeLocal}`
    : null;
  const formatLabel = botSettings
    ? `${botSettings.markdownLevel === "minimal" ? t("botDetail.format.conversational2") : t("botDetail.format.structured2")} / ${botSettings.verbosity === "short" ? t("botDetail.format.short2") : botSettings.verbosity === "detailed" ? t("botDetail.format.detailed2") : t("botDetail.format.normal2")}`
    : null;

  const sectionLabelMap: Record<string, string> = {
    tldr: t("botDetail.format.section.tldr"),
    drivers: t("botDetail.format.section.drivers"),
    risk: t("botDetail.format.section.risk"),
    checklist: t("botDetail.format.section.checklist"),
    sources: t("botDetail.format.section.sources"),
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/bots")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold" data-testid="text-bot-title">{name || t("botDetail.title")}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" data-testid="badge-bot-topic">{bot.key}</Badge>
            <span className="text-sm text-muted-foreground">
              {isEnabled ? t("botDetail.active") : t("botDetail.paused")}
            </span>
          </div>
        </div>
        <Button onClick={() => saveBotMutation.mutate()} disabled={saveBotMutation.isPending} data-testid="button-save">
          {saveBotMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {t("botDetail.saveChanges")}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card className="border-primary/20" data-testid="card-workflow-summary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              {t("botDetail.workflow.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <Rss className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-muted-foreground">{t("botDetail.workflow.watching")}</span>
                  <span className="ml-1 font-medium" data-testid="text-summary-sources">{t("botDetail.workflow.sources", { count: botSources.length })}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-muted-foreground">{t("botDetail.workflow.schedule")}</span>
                  <span className="ml-1 font-medium" data-testid="text-summary-schedule">{scheduleLabel || t("botDetail.workflow.notSet")}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-muted-foreground">{t("botDetail.workflow.output")}</span>
                  <span className="ml-1 font-medium" data-testid="text-summary-format">{formatLabel || t("botDetail.workflow.notSet")}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border" data-testid="text-summary-hint">
              {t("botDetail.workflow.hint")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("botDetail.general")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bot-name">{t("botDetail.botName")}</Label>
              <Input id="bot-name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-bot-name" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="bot-enabled">{t("botDetail.enabled")}</Label>
              <Switch id="bot-enabled" checked={isEnabled} onCheckedChange={setIsEnabled} data-testid="toggle-bot-enabled" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              {t("botDetail.aiModel.title")}
            </CardTitle>
            <CardDescription>
              {t("botDetail.aiModel.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {providerWasDeleted && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="warning-provider-deleted">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{t("botDetail.aiModel.providerDeleted")}</span>
              </div>
            )}
            <div className="grid gap-2">
              <Label>{t("botDetail.aiModel.provider")}</Label>
              <Select value={llmProviderId} onValueChange={setLlmProviderId}>
                <SelectTrigger data-testid="select-llm-provider">
                  <SelectValue placeholder={t("botDetail.aiModel.providerPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.providerType})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableProviders.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("botDetail.aiModel.noProviders")}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model-override">{t("botDetail.aiModel.modelOverride")} <span className="text-xs text-muted-foreground">{t("botDetail.aiModel.modelOverrideHint")}</span></Label>
              <Input
                id="model-override"
                value={modelOverride}
                onChange={(e) => setModelOverride(e.target.value)}
                placeholder={t("botDetail.aiModel.modelOverridePlaceholder")}
                data-testid="input-model-override"
              />
              {modelHints.length > 0 && (
                <p className="text-xs text-muted-foreground" data-testid="text-model-hints">
                  {t("botDetail.aiModel.availableModels", { type: providerType, models: modelHints.join(", ") })}
                </p>
              )}
              {modelOverride && selectedProvider && !modelHints.includes(modelOverride) && modelHints.length > 0 && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1" data-testid="warning-model-mismatch">
                  <AlertTriangle className="h-3 w-3" />
                  {t("botDetail.aiModel.modelMismatch", { type: providerType })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("botDetail.schedule.title")}
            </CardTitle>
            <CardDescription>{t("botDetail.schedule.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>{t("botDetail.schedule.runDays")}</Label>
              <Select value={scheduleRule} onValueChange={setScheduleRule}>
                <SelectTrigger data-testid="select-schedule-rule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">{t("botDetail.schedule.daily")}</SelectItem>
                  <SelectItem value="WEEKDAYS">{t("botDetail.schedule.weekdays")}</SelectItem>
                  <SelectItem value="WEEKENDS">{t("botDetail.schedule.weekends")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("botDetail.schedule.runTime")}</Label>
              <Select value={scheduleTimeLocal} onValueChange={setScheduleTimeLocal}>
                <SelectTrigger data-testid="select-schedule-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_TIMES.map(st => (
                    <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("botDetail.schedule.timezone")}</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger data-testid="select-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Seoul">Asia/Seoul (KST)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (ET)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (PT)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("botDetail.format.title")}
            </CardTitle>
            <CardDescription>{t("botDetail.format.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>{t("botDetail.format.length")}</Label>
              <Select value={verbosity} onValueChange={setVerbosity}>
                <SelectTrigger data-testid="select-verbosity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">{t("botDetail.format.short")}</SelectItem>
                  <SelectItem value="normal">{t("botDetail.format.normal")}</SelectItem>
                  <SelectItem value="detailed">{t("botDetail.format.detailed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("botDetail.format.style")}</Label>
              <Select value={markdownLevel} onValueChange={setMarkdownLevel}>
                <SelectTrigger data-testid="select-markdown">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">{t("botDetail.format.conversational")}</SelectItem>
                  <SelectItem value="normal">{t("botDetail.format.structured")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="mb-2">{t("botDetail.format.sections")}</Label>
              {Object.entries(sections).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`section-${key}`}
                    checked={value}
                    onCheckedChange={(checked) => setSections(prev => ({ ...prev, [key]: !!checked }))}
                    data-testid={`checkbox-section-${key}`}
                  />
                  <Label htmlFor={`section-${key}`} className="font-normal">
                    {sectionLabelMap[key] || key}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t("botDetail.filters.title")}
            </CardTitle>
            <CardDescription>{t("botDetail.filters.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>{t("botDetail.filters.minImportance", { score: minImportanceScore })}</Label>
              <Slider
                value={[minImportanceScore]}
                onValueChange={([v]) => setMinImportanceScore(v)}
                min={0}
                max={100}
                step={10}
                data-testid="slider-importance"
              />
              <p className="text-xs text-muted-foreground">
                {t("botDetail.filters.hint")}
                {minImportanceScore > 0 && ` ${t("botDetail.filters.filtering", { score: minImportanceScore })}`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rss className="h-5 w-5" />
              {t("botDetail.sources.title", { count: botSources.length })}
            </CardTitle>
            <CardDescription>{t("botDetail.sources.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {botSources.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground" data-testid="text-no-sources">
                <p>{t("botDetail.sources.none")}</p>
                <p className="text-xs mt-1">{t("botDetail.sources.noneHint")}</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {botSources.map((source: SourceLink) => (
                  <div key={source.id} className="flex items-center justify-between gap-2 p-3 rounded-md border" data-testid={`source-link-${source.id}`}>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{source.name}</span>
                      <Badge variant="secondary" className="ml-2">{source.topic}</Badge>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">{t("botDetail.sources.weight", { weight: source.weight })}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeSourceMutation.mutate(source.id)}
                        disabled={removeSourceMutation.isPending}
                        data-testid={`button-unlink-source-${source.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {unlinkedSources.length > 0 && (
              <div className="grid gap-2">
                <p className="text-sm font-medium text-muted-foreground">{t("botDetail.sources.available")}</p>
                {unlinkedSources.map(source => (
                  <div key={source.id} className="flex items-center justify-between gap-2 p-3 rounded-md border border-dashed" data-testid={`available-source-${source.id}`}>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{source.name}</span>
                      <Badge variant="secondary" className="ml-2">{source.topic}</Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addSourceMutation.mutate(source.id)}
                      disabled={addSourceMutation.isPending}
                      data-testid={`button-link-source-${source.id}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t("botDetail.sources.add")}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {unlinkedSources.length === 0 && botSources.length === 0 && (
              <div className="text-center py-2">
                <Button variant="outline" onClick={() => setLocation("/sources")} data-testid="button-go-to-sources">
                  {t("botDetail.sources.goToSources")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {diagnosisData && diagnosisData.items.length > 0 && (
          <Card data-testid="card-bot-diagnosis">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {t("diag.title")}
              </CardTitle>
              <Badge
                variant={diagnosisData.health === "healthy" ? "secondary" : diagnosisData.health === "warning" ? "outline" : "destructive"}
                data-testid="badge-bot-health"
              >
                {diagnosisData.health === "healthy"
                  ? t("diag.healthy")
                  : diagnosisData.health === "warning"
                    ? t("diag.warnings", { count: String(diagnosisData.items.filter(i => i.severity === "warning").length) })
                    : t("diag.errors", { count: String(diagnosisData.items.filter(i => i.severity === "error").length) })}
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-2">
              {diagnosisData.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-md border" data-testid={`diag-item-${item.rule}`}>
                  {item.severity === "error" && <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
                  {item.severity === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />}
                  {item.severity === "info" && <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                  <span className="text-sm">{language === "ko" ? item.messageKo : item.messageEn}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-execution-history">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("runs.title")}
            </CardTitle>
            {runsData && runsData.length > 0 && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-view-all-runs">
                    {t("runs.viewAll")}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>{t("runs.title")}</SheetTitle>
                  </SheetHeader>
                  <div className="grid gap-3 mt-4">
                    {runsData.map(run => (
                      <RunRow key={run.id} run={run} t={t} language={language} />
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </CardHeader>
          <CardContent>
            {!runsData || runsData.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-runs-empty">{t("runs.empty")}</p>
            ) : (
              <div className="grid gap-2">
                {runsData.slice(0, 5).map(run => (
                  <RunRow key={run.id} run={run} t={t} language={language} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RunStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "ok": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "error": return <XCircle className="h-4 w-4 text-destructive" />;
    case "timeout": return <Timer className="h-4 w-4 text-yellow-500" />;
    case "skipped": return <SkipForward className="h-4 w-4 text-muted-foreground" />;
    case "started": return <Play className="h-4 w-4 text-blue-500" />;
    default: return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "-";
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

function RunRow({ run, t, language }: { run: JobRunData; t: (key: string) => string; language: string }) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md border" data-testid={`run-row-${run.id}`}>
      <div className="flex items-center gap-2 min-w-0">
        <RunStatusIcon status={run.status} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary">{t(`runs.jobType.${run.jobType}`) || run.jobType}</Badge>
            <span className="text-xs text-muted-foreground">{t(`runs.trigger.${run.trigger}`) || run.trigger}</span>
          </div>
          {run.status === "error" && run.errorMessage && (
            <p className="text-xs text-destructive mt-0.5 truncate">{run.errorMessage}</p>
          )}
          {run.status === "skipped" && run.errorCode && (
            <p className="text-xs text-muted-foreground mt-0.5">{run.errorCode}</p>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground">{formatTimeAgo(run.startedAt, language)}</p>
        {run.durationMs != null && run.durationMs > 0 && (
          <p className="text-xs text-muted-foreground">{formatDuration(run.durationMs)}</p>
        )}
      </div>
    </div>
  );
}
