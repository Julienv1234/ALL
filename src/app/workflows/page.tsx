'use client';
import { useState } from 'react';
import Icon from '@/components/Icon';
import PageHeader from '@/components/Page';
import { addDays, isoDay } from '@/lib/core';
import { useT } from '@/lib/i18n';
import { actions, lastLogId, useAll } from '@/lib/store';
import { toast } from '@/lib/toast';
import type { Rule, RuleWhen } from '@/lib/types';

type Form = {
  name: string; whenType: RuleWhen['type']; weekday: number; day: number; days: number;
  kind: Rule['kind']; title: string; project: string; dueIn: number; direct: boolean;
};

const EMPTY: Form = { name: '', whenType: 'weekly', weekday: 0, day: 1, days: 3, kind: 'task', title: '', project: '', dueIn: 0, direct: false };

function toWhen(f: Form): RuleWhen {
  if (f.whenType === 'daily') return { type: 'daily' };
  if (f.whenType === 'weekly') return { type: 'weekly', weekday: f.weekday };
  if (f.whenType === 'monthly') return { type: 'monthly', day: f.day };
  return { type: 'examSoon', days: f.days };
}

function fromRule(r: Rule): Form {
  const w = r.when;
  return {
    name: r.name, whenType: w.type, weekday: w.type === 'weekly' ? w.weekday : 0, day: w.type === 'monthly' ? w.day : 1,
    days: w.type === 'examSoon' ? w.days : 3, kind: r.kind, title: r.title, project: r.project, dueIn: r.dueIn, direct: r.direct,
  };
}

function useDescribe() {
  const { t, locale, lang } = useT();
  const en = lang === 'en';
  const dayName = (i: number) => new Date(2026, 10, 16 + i).toLocaleDateString(locale, { weekday: 'long' });
  const when = (w: RuleWhen) =>
    w.type === 'daily' ? t('flow.w.daily')
      : w.type === 'weekly' ? `${t('flow.w.every')} ${dayName(w.weekday)}`
        : w.type === 'monthly' ? (en ? `On day ${w.day} of every month` : `Elke maand op de ${w.day}e`)
          : (en ? `${w.days} days before an exam` : `${w.days} dagen voor een examen`);
  const due = (n: number) => n < 0 ? '' : n === 0 ? t('flow.due0') : en ? `deadline ${n} day${n === 1 ? '' : 's'} later` : `deadline ${n} dag${n === 1 ? '' : 'en'} later`;
  return (r: Pick<Rule, 'when' | 'kind' | 'title' | 'dueIn' | 'direct' | 'project'>) => {
    const extra = [r.kind === 'task' ? due(r.dueIn) : '', r.kind === 'task' && r.project ? `#${r.project}` : ''].filter(Boolean).join(', ');
    const how = r.direct
      ? (r.kind === 'task' ? t('flow.doTask') : t('flow.doNote'))
      : (r.kind === 'task' ? t('flow.draftTask') : t('flow.draftNote'));
    return `${when(r.when)}${en ? ',' : ''} ${how}: “${r.title || '…'}”${extra ? ` (${extra})` : ''}.`;
  };
}

