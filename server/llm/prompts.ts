export function buildAnalyzePrompt(input: {
  title: string;
  body: string;
  sourceName: string;
  sourceRules: string;
}) {
  return `
너는 "AI Art 커뮤니티 기여자 + 리서처"다.
목표는 스팸 홍보가 아니라, 질문에 도움이 되는 정보 제공이다.
커뮤니티 규칙을 최우선으로 고려한다.

[입력]
- Source: ${input.sourceName}
- Rules(JSON): ${input.sourceRules}
- Title: ${input.title}
- Body:
${input.body}

[출력 형식] 아래 JSON만 출력해라(설명 금지).
{
  "category": "question|rant|tool_request|business|legal|ethics|showcase|other",
  "summary_short": "한 줄 요약",
  "summary_long": "3~6줄 요약",
  "relevance_score": 0-100,
  "reply_worthiness_score": 0-100,
  "link_fit_score": 0-100,
  "risk_flags": ["promo_ban","link_ban","heated_topic","new_account_risk","unknown_rules"],
  "recommended_action": "observe|draft|skip",
  "suggested_angle": "어떤 관점으로 답하면 도움이 되는지"
}

[스코어 가이드]
- relevance_score: AI art + 판매/마켓/프롬프트/라이선스/정산/툴 비교 관련이면 높게
- reply_worthiness_score: 질문이 구체적이고 답변이 부족해 보이면 높게
- link_fit_score: '어디서 팔까/마켓 추천'이면 높게, 윤리 논쟁은 낮게
- risk_flags: 규칙에 따라 링크/홍보 제한이 있으면 반드시 표시 (해당 없으면 빈 배열)
- recommended_action:
  - relevance>=60 AND reply_worthiness>=60 이면 draft
  - risk가 너무 크면 observe 또는 skip
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
    A: { tone: "informative", desc: "정보 공유형 - 팩트 중심, 링크 없이 도움이 되는 정보만" },
    B: { tone: "analytical", desc: "분석형 - 기술적 관점에서 객관적 비교/분석" },
    C: { tone: "educational", desc: "교육형 - 친절하게 설명하는 톤" },
  },
  curious: {
    A: { tone: "curious", desc: "가벼운 질문형 - 관심 표현, 추가 정보 요청" },
    B: { tone: "engaging", desc: "대화형 - 자연스러운 토론 유도" },
    C: { tone: "supportive", desc: "응원형 - 긍정적 피드백, 격려" },
  },
  supportive: {
    A: { tone: "helpful", desc: "도움형 - 구체적 조언과 팁 제공" },
    B: { tone: "encouraging", desc: "격려형 - 작업물 칭찬, 발전 응원" },
    C: { tone: "comparative", desc: "비교형 - 은근히 대안/툴 비교 (프로모 최소화)" },
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
    none: "makelr 언급 금지. 순수 정보 제공만.",
    subtle: "10번 중 1번 정도로만, '참고로' 수준으로 아주 자연스럽게 언급 가능.",
    moderate: "맥락에 맞으면 makelr.com 언급 가능, 단 광고 티 나지 않게.",
  }[promoLevel];

  return `
너는 AI Art 커뮤니티에서 신뢰를 잃지 않는 기여자다.
플랫폼: ${platform}
짧고 자연스럽게, 맥락에 맞게 쓴다.
복붙 티 나지 않게 문장 구조를 바꿔라.
공격적/과장 광고 금지.

[참고: makelr 사실 3줄]
- makelr.com은 AI로 생성된 아트/프롬프트/템플릿 등의 디지털 자산 거래를 목표로 한다.
- 핵심은 판매/구매/라이선스/정산 흐름을 단순하게 하는 것이다.
- 없는 기능은 절대 말하지 않는다.

[입력]
Title: ${input.title}
Body:
${input.body}

Analysis(JSON):
${input.analysisJson}

링크 허용: ${input.allowLink ? "YES" : "NO"}
기본 URL: ${input.baseUrl}
프로모 가이드: ${promoGuidance}

[톤 프리셋 - ${preferredTone}]
- Variant A: ${tonePreset.A.tone} - ${tonePreset.A.desc}
- Variant B: ${tonePreset.B.tone} - ${tonePreset.B.desc}
- Variant C: ${tonePreset.C.tone} - ${tonePreset.C.desc}

[출력]
아래 JSON만 출력해라.
{
  "drafts": [
    {"variant":"A","tone":"${tonePreset.A.tone}","includes_link":true/false,"text":"..."},
    {"variant":"B","tone":"${tonePreset.B.tone}","includes_link":true/false,"text":"..."},
    {"variant":"C","tone":"${tonePreset.C.tone}","includes_link":true/false,"text":"..."}
  ],
  "notes": "주의할 점 1~2줄"
}

[링크 규칙]
- 링크 허용이 NO면 절대 링크/도메인/유도 문구를 넣지 마라.
- YES여도 프로모 가이드에 맞게 조절.
`.trim();
}

export function buildRewritePrompt(input: { text: string; style: string }) {
  return `
다음 글을 "${input.style}" 스타일로 짧고 자연스럽게 다듬어라.
과장/광고/명령형 표현 금지. 한글 문장 흐름을 매끈하게.
결과만 출력.

[원문]
${input.text}
`.trim();
}

// ============================================
// AI Art 커뮤니티 기여 모드 (홍보 0% - 순수 도움만)
// ============================================

export function buildAiArtCommunityAnalyzePrompt(input: {
  title: string;
  body: string;
  sourceName: string;
}) {
  return `
너는 AI 아트 커뮤니티의 중립적인 모더레이터다.
아래 글이 "도움 되는 답변으로 대화에 참여할 가치가 있는지" 평가하라.

기준:
- 질문, 워크플로우, 툴 비교, 팁 요청, 경험 공유 글 → 답변 가치 높음
- 논쟁(저작권, 윤리, 정치, 혐오, 싸움 유발) → 리스크 높음
- 명백한 광고/스팸 → 답변 가치 낮음

중요 규칙:
- 홍보 가능성, 링크 삽입 가능성은 평가하지 마라.
- 오직 "커뮤니티 기여 관점"에서만 판단하라.

JSON으로만 출력:
{
  "category": "tool|workflow|prompt|question|discussion|news|other",
  "relevance_score": 0-100,
  "reply_worthiness_score": 0-100,
  "link_fit_score": 0,
  "risk_flags": ["copyright","toxic","politics","spam","drama"] 중 해당되는 것들,
  "recommended_action": "draft|observe|skip",
  "suggested_angle": "어떤 관점으로 답변하면 도움이 될지 한 줄",
  "summary_short": "한 줄 요약",
  "summary_long": "3~4줄 요약"
}

참고: link_fit_score는 커뮤니티 기여 모드에서 항상 0이다. 링크는 포함하지 않는다.
recommended_action이 "draft"이면 답변할 가치가 있음, "observe"면 지켜보기, "skip"이면 무시.

[제목]
${input.title}

[본문]
${input.body}

[출처]
${input.sourceName}
`.trim();
}

export function buildAiArtCommunityDraftPrompt(input: {
  title: string;
  body: string;
  suggestedAngle: string;
}) {
  return `
너는 AI 아트 커뮤니티에서 활동하는 일반 사용자다.
아래 글에 대해 "도움이 되는 답변"을 작성하라.

절대 규칙:
- 링크를 포함하지 마라.
- 어떤 서비스, 웹사이트, 제품, 브랜드도 언급하지 마라.
- 홍보, 마케팅, 추천 톤을 사용하지 마라.
- 그냥 커뮤니티 유저 1명처럼 경험/지식/팁을 공유하라.

작성 가이드:
- 공감 또는 문제 요약 1문장
- 구체적인 팁/방법/관점 2~4문장
- 가능하면 주의점이나 대안 1~2문장
- 길이: 4~8문장
- 톤: 친절, 차분, 실무적
- 영어로 작성 (HN/Reddit/Moltbook 기준)

[게시글 제목]
${input.title}

[게시글 내용]
${input.body}

[답변 방향 힌트]
${input.suggestedAngle}

[출력 형식]
JSON으로만 출력:
{
  "drafts": [
    {"variant":"A","tone":"helpful","includes_link":false,"text":"경험 기반 도움형 답변"},
    {"variant":"B","tone":"analytical","includes_link":false,"text":"기술적 분석/비교형 답변"},
    {"variant":"C","tone":"supportive","includes_link":false,"text":"공감+격려형 답변"}
  ],
  "notes": "이 글에 답변할 때 주의할 점 1~2줄"
}

이 규칙을 반드시 지켜서 답변 초안을 작성하라.
`.trim();
}

// ============================================
// 분석 결과 타입
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

  return `너는 AI Art 마켓플레이스와 크리에이터 커뮤니티를 분석하는 리서처다.
목표는 AI 아트 생태계의 **트렌드, 도구, 커뮤니티 동향**을 정리한 Daily Brief를 작성하는 것이다.
기술적 발전, 새로운 도구, 커뮤니티 반응, 시장 기회 등을 중심으로 분석한다.
출처(URL)를 포함하고, 과장/추측/확정적 표현을 피한다.

입력 데이터:
다음은 지난 24시간 동안 수집·분석된 AI Art 관련 게시물 목록이다:

${JSON.stringify(itemsData, null, 2)}

오늘 날짜: ${date}

출력 형식:

AI Art Daily Brief - ${date}

본 리포트는 AI 아트 생태계 동향 정보 제공 목적입니다.

TL;DR (오늘의 한 줄 요약)
- 한 문장으로 오늘 AI Art 씬의 핵심 동향을 요약하라.

주요 트렌드 (3~5개)
각 트렌드마다 아래 형식을 따른다:

1) 트렌드 제목
- 무슨 일이 있었나: 사실 위주 요약 (2~3문장)
- 왜 중요한가: 크리에이터/마켓에 미치는 영향 설명
- 관련 분야: 이미지생성/영상/음악/도구/플랫폼/커뮤니티 중 해당 분야
- 기회/리스크: 크리에이터가 활용할 수 있는 기회 또는 주의점
- 출처: Source - URL

