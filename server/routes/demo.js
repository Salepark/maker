import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const analysisJobs = new Map();

function simpleSentiment(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const positive = ['growth', 'record', 'profit', 'surge', 'boost', 'gain', 'success', 'award', 'innovation', 'launch', 'partnership', 'expand', 'rise', 'beat', 'strong',
    '성장', '기록', '수익', '흑자', '혁신', '출시', '제휴', '확장', '상승', '호실적', '수상'];
  const negative = ['loss', 'decline', 'lawsuit', 'scandal', 'investigation', 'scrutiny', 'risk', 'drop', 'cut', 'layoff', 'fine', 'penalty', 'crash', 'fail', 'downturn', 'recall',
    '손실', '하락', '소송', '조사', '리스크', '감소', '해고', '벌금', '위기', '리콜'];
  const posCount = positive.filter(w => text.includes(w)).length;
  const negCount = negative.filter(w => text.includes(w)).length;
  if (posCount > negCount) return 'positive';
  if (negCount > posCount) return 'negative';
  return 'neutral';
}

async function collectNews(company) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.log('NEWS_API_KEY not set, using fallback dummy news');
    return null;
  }

  try {
    const q = encodeURIComponent(company);
    const url = `https://newsapi.org/v2/everything?q=${q}&sortBy=publishedAt&pageSize=3&apiKey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      console.error(`NewsAPI error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();

    if (!data.articles || data.articles.length === 0) {
      console.log(`NewsAPI returned no articles for "${company}"`);
      return null;
    }

    return data.articles.slice(0, 3).map(article => ({
      title: article.title || '제목 없음',
      source: article.source?.name || '알 수 없음',
      date: article.publishedAt || new Date().toISOString(),
      sentiment: simpleSentiment(article.title || '', article.description || ''),
      summary: article.description || article.content?.slice(0, 200) || '요약 정보가 없습니다.',
    }));
  } catch (err) {
    console.error('NewsAPI fetch failed:', err.message);
    return null;
  }
}

function getFallbackNews(company) {
  return [
    {
      title: `${company}, 4분기 매출 사상 최대 기록`,
      source: '연합뉴스',
      date: new Date(Date.now() - 86400000).toISOString(),
      sentiment: 'positive',
      summary: `${company}가 4분기 매출이 전년 대비 23% 증가하며 시장 기대치를 상회했습니다. 주력 사업부의 성장세가 두드러졌습니다.`,
    },
    {
      title: `${company}, 동남아 시장 진출 본격화`,
      source: '한국경제',
      date: new Date(Date.now() - 86400000 * 3).toISOString(),
      sentiment: 'neutral',
      summary: `싱가포르와 베트남에 신규 법인을 설립하고 아시아·태평양 지역 확장 전략을 발표했습니다.`,
    },
    {
      title: `${company}, EU 시장에서 규제 리스크 부각`,
      source: '매일경제',
      date: new Date(Date.now() - 86400000 * 5).toISOString(),
      sentiment: 'negative',
      summary: `유럽 규제 당국이 데이터 관련 조사에 착수하여 현지 사업에 영향을 미칠 수 있다는 분석이 나왔습니다.`,
    },
  ];
}

router.get('/test', (req, res) => {
  res.json({ success: true, message: '데모 API가 정상 작동 중입니다.' });
});

router.post('/quick-analysis', async (req, res) => {
  try {
    const { company } = req.body;

    if (!company) {
      return res.status(400).json({ success: false, error: '기업명을 입력해 주세요.' });
    }

    const jobId = uuidv4();
    const job = {
      id: jobId,
      company,
      status: 'processing',
      progress: 0,
      currentStep: '분석 준비 중...',
      startTime: Date.now(),
      steps: [
        { name: '기본 정보 수집', status: 'pending' },
        { name: '뉴스 및 미디어 분석', status: 'pending' },
        { name: 'AI 종합 분석', status: 'pending' },
        { name: '리포트 생성', status: 'pending' },
      ],
      result: null,
    };

    analysisJobs.set(jobId, job);
    processAnalysis(jobId);

    res.json({
      success: true,
      job_id: jobId,
      status: 'processing',
      estimated_time: 300,
      progress_url: `/api/demo/analysis-status/${jobId}`,
    });
  } catch (error) {
    console.error('Analysis start error:', error);
    res.status(500).json({ success: false, error: '분석을 시작할 수 없습니다.' });
  }
});

