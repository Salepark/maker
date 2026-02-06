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
import { ArrowLeft, Save, Loader2, Brain } from "lucide-react";

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

export default function BotDetail() {
  const [, params] = useRoute("/bots/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const botId = params?.id ? parseInt(params.id) : null;

  const [name, setName] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [scheduleRule, setScheduleRule] = useState("DAILY");
  const [scheduleTimeLocal, setScheduleTimeLocal] = useState("07:00");
  const [verbosity, setVerbosity] = useState("normal");
  const [markdownLevel, setMarkdownLevel] = useState("minimal");
  const [sections, setSections] = useState({
    tldr: true, drivers: true, risk: true, checklist: true, sources: true,
  });
  const [minImportanceScore, setMinImportanceScore] = useState(0);
  const [llmProviderId, setLlmProviderId] = useState<string>("system");
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

  const { data: providersResponse } = useQuery<{ providers: LlmProviderSafe[] }>({
    queryKey: ["/api/llm-providers"],
    queryFn: () => fetch("/api/llm-providers", { credentials: "include" }).then(r => r.json()),
  });

  const bot = botResponse?.bot;
  const botSettings = settingsResponse?.settings;
  const botSources = sourcesResponse?.links ?? [];
  const availableProviders = providersResponse?.providers ?? [];

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
      setLlmProviderId(botSettings.llmProviderId ? String(botSettings.llmProviderId) : "system");
      setModelOverride(botSettings.modelOverride || "");
    }
  }, [botSettings]);

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
        llmProviderId: llmProviderId === "system" ? null : parseInt(llmProviderId),
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
        <Button variant="ghost" onClick={() => setLocation("/profiles")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Bots
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/profiles")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-bot-title">Bot Settings</h1>
          <p className="text-muted-foreground">{bot.key}</p>
        </div>
        <Button onClick={() => saveBotMutation.mutate()} disabled={saveBotMutation.isPending} data-testid="button-save">
          {saveBotMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bot-name">Bot Name</Label>
              <Input id="bot-name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-bot-name" />
            </div>
            <div className="flex items-center justify-between">
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
            <div className="grid gap-2">
              <Label>LLM Provider</Label>
              <Select value={llmProviderId} onValueChange={setLlmProviderId}>
                <SelectTrigger data-testid="select-llm-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System Default (Anthropic Claude)</SelectItem>
                  {availableProviders.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.providerType})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableProviders.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No custom providers yet. Add one in Settings to use your own API keys.
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Run Days</Label>
              <Select value={scheduleRule} onValueChange={setScheduleRule} data-testid="select-schedule-rule">
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
              <Select value={scheduleTimeLocal} onValueChange={setScheduleTimeLocal} data-testid="select-schedule-time">
                <SelectTrigger data-testid="select-schedule-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="07:00">7:00 AM</SelectItem>
                  <SelectItem value="08:00">8:00 AM</SelectItem>
                  <SelectItem value="09:00">9:00 AM</SelectItem>
                  <SelectItem value="18:00">6:00 PM</SelectItem>
                  <SelectItem value="22:00">10:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone} data-testid="select-timezone">
                <SelectTrigger data-testid="select-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Seoul">Asia/Seoul (KST)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Format</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Report Length</Label>
              <Select value={verbosity} onValueChange={setVerbosity} data-testid="select-verbosity">
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
              <Label>Markdown Style</Label>
              <Select value={markdownLevel} onValueChange={setMarkdownLevel} data-testid="select-markdown">
                <SelectTrigger data-testid="select-markdown">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal (Less formatting)</SelectItem>
                  <SelectItem value="normal">Normal (Standard formatting)</SelectItem>
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
                     key === "drivers" ? "Market Drivers" :
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
            <CardTitle>Filters</CardTitle>
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
            </div>
          </CardContent>
        </Card>

        {botSources.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Linked Sources ({botSources.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {botSources.map((source: any) => (
                  <div key={source.id} className="flex items-center justify-between p-2 rounded-md border">
                    <div>
                      <span className="font-medium">{source.name}</span>
                      <span className="text-muted-foreground text-sm ml-2">weight: {source.weight}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{source.isEnabled ? "Active" : "Disabled"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
