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
import { FileText, Search, Edit, CheckCircle, Send, XCircle, Clock, Filter, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

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

export default function Items() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const itemsUrl = statusFilter === "all" 
    ? "/api/items" 
    : `/api/items?status=${statusFilter}`;
  
  const { data: items, isLoading } = useQuery<Item[]>({
    queryKey: [itemsUrl],
  });

  const filteredItems = items?.filter((item) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.title?.toLowerCase().includes(query) ||
        item.author?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-items-title">Items</h1>
        <p className="text-muted-foreground">Collected content from RSS feeds</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-items"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="analyzed">Analyzed</SelectItem>
            <SelectItem value="drafted">Drafted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Items ({filteredItems?.length ?? 0})
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
                        <h3 className="font-medium text-sm line-clamp-2">{item.title || "Untitled"}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                          <span>{item.sourceName}</span>
                          {item.author && <span>by {item.author}</span>}
                          <span>{format(new Date(item.insertedAt), "MMM d, yyyy HH:mm")}</span>
                        </div>
                        {(item.relevanceScore !== undefined || item.replyWorthinessScore !== undefined) && (
                          <div className="flex items-center gap-2 mt-2">
                            {item.relevanceScore !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                Relevance: {item.relevanceScore}
                              </Badge>
                            )}
                            {item.replyWorthinessScore !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                Reply Score: {item.replyWorthinessScore}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={`${statusColors[item.status]} flex items-center gap-1 text-xs`}>
                          {statusIcons[item.status]}
                          {item.status}
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
              <p className="text-lg font-medium">No items found</p>
              <p className="text-sm mt-1">
                {statusFilter !== "all"
                  ? "Try changing the status filter"
                  : "Add RSS sources to start collecting content"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
