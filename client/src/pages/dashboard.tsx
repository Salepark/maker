import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Search, Edit, CheckCircle, Send, XCircle, Clock, RefreshCw, Activity, AlertTriangle, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { format } from "date-fns";

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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your Makelr Bot activity</p>
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
                  Each bot can still use its own AI provider configured in Settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
            <div className="flex items-center gap-6 text-sm mt-3 pt-3 border-t border-border">
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
