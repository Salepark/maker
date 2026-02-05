import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Settings as SettingsIcon, Play, Pause, RefreshCw, Zap, Clock } from "lucide-react";

interface SchedulerStatus {
  isRunning: boolean;
  collectInterval: string;
  analyzeInterval: string;
  draftInterval: string;
  lastCollect?: string;
  lastAnalyze?: string;
  lastDraft?: string;
}

export default function Settings() {
  const { toast } = useToast();

  const { data: status, isLoading } = useQuery<SchedulerStatus>({
    queryKey: ["/api/scheduler/status"],
  });

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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground">Configure scheduler and bot settings</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
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
              <div className="flex items-center justify-between p-4 rounded-md border">
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

              <div className="flex items-center justify-between p-4 rounded-md border">
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

              <div className="flex items-center justify-between p-4 rounded-md border">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Bot Configuration
          </CardTitle>
          <CardDescription>
            Configure AI behavior and response settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-md border">
            <div>
              <h3 className="font-medium text-sm">LLM Provider</h3>
              <p className="text-xs text-muted-foreground mt-1">Anthropic Claude API</p>
            </div>
            <Badge variant="secondary">claude-sonnet-4-5</Badge>
          </div>

          <div className="flex items-center justify-between p-4 rounded-md border">
            <div>
              <h3 className="font-medium text-sm">Base URL</h3>
              <p className="text-xs text-muted-foreground mt-1">makelr.com</p>
            </div>
            <Badge variant="outline">Configured</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
