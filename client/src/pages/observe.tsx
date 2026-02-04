import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ExternalLink, TrendingUp, Eye, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface ObserveItem {
  id: number;
  title: string;
  url: string;
  sourceName: string;
  status: string;
  publishedAt: string;
  relevanceScore: number;
  replyWorthinessScore: number;
  category: string;
  summaryShort: string;
}

export default function Observe() {
  const { data: items, isLoading } = useQuery<ObserveItem[]>({
    queryKey: ["/api/items/observe"],
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-observe-title">
          <Eye className="h-6 w-6" />
          Observe List
        </h1>
        <p className="text-muted-foreground">
          High relevance but low reply worthiness - useful for market research and content ideas
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !items?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No items to observe</h3>
            <p className="text-muted-foreground mt-1">
              Items with high relevance but low reply worthiness will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="hover-elevate" data-testid={`card-observe-${item.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base line-clamp-2">
                      {item.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <span>{item.sourceName}</span>
                      <span>•</span>
                      <span>{format(new Date(item.publishedAt), "MMM d, HH:mm")}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="whitespace-nowrap">
                      {item.category}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.summaryShort}
                </p>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Relevance: {item.relevanceScore}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>Reply: {item.replyWorthinessScore}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild data-testid={`button-view-original-${item.id}`}>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Original
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" asChild data-testid={`button-details-${item.id}`}>
                    <Link href={`/items/${item.id}`}>
                      <ArrowRight className="h-3 w-3 mr-1" />
                      Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
