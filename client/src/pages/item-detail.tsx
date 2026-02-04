import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  SkipForward,
  RefreshCw,
  Link2Off,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface ItemDetail {
  id: number;
  title: string;
  url: string;
  contentText: string;
  status: string;
  author: string;
  insertedAt: string;
  sourceName: string;
  analysis?: {
    category: string;
    relevanceScore: number;
    replyWorthinessScore: number;
    linkFitScore: number;
    riskFlagsJson: string[];
    recommendedAction: string;
    suggestedAngle: string;
    summaryShort: string;
    summaryLong: string;
  };
  drafts: {
    id: number;
    variant: string;
    draftText: string;
    includesLink: boolean;
    tone: string;
    adminDecision: string;
    finalText?: string;
  }[];
}

const riskFlagLabels: Record<string, string> = {
  promo_ban: "Promo Banned",
  link_ban: "Link Banned",
  heated_topic: "Heated Topic",
  new_account_risk: "New Account Risk",
  unknown_rules: "Unknown Rules",
};

export default function ItemDetail() {
  const [, params] = useRoute("/items/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedDraft, setSelectedDraft] = useState<string>("A");
  const [editedText, setEditedText] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const itemId = params?.id ? parseInt(params.id) : null;

  const { data: item, isLoading } = useQuery<ItemDetail>({
    queryKey: ["/api/items", itemId],
    enabled: itemId !== null,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ draftId, finalText }: { draftId: number; finalText: string }) => {
      return apiRequest("POST", `/api/drafts/${draftId}/approve`, { finalText });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items", itemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Draft approved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to approve draft", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (draftId: number) => {
      return apiRequest("POST", `/api/drafts/${draftId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items", itemId] });
      toast({ title: "Draft rejected" });
    },
    onError: () => {
      toast({ title: "Failed to reject draft", variant: "destructive" });
    },
  });

  const skipMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/items/${itemId}/skip`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items", itemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Item skipped" });
    },
    onError: () => {
      toast({ title: "Failed to skip item", variant: "destructive" });
    },
  });

  const reanalyzeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/items/${itemId}/reanalyze`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items", itemId] });
      toast({ title: "Re-analysis started" });
    },
    onError: () => {
      toast({ title: "Failed to start re-analysis", variant: "destructive" });
    },
  });

  const currentDraft = item?.drafts?.find((d) => d.variant === selectedDraft);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const handleApprove = () => {
    if (currentDraft) {
      const finalText = editedText || currentDraft.draftText;
      approveMutation.mutate({ draftId: currentDraft.id, finalText });
    }
  };

  const removeLinks = (text: string) => {
    return text
      .replace(/https?:\/\/[^\s]+/g, "")
      .replace(/aiartmarket\.io/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-lg font-medium">Item not found</p>
          <Link href="/items">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Items
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/items">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate" data-testid="text-item-title">
            {item.title || "Untitled"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{item.sourceName}</span>
            {item.author && <span>by {item.author}</span>}
            <span>{format(new Date(item.insertedAt), "MMM d, yyyy HH:mm")}</span>
          </div>
        </div>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          <Button variant="outline" size="sm" data-testid="button-view-original">
            <ExternalLink className="h-4 w-4 mr-2" />
            Original
          </Button>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Original Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-sm">{item.contentText}</p>
            </div>
          </CardContent>
        </Card>

        {item.analysis && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Analysis</CardTitle>
              <CardDescription>{item.analysis.summaryShort}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-md bg-muted">
                  <div className="text-2xl font-bold">{item.analysis.relevanceScore}</div>
                  <div className="text-xs text-muted-foreground">Relevance</div>
                </div>
                <div className="text-center p-3 rounded-md bg-muted">
                  <div className="text-2xl font-bold">{item.analysis.replyWorthinessScore}</div>
                  <div className="text-xs text-muted-foreground">Reply Score</div>
                </div>
                <div className="text-center p-3 rounded-md bg-muted">
                  <div className="text-2xl font-bold">{item.analysis.linkFitScore}</div>
                  <div className="text-xs text-muted-foreground">Link Fit</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{item.analysis.category}</Badge>
                <Badge variant={item.analysis.recommendedAction === "draft" ? "default" : "outline"}>
                  {item.analysis.recommendedAction}
                </Badge>
              </div>

              {item.analysis.riskFlagsJson && item.analysis.riskFlagsJson.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {item.analysis.riskFlagsJson.map((flag) => (
                    <Badge key={flag} variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {riskFlagLabels[flag] || flag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="text-sm">
                <span className="font-medium">Suggested Angle:</span>
                <p className="text-muted-foreground mt-1">{item.analysis.suggestedAngle}</p>
              </div>

              <div className="text-sm">
                <span className="font-medium">Summary:</span>
                <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{item.analysis.summaryLong}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {item.drafts && item.drafts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Draft Replies</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => skipMutation.mutate()}
                disabled={skipMutation.isPending || item.status === "skipped"}
                data-testid="button-skip"
              >
                <SkipForward className="h-4 w-4 mr-1" />
                Skip
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => reanalyzeMutation.mutate()}
                disabled={reanalyzeMutation.isPending}
                data-testid="button-reanalyze"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Re-analyze
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedDraft} onValueChange={setSelectedDraft}>
              <TabsList>
                {item.drafts.map((draft) => (
                  <TabsTrigger
                    key={draft.variant}
                    value={draft.variant}
                    data-testid={`tab-draft-${draft.variant}`}
                  >
                    Variant {draft.variant}
                    {draft.adminDecision === "approved" && (
                      <Check className="h-3 w-3 ml-1 text-green-500" />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {item.drafts.map((draft) => (
                <TabsContent key={draft.variant} value={draft.variant} className="space-y-4 mt-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{draft.tone}</Badge>
                    {draft.includesLink && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Includes Link
                      </Badge>
                    )}
                    {draft.adminDecision !== "pending" && (
                      <Badge
                        variant={draft.adminDecision === "approved" ? "default" : "destructive"}
                      >
                        {draft.adminDecision}
                      </Badge>
                    )}
                  </div>

                  <Textarea
                    value={editedText || draft.draftText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="min-h-[200px] text-sm"
                    placeholder="Edit the draft text..."
                    data-testid="textarea-draft"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleApprove}
                      disabled={approveMutation.isPending || draft.adminDecision === "approved"}
                      data-testid="button-approve"
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => rejectMutation.mutate(draft.id)}
                      disabled={rejectMutation.isPending || draft.adminDecision === "rejected"}
                      data-testid="button-reject"
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleCopy(editedText || draft.draftText)}
                      data-testid="button-copy"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleCopy(removeLinks(editedText || draft.draftText))}
                      data-testid="button-copy-no-link"
                    >
                      <Link2Off className="h-4 w-4 mr-2" />
                      Copy w/o Links
                    </Button>
                  </div>

                  {draft.finalText && (
                    <div className="p-4 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                      <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                        Approved Final Text
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{draft.finalText}</p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {(!item.drafts || item.drafts.length === 0) && item.status !== "new" && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No drafts generated yet</p>
            {item.analysis?.recommendedAction === "draft" && (
              <p className="text-sm text-muted-foreground mt-1">
                Drafts will be generated automatically
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
