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
          .set({ name: p.name, defaultConfigJson: p.defaultConfigJson, icon: p.icon, category: p.category, description: p.description, variantsJson: p.variantsJson })
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
    description: "A workflow starter template that monitors key community discussions and trends, and generates helpful summaries/drafts without promotion.",
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
    name: "Daily Market Brief Assistant",
    outputType: "report",
    description: "An AI assistant that automatically collects major market news on stocks, economy, and crypto, then creates a summary briefing so you can see what matters today at a glance. Use it to quickly grasp market trends every morning.",
    variantsJson: ["market_brief"],
    icon: "Briefcase",
    category: "finance",
    defaultConfigJson: {
      timezone: "Asia/Seoul",
      scheduleRule: "DAILY",
      scheduleTimeLocal: "08:00",
      markdownLevel: "minimal",
      verbosity: "normal",
      sections: { tldr: true, marketHighlights: true, whyItMatters: true, watchlist: true, sources: true },
      filters: { minImportanceScore: 30 },
      requireHumanApproval: true,
      promotionLevel: "none",
      linkPolicy: "optional",
      suggestedSources: [
        { name: "Reuters Business", url: "https://www.reutersagency.com/feed/", topic: "market_brief" },
        { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex", topic: "market_brief" },
        { name: "Investing.com News", url: "https://www.investing.com/rss/news.rss", topic: "market_brief" },
        { name: "Reddit r/investing", url: "https://www.reddit.com/r/investing/.rss", topic: "market_brief" },
        { name: "Reddit r/stocks", url: "https://www.reddit.com/r/stocks/.rss", topic: "market_brief" },
        { name: "CNBC Top News", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", topic: "market_brief" },
      ],
    },
  },
  {
    key: "work_productivity",
    name: "Work & Productivity Research Assistant",
    outputType: "report",
    description: "A research assistant that automatically collects productivity tips, operational know-how, practical ideas, and tool use cases, then organizes them into actionable improvement hints for your day. Great for planning, marketing, operations, and solo business workflows.",
    variantsJson: ["work_productivity"],
    icon: "Laptop",
    category: "business",
    defaultConfigJson: {
      timezone: "Asia/Seoul",
      scheduleRule: "DAILY",
      scheduleTimeLocal: "09:00",
      markdownLevel: "minimal",
      verbosity: "normal",
      sections: { todaysInsights: true, usefulIdeasTools: true, howToApply: true, quickSummary: true, sources: true },
      filters: { minImportanceScore: 30 },
      requireHumanApproval: true,
      promotionLevel: "none",
      linkPolicy: "optional",
      suggestedSources: [
        { name: "Reddit r/productivity", url: "https://www.reddit.com/r/productivity/.rss", topic: "work_productivity" },
        { name: "Reddit r/Entrepreneur", url: "https://www.reddit.com/r/Entrepreneur/.rss", topic: "work_productivity" },
        { name: "Reddit r/smallbusiness", url: "https://www.reddit.com/r/smallbusiness/.rss", topic: "work_productivity" },
        { name: "Reddit r/marketing", url: "https://www.reddit.com/r/marketing/.rss", topic: "work_productivity" },
        { name: "Indie Hackers", url: "https://www.indiehackers.com/feed.xml", topic: "work_productivity" },
        { name: "Medium Productivity", url: "https://medium.com/feed/tag/productivity", topic: "work_productivity" },
      ],
    },
  },
  {
    key: "academic_watcher_research",
    name: "Academic Watcher (Research)",
    outputType: "report",
    description: "A research workflow that tracks and summarizes paper/research trends. Maintains an academically neutral tone with no promotion or links. This template is a starting point.",
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
    key: "content_research",
    name: "Content Ideas & Research Assistant",
    outputType: "report",
    description: "A research assistant that automatically collects material for blogs, newsletters, and content planning, then summarizes what people are interested in right now. Automate finding topics, spotting trends, and preparing drafts.",
    variantsJson: ["content_research"],
    icon: "PenTool",
    category: "research",
    defaultConfigJson: {
      timezone: "Asia/Seoul",
      scheduleRule: "DAILY",
      scheduleTimeLocal: "09:00",
      markdownLevel: "minimal",
      verbosity: "normal",
      sections: { tldr: true, drivers: true, risk: false, checklist: true, sources: true },
      filters: { minImportanceScore: 0 },
      requireHumanApproval: true,
      promotionLevel: "none",
      linkPolicy: "no-links",
      suggestedSources: [
        { name: "Medium Trending", url: "https://medium.com/feed/trending", topic: "content_research" },
        { name: "Reddit Writing", url: "https://www.reddit.com/r/writing/.rss", topic: "content_research" },
        { name: "Reddit Blogging", url: "https://www.reddit.com/r/Blogging/.rss", topic: "content_research" },
        { name: "Reddit Content Marketing", url: "https://www.reddit.com/r/content_marketing/.rss", topic: "content_research" },
        { name: "Hacker News", url: "https://news.ycombinator.com/rss", topic: "content_research" },
      ],
    },
  },
  {
    key: "competitor_signal_monitor",
    name: "Competitor Signal Monitor",
    outputType: "report",
    description: "A monitoring workflow that summarizes competitor and industry trend changes. Provides fact-based change summaries only — no promotion or links. This template is a starting point.",
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
