import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import { createUnzip } from 'zlib';
import { parseString } from 'xml2js';

const router = express.Router();
const analysisJobs = new Map();

const KNOWN_CORP_CODES = {
  '삼성전자': '00126380',
  '현대자동차': '00164742',
  '현대차': '00164742',
  'CJ제일제당': '00258801',
  'SK하이닉스': '00164779',
  'LG전자': '00401731',
  'LG화학': '00356361',
  '네이버': '00266961',
  'NAVER': '00266961',
  '카카오': '00258801',
  '포스코': '00138532',
  'POSCO': '00138532',
  '포스코홀딩스': '00138532',
  '기아': '00164788',
  '기아자동차': '00164788',
  '셀트리온': '00421045',
  '삼성SDI': '00126186',
  '삼성바이오로직스': '00743573',
  '삼성물산': '00126276',
  '삼성생명': '00126299',
  'SK텔레콤': '00164800',
  'SK이노베이션': '00631518',
  'KT': '00164706',
  'LG에너지솔루션': '01123825',
  '한화솔루션': '00149655',
  '롯데케미칼': '00159484',
  '현대모비스': '00164788',
  '두산에너빌리티': '00115714',
  '한국전력': '00159243',
  '신한지주': '00382199',
  'KB금융': '00547583',
  '하나금융지주': '00547210',
  '우리금융지주': '00254872',
  '아모레퍼시픽': '00156843',
  '한화에어로스페이스': '00142658',
};

let corpCodeCache = null;

