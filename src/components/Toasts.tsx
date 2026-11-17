'use client';
import { actions } from '@/lib/store';
import { dismiss, useToasts } from '@/lib/toast';
import { useT } from '@/lib/i18n';
import Icon from './Icon';

export default function Toasts() {
  const list = useToasts();
  const { t } = useT();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((x) => (
        <div key={x.id} className="glass toast">
          <span style={{ flex: 1 }}>{x.text}</span>
          {x.undoLogId && (
            <button type="button" className="btn small" onClick={() => { actions.undo(x.undoLogId!); dismiss(x.id); }}>
              {t('common.undo')}
            </button>
          )}
          <button type="button" className="btn small icon" style={{ width: 36 }} aria-label={t('common.close')} onClick={() => dismiss(x.id)}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
