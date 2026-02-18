import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageCircle, Send, Loader2, Bot, User, Check, X, Zap, CheckCircle2, AlertCircle,
  Lightbulb, Clock, Rocket, ArrowRight, ChevronDown,
  Search, Users, Target, MessageSquare, BarChart3, Eye, ShieldCheck,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";
import type { MessageKind } from "@shared/chatCommand";

interface ChatThread {
  id: number;
  userId: string;
  title: string | null;
  activeBotId: number | null;
  createdAt: string;
}

interface ChatMessage {
  id: number;
  threadId: number | null;
  userId: string;
  role: "user" | "assistant";
  contentText: string;
  kind?: MessageKind;
  commandJson?: any;
  resultJson?: any;
  status?: string;
  createdAt: string;
}

interface ActiveBotInfo {
  id: number;
  key: string;
  name: string;
}

interface ConsoleContext {
  botCount: number;
  activeBotId: number | null;
  activeBotName: string | null;
  activeBotTopic: string | null;
  sourceCount: number;
  lastCollectedAt: string | null;
  scheduleRule: string | null;
  scheduleTimeLocal: string | null;
  isEnabled: boolean;
  hasLlmProvider: boolean;
  hasUserProviders: boolean;
}

type ConsoleState = "S0_NO_BOT" | "S1_NO_SOURCES" | "S2_NO_COLLECTION" | "S3_READY" | "S4_SCHEDULE_ISSUE";

type HintCategory = "first_run" | "schedule";
type BotHintCategory = "research" | "outreach" | "contribution" | "analysis" | "monitor" | "safety_promo";

interface Hint {
  key: string;
  category: HintCategory;
  states: ConsoleState[];
}

interface BotHint {
  key: string;
  category: BotHintCategory;
}

const CATEGORY_ICONS: Record<HintCategory, typeof Lightbulb> = {
  first_run: Rocket,
  schedule: Clock,
};

const CATEGORY_LABEL_KEYS: Record<HintCategory, string> = {
  first_run: "chat.category.firstRun",
  schedule: "chat.category.schedule",
};

const BOT_HINT_CATEGORY_ICONS: Record<BotHintCategory, typeof Lightbulb> = {
  research: Search,
  outreach: Target,
  contribution: MessageSquare,
  analysis: BarChart3,
  monitor: Eye,
  safety_promo: ShieldCheck,
};

const BOT_HINT_CATEGORY_LABEL_KEYS: Record<BotHintCategory, string> = {
  research: "chat.botCategory.research",
  outreach: "chat.botCategory.outreach",
  contribution: "chat.botCategory.contribution",
  analysis: "chat.botCategory.analysis",
  monitor: "chat.botCategory.monitor",
  safety_promo: "chat.botCategory.safetyPromo",
};

const COMMUNITY_RESEARCH_HINTS: BotHint[] = [
  { key: "chat.botHint.collectCommunity", category: "research" },
  { key: "chat.botHint.findRedditNeeds", category: "research" },
  { key: "chat.botHint.collectComplaints", category: "research" },
  { key: "chat.botHint.analyzePatterns", category: "research" },

  { key: "chat.botHint.organizeInvestor", category: "outreach" },
  { key: "chat.botHint.collectQuestions", category: "outreach" },
  { key: "chat.botHint.summarizeProblems", category: "outreach" },

  { key: "chat.botHint.draftContribution", category: "contribution" },
  { key: "chat.botHint.draftAutomationTip", category: "contribution" },
  { key: "chat.botHint.draftRssTip", category: "contribution" },

  { key: "chat.botHint.analyzeTrends", category: "analysis" },
  { key: "chat.botHint.analyzeDemand", category: "analysis" },
  { key: "chat.botHint.analyzePersonas", category: "analysis" },

  { key: "chat.botHint.monitorReddit", category: "monitor" },
  { key: "chat.botHint.trackCompetitors", category: "monitor" },
  { key: "chat.botHint.dailyBriefing", category: "monitor" },

  { key: "chat.botHint.noPromotion", category: "safety_promo" },
  { key: "chat.botHint.authenticOnly", category: "safety_promo" },
  { key: "chat.botHint.noLinksNoBrand", category: "safety_promo" },
];

