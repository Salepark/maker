import { db } from "./db";
import { presets, sources } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedPresets() {
  const existingPresets = await db.select().from(presets);
  
  if (existingPresets.length > 0) {
    console.log(`[seed] Presets already exist (${existingPresets.length} found), skipping seed`);
    return;
  }

  console.log("[seed] Seeding presets...");

  const presetData = [
    {
      key: "daily_market_brief",
      name: "Daily Market Brief",
      outputType: "report",
      description: "Daily report from selected sources - summarizes key market movements and insights",
      variantsJson: ["investing", "tech", "crypto"],
    },
    {
      key: "community_engagement_helper",
      name: "Community Engagement Helper",
      outputType: "draft",
      description: "Draft replies for community posts - helps you engage authentically with your community",
      variantsJson: ["ai_art", "tech", "creative"],
    },
    {
      key: "competitor_watch",
      name: "Competitor Watch",
      outputType: "report",
      description: "Monitor competitor activities and market changes",
      variantsJson: ["investing", "tech", "ai_art"],
    },
  ];

  await db.insert(presets).values(presetData);
  console.log(`[seed] Created ${presetData.length} presets`);
}

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
