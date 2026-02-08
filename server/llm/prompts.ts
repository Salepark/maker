export function buildAnalyzePrompt(input: {
  title: string;
  body: string;
  sourceName: string;
  sourceRules: string;
}) {
  return `
You are an "AI Art community contributor + researcher."
Your goal is to provide helpful information to questions, not spam promotions.
Community rules are the top priority.

[Input]
- Source: ${input.sourceName}
- Rules(JSON): ${input.sourceRules}
- Title: ${input.title}
- Body:
${input.body}

[Output Format] Output only the JSON below (no explanations).
{
  "category": "question|rant|tool_request|business|legal|ethics|showcase|other",
  "summary_short": "One-line summary",
  "summary_long": "3~6 line summary",
  "relevance_score": 0-100,
  "reply_worthiness_score": 0-100,
  "link_fit_score": 0-100,
  "risk_flags": ["promo_ban","link_ban","heated_topic","new_account_risk","unknown_rules"],
  "recommended_action": "observe|draft|skip",
  "suggested_angle": "What perspective would be helpful for the reply"
}

[Score Guide]
- relevance_score: Rate high if related to AI art + sales/market/prompts/licensing/settlement/tool comparison
- reply_worthiness_score: Rate high if the question is specific and answers appear lacking
- link_fit_score: Rate high for "where to sell/marketplace recommendations," rate low for ethics debates
- risk_flags: Must flag if rules restrict links/promotions (empty array if not applicable)
- recommended_action:
  - If relevance>=60 AND reply_worthiness>=60, then draft
  - If risk is too high, then observe or skip
`.trim();
}

export interface SourceRules {
  allowLinks?: boolean;
  promoLevel?: "none" | "subtle" | "moderate";
  preferredTone?: "informative" | "curious" | "supportive";
  platform?: string;
}

const TONE_PRESETS = {
  informative: {
    A: { tone: "informative", desc: "Information sharing - fact-based, helpful information without links" },
    B: { tone: "analytical", desc: "Analytical - objective comparison/analysis from a technical perspective" },
    C: { tone: "educational", desc: "Educational - friendly and explanatory tone" },
  },
  curious: {
    A: { tone: "curious", desc: "Light questioning - expressing interest, requesting additional info" },
    B: { tone: "engaging", desc: "Conversational - naturally encouraging discussion" },
    C: { tone: "supportive", desc: "Supportive - positive feedback and encouragement" },
  },
  supportive: {
    A: { tone: "helpful", desc: "Helpful - providing specific advice and tips" },
    B: { tone: "encouraging", desc: "Encouraging - praising work and cheering progress" },
    C: { tone: "comparative", desc: "Comparative - subtly comparing alternatives/tools (minimal promotion)" },
  },
};

export function buildDraftPrompt(input: {
  title: string;
  body: string;
  analysisJson: string;
  allowLink: boolean;
  baseUrl: string;
  sourceRules?: SourceRules;
}) {
  const rules = input.sourceRules || {};
  const preferredTone = rules.preferredTone || "informative";
  const promoLevel = rules.promoLevel || "none";
  const platform = rules.platform || "community";
  const tonePreset = TONE_PRESETS[preferredTone] || TONE_PRESETS.informative;

  const promoGuidance = {
    none: "Do not mention makelr. Provide pure information only.",
    subtle: "Mention only about 1 in 10 times, very naturally at the level of 'by the way.'",
    moderate: "May mention makelr.com if contextually appropriate, but without sounding like an ad.",
  }[promoLevel];

  return `
You are a contributor who maintains trust in the AI Art community.
Platform: ${platform}
Write short, natural responses that fit the context.
Vary sentence structure so it doesn't look copy-pasted.
No aggressive/exaggerated advertising.

[Reference: 3 lines about makelr]
- makelr.com aims to facilitate trading of digital assets such as AI-generated art/prompts/templates.
- The core focus is simplifying the sell/buy/license/settlement workflow.
- Never mention features that don't exist.

[Input]
Title: ${input.title}
Body:
${input.body}

Analysis(JSON):
${input.analysisJson}

Link allowed: ${input.allowLink ? "YES" : "NO"}
Base URL: ${input.baseUrl}
Promo guide: ${promoGuidance}

[Tone Presets - ${preferredTone}]
- Variant A: ${tonePreset.A.tone} - ${tonePreset.A.desc}
- Variant B: ${tonePreset.B.tone} - ${tonePreset.B.desc}
- Variant C: ${tonePreset.C.tone} - ${tonePreset.C.desc}

[Output]
Output only the JSON below.
{
  "drafts": [
    {"variant":"A","tone":"${tonePreset.A.tone}","includes_link":true/false,"text":"..."},
    {"variant":"B","tone":"${tonePreset.B.tone}","includes_link":true/false,"text":"..."},
    {"variant":"C","tone":"${tonePreset.C.tone}","includes_link":true/false,"text":"..."}
  ],
  "notes": "1~2 lines of caution"
}

[Link Rules]
- If link allowed is NO, never include any links/domains/call-to-action phrases.
- Even if YES, adjust according to the promo guide.
`.trim();
}

