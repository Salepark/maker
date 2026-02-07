import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  FileText, Search, Edit, CheckCircle, Send, XCircle, Clock, RefreshCw,
  Activity, AlertTriangle, Zap, Bot as BotIcon, ArrowRight, Settings,
  Newspaper, Eye, Scale, GraduationCap, ShoppingBag, MessageSquare, TrendingUp, Users, Sparkles,
  Layers, Rss, FileBarChart, Briefcase, BookOpen, Building2, Key, CircleDot, PenTool
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Link, useLocation } from "wouter";

interface DashboardStats {
  total: number;
  new: number;
  analyzed: number;
  drafted: number;
  approved: number;
  posted: number;
  skipped: number;
  lastCollectAt: string | null;
  lastAnalyzeAt: string | null;
}

interface RecentItem {
  id: number;
  title: string;
  url: string;
  status: string;
  insertedAt: string;
  sourceName: string;
}

interface SchedulerStatus {
  isRunning: boolean;
  systemLLMAvailable: boolean;
  collectInterval: string;
  analyzeInterval: string;
  draftInterval: string;
  reportInterval: string;
  dailyBriefSchedule: string;
  lastCollect: string | null;
  lastAnalyze: string | null;
  lastDraft: string | null;
  lastDailyBrief: string | null;
  lastReportRun: string | null;
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

interface PresetConfig {
  suggestedSources?: { name: string; url: string; topic: string }[];
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

const iconMap: Record<string, typeof Newspaper> = {
  Newspaper, Eye, Scale, GraduationCap, ShoppingBag, MessageSquare, TrendingUp, Users, Search, Briefcase, BookOpen, Building2, PenTool,
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
};

const statusIcons: Record<string, React.ReactNode> = {
  new: <Clock className="h-3.5 w-3.5" />,
  analyzed: <Search className="h-3.5 w-3.5" />,
  drafted: <Edit className="h-3.5 w-3.5" />,
  approved: <CheckCircle className="h-3.5 w-3.5" />,
  posted: <Send className="h-3.5 w-3.5" />,
  skipped: <XCircle className="h-3.5 w-3.5" />,
};

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  analyzed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  drafted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  posted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  skipped: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: recentItems, isLoading: itemsLoading } = useQuery<RecentItem[]>({
    queryKey: ["/api/items/recent"],
  });

  const { data: schedulerStatus } = useQuery<SchedulerStatus>({
    queryKey: ["/api/scheduler/status"],
    refetchInterval: 30000,
  });

  const { data: botsResponse, isLoading: botsLoading } = useQuery<{ bots: BotData[] }>({
    queryKey: ["/api/bots"],
  });
  const botsList = botsResponse?.bots ?? [];

  const { data: presets = [] } = useQuery<Preset[]>({
    queryKey: ["/api/presets"],
  });

  const { data: providersResponse } = useQuery<{ providers: { id: number }[] }>({
    queryKey: ["/api/llm-providers"],
    queryFn: () => fetch("/api/llm-providers", { credentials: "include" }).then(r => r.json()),
  });
  const hasProviders = (providersResponse?.providers?.length ?? 0) > 0;
  const isNewUser = botsList.length === 0;

  const featuredPresets = presets.slice(0, 4);

  const getPresetIcon = (iconName: string | null) => {
    const IconComponent = iconName ? iconMap[iconName] : Sparkles;
    return IconComponent || Sparkles;
  };

  const statCards = [
    { label: "Total Items", value: stats?.total ?? 0, icon: FileText, color: "text-foreground" },
    { label: "New", value: stats?.new ?? 0, icon: Clock, color: "text-blue-500" },
    { label: "Analyzed", value: stats?.analyzed ?? 0, icon: Search, color: "text-yellow-500" },
    { label: "Drafted", value: stats?.drafted ?? 0, icon: Edit, color: "text-purple-500" },
    { label: "Approved", value: stats?.approved ?? 0, icon: CheckCircle, color: "text-green-500" },
    { label: "Posted", value: stats?.posted ?? 0, icon: Send, color: "text-emerald-500" },
    { label: "Skipped", value: stats?.skipped ?? 0, icon: XCircle, color: "text-gray-500" },
  ];

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="space-y-2" data-testid="section-hero">
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Workflow Designer</h1>
        <p className="text-muted-foreground max-w-2xl" data-testid="text-hero-message">
          A tool for designing your automation workflows. Choose your sources, set your schedule, and design your outputs — you decide everything.
        </p>
      </div>

