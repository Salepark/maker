import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import { createUnzip } from 'zlib';
import { parseString } from 'xml2js';
import OpenAI from 'openai';

const router = express.Router();
const analysisJobs = new Map();

let _openai = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || 'dummy',
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return _openai;
}
const openai = new Proxy({}, {
  get(_, prop) { return getOpenAI()[prop]; }
});

async function analyzeWithGPT4o(companyName, dartInfo, newsItems) {
  const companyContext = dartInfo
    ? `회사명: ${dartInfo.name} (${dartInfo.nameEng})
업종: ${dartInfo.industry}
대표이사: ${dartInfo.ceo}
설립일: ${dartInfo.founded}
본사: ${dartInfo.address}
종목코드: ${dartInfo.stockCode || '비상장'}
시장: ${dartInfo.corpClass === 'Y' ? 'KOSPI' : dartInfo.corpClass === 'K' ? 'KOSDAQ' : '기타'}`
    : `회사명: ${companyName}`;

  const newsContext = newsItems && newsItems.length > 0
    ? newsItems.map((n, i) => `${i + 1}. [${n.sentiment}] ${n.title} (${n.source})\n   ${n.summary}`).join('\n')
    : '최근 뉴스 없음';

  const prompt = `당신은 한국 중소기업 시장 분석 전문가입니다. 다음 기업 정보와 최근 뉴스를 바탕으로 종합 분석을 수행해주세요.

## 기업 정보
${companyContext}

## 최근 뉴스
${newsContext}

## 요청 사항
다음 JSON 형식으로 분석 결과를 반환해주세요. 반드시 유효한 JSON만 출력하세요:

{
  "summary": "기업에 대한 종합적인 분석 요약 (3~5문장, 한국어)",
  "swot": {
    "strengths": ["강점 1", "강점 2", "강점 3"],
    "weaknesses": ["약점 1", "약점 2", "약점 3"],
    "opportunities": ["기회 1", "기회 2", "기회 3"],
    "threats": ["위협 1", "위협 2", "위협 3"]
  },
  "insights": [
    "투자/경영 관점의 핵심 인사이트 1",
    "투자/경영 관점의 핵심 인사이트 2",
    "투자/경영 관점의 핵심 인사이트 3",
    "투자/경영 관점의 핵심 인사이트 4",
    "투자/경영 관점의 핵심 인사이트 5"
  ]
}

주의사항:
- 모든 내용은 한국어로 작성
- SWOT 각 영역은 정확히 3개씩
- 인사이트는 정확히 5개
- 해당 기업의 실제 산업 특성과 뉴스를 반영한 구체적인 분석
- 일반적인 내용이 아닌, 이 기업에 특화된 분석 제공
- summary에는 DART 기본정보 반복 없이 시장 위치와 전망 중심으로 작성`;

  try {
    console.log(`[GPT-4o] Starting analysis for "${companyName}"...`);
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: '당신은 한국 기업 시장 분석 전문 AI입니다. 요청된 JSON 형식으로만 응답하세요.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 8192,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('[GPT-4o] Empty response');
      return null;
    }

    const parsed = JSON.parse(content);
    console.log(`[GPT-4o] Analysis completed for "${companyName}"`);
    return parsed;
  } catch (err) {
    console.error('[GPT-4o] Analysis error:', err.message);
    return null;
  }
}

const KNOWN_CORP_CODES = {
  '삼성전자': '00126380',
  '현대자동차': '00164742',
  '현대차': '00164742',
  'CJ제일제당': '00635134',
  'SK하이닉스': '00164779',
  'LG전자': '00401731',
  'LG화학': '00356361',
  '네이버': '00266961',
  'NAVER': '00266961',
  '카카오': '00258801',
  'CJ': '00635134',
  '포스코홀딩스': '00155319',
  'POSCO홀딩스': '00155319',
  '기아': '00106641',
  '기아자동차': '00106641',
  '셀트리온': '00413046',
  '삼성SDI': '00126362',
  '삼성바이오로직스': '00877059',
  '삼성물산': '00126229',
  '삼성생명': '00126256',
  'SK텔레콤': '00159023',
  'SK이노베이션': '00631518',
  'KT': '00372873',
  'LG에너지솔루션': '01515323',
  '한화솔루션': '00162461',
  '롯데케미칼': '00165413',
  '현대모비스': '00164788',
  '두산에너빌리티': '00159616',
  '한국전력': '00159193',
  '신한지주': '00382199',
  'KB금융': '00688996',
  '하나금융지주': '00547583',
  '우리금융지주': '00375302',
  '아모레퍼시픽': '00583424',
  '한화에어로스페이스': '00126566',
};

