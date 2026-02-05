import { storage } from "../storage";
import { callLLMWithJsonParsing } from "../llm/client";
import { 
  buildDraftPrompt, 
  buildAiArtCommunityDraftPrompt,
  type DraftResult, 
  type SourceRules 
} from "../llm/prompts";

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
  riskFlags?: string[];
}): { shouldDraft: boolean; reason: string } {
  // If any risk flags present, skip drafting (especially for community mode)
  const riskFlags = analysis.riskFlags || [];
  if (riskFlags.length > 0) {
    return { shouldDraft: false, reason: `Risk flags detected: ${riskFlags.join(", ")}` };
  }

  // If LLM explicitly recommends draft, always generate
  if (analysis.recommendedAction === "draft") {
    return { shouldDraft: true, reason: "LLM recommended draft" };
  }

  // If LLM says skip or observe, respect that
  if (analysis.recommendedAction === "skip" || analysis.recommendedAction === "observe") {
    return { shouldDraft: false, reason: `LLM recommended ${analysis.recommendedAction}` };
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

// Validate ai_art community drafts - reject any with links or brand mentions
function validateCommunityDraft(text: string): { valid: boolean; reason?: string } {
  // Check for URLs
  const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+|\.[a-z]{2,}\/[^\s]*/i;
  if (urlPattern.test(text)) {
    return { valid: false, reason: "Contains URL/link" };
  }

  // Strictly forbidden brand mentions (our service and competitors)
  const forbiddenBrands = [
    /aiartmarket/i,
    /civitai/i,
    /promptbase/i,
    /artstation/i,
    /deviantart/i,
  ];

  for (const pattern of forbiddenBrands) {
    if (pattern.test(text)) {
      return { valid: false, reason: "Contains forbidden brand mention" };
    }
  }

  // Block promotional language patterns
  const promoPatterns = [
    /check\s*out/i,
    /try\s*(using|out)?\s+(this|my|our)/i,
    /i\s*recommend/i,
    /you\s*should\s*(try|use|check)/i,
    /sign\s*up/i,
    /free\s*trial/i,
    /discount/i,
    /coupon/i,
    /great\s*(service|platform|tool)/i,
    /best\s*(place|site|platform)/i,
  ];

  for (const pattern of promoPatterns) {
    if (pattern.test(text)) {
      return { valid: false, reason: "Contains promotional language" };
    }
  }

  return { valid: true };
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

    const riskFlags = (analysis.riskFlagsJson as string[]) || [];
    
    const { shouldDraft, reason } = shouldGenerateDraft({
      recommendedAction: analysis.recommendedAction,
      relevanceScore: analysis.relevanceScore,
      replyWorthinessScore: analysis.replyWorthinessScore,
      riskFlags,
    });

    if (!shouldDraft) {
      console.log(`[DraftJob] Item #${item.id} skipped: ${reason}`);
      await storage.updateItemStatus(item.id, "skipped");
      continue;
    }

    console.log(`[DraftJob] Item #${item.id} will get drafts: ${reason}`);

    console.log(`Generating drafts for item #${item.id} (topic: ${item.sourceTopic}): ${item.title?.slice(0, 50)}...`);

    const sourceRules = (item.rulesJson as SourceRules) || {};
    const allowLink = shouldAllowLink(riskFlags) && (sourceRules.allowLinks !== false);

    // Use AI Art community draft prompt for ai_art topic (0% promo, pure helpful replies)
    const prompt = item.sourceTopic === "ai_art"
      ? buildAiArtCommunityDraftPrompt({
          title: item.title ?? "",
          body: item.contentText ?? "",
          suggestedAngle: analysis.suggestedAngle || "",
        })
      : buildDraftPrompt({
          title: item.title ?? "",
          body: item.contentText ?? "",
          analysisJson: JSON.stringify({
            category: analysis.category,
            risk_flags: riskFlags,
            suggested_angle: analysis.suggestedAngle,
          }),
          allowLink,
          baseUrl: APP_BASE_URL,
          sourceRules,
        });

    try {
      const result = await callLLMWithJsonParsing<DraftResult>(prompt);
      let savedCount = 0;

      for (const draft of result.drafts || []) {
        // For ai_art community mode: validate draft has no links or promo content
        if (item.sourceTopic === "ai_art") {
          const validation = validateCommunityDraft(draft.text);
          if (!validation.valid) {
            console.log(`[DraftJob] Rejected ai_art draft variant ${draft.variant}: ${validation.reason}`);
            continue;
          }
          // Force includesLink to false for ai_art community mode
          draft.includes_link = false;
        }

        await storage.createDraft({
          itemId: item.id,
          variant: draft.variant,
          draftText: draft.text,
          includesLink: draft.includes_link || false,
          linkType: draft.includes_link ? "homepage" : "none",
          tone: draft.tone || "helpful",
          adminDecision: "pending",
        });
        savedCount++;
      }

      await storage.updateItemStatus(item.id, "drafted");
      drafted++;
      console.log(`✓ Generated ${savedCount} drafts for item #${item.id} (${result.drafts?.length || 0} total, filtered for community mode)`);
    } catch (error) {
      console.error(`✗ Failed to generate drafts for item #${item.id}:`, error);
    }
  }

  return drafted;
}