export function buildRewritePrompt(input: { text: string; style: string }) {
  return `
Rewrite the following text in a "${input.style}" style, keeping it short and natural.
No exaggeration/advertising/imperative expressions. Make the sentence flow smooth.
Output only the result.

[Original]
${input.text}
`.trim();
}

// ============================================
// AI Art Community Contribution Mode (0% promotion - pure help only)
// ============================================

export function buildAiArtCommunityAnalyzePrompt(input: {
  title: string;
  body: string;
  sourceName: string;
}) {
  return `
You are a neutral moderator of the AI art community.
Evaluate whether the post below is "worth participating in with a helpful reply."

Criteria:
- Questions, workflow discussions, tool comparisons, tip requests, experience sharing posts -> High reply value
- Controversies (copyright, ethics, politics, hate, flame bait) -> High risk
- Obvious ads/spam -> Low reply value

Important rules:
- Do not evaluate promotion potential or link insertion potential.
- Judge only from a "community contribution perspective."

Output only JSON:
{
  "category": "tool|workflow|prompt|question|discussion|news|other",
  "relevance_score": 0-100,
  "reply_worthiness_score": 0-100,
  "link_fit_score": 0,
  "risk_flags": ["copyright","toxic","politics","spam","drama"] whichever apply,
  "recommended_action": "draft|observe|skip",
  "suggested_angle": "One line describing what perspective would make a helpful reply",
  "summary_short": "One-line summary",
  "summary_long": "3~4 line summary"
}

Note: link_fit_score is always 0 in community contribution mode. Links are not included.
If recommended_action is "draft," the post is worth replying to; "observe" means watch; "skip" means ignore.

[Title]
${input.title}

[Body]
${input.body}

[Source]
${input.sourceName}
`.trim();
}

export function buildAiArtCommunityDraftPrompt(input: {
  title: string;
  body: string;
  suggestedAngle: string;
}) {
  return `
You are a regular user active in the AI art community.
Write a "helpful reply" to the post below.

Absolute rules:
- Do not include any links.
- Do not mention any service, website, product, or brand.
- Do not use a promotional, marketing, or recommendation tone.
- Just share experience/knowledge/tips like a fellow community member.

Writing guide:
- 1 sentence of empathy or problem summary
- 2~4 sentences of specific tips/methods/perspectives
- 1~2 sentences of caveats or alternatives if possible
- Length: 4~8 sentences
- Tone: friendly, calm, practical
- Write in English (for HN/Reddit/Moltbook)

[Post Title]
${input.title}

[Post Content]
${input.body}

[Reply Direction Hint]
${input.suggestedAngle}

[Output Format]
Output only JSON:
{
  "drafts": [
    {"variant":"A","tone":"helpful","includes_link":false,"text":"Experience-based helpful reply"},
    {"variant":"B","tone":"analytical","includes_link":false,"text":"Technical analysis/comparison reply"},
    {"variant":"C","tone":"supportive","includes_link":false,"text":"Empathetic + encouraging reply"}
  ],
  "notes": "1~2 lines of caution when replying to this post"
}

Follow these rules strictly when drafting the reply.
`.trim();
}

