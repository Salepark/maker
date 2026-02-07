import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Settings, Bot, Rss, MessageSquare, FileText, ChevronDown, Zap, Brain } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "1",
    icon: Rocket,
    title: "Sign Up & Login",
    content: (
      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
        <p>makelr.com에 접속하여 회원가입(Sign up) 또는 로그인(Login)하세요.</p>
        <p>대시보드(Dashboard) 화면이 보이면 준비 완료입니다.</p>
      </div>
    ),
  },
  {
    number: "2",
    icon: Settings,
    title: "LLM API 등록하기",
    subtitle: "Claude, OpenAI 등",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>Makelr는 당신의 API 키를 사용해 AI를 실행합니다.</p>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>좌측 메뉴에서 <strong className="text-foreground">Settings</strong> 클릭</li>
          <li><strong className="text-foreground">LLM Providers</strong> 섹션에서 <strong className="text-foreground">Add Provider</strong> 클릭</li>
          <li>다음 항목을 입력합니다:</li>
        </ol>
        <div className="rounded-md bg-muted/50 p-3 space-y-1 text-xs">
          <p><strong className="text-foreground">Name:</strong> 예) My Claude API</p>
          <p><strong className="text-foreground">Provider Type:</strong> Anthropic (Claude) / OpenAI 등 선택</p>
          <p><strong className="text-foreground">API Key:</strong> 발급받은 키 붙여넣기</p>
          <p><strong className="text-foreground">Base URL:</strong> 비워두세요 (기본값 사용)</p>
          <p><strong className="text-foreground">Default Model:</strong> 비워두거나 예) claude-3-5-sonnet-latest</p>
        </div>
        <p>Save를 클릭하면 Makelr가 당신의 AI 모델을 사용할 수 있습니다.</p>
      </div>
    ),
  },
  {
    number: "3",
    icon: Bot,
    title: "템플릿으로 자동화 봇 만들기",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li><strong className="text-foreground">Dashboard</strong> 또는 <strong className="text-foreground">My Bots</strong> 이동</li>
          <li><strong className="text-foreground">Create Bot / From Template</strong> 클릭</li>
          <li>원하는 템플릿 선택 (예: Community Research, Investing 등)</li>
          <li>봇 이름을 정하고 생성</li>
        </ol>
        <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
          <p>템플릿은 "이미 잘 설계된 자동화 레시피"입니다.</p>
          <p>처음에는 템플릿에서 시작하는 것을 추천합니다.</p>
        </div>
      </div>
    ),
  },
  {
    number: "4",
    icon: Rss,
    title: "소스(Sources) 입력하기",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>AI가 어디에서 정보를 가져올지 정하는 단계입니다.</p>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>좌측 메뉴에서 <strong className="text-foreground">Sources</strong> 클릭</li>
          <li>필요한 소스를 추가 / 수정 / 삭제</li>
          <li>저장</li>
        </ol>
        <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
          <p>예시: 뉴스 사이트, 블로그 RSS, Reddit, Hacker News, TechCrunch 등</p>
          <p>여기서 설정한 소스를 기반으로 AI가 자료를 수집합니다.</p>
        </div>
      </div>
    ),
  },
  {
    number: "5",
    icon: MessageSquare,
    title: "콘솔(Console)로 AI 비서에게 명령하기",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>좌측 메뉴에서 <strong className="text-foreground">Console</strong>로 이동하세요.</p>
        <p>채팅창에 이렇게 입력해 보세요:</p>
        <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
          <p>"오늘 수집한 자료 요약해줘"</p>
          <p>"이걸 투자 관점에서 정리해줘"</p>
          <p>"블로그 글 초안으로 써줘"</p>
        </div>
        <p>Makelr의 핵심은 <strong className="text-foreground">"AI에게 일을 시킨다"</strong>는 감각입니다.</p>
      </div>
    ),
  },
  {
    number: "6",
    icon: FileText,
    title: "결과물 검토 & 승인하기",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li><strong className="text-foreground">Drafts</strong> 또는 <strong className="text-foreground">Reports</strong> 메뉴로 이동</li>
          <li>AI가 생성한 초안 확인</li>
          <li>수정하거나 그대로 사용</li>
          <li>Approve(승인) 또는 Export</li>
        </ol>
        <div className="rounded-md bg-muted/50 p-3 text-xs">
          <p>AI는 일하고, 결정은 당신이 합니다.</p>
        </div>
      </div>
    ),
  },
];

