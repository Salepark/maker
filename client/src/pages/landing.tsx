import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Layers, Rss, Settings, Zap, ArrowRight } from "lucide-react";
import { ShareButton } from "@/components/share-button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Makelr</span>
          </div>
          <div className="flex items-center gap-2">
            <ShareButton />
            <Button asChild data-testid="button-login-nav">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16">
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight" data-testid="text-hero-title">
                Design Your Own
                <br />
                <span className="text-primary">Automation Workflows</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg" data-testid="text-hero-subtitle">
                We don't provide bots. Choose your sources, set your schedule, and design your outputs — your own automation tool.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild data-testid="button-get-started">
                  <a href="/api/login">
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Layers className="h-4 w-4" />
                  <span>Templates as starting points</span>
                </div>
                <div className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  <span>Fully customizable</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  <span>AI analysis & reports</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 border border-border/50">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
                    <Rss className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-medium">Choose Sources</div>
                      <div className="text-sm text-muted-foreground">RSS, news, communities — connect the sources you want</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
                    <Settings className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-medium">Schedule & Format</div>
                      <div className="text-sm text-muted-foreground">Freely adjust run frequency and output format</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
                    <Zap className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-medium">AI Analysis & Summary</div>
                      <div className="text-sm text-muted-foreground">AI analyzes collected content and generates reports</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-4" data-testid="text-how-it-works">How It Works</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            You decide the sources, schedule, and outputs. You own the workflow.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover-elevate">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Start from a Template</h3>
                <p className="text-sm text-muted-foreground">
                  Templates are starting points, not answers. Quickly start workflows for news monitoring, market analysis, community engagement, and more.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Customize Freely</h3>
                <p className="text-sm text-muted-foreground">
                  Change everything to fit your purpose — sources, schedules, report format, and AI model. We provide the tools, you make the choices.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Automated Operations</h3>
                <p className="text-sm text-muted-foreground">
                  Once configured, your bot automatically collects, analyzes, and generates reports. Control your bots anytime via the chat console.
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