// ============================================
// Analysis Result Types
// ============================================

export interface AnalysisResult {
  category: string;
  summary_short: string;
  summary_long: string;
  relevance_score: number;
  reply_worthiness_score: number;
  link_fit_score: number;
  risk_flags: string[];
  recommended_action: string;
  suggested_angle: string;
}

export interface DraftResult {
  drafts: Array<{
    variant: string;
    tone: string;
    includes_link: boolean;
    text: string;
  }>;
  notes: string;
}

// Daily Brief Prompts

export function buildAIArtBriefPrompt(items: any[], date: string): string {
  const itemsData = items.map((item) => ({
    title: item.title,
    source: item.source,
    url: item.url,
    key_takeaway: item.key_takeaway,
    why_it_matters: item.why_it_matters,
    category: item.category,
    risk_flags: item.risk_flags,
    confidence: item.confidence,
  }));

  return `You are a researcher analyzing the AI Art marketplace and creator community.
Your goal is to write a Daily Brief summarizing **trends, tools, and community developments** in the AI art ecosystem.
Focus on technical advancements, new tools, community reactions, and market opportunities.
Include sources (URLs) and avoid exaggeration/speculation/definitive statements.

Input Data:
The following is a list of AI Art-related posts collected and analyzed over the past 24 hours:

${JSON.stringify(itemsData, null, 2)}

Today's date: ${date}

Output Format:

AI Art Daily Brief - ${date}

This report is intended for informational purposes about AI art ecosystem trends.

TL;DR (One-line summary of today)
- Summarize today's key AI Art scene developments in one sentence.

Key Trends (3~5)
Follow this format for each trend:

1) Trend Title
- What happened: Fact-based summary (2~3 sentences)
- Why it matters: Explain the impact on creators/market
- Related area: Image generation/Video/Music/Tools/Platforms/Community (whichever applies)
- Opportunity/Risk: Opportunities creators can leverage or points of caution
- Source: Source - URL

Tools/Technology Updates
- Summarize new AI art tools, model updates, and platform changes
- 2~3 lines per item

Community Highlights
- Summarize trending works, debates, and discussions from Reddit, HN, etc.
- 2~3 lines per item

Weekly Checkpoints
- Notable events, contests, upcoming tool launches, etc. (~5 items)

Sources
- List of post links used in this report

Writing Rules:
- Focus on AI art creation, editing, and workflow-related content
- Provide practical insights from a creator's perspective
- Balance coverage of technical advancements and community reactions
- Exclude investment/finance-related content
- Write factually without exaggeration`;
}

