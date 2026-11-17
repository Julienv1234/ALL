'use client';
/**
 * Focus timer. Only the start moment is stored, so it keeps counting when you switch
 * pages, close the tab or lock your phone. Remaining time is always worked out from the clock.
 */
import { useSyncExternalStore } from 'react';
import { isoDay } from './core';

export interface Timer {
  subjectId: string;
  minutes: number;
  startedAt: number;
  pausedAt: number | null;
  pausedTotal: number;
}

const KEY = 'all.timer';
let cur: Timer | null = null;
let loaded = false;
const listeners = new Set<() => void>();
let tick: ReturnType<typeof setInterval> | null = null;
let now = 0;

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    const t = raw ? JSON.parse(raw) : null;
    cur = t && typeof t.startedAt === 'number' && typeof t.minutes === 'number' && typeof t.subjectId === 'string' ? t : null;
  } catch {
    cur = null;
  }
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    emit();
  });
}

function save() {
  try {
    if (cur) localStorage.setItem(KEY, JSON.stringify(cur));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage full or blocked: the timer still works until reload */
  }
}

function emit() {
  now = Date.now();
  listeners.forEach((l) => l());
}

function ensureTick() {
  if (tick || typeof window === 'undefined') return;
  tick = setInterval(() => { if (cur && cur.pausedAt === null) emit(); }, 1000);
}

export function elapsedMs(t: Timer, at = Date.now()): number {
  return at - t.startedAt - t.pausedTotal - (t.pausedAt !== null ? at - t.pausedAt : 0);
}

export function remainingMs(t: Timer, at = Date.now()): number {
  return Math.max(0, t.minutes * 60_000 - elapsedMs(t, at));
}

export const timer = {
  get: (): Timer | null => { load(); return cur; },
  start(subjectId: string, minutes: number) {
    load();
    cur = { subjectId, minutes, startedAt: Date.now(), pausedAt: null, pausedTotal: 0 };
    save(); emit();
  },
  pause() {
    if (!cur || cur.pausedAt !== null) return;
    cur = { ...cur, pausedAt: Date.now() };
    save(); emit();
  },
  resume() {
    if (!cur || cur.pausedAt === null) return;
    cur = { ...cur, pausedTotal: cur.pausedTotal + (Date.now() - cur.pausedAt), pausedAt: null };
    save(); emit();
  },
  /**
   * Ends the timer and returns how many whole minutes were studied, on the day it started.
   * Returns null if another tab already ended this timer, so a session is never saved twice.
   */
  stop(): { subjectId: string; minutes: number; date: string } | null {
    const t = cur;
    if (!t) return null;
    try {
      const raw = localStorage.getItem(KEY);
      const stored = raw ? JSON.parse(raw) : null;
      if (!stored || stored.startedAt !== t.startedAt) { cur = stored; emit(); return null; }
    } catch { /* storage blocked: trust memory */ }
    const done = { subjectId: t.subjectId, minutes: Math.min(t.minutes, Math.floor(elapsedMs(t) / 60_000)), date: isoDay(new Date(t.startedAt)) };
    cur = null;
    save(); emit();
    return done;
  },
  clear() { cur = null; save(); emit(); },
};

/** Re-renders every second while the timer runs. */
export function useTimer(): { t: Timer | null; now: number } {
  const t = useSyncExternalStore(
    (l) => { load(); ensureTick(); listeners.add(l); return () => listeners.delete(l); },
    () => { load(); return cur; },
    () => null,
  );
  const n = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => now || Date.now(),
    () => 0,
  );
  return { t, now: n };
}

export function fmt(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
