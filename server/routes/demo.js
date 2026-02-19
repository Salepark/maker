// server/routes/demo.js - 5분 데모 워크플로 API 엔드포인트

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// 임시 저장소 (실제 구현시 데이터베이스 사용)
const analysisJobs = new Map();

// 뉴스 수집을 위한 더미 함수 (실제로는 News API 사용)
async function collectNews(companyName) {
  // 실제 구현시 News API 호출
  return {
    articles: [
      {
        title: `${companyName} 4분기 실적 예상치 상회`,
        description: `${companyName}의 4분기 실적이 시장 예상치를 크게 상회했다고 발표했습니다.`,
        sentiment: { label: '긍정', score: 0.8 },
        publishedAt: '2026-02-19T10:00:00Z'
      },
      {
        title: `${companyName} 신제품 출시 발표`,
        description: `${companyName}이 혁신적인 신제품 라인업을 공개했습니다.`,
        sentiment: { label: '중립', score: 0.1 },
        publishedAt: '2026-02-18T15:30:00Z'
      },
      {
        title: `${companyName} 주가 변동성 우려`,
        description: `시장 전문가들이 ${companyName} 주가의 높은 변동성에 대해 우려를 표명했습니다.`,
        sentiment: { label: '부정', score: -0.6 },
        publishedAt: '2026-02-17T09:15:00Z'
      }
    ]
  };
}

// 기본 정보 수집 더미 함수
async function collectBasicInfo(companyName) {
  const companyData = {
    'Tesla': {
      name: 'Tesla, Inc.',
      industry: '전기차 및 에너지',
      founded: '2003년',
      ceo: 'Elon Musk',
      employees: '127,855명',
      revenue: '$96.8B (2023)',
      description: '전기차, 에너지 저장 시스템, 태양광 패널을 제조하는 글로벌 기업'
    },
    'Apple': {
      name: 'Apple Inc.',
      industry: '소비자 전자제품',
      founded: '1976년',
      ceo: 'Tim Cook', 
      employees: '164,000명',
      revenue: '$394.3B (2023)',
      description: '아이폰, 맥, 아이패드 등을 제조하는 세계 최대 기술 기업'
    }
  };

  return companyData[companyName] || {
    name: companyName,
    industry: '정보 수집 중',
    founded: '정보 수집 중',
    ceo: '정보 수집 중',
    employees: '정보 수집 중',
    revenue: '정보 수집 중',
    description: `${companyName}에 대한 기본 정보를 수집하고 있습니다.`
  };
}

// AI 분석 더미 함수 (실제로는 OpenAI/Claude API 사용)
async function performAIAnalysis(companyName, basicInfo, newsData) {
  // 실제 구현시 AI API 호출
  return {
    summary: `${companyName}은 ${basicInfo.industry} 분야의 선도적인 기업으로, 혁신적인 제품과 강력한 브랜드 파워를 보유하고 있습니다. 최근 실적 개선과 함께 새로운 성장 동력을 확보하고 있는 상황입니다.`,

    swot: {
      strengths: [
        '강력한 브랜드 인지도와 고객 충성도',
        '혁신적인 기술과 제품 개발 역량',
        '글로벌 시장에서의 시장 점유율'
      ],
      weaknesses: [
        '높은 제품 가격으로 인한 시장 접근성 제한',
        '생산 역량의 한계와 공급망 리스크',
        '특정 시장에 대한 높은 의존도'
      ],
      opportunities: [
        '신흥 시장에서의 성장 기회',
        '새로운 기술 영역으로의 사업 확장',
        '지속가능성 트렌드에 부합하는 제품 라인'
      ],
      threats: [
        '치열한 경쟁사들의 시장 진입',
        '규제 환경 변화와 정책적 리스크',
        '원자재 가격 상승과 인플레이션 압력'
      ]
    },

    insights: [
      `${companyName}의 핵심 경쟁우위는 기술 혁신과 브랜드 파워에 있습니다`,
      '최근 뉴스 동향을 보면 실적 개선에 대한 긍정적 신호가 감지됩니다',
      '지속가능성과 ESG 경영이 향후 성장의 핵심 요소가 될 것입니다',
      '공급망 다각화와 생산 효율성 개선이 시급한 과제입니다',
      '신흥 시장 진출과 제품 포트폴리오 확대가 중요한 기회입니다'
    ]
  };
}

