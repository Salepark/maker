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
        { name: "Reuters Business", url: "https://www.reutersagency.com/feed/", topic: "investing" },
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
        { name: "SEC RSS", url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=8-K&dateb=&owner=include&count=40&search_text=&action=getcompany&output=atom", topic: "investing" },
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
        { name: "ArXiv CV", url: "https://rss.arxiv.org/rss/cs.CV", topic: "ai_art" },
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
        { name: "AI Art Weekly", url: "https://www.reddit.com/r/aiart/.rss", topic: "ai_art" },
        { name: "Stable Diffusion", url: "https://www.reddit.com/r/StableDiffusion/.rss", topic: "ai_art" },
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
        { name: "Hacker News", url: "https://hnrss.org/newest", topic: "tech" },
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
        { name: "AI Art Weekly", url: "https://www.reddit.com/r/aiart/.rss", topic: "ai_art" },
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
