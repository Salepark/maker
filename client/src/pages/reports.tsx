import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Loader2, Calendar, Eye, Bot } from "lucide-react";
import { format } from "date-fns";
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

function ReportContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none max-h-[70vh] overflow-y-auto">
      <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
        {content}
      </div>
    </div>
  );
}

export default function Reports() {
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("all");

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["/api/profiles"],
  });

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports", selectedProfileId === "all" ? "" : `profileId=${selectedProfileId}`],
    queryFn: async () => {
      const url = selectedProfileId === "all" 
        ? "/api/reports" 
        : `/api/reports?profileId=${selectedProfileId}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (profileId?: number) => {
      const res = await apiRequest("POST", "/api/reports/generate", { profileId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Report Generated",
        description: data.result ? `Report created for profile` : "Reports generated for due profiles",
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

  const getTopicColor = (topic: string) => {
    const colors: Record<string, string> = {
      investing: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      ai_art: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      tech: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      crypto: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    };
    return colors[topic] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  };

  const activeProfiles = profiles.filter(p => p.isActive);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-reports-title">
            <FileText className="h-6 w-6" />
            Reports
          </h1>
          <p className="text-muted-foreground">
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

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !reports?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No reports yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              {selectedProfileId !== "all" 
                ? "No reports for this profile yet. Click generate to create one."
                : "Select a bot profile above to generate a report, or reports are created automatically for active bots."}
            </p>
            <Button
              onClick={() => {
                if (selectedProfileId !== "all") {
                  generateMutation.mutate(parseInt(selectedProfileId));
                }
              }}
              disabled={generateMutation.isPending || selectedProfileId === "all"}
              data-testid="button-generate-first-report"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const profile = profiles.find(p => p.id === report.profileId);
            
            return (
              <Card key={report.id} className="hover-elevate" data-testid={`card-report-${report.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-1">
                        {report.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(report.createdAt), "yyyy-MM-dd HH:mm")}
                        </span>
                        {profile && (
                          <span className="flex items-center gap-1">
                            <Bot className="h-3 w-3" />
                            {profile.name}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getTopicColor(report.topic)}>{report.topic}</Badge>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedReport(report)}
                            data-testid={`button-view-report-${report.id}`}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh]">
                          <DialogHeader>
                            <DialogTitle>{report.title}</DialogTitle>
                          </DialogHeader>
                          <ReportContent content={report.contentText} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {report.contentText?.substring(0, 200) || ""}...
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
