/**
 * Client-side glue between a lab run and its outputs: the report tab (opened on the Run click so
 * browsers allow it, filled when the run finishes) and the evidence .docx download.
 */
import type { LogEntry, RunResult } from "./runtime";
import { buildReportHtml, placeholderHtml, type ReportModel, type ReportStep, type ReportTest } from "./report";

export interface RunPrefs {
  openReport: boolean;
  downloadEvidence: boolean;
}
const PREFS_KEY = "qir_lab_run_prefs";
export function loadPrefs(): RunPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { openReport: true, downloadEvidence: true, ...(JSON.parse(raw) as Partial<RunPrefs>) };
  } catch {
    /* ignore */
  }
  return { openReport: true, downloadEvidence: true };
}
export function savePrefs(p: RunPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** Must be called synchronously inside the click handler, before any await. */
export function openReportWindow(title: string): Window | null {
  try {
    const w = window.open("", "qir-lab-report");
    if (!w) return null;
    w.document.open();
    w.document.write(placeholderHtml(title));
    w.document.close();
    return w;
  } catch {
    return null;
  }
}

export function appendLiveLog(w: Window | null, e: LogEntry) {
  if (!w || w.closed) return;
  try {
    const pre = w.document.getElementById("log");
    if (!pre) return;
    const mark = e.kind === "pass" ? "✓" : e.kind === "fail" || e.kind === "error" ? "✗" : e.kind === "test" ? "▸" : "·";
    pre.textContent += `${mark} ${e.text}${e.ms != null && e.ms > 20 ? `  (${e.ms}ms)` : ""}\n`;
    pre.scrollTop = pre.scrollHeight;
  } catch {
    /* the tab may have navigated away */
  }
}

/** Writes the final report into the tab opened at the start (or a fresh one when called from a click). */
export function showReport(w: Window | null, model: ReportModel): Window | null {
  const html = buildReportHtml(model);
  let target = w && !w.closed ? w : null;
  if (!target) {
    try {
      target = window.open("", "qir-lab-report");
    } catch {
      target = null;
    }
  }
  if (!target) return null;
  try {
    target.document.open();
    target.document.write(html);
    target.document.close();
    return target;
  } catch {
    return null;
  }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Groups the run log into tests and steps for the in-browser runtime, attaching screenshots by log index. */
export function modelFromLog(entries: LogEntry[], shots: Map<number, string | null>, result: RunResult): ReportTest[] {
  const tests: ReportTest[] = [];
  let cur: ReportTest | null = null;
  const byName = new Map(result.tests.map((t) => [t.name, t]));
  entries.forEach((e, i) => {
    if (e.kind === "test") {
      const r = byName.get(e.text);
      cur = { name: e.text, status: r ? (r.ok ? "passed" : "failed") : "passed", error: r?.error, steps: [] };
      tests.push(cur);
      return;
    }
    if (!cur) return;
    if (e.kind === "info" && !e.text.startsWith("step: ")) return;
    if (/^\d+\/\d+ tests passed/.test(e.text)) return; // the run summary line
    const step: ReportStep = {
      title: e.text.replace(/^step: /, "Step: "),
      status: e.kind === "fail" || e.kind === "error" ? "failed" : e.kind === "info" ? "info" : "passed",
      durationMs: e.ms,
      screenshot: shots.get(i) || undefined,
    };
    if (step.status === "failed" && e.kind === "error") step.error = e.text;
    cur.steps.push(step);
  });
  // tests the runtime reported but never logged (e.g. compile errors before the first test)
  for (const t of result.tests) if (!tests.some((x) => x.name === t.name)) tests.push({ name: t.name, status: t.ok ? "passed" : "failed", error: t.error, steps: [] });
  for (const t of tests) {
    const dur = t.steps.reduce((a, s) => a + (s.durationMs || 0), 0);
    if (dur) t.durationMs = dur;
  }
  return tests;
}
