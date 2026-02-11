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
import { useLanguage } from "@/lib/language-provider";

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

const TOPIC_VALUES = [
  "tech", "investing", "crypto", "ai_art", "creative", "community_research",
  "market_brief", "research_watch", "competitor_watch", "finance", "compliance",
  "commerce", "engagement", "health", "science", "education", "content_research",
  "work_productivity", "online_business", "korea_marketplace", "gaming",
  "sustainability", "other",
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
  const { t } = useLanguage();
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
      toast({ title: t("sources.created") });
    },
    onError: () => {
      toast({ title: t("sources.createFailed"), variant: "destructive" });
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
      toast({ title: t("sources.deleted") });
    },
    onError: () => {
      toast({ title: t("sources.deleteFailed"), variant: "destructive" });
    },
  });

  const collectMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/sources/${id}/collect`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: t("sources.collectionStarted") });
    },
    onError: () => {
      toast({ title: t("sources.collectionFailed"), variant: "destructive" });
    },
  });

  const onSubmit = (data: SourceFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-sources-title">{t("sources.title")}</h1>
          <p className="text-muted-foreground">{t("sources.subtitle")}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-source">
              <Plus className="h-4 w-4 mr-2" />
              {t("sources.addSource")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("sources.dialog.title")}</DialogTitle>
              <DialogDescription>
                {t("sources.dialog.desc")}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("sources.dialog.name")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("sources.dialog.namePlaceholder")}
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
                      <FormLabel>{t("sources.dialog.feedUrl")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("sources.dialog.feedUrlPlaceholder")}
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
                        <FormLabel>{t("sources.dialog.topic")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source-topic">
                              <SelectValue placeholder={t("sources.dialog.topic")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TOPIC_VALUES.map((tv) => (
                              <SelectItem key={tv} value={tv}>{t(`sources.topic.${tv}`)}</SelectItem>
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
                        <FormLabel>{t("sources.dialog.trust")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source-trust">
                              <SelectValue placeholder={t("sources.dialog.trust")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TRUST_LEVELS.map((tl) => (
                              <SelectItem key={tl.value} value={tl.value}>{tl.label}</SelectItem>
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
                        <FormLabel>{t("sources.dialog.region")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source-region">
                              <SelectValue placeholder={t("sources.dialog.region")} />
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
                    {createMutation.isPending ? t("sources.dialog.creating") : t("sources.dialog.create")}
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
            {t("sources.title")} ({sources?.length ?? 0})
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
                          {source.enabled ? t("sources.active") : t("sources.disabled")}
                        </Badge>
                        <Badge variant="outline">{t(`sources.topic.${source.topic}`)}</Badge>
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
                        <span>{t("sources.itemsCollected", { count: source.itemCount })}</span>
                        <span>{t("sources.created2", { date: format(new Date(source.createdAt), "MMM d, yyyy") })}</span>
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
                            <AlertDialogTitle>{t("sources.delete.title")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("sources.delete.desc", { name: source.name })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("sources.delete.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(source.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t("sources.delete.confirm")}
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
              <p className="text-lg font-medium">{t("sources.noSources")}</p>
              <p className="text-sm mt-1">{t("sources.noSourcesHint")}</p>
              <Button
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
                data-testid="button-add-first-source"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("sources.addFirst")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