export function buildInvestingBriefPrompt(items: any[], date: string): string {
  const itemsData = items.map((item) => ({
    title: item.title,
    source: item.source,
    url: item.url,
    key_takeaway: item.key_takeaway,
    why_it_matters: item.why_it_matters,
    impact_scope: item.impact_scope,
    risk_flags: item.risk_flags,
    confidence: item.confidence,
  }));

  return `You are a senior macro & markets research analyst.
Write a daily market brief for investors based only on the provided analyzed items.
Prioritize credibility, macro context, policy impact, and cross-market linkages.
Avoid hype, price predictions, and trading advice.
Use neutral, analytical tone.

Important - Data Filtering:
The following content must be excluded from the input data:
- AI art, image generation, creative tool-related content
- Reddit community discussions, Show HN project introductions
- Technology news not directly related to investing/finance/macroeconomics

Only cover content directly related to stocks, interest rates, currencies, crypto, commodities, and macroeconomics.

Input Data:
The following is a list of investment-related articles collected and analyzed over the past 24~48 hours:

${JSON.stringify(itemsData, null, 2)}

Today's date: ${date}

Output Format (must be in English):

Daily Market Brief - ${date}

This report is for informational purposes only and does not constitute investment advice.

TL;DR (One-line summary of today)
- Summarize today's market sentiment in 1~2 lines

Market Drivers (3~5 Key Issues)
For each issue:

1) Issue Title
- What happened: Fact-based summary (2~3 sentences)
- Why it matters: Explain the structural impact on markets (2~3 sentences)
- Impact scope: Specify relevant asset classes such as stocks/bonds/crypto/currencies/commodities
- Risk/Uncertainty: 1~2 lines on possible risks or counter-scenarios
- Source: Source Name - URL

Cross-Market View (Cross-asset linkages)
- Explain connections between stocks, rates, dollar, crypto, and commodities
- Analyze how today's issues could have ripple effects across other asset classes

Risk Radar (Key Risks)
- Summarize 2~3 short-term risks
- Each item 2~3 lines, focused on "why it's a risk"

Checklist (Today/This Week Checkpoints)
- Policy schedules, data releases, geopolitical events, etc.
- E.g.: CPI release, FOMC speeches, major earnings, options expiry, regulatory issues, etc.

Sources
- List of key sources used

Writing Rules:
- No investment directives/definitive statements like "buy," "sell," "will rise," "will fall"
- Use conditional/scenario language like "may," "there is a possibility"
- Focus on explaining "why the market is reacting to this news"
- Prioritize policy/rates/capital flows/risk
- Clearly distinguish facts / interpretation / risk
- Reduce weight for items with risk_flags like rumor, low_credibility, opinion_only
- Do not promote items with low confidence to key issues
- No exaggerated, emotional, or clickbait tone
- Prioritize structural factors such as numbers/policy/earnings/rates/regulations
- Exclude or minimize YouTube/community speculation

Selection Criteria (Internal judgment):
- Priority: Market structural changes (rates, policy, regulation, liquidity) > Corporate earnings/sector impact > Macro/geopolitical/energy risk > Crypto institutional/ETF/regulation/fundamentals
- Prefer articles that explain causes and effects over those focused on short-term price predictions`;
}

// Import ProfileConfig from schema - define locally for compatibility
// Note: Using local definition to avoid module resolution issues with tsx
export interface ReportConfig {
  scheduleRule?: "DAILY" | "WEEKDAYS" | "WEEKENDS";
  sections?: {
    tldr?: boolean;
    drivers?: boolean;
    risk?: boolean;
    checklist?: boolean;
    sources?: boolean;
  };
  verbosity?: "short" | "normal" | "detailed";
  markdownLevel?: "minimal" | "normal";
  filters?: {
    minImportanceScore?: number;
    maxRiskLevelAllowed?: number;
    allowPromotionLinks?: boolean;
  };
}

function getVerbosityInstructions(verbosity: string): string {
  switch (verbosity) {
    case "short":
      return "Write concisely. Keep each section to 2~3 lines. Deliver only the essentials.";
    case "detailed":
      return "Write in detail. Include rich background explanations, analysis, and context.";
    default:
      return "Write at an appropriate length. Cover important content in detail and supplementary content briefly.";
  }
}

function getMarkdownInstructions(level: string): string {
  switch (level) {
    case "minimal":
      return `Write in a conversational tone like a news anchor. Specific rules:
- Do not use heavy markdown syntax like ## **
- Use only a simple title (# or a short text label) for section separation
- No bold (**), italic (*), or tables
- Use only simple dashes (-) for lists
- Write in flowing sentences. It should read like a "briefing," not a "document"
- No emojis or special symbols. Use only plain text and dashes (-)`;
    default:
      return "Use standard markdown: freely use headings, bold, lists, etc.";
  }
}

