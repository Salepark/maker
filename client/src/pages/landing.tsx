import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Layers, Rss, Settings, Zap, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Makelr</span>
          </div>
          <Button asChild data-testid="button-login-nav">
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </nav>

      <main className="pt-24 pb-16">
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight" data-testid="text-hero-title">
                당신의 자동화
                <br />
                <span className="text-primary">워크플로우를 설계하세요</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg" data-testid="text-hero-subtitle">
                이 서비스는 봇을 제공하지 않습니다. 소스를 선택하고, 스케줄을 정하고, 결과물을 설계하는 — 당신만의 자동화 도구입니다.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild data-testid="button-get-started">
                  <a href="/api/login">
                    시작하기
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Layers className="h-4 w-4" />
                  <span>템플릿은 출발점</span>
                </div>
                <div className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  <span>모든 설정 커스터마이즈</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  <span>AI 분석 & 리포트</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 border border-border/50">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
                    <Rss className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-medium">소스 선택</div>
                      <div className="text-sm text-muted-foreground">RSS, 뉴스, 커뮤니티 — 원하는 소스를 연결</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
                    <Settings className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-medium">스케줄 & 포맷 설정</div>
                      <div className="text-sm text-muted-foreground">실행 주기, 결과물 형태를 자유롭게 조정</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
                    <Zap className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-medium">AI가 분석 & 정리</div>
                      <div className="text-sm text-muted-foreground">수집된 콘텐츠를 AI가 분석하고 리포트 생성</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-4" data-testid="text-how-it-works">이렇게 동작합니다</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            당신이 소스, 스케줄, 결과물을 결정합니다. 워크플로우의 주인은 당신입니다.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover-elevate">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">템플릿에서 시작</h3>
                <p className="text-sm text-muted-foreground">
                  템플릿은 정답이 아닌 출발점입니다. 뉴스 모니터링, 시장 분석, 커뮤니티 참여 등 다양한 워크플로우를 바로 시작할 수 있습니다.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">자유롭게 설정</h3>
                <p className="text-sm text-muted-foreground">
                  소스, 스케줄, 리포트 형식, AI 모델까지 모든 것을 당신의 목적에 맞게 바꿀 수 있습니다. 우리는 도구를 제공하고, 당신이 선택합니다.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">자동화 운영</h3>
                <p className="text-sm text-muted-foreground">
                  설정이 끝나면 봇이 자동으로 수집, 분석, 리포트를 생성합니다. 채팅 콘솔로 언제든 봇을 제어하세요.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>Makelr Bot Manager</p>
      </footer>
    </div>
  );
}
