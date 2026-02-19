import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';

const DemoProgress = () => {
  const [match, params] = useRoute('/demo/progress/:jobId');
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (!params?.jobId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/demo/analysis-status/${params.jobId}`);
        const data = await response.json();
        setStatus(data);

        if (data.status === 'completed') {
          clearInterval(interval);
          alert('Analysis complete!');
        }
      } catch (error) {
        console.error('Status fetch error:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [params?.jobId]);

  if (!match) return <div>Invalid access.</div>;

  return (
    <div style={{padding: '40px', textAlign: 'center'}}>
      <h1>Analyzing...</h1>
      {status && (
        <div>
          <h2>Progress: {status.progress}%</h2>
          <p>Current step: {status.current_step}</p>
          <p>Elapsed time: {status.elapsed_time}s</p>
        </div>
      )}
    </div>
  );
};

export default DemoProgress;