async function fetchBusinessStatus(bizNo) {
  const apiKey = process.env.DATA_GO_KR_API_KEY;
  if (!apiKey || !bizNo) return null;

  const cleanBizNo = bizNo.replace(/[-\s]/g, '');
  if (cleanBizNo.length !== 10 || !/^\d{10}$/.test(cleanBizNo)) return null;

  try {
    console.log(`[data.go.kr] Querying business status for ${cleanBizNo}...`);
    const res = await fetch(
      `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ b_no: [cleanBizNo] }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.error(`[data.go.kr] API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data.status_code !== 'OK' || !data.data?.[0]) return null;

    const biz = data.data[0];
    const isRegistered = biz.b_stt_cd !== '' || !biz.tax_type.includes('등록되지 않은');

    const statusMap = { '01': '영업중', '02': '휴업', '03': '폐업' };
    const taxTypeMap = {
      '01': '부가가치세 일반과세자',
      '02': '부가가치세 간이과세자',
      '03': '부가가치세 면세사업자',
      '04': '비영리법인',
      '05': '수익사업 영위 비영리법인',
      '06': '고유번호가 부여된 단체',
      '07': '부가가치세 간이과세자 (세금계산서 발급)',
    };

    console.log(`[data.go.kr] Business ${cleanBizNo}: registered=${isRegistered}, status=${biz.b_stt || 'N/A'}, taxType=${biz.tax_type || 'N/A'}`);

    return {
      bizNo: cleanBizNo,
      isRegistered,
      status: statusMap[biz.b_stt_cd] || biz.b_stt || (isRegistered ? '확인됨' : '미등록'),
      statusCode: biz.b_stt_cd || '',
      taxType: taxTypeMap[biz.tax_type_cd] || biz.tax_type || '',
      taxTypeCode: biz.tax_type_cd || '',
      endDate: biz.end_dt || '',
      unitedTaxpayer: biz.utcc_yn === 'Y' ? '단위과세 적용' : '',
      taxTypeChangeDate: biz.tax_type_change_dt || '',
      invoiceApplyDate: biz.invoice_apply_dt || '',
      dataSource: '국세청 사업자등록정보 조회 (data.go.kr)',
    };
  } catch (err) {
    console.error('[data.go.kr] Business status error:', err.message);
    return null;
  }
}

function isBusinessNumber(input) {
  const cleaned = input.replace(/[-\s]/g, '');
  return /^\d{10}$/.test(cleaned);
}

let corpCodeCache = null;

async function loadCorpCodeCache() {
  if (corpCodeCache) return true;

  try {
    const dartKey = process.env.DART_API_KEY;
    if (!dartKey) return false;

    console.log('[DART] Downloading corp code list...');
    const res = await fetch(`https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${dartKey}`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      console.error('[DART] corpCode download failed:', res.status);
      return false;
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
        stockCode: (item.stock_code?.[0] || '').trim(),
      }));
      console.log(`[DART] Loaded ${corpCodeCache.length} corp codes`);
      return true;
    }
  } catch (err) {
    console.error('[DART] Corp code cache load error:', err.message);
  }
  return false;
}

function normalizeCompanyName(name) {
  return name
    .replace(/\(주\)|\(유\)|주식회사|\s+/g, '')
    .replace(/㈜/g, '')
    .toLowerCase();
}

