"use client";
import { useEffect, useState } from "react";

const KEY = "qir_lab_passed_v1";
const RUNS_KEY = "qir_lab_runs_v1";
const EVENT = "qir-lab-progress";

export interface LabRunRecord {
  /** number of runs of this lab in this browser */
  runs: number;
  lastAt: number;
  /** verdict of the last run */
  lastOk: boolean;
  lastMode: "browser" | "github";
  lastTests: string;
  /** first time the scenario passed, if ever */
  passedAt?: number;
}

function read(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function readRuns(): Record<string, LabRunRecord> {
  try {
    return JSON.parse(localStorage.getItem(RUNS_KEY) || "{}");
  } catch {
    return {};
  }
}
const notify = () => window.dispatchEvent(new Event(EVENT));

export function markLabPassed(id: string) {
  try {
    const cur = read();
    if (!cur[id]) {
      cur[id] = Date.now();
      localStorage.setItem(KEY, JSON.stringify(cur));
    }
    notify();
  } catch {
    /* storage unavailable */
  }
}

/** Records every run (passed or not) so the Progress page shows what was attempted and when. */
export function recordLabRun(id: string, run: { ok: boolean; mode: "browser" | "github"; passedTests: number; totalTests: number }) {
  try {
    const all = readRuns();
    const prev = all[id];
    all[id] = {
      runs: (prev?.runs || 0) + 1,
      lastAt: Date.now(),
      lastOk: run.ok,
      lastMode: run.mode,
      lastTests: `${run.passedTests}/${run.totalTests}`,
      passedAt: prev?.passedAt || (run.ok ? Date.now() : undefined),
    };
    localStorage.setItem(RUNS_KEY, JSON.stringify(all));
    if (run.ok) markLabPassed(id);
    else notify();
  } catch {
    /* storage unavailable */
  }
}

function useStore<T>(reader: () => T, empty: T) {
  const [value, setValue] = useState<T>(empty);
  useEffect(() => {
    const sync = () => setValue(reader());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

export function useLabPassed() {
  return useStore(read, {});
}

export function useLabRuns() {
  return useStore(readRuns, {});
}

export function clearLabProgress() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(RUNS_KEY);
    notify();
  } catch {
    /* ignore */
  }
}