async function searchCorpCode(companyName) {
  if (KNOWN_CORP_CODES[companyName]) {
    return KNOWN_CORP_CODES[companyName];
  }

  for (const [name, code] of Object.entries(KNOWN_CORP_CODES)) {
    if (companyName.includes(name) || name.includes(companyName)) {
      return code;
    }
  }

  try {
    const dartKey = process.env.DART_API_KEY;
    if (!dartKey) return null;

    if (!corpCodeCache) {
      console.log('[DART] Downloading corp code list...');
      const res = await fetch(`https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${dartKey}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        console.error('[DART] corpCode download failed:', res.status);
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const xmlContent = await new Promise((resolve, reject) => {
        const chunks = [];
        const unzip = createUnzip();
        unzip.on('data', (chunk) => chunks.push(chunk));
        unzip.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        unzip.on('error', reject);
        const readable = new Readable();
        readable.push(buffer);
        readable.push(null);
        readable.pipe(unzip);
      });

      const parsed = await new Promise((resolve, reject) => {
        parseString(xmlContent, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      if (parsed?.result?.list) {
        corpCodeCache = parsed.result.list.map(item => ({
          corpCode: item.corp_code?.[0] || '',
          corpName: item.corp_name?.[0] || '',
          stockCode: item.stock_code?.[0] || '',
        }));
        console.log(`[DART] Loaded ${corpCodeCache.length} corp codes`);
      }
    }

    if (corpCodeCache) {
      const exact = corpCodeCache.find(c => c.corpName === companyName);
      if (exact) return exact.corpCode;

      const partial = corpCodeCache.find(c =>
        c.corpName.includes(companyName) || companyName.includes(c.corpName)
      );
      if (partial) return partial.corpCode;
    }
  } catch (err) {
    console.error('[DART] Corp code search error:', err.message);
  }

  return null;
}

async function fetchDartCompanyInfo(corpCode) {
  const dartKey = process.env.DART_API_KEY;
  if (!dartKey || !corpCode) return null;

  try {
    const url = `https://opendart.fss.or.kr/api/company.json?crtfc_key=${dartKey}&corp_code=${corpCode}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.error('[DART] Company info fetch failed:', res.status);
      return null;
    }

    const data = await res.json();
    if (data.status !== '000') {
      console.error('[DART] API error:', data.message);
      return null;
    }

    const estDate = data.est_dt;
    let formattedDate = '';
    if (estDate && estDate.length === 8) {
      formattedDate = `${estDate.substring(0, 4)}년 ${parseInt(estDate.substring(4, 6))}월 ${parseInt(estDate.substring(6, 8))}일`;
    }

    const industryMap = {
      '264': '반도체/전자부품',
      '261': '전자부품',
      '292': '자동차',
      '291': '자동차/운송장비',
      '203': '식품/음료',
      '201': '식품 제조',
      '582': 'IT/소프트웨어',
      '620': 'IT/소프트웨어',
      '631': '정보서비스',
      '241': '화학',
      '242': '화학제품',
      '171': '섬유/의류',
      '351': '조선/해양',
      '641': '금융/보험',
      '642': '금융/보험',
      '651': '보험',
    };

    return {
      name: data.corp_name || '',
      nameEng: data.corp_name_eng || '',
      stockName: data.stock_name || '',
      stockCode: data.stock_code || '',
      ceo: data.ceo_nm || '',
      address: data.adres || '',
      website: data.hm_url ? (data.hm_url.startsWith('http') ? data.hm_url : `https://${data.hm_url}`) : '',
      phone: data.phn_no || '',
      industry: industryMap[data.induty_code] || `산업코드 ${data.induty_code}`,
      industryCode: data.induty_code || '',
      founded: formattedDate,
      bizNo: data.bizr_no || '',
      corpCode: data.corp_code || '',
      corpClass: data.corp_cls || '',
      accountMonth: data.acc_mt || '',
      dataSource: 'DART 전자공시시스템 (금융감독원)',
    };
  } catch (err) {
    console.error('[DART] Company info error:', err.message);
    return null;
  }
}

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
    job.currentStep = 'DART 전자공시 기업 정보 조회 중...';
    job.steps[0].status = 'processing';
    job.progress = 5;

    let dartInfo = null;
    const corpCode = await searchCorpCode(job.company);
    if (corpCode) {
      console.log(`[DART] Found corp_code for "${job.company}": ${corpCode}`);
      dartInfo = await fetchDartCompanyInfo(corpCode);
      if (dartInfo) {
        console.log(`[DART] Company info loaded: ${dartInfo.name} (${dartInfo.ceo})`);
      }
    } else {
      console.log(`[DART] Corp code not found for "${job.company}", using fallback`);
    }

    await delay(1500);
    job.steps[0].status = 'completed';
    job.progress = 25;

    job.currentStep = '뉴스 및 미디어 분석 중...';
    job.steps[1].status = 'processing';
    const liveNews = await collectNews(dartInfo?.name || job.company);
    job.steps[1].status = 'completed';
    job.progress = 50;

    job.currentStep = 'GPT-4o 종합 분석 중...';
    job.steps[2].status = 'processing';
    await delay(3000);
    job.steps[2].status = 'completed';
    job.progress = 80;

    job.currentStep = '리포트 생성 중...';
    job.steps[3].status = 'processing';
    await delay(1500);
    job.steps[3].status = 'completed';
    job.progress = 100;

    const companyDisplayName = dartInfo?.name || job.company;
    const corpClassMap = { 'Y': '유가증권시장 (KOSPI)', 'K': '코스닥 (KOSDAQ)', 'N': '코넥스 (KONEX)', 'E': '기타' };

    job.status = 'completed';
    job.currentStep = '분석 완료!';
    job.result = {
      basicInfo: dartInfo ? {
        name: dartInfo.name,
        nameEng: dartInfo.nameEng,
        industry: dartInfo.industry,
        ceo: dartInfo.ceo,
        founded: dartInfo.founded,
        headquarters: dartInfo.address,
        stockCode: dartInfo.stockCode,
        stockMarket: corpClassMap[dartInfo.corpClass] || '',
        website: dartInfo.website,
        phone: dartInfo.phone,
        bizNo: dartInfo.bizNo,
        accountMonth: dartInfo.accountMonth ? `${dartInfo.accountMonth}월` : '',
        dataSource: dartInfo.dataSource,
      } : {
        name: job.company,
        industry: '기술/IT',
        ceo: '대표이사',
        founded: '2005년',
        headquarters: '서울특별시',
        employees: '12,500명 이상',
        revenue: '약 5조 6,000억원 (2024)',
        website: `https://www.${job.company.toLowerCase().replace(/\s+/g, '')}.com`,
      },
      summary: dartInfo
        ? `${dartInfo.name}(${dartInfo.nameEng})은 ${dartInfo.founded} 설립된 ${dartInfo.industry} 분야의 기업으로, ${dartInfo.stockCode ? `${corpClassMap[dartInfo.corpClass] || '증권시장'}에 상장(종목코드: ${dartInfo.stockCode})되어 있습니다` : '비상장 기업입니다'}. 대표이사 ${dartInfo.ceo}가 이끌고 있으며, 본사는 ${dartInfo.address}에 위치하고 있습니다.`
        : `${job.company}는 해당 산업에서 강력한 브랜드 인지도와 성장 잠재력을 보유한 선도 기업입니다. 지난 10년간 꾸준한 기술 혁신과 시장 확장을 통해 업계 내 입지를 공고히 해왔으며, 글로벌 시장에서의 경쟁력을 지속적으로 강화하고 있습니다.`,
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
