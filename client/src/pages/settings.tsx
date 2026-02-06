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
import { Settings as SettingsIcon, Play, Pause, RefreshCw, Zap, Clock, Plus, Trash2, Key, Loader2, Pencil } from "lucide-react";

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
      toast({ title: `Scheduler ${action === "start" ? "started" : "stopped"}` });
    },
    onError: () => {
      toast({ title: "Failed to toggle scheduler", variant: "destructive" });
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
      toast({ title: `${job.charAt(0).toUpperCase() + job.slice(1)} job started` });
    },
    onError: () => {
      toast({ title: "Failed to run job", variant: "destructive" });
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
      toast({ title: "LLM Provider added" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to add provider", variant: "destructive" });
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
      toast({ title: "LLM Provider updated" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update provider", variant: "destructive" });
    },
  });

  const deleteProviderMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/llm-providers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/llm-providers"] });
      toast({ title: "LLM Provider deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete provider", variant: "destructive" });
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
        <h1 className="text-2xl font-bold" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground">Configure scheduler, LLM providers, and bot settings</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5" />
                LLM Providers
              </CardTitle>
              <CardDescription className="mt-1">
                Connect your own AI provider API keys
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => { resetForm(); setShowAddProvider(true); }}
              data-testid="button-add-provider"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Provider
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddProvider && (
            <div className="p-4 rounded-md border space-y-4" data-testid="form-add-provider">
              <div className="grid gap-2">
                <Label htmlFor="provider-name">Name</Label>
                <Input
                  id="provider-name"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="e.g. My Anthropic Key"
                  data-testid="input-provider-name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Provider Type</Label>
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
                  API Key {editingProvider && <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>}
                </Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={editingProvider ? "Enter new key or leave blank" : "sk-..."}
                  data-testid="input-api-key"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="base-url">Base URL <span className="text-muted-foreground text-xs">(optional, for custom endpoints)</span></Label>
                <Input
                  id="base-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                  data-testid="input-base-url"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="default-model">Default Model <span className="text-muted-foreground text-xs">(optional)</span></Label>
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
                  {editingProvider ? "Update" : "Save"}
                </Button>
                <Button variant="outline" onClick={resetForm} data-testid="button-cancel-provider">
                  Cancel
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
              No LLM providers configured. Add one to start using AI features with your bots.
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Scheduler Status
              </CardTitle>
              <CardDescription className="mt-1">
                Automated content collection and analysis
              </CardDescription>
            </div>
            {isLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <div className="flex items-center gap-3">
                <Badge variant={status?.isRunning ? "default" : "secondary"}>
                  {status?.isRunning ? "Running" : "Stopped"}
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
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      Start
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
                  <h3 className="font-medium text-sm">RSS Collection</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Interval: {status?.collectInterval || "10 minutes"}
                    {status?.lastCollect && (
                      <span className="ml-2">Last: {status.lastCollect}</span>
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
                  Run Now
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4 p-4 rounded-md border flex-wrap">
                <div>
                  <h3 className="font-medium text-sm">Content Analysis</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Interval: {status?.analyzeInterval || "5 minutes"}
                    {status?.lastAnalyze && (
                      <span className="ml-2">Last: {status.lastAnalyze}</span>
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
                  Run Now
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4 p-4 rounded-md border flex-wrap">
                <div>
                  <h3 className="font-medium text-sm">Draft Generation</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Interval: {status?.draftInterval || "5 minutes"}
                    {status?.lastDraft && (
                      <span className="ml-2">Last: {status.lastDraft}</span>
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
                  Run Now
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
