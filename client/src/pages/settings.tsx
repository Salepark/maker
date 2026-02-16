import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/language-provider";
import { Settings as SettingsIcon, Play, Pause, RefreshCw, Zap, Clock, Plus, Trash2, Key, Loader2, Pencil, MessageCircle, Copy, Unlink, ExternalLink, Check } from "lucide-react";

interface SchedulerStatus {
  isRunning: boolean;
  collectInterval: string;
  analyzeInterval: string;
  draftInterval: string;
  lastCollect?: string;
  lastAnalyze?: string;
  lastDraft?: string;
}

interface LlmProviderSafe {
  id: number;
  userId: string;
  name: string;
  providerType: string;
  baseUrl: string | null;
  defaultModel: string | null;
  apiKeyHint: string;
  createdAt: string;
}

export default function Settings() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LlmProviderSafe | null>(null);
  const [providerName, setProviderName] = useState("");
  const [providerType, setProviderType] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [defaultModel, setDefaultModel] = useState("");

  const { data: status, isLoading } = useQuery<SchedulerStatus>({
    queryKey: ["/api/scheduler/status"],
  });

  const { data: providersResponse, isLoading: providersLoading } = useQuery<{ providers: LlmProviderSafe[] }>({
    queryKey: ["/api/llm-providers"],
    queryFn: () => fetch("/api/llm-providers", { credentials: "include" }).then(r => r.json()),
  });

  const providers = providersResponse?.providers ?? [];

  const toggleSchedulerMutation = useMutation({
    mutationFn: async (action: "start" | "stop") => {
      return apiRequest("POST", `/api/scheduler/${action}`);
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduler/status"] });
      toast({ title: action === "start" ? t("settings.scheduler.started") : t("settings.scheduler.stoppedMsg") });
    },
    onError: () => {
      toast({ title: t("settings.scheduler.toggleFailed"), variant: "destructive" });
    },
  });

  const runJobMutation = useMutation({
    mutationFn: async (job: "collect" | "analyze" | "draft") => {
      return apiRequest("POST", `/api/scheduler/run/${job}`);
    },
    onSuccess: (_, job) => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduler/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: t("settings.scheduler.jobStarted", { job: job.charAt(0).toUpperCase() + job.slice(1) }) });
    },
    onError: () => {
      toast({ title: t("settings.scheduler.jobFailed"), variant: "destructive" });
    },
  });

  const createProviderMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/llm-providers", {
        name: providerName,
        providerType,
        apiKey,
        baseUrl: baseUrl || undefined,
        defaultModel: defaultModel || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/llm-providers"] });
      toast({ title: t("settings.providers.added") });
      resetForm();
    },
    onError: (err: any) => {
      const detail = err?.message || "";
      const serverMsg = detail.includes(":") ? detail.split(": ").slice(1).join(": ") : "";
      toast({ title: t("settings.providers.addFailed"), description: serverMsg || undefined, variant: "destructive" });
    },
  });

  const updateProviderMutation = useMutation({
    mutationFn: async () => {
      if (!editingProvider) return;
      const body: Record<string, any> = {
        name: providerName,
        providerType,
        baseUrl: baseUrl || null,
        defaultModel: defaultModel || null,
      };
      if (apiKey) body.apiKey = apiKey;
      return apiRequest("PUT", `/api/llm-providers/${editingProvider.id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/llm-providers"] });
      toast({ title: t("settings.providers.updated") });
      resetForm();
    },
    onError: () => {
      toast({ title: t("settings.providers.updateFailed"), variant: "destructive" });
    },
  });

  const deleteProviderMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/llm-providers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/llm-providers"] });
      toast({ title: t("settings.providers.deleted") });
    },
    onError: () => {
      toast({ title: t("settings.providers.deleteFailed"), variant: "destructive" });
    },
  });

  function resetForm() {
    setShowAddProvider(false);
    setEditingProvider(null);
    setProviderName("");
    setProviderType("anthropic");
    setApiKey("");
    setBaseUrl("");
    setDefaultModel("");
  }

  function TelegramCard() {
    const [linkCode, setLinkCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const { data: tgStatus, isLoading: tgLoading } = useQuery<{
      linked: boolean;
      telegramUsername: string | null;
      linkedAt: string | null;
      botConfigured: boolean;
    }>({
      queryKey: ["/api/telegram/status"],
    });

    const generateCodeMutation = useMutation({
      mutationFn: () => apiRequest("POST", "/api/telegram/link-code").then((r: any) => r.json()),
      onSuccess: (data: any) => {
        setLinkCode(data.code);
      },
      onError: () => {
        toast({ title: t("settings.telegram.codeFailed"), variant: "destructive" });
      },
    });

    const unlinkMutation = useMutation({
      mutationFn: () => apiRequest("DELETE", "/api/telegram/unlink"),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/telegram/status"] });
        toast({ title: t("settings.telegram.unlinked") });
      },
    });

    const copyCode = () => {
      if (linkCode) {
        navigator.clipboard.writeText(`/link ${linkCode}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    return (
      <Card data-testid="card-telegram-settings">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t("settings.telegram.title")}
          </CardTitle>
          <CardDescription>{t("settings.telegram.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tgLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !tgStatus?.botConfigured ? (
            <div className="space-y-3">
              <div className="p-4 rounded-md border">
                <p className="text-sm text-muted-foreground">{t("settings.telegram.notConfigured")}</p>
              </div>
              <div className="p-4 rounded-md border space-y-2">
                <h3 className="font-medium text-sm">{t("settings.telegram.setupGuideTitle")}</h3>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>{t("settings.telegram.setupGuide1")}</p>
                  <p>{t("settings.telegram.setupGuide2")}</p>
                  <p>{t("settings.telegram.setupGuide3")}</p>
                  <p>{t("settings.telegram.setupGuide4")}</p>
                  <p>{t("settings.telegram.setupGuide5")}</p>
                </div>
              </div>
            </div>
          ) : tgStatus?.linked ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 p-4 rounded-md border flex-wrap">
                <div>
                  <h3 className="font-medium text-sm">{t("settings.telegram.linked")}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tgStatus.telegramUsername && `@${tgStatus.telegramUsername}`}
                    {tgStatus.linkedAt && ` · ${new Date(tgStatus.linkedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => unlinkMutation.mutate()}
                  disabled={unlinkMutation.isPending}
                  data-testid="button-unlink-telegram"
                >
                  <Unlink className="h-4 w-4 mr-1" />
                  {t("settings.telegram.unlink")}
                </Button>
              </div>
              <div className="p-4 rounded-md border space-y-2" data-testid="telegram-commands-guide">
                <h3 className="font-medium text-sm">{t("settings.telegram.commands")}</h3>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><code className="bg-muted px-1 rounded">{t("settings.telegram.cmdStart")}</code></p>
                  <p><code className="bg-muted px-1 rounded">{t("settings.telegram.cmdHelp")}</code></p>
                  <p><code className="bg-muted px-1 rounded">{t("settings.telegram.cmdUnlink")}</code></p>
                  <p className="pt-1">{t("settings.telegram.cmdNatural")}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-md border space-y-3">
                <h3 className="font-medium text-sm">{t("settings.telegram.howToLink")}</h3>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>{t("settings.telegram.step1")}</li>
                  <li>{t("settings.telegram.step2")}</li>
                  <li>{t("settings.telegram.step3")}</li>
                </ol>

                {linkCode ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 rounded-md bg-muted text-sm font-mono" data-testid="text-link-code">
                      /link {linkCode}
                    </code>
                    <Button size="sm" variant="outline" onClick={copyCode} data-testid="button-copy-link-code">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => generateCodeMutation.mutate()}
                    disabled={generateCodeMutation.isPending}
                    data-testid="button-generate-link-code"
                  >
                    {generateCodeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Key className="h-4 w-4 mr-1" />
                    )}
                    {t("settings.telegram.generateCode")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function startEdit(provider: LlmProviderSafe) {
    setEditingProvider(provider);
    setShowAddProvider(true);
    setProviderName(provider.name);
    setProviderType(provider.providerType);
    setApiKey("");
    setBaseUrl(provider.baseUrl || "");
    setDefaultModel(provider.defaultModel || "");
  }

  const providerTypeLabels: Record<string, string> = {
    anthropic: "Anthropic",
    openai: "OpenAI",
    google: "Google AI",
    custom: "Custom",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-settings-title">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t("settings.providers.title")}
              </CardTitle>
              <CardDescription className="mt-1">
                {t("settings.providers.subtitle")}
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => { resetForm(); setShowAddProvider(true); }}
              data-testid="button-add-provider"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("settings.providers.addButton")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddProvider && (
            <div className="p-4 rounded-md border space-y-4" data-testid="form-add-provider">
              <div className="grid gap-2">
                <Label htmlFor="provider-name">{t("settings.providers.name")}</Label>
                <Input
                  id="provider-name"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder={t("settings.providers.namePlaceholder")}
                  data-testid="input-provider-name"
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("settings.providers.type")}</Label>
                <Select value={providerType} onValueChange={setProviderType}>
                  <SelectTrigger data-testid="select-provider-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                    <SelectItem value="google">Google AI (Gemini)</SelectItem>
                    <SelectItem value="custom">Custom (OpenAI-compatible)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="api-key">
                  {t("settings.providers.apiKey")} {editingProvider && <span className="text-muted-foreground text-xs">{t("settings.providers.apiKeyKeep")}</span>}
                </Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={editingProvider ? t("settings.providers.apiKeyEditPlaceholder") : t("settings.providers.apiKeyPlaceholder")}
                  data-testid="input-api-key"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="base-url">{t("settings.providers.baseUrl")} <span className="text-muted-foreground text-xs">{t("settings.providers.baseUrlHint")}</span></Label>
                <Input
                  id="base-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                  data-testid="input-base-url"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="default-model">{t("settings.providers.defaultModel")} <span className="text-muted-foreground text-xs">{t("settings.providers.defaultModelHint")}</span></Label>
                <Input
                  id="default-model"
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  placeholder="e.g. claude-sonnet-4-5-20250929"
                  data-testid="input-default-model"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => editingProvider ? updateProviderMutation.mutate() : createProviderMutation.mutate()}
                  disabled={!providerName || (!apiKey && !editingProvider) || createProviderMutation.isPending || updateProviderMutation.isPending}
                  data-testid="button-save-provider"
                >
                  {(createProviderMutation.isPending || updateProviderMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {editingProvider ? t("settings.providers.update") : t("settings.providers.save")}
                </Button>
                <Button variant="outline" onClick={resetForm} data-testid="button-cancel-provider">
                  {t("settings.providers.cancel")}
                </Button>
              </div>
            </div>
          )}

          {providersLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : providers.length === 0 && !showAddProvider ? (
            <p className="text-sm text-muted-foreground py-4" data-testid="text-no-providers">
              {t("settings.providers.noProviders")}
            </p>
          ) : (
            providers.map((provider) => (
              <div key={provider.id} className="flex items-center justify-between gap-4 p-3 rounded-md border" data-testid={`provider-card-${provider.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm" data-testid={`text-provider-name-${provider.id}`}>{provider.name}</span>
                    <Badge variant="secondary" className="text-xs">{providerTypeLabels[provider.providerType] || provider.providerType}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {provider.defaultModel && <span>Model: {provider.defaultModel}</span>}
                    {provider.baseUrl && <span className="ml-2">URL: {provider.baseUrl}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => startEdit(provider)}
                    data-testid={`button-edit-provider-${provider.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteProviderMutation.mutate(provider.id)}
                    disabled={deleteProviderMutation.isPending}
                    data-testid={`button-delete-provider-${provider.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <TelegramCard />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("settings.scheduler.title")}
              </CardTitle>
              <CardDescription className="mt-1">
                {t("settings.scheduler.subtitle")}
              </CardDescription>
            </div>
            {isLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <div className="flex items-center gap-3">
                <Badge variant={status?.isRunning ? "default" : "secondary"}>
                  {status?.isRunning ? t("settings.scheduler.running") : t("settings.scheduler.stopped")}
                </Badge>
                <Button
                  variant={status?.isRunning ? "outline" : "default"}
                  size="sm"
                  onClick={() => toggleSchedulerMutation.mutate(status?.isRunning ? "stop" : "start")}
                  disabled={toggleSchedulerMutation.isPending}
                  data-testid="button-toggle-scheduler"
                >
                  {status?.isRunning ? (
                    <>
                      <Pause className="h-4 w-4 mr-1" />
                      {t("settings.scheduler.stop")}
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      {t("settings.scheduler.start")}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 p-4 rounded-md border flex-wrap">
                <div>
                  <h3 className="font-medium text-sm">{t("settings.scheduler.rssCollection")}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("settings.scheduler.interval")} {status?.collectInterval || "10 minutes"}
                    {status?.lastCollect && (
                      <span className="ml-2">{t("settings.scheduler.last")} {status.lastCollect}</span>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runJobMutation.mutate("collect")}
                  disabled={runJobMutation.isPending}
                  data-testid="button-run-collect"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {t("settings.scheduler.runNow")}
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4 p-4 rounded-md border flex-wrap">
                <div>
                  <h3 className="font-medium text-sm">{t("settings.scheduler.contentAnalysis")}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("settings.scheduler.interval")} {status?.analyzeInterval || "5 minutes"}
                    {status?.lastAnalyze && (
                      <span className="ml-2">{t("settings.scheduler.last")} {status.lastAnalyze}</span>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runJobMutation.mutate("analyze")}
                  disabled={runJobMutation.isPending}
                  data-testid="button-run-analyze"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  {t("settings.scheduler.runNow")}
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4 p-4 rounded-md border flex-wrap">
                <div>
                  <h3 className="font-medium text-sm">{t("settings.scheduler.draftGeneration")}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("settings.scheduler.interval")} {status?.draftInterval || "5 minutes"}
                    {status?.lastDraft && (
                      <span className="ml-2">{t("settings.scheduler.last")} {status.lastDraft}</span>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runJobMutation.mutate("draft")}
                  disabled={runJobMutation.isPending}
                  data-testid="button-run-draft"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  {t("settings.scheduler.runNow")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
