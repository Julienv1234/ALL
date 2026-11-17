'use client';
/**
 * System notifications (the messages your phone or computer shows). They only work while ALL is open,
 * also in a background tab. Messages while ALL is fully closed need a server (push), which comes with the cloud.
 */
export type Perm = 'granted' | 'denied' | 'default' | 'unsupported';

export function perm(): Perm {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as Perm;
}

export async function askPerm(): Promise<Perm> {
  if (perm() === 'unsupported') return 'unsupported';
  try {
    return (await Notification.requestPermission()) as Perm;
  } catch {
    return perm();
  }
}

const SENT = 'all.notified';

/** True the first time a key is seen on this device, so the same reminder never shows twice (also across tabs). */
export function firstTime(key: string): boolean {
  try {
    const list: string[] = JSON.parse(localStorage.getItem(SENT) || '[]');
    if (list.includes(key)) return false;
    localStorage.setItem(SENT, JSON.stringify([key, ...list].slice(0, 300)));
    return true;
  } catch {
    return true;
  }
}

export async function notify(title: string, body: string, tag: string): Promise<boolean> {
  if (perm() !== 'granted') return false;
  const opts: NotificationOptions = { body, tag, icon: '/icon-192.png', badge: '/favicon-32.png' };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) { await reg.showNotification(title, opts); return true; }
  } catch { /* fall through to a plain notification */ }
  try {
    const n = new Notification(title, opts);
    n.onclick = () => { window.focus(); n.close(); };
    return true;
  } catch {
    return false;
  }
}
