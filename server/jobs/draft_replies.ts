import { storage } from "../storage";
import { callLLMWithJsonParsing } from "../llm/client";
import { buildDraftPrompt, type DraftResult } from "../llm/prompts";

const APP_BASE_URL = process.env.APP_BASE_URL || "https://aiartmarket.io";

function shouldAllowLink(riskFlags: string[]): boolean {
  if (riskFlags.includes("promo_ban")) return false;
  if (riskFlags.includes("link_ban")) return false;
  if (riskFlags.includes("heated_topic")) return false;
  return true;
}

function shouldGenerateDraft(analysis: {
  recommendedAction: string;
  relevanceScore: number;
  replyWorthinessScore: number;
}): { shouldDraft: boolean; reason: string } {
  // If LLM explicitly recommends draft, always generate
  if (analysis.recommendedAction === "draft") {
    return { shouldDraft: true, reason: "LLM recommended draft" };
  }

  // Relaxed v1 conditions: high relevance + moderate reply worthiness
  if (analysis.relevanceScore >= 75 && analysis.replyWorthinessScore >= 35) {
    return { shouldDraft: true, reason: `High relevance (${analysis.relevanceScore}) + reply worthiness (${analysis.replyWorthinessScore})` };
  }

  // Very high relevance alone can trigger draft (info-only, no promo links)
  if (analysis.relevanceScore >= 85) {
    return { shouldDraft: true, reason: `Very high relevance (${analysis.relevanceScore})` };
  }

  return { shouldDraft: false, reason: `Low scores: relevance=${analysis.relevanceScore}, reply=${analysis.replyWorthinessScore}` };
}

export async function draftForAnalyzed(): Promise<number> {
  console.log("[DraftJob] Starting draft generation for analyzed items...");
  const items = await storage.getItemsByStatus("analyzed", 10);
  console.log(`[DraftJob] Found ${items.length} items in 'analyzed' status`);
  let drafted = 0;

  for (const item of items) {
    const analysis = await storage.getAnalysisByItemId(item.id);

    if (!analysis) {
      console.log(`[DraftJob] No analysis found for item #${item.id}, skipping`);
      continue;
    }

    const { shouldDraft, reason } = shouldGenerateDraft({
      recommendedAction: analysis.recommendedAction,
      relevanceScore: analysis.relevanceScore,
      replyWorthinessScore: analysis.replyWorthinessScore,
    });

    if (!shouldDraft) {
      console.log(`[DraftJob] Item #${item.id} skipped: ${reason}`);
      await storage.updateItemStatus(item.id, "skipped");
      continue;
    }

    console.log(`[DraftJob] Item #${item.id} will get drafts: ${reason}`);

    console.log(`Generating drafts for item #${item.id}: ${item.title?.slice(0, 50)}...`);

    const riskFlags = (analysis.riskFlagsJson as string[]) || [];
    const allowLink = shouldAllowLink(riskFlags);

    const prompt = buildDraftPrompt({
      title: item.title ?? "",
      body: item.contentText ?? "",
      analysisJson: JSON.stringify({
        category: analysis.category,
        risk_flags: riskFlags,
        suggested_angle: analysis.suggestedAngle,
      }),
      allowLink,
      baseUrl: APP_BASE_URL,
    });

    try {
      const result = await callLLMWithJsonParsing<DraftResult>(prompt);

      for (const draft of result.drafts || []) {
        await storage.createDraft({
          itemId: item.id,
          variant: draft.variant,
          draftText: draft.text,
          includesLink: draft.includes_link || false,
          linkType: draft.includes_link ? "homepage" : "none",
          tone: draft.tone || "helpful",
          adminDecision: "pending",
        });
      }

      await storage.updateItemStatus(item.id, "drafted");
      drafted++;
      console.log(`✓ Generated ${result.drafts?.length || 0} drafts for item #${item.id}`);
    } catch (error) {
      console.error(`✗ Failed to generate drafts for item #${item.id}:`, error);
    }
  }

  return drafted;
}
