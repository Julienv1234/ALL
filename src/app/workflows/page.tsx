'use client';
import Later from '@/components/Later';
import { useT } from '@/lib/i18n';

export default function WorkflowsPage() {
  const { t, lang } = useT();
  return (
    <Later title="flows.title" sub="flows.sub" items={[
      { img: 'mail', name: t('mod.mail'), phase: 3, text: t('mod.mail.text') },
      { img: 'perceel', name: lang === 'en' ? 'Workflow builder' : 'Workflow-bouwer', phase: 3,
        text: lang === 'en' ? 'For example: when mail from X arrives, write a reply draft. You approve it.' : 'Bijvoorbeeld: als er een mail van X komt, schrijf een antwoordconcept. Jij keurt het goed.' },
    ]} />
  );
}
