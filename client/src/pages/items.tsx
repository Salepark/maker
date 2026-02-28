import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Search, Edit, CheckCircle, Send, XCircle, Clock, Filter, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useLanguage } from "@/lib/language-provider";

interface Item {
  id: number;
  title: string;
  url: string;
  status: string;
  author: string;
  insertedAt: string;
  sourceName: string;
  relevanceScore?: number;
  replyWorthinessScore?: number;
}

interface PaginatedResponse {
  data: Item[];
  total: number;
  page: number;
  limit: number;
}

const statusIcons: Record<string, React.ReactNode> = {
  new: <Clock className="h-3 w-3" />,
  analyzed: <Search className="h-3 w-3" />,
  drafted: <Edit className="h-3 w-3" />,
  approved: <CheckCircle className="h-3 w-3" />,
  posted: <Send className="h-3 w-3" />,
  skipped: <XCircle className="h-3 w-3" />,
};

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  analyzed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  drafted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  posted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  skipped: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const PAGE_SIZE = 50;

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

export default function Items() {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  params.set("page", String(page));
  params.set("limit", String(PAGE_SIZE));
  const itemsUrl = `/api/items?${params.toString()}`;

  const { data: result, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["/api/items", statusFilter, page],
    queryFn: async () => {
      const res = await fetch(itemsUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const items = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filteredItems = items.filter((item) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.title?.toLowerCase().includes(query) ||
        item.author?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-items-title">{t("items.title")}</h1>
        <p className="text-muted-foreground">{t("items.subtitle")}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("items.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-items"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder={t("items.filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("items.allStatus")}</SelectItem>
            <SelectItem value="new">{t("items.status.new")}</SelectItem>
            <SelectItem value="analyzed">{t("items.status.analyzed")}</SelectItem>
            <SelectItem value="drafted">{t("items.status.drafted")}</SelectItem>
            <SelectItem value="approved">{t("items.status.approved")}</SelectItem>
            <SelectItem value="posted">{t("items.status.posted")}</SelectItem>
            <SelectItem value="skipped">{t("items.status.skipped")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("items.count", { count: String(total) })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredItems && filteredItems.length > 0 ? (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <Link key={item.id} href={`/items/${item.id}`}>
                  <div
                    className="p-4 rounded-md border hover:border-primary/50 hover-elevate cursor-pointer transition-colors"
                    data-testid={`card-item-${item.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm line-clamp-2">{item.title || t("common.untitled")}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                          <span>{item.sourceName}</span>
                          {item.author && <span>{t("items.by", { author: item.author })}</span>}
                          <span>{format(new Date(item.insertedAt), "MMM d, yyyy HH:mm")}</span>
                        </div>
                        {(item.relevanceScore !== undefined || item.replyWorthinessScore !== undefined) && (
                          <div className="flex items-center gap-2 mt-2">
                            {item.relevanceScore !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                {t("items.relevance", { score: String(item.relevanceScore) })}
                              </Badge>
                            )}
                            {item.replyWorthinessScore !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                {t("items.replyScore", { score: String(item.replyWorthinessScore) })}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={`${statusColors[item.status]} flex items-center gap-1 text-xs`}>
                          {statusIcons[item.status]}
                          {t(`common.status.${item.status}`)}
                        </Badge>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">{t("items.noItems")}</p>
              <p className="text-sm mt-1">
                {statusFilter !== "all"
                  ? t("items.noItemsFilter")
                  : t("items.noItemsDefault")}
              </p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    className="min-w-[36px]"
                    onClick={() => setPage(p)}
                    data-testid={`button-page-${p}`}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="ml-3 text-xs text-muted-foreground">
                {t("pagination.info", { current: String(page), total: String(totalPages) })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
