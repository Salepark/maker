import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Send, Loader2, Bot, User, HelpCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  contentText: string;
  commandJson?: any;
  resultJson?: any;
  createdAt: string;
}

const exampleCommands = [
  "ai_art 리포트 만들어줘",
  "investing으로 지난 48시간 daily brief 재생성",
  "analyze 다시 돌려줘",
  "오늘은 수집만 실행",
  "기본 토픽을 investing으로 설정해줘",
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

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
        {message.commandJson && (
          <Badge variant="outline" className="mt-2 text-xs">
            {message.commandJson.action}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function Chat() {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/chat/command", { message });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      if (!data.ok && data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send",
        description: error.message || "An error occurred",
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

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-chat-title">
          <MessageCircle className="h-5 w-5" />
          Command Chat
        </h1>
        <p className="text-sm text-muted-foreground">
          자연어로 명령을 입력하세요
        </p>
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
                <h3 className="text-lg font-medium">대화를 시작하세요</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  아래 예시를 클릭하거나 직접 입력하세요
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-border shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="예: investing 리포트 지금 만들어줘 / 지난 48시간으로 재생성 / analyze 실행"
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
            <p className="text-xs text-muted-foreground mb-2">허용된 작업:</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">리포트 생성</Badge>
              <Badge variant="secondary" className="text-xs">파이프라인 실행</Badge>
              <Badge variant="secondary" className="text-xs">설정 변경</Badge>
            </div>
          </div>

          {messages && messages.filter(m => m.role === "user" && m.commandJson).length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">최근 명령:</p>
              <div className="space-y-1">
                {messages
                  .filter(m => m.role === "user" && m.commandJson)
                  .slice(-5)
                  .reverse()
                  .map((msg) => (
                    <div 
                      key={msg.id} 
                      className="flex items-center gap-2 text-xs"
                      data-testid={`history-${msg.id}`}
                    >
                      <Badge variant="outline" className="text-xs shrink-0">
                        {msg.commandJson?.action}
                      </Badge>
                      <span className="text-muted-foreground truncate">
                        {msg.commandJson?.topic || msg.commandJson?.job || msg.commandJson?.key || ""}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
