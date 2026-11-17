'use client';
import { useState } from 'react';
import Icon from '@/components/Icon';
import PageHeader from '@/components/Page';
import { habitViews, isoDay, type HabitView } from '@/lib/core';
import { useT } from '@/lib/i18n';
import { actions, lastLogId, useAll } from '@/lib/store';
import { toast } from '@/lib/toast';

/** Monday-first short weekday names in the current language. */
function weekdayNames(locale: string) {
  // 2026-11-16 is a Monday.
  return Array.from({ length: 7 }, (_, i) => new Date(2026, 10, 16 + i).toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''));
}

function DayPicker({ value, onChange, idBase }: { value: number[]; onChange: (v: number[]) => void; idBase: string }) {
  const { t, locale } = useT();
  const names = weekdayNames(locale);
  const every = value.length === 0;
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="faint" style={{ marginBottom: 6 }}>{t('habit.when')}</legend>
      <div className="wrap" style={{ gap: 6 }}>
        <button type="button" className="btn small" aria-pressed={every} onClick={() => onChange([])}>{t('habit.everyDay')}</button>
        {names.map((n, i) => {
          const on = value.includes(i);
          return (
            <button key={i} type="button" id={`${idBase}-${i}`} className="btn small" aria-pressed={on} style={{ minWidth: 44, textTransform: 'capitalize' }}
              onClick={() => {
                const next = on ? value.filter((d) => d !== i) : [...value, i].sort();
                onChange(next.length === 7 ? [] : next);
              }}>{n}</button>
          );
        })}
      </div>
    </fieldset>
  );
}

function CheckButton({ h, day, size = 44, label }: { h: HabitView; day: string; size?: number; label: string }) {
  const done = h.done.includes(day);
  return (
    <button type="button" className={'hcheck' + (done ? ' on' : '')} aria-pressed={done} aria-label={label}
      style={{ width: size, height: size }} onClick={() => actions.toggleHabit(h, day)}>
      {done && <Icon name="check" size={Math.round(size * 0.5)} />}
    </button>
  );
}

function Flame({ n }: { n: number }) {
  const { t } = useT();
  return (
    <span className="row" style={{ gap: 4, flex: '0 0 auto' }} title={t('habit.streak')}>
      <span className="ico px" aria-hidden="true" style={{ width: 24, height: 24, backgroundSize: '312px 48px', backgroundPosition: `-${5 * 24}px -${n ? 24 : 0}px`, opacity: n ? 1 : 0.5 }} />
      <span className="pixel" style={{ fontSize: 16, color: n ? 'var(--accent)' : 'var(--ink-3)' }}>{n}</span>
      <span className="sr-only">{t('habit.streak')}</span>
    </span>
  );
}

function HabitEditor({ h, onDone }: { h: HabitView; onDone: () => void }) {
  const { t } = useT();
  const [name, setName] = useState(h.name);
  const [days, setDays] = useState(h.days);
  return (
    <form className="stack" onSubmit={(e) => {
      e.preventDefault();
      if (!name.trim()) return;
      actions.updateHabit({ ...h, name: name.trim(), days });
      onDone();
    }}>
      <label className="field">{t('proj.name')}<input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} /></label>
      <DayPicker value={days} onChange={setDays} idBase={'ed-' + h.id} />
      <div className="wrap">
        <button type="submit" className="btn cta">{t('common.save')}</button>
        <button type="button" className="btn" onClick={onDone}>{t('common.cancel')}</button>
        <button type="button" className="btn ghost" onClick={() => { actions.updateHabit({ ...h, archived: true }); onDone(); }}>{t('proj.archive')}</button>
        <button type="button" className="btn ghost" onClick={() => { actions.deleteHabit(h); toast(t('toast.deleted'), lastLogId()); }}><Icon name="trash" />{t('common.delete')}</button>
      </div>
    </form>
  );
}

