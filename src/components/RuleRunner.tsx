'use client';
import { useEffect, useRef } from 'react';
import { useT } from '@/lib/i18n';
import { actions, useReady } from '@/lib/store';
import { toast } from '@/lib/toast';

/**
 * Lets the workflows (and scheduled agents) fire: when the app opens, when you come back to it,
 * and every 15 minutes while it is open. Each moment fires only once (it is remembered), so this is safe to repeat.
 */
export default function RuleRunner() {
  const ready = useReady();
  const { t } = useT();
  const tr = useRef(t);
  tr.current = t;
  useEffect(() => {
    if (!ready) return;
    const run = () => {
      const n = actions.runRules() + actions.runAgents();
      if (n) toast(n === 1 ? tr.current('bg.firedOne') : `${n} ${tr.current('bg.firedMany')}`);
    };
    run();
    const onVis = () => { if (document.visibilityState === 'visible') run(); };
    document.addEventListener('visibilitychange', onVis);
    const id = setInterval(run, 15 * 60_000);
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(id); };
  }, [ready]);
  return null;
}
