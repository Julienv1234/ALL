'use client';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { askPerm, notify, perm, type Perm } from '@/lib/notify';
import { actions, useAll } from '@/lib/store';

export default function RemindSettings() {
  const s = useAll();
  const { t } = useT();
  const r = s.settings.remind;
  const [p, setP] = useState<Perm>('default');
  useEffect(() => { setP(perm()); }, []);
  const set = (patch: Partial<typeof r>) => actions.setSettings({ remind: { ...r, ...patch } });

  const turnOn = async () => {
    const got = await askPerm();
    setP(got);
    if (got === 'granted') {
      set({ on: true });
      notify(t('remind.okTitle'), t('remind.okBody'), 'remind-on');
    }
  };

  const on = r.on && p === 'granted';
  return (
    <section className="glass panel" aria-labelledby="remind-h">
      <h2 id="remind-h" className="h2">{t('remind.title')}</h2>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('remind.sub')}</p>
      {p === 'unsupported' && <p role="status" style={{ margin: 0 }}>{t('remind.unsupported')}</p>}
      {p === 'denied' && <p role="status" style={{ margin: 0 }}>{t('remind.denied')}</p>}
      {p !== 'unsupported' && (
        <button type="button" className="btn toggle" aria-pressed={on} style={{ alignSelf: 'flex-start' }}
          onClick={() => (on ? set({ on: false }) : turnOn())}>{t('remind.switch')}</button>
      )}
      {on && (
        <>
          <label className="field" style={{ maxWidth: 280 }}>{t('remind.before')}
            <select className="input" value={r.before} onChange={(e) => set({ before: Number(e.target.value) })}>
              <option value={0}>{t('remind.atStart')}</option>
              {[5, 10, 15, 30, 60].map((n) => <option key={n} value={n}>{n} {t('learn.min')}</option>)}
            </select>
          </label>
          <label className="row" style={{ gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
            <input type="checkbox" checked={r.tasks} onChange={(e) => set({ tasks: e.target.checked })} style={{ marginTop: 3, width: 18, height: 18, accentColor: 'var(--accent)' }} />
            <span>{t('remind.tasks')}</span>
          </label>
          <button type="button" className="btn small" style={{ alignSelf: 'flex-start' }}
            onClick={() => notify(t('remind.testTitle'), t('remind.testBody'), 'remind-test-' + Date.now())}>{t('remind.test')}</button>
        </>
      )}
      <p className="faint" style={{ margin: 0 }}>{t('remind.note')}</p>
    </section>
  );
}