도구/기술 업데이트
- 새로운 AI 아트 도구, 모델 업데이트, 플랫폼 변경사항 정리
- 각 항목별 2~3줄

커뮤니티 화제
- Reddit, HN 등 커뮤니티에서 화제가 된 작품, 논쟁, 토론 정리
- 각 항목별 2~3줄

이번 주 체크포인트
- 주목할 이벤트, 콘테스트, 출시 예정 도구 등 5개 내외

Sources
- 본 리포트에 사용한 게시물 링크 목록

작성 규칙:
- AI Art 생성, 편집, 워크플로우 관련 내용 중심
- 크리에이터 관점에서 실용적인 인사이트 제공
- 기술적 발전과 커뮤니티 반응을 균형있게 다룰 것
- 투자/금융 관련 내용은 제외할 것
- 과장 없이 사실 중심으로 작성`;
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

중요 - 데이터 필터링:
입력 데이터 중 아래 내용은 반드시 제외하라:
- AI 아트, 이미지 생성, 크리에이티브 도구 관련 내용
- Reddit 커뮤니티 토론, Show HN 프로젝트 소개
- 투자/금융/거시경제와 직접 관련 없는 기술 뉴스

주식, 금리, 환율, 크립토, 원자재, 거시경제와 직접 관련된 내용만 다뤄라.

입력 데이터:
다음은 지난 24~48시간 동안 수집·분석된 투자 관련 기사 목록이다:

${JSON.stringify(itemsData, null, 2)}

오늘 날짜: ${date}

출력 형식 (반드시 한국어):

Daily Market Brief - ${date}

본 리포트는 정보 제공 목적이며 투자 조언이 아닙니다.

TL;DR (오늘의 한 줄 요약)
- 1~2줄로 오늘 시장의 핵심 분위기 요약

Market Drivers (핵심 이슈 3~5개)
각 이슈마다:

1) 이슈 제목
- 무슨 일이 있었나: 사실 위주로 요약 (2~3문장)
- 왜 중요한가: 시장에 미치는 구조적 영향 설명 (2~3문장)
- 영향 범위: 주식/채권/크립토/환율/원자재 등 관련 자산군 명시
- 리스크/불확실성: 가능한 리스크 또는 반대 시나리오 1~2줄
- 출처: Source Name - URL

Cross-Market View (자산군 간 연결)
- 주식, 금리, 달러, 크립토, 원자재 간 연결 설명
- 오늘 이슈들이 다른 자산군에 어떤 파급 효과를 줄 수 있는지 분석

Risk Radar (주요 리스크)
- 단기 리스크 2~3개 요약
- 각 항목은 2~3줄, "왜 리스크인지" 중심으로 서술

Checklist (오늘/이번 주 체크 포인트)
- 정책 일정, 지표 발표, 지정학 이벤트 등
- 예: CPI 발표, FOMC 발언, 주요 기업 실적, 옵션 만기, 규제 이슈 등

Sources
- 사용한 주요 출처 리스트

작성 규칙:
- "사라", "팔아라", "오를 것 같다", "내릴 것 같다" 같은 투자 지시/확정적 표현 금지
- "~일 수 있다", "~가능성이 있다" 같은 조건부/시나리오 표현 사용
- "왜 시장이 이 뉴스에 반응하는가" 중심으로 설명
- 정책/금리/자금흐름/리스크 우선
- 사실 / 해석 / 리스크를 명확히 구분
- risk_flags에 rumor, low_credibility, opinion_only 등이 있으면 비중 축소
- confidence가 낮은 항목은 핵심 이슈로 올리지 말 것
- 과장된 표현, 감정적 표현, 클릭베이트 톤 금지
- 숫자/정책/실적/금리/규제 등 구조적 요인을 우선적으로 다룰 것
- 유튜브/커뮤니티 떡밥은 배제 또는 보조

선택 기준 (내부 판단):
- 우선순위: 시장 구조 변화(금리, 정책, 규제, 유동성) > 기업 실적/섹터 영향 > 거시/지정학/에너지 리스크 > 크립토 제도권/ETF/규제/펀더멘털
- 단기 가격 예측 중심 기사보다 원인과 영향 설명이 있는 기사를 우선 채택`;
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
      return "간결하게 작성하라. 각 섹션은 2~3줄 이내로. 핵심만 전달하라.";
    case "detailed":
      return "상세하게 작성하라. 배경 설명, 분석, 맥락을 풍부하게 포함하라.";
    default:
      return "적정 길이로 작성하라. 중요한 내용은 상세히, 부가 내용은 간략히.";
  }
}

