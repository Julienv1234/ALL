'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/lib/i18n';
import Icon from './Icon';

/** Search for now; becomes "ask the assistant" in phase 2. */
export default function AskBox() {
  const { t } = useT();
  const router = useRouter();
  const [q, setQ] = useState('');
  return (
    <form
      role="search"
      className="glass"
      style={{ height: 46, display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 0 14px', borderRadius: 14 }}
      onSubmit={(e) => { e.preventDefault(); router.push('/zoeken/?q=' + encodeURIComponent(q.trim())); }}
    >
      <label htmlFor="ask" className="muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{t('ask.label')}</label>
      <input id="ask" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ask.placeholder')}
        style={{ width: 150, minWidth: 0, height: 36, border: 0, background: 'transparent', fontSize: 14, outline: 'none' }} />
      <button type="submit" className="btn ghost icon small" style={{ width: 36 }} aria-label={t('common.search')}><Icon name="search" size={16} /></button>
    </form>
  );
}