      {schedulerStatus && !schedulerStatus.systemLLMAvailable && (
        <Card className="border-amber-300 dark:border-amber-700" data-testid="card-system-warning">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm" data-testid="text-llm-warning">System AI key is not configured</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Analysis, drafting, and report generation are paused. Content collection continues normally.
                </p>
                <p className="text-sm mt-2">
                  <Link href="/settings" className="text-primary hover:underline" data-testid="link-add-provider">
                    Settings &gt; Providers
                  </Link>
                  {" "}— Add a BYO LLM provider to enable AI features for each bot.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isNewUser && (
        <Card data-testid="card-onboarding">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-2">Getting Started</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Follow these steps to set up your first automation workflow.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex gap-3">
                <div className={`shrink-0 flex items-center justify-center h-9 w-9 rounded-md ${hasProviders ? 'bg-green-100 dark:bg-green-900' : 'bg-primary/10'}`}>
                  <Key className={`h-5 w-5 ${hasProviders ? 'text-green-600 dark:text-green-400' : 'text-primary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-sm">1. Add AI Provider</h3>
                    {hasProviders && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Done
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add your own API key (OpenAI, Anthropic, Google, etc.) to enable AI analysis and report generation.
                  </p>
                  {!hasProviders && (
                    <Link href="/settings">
                      <Button variant="outline" size="sm" className="mt-2" data-testid="button-onboarding-provider">
                        Go to Settings
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 flex items-center justify-center h-9 w-9 rounded-md bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">2. Create a Bot</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pick a template below and customize the sources, schedule, and output format to your needs.
                  </p>
                  <Link href="/bots">
                    <Button variant="outline" size="sm" className="mt-2" data-testid="button-onboarding-create-bot">
                      Browse Templates
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 flex items-center justify-center h-9 w-9 rounded-md bg-primary/10">
                  <FileBarChart className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">3. View Reports</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your bot will automatically collect, analyze, and generate reports on schedule. Check results in the Reports page.
                  </p>
                  <Link href="/reports">
                    <Button variant="outline" size="sm" className="mt-2" data-testid="button-onboarding-reports">
                      View Reports
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div data-testid="section-start-template">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Start a Workflow
            </h2>
            <p className="text-sm text-muted-foreground">
              Templates are starting points, not answers. You can freely customize sources, schedules, and outputs.
            </p>
          </div>
          <Link href="/bots">
            <Button variant="outline" size="sm" data-testid="link-view-all-templates">
              View All Templates
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featuredPresets.map((preset) => {
            const Icon = getPresetIcon(preset.icon);
            return (
              <Card
                key={preset.id}
                className="overflow-visible hover-elevate cursor-pointer"
                onClick={() => setLocation("/bots")}
                data-testid={`card-template-${preset.key}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10 shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-medium text-sm" data-testid={`text-template-name-${preset.key}`}>{preset.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{preset.description}</p>
                  <div className="pt-1">
                    <span className="text-xs text-primary font-medium" data-testid={`link-template-start-${preset.key}`}>
                      Start with this setup &rarr;
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {botsList.length > 0 && (
        <div data-testid="section-my-bots">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BotIcon className="h-5 w-5 text-primary" />
                My Workflow Bots
              </h2>
              <p className="text-sm text-muted-foreground">
                Your active bots. Change settings or run them instantly.
              </p>
            </div>
            <Link href="/bots">
              <Button variant="outline" size="sm" data-testid="link-manage-bots">
                Manage All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {botsList.slice(0, 6).map((bot) => (
              <Card key={bot.id} className="overflow-visible" data-testid={`card-bot-${bot.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate" data-testid={`text-bot-name-${bot.id}`}>{bot.name}</h3>
                      <Badge className={`mt-1 ${topicColors[bot.key] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"}`}>
                        {bot.key}
                      </Badge>
                    </div>
                    <Badge variant={bot.isEnabled ? "default" : "secondary"} className="shrink-0">
                      {bot.isEnabled ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  {bot.settings && (
                    <div className="text-xs text-muted-foreground mb-3 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>{bot.settings.scheduleRule} at {bot.settings.scheduleTimeLocal}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setLocation(`/bots/${bot.id}`)}
                      data-testid={`button-open-bot-${bot.id}`}
                    >
                      Open
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/bots/${bot.id}`)}
                      data-testid={`button-settings-bot-${bot.id}`}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {schedulerStatus && (
        <Card data-testid="card-system-status">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2" data-testid="status-collect">
                <Zap className="h-3.5 w-3.5 text-green-500" />
                <span className="text-muted-foreground">Collect:</span>
                <span className="font-medium">{schedulerStatus.collectInterval}</span>
              </div>
              <div className="flex items-center gap-2" data-testid="status-analyze">
                <Zap className={`h-3.5 w-3.5 ${schedulerStatus.systemLLMAvailable ? 'text-green-500' : 'text-amber-500'}`} />
                <span className="text-muted-foreground">Analyze:</span>
                <span className={`font-medium ${!schedulerStatus.systemLLMAvailable ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                  {schedulerStatus.systemLLMAvailable ? schedulerStatus.analyzeInterval : "Paused"}
                </span>
              </div>
              <div className="flex items-center gap-2" data-testid="status-draft">
                <Zap className={`h-3.5 w-3.5 ${schedulerStatus.systemLLMAvailable ? 'text-green-500' : 'text-amber-500'}`} />
                <span className="text-muted-foreground">Draft:</span>
                <span className={`font-medium ${!schedulerStatus.systemLLMAvailable ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                  {schedulerStatus.systemLLMAvailable ? schedulerStatus.draftInterval : "Paused"}
                </span>
              </div>
              <div className="flex items-center gap-2" data-testid="status-report">
                <Zap className={`h-3.5 w-3.5 ${schedulerStatus.systemLLMAvailable ? 'text-green-500' : 'text-amber-500'}`} />
                <span className="text-muted-foreground">Reports:</span>
                <span className={`font-medium ${!schedulerStatus.systemLLMAvailable ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                  {schedulerStatus.systemLLMAvailable ? schedulerStatus.reportInterval : "Paused"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm mt-3 pt-3 border-t border-border flex-wrap">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Last Collect:</span>
                <span className="font-medium" data-testid="text-last-collect">
                  {schedulerStatus.lastCollect 
                    ? formatDistanceToNow(new Date(schedulerStatus.lastCollect), { addSuffix: true })
                    : "Never"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Last Analyze:</span>
                <span className="font-medium" data-testid="text-last-analyze">
                  {schedulerStatus.lastAnalyze
                    ? formatDistanceToNow(new Date(schedulerStatus.lastAnalyze), { addSuffix: true })
                    : "Never"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="hover-elevate cursor-default">
            <CardContent className="p-4">
              {statsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex flex-col items-center text-center">
                  <stat.icon className={`h-5 w-5 mb-1 ${stat.color}`} />
                  <div className="text-2xl font-bold" data-testid={`text-stat-${stat.label.toLowerCase().replace(" ", "-")}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg">Recent Items</CardTitle>
          <Link href="/items">
            <Badge variant="outline" className="cursor-pointer" data-testid="link-view-all-items">
              View All
            </Badge>
          </Link>
        </CardHeader>
        <CardContent>
          {itemsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentItems && recentItems.length > 0 ? (
            <div className="space-y-2">
              {recentItems.map((item) => (
                <Link key={item.id} href={`/items/${item.id}`}>
                  <div
                    className="p-3 rounded-md border border-transparent hover:border-border hover-elevate cursor-pointer"
                    data-testid={`card-item-${item.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate text-sm">{item.title || "Untitled"}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{item.sourceName}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.insertedAt), "MMM d, HH:mm")}
                          </span>
                        </div>
                      </div>
                      <Badge className={`${statusColors[item.status]} flex items-center gap-1 text-xs`}>
                        {statusIcons[item.status]}
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No items collected yet</p>
              <p className="text-sm">Add RSS sources to start collecting content</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