function getMarkdownInstructions(level: string): string {
  switch (level) {
    case "minimal":
      return `뉴스 앵커처럼 대화형 톤으로 작성하라. 구체적 규칙:
- ## ** 같은 무거운 마크다운 문법을 쓰지 마라
- 섹션 구분은 간단한 제목(# 또는 짧은 텍스트 레이블) 하나만 사용
- 볼드(**), 이탤릭(*), 테이블 사용 금지
- 리스트는 간단한 대시(-)만 사용
- 문장형으로 이어지게 작성. "문서"가 아니라 "브리핑"처럼
- 이모지나 특수 기호 사용 금지. 순수 텍스트와 대시(-)만 사용`;
    default:
      return "표준 마크다운 사용: 제목, 볼드, 리스트 등 자유롭게 활용.";
  }
}

function getSectionInstructions(sections: ReportConfig["sections"], topic: string): string {
  const defaultSections = { tldr: true, drivers: true, risk: true, checklist: true, sources: true };
  const s = { ...defaultSections, ...sections };
  
  const sectionMap = topic === "investing" ? {
    tldr: "TL;DR (오늘의 한 줄 요약)",
    drivers: "Market Drivers (핵심 이슈 3~5개) + Cross-Market View",
    risk: "Risk Radar (주요 리스크)",
    checklist: "Checklist (오늘/이번 주 체크 포인트)",
    sources: "Sources (출처 목록)",
  } : {
    tldr: "TL;DR (오늘의 한 줄 요약)",
    drivers: "주요 트렌드 (3~5개) + 도구/기술 업데이트 + 커뮤니티 화제",
    risk: "주의할 점/리스크",
    checklist: "이번 주 체크포인트",
    sources: "Sources (출처 목록)",
  };

  const includedSections = Object.entries(sectionMap)
    .filter(([key]) => s[key as keyof typeof s])
    .map(([, label]) => `- ${label}`)
    .join("\n");

  const excludedSections = Object.entries(sectionMap)
    .filter(([key]) => !s[key as keyof typeof s])
    .map(([, label]) => label);

  let instructions = `포함할 섹션:\n${includedSections}`;
  if (excludedSections.length > 0) {
    instructions += `\n\n제외할 섹션 (작성하지 마라):\n${excludedSections.map(s => `- ${s}`).join("\n")}`;
  }
  
  return instructions;
}

