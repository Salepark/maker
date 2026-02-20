import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bot, Layers, Rss, Settings, Zap, ArrowRight, TrendingUp, BookOpen, Building2, Newspaper, ChevronDown, Key, MessageSquare, PenTool, Laptop, Store, ShoppingCart, LogIn, User, Monitor, Users, Landmark, Check, Shield, ShieldCheck, RefreshCw, WifiOff, Eye, Clock, FileText, ExternalLink, Github, ClipboardList, Globe, Sparkles, BarChart3, Factory, Scale, Ship, UserSearch, Wallet, LineChart, MessageCircle } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/language-provider";

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

function DemoLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  async function handleDemoLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });
      if (!res.ok) {
        setError(t("landing.demo.error"));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/";
    } catch {
      setError(t("landing.demo.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-sm w-full">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <LogIn className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t("landing.demo.title")}</span>
        </div>
        <form onSubmit={handleDemoLogin} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="demo-username" className="text-xs">{t("landing.demo.id")}</Label>
            <Input
              id="demo-username"
              data-testid="input-demo-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("landing.demo.idPlaceholder")}
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-password" className="text-xs">{t("landing.demo.password")}</Label>
            <Input
              id="demo-password"
              data-testid="input-demo-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("landing.demo.passwordPlaceholder")}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-destructive" data-testid="text-demo-error">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-demo-login">
            {loading ? t("landing.demo.loggingIn") : t("landing.demo.loginButton")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SampleReportCard({ type }: { type: "market" | "research" | "promotion" }) {
  const { t } = useLanguage();
  const prefix = `landing.sampleReport.${type}`;
  return (
    <Card className="overflow-visible" data-testid={`card-sample-report-${type}`}>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-semibold text-sm">{t(`${prefix}.title`)}</h3>
          <Badge variant="secondary" data-testid={`badge-report-${type}`}>{t(`${prefix}.badge`)}</Badge>
        </div>
        <div className="rounded-md bg-muted/50 p-3" data-testid={`text-report-${type}-summary`}>
          <p className="text-xs font-medium mb-1 text-foreground">{t("landing.sampleReport.executiveSummary")}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{t(`${prefix}.summary`)}</p>
        </div>
        <ul className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-report-${type}-item-${i}`}>
              <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
              <span className="text-muted-foreground text-xs">{t(`${prefix}.item${i}`)}</span>
            </li>
          ))}
        </ul>
        <div className="pt-2 border-t border-border space-y-1.5">
          <p className="text-xs text-primary font-medium" data-testid={`text-report-${type}-outlook`}>{t(`${prefix}.outlook`)}</p>
          <p className="text-xs text-muted-foreground" data-testid={`text-report-${type}-sources`}>{t(`${prefix}.sources`)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Landing() {
  const { t } = useLanguage();
  const [showAllUseCases, setShowAllUseCases] = useState(false);
  const [heroCompany, setHeroCompany] = useState("");
  const [heroLoading, setHeroLoading] = useState(false);

  const handleHeroAnalyze = async () => {
    const company = heroCompany.trim();
    if (!company) {
      alert(t("demo.hero.emptyInput"));
      return;
    }

    console.log("Analysis started:", company);
    setHeroLoading(true);

    try {
      const response = await fetch("/api/demo/quick-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company }),
      });

      const data = await response.json();
      console.log("API Response:", data);

      if (data.success) {
        window.location.href = `/demo/progress/${data.job_id}`;
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      console.error("Error:", error);
      alert(t("demo.hero.networkError"));
    } finally {
      setHeroLoading(false);
    }
  };

  const useCases = [
    { icon: TrendingUp, title: t("landing.useCase.dailyMarketBrief"), description: t("landing.useCase.dailyMarketBriefDesc") },
    { icon: Building2, title: t("landing.useCase.competitorSignalMonitor"), description: t("landing.useCase.competitorSignalMonitorDesc") },
    { icon: Factory, title: t("landing.useCase.websitePromotion"), description: t("landing.useCase.websitePromotionDesc") },
    { icon: Scale, title: t("landing.useCase.researchPaperTracker"), description: t("landing.useCase.researchPaperTrackerDesc") },
    { icon: Ship, title: t("landing.useCase.communityResearch"), description: t("landing.useCase.communityResearchDesc") },
    { icon: UserSearch, title: t("landing.useCase.contentIdeas"), description: t("landing.useCase.contentIdeasDesc") },
    { icon: Wallet, title: t("landing.useCase.workProductivity"), description: t("landing.useCase.workProductivityDesc") },
    { icon: LineChart, title: t("landing.useCase.onlineBusiness"), description: t("landing.useCase.onlineBusinessDesc") },
    { icon: MessageCircle, title: t("landing.useCase.koreaMarketplace"), description: t("landing.useCase.koreaMarketplaceDesc") },
    { icon: MessageSquare, title: t("landing.useCase.chatControl"), description: t("landing.useCase.chatControlDesc") },
    { icon: Sparkles, title: t("landing.useCase.byoLlm"), description: t("landing.useCase.byoLlmDesc") },
  ];

  const visibleUseCases = showAllUseCases ? useCases : useCases.slice(0, 4);

  const faqItems = [
    { q: t("landing.faq.q1"), a: t("landing.faq.a1") },
    { q: t("landing.faq.q2"), a: t("landing.faq.a2") },
    { q: t("landing.faq.q3"), a: t("landing.faq.a3") },
    { q: t("landing.faq.q4"), a: t("landing.faq.a4") },
    { q: t("landing.faq.q5"), a: t("landing.faq.a5") },
    { q: t("landing.faq.q6"), a: t("landing.faq.a6") },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Nav — kept as-is with Bot icon */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Maker</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ShareButton />
            <LanguageSwitcher />
            <ThemeToggle />
            <Button asChild data-testid="button-login-nav">
              <a href="/api/login">{t("landing.nav.signIn")}</a>
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16">
        {/* ===== HERO: 5-Minute Demo CTA ===== */}
        <section
          className="pt-12 pb-6"
          style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
          data-testid="section-hero-demo"
        >
          <div className="max-w-6xl mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-sm px-3 py-1" data-testid="badge-gpt4o-hero">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Powered by OpenAI GPT-4o
              </Badge>
            </div>
            <h1
              className="text-white font-extrabold mb-6"
              style={{ fontSize: "clamp(1.8rem, 5vw, 3rem)" }}
              data-testid="text-hero-headline"
            >
              {t("demo.hero.headline1")}
              <br />
              <span className="text-yellow-300">{t("demo.hero.headline2")}</span>
            </h1>
            <p className="text-white/90 text-lg mb-10 max-w-xl mx-auto" data-testid="text-hero-subheadline">
              {t("demo.hero.subheadline")}
              <br />
              <strong>{t("demo.hero.subheadlineBold")}</strong>
            </p>
            <div className="bg-white/95 dark:bg-background/95 rounded-2xl p-8 max-w-xl mx-auto">
              <div className="flex gap-4 mb-5">
                <Input
                  type="text"
                  value={heroCompany}
                  onChange={(e) => setHeroCompany(e.target.value)}
                  placeholder={t("demo.hero.placeholder")}
                  className="flex-1"
                  data-testid="input-hero-company"
                />
                <Button
                  onClick={handleHeroAnalyze}
                  disabled={heroLoading}
                  style={{ background: "#667eea" }}
                  data-testid="button-hero-analyze"
                >
                  {heroLoading ? t("demo.hero.analyzing") : t("demo.hero.analyzeButton")}
                </Button>
              </div>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 m-0 flex items-center justify-center gap-4 flex-wrap" data-testid="text-hero-benefits">
                <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> {t("demo.hero.benefitFree")}</span>
                <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> {t("demo.hero.benefitNoSignup")}</span>
                <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> {t("demo.hero.benefitTime")}</span>
              </p>
            </div>
          </div>
        </section>

        {/* ===== HERO: CTA + Pipeline + Demo Login ===== */}
        <section className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold leading-tight" data-testid="text-hero-title">
                {t("landing.hero.title1")}
                <br />
                <span className="text-primary">{t("landing.hero.title2")}</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-lg" data-testid="text-hero-subtitle">
                {t("landing.hero.subtitle")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild data-testid="button-get-started">
                  <a href="/api/login">
                    {t("landing.hero.getStarted")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4" />
                  <span>{t("landing.hero.badge1")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{t("landing.hero.badge2")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{t("landing.hero.badge3")}</span>
                </div>
              </div>
            </div>

            <div className="relative space-y-6">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-md p-8 border border-border/50">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-background rounded-md border border-border">
                    <Newspaper className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-medium">{t("landing.hero.chooseSources")}</div>
                      <div className="text-sm text-muted-foreground">{t("landing.hero.chooseSourcesDesc")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-background rounded-md border border-border">
                    <Clock className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-medium">{t("landing.hero.scheduleFormat")}</div>
                      <div className="text-sm text-muted-foreground">{t("landing.hero.scheduleFormatDesc")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-background rounded-md border border-border">
                    <Sparkles className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-medium">{t("landing.hero.aiAnalysis")}</div>
                      <div className="text-sm text-muted-foreground">{t("landing.hero.aiAnalysisDesc")}</div>
                    </div>
                  </div>
                </div>
              </div>
              <DemoLoginForm />
            </div>
          </div>
        </section>

        {/* ===== SAMPLE REPORTS ===== */}
        <section className="max-w-6xl mx-auto px-6 py-16" data-testid="section-sample-reports">
          <h2 className="text-2xl font-bold text-center mb-4">{t("landing.sampleReport.title")}</h2>
          <p className="text-center text-muted-foreground mb-4 max-w-lg mx-auto">
            {t("landing.sampleReport.subtitle")}
          </p>
          <p className="text-center text-xs text-muted-foreground mb-10 flex items-center justify-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {t("landing.sampleReport.daily")}
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <SampleReportCard type="promotion" />
            <SampleReportCard type="market" />
            <SampleReportCard type="research" />
          </div>
        </section>

        {/* ===== WHY MAKER ===== */}
        <section className="max-w-6xl mx-auto px-6 py-16" data-testid="section-why-maker">
          <h2 className="text-2xl font-bold text-center mb-4">{t("landing.whyMaker.title")}</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            {t("landing.whyMaker.subtitle")}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, titleKey: "landing.whyMaker.dataOwnership", descKey: "landing.whyMaker.dataOwnershipDesc" },
              { icon: Sparkles, titleKey: "landing.whyMaker.swapAI", descKey: "landing.whyMaker.swapAIDesc" },
              { icon: RefreshCw, titleKey: "landing.whyMaker.worksOffline", descKey: "landing.whyMaker.worksOfflineDesc" },
              { icon: Eye, titleKey: "landing.whyMaker.humanControl", descKey: "landing.whyMaker.humanControlDesc" },
            ].map((item) => (
              <Card key={item.titleKey} className="hover-elevate" data-testid={`card-why-${item.titleKey.split(".").pop()}`}>
                <CardContent className="pt-6 space-y-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{t(item.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(item.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-4" data-testid="text-how-it-works">{t("landing.howItWorks.title")}</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            {t("landing.howItWorks.subtitle")}
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover-elevate">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">{t("landing.howItWorks.step1Title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("landing.howItWorks.step1Desc")}
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Rss className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">{t("landing.howItWorks.step2Title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("landing.howItWorks.step2Desc")}
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">{t("landing.howItWorks.step3Title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("landing.howItWorks.step3Desc")}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ===== USE CASES (collapsible) ===== */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-4" data-testid="text-use-cases">{t("landing.useCases.title")}</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            {t("landing.useCases.subtitle")}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {visibleUseCases.map((uc) => (
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
          {useCases.length > 4 && (
            <div className="mt-8 text-center">
              <Button
                variant="outline"
                onClick={() => setShowAllUseCases(!showAllUseCases)}
                data-testid="button-toggle-use-cases"
              >
                {showAllUseCases ? t("landing.useCases.showLess") : t("landing.useCases.showMore")}
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showAllUseCases ? "rotate-180" : ""}`} />
              </Button>
            </div>
          )}
        </section>

        {/* ===== OPEN SOURCE ===== */}
        <section className="max-w-3xl mx-auto px-6 py-12" data-testid="section-open-source">
          <Card>
            <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Github className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold" data-testid="text-open-source-title">{t("landing.openSource.title")}</h3>
                <p className="text-sm text-muted-foreground" data-testid="text-open-source-desc">{t("landing.openSource.desc")}</p>
              </div>
              <Button variant="outline" asChild className="shrink-0" data-testid="button-github">
                <a href="https://github.com/Salepark/maker" target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4 mr-2" />
                  {t("landing.openSource.github")}
                  <ExternalLink className="h-3.5 w-3.5 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* ===== FAQ ===== */}
        <section className="max-w-3xl mx-auto px-6 py-16" data-testid="section-faq">
          <h2 className="text-2xl font-bold text-center mb-4">{t("landing.faq.title")}</h2>
          <p className="text-center text-muted-foreground mb-8">
            {t("landing.faq.subtitle")}
          </p>
          <Card>
            <CardContent className="pt-6">
              {faqItems.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </CardContent>
          </Card>
        </section>

        {/* ===== PRICING ===== */}
        <section className="max-w-6xl mx-auto px-6 py-16" data-testid="section-pricing">
          <h2 className="text-2xl font-bold text-center mb-2">{t("landing.pricing.title")}</h2>
          <p className="text-center text-muted-foreground mb-12">{t("landing.pricing.subtitle")}</p>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                key: "web",
                icon: BarChart3,
                color: "bg-blue-500 dark:bg-blue-600",
                features: [t("landing.pricing.web.f1"), t("landing.pricing.web.f2"), t("landing.pricing.web.f3"), t("landing.pricing.web.f4")],
                popular: false,
              },
              {
                key: "local",
                icon: TrendingUp,
                color: "bg-primary",
                features: [t("landing.pricing.local.f1"), t("landing.pricing.local.f2"), t("landing.pricing.local.f3")],
                popular: true,
              },
              {
                key: "teams",
                icon: Landmark,
                color: "bg-slate-600 dark:bg-slate-500",
                features: [t("landing.pricing.teams.f1"), t("landing.pricing.teams.f2"), t("landing.pricing.teams.f3")],
                popular: false,
              },
            ].map((plan) => (
              <Card key={plan.key} className={`flex flex-col relative ${plan.popular ? "ring-2 ring-primary shadow-lg scale-105" : ""}`} data-testid={`card-pricing-${plan.key}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3">BEST</Badge>
                  </div>
                )}
                <div className={`${plan.color} rounded-t-md flex items-center justify-center py-5`}>
                  <plan.icon className="h-10 w-10 text-white" />
                </div>
                <CardContent className="pt-5 pb-6 flex flex-col flex-1 gap-4">
                  <div>
                    <h3 className="font-bold text-lg" data-testid={`text-pricing-price-${plan.key}`}>
                      {t(`landing.pricing.${plan.key}.price`)}
                    </h3>
                    <span className="text-xs text-muted-foreground">{t(`landing.pricing.${plan.key}.name`)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t(`landing.pricing.${plan.key}.desc`)}</p>
                  <ul className="space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className={`w-full ${plan.popular ? "" : "variant-outline"}`} variant={plan.popular ? "default" : "outline"} data-testid={`button-pricing-${plan.key}`}>
                    <a href="/api/login">
                      {t(`landing.pricing.${plan.key}.button`)}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ===== PHILOSOPHY ===== */}
        <section className="max-w-3xl mx-auto px-6 py-12 text-center" data-testid="section-philosophy">
          <p className="text-lg italic text-muted-foreground leading-relaxed">
            {t("landing.philosophy.line1")}
            <br />
            {t("landing.philosophy.line2")}
          </p>
        </section>

        {/* ===== BOTTOM CTA (Dual) ===== */}
        <section className="max-w-3xl mx-auto px-6 py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">{t("landing.cta.title")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("landing.cta.subtitle")}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild data-testid="button-cta-bottom">
              <a href="/api/login">
                {t("landing.cta.button")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>{t("landing.footer")}</p>
      </footer>
    </div>
  );
}
