'use client';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import PageHeader from '@/components/Page';
import { useT } from '@/lib/i18n';
import { safeUrl, siteFileName, siteHtml } from '@/lib/site';
import { actions, lastLogId, useAll } from '@/lib/store';
import { toast } from '@/lib/toast';
import type { Site, SiteTemplate } from '@/lib/types';

const TEMPLATES: SiteTemplate[] = ['neon', 'licht', 'krant'];
const SWATCHES = ['#FF4D6D', '#3DF5E6', '#FFB86B', '#B66BFF', '#2F6FEB', '#D7263D', '#1F8A5B'];

function download(site: Site, lang: 'nl' | 'en') {
  const blob = new Blob([siteHtml(site, lang)], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = siteFileName(site);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function TemplatePicker({ value, onChange, name }: { value: SiteTemplate; onChange: (v: SiteTemplate) => void; name: string }) {
  const { t } = useT();
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="faint" style={{ marginBottom: 6 }}>{t('site.template')}</legend>
      <div className="tpl-grid">
        {TEMPLATES.map((tp) => (
          <label key={tp} className={'tpl' + (value === tp ? ' on' : '')}>
            <input type="radio" name={name} value={tp} checked={value === tp} onChange={() => onChange(tp)} className="sr-only" />
            <span className={'tpl-thumb tpl-' + tp} aria-hidden="true"><i /><b /><b /><em /></span>
            <span className="tpl-name">{t(`site.t.${tp}` as never)}</span>
            <span className="faint">{t(`site.t.${tp}.x` as never)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Editor({ site, onClose }: { site: Site; onClose: () => void }) {
  const { t, lang } = useT();
  const [d, setD] = useState<Site>(site);
  const [view, setView] = useState<'pc' | 'phone'>('pc');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  useEffect(() => { setD(site); }, [site.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify({ ...d, updatedAt: '' }) !== JSON.stringify({ ...site, updatedAt: '' });
  const set = (p: Partial<Site>) => setD((x) => ({ ...x, ...p }));
  const html = useMemo(() => siteHtml(d, lang), [d, lang]);
  const badLinks = d.links.filter((l) => l.url.trim() && !safeUrl(l.url));

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const save = () => { actions.updateSite(d); toast(t('site.saved'), lastLogId()); };
  const moveSection = (i: number, dir: -1 | 1) => {
    const s = [...d.sections];
    const j = i + dir;
    if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]];
    set({ sections: s });
  };

  return (
    <section className="glass panel" aria-labelledby="ed-h">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <h2 id="ed-h" className="h2" style={{ margin: 0 }}>{d.name || t('site.untitled')}</h2>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className="faint" role="status">{dirty ? t('site.unsaved') : t('site.allSaved')}</span>
          <button type="button" className="btn" onClick={save} disabled={!dirty}>{t('common.save')}</button>
          <button type="button" className="btn cta" onClick={() => { if (dirty) actions.updateSite(d); download(d, lang); toast(t('site.downloaded')); }}><Icon name="download" />{t('site.download')}</button>
          <button type="button" className="btn ghost" onClick={() => { if (!dirty || confirm(t('site.leave'))) onClose(); }}>{t('common.close')}</button>
        </div>
      </div>

      <div className="glass seg site-tabs" role="group" aria-label={t('site.view')}>
        <button type="button" className="btn" aria-pressed={tab === 'edit'} onClick={() => setTab('edit')}>{t('common.edit')}</button>
        <button type="button" className="btn" aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}>{t('site.preview')}</button>
      </div>

      <div className={'site-ed ' + tab}>
        <form className="stack site-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <label className="field">{t('site.name')}<input className="input" value={d.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} /></label>
          <TemplatePicker value={d.template} onChange={(v) => set({ template: v })} name={'tpl-' + d.id} />
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="faint" style={{ marginBottom: 6 }}>{t('site.color')}</legend>
            <div className="wrap" style={{ gap: 8, alignItems: 'center' }}>
              {SWATCHES.map((c) => (
                <button key={c} type="button" className="swatch" aria-pressed={d.accent.toLowerCase() === c.toLowerCase()} aria-label={c}
                  style={{ background: c }} onClick={() => set({ accent: c })} />
              ))}
              <label className="row" style={{ gap: 6, fontSize: 13 }} >
                <input type="color" value={d.accent} onChange={(e) => set({ accent: e.target.value.toUpperCase() })} style={{ width: 36, height: 30, padding: 0, border: 0, background: 'none' }} />
                <span className="faint">{t('site.ownColor')}</span>
              </label>
            </div>
          </fieldset>
          <label className="field">{t('site.title')}<input className="input" value={d.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} /></label>
          <label className="field">{t('site.tagline')}<input className="input" value={d.tagline} maxLength={200} onChange={(e) => set({ tagline: e.target.value })} /></label>
          <label className="field">{t('site.about')}<textarea className="input" rows={5} value={d.about} maxLength={4000} onChange={(e) => set({ about: e.target.value })} /></label>
          <span className="faint" style={{ marginTop: -6 }}>{t('site.paraHelp')}</span>

          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 10 }}>
            <legend className="faint" style={{ marginBottom: 6 }}>{t('site.sections')}</legend>
            {d.sections.map((x, i) => (
              <div key={i} className="site-block">
                <div className="row" style={{ gap: 6, justifyContent: 'space-between' }}>
                  <span className="pixel" style={{ fontSize: 14 }}>{t('site.section')} {i + 1}</span>
                  <div className="row" style={{ gap: 2 }}>
                    <button type="button" className="btn ghost icon small" aria-label={`${t('site.up')}: ${t('site.section')} ${i + 1}`} disabled={i === 0} onClick={() => moveSection(i, -1)}><Icon name="up" size={16} /></button>
                    <button type="button" className="btn ghost icon small" aria-label={`${t('site.down')}: ${t('site.section')} ${i + 1}`} disabled={i === d.sections.length - 1} onClick={() => moveSection(i, 1)}><Icon name="down" size={16} /></button>
                    <button type="button" className="btn ghost icon small" aria-label={`${t('common.delete')}: ${t('site.section')} ${i + 1}`} onClick={() => set({ sections: d.sections.filter((_, j) => j !== i) })}><Icon name="trash" size={16} /></button>
                  </div>
                </div>
                <label className="field">{t('site.heading')}<input className="input" value={x.heading} maxLength={120} onChange={(e) => set({ sections: d.sections.map((y, j) => (j === i ? { ...y, heading: e.target.value } : y)) })} /></label>
                <label className="field">{t('site.text')}<textarea className="input" rows={3} value={x.text} maxLength={4000} onChange={(e) => set({ sections: d.sections.map((y, j) => (j === i ? { ...y, text: e.target.value } : y)) })} /></label>
              </div>
            ))}
            {d.sections.length < 12 && (
              <button type="button" className="btn small" style={{ alignSelf: 'flex-start' }} onClick={() => set({ sections: [...d.sections, { heading: '', text: '' }] })}><Icon name="plus" size={16} />{t('site.addSection')}</button>
            )}
          </fieldset>

          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 10 }}>
            <legend className="faint" style={{ marginBottom: 6 }}>{t('site.links')}</legend>
            {d.links.map((l, i) => {
              const bad = l.url.trim() !== '' && !safeUrl(l.url);
              return (
                <div key={i} className="wrap" style={{ gap: 8, alignItems: 'flex-end' }}>
                  <label className="field" style={{ flex: '1 1 120px' }}>{t('site.linkLabel')} {i + 1}<input className="input" value={l.label} maxLength={80} onChange={(e) => set({ links: d.links.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) })} /></label>
                  <label className="field" style={{ flex: '2 1 200px' }}>{t('site.linkUrl')} {i + 1}<input className="input" value={l.url} maxLength={500} inputMode="url" placeholder="https://"
                    aria-invalid={bad || undefined} aria-describedby={bad ? `bad-${i}` : undefined}
                    onChange={(e) => set({ links: d.links.map((y, j) => (j === i ? { ...y, url: e.target.value } : y)) })} /></label>
                  <button type="button" className="btn ghost icon" aria-label={`${t('common.delete')}: ${t('site.linkLabel')} ${i + 1}`} onClick={() => set({ links: d.links.filter((_, j) => j !== i) })}><Icon name="trash" /></button>
                  {bad && <span id={`bad-${i}`} className="warn-text" style={{ flexBasis: '100%' }}>{t('site.badLink')}</span>}
                </div>
              );
            })}
            {d.links.length < 12 && (
              <button type="button" className="btn small" style={{ alignSelf: 'flex-start' }} onClick={() => set({ links: [...d.links, { label: '', url: '' }] })}><Icon name="plus" size={16} />{t('site.addLink')}</button>
            )}
          </fieldset>
          <label className="field">{t('site.footer')}<input className="input" value={d.footer} maxLength={200} placeholder={`© ${new Date().getFullYear()} ${d.title || d.name}`} onChange={(e) => set({ footer: e.target.value })} /></label>
          {badLinks.length > 0 && <p className="warn-text" style={{ margin: 0 }}>{t('site.badLinksLeft')}</p>}
          <p className="faint" style={{ margin: 0 }}>{t('site.privacy')}</p>
          <div className="wrap">
            <button type="submit" className="btn" disabled={!dirty}>{t('common.save')}</button>
            <button type="button" className="btn ghost" onClick={() => { actions.deleteSite(site); toast(t('toast.deleted'), lastLogId()); onClose(); }}><Icon name="trash" />{t('site.delete')}</button>
          </div>
        </form>

        <div className="site-preview">
          <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
            <span className="faint">{t('site.preview')}</span>
            <div className="glass seg" role="group" aria-label={t('site.size')}>
              <button type="button" className="btn small" aria-pressed={view === 'pc'} onClick={() => setView('pc')}>{t('site.pc')}</button>
              <button type="button" className="btn small" aria-pressed={view === 'phone'} onClick={() => setView('phone')}>{t('site.phone')}</button>
            </div>
          </div>
          <div className={'frame ' + view}>
            <iframe title={`${t('site.preview')}: ${d.title || d.name}`} srcDoc={html} sandbox="" loading="lazy" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function WebsitesPage() {
  const s = useAll();
  const { t, locale } = useT();
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [tpl, setTpl] = useState<SiteTemplate>('neon');
  const open = s.sites.find((x) => x.id === openId);

  return (
    <main id="inhoud" tabIndex={-1} className="main">
      <PageHeader title={t('site.pageTitle')} sub={t('site.sub')} />

      {open ? <Editor key={open.id} site={open} onClose={() => setOpenId(null)} /> : (
        <>
          <section className="glass panel" aria-labelledby="sites-h">
            <h2 id="sites-h" className="h2">{t('site.mine')}</h2>
            {s.sites.length === 0 && <p className="muted" style={{ margin: 0 }}>{t('site.empty')}</p>}
            <div className="divide">
              {s.sites.map((x) => (
                <div key={x.id} className="list-item">
                  <span className={'tpl-thumb small tpl-' + x.template} aria-hidden="true" style={{ ['--a' as string]: x.accent }}><i /><b /><b /><em /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 600, overflowWrap: 'anywhere' }}>{x.name}</span>
                    <span className="faint">{t(`site.t.${x.template}` as never)} · {t('site.changed')} {new Date(x.updatedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</span>
                  </span>
                  <button type="button" className="btn small" aria-label={`${t('site.open')}: ${x.name}`} onClick={() => setOpenId(x.id)}>{t('site.open')}</button>
                </div>
              ))}
            </div>
          </section>

          <form className="glass panel" onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const x = actions.addSite(name, tpl);
            setName('');
            setOpenId(x.id);
          }}>
            <h2 className="h2">{t('site.new')}</h2>
            <label className="field" style={{ maxWidth: 420 }}>{t('site.name')}
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t('site.namePh')} />
            </label>
            <TemplatePicker value={tpl} onChange={setTpl} name="tpl-new" />
            <button type="submit" className="btn cta" style={{ alignSelf: 'flex-start' }} disabled={!name.trim()}><Icon name="plus" />{t('site.create')}</button>
          </form>

          <section className="glass panel" aria-labelledby="pub-h">
            <h2 id="pub-h" className="h2">{t('site.pubTitle')}</h2>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('site.pub')}</p>
          </section>
        </>
      )}
    </main>
  );
}
