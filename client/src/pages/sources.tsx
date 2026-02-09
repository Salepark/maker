import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Rss, Plus, Trash2, RefreshCw, ExternalLink, Power, PowerOff, Shield, Globe } from "lucide-react";
import { format } from "date-fns";

interface Source {
  id: number;
  name: string;
  type: string;
  url: string;
  topic: string;
  trustLevel: string;
  region: string;
  enabled: boolean;
  createdAt: string;
  itemCount: number;
}

const sourceFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  type: z.string().default("rss"),
  topic: z.string().default("tech"),
  trustLevel: z.string().default("medium"),
  region: z.string().default("global"),
});

type SourceFormValues = z.infer<typeof sourceFormSchema>;

const TOPICS = [
  { value: "tech", label: "Tech" },
  { value: "investing", label: "Investing" },
  { value: "crypto", label: "Crypto" },
  { value: "ai_art", label: "AI Art" },
  { value: "creative", label: "Creative" },
  { value: "community_research", label: "Community Research" },
  { value: "market_brief", label: "Market Brief" },
  { value: "research_watch", label: "Research Watch" },
  { value: "competitor_watch", label: "Competitor Watch" },
  { value: "finance", label: "Finance" },
  { value: "compliance", label: "Compliance" },
  { value: "commerce", label: "Commerce" },
  { value: "engagement", label: "Engagement" },
  { value: "health", label: "Health" },
  { value: "science", label: "Science" },
  { value: "education", label: "Education" },
  { value: "content_research", label: "Content Research" },
  { value: "work_productivity", label: "Work & Productivity" },
  { value: "online_business", label: "Online Business" },
  { value: "korea_marketplace", label: "Korea Marketplace" },
  { value: "gaming", label: "Gaming" },
  { value: "sustainability", label: "Sustainability" },
  { value: "other", label: "Other" },
];

const TRUST_LEVELS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const REGIONS = [
  { value: "global", label: "Global" },
  { value: "us", label: "US" },
  { value: "crypto", label: "Crypto" },
  { value: "macro", label: "Macro" },
  { value: "asia", label: "Asia" },
];

export default function Sources() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<SourceFormValues>({
    resolver: zodResolver(sourceFormSchema),
    defaultValues: {
      name: "",
      url: "",
      type: "rss",
      topic: "tech",
      trustLevel: "medium",
      region: "global",
    },
  });

  const { data: sources, isLoading } = useQuery<Source[]>({
    queryKey: ["/api/sources"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: SourceFormValues) => {
      return apiRequest("POST", "/api/sources", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Source created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create source", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      return apiRequest("PATCH", `/api/sources/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      toast({ title: "Source deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete source", variant: "destructive" });
    },
  });

  const collectMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/sources/${id}/collect`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Collection started" });
    },
    onError: () => {
      toast({ title: "Failed to start collection", variant: "destructive" });
    },
  });

  const onSubmit = (data: SourceFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-sources-title">Sources</h1>
          <p className="text-muted-foreground">Manage RSS feeds and content sources</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-source">
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Source</DialogTitle>
              <DialogDescription>
                Add a new RSS feed to collect content from
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="My Feed"
                          {...field}
                          data-testid="input-source-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feed URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/feed.xml"
                          {...field}
                          data-testid="input-source-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="topic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Topic</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source-topic">
                              <SelectValue placeholder="Topic" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TOPICS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trustLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trust</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source-trust">
                              <SelectValue placeholder="Trust" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TRUST_LEVELS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source-region">
                              <SelectValue placeholder="Region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {REGIONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-source"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Source"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Rss className="h-5 w-5" />
            Sources ({sources?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : sources && sources.length > 0 ? (
            <div className="space-y-3">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="p-4 rounded-md border hover-elevate"
                  data-testid={`card-source-${source.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm">{source.name}</h3>
                        <Badge variant={source.enabled ? "default" : "secondary"}>
                          {source.enabled ? "Active" : "Disabled"}
                        </Badge>
                        <Badge variant="outline">{TOPICS.find(t => t.value === source.topic)?.label ?? source.topic}</Badge>
                        <Badge variant="outline">
                          <Shield className="h-3 w-3 mr-1" />
                          {source.trustLevel}
                        </Badge>
                        <Badge variant="outline">
                          <Globe className="h-3 w-3 mr-1" />
                          {source.region}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-foreground truncate max-w-[300px]"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          {source.url}
                        </a>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{source.itemCount} items collected</span>
                        <span>Created {format(new Date(source.createdAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={source.enabled}
                        onCheckedChange={(enabled) => toggleMutation.mutate({ id: source.id, enabled })}
                        data-testid={`switch-source-${source.id}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => collectMutation.mutate(source.id)}
                        disabled={collectMutation.isPending}
                        data-testid={`button-collect-${source.id}`}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-${source.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Source</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{source.name}"? This will not delete collected items.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(source.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Rss className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No sources added</p>
              <p className="text-sm mt-1">Add an RSS feed to start collecting content</p>
              <Button
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
                data-testid="button-add-first-source"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Source
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
