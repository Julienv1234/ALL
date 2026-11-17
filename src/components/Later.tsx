'use client';
import PageHeader from './Page';
import { useT, type Key } from '@/lib/i18n';

/** Honest placeholder screen for parts of ALL that arrive in a later phase. */
export default function Later({ title, sub, items }: { title: Key; sub: Key; items: { img: string; name: string; phase: number; text: string }[] }) {
  const { t } = useT();
  return (
    <main className="main">
      <PageHeader title={t(title)} sub={t(sub)} />
      <section className="glass panel" aria-label={t('later.title')}>
        <h2 className="h2">{t('later.title')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 12 }}>
          {items.map((it) => (
            <div key={it.name} className="row" style={{ alignItems: 'flex-start', gap: 14, padding: 12, border: '1px solid var(--line)', borderRadius: 12 }}>
              <img className="px" src={`/img/stad-${it.img}.png`} alt="" width={84} height={80} style={{ objectFit: 'contain', opacity: 0.75, flex: '0 0 auto' }} />
              <div style={{ minWidth: 0 }}>
                <div className="pixel" style={{ fontSize: 17 }}>{it.name}</div>
                <div className="ok" style={{ fontSize: 13 }}>{t('later.phase')} {it.phase}</div>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>{it.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
