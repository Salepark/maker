import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Loader2, Bot, RefreshCw } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: number;
  profileId: number;
  userId: string;
  presetId: number;
  topic: string;
  outputType: string;
  title: string;
  contentText: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

interface Profile {
  id: number;
  name: string;
  topic: string;
  isActive: boolean;
  presetName: string;
}

function formatKST(iso: string) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
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

export default function Reports() {
  const { toast } = useToast();
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("all");

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["/api/profiles"],
  });

  const { data: reports, isLoading, refetch } = useQuery<Report[]>({
    queryKey: ["/api/reports", selectedProfileId],
    queryFn: async () => {
      const url = selectedProfileId === "all" 
        ? "/api/reports" 
        : `/api/reports?profileId=${selectedProfileId}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  const selectedReport = useMemo(() => {
    if (!reports || selectedReportId == null) return null;
    return reports.find((r) => r.id === selectedReportId) ?? null;
  }, [reports, selectedReportId]);

  const generateMutation = useMutation({
    mutationFn: async (profileId?: number) => {
      const res = await apiRequest("POST", "/api/reports/generate", { profileId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Report Generated",
        description: data.result ? `Report created successfully` : "Reports generated for due profiles",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    },
  });

  const activeProfiles = profiles.filter(p => p.isActive);

  const getProfileName = (profileId: number) => {
    const profile = profiles.find(p => p.id === profileId);
    return profile?.name || `Profile #${profileId}`;
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-reports-title">
            <FileText className="h-5 w-5" />
            Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Bot-generated reports from analyzed content
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
            <SelectTrigger className="w-48" data-testid="select-profile">
              <SelectValue placeholder="Select profile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              {activeProfiles.map((profile) => (
                <SelectItem key={profile.id} value={String(profile.id)}>
                  <div className="flex items-center gap-2">
                    <Bot className="h-3 w-3" />
                    {profile.name}
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
            onClick={() => {
              if (selectedProfileId !== "all") {
                generateMutation.mutate(parseInt(selectedProfileId));
              }
            }}
            disabled={generateMutation.isPending || selectedProfileId === "all"}
            data-testid="button-generate-report"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Generate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        <Card className="h-[70vh] overflow-hidden">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-medium">Recent Reports</CardTitle>
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
                  <p className="text-sm text-muted-foreground">No reports yet.</p>
                  {selectedProfileId !== "all" && (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => generateMutation.mutate(parseInt(selectedProfileId))}
                      disabled={generateMutation.isPending}
                      data-testid="button-generate-first-report"
                    >
                      {generateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1" />
                      )}
                      Generate Report
                    </Button>
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
                      <span>{formatKST(report.createdAt)}</span>
                      <span>·</span>
                      <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${getTopicColor(report.topic)}`}>
                        {report.topic}
                      </Badge>
                      <span>·</span>
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
            <CardTitle className="text-sm font-medium line-clamp-1">
              {selectedReport ? selectedReport.title : "Select a report"}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(70vh-52px)] overflow-auto p-4">
            {selectedReportId == null && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Pick a report from the left to view its contents.
                </p>
              </div>
            )}

            {selectedReport && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Created: {formatKST(selectedReport.createdAt)}</span>
                  <span>·</span>
                  <span>Period: {formatKST(selectedReport.periodStart)} ~ {formatKST(selectedReport.periodEnd)}</span>
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
