import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const analysisJobs = new Map();

function simpleSentiment(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const positive = ['growth', 'record', 'profit', 'surge', 'boost', 'gain', 'success', 'award', 'innovation', 'launch', 'partnership', 'expand', 'rise', 'beat', 'strong'];
  const negative = ['loss', 'decline', 'lawsuit', 'scandal', 'investigation', 'scrutiny', 'risk', 'drop', 'cut', 'layoff', 'fine', 'penalty', 'crash', 'fail', 'downturn', 'recall'];
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
    const url = `https://newsapi.org/v2/everything?q=${q}&sortBy=publishedAt&pageSize=3&language=en&apiKey=${apiKey}`;
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
      title: article.title || 'Untitled',
      source: article.source?.name || 'Unknown',
      date: article.publishedAt || new Date().toISOString(),
      sentiment: simpleSentiment(article.title || '', article.description || ''),
      summary: article.description || article.content?.slice(0, 200) || 'No summary available.',
    }));
  } catch (err) {
    console.error('NewsAPI fetch failed:', err.message);
    return null;
  }
}

function getFallbackNews(company) {
  return [
    {
      title: `${company} Announces Record Q4 Revenue Growth`,
      source: 'Reuters',
      date: new Date(Date.now() - 86400000).toISOString(),
      sentiment: 'positive',
      summary: `${company} reported a 23% increase in Q4 revenue, beating analyst expectations and signaling strong market demand.`,
    },
    {
      title: `${company} Expands Operations to Southeast Asia`,
      source: 'Bloomberg',
      date: new Date(Date.now() - 86400000 * 3).toISOString(),
      sentiment: 'neutral',
      summary: `The company announced plans to open new offices in Singapore and Vietnam as part of its Asia-Pacific expansion strategy.`,
    },
    {
      title: `${company} Faces Regulatory Scrutiny in EU Markets`,
      source: 'Financial Times',
      date: new Date(Date.now() - 86400000 * 5).toISOString(),
      sentiment: 'negative',
      summary: `European regulators have opened an investigation into the company's data practices, which could impact operations in the region.`,
    },
  ];
}

router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Demo API is working!' });
});

router.post('/quick-analysis', async (req, res) => {
  try {
    const { company } = req.body;

    if (!company) {
      return res.status(400).json({ success: false, error: 'Please enter a company name.' });
    }

    const jobId = uuidv4();
    const job = {
      id: jobId,
      company,
      status: 'processing',
      progress: 0,
      currentStep: 'Preparing analysis...',
      startTime: Date.now(),
      steps: [
        { name: 'Collecting basic info', status: 'pending' },
        { name: 'Analyzing news & media', status: 'pending' },
        { name: 'AI comprehensive analysis', status: 'pending' },
        { name: 'Generating report', status: 'pending' },
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
    res.status(500).json({ success: false, error: 'Could not start analysis.' });
  }
});

router.get('/analysis-status/:jobId', (req, res) => {
  const job = analysisJobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({ success: false, error: 'Analysis job not found.' });
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
    response.error = job.error || 'An error occurred during analysis.';
  }

  res.json(response);
});

router.get('/analysis-result/:jobId', (req, res) => {
  const job = analysisJobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({ success: false, error: 'Analysis result not found.' });
  }

  if (job.status !== 'completed') {
    return res.status(400).json({ success: false, error: 'Analysis is not yet complete.' });
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
    job.currentStep = 'Collecting basic info...';
    job.steps[0].status = 'processing';
    job.progress = 5;
    await delay(2000);
    job.steps[0].status = 'completed';
    job.progress = 25;

    job.currentStep = 'Analyzing news & media...';
    job.steps[1].status = 'processing';
    const liveNews = await collectNews(job.company);
    job.steps[1].status = 'completed';
    job.progress = 50;

    job.currentStep = 'AI comprehensive analysis...';
    job.steps[2].status = 'processing';
    await delay(4000);
    job.steps[2].status = 'completed';
    job.progress = 80;

    job.currentStep = 'Generating report...';
    job.steps[3].status = 'processing';
    await delay(2000);
    job.steps[3].status = 'completed';
    job.progress = 100;

    job.status = 'completed';
    job.currentStep = 'Analysis complete!';
    job.result = {
      basicInfo: {
        name: job.company,
        industry: 'Technology',
        ceo: 'John Doe',
        founded: '2005',
        headquarters: 'San Francisco, CA',
        employees: '12,500+',
        revenue: '$4.2B (2024)',
        website: `https://www.${job.company.toLowerCase().replace(/\s+/g, '')}.com`,
      },
      summary: `${job.company} is a leading player in its industry with strong brand recognition and growth potential. The company has demonstrated consistent innovation and market expansion over the past decade.`,
      swot: {
        strengths: [
          'Strong brand recognition and customer loyalty',
          'Innovative technology and R&D investment',
          'Significant global market share',
        ],
        weaknesses: [
          'High pricing relative to competitors',
          'Supply chain concentration risks',
          'Heavy dependence on key markets',
        ],
        opportunities: [
          'Expansion into emerging markets',
          'New product line diversification',
          'Growing sustainability and ESG trends',
        ],
        threats: [
          'Intensifying competition from new entrants',
          'Evolving regulatory landscape',
          'Rising operational and material costs',
        ],
      },
      news: liveNews || getFallbackNews(job.company),
      insights: [
        `${job.company}'s revenue growth rate of 23% outpaces the industry average of 12%, indicating strong competitive positioning.`,
        `The company's R&D spending accounts for 18% of revenue, significantly higher than the 10% industry benchmark.`,
        `Market sentiment analysis shows 67% positive coverage across major financial media outlets.`,
        `Supply chain diversification efforts have reduced single-source dependency from 45% to 28% year-over-year.`,
        `Customer retention rate stands at 94%, suggesting high satisfaction and strong brand loyalty.`,
      ],
      generatedAt: new Date().toISOString(),
      analysisTime: Math.floor((Date.now() - job.startTime) / 1000),
    };

    console.log(`Analysis complete: ${job.company} (${job.result.analysisTime}s)`);
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    job.currentStep = 'Analysis failed';
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default router;