// 1. 분석 시작 API
router.post('/quick-analysis', async (req, res) => {
  try {
    const { company, email } = req.body;

    if (!company) {
      return res.status(400).json({
        success: false,
        error: '회사명을 입력해주세요.'
      });
    }

    const jobId = uuidv4();
    const job = {
      id: jobId,
      company: company,
      email: email || null,
      status: 'processing',
      progress: 0,
      currentStep: '분석 준비 중...',
      startTime: Date.now(),
      steps: [
        { name: '기본 정보 수집', status: 'pending', duration: 30 },
        { name: '뉴스 및 미디어 분석', status: 'pending', duration: 60 },
        { name: 'AI 종합 분석', status: 'pending', duration: 120 },
        { name: '리포트 생성', status: 'pending', duration: 90 }
      ],
      result: null
    };

    // 임시 저장
    analysisJobs.set(jobId, job);

    // 백그라운드에서 분석 시작
    processAnalysis(jobId);

    res.json({
      success: true,
      job_id: jobId,
      status: 'processing',
      estimated_time: 300,
      progress_url: `/api/demo/analysis-status/${jobId}`
    });

  } catch (error) {
    console.error('분석 시작 오류:', error);
    res.status(500).json({
      success: false,
      error: '분석을 시작할 수 없습니다.'
    });
  }
});

// 2. 분석 상태 확인 API
router.get('/analysis-status/:jobId', (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = analysisJobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: '분석 작업을 찾을 수 없습니다.'
      });
    }

    const response = {
      job_id: jobId,
      status: job.status,
      progress: job.progress,
      current_step: job.currentStep,
      elapsed_time: Math.floor((Date.now() - job.startTime) / 1000),
      steps: job.steps
    };

    // 완료된 경우 결과 포함
    if (job.status === 'completed' && job.result) {
      response.result = {
        report_url: `/demo/report/${jobId}`,
        preview_data: job.result
      };
    }

    // 실패한 경우 에러 메시지 포함
    if (job.status === 'failed') {
      response.error = job.error || '분석 중 오류가 발생했습니다.';
    }

    res.json(response);

  } catch (error) {
    console.error('상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      error: '상태를 확인할 수 없습니다.'
    });
  }
});

// 3. 분석 결과 조회 API
router.get('/analysis-result/:jobId', (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = analysisJobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: '분석 결과를 찾을 수 없습니다.'
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: '분석이 아직 완료되지 않았습니다.'
      });
    }

    res.json({
      success: true,
      job_id: jobId,
      company: job.company,
      analysis_time: Math.floor((Date.now() - job.startTime) / 1000),
      result: job.result
    });

  } catch (error) {
    console.error('결과 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '결과를 조회할 수 없습니다.'
    });
  }
});

