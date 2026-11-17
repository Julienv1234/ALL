'use client';
import Icon from '@/components/Icon';
import PageHeader from '@/components/Page';
import { useT } from '@/lib/i18n';
import { actions, useAll } from '@/lib/store';

export default function LogPage() {
  const s = useAll();
  const { t, locale } = useT();
  return (
    <main className="main">
      <PageHeader title={t('log.title')} sub={t('log.sub')} />
      <section className="glass panel" aria-label={t('log.title')}>
        <div className="divide">
          {s.log.length === 0 && <p className="muted" style={{ margin: 0 }}>{t('log.none')}</p>}
          {s.log.map((e) => (
            <div key={e.id} className="list-item" style={{ flexWrap: 'wrap' }}>
              <time dateTime={e.at} className="faint" style={{ flex: '0 0 130px', fontVariantNumeric: 'tabular-nums' }}>
                {new Date(e.at).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </time>
              <span style={{ flex: '1 1 220px', minWidth: 0, overflowWrap: 'anywhere', color: e.undone ? 'var(--ink-3)' : undefined, textDecoration: e.undone ? 'line-through' : undefined }}>{e.text}</span>
              {e.undone ? <span className="chip">{t('log.undone')}</span>
                : e.undo ? <button type="button" className="btn small" onClick={() => actions.undo(e.id)}><Icon name="undo" size={16} />{t('common.undo')}</button>
                : null}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
