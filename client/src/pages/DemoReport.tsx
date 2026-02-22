import { useEffect, useState, useCallback } from "react";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Building2,
  Users,
  MapPin,
  Calendar,
  DollarSign,
  Globe,
  UserCircle,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Newspaper,
  Lightbulb,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Bot,
  ArrowRight,
  FileDown,
  Sparkles,
} from "lucide-react";

interface BasicInfo {
  name: string;
  nameEng?: string;
  industry: string;
  ceo: string;
  founded: string;
  headquarters: string;
  employees?: string;
  revenue?: string;
  website: string;
  stockCode?: string;
  stockMarket?: string;
  phone?: string;
  bizNo?: string;
  accountMonth?: string;
  dataSource?: string;
}

interface NewsItem {
  title: string;
  source: string;
  date: string;
  sentiment: "positive" | "neutral" | "negative";
  summary: string;
}

interface AnalysisResult {
  basicInfo: BasicInfo;
  summary: string;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  news: NewsItem[];
  insights: string[];
  aiPowered?: boolean;
  generatedAt: string;
  analysisTime: number;
}

interface ApiResponse {
  success: boolean;
  job_id: string;
  company: string;
  analysis_time: number;
  result: AnalysisResult;
}

export default function DemoReport() {
  const [match, params] = useRoute("/demo/report/:jobId");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { t } = useLanguage();

  const fetchReport = async () => {
    if (!params?.jobId) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/demo/analysis-result/${params.jobId}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = useCallback(() => {
    window.print();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [params?.jobId]);

  if (!match) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">{t("demo.report.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{t("demo.report.error")}</p>
          <Button onClick={fetchReport} data-testid="button-report-retry">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("demo.report.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const { result } = data;
  const sentimentBg = (s: string) => {
    if (s === "positive") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    if (s === "negative") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    return "bg-muted text-muted-foreground";
  };

  const infoItems = [
    { icon: Briefcase, label: t("demo.report.companyInfo.industry"), value: result.basicInfo.industry },
    { icon: UserCircle, label: t("demo.report.companyInfo.ceo"), value: result.basicInfo.ceo },
    { icon: Calendar, label: t("demo.report.companyInfo.founded"), value: result.basicInfo.founded },
    { icon: MapPin, label: t("demo.report.companyInfo.headquarters"), value: result.basicInfo.headquarters },
    ...(result.basicInfo.stockCode ? [{ icon: TrendingUp, label: "종목코드", value: `${result.basicInfo.stockCode} (${result.basicInfo.stockMarket || ''})` }] : []),
    ...(result.basicInfo.employees ? [{ icon: Users, label: t("demo.report.companyInfo.employees"), value: result.basicInfo.employees }] : []),
    ...(result.basicInfo.revenue ? [{ icon: DollarSign, label: t("demo.report.companyInfo.revenue"), value: result.basicInfo.revenue }] : []),
    ...(result.basicInfo.accountMonth ? [{ icon: Calendar, label: "결산월", value: result.basicInfo.accountMonth }] : []),
    { icon: Globe, label: t("demo.report.companyInfo.website"), value: result.basicInfo.website },
    ...(result.basicInfo.phone ? [{ icon: Building2, label: "전화번호", value: result.basicInfo.phone }] : []),
  ].filter(item => item.value);

  const swotSections = [
    {
      key: "strengths" as const,
      label: t("demo.report.swot.strengths"),
      icon: TrendingUp,
      items: result.swot.strengths,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    {
      key: "weaknesses" as const,
      label: t("demo.report.swot.weaknesses"),
      icon: TrendingDown,
      items: result.swot.weaknesses,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/20",
      border: "border-red-200 dark:border-red-800",
    },
    {
      key: "opportunities" as const,
      label: t("demo.report.swot.opportunities"),
      icon: Target,
      items: result.swot.opportunities,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      border: "border-blue-200 dark:border-blue-800",
    },
    {
      key: "threats" as const,
      label: t("demo.report.swot.threats"),
      icon: AlertTriangle,
      items: result.swot.threats,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/20",
      border: "border-amber-200 dark:border-amber-800",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border print:hidden">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold">Maker</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              className="print:hidden"
              data-testid="button-download-pdf"
            >
              <FileDown className="h-4 w-4 mr-1" />
              {t("demo.report.downloadPdf")}
            </Button>
            <LanguageSwitcher />
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild data-testid="button-back-home">
              <a href="/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("demo.report.backToHome")}
              </a>
            </Button>
          </div>
        </div>
      </nav>

      <div className="hidden print:block mb-6 pb-4 border-b-2 border-gray-800" data-testid="print-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 mb-1">Maker AI Market Briefing</div>
            <h1 className="text-2xl font-bold text-gray-900">{result.basicInfo.name} — {t("demo.report.title")}</h1>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>{t("demo.report.generatedAt")}: {new Date(result.generatedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</div>
            <div>{t("demo.report.analysisTime")}: {result.analysisTime}{t("demo.report.secondsUnit")}</div>
            <div className="mt-1 inline-block bg-gray-800 text-white text-[7pt] px-2 py-0.5 rounded">GPT-4o Powered</div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8 print:max-w-none print:px-0 print:py-0 print:space-y-4">
        {/* Header */}
        <div className="space-y-2 print:hidden" data-testid="section-report-header">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-report-title">
              {t("demo.report.title")}
            </h1>
            <Badge className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white border-0 text-xs px-2.5 py-1" data-testid="badge-gpt4o-report">
              <Sparkles className="h-3 w-3 mr-1" />
              GPT-4o
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span>{t("demo.report.generatedAt")}: {new Date(result.generatedAt).toLocaleDateString()}</span>
            <span>{t("demo.report.analysisTime")}: {result.analysisTime}{t("demo.report.secondsUnit")}</span>
          </div>
        </div>

        {/* 1. Company Overview */}
        <Card data-testid="section-company-info">
          <CardHeader className="flex flex-row items-center gap-2 pb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t("demo.report.companyInfo")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h2 className="text-xl font-bold" data-testid="text-company-name">
                {result.basicInfo.name}
              </h2>
              {result.basicInfo.nameEng && (
                <p className="text-sm text-muted-foreground">{result.basicInfo.nameEng}</p>
              )}
              {result.basicInfo.dataSource && (
                <Badge variant="outline" className="mt-2 text-xs">
                  {result.basicInfo.dataSource}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {infoItems.map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <item.icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium" data-testid={`text-info-${item.label.toLowerCase()}`}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Executive Summary */}
        <Card data-testid="section-summary">
          <CardHeader className="flex flex-row items-center gap-2 pb-4">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t("demo.report.summary")}</CardTitle>
            {result.aiPowered && (
              <Badge className="ml-auto bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] px-2 py-0.5">
                <Sparkles className="h-3 w-3 mr-1" />
                GPT-4o AI 분석
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground" data-testid="text-summary">
              {result.summary}
            </p>
          </CardContent>
        </Card>

        {/* 2. SWOT Analysis */}
        <div data-testid="section-swot">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t("demo.report.swot")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {swotSections.map((section) => (
              <Card
                key={section.key}
                className={`${section.bg} border ${section.border}`}
                data-testid={`card-swot-${section.key}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${section.color}`}>
                    <section.icon className="h-4 w-4" />
                    {section.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${section.color.replace("text-", "bg-")}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 3. Latest News */}
        <div data-testid="section-news">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            {t("demo.report.news")}
          </h2>
          <div className="space-y-3">
            {result.news.map((article, i) => (
              <Card key={i} data-testid={`card-news-${i}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="text-sm font-semibold leading-snug" data-testid={`text-news-title-${i}`}>
                        {article.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {article.source} &middot; {new Date(article.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                        {article.summary}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`shrink-0 text-xs ${sentimentBg(article.sentiment)}`}
                      data-testid={`badge-sentiment-${i}`}
                    >
                      {t(`demo.report.news.${article.sentiment}`)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 4. Key Insights */}
        <div data-testid="section-insights">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            {t("demo.report.insights")}
          </h2>
          <Card>
            <CardContent className="py-4">
              <ol className="space-y-3">
                {result.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-3" data-testid={`text-insight-${i}`}>
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed">{insight}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <Card
          className="border-2 border-primary/20 print:hidden"
          style={{ background: "linear-gradient(135deg, #667eea20 0%, #764ba220 100%)" }}
          data-testid="section-cta"
        >
          <CardContent className="py-8 text-center space-y-4">
            <h2 className="text-xl font-bold">{t("demo.report.cta")}</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              {t("demo.report.ctaDesc")}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button asChild data-testid="button-cta-signup">
                <a href="/api/login">
                  {t("demo.report.ctaButton")}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </a>
              </Button>
              <Button variant="outline" asChild data-testid="button-new-analysis">
                <a href="/">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {t("demo.report.newAnalysis")}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-[8pt] text-gray-400" data-testid="print-footer">
        <p>본 리포트는 Maker AI Market Briefing 서비스에 의해 자동 생성되었습니다. | Powered by OpenAI GPT-4o</p>
        <p className="mt-1">© {new Date().getFullYear()} Maker — AI 시장 브리핑 서비스 | maker.app</p>
      </div>
    </div>
  );
}