function getSectionInstructions(sections: ReportConfig["sections"], topic: string): string {
  const defaultSections = { tldr: true, drivers: true, risk: true, checklist: true, sources: true };
  const s = { ...defaultSections, ...sections };
  
  const sectionMaps: Record<string, Record<string, string>> = {
    investing: {
      tldr: "TL;DR (One-line summary of today)",
      drivers: "Market Drivers (3~5 Key Issues) + Cross-Market View",
      risk: "Risk Radar (Key Risks)",
      checklist: "Checklist (Today/This Week Checkpoints)",
      sources: "Sources (Source List)",
    },
    ai_art: {
      tldr: "TL;DR (One-line summary of today)",
      drivers: "Key Trends (3~5) + Tools/Technology Updates + Community Highlights",
      risk: "Cautions/Risks",
      checklist: "Weekly Checkpoints",
      sources: "Sources (Source List)",
    },
  };
  const defaultSectionMap = {
    tldr: "TL;DR (One-line summary of today)",
    drivers: "Key Developments (3~5 Key Topics)",
    risk: "Risks & Cautions",
    checklist: "Action Items / Checkpoints",
    sources: "Sources (Source List)",
  };
  const sectionMap = sectionMaps[topic] || defaultSectionMap;

  const includedSections = Object.entries(sectionMap)
    .filter(([key]) => s[key as keyof typeof s])
    .map(([, label]) => `- ${label}`)
    .join("\n");

  const excludedSections = Object.entries(sectionMap)
    .filter(([key]) => !s[key as keyof typeof s])
    .map(([, label]) => label);

  let instructions = `Sections to include:\n${includedSections}`;
  if (excludedSections.length > 0) {
    instructions += `\n\nSections to exclude (do not write):\n${excludedSections.map(s => `- ${s}`).join("\n")}`;
  }
  
  return instructions;
}

const TOPIC_META: Record<string, { label: string; role: string; focus: string; disclaimer: string; excludeFilter?: string }> = {
  investing: {
    label: "Daily Market Brief",
    role: "a senior macro & markets research analyst",
    focus: "market trends, policy impact, macro context, and cross-market linkages. Prioritize credibility and analytical rigor.",
    disclaimer: "This report is for informational purposes only and does not constitute investment advice.",
    excludeFilter: "Exclude AI art, image generation, creative tools, Reddit community discussions, and Show HN projects. Only cover stocks, interest rates, currencies, crypto, commodities, and macroeconomics.",
  },
  ai_art: {
    label: "AI Art Daily Brief",
    role: "a researcher analyzing the AI Art marketplace and creator community",
    focus: "trends, tools, and community developments in the AI art ecosystem. Focus on technical advancements, new tools, community reactions, and market opportunities.",
    disclaimer: "This report is intended for informational purposes about AI art ecosystem trends.",
    excludeFilter: "Exclude investment/finance-related content. Focus on AI art creation, editing, and workflow-related content.",
  },
  content_research: {
    label: "Content Research Brief",
    role: "a content strategist and research analyst",
    focus: "content trends, creative ideas, research insights, and emerging topics. Focus on actionable insights for content creators and researchers.",
    disclaimer: "This report summarizes content research trends and insights.",
  },
  market_brief: {
    label: "Market Brief",
    role: "a market research analyst",
    focus: "market movements, economic indicators, sector performance, and notable business developments.",
    disclaimer: "This report is for informational purposes only.",
  },
  research_watch: {
    label: "Research Watch Brief",
    role: "an academic research analyst",
    focus: "notable research papers, technical breakthroughs, methodology advances, and emerging research directions.",
    disclaimer: "This report summarizes recent research developments.",
  },
  competitor_watch: {
    label: "Competitor Watch Brief",
    role: "a competitive intelligence analyst",
    focus: "competitor moves, product launches, strategic shifts, market positioning changes, and industry signals.",
    disclaimer: "This report summarizes competitive intelligence insights.",
  },
};

export function getTopicLabel(topic: string): string {
  return getTopicMeta(topic).label;
}

function getTopicMeta(topic: string) {
  return TOPIC_META[topic] || {
    label: `${topic.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} Brief`,
    role: "a research analyst",
    focus: `trends, developments, and key insights related to ${topic.replace(/_/g, " ")}. Provide actionable, well-sourced analysis.`,
    disclaimer: "This report is for informational purposes only.",
  };
}

