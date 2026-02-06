import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Send, Loader2, Bot, User, HelpCircle, Check, X, Zap } from "lucide-react";
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

const exampleCommands = [
  "내 봇 목록 보여줘",
  "investing으로 전환",
  "봇 상태 알려줘",
  "수집 지금 실행해줘",
  "https://example.com/feed.xml 소스 추가해줘",
  "봇 일시정지해줘",
  "봇 재개해줘",
];

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
        승인하고 실행
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onCancel(messageId)}
        disabled={isPending}
        data-testid={`button-cancel-${messageId}`}
      >
        <X className="h-3 w-3 mr-1" />
        취소
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
            {message.commandJson.type || message.commandJson.action}
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

export default function Chat() {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [threadId, setThreadId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    onSuccess: (newThread: ChatThread) => {
      setThreadId(newThread.id);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads"] });
    },
  });

  useEffect(() => {
    if (!threadsLoading && threads && threads.length === 0 && !createThreadMutation.isPending) {
      createThreadMutation.mutate();
    }
  }, [threads, threadsLoading]);

  const currentThread = threads?.find(t => t.id === threadId);

  const { data: messages, isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/threads", threadId, "messages"],
    queryFn: async () => {
      if (!threadId) return [];
      const res = await fetch(`/api/chat/threads/${threadId}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    enabled: !!threadId,
    refetchInterval: 5000,
  });

  const { data: activeBotInfo } = useQuery<ActiveBotInfo | null>({
    queryKey: ["/api/chat/threads", threadId, "activeBot"],
    queryFn: async () => {
      if (!currentThread?.activeBotId) return null;
      const res = await fetch(`/api/bots`, { credentials: "include" });
      if (!res.ok) return null;
      const bots = await res.json();
      return bots.find((b: any) => b.id === currentThread.activeBotId) || null;
    },
    enabled: !!currentThread,
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!threadId) throw new Error("No thread");
      const res = await apiRequest("POST", `/api/chat/threads/${threadId}/message`, { text });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", threadId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads"] });
    },
    onError: (error: any) => {
      toast({
        title: "전송 실패",
        description: error.message || "오류가 발생했습니다",
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
    onSuccess: () => {
      setConfirmingId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", threadId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads"] });
    },
    onError: (error: any) => {
      setConfirmingId(null);
      toast({
        title: "실행 실패",
        description: error.message || "오류가 발생했습니다",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sendMutation.isPending) return;
    sendMutation.mutate(input.trim());
    setInput("");
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
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

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-chat-title">
          <MessageCircle className="h-5 w-5" />
          Command Chat
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-muted-foreground">
            자연어로 봇을 제어하세요
          </p>
          {activeBotInfo ? (
            <Badge variant="secondary" data-testid="badge-active-bot">
              <Bot className="h-3 w-3 mr-1" />
              {activeBotInfo.name}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground" data-testid="badge-no-active-bot">
              활성 봇 없음
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
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium" data-testid="text-chat-empty">대화를 시작하세요</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  봇 목록 보기, 상태 확인, 소스 추가 등 자연어로 명령하세요
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                  isConfirming={confirmingId === msg.id}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-border shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={activeBotInfo ? `${activeBotInfo.name}에게 명령...` : "봇 목록 보여줘 / 소스 추가 / 수집 실행..."}
                disabled={sendMutation.isPending}
                data-testid="input-chat-message"
              />
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
          </form>
        </div>

        <div className="w-64 border-l border-border p-4 hidden lg:block">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">예시 명령어</span>
          </div>
          <div className="space-y-2">
            {exampleCommands.map((example, i) => (
              <Card
                key={i}
                className="cursor-pointer hover-elevate"
                onClick={() => handleExampleClick(example)}
                data-testid={`card-example-${i}`}
              >
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{example}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">지원 명령:</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">봇 목록</Badge>
              <Badge variant="secondary" className="text-xs">봇 전환</Badge>
              <Badge variant="secondary" className="text-xs">상태 확인</Badge>
              <Badge variant="secondary" className="text-xs">작업 실행</Badge>
              <Badge variant="secondary" className="text-xs">일시정지</Badge>
              <Badge variant="secondary" className="text-xs">재개</Badge>
              <Badge variant="secondary" className="text-xs">소스 추가</Badge>
              <Badge variant="secondary" className="text-xs">소스 제거</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