router.get('/analysis-status/:jobId', (req, res) => {
  const job = analysisJobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({ success: false, error: '분석 작업을 찾을 수 없습니다.' });
  }

  const response = {
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    current_step: job.currentStep,
    elapsed_time: Math.floor((Date.now() - job.startTime) / 1000),
    steps: job.steps,
  };

  if (job.status === 'completed' && job.result) {
    response.result = { report_url: `/demo/report/${job.id}`, preview_data: job.result };
  }

  if (job.status === 'failed') {
    response.error = job.error || '분석 중 오류가 발생했습니다.';
  }

  res.json(response);
});

router.get('/analysis-result/:jobId', (req, res) => {
  const job = analysisJobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({ success: false, error: '분석 결과를 찾을 수 없습니다.' });
  }

  if (job.status !== 'completed') {
    return res.status(400).json({ success: false, error: '분석이 아직 완료되지 않았습니다.' });
  }

  res.json({
    success: true,
    job_id: job.id,
    company: job.company,
    analysis_time: Math.floor((Date.now() - job.startTime) / 1000),
    result: job.result,
  });
});

async function processAnalysis(jobId) {
  const job = analysisJobs.get(jobId);
  if (!job) return;

  try {
    job.currentStep = '기본 정보 수집 중...';
    job.steps[0].status = 'processing';
    job.progress = 5;
    await delay(2000);
    job.steps[0].status = 'completed';
    job.progress = 25;

    job.currentStep = '뉴스 및 미디어 분석 중...';
    job.steps[1].status = 'processing';
    const liveNews = await collectNews(job.company);
    job.steps[1].status = 'completed';
    job.progress = 50;

    job.currentStep = 'GPT-4o 종합 분석 중...';
    job.steps[2].status = 'processing';
    await delay(4000);
    job.steps[2].status = 'completed';
    job.progress = 80;

    job.currentStep = '리포트 생성 중...';
    job.steps[3].status = 'processing';
    await delay(2000);
    job.steps[3].status = 'completed';
    job.progress = 100;

    job.status = 'completed';
    job.currentStep = '분석 완료!';
    job.result = {
      basicInfo: {
        name: job.company,
        industry: '기술/IT',
        ceo: '대표이사',
        founded: '2005년',
        headquarters: '서울특별시',
        employees: '12,500명 이상',
        revenue: '약 5조 6,000억원 (2024)',
        website: `https://www.${job.company.toLowerCase().replace(/\s+/g, '')}.com`,
      },
      summary: `${job.company}는 해당 산업에서 강력한 브랜드 인지도와 성장 잠재력을 보유한 선도 기업입니다. 지난 10년간 꾸준한 기술 혁신과 시장 확장을 통해 업계 내 입지를 공고히 해왔으며, 글로벌 시장에서의 경쟁력을 지속적으로 강화하고 있습니다.`,
      swot: {
        strengths: [
          '강력한 브랜드 인지도와 높은 고객 충성도',
          '적극적인 R&D 투자 및 기술 혁신 역량',
          '글로벌 시장에서의 높은 점유율',
        ],
        weaknesses: [
          '경쟁사 대비 높은 가격 구조',
          '공급망 특정 지역 집중 리스크',
          '핵심 시장에 대한 높은 의존도',
        ],
        opportunities: [
          '신흥 시장 진출 확대 가능성',
          '신규 제품 라인 다각화',
          'ESG 및 지속가능성 트렌드 활용',
        ],
        threats: [
          '신규 경쟁사 진입으로 인한 경쟁 심화',
          '변화하는 규제 환경 대응 필요',
          '원자재 및 운영 비용 상승 압박',
        ],
      },
      news: liveNews || getFallbackNews(job.company),
      insights: [
        `${job.company}의 매출 성장률 23%는 업계 평균 12%를 크게 상회하며, 강력한 경쟁 우위를 보여줍니다.`,
        `R&D 투자 비중이 매출의 18%로, 업계 평균 10%보다 현저히 높아 기술 혁신에 적극적입니다.`,
        `주요 경제 매체 기준 시장 감성 분석 결과, 67%가 긍정적 보도로 나타났습니다.`,
        `공급망 다각화 노력으로 단일 공급원 의존도가 전년 대비 45%에서 28%로 감소했습니다.`,
        `고객 유지율이 94%로 높은 만족도와 강한 브랜드 충성도를 나타냅니다.`,
      ],
      generatedAt: new Date().toISOString(),
      analysisTime: Math.floor((Date.now() - job.startTime) / 1000),
    };

    console.log(`분석 완료: ${job.company} (${job.result.analysisTime}초)`);
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    job.currentStep = '분석 실패';
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default router;
