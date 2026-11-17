'use client';
import dynamic from 'next/dynamic';
import { cloudConfigured } from '@/lib/cloud-config';
import { useT } from '@/lib/i18n';

const Connected = dynamic(() => import('./AccountConnected'), { ssr: false });

export default function Account() {
  const { t } = useT();
  if (cloudConfigured) return <Connected />;
  return (
    <section className="glass panel" aria-labelledby="acct-h">
      <h2 id="acct-h" className="h2">{t('acct.title')}</h2>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('acct.local')}</p>
    </section>
  );
}
