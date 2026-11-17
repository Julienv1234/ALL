'use client';
import Later from '@/components/Later';
import { useT } from '@/lib/i18n';

export default function AgentsPage() {
  const { t } = useT();
  return (
    <Later title="agents.title" sub="agents.sub" items={[
      { img: 'assistent', name: t('mod.assistent'), phase: 2, text: t('mod.assistent.text') },
      { img: 'briefing', name: t('mod.briefing'), phase: 4, text: t('mod.briefing.text') },
      { img: 'onderzoeker', name: t('mod.onderzoeker'), phase: 4, text: t('mod.onderzoeker.text') },
    ]} />
  );
}
