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
        <p>Visit makelr.com and sign up or log in.</p>
        <p>Once you see the Dashboard, you're ready to go.</p>
      </div>
    ),
  },
  {
    number: "2",
    icon: Settings,
    title: "Register Your LLM API",
    subtitle: "Claude, OpenAI, etc.",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>Makelr uses your own API key to run AI tasks.</p>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>Click <strong className="text-foreground">Settings</strong> in the sidebar</li>
          <li>In the <strong className="text-foreground">LLM Providers</strong> section, click <strong className="text-foreground">Add Provider</strong></li>
          <li>Fill in the following fields:</li>
        </ol>
        <div className="rounded-md bg-muted/50 p-3 space-y-1 text-xs">
          <p><strong className="text-foreground">Name:</strong> e.g. My Claude API</p>
          <p><strong className="text-foreground">Provider Type:</strong> Choose Anthropic (Claude) / OpenAI, etc.</p>
          <p><strong className="text-foreground">API Key:</strong> Paste your issued key</p>
          <p><strong className="text-foreground">Base URL:</strong> Leave empty (uses default)</p>
          <p><strong className="text-foreground">Default Model:</strong> Leave empty or e.g. claude-3-5-sonnet-latest</p>
        </div>
        <p>Click Save, and Makelr can now use your AI model.</p>
      </div>
    ),
  },
  {
    number: "3",
    icon: Bot,
    title: "Create a Bot from a Template",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>Go to <strong className="text-foreground">Dashboard</strong> or <strong className="text-foreground">My Bots</strong></li>
          <li>Click <strong className="text-foreground">Create Bot / From Template</strong></li>
          <li>Choose a template (e.g. Community Research, Investing, etc.)</li>
          <li>Name your bot and create it</li>
        </ol>
        <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
          <p>Templates are pre-designed automation recipes.</p>
          <p>We recommend starting with a template for your first bot.</p>
        </div>
      </div>
    ),
  },
  {
    number: "4",
    icon: Rss,
    title: "Add Your Sources",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>This is where you define where AI collects information from.</p>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>Click <strong className="text-foreground">Sources</strong> in the sidebar</li>
          <li>Add, edit, or remove sources as needed</li>
          <li>Save your changes</li>
        </ol>
        <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
          <p>Examples: News sites, blog RSS feeds, Reddit, Hacker News, TechCrunch, etc.</p>
          <p>AI will collect content based on the sources you configure here.</p>
        </div>
      </div>
    ),
  },
  {
    number: "5",
    icon: MessageSquare,
    title: "Command Your AI via Console",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>Go to <strong className="text-foreground">Console</strong> in the sidebar.</p>
        <p>Try typing commands like:</p>
        <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
          <p>"Summarize today's collected items"</p>
          <p>"Analyze this from an investment perspective"</p>
          <p>"Write a blog post draft"</p>
        </div>
        <p>The key idea behind Makelr: <strong className="text-foreground">"Put your AI to work."</strong></p>
      </div>
    ),
  },
  {
    number: "6",
    icon: FileText,
    title: "Review & Approve Results",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>Go to <strong className="text-foreground">Drafts</strong> or <strong className="text-foreground">Reports</strong></li>
          <li>Review AI-generated drafts</li>
          <li>Edit or use them as-is</li>
          <li>Approve or Export</li>
        </ol>
        <div className="rounded-md bg-muted/50 p-3 text-xs">
          <p>AI does the work. You make the decisions.</p>
        </div>
      </div>
    ),
  },
];

const faqItems = [
  {
    q: "Is Makelr a chatbot service?",
    a: "No. Makelr is a workflow-based automation tool. The chat console is simply an interface for giving commands — the core value is in the automated workflows running behind the scenes.",
  },
  {
    q: "Do I need to know how to code?",
    a: "Not at all. Templates, a few clicks, and simple configuration are all you need to get started.",
  },
  {
    q: "Is my API key safe?",
    a: "Makelr only uses your API key to make AI calls. Your key is never exposed externally, and you can replace or delete it anytime.",
  },
  {
    q: "Can I use both Claude and GPT?",
    a: "Yes. You can register multiple LLM providers in Settings and switch between them depending on your needs.",
  },
  {
    q: "Who is Makelr useful for?",
    a: "Anyone who needs daily research, summaries, or analysis. Content creators, writers, and planners. Investors and market analysts looking to automate trend tracking. Anyone who wants to use AI as a productive assistant, not just a Q&A tool.",
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
          Makelr is a tool for building your own AI automation assistant that handles tasks on your behalf.
          No coding required — just pick a template, click a few buttons, and create your own AI workflow.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            <span data-testid="text-guide-capabilities">What Can You Do with Makelr?</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Automatically collect news, community posts, and market data every morning</li>
            <li>Summarize, analyze, and organize collected content into reports</li>
            <li>Auto-generate blog posts, briefings, and report drafts</li>
            <li>Automate investment research, trend analysis, and content curation</li>
            <li>Run your own "AI assistant" with your custom rules</li>
          </ul>
          <div className="mt-4 rounded-md bg-muted/50 p-3 text-sm text-foreground" data-testid="text-guide-core">
            <strong>Key point:</strong> Makelr is not a service that lends you bots — it's a tool for designing your own automation.
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold" data-testid="text-guide-steps-heading">
          Get Started in 6 Simple Steps
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
          <p className="text-sm font-semibold text-foreground" data-testid="text-guide-philosophy">"Don't ask AI questions. Put it to work."</p>
          <p className="text-xs text-muted-foreground">
            Makelr is a tool for building an automation assistant that saves your time and focus.
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