// 백그라운드 분석 프로세스
async function processAnalysis(jobId) {
  const job = analysisJobs.get(jobId);
  if (!job) return;

  try {
    // Step 1: 기본 정보 수집 (30초)
    job.currentStep = '기본 정보 수집 중...';
    job.steps[0].status = 'processing';
    job.progress = 5;
    analysisJobs.set(jobId, job);

    await new Promise(resolve => setTimeout(resolve, 2000)); // 시연용 대기

    const basicInfo = await collectBasicInfo(job.company);
    job.steps[0].status = 'completed';
    job.progress = 25;
    analysisJobs.set(jobId, job);

    // Step 2: 뉴스 분석 (60초)
    job.currentStep = '뉴스 및 미디어 분석 중...';
    job.steps[1].status = 'processing';
    analysisJobs.set(jobId, job);

    await new Promise(resolve => setTimeout(resolve, 3000)); // 시연용 대기

    const newsData = await collectNews(job.company);
    job.steps[1].status = 'completed';
    job.progress = 50;
    analysisJobs.set(jobId, job);

    // Step 3: AI 분석 (120초)
    job.currentStep = 'AI 종합 분석 중...';
        job.steps[2].status = 'processing';
        analysisJobs.set(jobId, job);

        await new Promise(resolve => setTimeout(resolve, 4000)); // 시연용 대기

        const analysis = await performAIAnalysis(job.company, basicInfo, newsData);
        job.steps[2].status = 'completed';
        job.progress = 80;
        analysisJobs.set(jobId, job);

        // Step 4: 리포트 생성 (90초)
        job.currentStep = '리포트 생성 중...';
        job.steps[3].status = 'processing';
        analysisJobs.set(jobId, job);

        await new Promise(resolve => setTimeout(resolve, 2000)); // 시연용 대기

        // 최종 결과 조합
        const finalResult = {
          basicInfo,
          newsData,
          analysis,
          generatedAt: new Date().toISOString(),
          analysisTime: Math.floor((Date.now() - job.startTime) / 1000)
        };

        // 완료 처리
        job.status = 'completed';
        job.progress = 100;
        job.currentStep = '분석 완료!';
        job.steps[3].status = 'completed';
        job.result = finalResult;
        job.completedAt = Date.now();

        analysisJobs.set(jobId, job);

        console.log(`✅ 분석 완료: ${job.company} (${finalResult.analysisTime}초)`);

      } catch (error) {
        console.error('분석 프로세스 오류:', error);
        job.status = 'failed';
        job.error = error.message;
        job.currentStep = '분석 실패';
        analysisJobs.set(jobId, job);
      }
    }

    // 4. 테스트용 더미 데이터 생성 API (개발 중에만 사용)
    router.post('/create-test-analysis', (req, res) => {
      const jobId = uuidv4();
      const job = {
        id: jobId,
        company: 'Tesla',
        status: 'completed',
        progress: 100,
        currentStep: '분석 완료!',
        startTime: Date.now() - 263000, // 4분 23초 전
        completedAt: Date.now(),
        steps: [
          { name: '기본 정보 수집', status: 'completed', duration: 30 },
          { name: '뉴스 및 미디어 분석', status: 'completed', duration: 60 },
          { name: 'AI 종합 분석', status: 'completed', duration: 120 },
          { name: '리포트 생성', status: 'completed', duration: 90 }
        ],
        result: {
          basicInfo: {
            name: 'Tesla, Inc.',
            industry: '전기차 및 에너지',
            founded: '2003년',
            ceo: 'Elon Musk',
            employees: '127,855명',
            revenue: '$96.8B (2023)',
            description: '전기차, 에너지 저장 시스템, 태양광 패널을 제조하는 글로벌 기업'
          },
          newsData: {
            articles: [
              {
                title: 'Tesla 4분기 실적 예상치 상회',
                description: '테슬라의 4분기 실적이 시장 예상치를 크게 상회했다고 발표했습니다.',
                sentiment: { label: '긍정', score: 0.8 },
                publishedAt: '2026-02-19T10:00:00Z'
              }
            ]
          },
          analysis: {
            summary: 'Tesla는 전기차 및 에너지 분야의 선도적인 기업입니다.',
            swot: {
              strengths: ['혁신적 기술', '강력한 브랜드', '글로벌 시장 점유율'],
              weaknesses: ['높은 가격', '생산 한계', '시장 의존도'],
              opportunities: ['신흥시장', '사업확장', '지속가능성'],
              threats: ['경쟁심화', '규제변화', '원자재 상승']
            },
            insights: [
              'Tesla의 핵심 경쟁우위는 기술 혁신과 브랜드 파워에 있습니다',
              '최근 뉴스 동향을 보면 실적 개선에 대한 긍정적 신호가 감지됩니다',
              '지속가능성과 ESG 경영이 향후 성장의 핵심 요소가 될 것입니다'
            ]
          },
          generatedAt: new Date().toISOString(),
          analysisTime: 263
        }
      };

      analysisJobs.set(jobId, job);

      res.json({
        success: true,
        job_id: jobId,
        message: '테스트 분석 데이터가 생성되었습니다.',
        preview_url: `/demo/progress/${jobId}`
      });
    });

    module.exports = router;
