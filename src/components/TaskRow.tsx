'use client';
import { useState } from 'react';
import Icon from './Icon';
import { isoDay } from '@/lib/core';
import { useT } from '@/lib/i18n';
import { actions, lastLogId } from '@/lib/store';
import { toast } from '@/lib/toast';
import type { Task } from '@/lib/types';

/** One task: tick it off, edit it in place, or delete it (with undo). */
export default function TaskRow({ task }: { task: Task }) {
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