const BOT_SPECIFIC_HINTS: Record<string, BotHint[]> = {
  content_research: COMMUNITY_RESEARCH_HINTS,
};

const ALL_HINTS: Hint[] = [
  { key: "chat.hint.listBots", category: "first_run", states: ["S0_NO_BOT"] },
  { key: "chat.hint.switchBot", category: "first_run", states: ["S0_NO_BOT"] },
  { key: "chat.hint.checkSetup", category: "first_run", states: ["S0_NO_BOT", "S1_NO_SOURCES", "S4_SCHEDULE_ISSUE"] },

  { key: "chat.hint.addDefaultSources", category: "first_run", states: ["S1_NO_SOURCES"] },
  { key: "chat.hint.addSourceUrl", category: "first_run", states: ["S1_NO_SOURCES"] },

  { key: "chat.hint.botStatus", category: "first_run", states: ["S2_NO_COLLECTION", "S3_READY"] },
  { key: "chat.hint.quickSummary", category: "first_run", states: ["S3_READY"] },
  { key: "chat.hint.statusBriefing", category: "first_run", states: ["S3_READY"] },

  { key: "chat.hint.scheduleDailyNine", category: "schedule", states: ["S2_NO_COLLECTION", "S3_READY"] },
  { key: "chat.hint.changeScheduleEight", category: "schedule", states: ["S3_READY", "S4_SCHEDULE_ISSUE"] },
  { key: "chat.hint.weekdaysOnly", category: "schedule", states: ["S3_READY"] },

  { key: "chat.hint.checkReportIssue", category: "first_run", states: ["S4_SCHEDULE_ISSUE"] },
  { key: "chat.hint.nextRunTime", category: "schedule", states: ["S4_SCHEDULE_ISSUE"] },

  { key: "chat.hint.whatNext", category: "first_run", states: ["S0_NO_BOT", "S1_NO_SOURCES", "S2_NO_COLLECTION", "S3_READY", "S4_SCHEDULE_ISSUE"] },
  { key: "chat.hint.pauseBot", category: "first_run", states: ["S3_READY"] },
];

function computeConsoleState(ctx: ConsoleContext | undefined): ConsoleState {
  if (!ctx) return "S0_NO_BOT";
  if (ctx.botCount === 0 || !ctx.activeBotId) return "S0_NO_BOT";
  if (ctx.sourceCount === 0) return "S1_NO_SOURCES";
  if (!ctx.lastCollectedAt) return "S2_NO_COLLECTION";
  const lastCollect = new Date(ctx.lastCollectedAt);
  const hoursSince = (Date.now() - lastCollect.getTime()) / (1000 * 60 * 60);
  if (hoursSince > 48) return "S2_NO_COLLECTION";
  if (!ctx.hasLlmProvider || !ctx.isEnabled || !ctx.scheduleRule || !ctx.scheduleTimeLocal) return "S4_SCHEDULE_ISSUE";
  return "S3_READY";
}

function getStateMessage(state: ConsoleState, t: (key: string) => string): string {
  switch (state) {
    case "S0_NO_BOT": return t("chat.state.noBot");
    case "S1_NO_SOURCES": return t("chat.state.noSources");
    case "S2_NO_COLLECTION": return t("chat.state.noCollection");
    case "S3_READY": return t("chat.state.ready");
    case "S4_SCHEDULE_ISSUE": return t("chat.state.scheduleIssue");
  }
}

function getPlaceholder(state: ConsoleState, t: (key: string) => string): string {
  switch (state) {
    case "S0_NO_BOT": return t("chat.placeholder.noBot");
    case "S1_NO_SOURCES": return t("chat.placeholder.noSources");
    case "S2_NO_COLLECTION": return t("chat.placeholder.noCollection");
    case "S3_READY": return t("chat.placeholder.ready");
    case "S4_SCHEDULE_ISSUE": return t("chat.placeholder.scheduleIssue");
  }
}

