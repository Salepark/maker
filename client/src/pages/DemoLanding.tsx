import { useState } from 'react';
import { useLocation } from 'wouter';

const DemoLanding: React.FC = () => {
  const [companyInput, setCompanyInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleAnalysis = async () => {
    if (!companyInput.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/demo/quick-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: companyInput.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        navigate(`/demo/progress/${data.job_id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{padding: '40px', textAlign: 'center'}}>
      <h1>AI가 5분만에 당신의 경쟁사를 분석합니다</h1>
      <div style={{margin: '40px 0'}}>
        <input
          type="text"
          value={companyInput}
          onChange={(e) => setCompanyInput(e.target.value)}
          placeholder="예: Tesla, Apple, Netflix"
          style={{padding: '12px', marginRight: '12px', width: '300px'}}
          data-testid="input-company"
        />
        <button
          onClick={handleAnalysis}
          disabled={isLoading}
          style={{padding: '12px 24px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px'}}
          data-testid="button-analyze"
        >
          {isLoading ? '분석 중...' : '무료로 분석하기'}
        </button>
      </div>
      <p>완전 무료 체험 | 가입 불필요 | 5분 내 완료</p>
    </div>
  );
};

export default DemoLanding;
