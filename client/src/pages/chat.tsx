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
  text: string;
  category: HintCategory;
  states: ConsoleState[];
}

interface BotHint {
  text: string;
  category: BotHintCategory;
}

const CATEGORY_ICONS: Record<HintCategory, typeof Lightbulb> = {
  first_run: Rocket,
  schedule: Clock,
};

const CATEGORY_LABELS: Record<HintCategory, string> = {
  first_run: "Getting Started",
  schedule: "Schedule",
};

const BOT_HINT_CATEGORY_ICONS: Record<BotHintCategory, typeof Lightbulb> = {
  research: Search,
  outreach: Target,
  contribution: MessageSquare,
  analysis: BarChart3,
  monitor: Eye,
  safety_promo: ShieldCheck,
};

const BOT_HINT_CATEGORY_LABELS: Record<BotHintCategory, string> = {
  research: "User Research",
  outreach: "Outreach",
  contribution: "Community",
  analysis: "Analysis",
  monitor: "Monitoring",
  safety_promo: "Safety",
};

const COMMUNITY_RESEARCH_HINTS: BotHint[] = [
  { text: "자동화/워크플로우 관련 고민을 올린 커뮤니티 글 수집해줘", category: "research" },
  { text: "\"이거 자동화하고 싶다\" 같은 니즈가 있는 Reddit 글 찾아줘", category: "research" },
  { text: "1인 창업자/사이드프로젝트 운영자의 반복 업무 불만 모아줘", category: "research" },
  { text: "RSS 자동화, 뉴스레터 정리에 관심 있는 사용자 패턴 분석해줘", category: "research" },

  { text: "\"정보 과부하\"로 고민하는 투자자 커뮤니티 글 정리해줘", category: "outreach" },
  { text: "생산성 도구를 찾고 있는 사용자 질문 모아줘", category: "outreach" },
  { text: "Makelr가 해결할 수 있는 문제를 겪는 사람들의 글 요약해줘", category: "outreach" },

  { text: "커뮤니티에 도움이 되는 답변 초안 만들어줘 (홍보 없이)", category: "contribution" },
  { text: "자동화 팁을 공유하는 형식으로 기여 초안 작성해줘", category: "contribution" },
  { text: "RSS 활용법이나 정보 정리 노하우를 공유하는 글 초안 만들어줘", category: "contribution" },

  { text: "이번 주 자동화 관련 트렌드 키워드 분석해줘", category: "analysis" },
  { text: "어떤 커뮤니티에서 Makelr 같은 도구 수요가 가장 높은지 분석해줘", category: "analysis" },
  { text: "수집된 자료에서 잠재 사용자 페르소나 정리해줘", category: "analysis" },

  { text: "Reddit/HN에서 워크플로우 자동화 언급 추이를 모니터해줘", category: "monitor" },
  { text: "경쟁 도구(Zapier, Make 등) 언급 빈도와 불만사항 추적해줘", category: "monitor" },
  { text: "매일 아침 커뮤니티 동향 브리핑 만들어줘", category: "monitor" },

  { text: "직접적인 Makelr 홍보는 하지 말고, 가치 제공 위주로만", category: "safety_promo" },
  { text: "스팸처럼 보이지 않게, 진정성 있는 커뮤니티 기여만 해줘", category: "safety_promo" },
  { text: "링크나 브랜드명 없이, 문제 해결 중심으로 접근해줘", category: "safety_promo" },
];

const BOT_SPECIFIC_HINTS: Record<string, BotHint[]> = {
  content_research: COMMUNITY_RESEARCH_HINTS,
};

