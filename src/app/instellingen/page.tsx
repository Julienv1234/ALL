'use client';
import { useRef } from 'react';
import Account from '@/components/Account';
import Icon from '@/components/Icon';
import PageHeader from '@/components/Page';
import { cloudConfigured } from '@/lib/cloud-config';
import { isoDay } from '@/lib/core';
import { useT } from '@/lib/i18n';
import { actions, hasSaveError, useAll } from '@/lib/store';
import { toast } from '@/lib/toast';

export default function SettingsPage() {
  const s = useAll();
  const { t } = useT();
  const file = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([actions.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-backup-${isoDay()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <main id="inhoud" tabIndex={-1} className="main">
      <PageHeader title={t('set.title')} sub={t('set.sub')} />
      {hasSaveError() && <div className="glass panel" role="alert" style={{ borderColor: 'var(--accent)' }}>{t('set.saveError')}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 20, alignItems: 'start' }}>
        <Account />

        <section className="glass panel" aria-labelledby="pref-h">
          <h2 id="pref-h" className="h2">{t('set.title')}</h2>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="faint" style={{ marginBottom: 6 }}>{t('set.lang')}</legend>
            <div className="glass seg">
              <button type="button" className="btn" aria-pressed={s.settings.lang === 'nl'} onClick={() => actions.setSettings({ lang: 'nl' })}>Nederlands</button>
              <button type="button" className="btn" aria-pressed={s.settings.lang === 'en'} onClick={() => actions.setSettings({ lang: 'en' })}>English</button>
            </div>
          </fieldset>
          <label className="field">{t('set.name')}
            <input className="input" value={s.settings.name} placeholder={t('set.name.ph')} maxLength={60} onChange={(e) => actions.setSettings({ name: e.target.value })} />
          </label>
        </section>

        <section className="glass panel" aria-labelledby="data-h">
          <h2 id="data-h" className="h2">{t('set.data')}</h2>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>{cloudConfigured ? t('set.data.cloud') : t('set.data.text')}</p>
          <div className="wrap">
            <button type="button" className="btn cta" onClick={download}><Icon name="download" />{t('set.export')}</button>
            <button type="button" className="btn" onClick={() => file.current?.click()}><Icon name="upload" />{t('set.import')}</button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              if (!window.confirm(t('set.import.confirm'))) return;
              toast(actions.importJson(await f.text()) ? t('set.import.ok') : t('set.import.bad'));
            }} />
          </div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <button type="button" className="btn danger" onClick={() => { if (window.confirm(cloudConfigured ? t('set.wipe.cloud') : t('set.wipe.confirm'))) { actions.wipe(); toast(t('set.wipe.done')); } }}>
              <Icon name="trash" />{t('set.wipe')}
            </button>
          </div>
        </section>

        <section className="glass panel" aria-labelledby="about-h">
          <h2 id="about-h" className="h2">{t('set.about')}</h2>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('set.about.text')}</p>
          <p className="faint" style={{ margin: 0 }}>v0.4.0</p>
        </section>
      </div>
    </main>
  );
}
