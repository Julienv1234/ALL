'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/lib/i18n';

/** Switch between the task list and projects. */
export default function TaskTabs() {
  const { t } = useT();
  const path = usePathname() || '';
  const onProjects = path.startsWith('/projecten');
  return (
    <nav className="glass seg" aria-label={t('tasks.views')} style={{ alignSelf: 'flex-start' }}>
      <Link className="btn" href="/taken/" aria-current={!onProjects ? 'page' : undefined}>{t('tasks.title')}</Link>
      <Link className="btn" href="/projecten/" aria-current={onProjects ? 'page' : undefined}>{t('proj.title')}</Link>
    </nav>
  );
}
