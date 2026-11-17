'use client';
import { useState } from 'react';
import Icon from '@/components/Icon';
import PageHeader from '@/components/Page';
import { isoDay } from '@/lib/core';
import { useT } from '@/lib/i18n';
import { actions, lastLogId, useAll } from '@/lib/store';
import { toast } from '@/lib/toast';
import type { Task } from '@/lib/types';

function TaskRow({ task }: { task: Task }) {
  const { t, locale } = useT();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [project, setProject] = useState(task.project);
  const [due, setDue] = useState(task.due);
  const overdue = !task.done && task.due && task.due < isoDay();

  if (editing) {
    return (
      <form className="list-item" style={{ flexWrap: 'wrap' }} onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        actions.updateTask({ ...task, title: title.trim(), project: project.trim(), due });
        setEditing(false);
      }}>
        <label className="field" style={{ flex: '3 1 220px' }}>{t('common.title')}
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required maxLength={200} />
        </label>
        <label className="field" style={{ flex: '1 1 120px' }}>{t('tasks.project')}
          <input className="input" value={project} onChange={(e) => setProject(e.target.value)} maxLength={60} />
        </label>
        <label className="field" style={{ flex: '1 1 140px' }}>{t('tasks.due')}
          <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <div className="wrap" style={{ alignSelf: 'flex-end' }}>
          <button type="submit" className="btn cta">{t('common.save')}</button>
          <button type="button" className="btn" onClick={() => { setEditing(false); setTitle(task.title); setProject(task.project); setDue(task.due); }}>{t('common.cancel')}</button>
        </div>
      </form>
    );
  }

  return (
    <div className="list-item">
      <input type="checkbox" className="check" id={'t-' + task.id} checked={task.done} onChange={() => actions.toggleTask(task)} />
      <label htmlFor={'t-' + task.id} style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ textDecoration: task.done ? 'line-through' : 'none', color: task.done ? 'var(--ink-3)' : undefined, overflowWrap: 'anywhere' }}>{task.title}</span>
        {(task.project || task.due) && (
          <span className="wrap" style={{ gap: 6 }}>
            {task.project && <span className="chip">{task.project}</span>}
            {task.due && (
              <span className={'chip' + (overdue ? ' warn' : '')}>
                {new Date(task.due + 'T12:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })}{overdue ? ' · ' + t('tasks.overdue') : ''}
              </span>
            )}
          </span>
        )}
      </label>
      <button type="button" className="btn ghost icon" aria-label={`${t('common.edit')}: ${task.title}`} onClick={() => { setTitle(task.title); setProject(task.project); setDue(task.due); setEditing(true); }}><Icon name="edit" /></button>
      <button type="button" className="btn ghost icon" aria-label={`${t('common.delete')}: ${task.title}`} onClick={() => {
        actions.deleteTask(task);
        toast(t('toast.deleted'), lastLogId());
      }}><Icon name="trash" /></button>
    </div>
  );
}

export default function TasksPage() {
  const s = useAll();
  const { t } = useT();
  const [title, setTitle] = useState('');
  const [project, setProject] = useState('');
  const [due, setDue] = useState('');
  const [filter, setFilter] = useState('');

  const f = filter.trim().toLowerCase();
  const match = (x: Task) => !f || x.title.toLowerCase().includes(f) || x.project.toLowerCase().includes(f);
  const byDue = (a: Task, b: Task) => (a.due || '9999').localeCompare(b.due || '9999') || b.createdAt.localeCompare(a.createdAt);
  const open = s.tasks.filter((x) => !x.done && match(x)).sort(byDue);
  const done = s.tasks.filter((x) => x.done && match(x)).sort((a, b) => b.doneAt.localeCompare(a.doneAt));
  const projects = [...new Set(s.tasks.map((x) => x.project).filter(Boolean))];

  return (
    <main className="main">
      <PageHeader title={t('tasks.title')} sub={t('tasks.sub')} />

      <form className="glass panel" onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        actions.addTask(title, project, due);
        setTitle(''); setDue('');
      }}>
        <h2 className="h2">{t('tasks.new')}</h2>
        <div className="wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '3 1 240px' }}>{t('common.title')}
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </label>
          <label className="field" style={{ flex: '1 1 140px' }}>{t('tasks.project')}
            <input className="input" list="projects" value={project} onChange={(e) => setProject(e.target.value)} maxLength={60} />
            <datalist id="projects">{projects.map((p) => <option key={p} value={p} />)}</datalist>
          </label>
          <label className="field" style={{ flex: '1 1 150px' }}>{t('tasks.due')}
            <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <button type="submit" className="btn cta" disabled={!title.trim()}><Icon name="plus" />{t('common.add')}</button>
        </div>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <section className="glass panel" style={{ flex: '2 1 420px', minWidth: 0 }} aria-labelledby="open-h">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <h2 id="open-h" className="h2">{t('tasks.open')} · {open.length}</h2>
            <label className="sr-only" htmlFor="tf">{t('tasks.filter')}</label>
            <input id="tf" className="input" type="search" placeholder={t('tasks.filter')} value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 220, minHeight: 38 }} />
          </div>
          <div className="divide">
            {open.length ? open.map((x) => <TaskRow key={x.id} task={x} />) : <p className="muted" style={{ margin: 0, padding: '12px 0' }}>{t('tasks.none')}</p>}
          </div>
        </section>
        <section className="glass panel" style={{ flex: '1 1 300px', minWidth: 0 }} aria-labelledby="done-h">
          <h2 id="done-h" className="h2">{t('tasks.done')} · {done.length}</h2>
          <div className="divide">
            {done.length ? done.map((x) => <TaskRow key={x.id} task={x} />) : <p className="muted" style={{ margin: 0, padding: '12px 0' }}>{t('tasks.doneNone')}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