function RuleForm({ initial, onSave, onCancel, submitLabel }: { initial: Form; onSave: (f: Form) => void; onCancel?: () => void; submitLabel: string }) {
  const { t, locale } = useT();
  const describe = useDescribe();
  const [f, setF] = useState<Form>(initial);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  const days = Array.from({ length: 7 }, (_, i) => new Date(2026, 10, 16 + i).toLocaleDateString(locale, { weekday: 'long' }));
  const valid = f.name.trim() && f.title.trim();
  return (
    <form className="stack" style={{ maxWidth: 760 }} onSubmit={(e) => { e.preventDefault(); if (valid) onSave(f); }}>
      <label className="field">{t('proj.name')}
        <input className="input" value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} placeholder={t('flow.namePh')} />
      </label>
      <div className="wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
        <label className="field" style={{ flex: '1 1 200px' }}>{t('flow.when')}
          <select className="input" value={f.whenType} onChange={(e) => set({ whenType: e.target.value as Form['whenType'] })}>
            <option value="daily">{t('flow.w.daily')}</option>
            <option value="weekly">{t('flow.w.weekly')}</option>
            <option value="monthly">{t('flow.w.monthly')}</option>
            <option value="examSoon">{t('flow.w.exam')}</option>
          </select>
        </label>
        {f.whenType === 'weekly' && (
          <label className="field" style={{ flex: '1 1 160px' }}>{t('flow.weekday')}
            <select className="input" value={f.weekday} onChange={(e) => set({ weekday: Number(e.target.value) })} style={{ textTransform: 'capitalize' }}>
              {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </label>
        )}
        {f.whenType === 'monthly' && (
          <label className="field" style={{ flex: '0 1 140px' }}>{t('flow.dayOfMonth')}
            <input className="input" type="number" min={1} max={28} inputMode="numeric" value={f.day} onChange={(e) => set({ day: Math.min(28, Math.max(1, Number(e.target.value) || 1)) })} />
          </label>
        )}
        {f.whenType === 'examSoon' && (
          <label className="field" style={{ flex: '0 1 160px' }}>{t('flow.daysBefore')}
            <input className="input" type="number" min={0} max={60} inputMode="numeric" value={f.days} onChange={(e) => set({ days: Math.min(60, Math.max(0, Number(e.target.value) || 0)) })} />
          </label>
        )}
      </div>
      <div className="wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
        <label className="field" style={{ flex: '0 1 180px' }}>{t('flow.then')}
          <select className="input" value={f.kind} onChange={(e) => set({ kind: e.target.value as Rule['kind'] })}>
            <option value="task">{t('flow.k.taskCap')}</option>
            <option value="note">{t('flow.k.noteCap')}</option>
          </select>
        </label>
        <label className="field" style={{ flex: '2 1 240px' }}>{t('common.title')}
          <input className="input" value={f.title} onChange={(e) => set({ title: e.target.value })} maxLength={120} placeholder={f.whenType === 'examSoon' ? t('flow.titlePhExam') : t('flow.titlePh')} aria-describedby="flow-vars" />
        </label>
      </div>
      <p id="flow-vars" className="faint" style={{ margin: 0 }}>{f.whenType === 'examSoon' ? t('flow.varsExam') : t('flow.vars')}</p>
      {f.kind === 'task' && (
        <div className="wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '1 1 160px' }}>{t('flow.project')}
            <input className="input" value={f.project} onChange={(e) => set({ project: e.target.value })} maxLength={40} />
          </label>
          <label className="field" style={{ flex: '1 1 180px' }}>{t('flow.deadline')}
            <select className="input" value={f.dueIn} onChange={(e) => set({ dueIn: Number(e.target.value) })}>
              <option value={-1}>{t('flow.noDeadline')}</option>
              <option value={0}>{t('flow.due0')}</option>
              {[1, 2, 3, 7].map((n) => <option key={n} value={n}>+{n} {n === 1 ? t('learn.day') : t('learn.days')}</option>)}
            </select>
          </label>
        </div>
      )}
      <label className="row" style={{ gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
        <input type="checkbox" checked={f.direct} onChange={(e) => set({ direct: e.target.checked })} style={{ marginTop: 3, width: 18, height: 18, accentColor: 'var(--accent)' }} />
        <span>{t('flow.direct')}<span className="faint" style={{ display: 'block' }}>{t('flow.directHelp')}</span></span>
      </label>
      <p className="glass" aria-live="polite" style={{ margin: 0, padding: '10px 14px', borderRadius: 10, fontSize: 14 }}>
        <span className="faint">{t('flow.preview')}: </span>{describe({ when: toWhen(f), kind: f.kind, title: f.title, dueIn: f.dueIn, direct: f.direct, project: f.project })}
      </p>
      <div className="wrap">
        <button type="submit" className="btn cta" disabled={!valid}>{submitLabel}</button>
        {onCancel && <button type="button" className="btn" onClick={onCancel}>{t('common.cancel')}</button>}
      </div>
    </form>
  );
}

export default function WorkflowsPage() {
  const s = useAll();
  const { t, lang, locale } = useT();
  const describe = useDescribe();
  const en = lang === 'en';
  const [editing, setEditing] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [start, setStart] = useState<Form>(EMPTY);

  const STARTERS: { label: string; f: Form }[] = [
    { label: t('flow.s.week'), f: { ...EMPTY, name: t('flow.s.week'), whenType: 'weekly', weekday: 6, title: en ? 'Plan my week' : 'Mijn week plannen', dueIn: 0 } },
    { label: t('flow.s.exam'), f: { ...EMPTY, name: t('flow.s.exam'), whenType: 'examSoon', days: 3, title: en ? 'Revise {vak} for {datum}' : 'Herhalen {vak} voor {datum}', project: en ? 'School' : 'School', dueIn: 1 } },
    { label: t('flow.s.room'), f: { ...EMPTY, name: t('flow.s.room'), whenType: 'monthly', day: 1, title: en ? 'Tidy my room' : 'Kamer opruimen', dueIn: 2 } },
    { label: t('flow.s.diary'), f: { ...EMPTY, name: t('flow.s.diary'), whenType: 'weekly', weekday: 4, kind: 'note', title: en ? 'What went well this week' : 'Wat ging goed deze week' } },
  ];

  const save = (f: Form, rule?: Rule) => {
    const data = { name: f.name, when: toWhen(f), kind: f.kind, title: f.title.trim(), project: f.kind === 'task' ? f.project.trim() : '', dueIn: f.kind === 'task' ? f.dueIn : -1, direct: f.direct };
    if (rule) { actions.updateRule({ ...rule, ...data, name: f.name.trim() }); setEditing(null); }
    else {
      actions.addRule(data);
      setStart(EMPTY);
      setFormKey((k) => k + 1);
      // Show the effect straight away if the new rule is due today.
      const n = actions.runRules();
      toast(n ? (n === 1 ? t('flow.firedOne') : `${n} ${t('flow.firedMany')}`) : t('flow.created'));
    }
  };

  const lastRun = (r: Rule) => {
    const k = r.runs[0];
    if (!k) return t('flow.never');
    const d = k.startsWith('exam:') ? '' : k;
    return d ? new Date(d + 'T12:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }) : t('flow.forExam');
  };
  const nextHint = (r: Rule) => {
    const w = r.when;
    if (w.type !== 'weekly') return '';
    const today = isoDay();
    const dow = (new Date().getDay() + 6) % 7;
    const next = addDays(today, (w.weekday - dow + 7) % 7 || 7);
    return `${t('flow.next')}: ${new Date(next + 'T12:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}`;
  };

  return (
    <main id="inhoud" tabIndex={-1} className="main">
      <PageHeader title={t('flows.title')} sub={t('flow.sub')} />

      <section className="glass panel" aria-labelledby="mine-h">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <h2 id="mine-h" className="h2" style={{ margin: 0 }}>{t('flow.mine')}</h2>
          {s.rules.length > 0 && (
            <button type="button" className="btn small" onClick={() => {
              const n = actions.runRules();
              toast(n ? (n === 1 ? t('flow.firedOne') : `${n} ${t('flow.firedMany')}`) : t('flow.nothingNow'));
            }}><Icon name="play" />{t('flow.runNow')}</button>
          )}
        </div>
        {s.rules.length === 0 && <p className="muted" style={{ margin: 0 }}>{t('flow.empty')}</p>}
        <div className="divide">
          {s.rules.map((r) => (
            <article key={r.id} className="stack" style={{ padding: '12px 0', gap: 8 }} aria-labelledby={'r-' + r.id}>
              <div className="agent-row">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 id={'r-' + r.id} className="pixel" style={{ margin: 0, fontSize: 18, overflowWrap: 'anywhere', opacity: r.enabled ? 1 : 0.6 }}>{r.name}</h3>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>{describe(r)}</p>
                  <p className="faint" style={{ margin: '2px 0 0' }}>{t('flow.last')}: {lastRun(r)}{nextHint(r) ? ` · ${nextHint(r)}` : ''}</p>
                </div>
                <div className="agent-btns">
                  <button type="button" className="btn small toggle" aria-pressed={r.enabled}
                    onClick={() => actions.updateRule({ ...r, enabled: !r.enabled })}><span className="sr-only">{r.name}: </span>{t('flow.active')}</button>
                  <button type="button" className="btn ghost icon" aria-label={`${t('common.edit')}: ${r.name}`} aria-expanded={editing === r.id}
                    onClick={() => setEditing(editing === r.id ? null : r.id)}><Icon name="edit" /></button>
                  <button type="button" className="btn ghost icon" aria-label={`${t('common.delete')}: ${r.name}`}
                    onClick={() => { actions.deleteRule(r); toast(t('toast.deleted'), lastLogId()); }}><Icon name="trash" /></button>
                </div>
              </div>
              {editing === r.id && (
                <div className="glass" style={{ padding: 16, borderRadius: 12 }}>
                  <RuleForm initial={fromRule(r)} onSave={(f) => save(f, r)} onCancel={() => setEditing(null)} submitLabel={t('common.save')} />
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="glass panel" aria-labelledby="new-h">
        <h2 id="new-h" className="h2">{t('flow.new')}</h2>
        <div className="stack" style={{ gap: 8 }}>
          <span className="faint">{t('flow.starters')}</span>
          <div className="wrap" style={{ gap: 8 }}>
            {STARTERS.map((x) => (
              <button key={x.label} type="button" className="btn small" onClick={() => { setStart(x.f); setFormKey((k) => k + 1); }}>{x.label}</button>
            ))}
          </div>
        </div>
        <RuleForm key={formKey} initial={start} onSave={(f) => save(f)} submitLabel={t('flow.create')} />
      </section>

      <section className="glass panel" aria-labelledby="how-h">
        <h2 id="how-h" className="h2">{t('flow.how')}</h2>
        <ul className="muted" style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6, fontSize: 14 }}>
          <li>{t('flow.how1')}</li>
          <li>{t('flow.how2')}</li>
          <li>{t('flow.how3')}</li>
        </ul>
        <div className="row" style={{ alignItems: 'flex-start', gap: 14, padding: 12, border: '1px solid var(--line)', borderRadius: 12 }}>
          <img className="px" src="/img/stad-mail.png" alt="" width={84} height={80} style={{ objectFit: 'contain', opacity: 0.75, flex: '0 0 auto' }} />
          <div style={{ minWidth: 0 }}>
            <div className="pixel" style={{ fontSize: 17 }}>{t('mod.mail')}</div>
            <div className="ok" style={{ fontSize: 13 }}>{t('later.phase')} 3</div>
            <p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>{t('flow.mailLater')}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
