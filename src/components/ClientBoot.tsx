'use client';
import { useEffect } from 'react';
import { useAll } from '@/lib/store';

/** Keeps <html lang> in step with the chosen language and registers the offline worker. */
export default function ClientBoot() {
  const lang = useAll().settings.lang;
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
