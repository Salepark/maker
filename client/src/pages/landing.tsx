import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Layers, Rss, Settings, Zap, ArrowRight, TrendingUp, BookOpen, Building2, Newspaper, ChevronDown, Key, MessageSquare, PenTool, Laptop } from "lucide-react";
import { ShareButton } from "@/components/share-button";

const useCases = [
  {
    icon: TrendingUp,
    title: "Daily Market Brief",
    description: "Collect market news from Reuters, Yahoo Finance, Reddit, and more. Get a concise AI-summarized briefing every morning before the market opens.",
  },
  {
    icon: BookOpen,
    title: "Research Paper Tracker",
    description: "Monitor ArXiv, Google Research, and academic blogs. Stay on top of the latest AI/ML papers without manual searching.",
  },
  {
    icon: Building2,
    title: "Competitor Signal Monitor",
    description: "Track TechCrunch, Product Hunt, and industry news. Get alerts when competitors launch new features or raise funding.",
  },
  {
    icon: Newspaper,
    title: "Community Research",
    description: "Follow Reddit, Hacker News, and niche communities. Understand emerging trends and community sentiment in your space.",
  },
  {
    icon: PenTool,
    title: "Content Ideas & Research",
    description: "Automatically collect trending topics, blog ideas, and content inspiration from Medium, Reddit, and more. Perfect for bloggers, newsletter writers, and content planners.",
  },
  {
    icon: Laptop,
    title: "Work & Productivity Research",
    description: "Automatically gather productivity tips, business ideas, and practical tools from Reddit, Indie Hackers, and Medium. A daily research memo for marketers, planners, and solopreneurs.",
  },
  {
    icon: MessageSquare,
    title: "Chat-Based Control",
    description: "Manage all your bots through a natural language chat console. Switch bots, run jobs, add sources — just type a command.",
  },
  {
    icon: Key,
    title: "Bring Your Own LLM",
    description: "Use your own API key from OpenAI, Anthropic, Google, or any OpenAI-compatible provider. No vendor lock-in, full control over AI costs.",
  },
];

const faqItems = [
  {
    q: "Do I need to provide my own AI API key?",
    a: "Yes. Makelr uses a BYO (Bring Your Own) LLM model. You add your own API key from providers like OpenAI, Anthropic, or Google in Settings. This gives you full control over your AI usage and costs.",
  },
  {
    q: "What sources can I connect?",
    a: "Any public RSS feed. This includes news sites (Reuters, CNBC), tech blogs (TechCrunch, The Verge), research repositories (ArXiv), community platforms (Reddit, Hacker News), and any other site with an RSS feed.",
  },
  {
    q: "Are templates mandatory?",
    a: "No. Templates are starting points to help you get up and running quickly. You can fully customize every aspect — sources, schedule, report sections, format, and AI model — after creation.",
  },
  {
    q: "How often do bots run?",
    a: "You control the schedule. Options include daily, weekdays only, or weekly. You also pick the time of day. You can also trigger a manual run anytime from the chat console.",
  },
  {
    q: "What kind of outputs do bots produce?",
    a: "Bots generate structured reports from your sources. Reports include summaries, key insights, and trend analysis. You can customize which sections appear, the verbosity level, and the markdown formatting.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Each user has their own bots, sources, and reports. Data is strictly isolated per user. Your API keys are encrypted and never shared.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
        onClick={() => setOpen(!open)}
        data-testid={`button-faq-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
      >
        <span className="font-medium text-sm">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

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
                Build Your Automation,
                <br />
                <span className="text-primary">Your Way</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg" data-testid="text-hero-subtitle">
                Choose your sources, set your schedule, and design your outputs. Your workflow, your rules.
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

        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-4" data-testid="text-use-cases">What Can You Build?</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            Here are some workflows people create with Makelr. Every template is a starting point — customize it to fit your needs.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((uc) => (
              <Card key={uc.title} className="hover-elevate" data-testid={`card-usecase-${uc.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="pt-6 space-y-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <uc.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{uc.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{uc.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-6 py-16" data-testid="section-faq">
          <h2 className="text-2xl font-bold text-center mb-4">Frequently Asked Questions</h2>
          <p className="text-center text-muted-foreground mb-8">
            Common questions about Makelr and how it works.
          </p>
          <Card>
            <CardContent className="pt-6">
              {faqItems.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="max-w-3xl mx-auto px-6 py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Design Your Workflow?</h2>
          <p className="text-muted-foreground mb-6">
            Sign up, add your AI provider, and create your first bot in minutes.
          </p>
          <Button size="lg" asChild data-testid="button-cta-bottom">
            <a href="/api/login">
              Get Started Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>Makelr Bot Manager</p>
      </footer>
    </div>
  );
}