const faqItems = [
  {
    q: "Makelr는 챗봇 서비스인가요?",
    a: "아니요. Makelr는 워크플로우 기반 자동화 도구입니다. 채팅은 \"명령을 내리는 인터페이스\"일 뿐, 핵심은 자동으로 일하는 구조입니다.",
  },
  {
    q: "코드를 몰라도 쓸 수 있나요?",
    a: "네. 템플릿 + 클릭 + 간단한 설정만으로 충분히 사용할 수 있습니다.",
  },
  {
    q: "API 키는 안전한가요?",
    a: "Makelr는 당신의 API 키로만 AI를 호출합니다. 키는 외부에 공개되지 않으며, 언제든 교체/삭제할 수 있습니다.",
  },
  {
    q: "Claude, GPT 둘 다 쓸 수 있나요?",
    a: "네. Settings에서 여러 LLM Provider를 등록하고, 상황에 따라 바꿔 쓸 수 있습니다.",
  },
  {
    q: "어떤 사람에게 유용한가요?",
    a: "매일 리서치/자료조사/요약이 필요한 사람, 콘텐츠 작성/기획/정리가 잦은 사람, 투자/시장/트렌드 분석을 자동화하고 싶은 사람, AI를 도구가 아니라 직원처럼 쓰고 싶은 사람에게 유용합니다.",
  },
];

function FAQAccordionItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
        onClick={() => setOpen(!open)}
        data-testid={`button-guide-faq-${index}`}
      >
        <span className="font-medium text-sm" data-testid={`text-guide-faq-q-${index}`}>{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className={`overflow-hidden transition-all ${open ? "max-h-40 pb-4" : "max-h-0"}`}
      >
        <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-guide-faq-a-${index}`}>{a}</p>
      </div>
    </div>
  );
}

export default function Guide() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold" data-testid="text-guide-title">Getting Started Guide</h1>
        <p className="text-muted-foreground text-sm" data-testid="text-guide-intro">
          Makelr는 '내가 원하는 일을 대신 해주는 AI 자동화 비서'를 직접 만드는 도구입니다.
          코드를 몰라도, 템플릿과 몇 번의 클릭만으로 나만의 AI 워크플로우를 만들 수 있습니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            <span data-testid="text-guide-capabilities">Makelr로 무엇을 할 수 있나요?</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>매일 아침 뉴스 / 커뮤니티 / 시장 정보 자동 수집</li>
            <li>수집한 자료를 요약, 분석, 리포트로 정리</li>
            <li>블로그 글, 보고서, 브리핑 초안 자동 생성</li>
            <li>투자 리서치, 트렌드 분석, 콘텐츠 리서치 자동화</li>
            <li>내가 원하는 규칙대로 "일하는 AI 비서" 운용</li>
          </ul>
          <div className="mt-4 rounded-md bg-muted/50 p-3 text-sm text-foreground" data-testid="text-guide-core">
            <strong>핵심:</strong> Makelr는 '봇을 빌려 쓰는 서비스'가 아니라, '내 자동화를 직접 설계하는 도구'입니다.
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold" data-testid="text-guide-steps-heading">
          6단계로 끝내는 Makelr 사용법
        </h2>
        <div className="space-y-3">
          {steps.map((step) => (
            <Card key={step.number} data-testid={`card-guide-step-${step.number}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    {step.number}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <step.icon className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">{step.title}</h3>
                      {step.subtitle && (
                        <span className="text-xs text-muted-foreground">({step.subtitle})</span>
                      )}
                    </div>
                    {step.content}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold" data-testid="text-guide-faq">FAQ</h2>
        <Card>
          <CardContent className="p-4">
            {faqItems.map((item, i) => (
              <FAQAccordionItem key={i} q={item.q} a={item.a} index={i} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <Brain className="h-8 w-8 text-primary mx-auto" />
          <p className="text-sm font-semibold text-foreground" data-testid="text-guide-philosophy">"AI에게 질문하지 말고, 일을 시켜라."</p>
          <p className="text-xs text-muted-foreground">
            Makelr는 당신의 시간과 집중력을 대신 벌어주는 자동화 비서를 만드는 도구입니다.
          </p>
          <div className="flex justify-center gap-3 pt-2 flex-wrap">
            <Button asChild size="sm" data-testid="button-guide-settings">
              <Link href="/settings">Settings</Link>
            </Button>
            <Button asChild size="sm" variant="outline" data-testid="button-guide-bots">
              <Link href="/bots">My Bots</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pb-4">
        <p>makelr.com</p>
      </div>
    </div>
  );
}
