import { storage } from "../storage";
import { callLLMWithJsonParsing } from "../llm/client";
import { buildAnalyzePrompt, type AnalysisResult } from "../llm/prompts";

export async function analyzeNewItems(): Promise<number> {
  const items = await storage.getItemsByStatus("new", 10);
  let analyzed = 0;

  for (const item of items) {
    console.log(`Analyzing item #${item.id}: ${item.title?.slice(0, 50)}...`);

    const prompt = buildAnalyzePrompt({
      title: item.title ?? "",
      body: item.contentText ?? "",
      sourceName: item.sourceName ?? "unknown",
      sourceRules: JSON.stringify(item.rulesJson ?? {}),
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
