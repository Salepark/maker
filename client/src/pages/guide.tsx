import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Settings, Bot, Rss, MessageSquare, FileText, ChevronDown, Zap, Brain } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-provider";

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
  const { t } = useLanguage();

  const stepIcons = [Rocket, Settings, Bot, Rss, MessageSquare, FileText];

  const steps = [
    {
      number: "1",
      icon: stepIcons[0],
      title: t("guide.step1.title"),
      content: (
        <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>{t("guide.step1.p1")}</p>
          <p>{t("guide.step1.p2")}</p>
        </div>
      ),
    },
    {
      number: "2",
      icon: stepIcons[1],
      title: t("guide.step2.title"),
      subtitle: t("guide.step2.subtitle"),
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>{t("guide.step2.p1")}</p>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li dangerouslySetInnerHTML={{ __html: t("guide.step2.li1") }} />
            <li dangerouslySetInnerHTML={{ __html: t("guide.step2.li2") }} />
            <li>{t("guide.step2.li3")}</li>
          </ol>
          <div className="rounded-md bg-muted/50 p-3 space-y-1 text-xs">
            <p><strong className="text-foreground">{t("guide.step2.fieldName")}</strong> {t("guide.step2.fieldNameEx")}</p>
            <p><strong className="text-foreground">{t("guide.step2.fieldType")}</strong> {t("guide.step2.fieldTypeEx")}</p>
            <p><strong className="text-foreground">{t("guide.step2.fieldKey")}</strong> {t("guide.step2.fieldKeyEx")}</p>
            <p><strong className="text-foreground">{t("guide.step2.fieldUrl")}</strong> {t("guide.step2.fieldUrlEx")}</p>
            <p><strong className="text-foreground">{t("guide.step2.fieldModel")}</strong> {t("guide.step2.fieldModelEx")}</p>
          </div>
          <p>{t("guide.step2.done")}</p>
        </div>
      ),
    },
    {
      number: "3",
      icon: stepIcons[2],
      title: t("guide.step3.title"),
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li dangerouslySetInnerHTML={{ __html: t("guide.step3.li1") }} />
            <li dangerouslySetInnerHTML={{ __html: t("guide.step3.li2") }} />
            <li>{t("guide.step3.li3")}</li>
            <li>{t("guide.step3.li4")}</li>
          </ol>
          <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
            <p>{t("guide.step3.hint1")}</p>
            <p>{t("guide.step3.hint2")}</p>
          </div>
        </div>
      ),
    },
    {
      number: "4",
      icon: stepIcons[3],
      title: t("guide.step4.title"),
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>{t("guide.step4.p1")}</p>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li dangerouslySetInnerHTML={{ __html: t("guide.step4.li1") }} />
            <li>{t("guide.step4.li2")}</li>
            <li>{t("guide.step4.li3")}</li>
          </ol>
          <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
            <p>{t("guide.step4.hint1")}</p>
            <p>{t("guide.step4.hint2")}</p>
          </div>
        </div>
      ),
    },
    {
      number: "5",
      icon: stepIcons[4],
      title: t("guide.step5.title"),
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p dangerouslySetInnerHTML={{ __html: t("guide.step5.p1") }} />
          <p>{t("guide.step5.p2")}</p>
          <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
            <p>{t("guide.step5.cmd1")}</p>
            <p>{t("guide.step5.cmd2")}</p>
            <p>{t("guide.step5.cmd3")}</p>
          </div>
          <p dangerouslySetInnerHTML={{ __html: t("guide.step5.p3") }} />
        </div>
      ),
    },
    {
      number: "6",
      icon: stepIcons[5],
      title: t("guide.step6.title"),
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li dangerouslySetInnerHTML={{ __html: t("guide.step6.li1") }} />
            <li>{t("guide.step6.li2")}</li>
            <li>{t("guide.step6.li3")}</li>
            <li>{t("guide.step6.li4")}</li>
          </ol>
          <div className="rounded-md bg-muted/50 p-3 text-xs">
            <p>{t("guide.step6.hint")}</p>
          </div>
        </div>
      ),
    },
  ];

  const faqItems = [
    { q: t("guide.faq.q1"), a: t("guide.faq.a1") },
    { q: t("guide.faq.q2"), a: t("guide.faq.a2") },
    { q: t("guide.faq.q3"), a: t("guide.faq.a3") },
    { q: t("guide.faq.q4"), a: t("guide.faq.a4") },
    { q: t("guide.faq.q5"), a: t("guide.faq.a5") },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold" data-testid="text-guide-title">{t("guide.title")}</h1>
        <p className="text-muted-foreground text-sm" data-testid="text-guide-intro">
          {t("guide.intro")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            <span data-testid="text-guide-capabilities">{t("guide.capabilities")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>{t("guide.capability1")}</li>
            <li>{t("guide.capability2")}</li>
            <li>{t("guide.capability3")}</li>
            <li>{t("guide.capability4")}</li>
            <li>{t("guide.capability5")}</li>
          </ul>
          <div className="mt-4 rounded-md bg-muted/50 p-3 text-sm text-foreground" data-testid="text-guide-core">
            <strong>{t("guide.corePoint")}</strong> {t("guide.coreDesc")}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold" data-testid="text-guide-steps-heading">
          {t("guide.stepsHeading")}
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
        <h2 className="text-lg font-semibold" data-testid="text-guide-faq">{t("guide.faq.title")}</h2>
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
          <p className="text-sm font-semibold text-foreground" data-testid="text-guide-philosophy">{t("guide.philosophy")}</p>
          <p className="text-xs text-muted-foreground">
            {t("guide.philosophyDesc")}
          </p>
          <div className="flex justify-center gap-3 pt-2 flex-wrap">
            <Button asChild size="sm" data-testid="button-guide-settings">
              <Link href="/settings">{t("guide.settingsButton")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline" data-testid="button-guide-bots">
              <Link href="/bots">{t("guide.botsButton")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pb-4">
        <p>maker.am</p>
      </div>
    </div>
  );
}