async function searchCorpCode(companyName) {
  const loaded = await loadCorpCodeCache();

  if (loaded && corpCodeCache) {
    const normalized = normalizeCompanyName(companyName);

    const exactMatch = corpCodeCache.find(c => normalizeCompanyName(c.corpName) === normalized);
    if (exactMatch) {
      console.log(`[DART] Exact match: "${companyName}" → "${exactMatch.corpName}" (${exactMatch.corpCode})`);
      return exactMatch.corpCode;
    }

    const listedExact = corpCodeCache.find(c =>
      normalizeCompanyName(c.corpName) === normalized && c.stockCode
    );
    if (listedExact) {
      console.log(`[DART] Listed exact match: "${companyName}" → "${listedExact.corpName}" (${listedExact.corpCode})`);
      return listedExact.corpCode;
    }

    const partialListed = corpCodeCache.filter(c => {
      const cn = normalizeCompanyName(c.corpName);
      return (cn.includes(normalized) || normalized.includes(cn)) && c.stockCode;
    });
    if (partialListed.length === 1) {
      console.log(`[DART] Partial listed match: "${companyName}" → "${partialListed[0].corpName}" (${partialListed[0].corpCode})`);
      return partialListed[0].corpCode;
    }
    if (partialListed.length > 1) {
      const best = partialListed.reduce((a, b) => {
        const aDiff = Math.abs(normalizeCompanyName(a.corpName).length - normalized.length);
        const bDiff = Math.abs(normalizeCompanyName(b.corpName).length - normalized.length);
        return aDiff <= bDiff ? a : b;
      });
      console.log(`[DART] Best partial match from ${partialListed.length} candidates: "${companyName}" → "${best.corpName}" (${best.corpCode})`);
      return best.corpCode;
    }

    const partialAny = corpCodeCache.filter(c => {
      const cn = normalizeCompanyName(c.corpName);
      return cn.includes(normalized) || normalized.includes(cn);
    });
    if (partialAny.length > 0) {
      const best = partialAny.reduce((a, b) => {
        const aDiff = Math.abs(normalizeCompanyName(a.corpName).length - normalized.length);
        const bDiff = Math.abs(normalizeCompanyName(b.corpName).length - normalized.length);
        return aDiff <= bDiff ? a : b;
      });
      console.log(`[DART] Partial any match: "${companyName}" → "${best.corpName}" (${best.corpCode})`);
      return best.corpCode;
    }
  }

  if (KNOWN_CORP_CODES[companyName]) {
    console.log(`[DART] Fallback to known code: "${companyName}" → ${KNOWN_CORP_CODES[companyName]}`);
    return KNOWN_CORP_CODES[companyName];
  }

  console.log(`[DART] No match found for "${companyName}"`);
  return null;
}

