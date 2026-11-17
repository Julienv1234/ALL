'use client';
import { useState } from 'react';
import Icon from '@/components/Icon';
import PageHeader from '@/components/Page';
import TaskRow from '@/components/TaskRow';
import TaskTabs from '@/components/TaskTabs';
import { isoDay, projectViews, type ProjectView } from '@/lib/core';
import { useT } from '@/lib/i18n';
import { actions, lastLogId, useAll } from '@/lib/store';
import { toast } from '@/lib/toast';

function Progress({ open, done }: { open: number; done: number }) {
  const { t } = useT();
  const total = open + done;
  const pct = total ? Math.round((done / total) * 100) : 0;
  if (!total) return <span className="muted" style={{ fontSize: 13 }}>{t('proj.empty')}</span>;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
        <span className="muted">{open} {t('proj.open')} · {done} {t('proj.done')}</span>
        <span className="pixel" aria-hidden="true">{pct}%</span>
      </div>
      <div role="progressbar" aria-label={t('proj.progress')} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
        style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)', transition: 'width 300ms var(--ease-out)' }} />
      </div>
    </div>
  );
}

function Deadline({ p }: { p: ProjectView }) {
  const { t, locale } = useT();
  if (!p.deadline) return null;
  const late = p.open > 0 && p.deadline < isoDay();
  return (
    <span className={'chip' + (late ? ' warn' : '')}>
      {new Date(p.deadline + 'T12:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })}{late ? ' · ' + t('proj.late') : ''}
    </span>
  );
}

function Detail({ p, onClose, onSaved }: { p: ProjectView; onClose: () => void; onSaved: (id: string) => void }) {
  const s = useAll();
  const { t } = useT();
  const [name, setName] = useState(p.name);
  const [goal, setGoal] = useState(p.goal);
  const [deadline, setDeadline] = useState(p.deadline);
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');
  const same = (x: string) => x.trim().toLocaleLowerCase() === p.name.trim().toLocaleLowerCase();
  const tasks = s.tasks.filter((x) => same(x.project));
  const open = tasks.filter((x) => !x.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  const done = tasks.filter((x) => x.done);
  const dirty = name.trim() !== p.name || goal !== p.goal || deadline !== p.deadline;

  return (
    <section className="glass panel" aria-labelledby="pd-h">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <h2 id="pd-h" className="h2" style={{ fontSize: 24, overflowWrap: 'anywhere' }}>{p.name}</h2>
        <button type="button" className="btn ghost icon" aria-label={t('proj.close')} onClick={onClose}><Icon name="x" /></button>
      </div>
      <Progress open={open.length} done={done.length} />

      <form className="wrap" style={{ gap: 12, alignItems: 'flex-end' }} onSubmit={(e) => {
        e.preventDefault();
        const n = name.trim();
        if (!n) return;
        const clash = projectViews(s).some((x) => x.id !== p.id && x.name.trim().toLocaleLowerCase() === n.toLocaleLowerCase());
        if (clash) { setMsg(t('proj.exists')); return; }
        setMsg('');
        onSaved(actions.saveProject({ id: p.id, name: n, goal: goal.trim(), deadline, archived: p.archived, createdAt: p.createdAt }, p.name));
        toast(t('toast.saved'));
      }}>
        <label className="field" style={{ flex: '1 1 180px' }}>{t('proj.name')}<input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} /></label>
        <label className="field" style={{ flex: '2 1 260px' }}>{t('proj.goal')}<input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={200} /></label>
        <label className="field" style={{ flex: '1 1 150px' }}>{t('proj.deadline')}<input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
        <button type="submit" className="btn cta" disabled={!dirty || !name.trim()}>{t('common.save')}</button>
      </form>
      {msg && <p role="alert" style={{ margin: 0, fontSize: 14, color: '#ffd3dc' }}>{msg}</p>}

      <form className="wrap" style={{ gap: 12, alignItems: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--line)' }} onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        actions.addTask(title, p.name, '');
        setTitle('');
      }}>
        <label className="field" style={{ flex: '1 1 260px' }}>{t('proj.addTask')}<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></label>
        <button type="submit" className="btn" disabled={!title.trim()}><Icon name="plus" />{t('common.add')}</button>
      </form>

      <div className="divide">
        {open.map((x) => <TaskRow key={x.id} task={x} />)}
        {done.map((x) => <TaskRow key={x.id} task={x} />)}
        {tasks.length === 0 && <p className="muted" style={{ margin: 0, padding: '12px 0' }}>{t('proj.noNext')}</p>}
      </div>

      <div className="wrap" style={{ paddingTop: 14, borderTop: '1px solid var(--line)', alignItems: 'center' }}>
        <button type="button" className="btn" onClick={() => {
          onSaved(actions.saveProject({ id: p.id, name: p.name, goal: p.goal, deadline: p.deadline, archived: !p.archived, createdAt: p.createdAt }, p.name));
          toast(p.archived ? t('proj.unarchive') : t('proj.archived'));
          if (!p.archived) onClose();
        }}>{p.archived ? t('proj.unarchive') : t('proj.archive')}</button>
        {!p.implicit && (
          <button type="button" className="btn danger" disabled={tasks.length > 0} onClick={() => {
            actions.deleteProject(p);
            toast(t('toast.deleted'), lastLogId());
            onClose();
          }}><Icon name="trash" />{t('proj.delete')}</button>
        )}
        {!p.implicit && tasks.length > 0 && <span className="faint">{t('proj.deleteHint')}</span>}
      </div>
    </section>
  );
}

export default function ProjectsPage() {
  const s = useAll();
  const { t } = useT();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [msg, setMsg] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const all = projectViews(s);
  const active = all.filter((p) => !p.archived);
  const archived = all.filter((p) => p.archived);
  const sel = all.find((p) => p.id === openId);

  return (
    <main id="inhoud" tabIndex={-1} className="main">
      <PageHeader title={t('proj.title')} sub={t('proj.sub')} />
      <TaskTabs />

      {sel ? <Detail key={sel.id + sel.name} p={sel} onClose={() => setOpenId(null)} onSaved={setOpenId} /> : (
        <form className="glass panel" onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim();
          if (!n) return;
          if (all.some((p) => p.name.trim().toLocaleLowerCase() === n.toLocaleLowerCase())) { setMsg(t('proj.exists')); return; }
          setMsg('');
          actions.addProject(n, goal, deadline);
          setName(''); setGoal(''); setDeadline('');
        }}>
          <h2 className="h2">{t('proj.new')}</h2>
          <div className="wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
            <label className="field" style={{ flex: '1 1 180px' }}>{t('proj.name')}<input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label>
            <label className="field" style={{ flex: '2 1 260px' }}>{t('proj.goal')}<input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={200} /></label>
            <label className="field" style={{ flex: '1 1 150px' }}>{t('proj.deadline')}<input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
            <button type="submit" className="btn cta" disabled={!name.trim()}><Icon name="plus" />{t('common.add')}</button>
          </div>
          {msg && <p role="alert" style={{ margin: 0, fontSize: 14, color: '#ffd3dc' }}>{msg}</p>}
        </form>
      )}

      {active.length === 0 && !sel && <section className="glass panel"><p className="muted" style={{ margin: 0 }}>{t('proj.none')}</p></section>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 16 }}>
        {active.map((p) => (
          <article key={p.id} className="glass panel" aria-labelledby={'p-' + p.id}
            style={{ borderColor: p.id === openId ? 'var(--accent)' : undefined }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 id={'p-' + p.id} className="pixel" style={{ margin: 0, fontSize: 20, overflowWrap: 'anywhere' }}>{p.name}</h3>
              <Deadline p={p} />
            </div>
            {p.goal && <p className="muted" style={{ margin: 0, fontSize: 14 }}>{p.goal}</p>}
            <Progress open={p.open} done={p.done} />
            <div className="faint">{t('proj.next')}</div>
            {p.next ? (
              <label className="row" style={{ gap: 10, cursor: 'pointer', marginTop: -6 }}>
                <input type="checkbox" className="check" checked={false} onChange={() => actions.toggleTask(p.next!)} />
                <span style={{ overflowWrap: 'anywhere' }}>{p.next.title}</span>
              </label>
            ) : <span className="muted" style={{ fontSize: 14, marginTop: -6 }}>{t('proj.noNext')}</span>}
            <button type="button" className="btn" style={{ marginTop: 'auto', alignSelf: 'flex-start' }} onClick={() => { setOpenId(p.id); window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}>
              {t('proj.view')}
            </button>
          </article>
        ))}
      </div>

      {archived.length > 0 && (
        <section className="glass panel" aria-label={t('proj.archived')}>
          <button type="button" className="btn small" style={{ alignSelf: 'flex-start' }} aria-expanded={showArchived} onClick={() => setShowArchived(!showArchived)}>
            {t('proj.archived')} · {archived.length}
          </button>
          {showArchived && (
            <div className="divide">
              {archived.map((p) => (
                <div key={p.id} className="list-item">
                  <span style={{ flex: 1, overflowWrap: 'anywhere' }}>{p.name}</span>
                  <span className="faint">{p.done} {t('proj.done')}</span>
                  <button type="button" className="btn small" onClick={() => setOpenId(p.id)}>{t('proj.view')}</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
