import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Plus, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface RuleMemory {
  id: number;
  userId: string;
  scope: string;
  scopeId: number | null;
  key: string;
  valueJson: any;
  createdAt: string;
  updatedAt: string;
}

const PRESET_KEYS = [
  "REPORT_TONE",
  "SUMMARY_LENGTH",
  "LANGUAGE_PREF",
  "EXCLUDE_KEYWORDS",
  "FOCUS_TOPICS",
  "CUSTOM",
];

interface MemoryCardProps {
  botId: number;
  t: (key: string) => string;
  language: string;
}

export function MemoryCard({ botId, t, language }: MemoryCardProps) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [showEffective, setShowEffective] = useState(false);
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editScope, setEditScope] = useState<"bot" | "global">("bot");

  const { data: botRules = [], isLoading: loadingBot } = useQuery<RuleMemory[]>({
    queryKey: ["/api/memory/rules", "bot", botId],
    queryFn: () => fetch(`/api/memory/rules?scope=bot&scopeId=${botId}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: globalRules = [] } = useQuery<RuleMemory[]>({
    queryKey: ["/api/memory/rules", "global"],
    queryFn: () => fetch(`/api/memory/rules?scope=global`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: effectiveRules } = useQuery<Record<string, any>>({
    queryKey: ["/api/memory/rules/effective", botId],
    queryFn: () => fetch(`/api/memory/rules/effective?botId=${botId}`, { credentials: "include" }).then(r => r.json()),
    enabled: showEffective,
  });

  const upsertMutation = useMutation({
    mutationFn: (data: { scope: string; scopeId: number | null; key: string; value: any }) =>
      apiRequest("PUT", "/api/memory/rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memory/rules"] });
      toast({ title: t("memory.saved") });
      setIsAdding(false);
      setEditKey("");
      setEditValue("");
    },
    onError: () => {
      toast({ title: t("memory.saveFailed"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (data: { scope: string; scopeId: number | null; key: string }) =>
      apiRequest("DELETE", "/api/memory/rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memory/rules"] });
      toast({ title: t("memory.deleted") });
    },
    onError: () => {
      toast({ title: t("memory.deleteFailed"), variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!editKey.trim()) return;
    let parsedValue: any = editValue;
    try {
      parsedValue = JSON.parse(editValue);
    } catch {
      // keep as string
    }
    upsertMutation.mutate({
      scope: editScope,
      scopeId: editScope === "bot" ? botId : null,
      key: editKey.trim().toUpperCase(),
      value: parsedValue,
    });
  };

  const handleDelete = (rule: RuleMemory) => {
    if (!confirm(t("memory.deleteConfirm"))) return;
    deleteMutation.mutate({
      scope: rule.scope,
      scopeId: rule.scopeId,
      key: rule.key,
    });
  };

  const handleEdit = (rule: RuleMemory) => {
    setEditKey(rule.key);
    setEditValue(typeof rule.valueJson === "string" ? rule.valueJson : JSON.stringify(rule.valueJson, null, 2));
    setEditScope(rule.scope as "bot" | "global");
    setIsAdding(true);
  };

  const safeBotRules = Array.isArray(botRules) ? botRules : [];
  const safeGlobalRules = Array.isArray(globalRules) ? globalRules : [];
  const allRules = [
    ...safeBotRules.map(r => ({ ...r, _source: "bot" as const })),
    ...safeGlobalRules.map(r => ({ ...r, _source: "global" as const })),
  ];

  const ruleKeyLabel = (key: string) => {
    const i18nKey = `memory.presetKeys.${key}`;
    const translated = t(i18nKey);
    return translated !== i18nKey ? translated : key;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t("memory.title")}
          </CardTitle>
          <CardDescription className="mt-1">
            {t("memory.subtitle")}
          </CardDescription>
        </div>
        <div className="flex items-center gap-1">
          {allRules.length > 0 && (
            <Badge variant="secondary" data-testid="badge-rule-count">
              {t("memory.ruleCount").replace("{{count}}", String(allRules.length))}
            </Badge>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => { setIsAdding(!isAdding); setEditKey(""); setEditValue(""); }}
            data-testid="button-add-rule"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {isAdding && (
          <div className="grid gap-3 p-3 rounded-md border" data-testid="form-add-rule">
            <div className="grid gap-2">
              <Label>{t("memory.key")}</Label>
              <Select value={PRESET_KEYS.includes(editKey) ? editKey : "CUSTOM"} onValueChange={(v) => setEditKey(v === "CUSTOM" ? editKey : v)}>
                <SelectTrigger data-testid="select-rule-key">
                  <SelectValue placeholder={t("memory.keyPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>{ruleKeyLabel(k)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!PRESET_KEYS.includes(editKey) || editKey === "CUSTOM") && (
                <Input
                  value={editKey === "CUSTOM" ? "" : editKey}
                  onChange={(e) => setEditKey(e.target.value)}
                  placeholder={t("memory.keyPlaceholder")}
                  data-testid="input-custom-key"
                />
              )}
            </div>
            <div className="grid gap-2">
              <Label>{t("memory.value")}</Label>
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={t("memory.valuePlaceholder")}
                rows={3}
                data-testid="input-rule-value"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={editScope} onValueChange={(v) => setEditScope(v as "bot" | "global")}>
                <SelectTrigger className="w-32" data-testid="select-rule-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bot">{t("memory.scope.bot")}</SelectItem>
                  <SelectItem value="global">{t("memory.scope.global")}</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground flex-1">
                {editScope === "global" ? t("memory.globalLabel") : t("memory.botLabel")}
              </span>
              <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending || !editKey.trim()} data-testid="button-save-rule">
                {upsertMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {t("memory.addRule")}
              </Button>
            </div>
          </div>
        )}

        {loadingBot ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : allRules.length === 0 && !isAdding ? (
          <div className="text-center py-4" data-testid="text-memory-empty">
            <p className="text-sm text-muted-foreground">{t("memory.empty")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("memory.emptyHint")}</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {allRules.map((rule) => (
              <div
                key={`${rule.scope}-${rule.key}`}
                className="flex items-start justify-between gap-2 p-2 rounded-md border"
                data-testid={`rule-item-${rule.key}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium">{ruleKeyLabel(rule.key)}</span>
                    <Badge variant="secondary">
                      {t(`memory.scope.${rule._source}`)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 break-words">
                    {typeof rule.valueJson === "string" ? rule.valueJson : JSON.stringify(rule.valueJson)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(rule)}
                    data-testid={`button-edit-rule-${rule.key}`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(rule)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-rule-${rule.key}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-1"
          onClick={() => setShowEffective(!showEffective)}
          data-testid="button-toggle-effective"
        >
          {showEffective ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {t("memory.effectiveRules")}
        </Button>

        {showEffective && effectiveRules && (
          <div className="p-3 rounded-md border" data-testid="panel-effective-rules">
            <p className="text-xs text-muted-foreground mb-2">{t("memory.effectiveHint")}</p>
            {Object.entries(effectiveRules).length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("memory.empty")}</p>
            ) : (
              <div className="grid gap-1">
                {Object.entries(effectiveRules).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="font-medium">{ruleKeyLabel(key)}:</span>
                    <span className="text-muted-foreground break-words">
                      {typeof val === "string" ? val : JSON.stringify(val)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
