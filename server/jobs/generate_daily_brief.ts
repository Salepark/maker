import { storage } from "../storage";
import { callLLM } from "../llm/client";

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

function buildAIArtPrompt(items: any[], date: string): string {
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

## 📥 입력 데이터

다음은 지난 24시간 동안 수집·분석된 AI Art 관련 게시물 목록이다:

${JSON.stringify(itemsData, null, 2)}

오늘 날짜: ${date}

## 📝 출력 형식 (반드시 Markdown)

# AI Art Daily Brief — ${date}

> 본 리포트는 AI 아트 생태계 동향 정보 제공 목적입니다.

## TL;DR (오늘의 한 줄 요약)
- 한 문장으로 오늘 AI Art 씬의 핵심 동향을 요약하라.

## 주요 트렌드 (3~5개)
각 트렌드마다 아래 형식을 따른다:

### 1) {{트렌드 제목}}
- **무슨 일이 있었나 (What):** 사실 위주 요약 (2~3문장)
- **왜 중요한가 (Why):** 크리에이터/마켓에 미치는 영향 설명
- **관련 분야:** 이미지생성/영상/음악/도구/플랫폼/커뮤니티 중 해당 분야
- **기회/리스크:** 크리에이터가 활용할 수 있는 기회 또는 주의점
- **출처:** {{Source}} — {{URL}}

## 도구/기술 업데이트
- 새로운 AI 아트 도구, 모델 업데이트, 플랫폼 변경사항 정리
- 각 항목별 2~3줄

## 커뮤니티 화제
- Reddit, HN 등 커뮤니티에서 화제가 된 작품, 논쟁, 토론 정리
- 각 항목별 2~3줄

## 이번 주 체크포인트
- 주목할 이벤트, 콘테스트, 출시 예정 도구 등 5개 내외

## Sources
- 본 리포트에 사용한 게시물 링크 목록

---

## 📏 작성 규칙

* ✔️ AI Art 생성, 편집, 워크플로우 관련 내용 중심
* ✔️ 크리에이터 관점에서 실용적인 인사이트 제공
* ✔️ 기술적 발전과 커뮤니티 반응을 균형있게 다룰 것
* ✔️ 투자/금융 관련 내용은 제외할 것
* ✔️ 과장 없이 사실 중심으로 작성`;
}

function buildInvestingPrompt(items: any[], date: string): string {
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

  return `너는 개인 투자자를 위한 **Daily Market Brief**를 작성하는 애널리스트다.
목표는 **의사결정 보조용 정세 브리핑**이며, **매수/매도 지시를 절대 하지 않는다**.
기사들의 **사실(facts)**, **해석(interpretation)**, **리스크(risks)**를 구분해 서술한다.
출처(URL)를 포함하고, 과장/추측/확정적 표현을 피한다.
신뢰도가 낮은 정보(루머/익명/의견 위주)는 **리스크로 표시**하고 비중을 낮춘다.

## ⚠️ 중요: 데이터 필터링

입력 데이터 중 아래 내용은 반드시 제외하라:
- AI 아트, 이미지 생성, 크리에이티브 도구 관련 내용
- Reddit 커뮤니티 토론, Show HN 프로젝트 소개
- 투자/금융/거시경제와 직접 관련 없는 기술 뉴스

주식, 금리, 환율, 크립토, 원자재, 거시경제와 직접 관련된 내용만 다뤄라.

## 📥 입력 데이터

다음은 지난 24시간 동안 수집·분석된 기사 목록이다:

${JSON.stringify(itemsData, null, 2)}

오늘 날짜: ${date}

## 📝 출력 형식 (반드시 Markdown)

# Daily Market Brief — ${date}

> ⚠️ 본 리포트는 정보 제공 목적이며 투자 조언이 아닙니다.

## TL;DR (오늘의 한 줄 요약)
- 한 문장으로 오늘 시장의 핵심 정세를 요약하라.

## Market Drivers (핵심 이슈 4~6개)
각 이슈마다 아래 형식을 따른다:

### 1) {{이슈 제목}}
- **무슨 일이 있었나 (Facts):** 사실 위주로 요약 (2~3문장)
- **왜 중요한가 (Why it matters):** 시장에 미치는 구조적 영향 설명 (2~3문장)
- **영향 범위 (Impact):** 주식/금리·환율/원자재/크립토 중 관련 자산군 명시
- **리스크/불확실성:** 가능한 리스크 또는 반대 시나리오 1~2줄
- **출처:** {{Source Name}} — {{URL}}

## Risk Radar (주요 리스크 3가지)
- 현재 시장 또는 포지션에 불리하게 작용할 수 있는 요인을 3가지로 요약
- 각 항목은 2~3줄, "왜 리스크인지" 중심으로 서술

## Checklist (오늘/이번 주 확인할 포인트)
- 중요한 일정, 지표, 이벤트를 불릿 포인트로 5개 내외 나열
- 예: CPI 발표, FOMC 발언, 주요 기업 실적, 옵션 만기, 규제 이슈 등

## Sources
- 본 리포트에 사용한 기사들의 링크를 목록으로 정리

---

## 📏 작성 규칙 (가드레일)

* ❌ "사라", "팔아라", "확실하다" 같은 **투자 지시/확정적 표현 금지**
* ✔️ "~일 수 있다", "~가능성이 있다" 같은 **조건부/시나리오 표현 사용**
* ✔️ **사실 / 해석 / 리스크**를 명확히 구분
* ✔️ risk_flags에 rumor, low_credibility, opinion_only 등이 있는 경우 본문에서는 리스크/불확실성으로만 언급하거나 비중 축소
* ✔️ confidence가 낮은 항목은 핵심 이슈로 올리지 말 것
* ✔️ 과장된 표현, 감정적 표현, 클릭베이트 톤 금지
* ✔️ 숫자/정책/실적/금리/규제 등 구조적 요인을 우선적으로 다룰 것

## 🎯 선택 기준 (내부 판단 기준)

* 우선순위:
  1. **시장 구조 변화** (금리, 정책, 규제, 유동성)
  2. **기업 실적/섹터 영향**
  3. **거시/지정학/에너지 리스크**
  4. **크립토 제도권/ETF/규제/펀더멘털**
* 단기 가격 예측 중심 기사보다 **원인과 영향 설명이 있는 기사**를 우선 채택`;
}

function buildDailyBriefPrompt(items: any[], date: string, topic: string): string {
  if (topic === "investing") {
    return buildInvestingPrompt(items, date);
  }
  return buildAIArtPrompt(items, date);
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
      content: `# Daily Market Brief\n\n> 분석된 아이템이 없습니다. 데이터 수집 후 다시 시도해주세요.`,
      itemsCount: 0,
      itemIdsJson: [],
    });
    return { id: report.id, itemsCount: 0 };
  }

  const today = new Date().toLocaleDateString("ko-KR", {
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
