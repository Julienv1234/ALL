'use client';
import { useState } from 'react';
import { useT, type Key } from '@/lib/i18n';
import { actions, lastLogId, useAll } from '@/lib/store';
import { toast } from '@/lib/toast';
import type { Draft } from '@/lib/types';

function DraftCard({ d }: { d: Draft }) {
  const { t, locale } = useT();
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(d.title);
  const [date, setDate] = useState(d.date);
  const [time, setTime] = useState(d.time);
  const [body, setBody] = useState(d.body);

  const when = d.kind === 'event' || d.kind === 'task'
    ? [d.date ? new Date(d.date + 'T12:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }) : t('draft.noDate'),
       d.kind === 'event' ? d.time || t('draft.allDay') : '', d.project ? '#' + d.project : ''].filter(Boolean).join(' · ')
    : d.kind === 'note' ? d.body.slice(0, 80) : '';

  if (edit) {
    return (
      <form className="stack" style={{ padding: '14px 0' }} onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        actions.updateDraft({ ...d, title: title.trim(), date, time, body });
        setEdit(false);
      }}>
        <label className="field">{t('common.title')}<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus maxLength={200} /></label>
        {(d.kind === 'event' || d.kind === 'task') && (
          <div className="wrap" style={{ gap: 12 }}>
            <label className="field" style={{ flex: '1 1 140px' }}>{d.kind === 'event' ? t('agenda.date') : t('tasks.due')}
              <input className="input" type="date" value={date} required={d.kind === 'event'} onChange={(e) => setDate(e.target.value)} />
            </label>
            {d.kind === 'event' && (
              <label className="field" style={{ flex: '1 1 110px' }}>{t('agenda.time')}<input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            )}
          </div>
        )}
        {d.kind === 'note' && <label className="field">{t('notes.body')}<textarea className="input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></label>}
        <div className="wrap">
          <button type="submit" className="btn cta">{t('common.save')}</button>
          <button type="button" className="btn" onClick={() => setEdit(false)}>{t('common.cancel')}</button>
        </div>
      </form>
    );
  }

  return (
    <article className="stack" style={{ padding: '14px 0', gap: 8 }} aria-label={d.title}>
      <div className="faint">{t(`draft.${d.kind}` as Key)} · {d.source.startsWith('workflow:')
        ? <>{t('draft.fromFlow')} “{d.source.slice(9)}”</>
        : d.source.startsWith('agent:') ? <>{t('draft.fromAgent')} “{d.source.slice(6)}”</>
          : <>{t('draft.from')}: “{d.source}”</>}</div>
      {d.kind === 'note' && d.body && <div className="muted" style={{ fontSize: 14, whiteSpace: 'pre-line' }}>{d.body}</div>}
      <div style={{ fontSize: 15, fontWeight: 500, overflowWrap: 'anywhere' }}>{d.title}</div>
      {when && <div className="muted" style={{ fontSize: 14 }}>{when}</div>}
      <div className="wrap">
        <button type="button" className="btn cta" onClick={() => { actions.approveDraft(d); toast(t('draft.approved'), lastLogId()); }}>{t('draft.approve')}</button>
        <button type="button" className="btn" onClick={() => { setTitle(d.title); setDate(d.date); setTime(d.time); setBody(d.body); setEdit(true); }}>{t('draft.edit')}</button>
        <button type="button" className="btn ghost" onClick={() => { actions.rejectDraft(d); toast(t('draft.rejected'), lastLogId()); }}>{t('draft.reject')}</button>
      </div>
    </article>
  );
}

/** "Waiting for your approval": everything ALL proposes lands here first. */
export default function Drafts() {
  const s = useAll();
  const { t } = useT();
  const list = [...s.drafts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <section className="glass panel" aria-labelledby="pending-h" aria-live="polite">
      <div className="row" style={{ justifyContent: 'space-between', minHeight: 28 }}>
        <h2 id="pending-h" className="h2">{t('home.pending')}</h2>
        {list.length > 0 && <span className="badge">{list.length}</span>}
      </div>
      {list.length === 0
        ? <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('draft.empty')}</p>
        : <div className="divide" style={{ marginTop: -8 }}>{list.map((d) => <DraftCard key={d.id} d={d} />)}</div>}
    </section>
  );
}