const ALL_HINTS: Hint[] = [
  { text: "내 봇 목록 보여줘", category: "first_run", states: ["S0_NO_BOT"] },
  { text: "투자 봇으로 전환해줘", category: "first_run", states: ["S0_NO_BOT"] },
  { text: "내 설정이 잘 됐는지 점검하고 필요한 걸 알려줘", category: "first_run", states: ["S0_NO_BOT", "S1_NO_SOURCES", "S4_SCHEDULE_ISSUE"] },

  { text: "기본 소스 넣고 시작해줘", category: "first_run", states: ["S1_NO_SOURCES"] },
  { text: "이 URL 소스를 추가해줘: https://", category: "first_run", states: ["S1_NO_SOURCES"] },

  { text: "봇 상태 보여줘", category: "first_run", states: ["S2_NO_COLLECTION", "S3_READY"] },

  { text: "매일 아침 9시에 자동 실행되게 설정해줘", category: "schedule", states: ["S2_NO_COLLECTION", "S3_READY"] },
  { text: "스케줄 시간을 아침 8시로 바꿔줘", category: "schedule", states: ["S3_READY", "S4_SCHEDULE_ISSUE"] },
  { text: "주말은 빼고 평일만 돌려줘", category: "schedule", states: ["S3_READY"] },

  { text: "왜 리포트가 안 왔는지 점검해줘", category: "first_run", states: ["S4_SCHEDULE_ISSUE"] },
  { text: "다음 실행 시간 알려줘", category: "schedule", states: ["S4_SCHEDULE_ISSUE"] },

  { text: "내가 뭘 해야 하는지 모르겠어. 다음 단계 알려줘", category: "first_run", states: ["S0_NO_BOT", "S1_NO_SOURCES", "S2_NO_COLLECTION", "S3_READY", "S4_SCHEDULE_ISSUE"] },
  { text: "봇 일시정지해줘", category: "first_run", states: ["S3_READY"] },
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

function getStateMessage(state: ConsoleState): string {
  switch (state) {
    case "S0_NO_BOT": return "Start by selecting or creating a bot";
    case "S1_NO_SOURCES": return "Add sources to start collecting data";
    case "S2_NO_COLLECTION": return "Ready to collect and analyze data";
    case "S3_READY": return "All set! Tell your bot what to do";
    case "S4_SCHEDULE_ISSUE": return "Check your settings — something needs attention";
  }
}

function getPlaceholder(state: ConsoleState): string {
  switch (state) {
    case "S0_NO_BOT": return '"내 봇 목록 보여줘" or "Show my bots"';
    case "S1_NO_SOURCES": return '"기본 소스 넣고 시작해줘" or "Add source https://..."';
    case "S2_NO_COLLECTION": return '"매일 아침 9시에 자동 실행되게 설정해줘"';
    case "S3_READY": return '"봇 상태 보여줘" or "스케줄 시간 바꿔줘"';
    case "S4_SCHEDULE_ISSUE": return '"왜 리포트가 안 왔는지 점검해줘"';
  }
}

function getHintsForState(state: ConsoleState): Hint[] {
  return ALL_HINTS.filter(h => h.states.includes(state));
}

function getPipelineStepLabel(step: string): string {
  switch (step) {
    case "collect": return "Data Collection";
    case "analyze": return "Analysis";
    case "report": return "Report";
    case "schedule": return "Schedule";
    default: return step;
  }
}

function getPipelineProgressLabel(completedSteps: string[]): string {
  const last = completedSteps[completedSteps.length - 1];
  if (!last) return "Collecting data...";
  switch (last) {
    case "collect": return "Generating report...";
    case "analyze": return "Generating report...";
    case "report": return "Finishing up...";
    case "schedule": return "Finishing up...";
    default: return "Processing...";
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
  return (
    <div className="flex gap-2 mt-2">
      <Button
        size="sm"
        onClick={() => onConfirm(messageId)}
        disabled={isPending}
        data-testid={`button-confirm-${messageId}`}
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
        Approve & Run
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onCancel(messageId)}
        disabled={isPending}
        data-testid={`button-cancel-${messageId}`}
      >
        <X className="h-3 w-3 mr-1" />
        Cancel
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
                {getPipelineStepLabel(message.commandJson.step)}
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
  return (
    <button
      type="button"
      className="flex items-center gap-2 px-3 py-2 text-left text-sm rounded-md bg-muted/50 hover-elevate active-elevate-2 transition-colors w-full"
      onClick={() => onClick(hint.text)}
      data-testid={`hint-chip-${location}-${index}`}
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{hint.text}</span>
    </button>
  );
}

function BotHintChip({ hint, onClick, index }: { hint: BotHint; onClick: (text: string) => void; index: number }) {
  const Icon = BOT_HINT_CATEGORY_ICONS[hint.category];
  return (
    <button
      type="button"
      className="flex items-center gap-2 px-3 py-2 text-left text-sm rounded-md bg-muted/50 hover-elevate active-elevate-2 transition-colors w-full"
      onClick={() => onClick(hint.text)}
      data-testid={`bot-hint-chip-${index}`}
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{hint.text}</span>
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
  const topHints = hints.slice(0, 6);
  const stateMsg = getStateMessage(state);

  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-6">
          <Lightbulb className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium" data-testid="text-onboarding-title">
            {stateMsg}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try one of these — just click to fill in, then press Enter
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
            {CATEGORY_LABELS[cat]}
          </div>
          {grouped[cat].map((hint, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover-elevate active-elevate-2 transition-colors"
              onClick={() => onSelect(hint.text)}
              data-testid={`hint-option-${cat}-${i}`}
            >
              {hint.text}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Chat() {
  const { toast } = useToast();
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

  const pipelineProgressText = useMemo(() => {
    if (!pipelineRunning || !messages) return "자료 수집 중...";
    const completedSteps: string[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.commandJson?.type === "pipeline_step" && m.resultJson?.ok) {
        completedSteps.unshift(m.commandJson.step);
      }
      if (m.commandJson?.type === "pipeline_run" && m.kind !== "command_result") break;
    }
    return getPipelineProgressLabel(completedSteps);
  }, [messages, pipelineRunning]);

  useEffect(() => {
    if (pipelineRunning && messages && messages.length > 0) {
      const recentMsgs = messages.slice(-5);
      const hasFinalPipelineMsg = recentMsgs.some(
        m => m.commandJson?.type === "pipeline_run" && m.kind === "command_result"
      );
      const hasFailedStep = recentMsgs.some(
        m => m.commandJson?.type === "pipeline_step" && m.resultJson?.ok === false
      );
      if (hasFinalPipelineMsg || hasFailedStep) {
        setPipelineRunning(false);
      }
    }
  }, [messages, pipelineRunning]);

  useEffect(() => {
    if (!pipelineRunning) return;
    const timeout = setTimeout(() => {
      setPipelineRunning(false);
    }, 45000);
    return () => clearTimeout(timeout);
  }, [pipelineRunning]);

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
  const placeholderText = useMemo(() => getPlaceholder(consoleState), [consoleState]);

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
        title: "Send failed",
        description: error.message || "An error occurred",
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
      }
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", threadId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/console/context", threadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", threadId, "activeBot"] });
    },
    onError: (error: any) => {
      setConfirmingId(null);
      toast({
        title: "Execution failed",
        description: error.message || "An error occurred",
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
        { text: "매일 아침 9시에 자동 실행되게 설정해줘", category: "schedule", states: ["S3_READY"] },
        { text: "봇 상태 보여줘", category: "first_run", states: ["S3_READY"] },
      ];
    }
    if (cmdType === "list_bots" || cmdType === "switch_bot") {
      return stateHints.slice(0, 3);
    }
    if (cmdType === "add_source") {
      return [
        { text: "매일 아침 9시에 자동 실행되게 설정해줘", category: "schedule", states: ["S2_NO_COLLECTION"] },
        { text: "봇 상태 보여줘", category: "first_run", states: ["S2_NO_COLLECTION"] },
      ];
    }
    return [];
  }, [lastCommandResult, stateHints]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-chat-title">
          <MessageCircle className="h-5 w-5" />
          Control Console
        </h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-sm text-muted-foreground" data-testid="text-chat-description">
            Tell your bot what to do in one sentence. It handles the rest.
          </p>
          {activeBotInfo ? (
            <Badge variant="secondary" data-testid="badge-active-bot">
              <Bot className="h-3 w-3 mr-1" />
              {activeBotInfo.name}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground" data-testid="badge-no-active-bot">
              No active bot
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
                      Try next
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {nextActionHints.map((hint, i) => (
                        <button
                          key={i}
                          type="button"
                          className="text-xs px-2.5 py-1.5 rounded-md bg-muted/50 text-muted-foreground hover-elevate active-elevate-2 transition-colors"
                          onClick={() => handleHintClick(hint.text)}
                          data-testid={`next-action-${i}`}
                        >
                          {hint.text}
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
            <div className="px-4 py-2 border-t border-border bg-muted/50 flex items-center gap-2" data-testid="pipeline-running-indicator">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">{pipelineProgressText}</span>
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
                <span className="text-sm font-medium">{consoleContext?.activeBotName || "Bot"} Commands</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Makelr 홍보를 위한 사전 조사, 자료 수집, 커뮤니티 기여 명령어
              </p>

              {(Object.keys(BOT_HINT_CATEGORY_LABELS) as BotHintCategory[]).map(cat => {
                const hintsInCat = botSpecificHints.filter(h => h.category === cat);
                if (hintsInCat.length === 0) return null;
                const Icon = BOT_HINT_CATEGORY_ICONS[cat];
                return (
                  <div key={cat} className="mb-4" data-testid={`bot-hint-group-${cat}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">{BOT_HINT_CATEGORY_LABELS[cat]}</span>
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
                <span className="text-sm font-medium">Suggestions</span>
              </div>

              <div className="mb-3">
                <Badge variant="outline" className="text-xs" data-testid="badge-console-state">
                  {getStateMessage(consoleState)}
                </Badge>
              </div>

              <div className="space-y-1.5">
                {stateHints.slice(0, 8).map((hint, i) => (
                  <HintChip key={i} hint={hint} onClick={handleHintClick} location="sidebar" index={i} />
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Categories</p>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(CATEGORY_LABELS) as HintCategory[]).map(cat => {
                    const Icon = CATEGORY_ICONS[cat];
                    return (
                      <Badge key={cat} variant="secondary" className="text-xs">
                        <Icon className="h-3 w-3 mr-1" />
                        {CATEGORY_LABELS[cat]}
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