export function buildDailyBriefPrompt(items: any[], date: string, topic: string, config?: ReportConfig): string {
  if (topic === "investing") {
    return buildInvestingBriefPromptWithConfig(items, date, config);
  }
  return buildAIArtBriefPromptWithConfig(items, date, config);
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

사용자 설정:
${getVerbosityInstructions(verbosity)}
${getMarkdownInstructions(markdownLevel)}

${getSectionInstructions(sections, "investing")}

중요 - 데이터 필터링:
입력 데이터 중 아래 내용은 반드시 제외하라:
- AI 아트, 이미지 생성, 크리에이티브 도구 관련 내용
- Reddit 커뮤니티 토론, Show HN 프로젝트 소개
- 투자/금융/거시경제와 직접 관련 없는 기술 뉴스

주식, 금리, 환율, 크립토, 원자재, 거시경제와 직접 관련된 내용만 다뤄라.

입력 데이터:
다음은 지난 24~48시간 동안 수집·분석된 투자 관련 기사 목록이다:

${JSON.stringify(itemsData, null, 2)}

오늘 날짜: ${date}

출력 형식 (반드시 한국어):

Daily Market Brief - ${date}

본 리포트는 정보 제공 목적이며 투자 조언이 아닙니다.

(설정된 섹션만 출력하라)

작성 규칙:
- "사라", "팔아라", "오를 것 같다", "내릴 것 같다" 같은 투자 지시/확정적 표현 금지
- "~일 수 있다", "~가능성이 있다" 같은 조건부/시나리오 표현 사용
- "왜 시장이 이 뉴스에 반응하는가" 중심으로 설명
- 정책/금리/자금흐름/리스크 우선
- 사실 / 해석 / 리스크를 명확히 구분
- risk_flags에 rumor, low_credibility, opinion_only 등이 있으면 비중 축소
- confidence가 낮은 항목은 핵심 이슈로 올리지 말 것
- 과장된 표현, 감정적 표현, 클릭베이트 톤 금지`;
}

function buildAIArtBriefPromptWithConfig(items: any[], date: string, config?: ReportConfig): string {
  const verbosity = config?.verbosity || "normal";
  const markdownLevel = config?.markdownLevel || "minimal";
  const sections = config?.sections;

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

  return `너는 AI Art 마켓플레이스와 크리에이터 커뮤니티를 분석하는 리서처다.
목표는 AI 아트 생태계의 **트렌드, 도구, 커뮤니티 동향**을 정리한 Daily Brief를 작성하는 것이다.
기술적 발전, 새로운 도구, 커뮤니티 반응, 시장 기회 등을 중심으로 분석한다.
출처(URL)를 포함하고, 과장/추측/확정적 표현을 피한다.

사용자 설정:
${getVerbosityInstructions(verbosity)}
${getMarkdownInstructions(markdownLevel)}

${getSectionInstructions(sections, "ai_art")}

입력 데이터:
다음은 지난 24시간 동안 수집·분석된 AI Art 관련 게시물 목록이다:

${JSON.stringify(itemsData, null, 2)}

오늘 날짜: ${date}

출력 형식:

AI Art Daily Brief - ${date}

본 리포트는 AI 아트 생태계 동향 정보 제공 목적입니다.

(설정된 섹션만 출력하라)

작성 규칙:
- AI Art 생성, 편집, 워크플로우 관련 내용 중심
- 크리에이터 관점에서 실용적인 인사이트 제공
- 기술적 발전과 커뮤니티 반응을 균형있게 다룰 것
- 투자/금융 관련 내용은 제외할 것
- 과장 없이 사실 중심으로 작성`;
}
