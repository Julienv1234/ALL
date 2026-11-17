'use client';
import { makeBriefing } from '@/lib/briefing';
import { isoDay } from '@/lib/core';
import { useT } from '@/lib/i18n';
import { useAll } from '@/lib/store';

export default function BriefingCard() {
  const s = useAll();
  const { t, lang } = useT();
  const b = makeBriefing(s, isoDay(), lang);
  return (
    <section className="glass panel" aria-labelledby="brief-h">
      <div className="row" style={{ gap: 12 }}>
        <img className="px" src="/img/stad-briefing.png" alt="" width={56} height={64} style={{ objectFit: 'contain', flex: '0 0 auto' }} />
        <div>
          <h2 id="brief-h" className="h2">{t('brief.title')}</h2>
          <div className="faint">{t('brief.how')}</div>
        </div>
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
        {b.lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
      {b.sources.length > 0 && <div className="faint">{t('brief.sources')}: {b.sources.join(', ')}</div>}
    </section>
  );
}
