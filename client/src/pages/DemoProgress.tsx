import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { useLanguage } from '@/lib/language-provider';
import { LanguageSwitcher } from '@/components/language-switcher';

const DemoProgress = () => {
  const [match, params] = useRoute('/demo/progress/:jobId');
  const [status, setStatus] = useState<any>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!params?.jobId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/demo/analysis-status/${params.jobId}`);
        const data = await response.json();
        setStatus(data);

        if (data.status === 'completed') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Status fetch error:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [params?.jobId]);

  if (!match) return <div style={{ padding: '40px', textAlign: 'center' }}>{t("demo.progress.invalidAccess")}</div>;

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <LanguageSwitcher />
      </div>
      <h1>{t("demo.progress.title")}</h1>
      {status && (
        <div>
          <h2>{t("demo.progress.progress")}: {status.progress}%</h2>
          <p>{t("demo.progress.currentStep")}: {status.current_step}</p>
          <p>{t("demo.progress.elapsedTime")}: {status.elapsed_time}{t("demo.progress.seconds")}</p>
          {status.status === 'completed' && (
            <p style={{ color: 'green', fontWeight: 'bold', marginTop: '16px' }}>
              {t("demo.progress.complete")}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default DemoProgress;
