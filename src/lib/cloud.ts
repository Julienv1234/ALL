'use client';
/**
 * Supabase: login and cloud copy of the whole ALL state.
 * When the two NEXT_PUBLIC_ variables are missing, ALL simply keeps working on this device only.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { parseState } from './core';
import { getState, onLocalChange, replaceFromCloud } from './store';
import type { State } from './types';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';


let client: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  if (!client) {
    client = createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'all.auth' },
    });
  }
  return client;
}

/* ---------- sync status, readable from React ---------- */

export type SyncStatus = 'off' | 'synced' | 'saving' | 'offline' | 'error';
let status: SyncStatus = 'off';
let lastSyncedAt = '';
const statusListeners = new Set<() => void>();
function setStatus(s: SyncStatus) {
  status = s;
  if (s === 'synced') lastSyncedAt = new Date().toISOString();
  statusListeners.forEach((l) => l());
}
export function useSyncStatus() {
  const s = useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => status,
    () => 'off' as SyncStatus,
  );
  return { status: s, lastSyncedAt };
}

/* ---------- reading and writing the cloud copy ---------- */

export interface CloudCopy {
  state: State | null;
  updatedAt: string | null;
}

export async function fetchCloud(userId: string): Promise<CloudCopy> {
  const { data, error } = await sb().from('user_state').select('state, updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return { state: null, updatedAt: null };
  return { state: parseState(data.state), updatedAt: data.updated_at as string };
}

export async function pushCloud(userId: string, s: State): Promise<string> {
  const { data, error } = await sb()
    .from('user_state')
    .upsert({ user_id: userId, state: s }, { onConflict: 'user_id' })
    .select('updated_at')
    .single();
  if (error) throw error;
  return data.updated_at as string;
}

/* ---------- keeping this device and the cloud in step ---------- */

/**
 * After the first sync: every change here goes up (bundled, 1.2 s later),
 * and newer cloud copies come down when you return to the app or once a minute.
 */
export function startSync(userId: string, cloudUpdatedAt: string | null): () => void {
  let known = cloudUpdatedAt;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending = false;
  let busy = false;
  let stopped = false;

  const push = async () => {
    if (stopped || busy) return;
    if (!navigator.onLine) { setStatus('offline'); return; }
    busy = true;
    pending = false;
    setStatus('saving');
    try {
      known = await pushCloud(userId, getState());
      setStatus(pending ? 'saving' : 'synced');
    } catch {
      pending = true;
      setStatus(navigator.onLine ? 'error' : 'offline');
    } finally {
      busy = false;
      if (pending && !stopped) schedule(4000);
    }
  };
  const schedule = (ms = 1200) => {
    pending = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(push, ms);
  };
  const pull = async () => {
    if (stopped || pending || busy || !navigator.onLine) return;
    try {
      const c = await fetchCloud(userId);
      if (stopped || pending || busy) return;
      if (c.state && c.updatedAt && (!known || c.updatedAt > known)) {
        known = c.updatedAt;
        replaceFromCloud(c.state);
      }
      setStatus('synced');
    } catch {
      setStatus(navigator.onLine ? 'error' : 'offline');
    }
  };

  const offChange = onLocalChange(() => schedule());
  const onFocus = () => { if (document.visibilityState === 'visible') pull(); };
  const onOnline = () => (pending ? push() : pull());
  const onOffline = () => setStatus('offline');
  document.addEventListener('visibilitychange', onFocus);
  window.addEventListener('focus', onFocus);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  const every = setInterval(pull, 60_000);
  setStatus(navigator.onLine ? 'synced' : 'offline');

  return () => {
    stopped = true;
    offChange();
    if (timer) clearTimeout(timer);
    clearInterval(every);
    document.removeEventListener('visibilitychange', onFocus);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    setStatus('off');
  };
}

/** Signs out on this device only; other devices stay signed in. */
export async function signOutHere() {
  await sb().auth.signOut({ scope: 'local' });
}

export function qrSrc(qr: string): string {
  return qr.startsWith('data:') ? qr : 'data:image/svg+xml;utf8,' + encodeURIComponent(qr);
}
