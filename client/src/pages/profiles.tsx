import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";
import { Plus, Bot as BotIcon, Trash2, Settings, Loader2, Newspaper, Eye, Scale, GraduationCap, ShoppingBag, MessageSquare, TrendingUp, Users, Sparkles, ArrowLeft, Rss, Clock, FileText, ChevronRight, Link2, Search, Briefcase, BookOpen, Building2, PenTool, Laptop, Store, ShoppingCart, Globe } from "lucide-react";

interface SuggestedSource {
  name: string;
  url: string;
  type?: string;
  topic: string;
}

interface PresetConfig {
  timezone?: string;
  scheduleRule?: string;
  scheduleTimeLocal?: string;
  markdownLevel?: string;
  verbosity?: string;
  sections?: Record<string, boolean>;
  filters?: Record<string, number>;
  suggestedSources?: SuggestedSource[];
  requireHumanApproval?: boolean;
  promotionLevel?: string;
  linkPolicy?: string;
  sourceDisclaimer?: string;
}

interface Preset {
  id: number;
  key: string;
  name: string;
  outputType: string;
  description: string | null;
  variantsJson: string[];
  defaultConfigJson: PresetConfig;
  icon: string | null;
  category: string | null;
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

const iconMap: Record<string, typeof Newspaper> = {
  Newspaper, Eye, Scale, GraduationCap, ShoppingBag, MessageSquare, TrendingUp, Users, Search, Briefcase, BookOpen, Building2, PenTool, Laptop, Store, ShoppingCart, Globe,
};

const topicColors: Record<string, string> = {
  investing: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ai_art: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  tech: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  crypto: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  creative: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  community_research: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  market_brief: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  research_watch: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  competitor_watch: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  content_research: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  work_productivity: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  online_business: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  korea_marketplace: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  website_promotion: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

const outputTypeColors: Record<string, string> = {
  report: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  alert: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function Profiles() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<"preset" | "topic" | "configure">("preset");
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [botName, setBotName] = useState("");
  const [selectedSourceUrls, setSelectedSourceUrls] = useState<Set<string>>(new Set());
  const [customSources, setCustomSources] = useState<SuggestedSource[]>([]);
  const [customSourceUrl, setCustomSourceUrl] = useState("");
  const [customSourceName, setCustomSourceName] = useState("");
  const [customTopicInput, setCustomTopicInput] = useState("");

  const { data: botsResponse, isLoading: botsLoading } = useQuery<{ bots: BotData[] }>({
    queryKey: ["/api/bots"],
  });
  const botsList = botsResponse?.bots ?? [];

  const { data: presets = [], isLoading: presetsLoading } = useQuery<Preset[]>({
    queryKey: ["/api/presets"],
  });

  const createFromPresetMutation = useMutation({
    mutationFn: async (data: { presetId: number; name: string; topic: string; selectedSourceUrls: string[]; customSources?: SuggestedSource[] }) => {
      return apiRequest("POST", "/api/bots/from-preset", data);
    },
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      const data = await response.json();
      toast({ title: t("profiles.botCreated") });
      resetWizard();
      if (data?.bot?.id) {
        setLocation(`/bots/${data.bot.id}`);
      }
    },
    onError: (error: any) => {
      let msg = t("profiles.botCreateFailed");
      try {
        const errStr = error?.message || "";
        const jsonStart = errStr.indexOf("{");
        if (jsonStart >= 0) {
          const parsed = JSON.parse(errStr.slice(jsonStart));
          msg = parsed?.error || msg;
        }
      } catch {}
      toast({ title: msg, variant: "destructive" });
    },
  });

  const toggleBotMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: number; isEnabled: boolean }) => {
      return apiRequest("PATCH", `/api/bots/${id}`, { isEnabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
    },
  });

  const deleteBotMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/bots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      toast({ title: t("profiles.botDeleted") });
    },
  });

  const resetWizard = () => {
    setWizardOpen(false);
    setWizardStep("preset");
    setSelectedPreset(null);
    setSelectedTopic("");
    setBotName("");
    setSelectedSourceUrls(new Set());
    setCustomSources([]);
    setCustomSourceUrl("");
    setCustomSourceName("");
    setCustomTopicInput("");
  };

  const pickDefaultSources = (allSources: SuggestedSource[], topic: string): Set<string> => {
    const topicSources = allSources.filter(s => s.topic === topic);
    return new Set(topicSources.map(s => s.url));
  };

  const addCustomSource = () => {
    const url = customSourceUrl.trim();
    if (!url) return;
    if (selectedSourceUrls.has(url) || customSources.some(s => s.url === url)) {
      toast({ title: t("profiles.urlAlreadyAdded"), variant: "destructive" });
      return;
    }
    try {
      new URL(url);
    } catch {
      toast({ title: t("profiles.invalidUrl"), variant: "destructive" });
      return;
    }
    const name = customSourceName.trim() || new URL(url).hostname;
    const newSource: SuggestedSource = { name, url, topic: selectedTopic };
    setCustomSources(prev => [...prev, newSource]);
    setSelectedSourceUrls(prev => new Set([...Array.from(prev), url]));
    setCustomSourceUrl("");
    setCustomSourceName("");
  };

  const handlePresetSelect = (preset: Preset) => {
    setSelectedPreset(preset);
    const variants = preset.variantsJson || [];
    if (variants.length === 1) {
      setSelectedTopic(variants[0]);
      setBotName(`My ${preset.name}`);
      const suggestedSources = preset.defaultConfigJson?.suggestedSources || [];
      setSelectedSourceUrls(pickDefaultSources(suggestedSources, variants[0]));
      setWizardStep("configure");
    } else if (variants.length > 1) {
      setWizardStep("topic");
    } else {
      setSelectedTopic("general");
      setBotName(`My ${preset.name}`);
      setSelectedSourceUrls(new Set());
      setWizardStep("configure");
    }
  };

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    setBotName(`My ${selectedPreset?.name} - ${topic}`);
    const suggestedSources = selectedPreset?.defaultConfigJson?.suggestedSources || [];
    setSelectedSourceUrls(pickDefaultSources(suggestedSources, topic));
    setWizardStep("configure");
  };

  const handleCreate = () => {
    if (!selectedPreset || !botName || !selectedTopic) return;
    createFromPresetMutation.mutate({
      presetId: selectedPreset.id,
      name: botName,
      topic: selectedTopic,
      selectedSourceUrls: Array.from(selectedSourceUrls),
      customSources: customSources.filter(s => selectedSourceUrls.has(s.url)),
    });
  };

  const toggleSourceUrl = (url: string) => {
    setSelectedSourceUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const getPresetIcon = (iconName: string | null) => {
    const IconComponent = iconName ? iconMap[iconName] : Sparkles;
    return IconComponent || Sparkles;
  };

  const getCategoryLabel = (category: string): string => {
    const categoryKey = `profiles.category.${category}`;
    const translated = t(categoryKey);
    if (translated !== categoryKey) return translated;
    const fallback: Record<string, string> = {
      information: "Information",
      business: "Business",
      compliance: "Compliance",
      research: "Research",
      commerce: "Commerce",
      engagement: "Engagement",
      finance: "Finance",
      work: "Work",
    };
    return fallback[category] || category;
  };

  const uniqueCategories = Array.from(new Set(presets.map(p => p.category).filter((c): c is string => c !== null && c !== undefined)));

  if (botsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {botsList.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("profiles.title")}</h1>
              <p className="text-muted-foreground">{t("profiles.subtitle")}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {botsList.map((bot) => (
              <Card key={bot.id} className="overflow-visible" data-testid={`bot-card-${bot.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate" data-testid={`text-bot-name-${bot.id}`}>{bot.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={topicColors[bot.key] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"} data-testid={`badge-bot-key-${bot.id}`}>{bot.key}</Badge>
                      </CardDescription>
                    </div>
                    <Switch
                      checked={bot.isEnabled}
                      onCheckedChange={(checked) => toggleBotMutation.mutate({ id: bot.id, isEnabled: checked })}
                      data-testid={`toggle-bot-${bot.id}`}
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {bot.settings && (
                    <div className="text-sm text-muted-foreground mb-3 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{bot.settings.scheduleRule} at {bot.settings.scheduleTimeLocal}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        <span>{bot.settings.markdownLevel === "minimal" ? "Conversational" : "Structured"} / {bot.settings.verbosity}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setLocation(`/bots/${bot.id}`)}
                      data-testid={`button-edit-bot-${bot.id}`}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      {t("sidebar.settings")}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (confirm(t("profiles.deleteConfirm"))) {
                          deleteBotMutation.mutate(bot.id);
                        }
                      }}
                      disabled={deleteBotMutation.isPending}
                      data-testid={`button-delete-bot-${bot.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card
              className="overflow-visible border-dashed hover-elevate cursor-pointer flex items-center justify-center min-h-[160px]"
              onClick={() => setWizardOpen(true)}
              data-testid="card-add-bot"
            >
              <div className="text-center p-6">
                <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium text-sm">{t("profiles.createNew")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("profiles.createNewDesc")}</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {botsList.length === 0 && (
        <div className="mb-8">
          <div className="text-center py-12">
            <BotIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2" data-testid="text-page-title">{t("profiles.noBots")}</h1>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto" data-testid="text-empty-state-message">
              {t("profiles.noBotsDesc")}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button onClick={() => setWizardOpen(true)} data-testid="button-start-from-template">
                <Sparkles className="h-4 w-4 mr-2" />
                {t("profiles.startTemplate")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-xl font-bold" data-testid="text-gallery-title">{t("profiles.galleryTitle")}</h2>
        <p className="text-muted-foreground text-sm" data-testid="text-gallery-subtitle">
          {t("profiles.gallerySubtitle")}
        </p>
      </div>

      {presetsLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!presetsLoading && presets.length === 0 && (
        <Card className="overflow-visible">
          <CardContent className="p-8 text-center text-muted-foreground">
            {t("profiles.noTemplates")}
          </CardContent>
        </Card>
      )}

      {uniqueCategories.map(category => {
        const categoryPresets = presets.filter(p => p.category === category);
        if (categoryPresets.length === 0) return null;
        return (
          <div key={category} className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {getCategoryLabel(category)}
            </h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {categoryPresets.map(preset => {
                const Icon = getPresetIcon(preset.icon);
                return (
                  <Card
                    key={preset.id}
                    className="overflow-visible hover-elevate cursor-pointer"
                    onClick={() => { handlePresetSelect(preset); setWizardOpen(true); }}
                    data-testid={`preset-card-${preset.key}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-md bg-primary/10 shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="font-medium text-sm" data-testid={`text-preset-name-${preset.key}`}>{preset.name}</h4>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preset.description}</p>
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Rss className="h-3 w-3 shrink-0" />
                              <span>{t("profiles.sources", { count: (preset.defaultConfigJson?.suggestedSources || []).length })}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>{t("profiles.output", { type: preset.outputType })}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {(preset.variantsJson || []).slice(0, 3).map(v => (
                              <Badge key={v} variant="outline" className="text-xs">{v}</Badge>
                            ))}
                          </div>
                          <p className="text-xs text-primary font-medium mt-2" data-testid={`link-preset-start-${preset.key}`}>
                            {t("profiles.startWith")} &rarr;
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {presets.filter(p => !p.category).length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">{t("profiles.other")}</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {presets.filter(p => !p.category).map(preset => {
              const Icon = getPresetIcon(preset.icon);
              return (
                <Card
                  key={preset.id}
                  className="overflow-visible hover-elevate cursor-pointer"
                  onClick={() => { handlePresetSelect(preset); setWizardOpen(true); }}
                  data-testid={`preset-card-${preset.key}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-primary/10 shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-medium text-sm">{preset.name}</h4>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preset.description}</p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <Badge className={`${outputTypeColors[preset.outputType]} text-xs`}>{preset.outputType}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={wizardOpen} onOpenChange={(open) => open ? setWizardOpen(true) : resetWizard()}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {wizardStep === "preset" && t("profiles.wizard.chooseTemplate")}
              {wizardStep === "topic" && t("profiles.wizard.selectTopic")}
              {wizardStep === "configure" && t("profiles.wizard.configure")}
            </DialogTitle>
            <DialogDescription>
              {wizardStep === "preset" && t("profiles.wizard.chooseTemplateDesc")}
              {wizardStep === "topic" && t("profiles.wizard.selectTopicDesc", { name: selectedPreset?.name || "" })}
              {wizardStep === "configure" && t("profiles.wizard.configureDesc")}
            </DialogDescription>
          </DialogHeader>

          {wizardStep === "preset" && (
            <div className="grid gap-3 py-2 max-h-[400px] overflow-y-auto">
              {presets.map((preset) => {
                const Icon = getPresetIcon(preset.icon);
                return (
                  <div
                    key={preset.id}
                    className="p-3 rounded-md border border-border hover-elevate cursor-pointer"
                    onClick={() => handlePresetSelect(preset)}
                    data-testid={`wizard-preset-${preset.key}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10 shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{preset.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">{preset.description}</p>
                      </div>
                      <Badge className={`${outputTypeColors[preset.outputType]} text-xs`}>{preset.outputType}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {wizardStep === "topic" && selectedPreset && (
            <div className="grid gap-3 py-2">
              {(selectedPreset.variantsJson || []).map((topic) => (
                <Button
                  key={topic}
                  variant="outline"
                  className="justify-start"
                  onClick={() => handleTopicSelect(topic)}
                  data-testid={`wizard-topic-${topic}`}
                >
                  <Badge className={`mr-2 ${topicColors[topic] || ""}`}>{topic}</Badge>
                  {topic.charAt(0).toUpperCase() + topic.slice(1).replace(/_/g, " ")}
                </Button>
              ))}

              <div className="mt-2 pt-3 border-t border-border space-y-2">
                <Label className="text-xs text-muted-foreground">{t("profiles.wizard.customTopicLabel")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={customTopicInput}
                    onChange={(e) => {
                      const sanitized = e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "_")
                        .replace(/[^a-z0-9_]/g, "")
                        .replace(/_{2,}/g, "_")
                        .replace(/^_+/, "");
                      setCustomTopicInput(sanitized);
                    }}
                    placeholder={t("profiles.wizard.customTopicPlaceholder")}
                    data-testid="input-wizard-custom-topic"
                  />
                  <Button
                    variant="outline"
                    disabled={
                      !customTopicInput ||
                      customTopicInput.length < 2 ||
                      (selectedPreset?.variantsJson || []).includes(customTopicInput) ||
                      botsList.some(b => b.key === customTopicInput)
                    }
                    onClick={() => {
                      const cleaned = customTopicInput.replace(/_+$/, "");
                      if (cleaned.length >= 2) {
                        handleTopicSelect(cleaned);
                        setCustomTopicInput("");
                      }
                    }}
                    data-testid="button-wizard-custom-topic-add"
                  >
                    {t("profiles.wizard.customTopicUse")}
                  </Button>
                </div>
                {customTopicInput && botsList.some(b => b.key === customTopicInput) && (
                  <p className="text-xs text-destructive">{t("profiles.wizard.customTopicDuplicate")}</p>
                )}
                <p className="text-xs text-muted-foreground">{t("profiles.wizard.customTopicHint")}</p>
              </div>

              <Button variant="ghost" size="sm" onClick={() => setWizardStep("preset")} data-testid="button-wizard-back">
                <ArrowLeft className="h-4 w-4 mr-1" /> {t("profiles.wizard.back")}
              </Button>
            </div>
          )}

          {wizardStep === "configure" && selectedPreset && (
            <div className="flex flex-col min-h-0 flex-1">
            <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0 pr-1">
              <div className="space-y-2">
                <Label htmlFor="bot-name">{t("profiles.wizard.botName")}</Label>
                <Input
                  id="bot-name"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="Enter bot name"
                  data-testid="input-wizard-bot-name"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label>{t("profiles.wizard.topic")}:</Label>
                <Badge className={topicColors[selectedTopic] || ""} data-testid="badge-wizard-topic">{selectedTopic}</Badge>
                <Label className="text-muted-foreground text-xs">|</Label>
                <Label className="text-muted-foreground text-xs">
                  {t("profiles.output", { type: selectedPreset.outputType })}
                </Label>
              </div>

              {selectedPreset.defaultConfigJson && (
                <div className="rounded-md bg-muted/50 p-3 space-y-1 text-sm">
                  <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-2">Pre-filled Settings</p>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{selectedPreset.defaultConfigJson.scheduleRule || "DAILY"} at {selectedPreset.defaultConfigJson.scheduleTimeLocal || "07:00"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{selectedPreset.defaultConfigJson.markdownLevel === "minimal" ? "Conversational" : "Structured"} / {selectedPreset.defaultConfigJson.verbosity || "normal"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic mt-1">You can change all settings after creation</p>
                </div>
              )}

              {(() => {
                const allSources = selectedPreset.defaultConfigJson?.suggestedSources || [];
                const topicSources = allSources.filter(s => s.topic === selectedTopic);
                const allDisplaySources = [...topicSources, ...customSources];
                const renderSourceRow = (source: SuggestedSource, isCustom = false) => (
                  <div
                    key={source.url}
                    className="flex items-center gap-3 p-2 rounded-md border border-border"
                    data-testid={`source-checkbox-${source.name.replace(/\s/g, '-').toLowerCase()}`}
                  >
                    <Checkbox
                      checked={selectedSourceUrls.has(source.url)}
                      onCheckedChange={() => toggleSourceUrl(source.url)}
                      id={`source-${source.url}`}
                    />
                    <label htmlFor={`source-${source.url}`} className="flex-1 cursor-pointer min-w-0">
                      <span className="text-sm font-medium">{source.name}</span>
                      {isCustom && <Badge variant="outline" className="ml-2 text-xs">custom</Badge>}
                    </label>
                    {isCustom && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.preventDefault();
                          setCustomSources(prev => prev.filter(s => s.url !== source.url));
                          setSelectedSourceUrls(prev => {
                            const next = new Set(prev);
                            next.delete(source.url);
                            return next;
                          });
                        }}
                        data-testid={`button-remove-custom-source-${source.name.replace(/\s/g, '-').toLowerCase()}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
                return (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Rss className="h-4 w-4" />
                      {t("profiles.wizard.defaultSources")}
                    </Label>
                    <p className="text-xs text-muted-foreground" data-testid="text-source-disclaimer">
                      {selectedPreset?.defaultConfigJson?.sourceDisclaimer || t("profiles.wizard.sourceDisclaimer")}
                    </p>
                    {allDisplaySources.length > 0 ? (
                      <div className="space-y-1.5">
                        {topicSources.map(s => renderSourceRow(s, false))}
                        {customSources.map(s => renderSourceRow(s, true))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No default sources for this topic. Add your own below.</p>
                    )}
                  </div>

                  <div className="space-y-2 pt-1 border-t border-border">
                    <Label className="flex items-center gap-1.5 text-sm">
                      <Link2 className="h-4 w-4" />
                      {t("profiles.wizard.customSourceUrl")}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder={t("profiles.wizard.customSourceName")}
                        value={customSourceName}
                        onChange={(e) => setCustomSourceName(e.target.value)}
                        className="flex-1"
                        data-testid="input-custom-source-name"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder={t("profiles.wizard.customSourceUrlPlaceholder")}
                        value={customSourceUrl}
                        onChange={(e) => setCustomSourceUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSource(); } }}
                        className="flex-1"
                        data-testid="input-custom-source-url"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addCustomSource}
                        disabled={!customSourceUrl.trim()}
                        data-testid="button-add-custom-source"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t("profiles.wizard.addSource")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">You can also add more sources after creating the bot.</p>
                  </div>
                </div>
                );
              })()}
            </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-border shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedPreset.variantsJson.length > 1) setWizardStep("topic");
                    else setWizardStep("preset");
                  }}
                  data-testid="button-wizard-back-configure"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> {t("profiles.wizard.back")}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!botName || createFromPresetMutation.isPending}
                  data-testid="button-wizard-create"
                >
                  {createFromPresetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {createFromPresetMutation.isPending ? t("profiles.wizard.creating") : t("profiles.wizard.createBot")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