function getHintsForState(state: ConsoleState): Hint[] {
  return ALL_HINTS.filter(h => h.states.includes(state));
}

function getPipelineStepLabel(step: string, t: (key: string) => string): string {
  switch (step) {
    case "start": return t("chat.pipeline.start");
    case "collect": return t("chat.pipeline.collect");
    case "analyze": return t("chat.pipeline.analyze");
    case "report": return t("chat.pipeline.report");
    case "schedule": return t("chat.pipeline.schedule");
    case "timeout": return t("chat.pipeline.timeout");
    default: return step;
  }
}

function getPipelineProgressLabel(completedSteps: string[], ko: boolean): string {
  const last = completedSteps[completedSteps.length - 1];
  if (!last) return ko ? "자료 수집 중..." : "Collecting data...";
  switch (last) {
    case "start": return ko ? "자료 수집 중..." : "Collecting data...";
    case "schedule": return ko ? "자료 수집 중..." : "Collecting data...";
    case "collect": return ko ? "브리핑 생성 중..." : "Generating briefing...";
    case "analyze": return ko ? "브리핑 생성 중..." : "Generating briefing...";
    case "report": return ko ? "마무리 중..." : "Finishing up...";
    case "timeout": return ko ? "완료" : "Done";
    default: return ko ? "처리 중..." : "Processing...";
  }
}

function ConfirmButtons({
  messageId,
  onConfirm,
  onCancel,
  isPending,
}: {
  messageId: number;
  onConfirm: (id: number) => void;
  onCancel: (id: number) => void;
  isPending: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex gap-2 mt-2">
      <Button
        size="sm"
        onClick={() => onConfirm(messageId)}
        disabled={isPending}
        data-testid={`button-confirm-${messageId}`}
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
        {t("chat.confirm")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onCancel(messageId)}
        disabled={isPending}
        data-testid={`button-cancel-${messageId}`}
      >
        <X className="h-3 w-3 mr-1" />
        {t("chat.cancel")}
      </Button>
    </div>
  );
}

