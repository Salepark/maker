import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Loader2, Calendar, Hash, Eye } from "lucide-react";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: number;
  topic: string;
  title: string;
  content: string;
  itemsCount: number;
  createdAt: string;
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
  const [selectedTopic, setSelectedTopic] = useState<string>("ai_art");

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
  });

  const generateMutation = useMutation({
    mutationFn: async (topic: string) => {
      const res = await apiRequest("POST", "/api/debug/generate-daily-brief", { topic });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Report Generated",
        description: `${data.topic === "ai_art" ? "AI Art" : "Investing"} Brief created with ${data.itemsCount} items`,
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-reports-title">
            <FileText className="h-6 w-6" />
            Daily Reports
          </h1>
          <p className="text-muted-foreground">
            AI-generated market briefs from analyzed content (22:00 KST daily)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger className="w-32" data-testid="select-topic">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ai_art">AI Art</SelectItem>
              <SelectItem value="investing">Investing</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => generateMutation.mutate(selectedTopic)}
            disabled={generateMutation.isPending}
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
              Reports are generated daily at 22:00 KST, or click the button above to generate now
            </p>
            <Button
              onClick={() => generateMutation.mutate(selectedTopic)}
              disabled={generateMutation.isPending}
              data-testid="button-generate-first-report"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Generate First Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover-elevate" data-testid={`card-report-${report.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base line-clamp-1">
                      {report.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(report.createdAt), "yyyy-MM-dd HH:mm")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {report.itemsCount} items
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{report.topic}</Badge>
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
                        <ReportContent content={report.content} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {report.content.substring(0, 200)}...
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
