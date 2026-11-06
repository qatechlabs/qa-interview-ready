"use client";
import { useCallback, useSyncExternalStore } from "react";
import type { LevelId, TopicId } from "@/content/types";

export type Grade = "nailed" | "shaky" | "missed";

export interface MockRound {
  id: string;
  level: LevelId;
  at: number;
  /** Per-question result in the order asked. */
  results: { id: string; topic: TopicId; grade: Grade }[];
}

const KEY = "qir_mock_v1";
const MAX_ROUNDS = 30;
const EMPTY: MockRound[] = [];
const listeners = new Set<() => void>();
let cache: MockRound[] | null = null;

function read(): MockRound[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: MockRound[]) {
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

export function useMockHistory() {
  const rounds = useSyncExternalStore(subscribe, read, () => EMPTY);
  const addRound = useCallback((round: MockRound) => write([round, ...read()].slice(0, MAX_ROUNDS)), []);
  const clear = useCallback(() => write([]), []);
  return { rounds, addRound, clear };
}

export function scoreOf(round: MockRound) {
  const pts = round.results.reduce((s, r) => s + (r.grade === "nailed" ? 1 : r.grade === "shaky" ? 0.5 : 0), 0);
  return round.results.length ? Math.round((pts / round.results.length) * 100) : 0;
}

/** Topics ranked weakest first across recent rounds: share of answers that were not nailed. */
export function weakTopics(rounds: MockRound[], min = 2) {
  const acc: Partial<Record<TopicId, { n: number; miss: number }>> = {};
  for (const r of rounds) for (const x of r.results) {
    const a = (acc[x.topic] ||= { n: 0, miss: 0 });
    a.n++;
    if (x.grade !== "nailed") a.miss++;
  }
  return (Object.entries(acc) as [TopicId, { n: number; miss: number }][])
    .filter(([, a]) => a.n >= min && a.miss > 0)
    .map(([topic, a]) => ({ topic, n: a.n, missRate: a.miss / a.n }))
    .sort((a, b) => b.missRate - a.missRate);
}
