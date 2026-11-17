'use client';
import { useState } from 'react';
import Icon from '@/components/Icon';
import PageHeader from '@/components/Page';
import { isoDay, minutesPerDay, streak, subjectViews, type SubjectView } from '@/lib/core';
import { useT } from '@/lib/i18n';
import { actions, lastLogId, useAll } from '@/lib/store';
import { fmt, remainingMs, timer, useTimer } from '@/lib/timer';
import { toast } from '@/lib/toast';

const PRESETS = [15, 25, 45];

function FocusTimer({ subjects }: { subjects: SubjectView[] }) {
  const { t } = useT();
  const { t: tt, now } = useTimer();
  const [subjectId, setSubjectId] = useState('');
  const [minutes, setMinutes] = useState(25);
  const active = subjects.filter((x) => !x.archived);
  const pick = subjectId && active.some((x) => x.id === subjectId) ? subjectId : active[0]?.id ?? '';
  const running = tt && tt.pausedAt === null;
  const left = tt ? remainingMs(tt, now || Date.now()) : minutes * 60_000;
  const total = tt ? tt.minutes * 60_000 : minutes * 60_000;
  const pct = Math.min(100, Math.max(0, 100 - (left / total) * 100));
  const subject = tt ? subjects.find((x) => x.id === tt.subjectId) : undefined;

  return (
    <section className="glass panel" aria-labelledby="timer-h" style={{ flex: '1 1 340px' }}>
      <h2 id="timer-h" className="h2">{t('learn.timer')}</h2>
      <div style={{ display: 'grid', placeItems: 'center', padding: '8px 0' }}>
        <svg width="200" height="200" viewBox="0 0 200 200" aria-hidden="true" style={{ gridArea: '1 / 1' }}>
          <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <circle cx="100" cy="100" r="88" fill="none" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 553} 553`} transform="rotate(-90 100 100)"
            style={{ filter: 'drop-shadow(0 0 6px var(--accent))', transition: 'stroke-dasharray 1s linear', opacity: tt ? 1 : 0 }} />
        </svg>
        <div style={{ gridArea: '1 / 1', textAlign: 'center' }}>
          <div className="pixel" role="timer" aria-live="off" style={{ fontSize: 46, lineHeight: 1 }}>{fmt(left)}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>{subject ? subject.name : tt ? '' : `${minutes} ${t('learn.min')}`}</div>
        </div>
      </div>

      {!tt ? (
        active.length === 0 ? <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('learn.pickSubject')}</p> : (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); if (pick) timer.start(pick, minutes); }}>
            <div className="wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
              <label className="field" style={{ flex: '2 1 160px' }} htmlFor="tm-sub">{t('learn.subject')}
                <select id="tm-sub" className="input" value={pick} onChange={(e) => setSubjectId(e.target.value)}>
                  {active.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="faint" style={{ marginBottom: 6 }}>{t('learn.minutes')}</legend>
                <div className="glass seg">
                  {PRESETS.map((m) => <button key={m} type="button" className="btn" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m}</button>)}
                </div>
              </fieldset>
            </div>
            <button type="submit" className="btn cta" style={{ alignSelf: 'flex-start' }}>{t('learn.start')}</button>
          </form>
        )
      ) : (
        <div className="wrap">
          {running
            ? <button type="button" className="btn" onClick={() => timer.pause()}>{t('learn.pause')}</button>
            : <button type="button" className="btn cta" onClick={() => timer.resume()}>{t('learn.resume')}</button>}
          <button type="button" className="btn" onClick={() => {
            const done = timer.stop();
            if (done && done.minutes > 0) { actions.addSession(done.subjectId, done.minutes, done.date); toast(t('learn.saved'), lastLogId()); }
          }}>{t('learn.stop')}</button>
          <button type="button" className="btn ghost" onClick={() => timer.clear()}>{t('learn.cancel')}</button>
        </div>
      )}
    </section>
  );
}

function WeekChart() {
  const s = useAll();
  const { t, locale } = useT();
  const today = isoDay();
  const days = minutesPerDay(s, today, 7);
  const max = Math.max(30, ...days.map((d) => d.minutes));
  const week = subjectViews(s, today).reduce((a, x) => a + x.week, 0);
  const st = streak(s, today);
  return (
    <section className="glass panel" aria-labelledby="chart-h" style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column' }}>
      <div className="wrap" style={{ gap: 28 }}>
        <div><div className="faint">{t('learn.week')}</div><div className="pixel" style={{ fontSize: 34 }}>{week} <span style={{ fontSize: 16 }}>{t('learn.min')}</span></div></div>
        <div><div className="faint">{t('learn.streak')}</div><div className="pixel" style={{ fontSize: 34, color: st ? 'var(--accent)' : undefined }}>{st}</div></div>
      </div>
      <h2 id="chart-h" className="faint" style={{ margin: 0, fontWeight: 400 }}>{t('learn.chart')}</h2>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8, alignItems: 'end', flex: 1, minHeight: 170 }}>
        {days.map((d) => {
          const isToday = d.date === today;
          const label = new Date(d.date + 'T12:00').toLocaleDateString(locale, { weekday: 'short' });
          return (
            <li key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}
              aria-label={`${label}: ${d.minutes} ${t('learn.min')}`}>
              <span className="faint" aria-hidden="true">{d.minutes || ''}</span>
              <div aria-hidden="true" style={{
                width: '100%', maxWidth: 34, height: `${Math.max(2, (d.minutes / max) * 120)}px`, borderRadius: 4,
                background: d.minutes ? (isToday ? 'var(--accent)' : 'var(--cyan)') : 'rgba(255,255,255,0.08)',
                boxShadow: d.minutes && isToday ? '0 0 10px var(--accent)' : undefined,
              }} />
              <span aria-hidden="true" className="faint" style={{ textTransform: 'capitalize', color: isToday ? 'var(--ink)' : undefined }}>{label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function SubjectCard({ x }: { x: SubjectView }) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [log, setLog] = useState('');
  const [v, setV] = useState({ name: x.name, goal: x.goal, exam: x.exam, weekly: String(x.weeklyMinutes || '') });
  const soon = x.daysToExam !== null && x.daysToExam <= 7;
  const pct = x.weeklyMinutes ? Math.min(100, Math.round((x.week / x.weeklyMinutes) * 100)) : 0;

  return (
    <article className="glass panel" aria-labelledby={'s-' + x.id}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
          <h3 id={'s-' + x.id} className="pixel" style={{ margin: 0, fontSize: 20, overflowWrap: 'anywhere' }}>{x.name}</h3>
          {x.daysToExam !== null && (
            <span className={'chip' + (soon ? ' warn' : '')}>
              {x.daysToExam === 0 ? t('learn.examToday') : `${t('learn.examIn')} ${x.daysToExam} ${x.daysToExam === 1 ? t('learn.day') : t('learn.days')}`}
            </span>
          )}
        </div>
        {!editing && <button type="button" className="btn ghost icon" style={{ marginTop: -10, marginRight: -10 }} aria-label={`${t('common.edit')}: ${x.name}`} onClick={() => { setV({ name: x.name, goal: x.goal, exam: x.exam, weekly: String(x.weeklyMinutes || '') }); setEditing(true); }}><Icon name="edit" /></button>}
      </div>
      {x.goal && !editing && <p className="muted" style={{ margin: 0, fontSize: 14 }}>{x.goal}</p>}
      {x.weeklyMinutes > 0 && !editing && (
        <div className="stack" style={{ gap: 6 }}>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
            <span className="muted">{t('learn.week')}: {x.week} {t('learn.ofTarget')} {x.weeklyMinutes} {t('learn.min')}</span>
            <span className="pixel" aria-hidden="true">{pct}%</span>
          </div>
          <div role="progressbar" aria-label={t('learn.week')} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--cyan)' }} />
          </div>
        </div>
      )}
      {!x.weeklyMinutes && !editing && <span className="muted" style={{ fontSize: 13 }}>{t('learn.week')}: {x.week} {t('learn.min')}</span>}

      {editing ? (
        <form className="stack" onSubmit={(e) => {
          e.preventDefault();
          if (!v.name.trim()) return;
          actions.updateSubject({ ...x, name: v.name.trim(), goal: v.goal.trim(), exam: v.exam, weeklyMinutes: Math.max(0, Math.round(Number(v.weekly) || 0)) });
          setEditing(false);
        }}>
          <label className="field">{t('proj.name')}<input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required maxLength={60} /></label>
          <label className="field">{t('learn.goal')}<input className="input" value={v.goal} onChange={(e) => setV({ ...v, goal: e.target.value })} maxLength={200} /></label>
          <div className="wrap" style={{ gap: 12 }}>
            <label className="field" style={{ flex: '1 1 140px' }}>{t('learn.exam')}<input className="input" type="date" value={v.exam} onChange={(e) => setV({ ...v, exam: e.target.value })} /></label>
            <label className="field" style={{ flex: '1 1 120px' }}>{t('learn.target')}<input className="input" type="number" min={0} max={3000} step={5} inputMode="numeric" value={v.weekly} onChange={(e) => setV({ ...v, weekly: e.target.value })} /></label>
          </div>
          <div className="wrap">
            <button type="submit" className="btn cta">{t('common.save')}</button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
            <button type="button" className="btn ghost" onClick={() => { actions.updateSubject({ ...x, archived: true }); setEditing(false); }}>{t('proj.archive')}</button>
          </div>
        </form>
      ) : (
        <div style={{ marginTop: 'auto' }}>
          <form className="row" style={{ gap: 8 }} onSubmit={(e) => {
            e.preventDefault();
            const m = Math.round(Number(log));
            if (!(m > 0)) return;
            actions.addSession(x.id, m);
            setLog('');
            toast(t('learn.logged'), lastLogId());
          }}>
            <label className="sr-only" htmlFor={'log-' + x.id}>{t('learn.log')} ({t('learn.min')}): {x.name}</label>
            <input id={'log-' + x.id} className="input" type="number" min={1} max={600} inputMode="numeric" placeholder={t('learn.min')} value={log} onChange={(e) => setLog(e.target.value)} style={{ width: 90 }} />
            <button type="submit" className="btn" disabled={!(Number(log) > 0)}>{t('learn.log')}</button>
          </form>
        </div>
      )}
    </article>
  );
}

export default function LearnPage() {
  const s = useAll();
  const { t, locale } = useT();
  const today = isoDay();
  const subjects = subjectViews(s, today);
  const active = subjects.filter((x) => !x.archived);
  const archived = subjects.filter((x) => x.archived);
  const [v, setV] = useState({ name: '', goal: '', exam: '', weekly: '' });
  const recent = [...s.sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const nameOf = (id: string) => s.subjects.find((x) => x.id === id)?.name ?? '?';

  return (
    <main id="inhoud" tabIndex={-1} className="main">
      <PageHeader title={t('learn.title')} sub={t('learn.sub')} />

      <div className="wrap" style={{ gap: 20, alignItems: 'stretch' }}>
        <FocusTimer subjects={subjects} />
        <WeekChart />
      </div>

      {active.length === 0 && <section className="glass panel"><p className="muted" style={{ margin: 0 }}>{t('learn.noSubjects')}</p></section>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 16 }}>
        {active.map((x) => <SubjectCard key={x.id} x={x} />)}
      </div>

      <form className="glass panel" onSubmit={(e) => {
        e.preventDefault();
        if (!v.name.trim()) return;
        actions.addSubject(v.name, v.goal, v.exam, Number(v.weekly) || 0);
        setV({ name: '', goal: '', exam: '', weekly: '' });
      }}>
        <h2 className="h2">{t('learn.newSubject')}</h2>
        <div className="wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '1 1 160px' }}>{t('proj.name')}<input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={60} /></label>
          <label className="field" style={{ flex: '2 1 220px' }}>{t('learn.goal')}<input className="input" value={v.goal} onChange={(e) => setV({ ...v, goal: e.target.value })} maxLength={200} /></label>
          <label className="field" style={{ flex: '1 1 150px' }}>{t('learn.exam')}<input className="input" type="date" value={v.exam} onChange={(e) => setV({ ...v, exam: e.target.value })} /></label>
          <label className="field" style={{ flex: '1 1 130px' }}>{t('learn.target')}<input className="input" type="number" min={0} max={3000} step={5} inputMode="numeric" value={v.weekly} onChange={(e) => setV({ ...v, weekly: e.target.value })} /></label>
          <button type="submit" className="btn cta" disabled={!v.name.trim()}><Icon name="plus" />{t('common.add')}</button>
        </div>
      </form>

      <section className="glass panel" aria-labelledby="rec-h">
        <h2 id="rec-h" className="h2">{t('learn.recent')}</h2>
        <div className="divide">
          {recent.length === 0 && <p className="muted" style={{ margin: 0 }}>{t('learn.noSessions')}</p>}
          {recent.map((x) => (
            <div key={x.id} className="list-item">
              <span className="pixel" style={{ flex: '0 0 72px', color: 'var(--cyan)' }}>{x.minutes} {t('learn.min')}</span>
              <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{nameOf(x.subjectId)}</span>
              <span className="faint">{new Date(x.date + 'T12:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <button type="button" className="btn ghost icon" aria-label={`${t('common.delete')}: ${x.minutes} ${t('learn.min')} ${nameOf(x.subjectId)}`}
                onClick={() => { actions.deleteSession(x); toast(t('toast.deleted'), lastLogId()); }}><Icon name="trash" /></button>
            </div>
          ))}
        </div>
      </section>

      {archived.length > 0 && (
        <section className="glass panel" aria-label={t('proj.archived')}>
          <h2 className="h2" style={{ fontSize: 17 }}>{t('proj.archived')} · {archived.length}</h2>
          <div className="divide">
            {archived.map((x) => (
              <div key={x.id} className="list-item">
                <span style={{ flex: 1 }}>{x.name}</span>
                <span className="faint">{x.total} {t('learn.min')}</span>
                <button type="button" className="btn small" onClick={() => actions.updateSubject({ ...x, archived: false })}>{t('proj.unarchive')}</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
