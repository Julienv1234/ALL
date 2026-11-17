'use client';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import PageHeader from '@/components/Page';
import { useT } from '@/lib/i18n';
import { actions, lastLogId, useAll } from '@/lib/store';
import { toast } from '@/lib/toast';

export default function NotesPage() {
  const s = useAll();
  const { t, locale } = useT();
  const [selId, setSelId] = useState<string | 'new' | null>(null);
  // Opened from the command window with #nieuw: start a new note.
  useEffect(() => { if (location.hash === '#nieuw') setSelId('new'); }, []);
  const [q, setQ] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const sel = selId && selId !== 'new' ? s.notes.find((n) => n.id === selId) : undefined;
  useEffect(() => {
    if (selId === 'new') { setTitle(''); setBody(''); }
    else if (sel) { setTitle(sel.title); setBody(sel.body); }
    // only when switching notes, not on every save
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId]);

  const f = q.trim().toLowerCase();
  const notes = [...s.notes]
    .filter((n) => !f || n.title.toLowerCase().includes(f) || n.body.toLowerCase().includes(f))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const dirty = selId === 'new' ? !!(title.trim() || body.trim()) : !!sel && (title !== sel.title || body !== sel.body);
  const editorOpen = selId === 'new' || !!sel;

  const save = () => {
    const ti = title.trim() || t('notes.untitled');
    if (selId === 'new') {
      const n = actions.addNote(ti, body);
      setSelId(n.id);
    } else if (sel) {
      actions.updateNote({ ...sel, title: ti, body });
    }
    setTitle(ti);
    toast(t('toast.saved'));
  };

  return (
    <main id="inhoud" tabIndex={-1} className="main">
      <PageHeader title={t('notes.title')} sub={t('notes.sub')}
        actions={<button type="button" className="btn cta" style={{ minHeight: 46 }} onClick={() => setSelId('new')}><Icon name="plus" />{t('notes.new')}</button>} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <section className="glass panel" style={{ flex: '1 1 280px', minWidth: 0 }} aria-label={t('notes.title')}>
          <label className="sr-only" htmlFor="nq">{t('common.search')}</label>
          <input id="nq" className="input" type="search" placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="divide">
            {notes.length === 0 && <p className="muted" style={{ margin: 0, padding: '12px 0' }}>{t('notes.none')}</p>}
            {notes.map((n) => (
              <button key={n.id} type="button" onClick={() => setSelId(n.id)} aria-current={n.id === selId ? 'true' : undefined}
                style={{ width: '100%', textAlign: 'left', background: n.id === selId ? 'rgba(255,255,255,0.08)' : 'transparent', border: 0, borderRadius: 8, padding: '10px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{n.title || t('notes.untitled')}</span>
                <span className="faint">{t('notes.updated')} {new Date(n.updatedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}{n.body ? ' · ' + n.body.slice(0, 60).replace(/\s+/g, ' ') : ''}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="glass panel" style={{ flex: '2 1 420px', minWidth: 0 }} aria-label={t('common.edit')}>
          {!editorOpen ? (
            <p className="muted" style={{ margin: 0 }}>{t('notes.pick')}</p>
          ) : (
            <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <label className="field">{t('common.title')}
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus={selId === 'new'} />
              </label>
              <label className="field">{t('notes.body')}
                <textarea className="input" rows={14} value={body} onChange={(e) => setBody(e.target.value)} />
              </label>
              <div className="wrap" style={{ justifyContent: 'space-between' }}>
                <div className="wrap">
                  <button type="submit" className="btn cta" disabled={!dirty}>{t('common.save')}</button>
                  <button type="button" className="btn" onClick={() => setSelId(null)}>{t('common.close')}</button>
                </div>
                {sel && (
                  <button type="button" className="btn danger" onClick={() => { actions.deleteNote(sel); setSelId(null); toast(t('toast.deleted'), lastLogId()); }}>
                    <Icon name="trash" />{t('common.delete')}
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
