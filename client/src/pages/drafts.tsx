import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Edit, ThumbsUp, ThumbsDown, Copy, Check, ExternalLink, Filter } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { useLanguage } from "@/lib/language-provider";

interface DraftItem {
  id: number;
  itemId: number;
  variant: string;
  draftText: string;
  includesLink: boolean;
  tone: string;
  adminDecision: string;
  finalText?: string;
  createdAt: string;
  itemTitle: string;
  itemUrl: string;
  sourceName: string;
}

const decisionColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function Drafts() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [decisionFilter, setDecisionFilter] = useState<string>("pending");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const draftsUrl = decisionFilter === "all" 
    ? "/api/drafts" 
    : `/api/drafts?decision=${decisionFilter}`;
  
  const { data: drafts, isLoading } = useQuery<DraftItem[]>({
    queryKey: [draftsUrl],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ draftId, finalText }: { draftId: number; finalText: string }) => {
      return apiRequest("POST", `/api/drafts/${draftId}/approve`, { finalText });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        Boolean(query.queryKey[0]?.toString().startsWith("/api/drafts"))
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: t("drafts.approved") });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (draftId: number) => {
      return apiRequest("POST", `/api/drafts/${draftId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        Boolean(query.queryKey[0]?.toString().startsWith("/api/drafts"))
      });
      toast({ title: t("drafts.rejected") });
    },
  });

  const handleCopy = async (draft: DraftItem) => {
    await navigator.clipboard.writeText(draft.draftText);
    setCopiedId(draft.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: t("drafts.copiedToClipboard") });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-drafts-title">{t("drafts.title")}</h1>
        <p className="text-muted-foreground">{t("drafts.subtitle")}</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={decisionFilter} onValueChange={setDecisionFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-decision-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder={t("drafts.filterDecision")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("drafts.allDecisions")}</SelectItem>
            <SelectItem value="pending">{t("drafts.decision.pending")}</SelectItem>
            <SelectItem value="approved">{t("drafts.decision.approved")}</SelectItem>
            <SelectItem value="rejected">{t("drafts.decision.rejected")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Edit className="h-5 w-5" />
            {t("drafts.count", { count: String(drafts?.length ?? 0) })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : drafts && drafts.length > 0 ? (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="p-4 rounded-md border hover-elevate"
                  data-testid={`card-draft-${draft.id}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/items/${draft.itemId}`}>
                        <h3 className="font-medium text-sm line-clamp-1 hover:underline cursor-pointer">
                          {draft.itemTitle || t("common.untitled")}
                        </h3>
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{draft.sourceName}</span>
                        <span>{t("drafts.variant", { variant: draft.variant })}</span>
                        <span>{format(new Date(draft.createdAt), "MMM d, HH:mm")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={decisionColors[draft.adminDecision]}>
                        {t(`common.decision.${draft.adminDecision}`)}
                      </Badge>
                      <Badge variant="outline">{draft.tone}</Badge>
                      {draft.includesLink && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap line-clamp-4 mb-3">
                    {draft.draftText}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {draft.adminDecision === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate({ draftId: draft.id, finalText: draft.draftText })}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${draft.id}`}
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          {t("drafts.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectMutation.mutate(draft.id)}
                          disabled={rejectMutation.isPending}
                          data-testid={`button-reject-${draft.id}`}
                        >
                          <ThumbsDown className="h-3 w-3 mr-1" />
                          {t("drafts.reject")}
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(draft)}
                      data-testid={`button-copy-${draft.id}`}
                    >
                      {copiedId === draft.id ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {t("drafts.copy")}
                    </Button>
                    <Link href={`/items/${draft.itemId}`}>
                      <Button size="sm" variant="ghost" data-testid={`button-view-item-${draft.id}`}>
                        {t("drafts.viewItem")}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Edit className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">{t("drafts.noDrafts")}</p>
              <p className="text-sm mt-1">
                {decisionFilter !== "all"
                  ? t("drafts.noDraftsFilter")
                  : t("drafts.noDraftsDefault")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
