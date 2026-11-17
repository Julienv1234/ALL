'use client';
import { useRef, useState } from 'react';
import Icon from '@/components/Icon';
import PageHeader from '@/components/Page';
import { addDays, isoDay, occurrences, type Occurrence } from '@/lib/core';
import type { IcsResult } from '@/lib/ics';
import { useT, type Key } from '@/lib/i18n';
import { actions, lastLogId, useAll } from '@/lib/store';
import { toast } from '@/lib/toast';
import type { CalEvent, Repeat } from '@/lib/types';

const REPEATS: Repeat[] = ['none', 'daily', 'weekly', 'monthly'];

type Fields = { title: string; date: string; time: string; place: string; repeat: Repeat; until: string };

/** Title, date, time, place, repeat and end date: shared by "new" and "edit". */
function EventFields({ v, set, idp }: { v: Fields; set: (patch: Partial<Fields>) => void; idp: string }) {
  const { t } = useT();
  return (
    <>
      <label className="field" style={{ flex: '3 1 200px' }}>{t('common.title')}<input className="input" value={v.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} /></label>
      <label className="field" style={{ flex: '1 1 140px' }}>{t('agenda.date')}<input className="input" type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} required /></label>
      <label className="field" style={{ flex: '1 1 110px' }}>{t('agenda.time')}<input className="input" type="time" value={v.time} onChange={(e) => set({ time: e.target.value })} /></label>
      <label className="field" style={{ flex: '1 1 140px' }}>{t('agenda.place')}<input className="input" value={v.place} onChange={(e) => set({ place: e.target.value })} maxLength={100} /></label>
      <label className="field" style={{ flex: '1 1 130px' }} htmlFor={idp + '-rep'}>{t('agenda.repeat')}
        <select id={idp + '-rep'} className="input" value={v.repeat} onChange={(e) => set({ repeat: e.target.value as Repeat })}>
          {REPEATS.map((r) => <option key={r} value={r}>{t(`rep.${r}` as Key)}</option>)}
        </select>
      </label>
      {v.repeat !== 'none' && (
        <label className="field" style={{ flex: '1 1 150px' }}>{t('agenda.until')}<input className="input" type="date" value={v.until} min={v.date} onChange={(e) => set({ until: e.target.value })} /></label>
      )}
    </>
  );
}

function OccurrenceRow({ o, showDate }: { o: Occurrence; showDate?: string }) {
  const { t } = useT();
  const ev = o.ev;
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [v, setV] = useState<Fields>({ title: ev.title, date: ev.date, time: ev.time, place: ev.place, repeat: ev.repeat, until: ev.until });

  const del = () => { actions.deleteEvent(ev); toast(t('toast.deleted'), lastLogId()); };

  if (editing) {
    return (
      <form className="list-item" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }} onSubmit={(e) => {
        e.preventDefault();
        if (!v.title.trim() || !v.date) return;
        actions.updateEvent({ ...ev, ...v, title: v.title.trim(), place: v.place.trim(), until: v.repeat === 'none' ? '' : v.until });
        setEditing(false);
      }}>
        <EventFields v={v} set={(p) => setV({ ...v, ...p })} idp={'e-' + ev.id + o.date} />
        <div className="wrap">
          <button type="submit" className="btn cta">{t('common.save')}</button>
          <button type="button" className="btn" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
        </div>
      </form>
    );
  }
  return (
    <div className="list-item" style={{ flexWrap: 'wrap' }}>
      <div className="pixel" style={{ flex: '0 0 64px', fontSize: 17, color: 'var(--accent)' }}>{ev.time || '··'}</div>
      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
        <div style={{ overflowWrap: 'anywhere' }}>{ev.title}</div>
        <div className="wrap" style={{ gap: 6, marginTop: 2 }}>
          {showDate && <span className="faint">{showDate}</span>}
          {!ev.time && <span className="faint">{t('agenda.allDay')}</span>}
          {ev.place && <span className="faint">{ev.place}</span>}
          {ev.repeat !== 'none' && <span className="chip">{t(`rep.${ev.repeat}` as Key)}</span>}
        </div>
      </div>
      {asking ? (
        <div className="wrap" role="group" aria-label={t('agenda.deleteWhich')} style={{ alignItems: 'center' }}>
          <span className="faint">{t('agenda.deleteWhich')}</span>
          <button type="button" className="btn small" onClick={() => { actions.skipOccurrence(ev, o.date); setAsking(false); toast(t('toast.deleted'), lastLogId()); }}>{t('agenda.skipOne')}</button>
          <button type="button" className="btn small danger" onClick={() => { setAsking(false); del(); }}>{t('agenda.deleteAll')}</button>
          <button type="button" className="btn small ghost" onClick={() => setAsking(false)}>{t('common.cancel')}</button>
        </div>
      ) : (
        <>
          <button type="button" className="btn ghost icon" aria-label={`${t('common.edit')}: ${ev.title}`}
            onClick={() => { setV({ title: ev.title, date: ev.date, time: ev.time, place: ev.place, repeat: ev.repeat, until: ev.until }); setEditing(true); }}><Icon name="edit" /></button>
          <button type="button" className="btn ghost icon" aria-label={`${t('common.delete')}: ${ev.title}`}
            onClick={() => (ev.repeat === 'none' ? del() : setAsking(true))}><Icon name="trash" /></button>
        </>
      )}
    </div>
  );
}

