import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShareButton } from "@/components/share-button";
import {
  Bot, ArrowLeft, Shield, Eye, Scale, Database, FileText,
  Clock, AlertTriangle, UserCheck, XCircle, CheckCircle,
  Lightbulb, HelpCircle, Rocket, Users, Building2
} from "lucide-react";

const principles = [
  { key: "p1", icon: Eye },
  { key: "p2", icon: Clock },
  { key: "p3", icon: Database },
  { key: "p4", icon: Shield },
  { key: "p5", icon: FileText },
  { key: "p6", icon: Scale },
  { key: "p7", icon: UserCheck },
];

const notUsItems = ["item1", "item2", "item3", "item4"];
const productRules = ["rule1", "rule2", "rule3", "rule4"];
const missionGoals = ["goal1", "goal2", "goal3", "goal4", "goal5"];
const whyNowQuestions = ["q1", "q2", "q3", "q4"];

export default function About() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-2">
          <a href="/" className="flex items-center gap-2" data-testid="link-about-home">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Maker</span>
          </a>
          <div className="flex items-center gap-2 flex-wrap">
            <ShareButton />
            <LanguageSwitcher />
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild data-testid="button-about-back">
              <a href="/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("about.nav.back")}
              </a>
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 max-w-4xl mx-auto px-6">
        <section className="py-12 text-center" data-testid="section-about-overview">
          <Badge variant="secondary" className="mb-6 text-sm px-4 py-1">
            {t("about.overview.tag")}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">Maker</h1>
          <div className="max-w-2xl mx-auto space-y-4 text-lg text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground">{t("about.overview.p1")}</p>
            <p className="font-semibold text-primary">{t("about.overview.p2")}</p>
            <p>{t("about.overview.p3")}</p>
            <p>{t("about.overview.p4")}</p>
            <p>{t("about.overview.p5")}</p>
          </div>
        </section>

        <hr className="border-border my-4" />

        <section className="py-12" data-testid="section-about-mission">
          <h2 className="text-2xl font-bold mb-6 text-center">{t("about.mission.title")}</h2>
          <blockquote className="text-xl italic text-center text-primary font-medium mb-6 px-4">
            "{t("about.mission.quote")}"
          </blockquote>
          <p className="text-center text-muted-foreground mb-8">{t("about.mission.p1")}</p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {missionGoals.map((g) => (
              <Badge key={g} variant="outline" className="text-sm px-3 py-1.5">
                <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                {t(`about.mission.${g}`)}
              </Badge>
            ))}
          </div>
          <p className="text-center text-muted-foreground font-medium">{t("about.mission.closing")}</p>
        </section>

        <hr className="border-border my-4" />

        <section className="py-12" data-testid="section-about-philosophy">
          <h2 className="text-2xl font-bold mb-2 text-center">{t("about.philosophy.title")}</h2>
          <div className="text-center mb-10">
            <p className="text-lg text-muted-foreground">{t("about.philosophy.subtitle1")}</p>
            <p className="text-lg text-primary font-semibold">{t("about.philosophy.subtitle2")}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {principles.map(({ key, icon: Icon }) => (
              <Card key={key} className="border border-border">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm mb-1">{t(`about.philosophy.${key}.title`)}</h3>
                      <p className="text-sm text-muted-foreground">{t(`about.philosophy.${key}.desc`)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <hr className="border-border my-4" />

        <section className="py-12" data-testid="section-about-not-us">
          <h2 className="text-2xl font-bold mb-8 text-center">{t("about.notUs.title")}</h2>
          <div className="max-w-lg mx-auto space-y-3">
            {notUsItems.map((item) => (
              <div key={item} className="flex items-center gap-3 text-muted-foreground">
                <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                <span>{t(`about.notUs.${item}`)}</span>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 font-medium text-muted-foreground">{t("about.notUs.closing")}</p>
        </section>

        <hr className="border-border my-4" />

        <section className="py-12" data-testid="section-about-product">
          <h2 className="text-2xl font-bold mb-6 text-center">{t("about.product.title")}</h2>
          <div className="max-w-lg mx-auto mb-6 space-y-2">
            {["not1", "not2", "not3"].map((n) => (
              <p key={n} className="text-muted-foreground text-center line-through decoration-muted-foreground/40">
                {t(`about.product.${n}`)}
              </p>
            ))}
          </div>
          <blockquote className="text-xl italic text-center text-primary font-semibold mb-8 px-4">
            "{t("about.product.quote")}"
          </blockquote>
          <div className="max-w-sm mx-auto space-y-3">
            {productRules.map((rule) => (
              <div key={rule} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <span className="text-sm">{t(`about.product.${rule}`)}</span>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-border my-4" />

        <section className="py-12" data-testid="section-about-why-now">
          <h2 className="text-2xl font-bold mb-6 text-center">{t("about.whyNow.title")}</h2>
          <p className="text-center text-muted-foreground mb-8">{t("about.whyNow.p1")}</p>
          <div className="max-w-md mx-auto space-y-3 mb-8">
            {whyNowQuestions.map((q) => (
              <div key={q} className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <span className="font-medium">{t(`about.whyNow.${q}`)}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-muted-foreground font-medium">{t("about.whyNow.closing")}</p>
        </section>

        <hr className="border-border my-4" />

        <section className="py-12" data-testid="section-about-vision">
          <h2 className="text-2xl font-bold mb-6 text-center">{t("about.vision.title")}</h2>
          <p className="text-center text-muted-foreground mb-4">{t("about.vision.p1")}</p>
          <blockquote className="text-xl italic text-center text-primary font-semibold mb-8 px-4">
            "{t("about.vision.quote")}"
          </blockquote>
          <div className="max-w-sm mx-auto space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30"><Users className="h-4 w-4 text-blue-600" /></div>
              <span className="text-sm">{t("about.vision.phase1")}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30"><Rocket className="h-4 w-4 text-purple-600" /></div>
              <span className="text-sm">{t("about.vision.phase2")}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30"><Building2 className="h-4 w-4 text-emerald-600" /></div>
              <span className="text-sm">{t("about.vision.phase3")}</span>
            </div>
          </div>
          <p className="text-center text-muted-foreground font-medium">{t("about.vision.closing")}</p>
        </section>

        <hr className="border-border my-4" />

        <section className="py-12" data-testid="section-about-founder">
          <h2 className="text-2xl font-bold mb-6 text-center">{t("about.founder.title")}</h2>
          <div className="max-w-2xl mx-auto space-y-4 text-muted-foreground leading-relaxed text-center">
            <p>{t("about.founder.p1")}</p>
            <p>{t("about.founder.p2")}</p>
            <p className="font-medium text-foreground">{t("about.founder.p3")}</p>
          </div>
        </section>

        <section className="py-8" data-testid="section-about-taglines">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-8 text-center">
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                {["t1", "t2", "t3", "t4"].map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs px-3 py-1">
                    {t(`about.taglines.${tag}`)}
                  </Badge>
                ))}
              </div>
              <p className="text-lg font-medium text-primary italic">
                "{t("about.investor")}"
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Maker. Control-First AI OS.</p>
      </footer>
    </div>
  );
}
