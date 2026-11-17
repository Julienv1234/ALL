'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import TaskRow from '@/components/TaskRow';
import TaskTabs from '@/components/TaskTabs';
import PageHeader from '@/components/Page';
import { projectViews } from '@/lib/core';
import { useT } from '@/lib/i18n';
import { actions, useAll } from '@/lib/store';
import type { Task } from '@/lib/types';

export default function TasksPage() {
  const s = useAll();
  const { t } = useT();
  const [title, setTitle] = useState('');
  const [project, setProject] = useState('');
  const [due, setDue] = useState('');
  const [filter, setFilter] = useState('');
  const newTitle = useRef<HTMLInputElement>(null);
  // Opened from the command window with #nieuw: start typing a new task straight away.
  useEffect(() => { if (location.hash === '#nieuw') newTitle.current?.focus(); }, []);

  const f = filter.trim().toLowerCase();
  const match = (x: Task) => !f || x.title.toLowerCase().includes(f) || x.project.toLowerCase().includes(f);
  const byDue = (a: Task, b: Task) => (a.due || '9999').localeCompare(b.due || '9999') || b.createdAt.localeCompare(a.createdAt);
  const open = s.tasks.filter((x) => !x.done && match(x)).sort(byDue);
  const done = s.tasks.filter((x) => x.done && match(x)).sort((a, b) => b.doneAt.localeCompare(a.doneAt));
  const projects = projectViews(s).filter((p) => !p.archived).map((p) => p.name);

  return (
    <main id="inhoud" tabIndex={-1} className="main">
      <PageHeader title={t('tasks.title')} sub={t('tasks.sub')} />
      <TaskTabs />

      <form className="glass panel" onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        actions.addTask(title, project, due);
        setTitle(''); setDue('');
      }}>
        <h2 className="h2">{t('tasks.new')}</h2>
        <div className="wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '3 1 240px' }}>{t('common.title')}
            <input ref={newTitle} className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
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
