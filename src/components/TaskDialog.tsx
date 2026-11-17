'use client';
import { forwardRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { actions } from '@/lib/store';
import { toast } from '@/lib/toast';

/** Quick "add task" dialog, opened from the city screen. */
const TaskDialog = forwardRef<HTMLDialogElement, { onDone?: (id: string) => void }>(function TaskDialog({ onDone }, ref) {
  const { t } = useT();
  const [title, setTitle] = useState('');
  const [project, setProject] = useState('');
  const [due, setDue] = useState('');
  const close = () => (ref && 'current' in ref ? ref.current?.close() : undefined);

  return (
    <dialog ref={ref} className="glass" aria-labelledby="td-h" onClose={() => { setTitle(''); setProject(''); setDue(''); }}>
      <form method="dialog" className="panel" onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const task = actions.addTask(title, project, due);
        toast(t('toast.saved'));
        onDone?.(task.id);
        close();
      }}>
        <h2 id="td-h" className="h2">{t('tasks.new')}</h2>
        <label className="field">{t('common.title')}
          <input className="input" required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </label>
        <div className="wrap" style={{ gap: 12 }}>
          <label className="field" style={{ flex: '1 1 160px' }}>{t('tasks.project')}
            <input className="input" value={project} onChange={(e) => setProject(e.target.value)} maxLength={60} />
          </label>
          <label className="field" style={{ flex: '1 1 160px' }}>{t('tasks.due')}
            <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
        </div>
        <div className="wrap" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={close}>{t('common.cancel')}</button>
          <button type="submit" className="btn cta" disabled={!title.trim()}>{t('common.add')}</button>
        </div>
      </form>
    </dialog>
  );
});

export default TaskDialog;
