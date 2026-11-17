'use client';
import { useState } from 'react';
import Icon from '@/components/Icon';
import PageHeader from '@/components/Page';
import { addDays, isoDay, sortEvents } from '@/lib/core';
import { useT } from '@/lib/i18n';
import { actions, lastLogId, useAll } from '@/lib/store';
import { toast } from '@/lib/toast';
import type { CalEvent } from '@/lib/types';

function EventRow({ ev }: { ev: CalEvent }) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(ev.title);
  const [date, setDate] = useState(ev.date);
  const [time, setTime] = useState(ev.time);
  const [place, setPlace] = useState(ev.place);

  if (editing) {
    return (
      <form className="list-item" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }} onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !date) return;
        actions.updateEvent({ ...ev, title: title.trim(), date, time, place: place.trim() });
        setEditing(false);
      }}>
        <label className="field" style={{ flex: '3 1 200px' }}>{t('common.title')}<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus maxLength={200} /></label>
        <label className="field" style={{ flex: '1 1 140px' }}>{t('agenda.date')}<input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
        <label className="field" style={{ flex: '1 1 110px' }}>{t('agenda.time')}<input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <label className="field" style={{ flex: '1 1 140px' }}>{t('agenda.place')}<input className="input" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={100} /></label>
        <div className="wrap">
          <button type="submit" className="btn cta">{t('common.save')}</button>
          <button type="button" className="btn" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
        </div>
      </form>
    );
  }
  return (
    <div className="list-item">
      <div className="pixel" style={{ flex: '0 0 64px', fontSize: 17, color: 'var(--accent)' }}>{ev.time || '··'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ overflowWrap: 'anywhere' }}>{ev.title}</div>
        <div className="faint">{[ev.time ? '' : t('agenda.allDay'), ev.place].filter(Boolean).join(' · ')}</div>
      </div>
      <button type="button" className="btn ghost icon" aria-label={`${t('common.edit')}: ${ev.title}`} onClick={() => { setTitle(ev.title); setDate(ev.date); setTime(ev.time); setPlace(ev.place); setEditing(true); }}><Icon name="edit" /></button>
      <button type="button" className="btn ghost icon" aria-label={`${t('common.delete')}: ${ev.title}`} onClick={() => { actions.deleteEvent(ev); toast(t('toast.deleted'), lastLogId()); }}><Icon name="trash" /></button>
    </div>
  );
}

export default function AgendaPage() {
  const s = useAll();
  const { t, locale } = useT();
  const today = isoDay();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [showPast, setShowPast] = useState(false);

  const all = sortEvents(s.events);
  const upcoming = all.filter((e) => e.date >= today);
  const past = all.filter((e) => e.date < today).reverse();
  const groups = new Map<string, CalEvent[]>();
  for (const e of upcoming) groups.set(e.date, [...(groups.get(e.date) ?? []), e]);
  const dayLabel = (d: string) => {
    if (d === today) return t('common.today');
    if (d === addDays(today, 1)) return t('common.tomorrow');
    const s2 = new Date(d + 'T12:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    return s2.charAt(0).toUpperCase() + s2.slice(1);
  };

  return (
    <main className="main">
      <PageHeader title={t('agenda.title')} sub={t('agenda.sub')} />

      <form className="glass panel" onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !date) return;
        actions.addEvent(title, date, time, place);
        setTitle(''); setTime(''); setPlace('');
      }}>
        <h2 className="h2">{t('agenda.new')}</h2>
        <div className="wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '3 1 220px' }}>{t('common.title')}<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></label>
          <label className="field" style={{ flex: '1 1 150px' }}>{t('agenda.date')}<input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
          <label className="field" style={{ flex: '1 1 120px' }}>{t('agenda.time')}<input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <label className="field" style={{ flex: '1 1 150px' }}>{t('agenda.place')}<input className="input" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={100} /></label>
          <button type="submit" className="btn cta" disabled={!title.trim() || !date}><Icon name="plus" />{t('common.add')}</button>
        </div>
      </form>

      <section className="glass panel" aria-label={t('agenda.title')}>
        {groups.size === 0 && <p className="muted" style={{ margin: 0 }}>{t('agenda.none')}</p>}
        {[...groups.entries()].map(([d, evs]) => (
          <div key={d}>
            <h2 className="h2" style={{ fontSize: 17, color: d === today ? 'var(--accent)' : undefined }}>{dayLabel(d)}</h2>
            <div className="divide">{evs.map((e) => <EventRow key={e.id} ev={e} />)}</div>
          </div>
        ))}
        {past.length > 0 && (
          <div>
            <button type="button" className="btn small" aria-expanded={showPast} onClick={() => setShowPast(!showPast)}>{t('agenda.showPast')} · {past.length}</button>
            {showPast && <div className="divide" style={{ opacity: 0.7, marginTop: 8 }}>{past.map((e) => (
              <div key={e.id}><div className="faint" style={{ paddingTop: 8 }}>{dayLabel(e.date)}</div><EventRow ev={e} /></div>
            ))}</div>}
          </div>
        )}
      </section>
    </main>
  );
}
