'use client';
import { useSyncExternalStore } from 'react';

export interface Toast {
  id: number;
  text: string;
  undoLogId?: string;
}

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string, undoLogId?: string) {
  const id = ++seq;
  toasts = [...toasts.slice(-2), { id, text, undoLogId }];
  emit();
  setTimeout(() => dismiss(id), 5000);
}

export function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const EMPTY: Toast[] = [];
export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => EMPTY,
  );
}
