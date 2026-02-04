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
    none: "aiartmarket 언급 금지. 순수 정보 제공만.",
    subtle: "10번 중 1번 정도로만, '참고로' 수준으로 아주 자연스럽게 언급 가능.",
    moderate: "맥락에 맞으면 aiartmarket.io 언급 가능, 단 광고 티 나지 않게.",
  }[promoLevel];

  return `
너는 AI Art 커뮤니티에서 신뢰를 잃지 않는 기여자다.
플랫폼: ${platform}
짧고 자연스럽게, 맥락에 맞게 쓴다.
복붙 티 나지 않게 문장 구조를 바꿔라.
공격적/과장 광고 금지.

[참고: aiartmarket 사실 3줄]
- aiartmarket.io는 AI로 생성된 아트/프롬프트/템플릿 등의 디지털 자산 거래를 목표로 한다.
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
