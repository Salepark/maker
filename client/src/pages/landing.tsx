import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Rss, ArrowRight, TrendingUp, Building2, Newspaper, ChevronDown, MessageSquare, Shield, RefreshCw, Eye, Clock, FileText, ExternalLink, Github, Sparkles, Factory, Scale, Ship, UserSearch, Wallet, LineChart, MessageCircle } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
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

export default function Landing() {
  const { t } = useLanguage();
  const [showAllUseCases, setShowAllUseCases] = useState(false);

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
            <Button variant="ghost" size="sm" asChild data-testid="link-about">
              <a href="/about">About</a>
            </Button>
            <LanguageSwitcher />
            <ThemeToggle />
            <Button asChild data-testid="button-login-nav">
              <a href="/api/login">{t("landing.nav.signIn")}</a>
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16">
        {/* ===== HERO: I.am.maker / maker.am ===== */}
        <section className="max-w-6xl mx-auto px-6 pt-12 pb-4" data-testid="section-hero">
          <div className="select-none">
            <h1
              className="font-black tracking-tight text-foreground leading-[0.95]"
              style={{ fontSize: "clamp(3rem, 10vw, 7rem)" }}
              data-testid="text-hero-title"
            >
              I.am.maker
            </h1>
            <div
              className="mt-2 inline-block px-4 py-1 rounded-md"
              style={{ backgroundColor: "#3b82f6" }}
            >
              <span
                className="font-black tracking-tight text-white leading-[0.95]"
                style={{ fontSize: "clamp(3rem, 10vw, 7rem)" }}
                data-testid="text-hero-domain"
              >
                maker.am
              </span>
            </div>
          </div>
        </section>

        {/* ===== SUB-HERO: CTA + Feature Cards ===== */}
        <section className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold leading-tight" data-testid="text-sub-hero-title">
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
            </div>

            <div className="relative space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50" data-testid="card-feature-sources">
                <Rss className="h-7 w-7 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold text-sm" data-testid="text-feature-sources-title">{t("landing.hero.chooseSources")}</div>
                  <div className="text-sm text-muted-foreground" data-testid="text-feature-sources-desc">{t("landing.hero.chooseSourcesDesc")}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50" data-testid="card-feature-schedule">
                <Clock className="h-7 w-7 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold text-sm" data-testid="text-feature-schedule-title">{t("landing.hero.scheduleFormat")}</div>
                  <div className="text-sm text-muted-foreground" data-testid="text-feature-schedule-desc">{t("landing.hero.scheduleFormatDesc")}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50" data-testid="card-feature-ai">
                <Sparkles className="h-7 w-7 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold text-sm" data-testid="text-feature-ai-title">{t("landing.hero.aiAnalysis")}</div>
                  <div className="text-sm text-muted-foreground" data-testid="text-feature-ai-desc">{t("landing.hero.aiAnalysisDesc")}</div>
                </div>
              </div>
            </div>
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