async function fetchDartCompanyInfo(corpCode, searchQuery) {
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

    if (searchQuery) {
      const returnedName = normalizeCompanyName(data.corp_name || '');
      const queryName = normalizeCompanyName(searchQuery);
      if (!returnedName.includes(queryName) && !queryName.includes(returnedName)) {
        console.error(`[DART] MISMATCH: searched "${searchQuery}" but got "${data.corp_name}" — rejecting result`);
        return null;
      }
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
    const isBizNoSearch = isBusinessNumber(company);
    const job = {
      id: jobId,
      company,
      isBizNoSearch,
      status: 'processing',
      progress: 0,
      currentStep: '분석 준비 중...',
      startTime: Date.now(),
      steps: [
        { name: '기본 정보 수집', status: 'pending' },
        { name: '사업자 등록정보 확인', status: 'pending' },
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
    let bizNoForLookup = null;

    if (job.isBizNoSearch) {
      console.log(`[Search] Business number detected: ${job.company}`);
      bizNoForLookup = job.company.replace(/[-\s]/g, '');
    } else {
      const corpCode = await searchCorpCode(job.company);
      if (corpCode) {
        console.log(`[DART] Found corp_code for "${job.company}": ${corpCode}`);
        dartInfo = await fetchDartCompanyInfo(corpCode, job.company);
        if (dartInfo) {
          console.log(`[DART] Company info loaded: ${dartInfo.name} (${dartInfo.ceo})`);
          if (dartInfo.bizNo) bizNoForLookup = dartInfo.bizNo;
        }
      } else {
        console.log(`[DART] Corp code not found for "${job.company}", using fallback`);
      }
    }

    job.steps[0].status = 'completed';
    job.progress = 15;

    job.currentStep = '국세청 사업자 등록정보 확인 중...';
    job.steps[1].status = 'processing';
    let bizStatus = null;
    if (bizNoForLookup) {
      bizStatus = await fetchBusinessStatus(bizNoForLookup);
    }
    job.steps[1].status = 'completed';
    job.progress = 25;

    const companyNameForSearch = dartInfo?.name || (job.isBizNoSearch ? null : job.company);

    job.currentStep = '뉴스 및 미디어 분석 중...';
    job.steps[2].status = 'processing';
    let newsItems = null;
    let newsError = null;
    if (companyNameForSearch) {
      newsItems = await collectNews(companyNameForSearch);
      if (!newsItems) {
        newsError = '뉴스 데이터를 가져올 수 없습니다. (News API 연결 실패 또는 관련 뉴스 없음)';
        console.log(`[News] No news available for "${companyNameForSearch}"`);
      }
    } else {
      newsError = '기업명을 확인할 수 없어 뉴스를 검색하지 못했습니다.';
    }
    job.steps[2].status = 'completed';
    job.progress = 50;

    job.currentStep = 'GPT-4o 종합 분석 중...';
    job.steps[3].status = 'processing';

    let aiAnalysis = null;
    let aiError = null;
    try {
      aiAnalysis = await analyzeWithGPT4o(companyNameForSearch || job.company, dartInfo, newsItems || []);
    } catch (aiErr) {
      aiError = `AI 분석에 실패했습니다: ${aiErr.message}`;
      console.error('[GPT-4o] Analysis failed:', aiErr.message);
    }

    job.steps[3].status = 'completed';
    job.progress = 80;

    job.currentStep = '리포트 생성 중...';
    job.steps[4].status = 'processing';

    const corpClassMap = { 'Y': '유가증권시장 (KOSPI)', 'K': '코스닥 (KOSDAQ)', 'N': '코넥스 (KONEX)', 'E': '기타' };
    const useAi = aiAnalysis && aiAnalysis.swot && aiAnalysis.insights && aiAnalysis.summary;

    let basicInfo;
    if (dartInfo) {
      basicInfo = {
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
      };
    } else if (job.isBizNoSearch && bizStatus) {
      basicInfo = {
        name: `사업자번호 ${bizStatus.bizNo.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3')}`,
        industry: bizStatus.taxType || '정보 없음',
        bizNo: bizStatus.bizNo,
        headquarters: '정보 없음 (사업자번호 조회)',
        dataSource: bizStatus.dataSource,
      };
    } else {
      basicInfo = {
        name: job.company,
        industry: '정보 조회 중',
        headquarters: '정보 없음',
        dataSource: 'AI 분석 기반',
      };
    }

    if (bizStatus) {
      basicInfo.bizStatus = bizStatus.status;
      basicInfo.bizStatusCode = bizStatus.statusCode;
      basicInfo.taxType = bizStatus.taxType;
      basicInfo.bizEndDate = bizStatus.endDate;
      basicInfo.bizDataSource = bizStatus.dataSource;
    }

    job.steps[4].status = 'completed';
    job.progress = 100;

    job.status = 'completed';
    job.currentStep = '분석 완료!';
    job.result = {
      basicInfo,
      summary: useAi ? aiAnalysis.summary : null,
      swot: useAi ? aiAnalysis.swot : null,
      news: newsItems || null,
      insights: useAi ? aiAnalysis.insights : null,
      aiPowered: !!useAi,
      aiError: aiError || null,
      newsError: newsError || null,
      generatedAt: new Date().toISOString(),
      analysisTime: Math.floor((Date.now() - job.startTime) / 1000),
    };

    console.log(`분석 완료: ${job.company} (${job.result.analysisTime}초, AI: ${!!useAi})`);
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    job.currentStep = '분석 실패';
    console.error(`분석 실패: ${job.company}`, error.message);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default router;