export default function HabitsPage() {
  const s = useAll();
  const { t, locale } = useT();
  const today = isoDay();
  const all = habitViews(s, today);
  const active = all.filter((h) => !h.archived);
  const archived = all.filter((h) => h.archived);
  const todays = active.filter((h) => h.today);
  const others = active.filter((h) => !h.today);
  const [name, setName] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const doneCount = todays.filter((h) => h.doneToday).length;
  const dayLabel = (d: string) => new Date(d + 'T12:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const week = active[0]?.last7.map((d) => d.date) ?? [];

  return (
    <main id="inhoud" tabIndex={-1} className="main">
      <PageHeader title={t('habit.title')} sub={t('habit.sub')} />

      <section className="glass panel" aria-labelledby="today-h">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <h2 id="today-h" className="h2" style={{ margin: 0 }}>{t('common.today')}</h2>
          {todays.length > 0 && <span className="muted" aria-live="polite">{doneCount} / {todays.length} {t('habit.doneToday')}</span>}
        </div>
        {active.length === 0 && <p className="muted" style={{ margin: 0 }}>{t('habit.empty')}</p>}
        {active.length > 0 && todays.length === 0 && <p className="muted" style={{ margin: 0 }}>{t('habit.nothingToday')}</p>}
        <div className="divide">
          {todays.map((h) => (
            <div key={h.id} className="list-item" style={{ gap: 14 }}>
              <CheckButton h={h} day={today} label={`${h.name}: ${t('habit.markToday')}`} />
              <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', fontSize: 17, textDecoration: h.doneToday ? 'line-through' : undefined, color: h.doneToday ? 'var(--ink-2)' : undefined }}>{h.name}</span>
              <Flame n={h.streak} />
            </div>
          ))}
        </div>
        {others.length > 0 && (
          <p className="faint" style={{ margin: 0 }}>{t('habit.notToday')}: {others.map((h) => h.name).join(', ')}</p>
        )}
      </section>

      {active.length > 0 && (
        <section className="glass panel" aria-labelledby="week-h" style={{ minWidth: 0 }}>
          <h2 id="week-h" className="h2">{t('habit.week')}</h2>
          <div className="hscroll" tabIndex={0}>
            <table className="htable">
              <caption className="sr-only">{t('habit.weekCaption')}</caption>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: 'left' }}>{t('habit.habit')}</th>
                  {week.map((d) => (
                    <th key={d} scope="col" style={{ color: d === today ? 'var(--ink)' : undefined }}>
                      <span aria-hidden="true" style={{ textTransform: 'capitalize' }}>{new Date(d + 'T12:00').toLocaleDateString(locale, { weekday: 'short' }).replace('.', '')}</span>
                      <span className="sr-only">{dayLabel(d)}</span>
                      <div aria-hidden="true" className="faint" style={{ fontWeight: 400 }}>{Number(d.slice(8))}</div>
                    </th>
                  ))}
                  <th scope="col">{t('habit.rate')}</th>
                  <th scope="col"><span className="sr-only">{t('common.edit')}</span></th>
                </tr>
              </thead>
              <tbody>
                {active.map((h) => (
                  <tr key={h.id}>
                    <th scope="row" style={{ textAlign: 'left', fontWeight: 500, overflowWrap: 'anywhere' }}>{h.name}</th>
                    {h.last7.map((d) => (
                      <td key={d.date} style={{ opacity: d.planned || d.done ? 1 : 0.35 }}>
                        <CheckButton h={h} day={d.date} size={32}
                          label={`${h.name}, ${dayLabel(d.date)}${d.planned ? '' : ` (${t('habit.notPlanned')})`}`} />
                      </td>
                    ))}
                    <td><span className="pixel">{h.rate}%</span></td>
                    <td>
                      <button type="button" className="btn ghost icon" aria-label={`${t('common.edit')}: ${h.name}`} aria-expanded={editing === h.id}
                        onClick={() => setEditing(editing === h.id ? null : h.id)}><Icon name="edit" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="faint" style={{ margin: 0 }}>{t('habit.rateHelp')}</p>
          {active.filter((h) => h.id === editing).map((h) => (
            <div key={h.id} className="glass" style={{ padding: 16, borderRadius: 12 }}>
              <h3 className="pixel" style={{ margin: '0 0 10px', fontSize: 18 }}>{h.name}</h3>
              <HabitEditor h={h} onDone={() => setEditing(null)} />
            </div>
          ))}
        </section>
      )}

      <form className="glass panel" onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        actions.addHabit(name, days);
        setName('');
        setDays([]);
      }}>
        <h2 className="h2">{t('habit.new')}</h2>
        <label className="field" style={{ maxWidth: 420 }}>{t('proj.name')}
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={t('habit.placeholder')} />
        </label>
        <DayPicker value={days} onChange={setDays} idBase="new" />
        <button type="submit" className="btn cta" style={{ alignSelf: 'flex-start' }} disabled={!name.trim()}><Icon name="plus" />{t('common.add')}</button>
        <p className="faint" style={{ margin: 0 }}>{t('habit.privacy')}</p>
      </form>

      {archived.length > 0 && (
        <section className="glass panel" aria-label={t('proj.archived')}>
          <h2 className="h2" style={{ fontSize: 17 }}>{t('proj.archived')} · {archived.length}</h2>
          <div className="divide">
            {archived.map((h) => (
              <div key={h.id} className="list-item">
                <span style={{ flex: 1 }}>{h.name}</span>
                <button type="button" className="btn small" onClick={() => actions.updateHabit({ ...h, archived: false })}>{t('proj.unarchive')}</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