export function buildDailyBriefPrompt(items: any[], date: string, topic: string, config?: ReportConfig): string {
  if (topic === "investing") {
    return buildInvestingBriefPromptWithConfig(items, date, config);
  }
  return buildGenericBriefPrompt(items, date, topic, config);
}

function buildInvestingBriefPromptWithConfig(items: any[], date: string, config?: ReportConfig): string {
  const verbosity = config?.verbosity || "normal";
  const markdownLevel = config?.markdownLevel || "minimal";
  const sections = config?.sections;

  const itemsData = items.map((item) => ({
    title: item.title,
    source: item.source,
    url: item.url,
    key_takeaway: item.key_takeaway,
    why_it_matters: item.why_it_matters,
    impact_scope: item.impact_scope,
    risk_flags: item.risk_flags,
    confidence: item.confidence,
  }));

  return `You are a senior macro & markets research analyst.
Write a daily market brief for investors based only on the provided analyzed items.
Prioritize credibility, macro context, policy impact, and cross-market linkages.
Avoid hype, price predictions, and trading advice.
Use neutral, analytical tone.

User Settings:
${getVerbosityInstructions(verbosity)}
${getMarkdownInstructions(markdownLevel)}

${getSectionInstructions(sections, "investing")}

Important - Data Filtering:
The following content must be excluded from the input data:
- AI art, image generation, creative tool-related content
- Reddit community discussions, Show HN project introductions
- Technology news not directly related to investing/finance/macroeconomics

Only cover content directly related to stocks, interest rates, currencies, crypto, commodities, and macroeconomics.

Input Data:
The following is a list of investment-related articles collected and analyzed over the past 24~48 hours:

${JSON.stringify(itemsData, null, 2)}

Today's date: ${date}

Output Format (must be in English):

Daily Market Brief - ${date}

This report is for informational purposes only and does not constitute investment advice.

(Output only the configured sections)

Writing Rules:
- No investment directives/definitive statements like "buy," "sell," "will rise," "will fall"
- Use conditional/scenario language like "may," "there is a possibility"
- Focus on explaining "why the market is reacting to this news"
- Prioritize policy/rates/capital flows/risk
- Clearly distinguish facts / interpretation / risk
- Reduce weight for items with risk_flags like rumor, low_credibility, opinion_only
- Do not promote items with low confidence to key issues
- No exaggerated, emotional, or clickbait tone`;
}

function buildGenericBriefPrompt(items: any[], date: string, topic: string, config?: ReportConfig): string {
  const verbosity = config?.verbosity || "normal";
  const markdownLevel = config?.markdownLevel || "minimal";
  const sections = config?.sections;
  const meta = getTopicMeta(topic);

  const itemsData = items.map((item) => ({
    title: item.title,
    source: item.source,
    url: item.url,
    key_takeaway: item.key_takeaway,
    why_it_matters: item.why_it_matters,
    category: item.category,
    risk_flags: item.risk_flags,
    confidence: item.confidence,
  }));

  const filterBlock = meta.excludeFilter ? `\nImportant - Data Filtering:\n${meta.excludeFilter}\n` : "";

  return `You are ${meta.role}.
Your goal is to write a Daily Brief summarizing ${meta.focus}
Include sources (URLs) and avoid exaggeration/speculation/definitive statements.

User Settings:
${getVerbosityInstructions(verbosity)}
${getMarkdownInstructions(markdownLevel)}

${getSectionInstructions(sections, topic)}
${filterBlock}
Input Data:
The following is a list of posts collected and analyzed over the past 24 hours:

${JSON.stringify(itemsData, null, 2)}

Today's date: ${date}

Output Format:

${meta.label} - ${date}

${meta.disclaimer}

(Output only the configured sections)

Writing Rules:
- Provide practical, actionable insights
- Balance coverage of developments and their implications
- Write factually without exaggeration
- Reduce weight for items with risk_flags like rumor, low_credibility, opinion_only
- Do not promote items with low confidence to key issues`;
}
