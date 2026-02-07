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
import { ArrowLeft, Save, Loader2, Brain, Clock, FileText, Filter, Rss, AlertTriangle, Layers, Plus, X } from "lucide-react";

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
      toast({ title: "Source linked to bot" });
    },
    onError: () => {
      toast({ title: "Failed to link source", variant: "destructive" });
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
      toast({ title: "Source removed from bot" });
    },
    onError: () => {
      toast({ title: "Failed to remove source", variant: "destructive" });
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
      toast({ title: "Bot settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
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
        <p className="text-muted-foreground">Bot not found</p>
        <Button variant="ghost" onClick={() => setLocation("/bots")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Bots
        </Button>
      </div>
    );
  }

  const scheduleLabel = botSettings
    ? `${botSettings.scheduleRule === "DAILY" ? "Daily" : botSettings.scheduleRule === "WEEKDAYS" ? "Weekdays" : "Weekends"} ${botSettings.scheduleTimeLocal}`
    : null;
  const formatLabel = botSettings
    ? `${botSettings.markdownLevel === "minimal" ? "Conversational" : "Structured"} / ${botSettings.verbosity === "short" ? "Short" : botSettings.verbosity === "detailed" ? "Detailed" : "Normal"}`
    : null;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/bots")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold" data-testid="text-bot-title">{name || "Bot Settings"}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" data-testid="badge-bot-topic">{bot.key}</Badge>
            <span className="text-sm text-muted-foreground">
              {isEnabled ? "Active" : "Paused"}
            </span>
          </div>
        </div>
        <Button onClick={() => saveBotMutation.mutate()} disabled={saveBotMutation.isPending} data-testid="button-save">
          {saveBotMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6">
        <Card className="border-primary/20" data-testid="card-workflow-summary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              This Bot's Workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <Rss className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-muted-foreground">Watching:</span>
                  <span className="ml-1 font-medium" data-testid="text-summary-sources">{botSources.length} sources</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-muted-foreground">Schedule:</span>
                  <span className="ml-1 font-medium" data-testid="text-summary-schedule">{scheduleLabel || "Not set"}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-muted-foreground">Output:</span>
                  <span className="ml-1 font-medium" data-testid="text-summary-format">{formatLabel || "Not set"}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border" data-testid="text-summary-hint">
              You can change these settings anytime to fit your purpose.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bot-name">Bot Name</Label>
              <Input id="bot-name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-bot-name" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="bot-enabled">Enabled</Label>
              <Switch id="bot-enabled" checked={isEnabled} onCheckedChange={setIsEnabled} data-testid="toggle-bot-enabled" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Model
            </CardTitle>
            <CardDescription>
              Choose which AI provider this bot uses for analysis and reports
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {providerWasDeleted && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="warning-provider-deleted">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>The previously assigned provider was deleted. This bot has been reset to System Default. Save to confirm.</span>
              </div>
            )}
            <div className="grid gap-2">
              <Label>LLM Provider</Label>
              <Select value={llmProviderId} onValueChange={setLlmProviderId}>
                <SelectTrigger data-testid="select-llm-provider">
                  <SelectValue placeholder="Select your AI provider" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.providerType})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableProviders.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No AI providers yet. Go to Settings to add your own API key first.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model-override">Model Override <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                id="model-override"
                value={modelOverride}
                onChange={(e) => setModelOverride(e.target.value)}
                placeholder="Leave blank to use provider's default"
                data-testid="input-model-override"
              />
              {modelHints.length > 0 && (
                <p className="text-xs text-muted-foreground" data-testid="text-model-hints">
                  Available for {providerType}: {modelHints.join(", ")}
                </p>
              )}
              {modelOverride && selectedProvider && !modelHints.includes(modelOverride) && modelHints.length > 0 && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1" data-testid="warning-model-mismatch">
                  <AlertTriangle className="h-3 w-3" />
                  This model name is not in the known list for {providerType}. Make sure it's correct.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule
            </CardTitle>
            <CardDescription>When this bot generates reports</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Run Days</Label>
              <Select value={scheduleRule} onValueChange={setScheduleRule}>
                <SelectTrigger data-testid="select-schedule-rule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Every Day</SelectItem>
                  <SelectItem value="WEEKDAYS">Weekdays Only (Mon-Fri)</SelectItem>
                  <SelectItem value="WEEKENDS">Weekends Only (Sat-Sun)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Run Time</Label>
              <Select value={scheduleTimeLocal} onValueChange={setScheduleTimeLocal}>
                <SelectTrigger data-testid="select-schedule-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_TIMES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Timezone</Label>
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
              Report Format
            </CardTitle>
            <CardDescription>Control how reports are written</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Report Length</Label>
              <Select value={verbosity} onValueChange={setVerbosity}>
                <SelectTrigger data-testid="select-verbosity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (Brief summary)</SelectItem>
                  <SelectItem value="normal">Normal (Standard detail)</SelectItem>
                  <SelectItem value="detailed">Detailed (Full analysis)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Writing Style</Label>
              <Select value={markdownLevel} onValueChange={setMarkdownLevel}>
                <SelectTrigger data-testid="select-markdown">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Conversational (News anchor tone, minimal symbols)</SelectItem>
                  <SelectItem value="normal">Structured (Markdown headers and formatting)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="mb-2">Report Sections</Label>
              {Object.entries(sections).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`section-${key}`}
                    checked={value}
                    onCheckedChange={(checked) => setSections(prev => ({ ...prev, [key]: !!checked }))}
                    data-testid={`checkbox-section-${key}`}
                  />
                  <Label htmlFor={`section-${key}`} className="font-normal">
                    {key === "tldr" ? "TL;DR Summary" :
                     key === "drivers" ? "Market Drivers / Key Trends" :
                     key === "risk" ? "Risk Radar" :
                     key === "checklist" ? "Action Checklist" :
                     "Source References"}
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
              Filters
            </CardTitle>
            <CardDescription>Control which content gets included</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Minimum Importance Score: {minImportanceScore}</Label>
              <Slider
                value={[minImportanceScore]}
                onValueChange={([v]) => setMinImportanceScore(v)}
                min={0}
                max={100}
                step={10}
                data-testid="slider-importance"
              />
              <p className="text-xs text-muted-foreground">
                Items scoring below this threshold will be excluded from reports.
                {minImportanceScore > 0 && ` Currently filtering out items below ${minImportanceScore}/100.`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rss className="h-5 w-5" />
              Linked Sources ({botSources.length})
            </CardTitle>
            <CardDescription>Sources feeding data to this bot</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {botSources.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground" data-testid="text-no-sources">
                <p>No sources linked yet.</p>
                <p className="text-xs mt-1">Add sources below to start collecting data for this bot.</p>
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
                      <span className="text-xs text-muted-foreground">weight: {source.weight}</span>
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
                <p className="text-sm font-medium text-muted-foreground">Available Sources</p>
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
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {unlinkedSources.length === 0 && botSources.length === 0 && (
              <div className="text-center py-2">
                <Button variant="outline" onClick={() => setLocation("/sources")} data-testid="button-go-to-sources">
                  Go to Sources Page
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
