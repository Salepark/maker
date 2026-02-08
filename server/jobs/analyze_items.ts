import { storage } from "../storage";
import { callLLMWithJsonParsing } from "../llm/client";
import { 
  buildAnalyzePrompt, 
  buildAiArtCommunityAnalyzePrompt,
  type AnalysisResult 
} from "../llm/prompts";

export async function analyzeNewItemsBySourceIds(sourceIds: number[], limit: number = 50): Promise<number> {
  console.log(`[AnalyzeJob] Starting bot-scoped analysis for ${sourceIds.length} sources...`);
  const items = await storage.getItemsByStatusAndSourceIds("new", sourceIds, limit);
  console.log(`[AnalyzeJob] Found ${items.length} new items from bot sources`);
  let analyzed = 0;

  for (const item of items) {
    console.log(`[AnalyzeJob] Analyzing item #${item.id} (topic: ${item.sourceTopic}): ${item.title?.slice(0, 50)}...`);

    const prompt = item.sourceTopic === "ai_art"
      ? buildAiArtCommunityAnalyzePrompt({
          title: item.title ?? "",
          body: item.contentText ?? "",
          sourceName: item.sourceName ?? "unknown",
        })
      : buildAnalyzePrompt({
          title: item.title ?? "",
          body: item.contentText ?? "",
          sourceName: item.sourceName ?? "unknown",
          sourceRules: JSON.stringify(item.rulesJson ?? {}),
          topic: item.sourceTopic ?? undefined,
        });

    try {
      const result = await callLLMWithJsonParsing<AnalysisResult>(prompt);

      await storage.createAnalysis({
        itemId: item.id,
        category: result.category || "other",
        relevanceScore: result.relevance_score || 0,
        replyWorthinessScore: result.reply_worthiness_score || 0,
        linkFitScore: result.link_fit_score || 0,
        riskFlagsJson: result.risk_flags || [],
        recommendedAction: result.recommended_action || "observe",
        suggestedAngle: result.suggested_angle || "",
        summaryShort: result.summary_short || "",
        summaryLong: result.summary_long || "",
      });

      await storage.updateItemStatus(item.id, "analyzed");
      analyzed++;
      console.log(`✓ Analyzed item #${item.id}: ${result.recommended_action}`);
    } catch (error) {
      console.error(`✗ Failed to analyze item #${item.id}:`, error);
    }
  }

  return analyzed;
}

export async function analyzeNewItems(): Promise<number> {
  console.log("[AnalyzeJob] Starting analysis for new items...");
  const items = await storage.getItemsByStatus("new", 10);
  console.log(`[AnalyzeJob] Found ${items.length} items in 'new' status`);
  let analyzed = 0;

  for (const item of items) {
    console.log(`[AnalyzeJob] Analyzing item #${item.id} (topic: ${item.sourceTopic}): ${item.title?.slice(0, 50)}...`);

    // Use AI Art community prompt for ai_art topic (0% promo, pure helpful replies)
    const prompt = item.sourceTopic === "ai_art"
      ? buildAiArtCommunityAnalyzePrompt({
          title: item.title ?? "",
          body: item.contentText ?? "",
          sourceName: item.sourceName ?? "unknown",
        })
      : buildAnalyzePrompt({
          title: item.title ?? "",
          body: item.contentText ?? "",
          sourceName: item.sourceName ?? "unknown",
          sourceRules: JSON.stringify(item.rulesJson ?? {}),
          topic: item.sourceTopic ?? undefined,
        });

    try {
      const result = await callLLMWithJsonParsing<AnalysisResult>(prompt);

      await storage.createAnalysis({
        itemId: item.id,
        category: result.category || "other",
        relevanceScore: result.relevance_score || 0,
        replyWorthinessScore: result.reply_worthiness_score || 0,
        linkFitScore: result.link_fit_score || 0,
        riskFlagsJson: result.risk_flags || [],
        recommendedAction: result.recommended_action || "observe",
        suggestedAngle: result.suggested_angle || "",
        summaryShort: result.summary_short || "",
        summaryLong: result.summary_long || "",
      });

      await storage.updateItemStatus(item.id, "analyzed");
      analyzed++;
      console.log(`✓ Analyzed item #${item.id}: ${result.recommended_action}`);
    } catch (error) {
      console.error(`✗ Failed to analyze item #${item.id}:`, error);
    }
  }

  return analyzed;
}