function MessageBubble({
  message,
  onConfirm,
  onCancel,
  isConfirming,
}: {
  message: ChatMessage;
  onConfirm: (id: number) => void;
  onCancel: (id: number) => void;
  isConfirming: boolean;
}) {
  const { t } = useLanguage();
  const isUser = message.role === "user";
  const isPending = message.status === "pending_confirm";
  const kind = message.kind || "text";

  return (
    <div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
      data-testid={`message-${message.id}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.contentText}</p>
        {kind === "command_result" && message.commandJson && (
          <Badge variant="outline" className="mt-2 text-xs">
            {message.commandJson.type === "pipeline_step" ? (
              <span className="flex items-center gap-1">
                {message.resultJson?.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {getPipelineStepLabel(message.commandJson.step, t)}
              </span>
            ) : message.commandJson.type === "pipeline_run" ? (
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Pipeline
              </span>
            ) : (
              message.commandJson.type || message.commandJson.action
            )}
          </Badge>
        )}
        {kind === "pending_command" && isPending && (
          <div>
            <Badge variant="secondary" className="mt-2 text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {message.commandJson?.type}
            </Badge>
            <ConfirmButtons
              messageId={message.id}
              onConfirm={onConfirm}
              onCancel={onCancel}
              isPending={isConfirming}
            />
          </div>
        )}
        {!kind && message.commandJson && !isPending && (
          <Badge variant="outline" className="mt-2 text-xs">
            {message.commandJson.type}
          </Badge>
        )}
      </div>
    </div>
  );
}

function HintChip({ hint, onClick, location, index }: { hint: Hint; onClick: (text: string) => void; location: string; index: number }) {
  const Icon = CATEGORY_ICONS[hint.category];
  const { t } = useLanguage();
  const text = t(hint.key);
  return (
    <button
      type="button"
      className="flex items-center gap-2 px-3 py-2 text-left text-sm rounded-md bg-muted/50 hover-elevate active-elevate-2 transition-colors w-full"
      onClick={() => onClick(text)}
      data-testid={`hint-chip-${location}-${index}`}
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{text}</span>
    </button>
  );
}

function BotHintChip({ hint, onClick, index }: { hint: BotHint; onClick: (text: string) => void; index: number }) {
  const Icon = BOT_HINT_CATEGORY_ICONS[hint.category];
  const { t } = useLanguage();
  const text = t(hint.key);
  return (
    <button
      type="button"
      className="flex items-center gap-2 px-3 py-2 text-left text-sm rounded-md bg-muted/50 hover-elevate active-elevate-2 transition-colors w-full"
      onClick={() => onClick(text)}
      data-testid={`bot-hint-chip-${index}`}
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{text}</span>
    </button>
  );
}

function OnboardingView({
  state,
  hints,
  onHintClick,
}: {
  state: ConsoleState;
  hints: Hint[];
  onHintClick: (text: string) => void;
}) {
  const { t } = useLanguage();
  const topHints = hints.slice(0, 6);
  const stateMsg = getStateMessage(state, t);

  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-6">
          <Lightbulb className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium" data-testid="text-onboarding-title">
            {stateMsg}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("chat.onboardingSubtitle")}
          </p>
        </div>

        <div className="space-y-2" data-testid="onboarding-hints">
          {topHints.map((hint, i) => (
            <HintChip key={i} hint={hint} onClick={onHintClick} location="onboarding" index={i} />
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Type anything in plain language — Korean or English
          </p>
        </div>
      </div>
    </div>
  );
}

function HintDropdown({
  hints,
  visible,
  onSelect,
}: {
  hints: Hint[];
  visible: boolean;
  onSelect: (text: string) => void;
}) {
  const { t } = useLanguage();
  const grouped = hints.reduce((acc, h) => {
    if (!acc[h.category]) acc[h.category] = [];
    acc[h.category].push(h);
    return acc;
  }, {} as Record<HintCategory, Hint[]>);

  const categories = Object.keys(grouped) as HintCategory[];

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-md shadow-md max-h-72 overflow-y-auto z-50"
      style={{ visibility: visible && hints.length > 0 ? "visible" : "hidden" }}
      data-testid="hint-dropdown"
    >
      {categories.map(cat => (
        <div key={cat}>
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5 sticky top-0 bg-card border-b border-border">
            {(() => { const Icon = CATEGORY_ICONS[cat]; return <Icon className="h-3 w-3" />; })()}
            {t(CATEGORY_LABEL_KEYS[cat])}
          </div>
          {grouped[cat].map((hint, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover-elevate active-elevate-2 transition-colors"
              onClick={() => onSelect(t(hint.key))}
              data-testid={`hint-option-${cat}-${i}`}
            >
              {t(hint.key)}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Chat() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [threadId, setThreadId] = useState<number | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hintDropdownRef = useRef<HTMLDivElement>(null);

  const { data: threads, isLoading: threadsLoading } = useQuery<ChatThread[]>({
    queryKey: ["/api/chat/threads"],
  });

  useEffect(() => {
    if (threads && threads.length > 0 && !threadId) {
      setThreadId(threads[0].id);
    }
  }, [threads, threadId]);

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chat/threads", {});
      return res.json();
    },
    onSuccess: (data: ChatThread) => {
      setThreadId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads"] });
    },
  });

  useEffect(() => {
    if (threads && threads.length === 0 && !createThreadMutation.isPending) {
      createThreadMutation.mutate();
    }
  }, [threads]);

  const { data: messages, isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/threads", threadId, "messages"],
    queryFn: async () => {
      if (!threadId) return [];
      const res = await fetch(`/api/chat/threads/${threadId}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    enabled: !!threadId,
    refetchInterval: pipelineRunning ? 1500 : 5000,
  });

  const [pipelineStartTime, setPipelineStartTime] = useState<number | null>(null);
  const [pipelineElapsed, setPipelineElapsed] = useState(0);
  const [lastProgressTime, setLastProgressTime] = useState<number>(0);
  const isKo = useMemo(() => {
    try { return t("chat.title") !== "Console"; } catch { return false; }
  }, [t]);

  const pipelineProgressText = useMemo(() => {
    if (!pipelineRunning || !messages) return isKo ? "준비 중..." : "Preparing...";
    const completedSteps: string[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.commandJson?.type === "pipeline_step" && m.resultJson?.ok) {
        completedSteps.unshift(m.commandJson.step);
      }
      if (m.commandJson?.type === "pipeline_run" && m.kind !== "command_result") break;
    }
    return getPipelineProgressLabel(completedSteps, isKo);
  }, [messages, pipelineRunning, isKo]);

  const endPipeline = () => {
    setPipelineRunning(false);
    setPipelineStartTime(null);
    setLastProgressTime(0);
    setPipelineElapsed(0);
  };

  useEffect(() => {
    if (pipelineRunning && messages && messages.length > 0) {
      const recentMsgs = messages.slice(-8);
      const hasFinalPipelineMsg = recentMsgs.some(
        m => m.commandJson?.type === "pipeline_run" && m.kind === "command_result"
      );
      const hasTimeoutStep = recentMsgs.some(
        m => m.commandJson?.type === "pipeline_step" && m.commandJson?.step === "timeout"
      );
      const hasFailedStep = recentMsgs.some(
        m => m.commandJson?.type === "pipeline_step" && m.resultJson?.ok === false
      );
      if (hasFinalPipelineMsg || hasTimeoutStep || hasFailedStep) {
        endPipeline();
      }
    }
  }, [messages, pipelineRunning]);

  useEffect(() => {
    if (!pipelineRunning || !messages) return;
    const pipelineMsgs = messages.filter(
      m => m.commandJson?.type === "pipeline_step" || m.commandJson?.type === "pipeline_run"
    );
    if (pipelineMsgs.length > 0) {
      const lastMsg = pipelineMsgs[pipelineMsgs.length - 1];
      const ts = new Date(lastMsg.createdAt).getTime();
      if (ts > lastProgressTime) {
        setLastProgressTime(ts);
      }
    }
  }, [messages, pipelineRunning]);

  useEffect(() => {
    if (!pipelineRunning) return;
    const STALL_THRESHOLD_MS = 60_000;
    const interval = setInterval(() => {
      if (lastProgressTime > 0) {
        const stallDuration = Date.now() - lastProgressTime;
        if (stallDuration > STALL_THRESHOLD_MS) {
          endPipeline();
          toast({
            title: isKo ? "파이프라인 완료" : "Pipeline finished",
            description: isKo
              ? "리포트 생성이 백그라운드에서 계속됩니다. Reports 페이지에서 확인하세요."
              : "Report generation continues in the background. Check the Reports page.",
          });
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [pipelineRunning, lastProgressTime, isKo, toast]);

  useEffect(() => {
    if (!pipelineRunning) return;
    const timeout = setTimeout(() => {
      endPipeline();
      toast({
        title: isKo ? "시간 초과" : "Timed out",
        description: isKo
          ? "파이프라인이 시간 초과되었습니다. Reports 페이지에서 결과를 확인하세요."
          : "Pipeline timed out. Check the Reports page for any results.",
      });
    }, 130_000);
    return () => clearTimeout(timeout);
  }, [pipelineRunning, isKo, toast]);

  useEffect(() => {
    if (!pipelineRunning) {
      setPipelineElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      if (pipelineStartTime) {
        setPipelineElapsed(Math.floor((Date.now() - pipelineStartTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pipelineRunning, pipelineStartTime]);

  const currentThread = threads?.find(t => t.id === threadId);
  const currentActiveBotId = currentThread?.activeBotId ?? null;

  const { data: activeBotInfo } = useQuery<ActiveBotInfo | null>({
    queryKey: ["/api/chat/threads", threadId, "activeBot", currentActiveBotId],
    queryFn: async () => {
      if (!threadId || !currentActiveBotId) return null;
      const res = await fetch("/api/bots", { credentials: "include" });
      if (!res.ok) return null;
      const bots = await res.json();
      return bots.find((b: any) => b.id === currentActiveBotId) || null;
    },
    enabled: !!threadId && !!currentActiveBotId,
  });

  const { data: consoleContext } = useQuery<ConsoleContext>({
    queryKey: ["/api/console/context", threadId],
    queryFn: async () => {
      const url = threadId
        ? `/api/console/context?threadId=${threadId}`
        : "/api/console/context";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load context");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const consoleState = useMemo(() => computeConsoleState(consoleContext), [consoleContext]);
  const stateHints = useMemo(() => getHintsForState(consoleState), [consoleState]);
  const placeholderText = useMemo(() => getPlaceholder(consoleState, t), [consoleState, t]);

  const activeBotTopic = consoleContext?.activeBotTopic ?? null;
  const botSpecificHints = useMemo(() => {
    if (!activeBotTopic) return null;
    return BOT_SPECIFIC_HINTS[activeBotTopic] ?? null;
  }, [activeBotTopic]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (hintDropdownRef.current && !hintDropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowHints(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!threadId) throw new Error("No thread");
      const res = await apiRequest("POST", `/api/chat/threads/${threadId}/message`, { text });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", threadId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/console/context", threadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", threadId, "activeBot"] });
    },
    onError: (error: any) => {
      toast({
        title: t("chat.executionFailed"),
        description: error.message || t("chat.errorOccurred"),
        variant: "destructive",
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ pendingMessageId, approve }: { pendingMessageId: number; approve: boolean }) => {
      if (!threadId) throw new Error("No thread");
      const res = await apiRequest("POST", `/api/chat/threads/${threadId}/confirm`, { pendingMessageId, approve });
      return res.json();
    },
    onSuccess: (data: any) => {
      setConfirmingId(null);
      if (data?.mode === "pipeline_started") {
        setPipelineRunning(true);
        setPipelineStartTime(Date.now());
        setLastProgressTime(Date.now());
        setPipelineElapsed(0);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", threadId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/console/context", threadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", threadId, "activeBot"] });
    },
    onError: (error: any) => {
      setConfirmingId(null);
      toast({
        title: t("chat.executionFailed"),
        description: error.message || t("chat.errorOccurred"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sendMutation.isPending) return;
    setShowHints(false);
    sendMutation.mutate(input.trim());
    setInput("");
  };

  const handleHintClick = (text: string) => {
    setInput(text);
    setShowHints(false);
    inputRef.current?.focus();
  };

  const handleConfirm = (messageId: number) => {
    setConfirmingId(messageId);
    confirmMutation.mutate({ pendingMessageId: messageId, approve: true });
  };

  const handleCancel = (messageId: number) => {
    setConfirmingId(messageId);
    confirmMutation.mutate({ pendingMessageId: messageId, approve: false });
  };

  const isLoading = threadsLoading || messagesLoading;

  const lastCommandResult = useMemo(() => {
    if (!messages?.length) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && m.kind === "command_result" && m.commandJson) {
        return m;
      }
    }
    return null;
  }, [messages]);

  const nextActionHints = useMemo((): Hint[] => {
    if (!lastCommandResult) return [];
    const cmdType = lastCommandResult.commandJson?.type;
    const ok = lastCommandResult.resultJson?.ok;
    if (!ok) return [];

    if (cmdType === "pipeline_run") {
      return [
        { key: "chat.hint.scheduleDailyNine", category: "schedule", states: ["S3_READY"] },
        { key: "chat.hint.botStatus", category: "first_run", states: ["S3_READY"] },
        { key: "chat.hint.nextRunTime", category: "schedule", states: ["S3_READY"] },
      ];
    }
    if (cmdType === "list_bots" || cmdType === "switch_bot") {
      return stateHints.slice(0, 3);
    }
    if (cmdType === "add_source") {
      return [
        { key: "chat.hint.scheduleDailyNine", category: "schedule", states: ["S2_NO_COLLECTION"] },
        { key: "chat.hint.botStatus", category: "first_run", states: ["S2_NO_COLLECTION"] },
      ];
    }
    return [];
  }, [lastCommandResult, stateHints]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-chat-title">
          <MessageCircle className="h-5 w-5" />
          {t("chat.title")}
        </h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-sm text-muted-foreground" data-testid="text-chat-description">
            {t("chat.subtitle")}
          </p>
          {activeBotInfo ? (
            <Badge variant="secondary" data-testid="badge-active-bot">
              <Bot className="h-3 w-3 mr-1" />
              {activeBotInfo.name}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground" data-testid="badge-no-active-bot">
              {t("chat.noActiveBot")}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-3/4" />
                ))}
              </div>
            ) : !messages?.length ? (
              <OnboardingView
                state={consoleState}
                hints={stateHints}
                onHintClick={handleHintClick}
              />
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    isConfirming={confirmingId === msg.id}
                  />
                ))}

                {nextActionHints.length > 0 && !pipelineRunning && (
                  <div className="flex flex-col gap-1.5 ml-11 mt-2" data-testid="next-action-hints">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      {t("chat.tryNext")}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {nextActionHints.map((hint, i) => (
                        <button
                          key={i}
                          type="button"
                          className="text-xs px-2.5 py-1.5 rounded-md bg-muted/50 text-muted-foreground hover-elevate active-elevate-2 transition-colors"
                          onClick={() => handleHintClick(t(hint.key))}
                          data-testid={`next-action-${i}`}
                        >
                          {t(hint.key)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {pipelineRunning && (
            <div className="px-4 py-2 border-t border-border bg-muted/50 flex items-center gap-2 justify-between" data-testid="pipeline-running-indicator">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">{pipelineProgressText}</span>
              </div>
              {pipelineElapsed > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums" data-testid="text-pipeline-elapsed">
                  {pipelineElapsed}s
                </span>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-4 border-t border-border shrink-0">
            <div className="relative" ref={hintDropdownRef}>
              <HintDropdown
                hints={stateHints.slice(0, 10)}
                visible={showHints && !input.trim()}
                onSelect={handleHintClick}
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setShowHints(true)}
                    placeholder={placeholderText}
                    disabled={sendMutation.isPending || pipelineRunning}
                    data-testid="input-chat-message"
                  />
                  {!input.trim() && !pipelineRunning && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowHints(!showHints)}
                      data-testid="button-toggle-hints"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${showHints ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={!input.trim() || sendMutation.isPending}
                  data-testid="button-send-message"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>

        <div className="w-64 border-l border-border p-4 hidden lg:block overflow-y-auto">
          {botSpecificHints ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{consoleContext?.activeBotName || "Bot"} {t("chat.commands")}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {t("chat.botHintsDesc")}
              </p>

              {(Object.keys(BOT_HINT_CATEGORY_LABEL_KEYS) as BotHintCategory[]).map(cat => {
                const hintsInCat = botSpecificHints.filter(h => h.category === cat);
                if (hintsInCat.length === 0) return null;
                const Icon = BOT_HINT_CATEGORY_ICONS[cat];
                return (
                  <div key={cat} className="mb-4" data-testid={`bot-hint-group-${cat}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">{t(BOT_HINT_CATEGORY_LABEL_KEYS[cat])}</span>
                    </div>
                    <div className="space-y-1">
                      {hintsInCat.map((hint, i) => (
                        <BotHintChip
                          key={`${cat}-${i}`}
                          hint={hint}
                          onClick={handleHintClick}
                          index={botSpecificHints.indexOf(hint)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t("chat.suggestions")}</span>
              </div>

              <div className="mb-3">
                <Badge variant="outline" className="text-xs" data-testid="badge-console-state">
                  {getStateMessage(consoleState, t)}
                </Badge>
              </div>

              <div className="space-y-1.5">
                {stateHints.slice(0, 8).map((hint, i) => (
                  <HintChip key={i} hint={hint} onClick={handleHintClick} location="sidebar" index={i} />
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">{t("chat.categories")}</p>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(CATEGORY_LABEL_KEYS) as HintCategory[]).map(cat => {
                    const Icon = CATEGORY_ICONS[cat];
                    return (
                      <Badge key={cat} variant="secondary" className="text-xs">
                        <Icon className="h-3 w-3 mr-1" />
                        {t(CATEGORY_LABEL_KEYS[cat])}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
