import { db } from "./db";
import { presets, sources } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { PresetDefaultConfig } from "@shared/schema";

export async function seedPresets() {
  const existingPresets = await db.select().from(presets);
  
  if (existingPresets.length > 0) {
    console.log(`[seed] Presets already exist (${existingPresets.length} found), checking for new presets...`);
    const existingKeys = new Set(existingPresets.map(p => p.key));
    const newPresets = presetData.filter(p => !existingKeys.has(p.key));
    if (newPresets.length > 0) {
      await db.insert(presets).values(newPresets);
      console.log(`[seed] Added ${newPresets.length} new presets`);
    }
    for (const p of presetData) {
      if (existingKeys.has(p.key)) {
        await db.update(presets)
          .set({ defaultConfigJson: p.defaultConfigJson, icon: p.icon, category: p.category, description: p.description })
          .where(eq(presets.key, p.key));
      }
    }
    return;
  }

  console.log("[seed] Seeding presets...");
  await db.insert(presets).values(presetData);
  console.log(`[seed] Created ${presetData.length} presets`);
}

const presetData: Array<{
  key: string;
  name: string;
  outputType: string;
  description: string;
  variantsJson: string[];
  defaultConfigJson: PresetDefaultConfig;
  icon: string;
  category: string;
}> = [
  {
    key: "news_briefing",
    name: "News Briefing",
    outputType: "report",
    description: "Daily news digest from selected sources. Get a concise summary of key events and developments.",
    variantsJson: ["tech", "investing", "crypto"],
    icon: "Newspaper",
    category: "information",
    defaultConfigJson: {
      timezone: "Asia/Seoul",
      scheduleRule: "DAILY",
      scheduleTimeLocal: "07:00",
      markdownLevel: "minimal",
      verbosity: "normal",
      sections: { tldr: true, drivers: true, risk: false, checklist: false, sources: true },
      filters: { minImportanceScore: 30 },
      suggestedSources: [
        { name: "Hacker News", url: "https://hnrss.org/newest", topic: "tech" },
        { name: "TechCrunch", url: "https://techcrunch.com/feed/", topic: "tech" },
        { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", topic: "tech" },
        { name: "Reuters Business", url: "https://www.reutersagency.com/feed/", topic: "investing" },
        { name: "CNBC Top News", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", topic: "investing" },
        { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", topic: "crypto" },
      ],
    },
  },
  {
    key: "competitor_watch",
    name: "Competitor Watch",
    outputType: "report",
    description: "Monitor competitor activities, product launches, and market positioning changes.",
    variantsJson: ["tech", "investing", "ai_art"],
    icon: "Eye",
    category: "business",
    defaultConfigJson: {
      timezone: "Asia/Seoul",
      scheduleRule: "WEEKDAYS",
      scheduleTimeLocal: "09:00",
      markdownLevel: "normal",
      verbosity: "detailed",
      sections: { tldr: true, drivers: true, risk: true, checklist: true, sources: true },
      filters: { minImportanceScore: 40 },
      suggestedSources: [
        { name: "TechCrunch", url: "https://techcrunch.com/feed/", topic: "tech" },
        { name: "Product Hunt", url: "https://www.producthunt.com/feed", topic: "tech" },
        { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", topic: "tech" },
        { name: "Reuters Business", url: "https://www.reutersagency.com/feed/", topic: "investing" },
        { name: "CNBC Top News", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", topic: "investing" },
      ],
    },
  },
  {
    key: "legal_policy",
    name: "Legal / Policy Monitor",
    outputType: "report",
    description: "Track regulatory changes, policy updates, and legal developments that may affect your industry.",
    variantsJson: ["tech", "investing", "crypto"],
    icon: "Scale",
    category: "compliance",
    defaultConfigJson: {
      timezone: "Asia/Seoul",
      scheduleRule: "WEEKDAYS",
      scheduleTimeLocal: "08:00",
      markdownLevel: "normal",
      verbosity: "detailed",
      sections: { tldr: true, drivers: true, risk: true, checklist: true, sources: true },
      filters: { minImportanceScore: 50 },
      suggestedSources: [
        { name: "EFF Updates", url: "https://www.eff.org/rss/updates.xml", topic: "tech" },
        { name: "FTC News", url: "https://www.ftc.gov/feeds/press-releases.xml", topic: "tech" },
        { name: "SEC EDGAR 8-K", url: "https://efts.sec.gov/LATEST/search-index?q=%228-K%22&dateRange=custom&startdt=2024-01-01&forms=8-K&rss_url=/cgi-bin/browse-edgar%3Faction%3Dgetcompany%26type%3D8-K%26dateb%3D%26owner%3Dinclude%26count%3D20%26search_text%3D%26action%3Dgetcompany%26output%3Datom", topic: "investing" },
        { name: "Reuters Business", url: "https://www.reutersagency.com/feed/", topic: "investing" },
        { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", topic: "crypto" },
      ],
    },
  },
  {
    key: "academic_research",
    name: "Academic / Research",
    outputType: "report",
    description: "Follow the latest research papers, preprints, and academic discussions in your field.",
    variantsJson: ["tech", "ai_art"],
    icon: "GraduationCap",
    category: "research",
    defaultConfigJson: {
      timezone: "America/New_York",
      scheduleRule: "WEEKDAYS",
      scheduleTimeLocal: "10:00",
      markdownLevel: "normal",
      verbosity: "detailed",
      sections: { tldr: true, drivers: true, risk: false, checklist: false, sources: true },
      filters: { minImportanceScore: 20 },
      suggestedSources: [
        { name: "ArXiv AI", url: "https://rss.arxiv.org/rss/cs.AI", topic: "tech" },
        { name: "ArXiv Machine Learning", url: "https://rss.arxiv.org/rss/cs.LG", topic: "tech" },
        { name: "ArXiv Computer Vision", url: "https://rss.arxiv.org/rss/cs.CV", topic: "ai_art" },
        { name: "ArXiv Computation & Language", url: "https://rss.arxiv.org/rss/cs.CL", topic: "tech" },
      ],
    },
  },
  {
    key: "shopping_trends",
    name: "Shopping / Trend Watch",
    outputType: "report",
    description: "Track product trends, pricing changes, and consumer behavior insights.",
    variantsJson: ["tech", "investing"],
    icon: "ShoppingBag",
    category: "commerce",
    defaultConfigJson: {
      timezone: "Asia/Seoul",
      scheduleRule: "DAILY",
      scheduleTimeLocal: "19:00",
      markdownLevel: "minimal",
      verbosity: "short",
      sections: { tldr: true, drivers: true, risk: false, checklist: false, sources: true },
      filters: { minImportanceScore: 25 },
      suggestedSources: [
        { name: "Product Hunt", url: "https://www.producthunt.com/feed", topic: "tech" },
        { name: "TechCrunch", url: "https://techcrunch.com/feed/", topic: "tech" },
        { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", topic: "tech" },
        { name: "CNBC Top News", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", topic: "investing" },
      ],
    },
  },
  {
    key: "community_engagement",
    name: "Community Engagement",
    outputType: "draft",
    description: "Draft thoughtful replies for community posts. Help you engage authentically without promotional content.",
    variantsJson: ["ai_art", "tech", "creative"],
    icon: "MessageSquare",
    category: "engagement",
    defaultConfigJson: {
      timezone: "Asia/Seoul",
      scheduleRule: "DAILY",
      scheduleTimeLocal: "21:00",
      markdownLevel: "minimal",
      verbosity: "normal",
      sections: { tldr: false, drivers: false, risk: true, checklist: false, sources: false },
      filters: { minImportanceScore: 0 },
      suggestedSources: [
        { name: "Hacker News", url: "https://hnrss.org/newest", topic: "tech" },
        { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", topic: "tech" },
      ],
    },
  },
  {
    key: "daily_market_brief",
    name: "Daily Market Brief",
    outputType: "report",
    description: "Daily report from selected sources - summarizes key market movements and insights",
    variantsJson: ["investing", "tech", "crypto"],
    icon: "TrendingUp",
    category: "finance",
    defaultConfigJson: {
      timezone: "Asia/Seoul",
      scheduleRule: "WEEKDAYS",
      scheduleTimeLocal: "21:00",
      markdownLevel: "minimal",
      verbosity: "normal",
      sections: { tldr: true, drivers: true, risk: true, checklist: true, sources: true },
      filters: { minImportanceScore: 30 },
      suggestedSources: [
        { name: "Reuters Business", url: "https://www.reutersagency.com/feed/", topic: "investing" },
        { name: "CNBC Top News", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", topic: "investing" },
        { name: "Hacker News", url: "https://hnrss.org/newest", topic: "tech" },
        { name: "TechCrunch", url: "https://techcrunch.com/feed/", topic: "tech" },
        { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", topic: "crypto" },
      ],
    },
  },
  {
    key: "community_engagement_helper",
    name: "Community Engagement Helper",
    outputType: "draft",
    description: "Draft replies for community posts - helps you engage authentically with your community",
    variantsJson: ["ai_art", "tech", "creative"],
    icon: "Users",
    category: "engagement",
    defaultConfigJson: {
      timezone: "Asia/Seoul",
      scheduleRule: "DAILY",
      scheduleTimeLocal: "21:00",
      markdownLevel: "minimal",
      verbosity: "normal",
      sections: { tldr: false, drivers: false, risk: true, checklist: false, sources: false },
      filters: { minImportanceScore: 0 },
      suggestedSources: [
        { name: "Hacker News", url: "https://hnrss.org/newest", topic: "tech" },
      ],
    },
  },
  {
    key: "community_research_helper",
    name: "Community Research Helper",
    outputType: "draft",
    description: "커뮤니티에서 오가는 주요 논의와 트렌드를 모니터링하고, 홍보 없이 도움이 되는 요약/초안을 만들어주는 워크플로우 시작 템플릿입니다.",
    variantsJson: ["community_research"],
    icon: "Search",
    category: "engagement",
    defaultConfigJson: {
      timezone: "Asia/Seoul",
      scheduleRule: "DAILY",
      scheduleTimeLocal: "09:00",
      markdownLevel: "minimal",
      verbosity: "normal",
      sections: { tldr: true, drivers: true, risk: true, checklist: false, sources: true },
      filters: { minImportanceScore: 0 },
      requireHumanApproval: true,
      promotionLevel: "none",
      linkPolicy: "no-links",
      suggestedSources: [
        { name: "Reddit AI", url: "https://www.reddit.com/r/ArtificialInteligence/.rss", topic: "community_research" },
        { name: "Hacker News", url: "https://news.ycombinator.com/rss", topic: "community_research" },
        { name: "TechCrunch", url: "https://techcrunch.com/feed/", topic: "community_research" },
        { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", topic: "community_research" },
        { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", topic: "community_research" },
      ],
    },
  },
  {
    key: "daily_market_brief_safe",
    name: "Daily Market Brief (Safe)",
    outputType: "report",
    description: "매일 아침 시장/산업 뉴스를 안전하게 요약하는 리포트 워크플로우입니다. 홍보·링크 없이 정보 요약에만 집중합니다. 이 템플릿은 워크플로우의 출발점입니다.",
    variantsJson: ["market_brief"],
    icon: "Briefcase",
    category: "finance",
    defaultConfigJson: {
      timezone: "Asia/Seoul",
      scheduleRule: "DAILY",
      scheduleTimeLocal: "09:00",
      markdownLevel: "minimal",
      verbosity: "normal",
      sections: { tldr: true, drivers: true, risk: true, checklist: false, sources: true },
      filters: { minImportanceScore: 30 },
      requireHumanApproval: true,
      promotionLevel: "none",
      linkPolicy: "no-links",
      suggestedSources: [
        { name: "Reuters Business", url: "https://www.reutersagency.com/feed/", topic: "market_brief" },
        { name: "CNBC Top News", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", topic: "market_brief" },
        { name: "Bloomberg Markets", url: "https://feeds.bloomberg.com/markets/news.rss", topic: "market_brief" },
        { name: "Financial Times", url: "https://www.ft.com/?format=rss", topic: "market_brief" },
        { name: "WSJ Markets", url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", topic: "market_brief" },
      ],
    },
  },
  {
    key: "academic_watcher_research",
    name: "Academic Watcher (Research)",
    outputType: "report",
    description: "논문·연구 동향을 추적하고 요약하는 리서치 워크플로우입니다. 학술적 중립 톤을 유지하며 홍보·링크를 포함하지 않습니다. 이 템플릿은 워크플로우의 출발점입니다.",
    variantsJson: ["research_watch"],
    icon: "BookOpen",
    category: "research",
    defaultConfigJson: {
      timezone: "Asia/Seoul",
      scheduleRule: "WEEKDAYS",
      scheduleTimeLocal: "09:00",
      markdownLevel: "normal",
      verbosity: "detailed",
      sections: { tldr: true, drivers: true, risk: false, checklist: false, sources: true },
      filters: { minImportanceScore: 20 },
      requireHumanApproval: true,
      promotionLevel: "none",
      linkPolicy: "no-links",
      suggestedSources: [
        { name: "ArXiv AI/CL", url: "https://rss.arxiv.org/rss/cs.AI", topic: "research_watch" },
        { name: "Google Research Blog", url: "https://blog.research.google/feeds/posts/default?alt=rss", topic: "research_watch" },
        { name: "OpenAI Blog", url: "https://openai.com/blog/rss.xml", topic: "research_watch" },
        { name: "DeepMind Blog", url: "https://deepmind.google/blog/rss.xml", topic: "research_watch" },
        { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", topic: "research_watch" },
      ],
    },
  },
  {
    key: "competitor_signal_monitor",
    name: "Competitor Signal Monitor",
    outputType: "report",
    description: "경쟁사·산업 동향 변화를 요약하는 모니터링 워크플로우입니다. 사실 기반 변화 요약만 제공하며 홍보·링크를 포함하지 않습니다. 이 템플릿은 워크플로우의 출발점입니다.",
    variantsJson: ["competitor_watch"],
    icon: "Building2",
    category: "business",
    defaultConfigJson: {
      timezone: "Asia/Seoul",
      scheduleRule: "DAILY",
      scheduleTimeLocal: "09:00",
      markdownLevel: "normal",
      verbosity: "normal",
      sections: { tldr: true, drivers: true, risk: true, checklist: false, sources: true },
      filters: { minImportanceScore: 30 },
      requireHumanApproval: true,
      promotionLevel: "none",
      linkPolicy: "no-links",
      suggestedSources: [
        { name: "TechCrunch", url: "https://techcrunch.com/feed/", topic: "competitor_watch" },
        { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", topic: "competitor_watch" },
        { name: "Product Hunt", url: "https://www.producthunt.com/feed", topic: "competitor_watch" },
        { name: "Hacker News", url: "https://news.ycombinator.com/rss", topic: "competitor_watch" },
        { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", topic: "competitor_watch" },
      ],
    },
  },
];

export async function seedDefaultSources() {
  const existingDefaults = await db.select().from(sources).where(eq(sources.isDefault, true));
  
  if (existingDefaults.length > 0) {
    console.log(`[seed] Default sources already exist (${existingDefaults.length} found), skipping seed`);
    return;
  }

  console.log("[seed] Seeding default sources...");

  const defaultSources = [
    {
      name: "Hacker News",
      type: "rss",
      url: "https://hnrss.org/newest",
      topic: "tech",
      isDefault: true,
      enabled: true,
    },
    {
      name: "TechCrunch",
      type: "rss",
      url: "https://techcrunch.com/feed/",
      topic: "tech",
      isDefault: true,
      enabled: true,
    },
    {
      name: "AI Art Weekly",
      type: "rss",
      url: "https://www.reddit.com/r/aiart/.rss",
      topic: "ai_art",
      isDefault: true,
      enabled: true,
    },
  ];

  for (const source of defaultSources) {
    try {
      await db.insert(sources).values(source);
    } catch (err: any) {
      if (err.code === "23505") {
        console.log(`[seed] Source "${source.name}" already exists, skipping`);
      } else {
        throw err;
      }
    }
  }
  
  console.log(`[seed] Created default sources`);
}

export async function runAllSeeds() {
  await seedPresets();
  await seedDefaultSources();
}
