import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, BarChart3, MessageSquare, Shield, Zap, Clock } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Bot Manager</span>
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
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                AI-Powered Content
                <br />
                <span className="text-primary">Bot Management</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Collect content from RSS feeds, analyze with AI, and generate intelligent responses for community engagement and market research.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild data-testid="button-get-started">
                  <a href="/api/login">Get Started</a>
                </Button>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  <span>Secure Access</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  <span>AI-Powered</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 border border-border/50">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
                    <BarChart3 className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-medium">Market Analysis</div>
                      <div className="text-sm text-muted-foreground">Daily briefs & insights</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
                    <MessageSquare className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-medium">Smart Replies</div>
                      <div className="text-sm text-muted-foreground">AI-generated drafts</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
                    <Clock className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-medium">24/7 Monitoring</div>
                      <div className="text-sm text-muted-foreground">Automated collection</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover-elevate">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Content Collection</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically collect from RSS feeds, Reddit, Hacker News, and more with customizable schedules.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">AI Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Claude AI analyzes content for relevance, categorization, and risk assessment.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Draft Generation</h3>
                <p className="text-sm text-muted-foreground">
                  Generate contextual reply drafts for human review before posting.
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
