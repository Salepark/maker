import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useLanguage } from "@/lib/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Loader2, Sparkles } from "lucide-react";

const DemoProgress = () => {
  const [match, params] = useRoute("/demo/progress/:jobId");
  const [status, setStatus] = useState<any>(null);
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const redirected = useRef(false);

  useEffect(() => {
    if (!params?.jobId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/demo/analysis-status/${params.jobId}`);
        const data = await response.json();
        setStatus(data);

        if (data.status === "completed" && !redirected.current) {
          redirected.current = true;
          clearInterval(interval);
          setTimeout(() => {
            navigate(`/demo/report/${params.jobId}`);
          }, 1200);
        }
      } catch (error) {
        console.error("Status fetch error:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [params?.jobId]);

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("demo.progress.invalidAccess")}</p>
      </div>
    );
  }

  const progress = status?.progress ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold">Maker</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6">
        <Card className="w-full max-w-md" data-testid="card-progress">
          <CardContent className="py-8 space-y-6 text-center">
            {status?.status === "completed" ? (
              <div className="text-emerald-600 dark:text-emerald-400 font-bold text-lg" data-testid="text-progress-complete">
                {t("demo.progress.complete")}
              </div>
            ) : (
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            )}

            <h1 className="text-xl font-bold" data-testid="text-progress-title">
              {status?.status === "completed" ? t("demo.progress.complete") : t("demo.progress.title")}
            </h1>
            <Badge className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white border-0 text-xs px-2.5 py-0.5 mx-auto" data-testid="badge-gpt4o-progress">
              <Sparkles className="h-3 w-3 mr-1" />
              Powered by GPT-4o
            </Badge>

            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #667eea, #764ba2)",
                }}
                data-testid="bar-progress"
              />
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <p data-testid="text-progress-percent">
                {t("demo.progress.progress")}: <span className="font-semibold text-foreground">{progress}%</span>
              </p>
              {status?.current_step && (
                <p data-testid="text-progress-step">
                  {t("demo.progress.currentStep")}: {status.current_step}
                </p>
              )}
              {status?.elapsed_time != null && (
                <p data-testid="text-progress-time">
                  {t("demo.progress.elapsedTime")}: {status.elapsed_time}{t("demo.progress.seconds")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DemoProgress;
