import { storage } from "../storage";
import { callLLM } from "../llm/client";
import { buildDailyBriefPrompt } from "../llm/prompts";

interface DailyBriefOptions {
  lookbackHours?: number;
  maxItems?: number;
  topic?: string;
  force?: boolean;
}

interface DailyBriefResult {
  id: number;
  itemsCount: number;
}

export async function generateDailyBrief(options: DailyBriefOptions = {}): Promise<DailyBriefResult> {
  const { lookbackHours = 24, maxItems = 12, topic = "ai_art" } = options;

  console.log(`[DailyBrief] Generating report for topic=${topic}, lookback=${lookbackHours}h, maxItems=${maxItems}`);

  const items = await storage.getAnalyzedItemsForBrief(lookbackHours, maxItems, topic);
  
  if (items.length === 0) {
    console.log("[DailyBrief] No analyzed items found for the lookback period");
    const report = await storage.createReport({
      topic,
      title: `Daily Brief - No Data`,
      content: `# Daily Market Brief\n\n> No analyzed items found. Please try again after data collection.`,
      itemsCount: 0,
      itemIdsJson: [],
    });
    return { id: report.id, itemsCount: 0 };
  }

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Seoul",
  });

  const prompt = buildDailyBriefPrompt(items, today, topic);

  console.log(`[DailyBrief] Calling LLM with ${items.length} items...`);
  
  const content = await callLLM(prompt, 3, 4000);

  const report = await storage.createReport({
    topic,
    title: `Daily Brief - ${today}`,
    content,
    itemsCount: items.length,
    itemIdsJson: items.map((i) => i.id),
  });

  console.log(`[DailyBrief] Report created with ID=${report.id}`);

  return { id: report.id, itemsCount: items.length };
}
