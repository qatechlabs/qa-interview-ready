"use client";
import { useCallback, useSyncExternalStore } from "react";

export type ProgressKind = "done" | "bookmarks" | "again";
export type ProgressState = Record<ProgressKind, Record<string, number>>;

const KEY = "qir_progress_v1";
const EMPTY: ProgressState = { done: {}, bookmarks: {}, again: {} };
const listeners = new Set<() => void>();
let cache: ProgressState | null = null;

function read(): ProgressState {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    cache = { done: parsed.done || {}, bookmarks: parsed.bookmarks || {}, again: parsed.again || {} };
  } catch {
    cache = { ...EMPTY };
  }
  return cache;
}

function write(next: ProgressState) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: keep in memory for this visit */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useProgress() {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toggle = useCallback((kind: ProgressKind, id: string, value?: boolean) => {
    const cur = read();
    const on = value ?? !cur[kind][id];
    const bucket = { ...cur[kind] };
    if (on) bucket[id] = Date.now();
    else delete bucket[id];
    write({ ...cur, [kind]: bucket });
  }, []);
  const reset = useCallback(() => write({ done: {}, bookmarks: {}, again: {} }), []);
  return { state, toggle, reset };
}