function mondayOf(day: string): string {
  const d = new Date(day + 'T12:00');
  return addDays(day, -((d.getDay() + 6) % 7));
}

function WeekView({ events }: { events: CalEvent[] }) {
  const { t, locale } = useT();
  const today = isoDay();
  const [start, setStart] = useState(mondayOf(today));
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const occ = occurrences(events, days[0], days[6]);
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Date(d + 'T12:00').toLocaleDateString(locale, o);
  return (
    <section className="glass panel" aria-labelledby="wk-h">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <h2 id="wk-h" className="h2">{t('agenda.weekOf')} {fmt(start, { day: 'numeric', month: 'long' })}</h2>
        <div className="wrap">
          <button type="button" className="btn icon" aria-label={t('agenda.prevWeek')} onClick={() => setStart(addDays(start, -7))}><span aria-hidden="true">‹</span></button>
          <button type="button" className="btn" disabled={start === mondayOf(today)} onClick={() => setStart(mondayOf(today))}>{t('agenda.thisWeek')}</button>
          <button type="button" className="btn icon" aria-label={t('agenda.nextWeek')} onClick={() => setStart(addDays(start, 7))}><span aria-hidden="true">›</span></button>
        </div>
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))', gap: 8 }}>
        {days.map((d) => {
          const list = occ.filter((o) => o.date === d);
          const isToday = d === today;
          return (
            <li key={d} aria-current={isToday ? 'date' : undefined} style={{
              minHeight: 140, padding: 10, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 6,
              border: `1px solid ${isToday ? 'var(--accent)' : 'var(--line)'}`, background: isToday ? 'rgba(255,77,109,0.08)' : 'rgba(255,255,255,0.02)',
            }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="faint" style={{ textTransform: 'capitalize' }}>{fmt(d, { weekday: 'short' })}</span>
                <span className="pixel" style={{ fontSize: 18, color: isToday ? 'var(--accent)' : undefined }}>{fmt(d, { day: 'numeric' })}</span>
              </div>
              {list.length === 0 && <span className="faint">{t('agenda.free')}</span>}
              {list.map((o) => (
                <div key={o.ev.id + o.date} style={{ fontSize: 13, lineHeight: 1.35, padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.06)' }}>
                  <div className="pixel" style={{ fontSize: 13, color: 'var(--cyan)' }}>{o.ev.time || t('agenda.allDay')}</div>
                  <div style={{ overflowWrap: 'anywhere' }}>{o.ev.title}</div>
                </div>
              ))}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Files() {
  const s = useAll();
  const { t } = useT();
  const file = useRef<HTMLInputElement>(null);
  const [found, setFound] = useState<IcsResult | null>(null);
  const [msg, setMsg] = useState('');
  return (
    <section className="glass panel" aria-labelledby="files-h">
      <h2 id="files-h" className="h2">{t('agenda.files')}</h2>
      <p className="muted" style={{ margin: 0, fontSize: 14, maxWidth: '75ch' }}>{t('agenda.files.text')}</p>
      <div className="wrap">
        <button type="button" className="btn" onClick={() => file.current?.click()}><Icon name="upload" />{t('agenda.import')}</button>
        <button type="button" className="btn" disabled={s.events.length === 0} onClick={() => {
          const url = URL.createObjectURL(new Blob([actions.exportIcs()], { type: 'text/calendar' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = `all-agenda-${isoDay()}.ics`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}><Icon name="download" />{t('agenda.export')}</button>
        <input ref={file} type="file" accept=".ics,text/calendar" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          const text = await f.text();
          if (!text.includes('BEGIN:VCALENDAR')) { setFound(null); setMsg(t('agenda.badFile')); return; }
          const r = actions.readIcs(text);
          setMsg(r.events.length ? '' : t('agenda.nothingNew'));
          setFound(r.events.length ? r : null);
        }} />
      </div>
      {msg && <p role="status" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
      {found && (
        <div className="stack" role="status" style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 12 }}>
          <p style={{ margin: 0 }}><strong className="pixel" style={{ fontSize: 20 }}>{found.events.length}</strong> {t('agenda.found')}.</p>
          {found.simplified > 0 && <p className="faint" style={{ margin: 0 }}>{found.simplified} {t('agenda.simplified')}</p>}
          {found.skipped > 0 && <p className="faint" style={{ margin: 0 }}>{found.skipped} {t('agenda.skippedN')}</p>}
          <div className="wrap">
            <button type="button" className="btn cta" onClick={() => { actions.importEvents(found.events); setFound(null); toast(t('agenda.imported'), lastLogId()); }}>{t('agenda.importNow')}</button>
            <button type="button" className="btn" onClick={() => setFound(null)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function AgendaPage() {
  const s = useAll();
  const { t, locale } = useT();
  const today = isoDay();
  const blank: Fields = { title: '', date: today, time: '', place: '', repeat: 'none', until: '' };
  const [v, setV] = useState<Fields>(blank);
  const [view, setView] = useState<'list' | 'week'>('list');
  const [showPast, setShowPast] = useState(false);

  const upcoming = occurrences(s.events, today, addDays(today, 55));
  const groups = new Map<string, Occurrence[]>();
  for (const o of upcoming) groups.set(o.date, [...(groups.get(o.date) ?? []), o]);
  const past = occurrences(s.events.filter((e) => e.repeat === 'none'), '0000-01-01', addDays(today, -1)).reverse();
  const dayLabel = (d: string) => {
    if (d === today) return t('common.today');
    if (d === addDays(today, 1)) return t('common.tomorrow');
    const x = new Date(d + 'T12:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    return x.charAt(0).toUpperCase() + x.slice(1);
  };

  return (
    <main id="inhoud" tabIndex={-1} className="main">
      <PageHeader title={t('agenda.title')} sub={t('agenda.sub')}
        actions={(
          <div className="glass seg" role="group" aria-label={t('agenda.views')}>
            <button type="button" className="btn" aria-pressed={view === 'list'} onClick={() => setView('list')}>{t('agenda.list')}</button>
            <button type="button" className="btn" aria-pressed={view === 'week'} onClick={() => setView('week')}>{t('agenda.week')}</button>
          </div>
        )} />

      <form className="glass panel" onSubmit={(e) => {
        e.preventDefault();
        if (!v.title.trim() || !v.date) return;
        actions.addEvent(v.title, v.date, v.time, v.place, v.repeat, v.repeat === 'none' ? '' : v.until);
        setV({ ...blank, date: v.date });
      }}>
        <h2 className="h2">{t('agenda.new')}</h2>
        <div className="wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
          <EventFields v={v} set={(p) => setV({ ...v, ...p })} idp="new" />
          <button type="submit" className="btn cta" disabled={!v.title.trim() || !v.date}><Icon name="plus" />{t('common.add')}</button>
        </div>
      </form>

      {view === 'week' ? <WeekView events={s.events} /> : (
        <section className="glass panel" aria-label={t('agenda.upcoming')}>
          {groups.size === 0 && <p className="muted" style={{ margin: 0 }}>{t('agenda.none')}</p>}
          {[...groups.entries()].map(([d, os]) => (
            <div key={d}>
              <h2 className="h2" style={{ fontSize: 17, color: d === today ? 'var(--accent)' : undefined }}>{dayLabel(d)}</h2>
              <div className="divide">{os.map((o) => <OccurrenceRow key={o.ev.id + o.date} o={o} />)}</div>
            </div>
          ))}
          {past.length > 0 && (
            <div>
              <button type="button" className="btn small" aria-expanded={showPast} onClick={() => setShowPast(!showPast)}>{t('agenda.showPast')} · {past.length}</button>
              {showPast && <div className="divide" style={{ opacity: 0.75, marginTop: 8 }}>{past.map((o) => <OccurrenceRow key={o.ev.id} o={o} showDate={dayLabel(o.date)} />)}</div>}
            </div>
          )}
        </section>
      )}

      <Files />
    </main>
  );
}
