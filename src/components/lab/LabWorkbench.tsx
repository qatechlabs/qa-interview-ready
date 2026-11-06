"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getScenario, isFramework, isRemote, isWorkspace, labApp, MAIN_FILE, starterFiles } from "@/lab/scenarios";
import type { LogEntry, RunResult } from "@/lib/lab/runtime";
import { recordLabRun } from "@/lib/lab/progress";
import { SITE } from "@/lib/config";
import type { ReportModel, ReportTest } from "@/lib/lab/report";
import { appendLiveLog, downloadBlob, loadPrefs, modelFromLog, openReportWindow, savePrefs, showReport, type RunPrefs } from "@/lib/lab/runReport";

interface SolutionView {
  playwright: string;
  files?: Record<string, string>;
  selenium: string;
  notes: string[];
}

interface CheckRow {
  label: string;
  ok: boolean;
}

type Files = Record<string, string>;

export interface GitHubState {
  configured: boolean;
  org: string;
  user: { login: string; name: string; avatar: string } | null;
}

type CommitState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "done"; url: string; sha: string; repoUrl: string; unchanged: boolean }
  | { status: "error"; error: string };

const SPEEDS = [
  { label: "Fast", ms: 0 },
  { label: "Normal", ms: 250 },
  { label: "Slow", ms: 700 },
];

const draftKey = (id: string) => `qir_lab_draft_${id}`;
/** A report tab that never got a report (error or stop) is closed again so it doesn't linger. */
const closeUnfilledReport = (w: Window | null) => {
  try {
    if (w && !w.closed && w.document.getElementById("log")) w.close();
  } catch {
    /* ignore */
  }
};
const sortPaths = (files: Files) =>
  Object.keys(files).sort((a, b) => {
    const da = a.includes("/") ? 0 : 1;
    const db = b.includes("/") ? 0 : 1;
    return da - db || a.localeCompare(b);
  });
const sameFiles = (a: Files, b: Files) => {
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
};

function browserName(): string {
  if (typeof navigator === "undefined") return "Browser";
  const ua = navigator.userAgent;
  const m = /(Edg|OPR|Chrome|Firefox|Safari)\/([\d.]+)/.exec(ua);
  const name = m ? ({ Edg: "Microsoft Edge", OPR: "Opera", Chrome: "Google Chrome", Firefox: "Firefox", Safari: "Safari" } as Record<string, string>)[m[1]] : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : /iPhone|iPad/.test(ua) ? "iOS" : "";
  return `${name}${m ? " " + m[2].split(".")[0] : ""}${os ? " · " + os : ""} · in-browser Playwright runtime`;
}

export function LabWorkbench({ id, solution, github }: { id: string; solution: SolutionView | null; github?: GitHubState }) {
  const scenario = getScenario(id)!;
  const app = labApp(scenario.app);
  const framework = isFramework(scenario);
  const remote = isRemote(scenario);
  const workspace = isWorkspace(scenario);
  /** Workspaces on the practice apps can run both in the browser and on GitHub Actions. */
  const canRunOnGitHub = remote || workspace;
  const starter = useMemo(() => starterFiles(scenario), [scenario]);
  const [files, setFiles] = useState<Files>(starter);
  const [active, setActive] = useState<string>(() => sortPaths(starter).find((p) => p.startsWith("tests/")) || sortPaths(starter)[0]);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [checks, setChecks] = useState<CheckRow[] | null>(null);
  const [verdict, setVerdict] = useState<null | "pass" | "fail">(null);
  const [speed, setSpeed] = useState(250);
  const [url, setUrl] = useState(app.base);
  const [showHints, setShowHints] = useState(false);
  const [solTab, setSolTab] = useState<"playwright" | "selenium" | null>(null);
  const [commit, setCommit] = useState<CommitState>({ status: "idle" });
  const [runUrl, setRunUrl] = useState<string>("");
  const [prefs, setPrefs] = useState<RunPrefs>({ openReport: true, downloadEvidence: true });
  const [lastReport, setLastReport] = useState<ReportModel | null>(null);
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const reportWin = useRef<Window | null>(null);
  const lastCommitted = useRef<string>("");
  const frame = useRef<HTMLIFrameElement>(null);
  const signal = useRef({ aborted: false });
  const gutter = useRef<HTMLDivElement>(null);
  const logEnd = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);

  const code = files[active] ?? "";
  const setCode = (next: string) => setFiles((f) => ({ ...f, [active]: next }));
  const paths = sortPaths(files);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey(id));
      if (!saved) return;
      const parsed = saved.startsWith("{") ? (JSON.parse(saved) as { files?: Files; active?: string }) : { files: { [MAIN_FILE]: saved } };
      if (parsed.files && Object.keys(parsed.files).length) {
        setFiles(parsed.files);
        if (parsed.active && parsed.active in parsed.files) setActive(parsed.active);
      }
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (sameFiles(files, starter)) localStorage.removeItem(draftKey(id));
        else localStorage.setItem(draftKey(id), JSON.stringify({ files, active }));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [files, active, id, starter]);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: "nearest" });
  }, [log]);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);
  const updatePrefs = (next: Partial<RunPrefs>) =>
    setPrefs((p) => {
      const merged = { ...p, ...next };
      savePrefs(merged);
      return merged;
    });

  /** Builds the Word evidence document and downloads it. */
  const downloadEvidence = useCallback(async (model: ReportModel) => {
    setEvidenceBusy(true);
    try {
      const { buildEvidenceDocx, evidenceFileName } = await import("@/lib/lab/evidence");
      downloadBlob(await buildEvidenceDocx(model), evidenceFileName(model));
    } catch (e) {
      console.error("evidence document", e);
    } finally {
      setEvidenceBusy(false);
    }
  }, []);

  /** After every run: fill the report tab and download the evidence, as the learner prefers. */
  const deliver = useCallback(
    (model: ReportModel) => {
      setLastReport(model);
      if (prefs.openReport) showReport(reportWin.current, model);
      reportWin.current = null;
      if (prefs.downloadEvidence) void downloadEvidence(model);
    },
    [prefs.openReport, prefs.downloadEvidence, downloadEvidence],
  );

  // keep the address bar in sync while the learner clicks around manually
  useEffect(() => {
    const i = setInterval(() => {
      try {
        const w = frame.current?.contentWindow;
        if (w && w.location.href !== "about:blank") {
          const u = new URL(w.location.href);
          setUrl(u.pathname + (u.hash || ""));
        } else if (w) setUrl("about:blank");
      } catch {
        /* cross-origin or not ready */
      }
    }, 400);
    return () => clearInterval(i);
  }, []);

  const clearAppState = useCallback(() => {
    try {
      const prefix = `lab:${scenario.app}:`;
      Object.keys(sessionStorage).forEach((k) => k.startsWith(prefix) && sessionStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }, [scenario.app]);

  const freshPage = useCallback(async () => {
    clearAppState();
    const f = frame.current!;
    await new Promise<void>((resolve) => {
      f.onload = () => {
        f.onload = null;
        resolve();
      };
      f.src = "about:blank";
    });
  }, [clearAppState]);

  const commitToGitHub = useCallback(
    async (snapshot: Files, summary: string) => {
      if (!github?.user) return;
      const key = JSON.stringify(snapshot);
      if (key === lastCommitted.current) return;
      setCommit({ status: "saving" });
      try {
        const res = await fetch("/api/labs/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenarioId: id, files: snapshot, summary }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string; sha?: string; repoUrl?: string; unchanged?: boolean };
        if (!res.ok || !data.url) {
          setCommit({ status: "error", error: data.error || `GitHub commit failed (${res.status})` });
          return;
        }
        lastCommitted.current = key;
        setCommit({ status: "done", url: data.url, sha: data.sha || "", repoUrl: data.repoUrl || "", unchanged: !!data.unchanged });
      } catch {
        setCommit({ status: "error", error: "Couldn't reach the server to commit." });
      }
    },
    [github?.user, id],
  );

  const finish = useCallback(
    (result: RunResult, push: (e: LogEntry) => void, extra: { lab: unknown; url: string; doc: Document | null; mode: "browser" | "github" }) => {
      const allCode = Object.values(files).join("\n");
      const ctx = { ...extra, result, code: allCode, files };
      const rows: CheckRow[] = [
        { label: "Your tests ran without errors", ok: result.ok },
        {
          label: `At least ${scenario.minAssertions} passing assertion${scenario.minAssertions === 1 ? "" : "s"}`,
          // -1 means the report carried no assertion steps; then count expect() calls in a passing run
          ok: (result.assertions.passed >= 0 ? result.assertions.passed : result.ok ? (allCode.match(/\bexpect\s*\(/g) || []).length : 0) >= scenario.minAssertions,
        },
        ...scenario.checks.map((c) => {
          let ok = false;
          try {
            ok = !!c.test(ctx);
          } catch {
            ok = false;
          }
          return { label: c.label, ok };
        }),
      ];
      const pass = rows.every((r) => r.ok);
      setChecks(rows);
      setVerdict(pass ? "pass" : "fail");
      const passedTests = result.tests.filter((t) => t.ok).length;
      push({
        kind: pass ? "pass" : "info",
        text:
          result.assertions.passed >= 0
            ? `${passedTests}/${result.tests.length} tests passed · ${result.assertions.passed} assertion${result.assertions.passed === 1 ? "" : "s"} passed, ${result.assertions.failed} failed · ${(result.durationMs / 1000).toFixed(1)}s`
            : `${passedTests}/${result.tests.length} tests passed · ${(result.durationMs / 1000).toFixed(1)}s`,
      });
      recordLabRun(id, { ok: pass, mode: extra.mode, passedTests, totalTests: result.tests.length });
      return { pass, passedTests, rows };
    },
    [files, scenario, id],
  );

  /** Real-site labs: commit, dispatch the workflow in the learner's repo, poll until it completes. */
  const runRemote = useCallback(async () => {
    if (running || !github?.user) return;
    // opened synchronously on the click so the browser allows the tab; filled when the run finishes
    reportWin.current = prefs.openReport ? openReportWindow(`${scenario.title} · GitHub Actions`) : null;
    const startedAt = new Date().toISOString();
    setRunning(true);
    setChecks(null);
    setVerdict(null);
    setRunUrl("");
    const entries: LogEntry[] = [];
    const push = (e: LogEntry) => {
      entries.push(e);
      setLog([...entries]);
      appendLiveLog(reportWin.current, e);
    };
    setLog([]);
    signal.current = { aborted: false };
    const mySignal = signal.current;
    const snapshot = files;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    try {
      push({ kind: "info", text: `Committing to ${github.org}/lab-${github.user.login.toLowerCase()} and starting the Lab run workflow…` });
      setCommit({ status: "saving" });
      const res = await fetch("/api/labs/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId: id, files: snapshot }) });
      const d = (await res.json().catch(() => ({}))) as { error?: string; sha?: string; dispatchedAt?: string; commitUrl?: string; commitUnchanged?: boolean; repoUrl?: string; actionsUrl?: string };
      if (!res.ok || !d.sha || !d.dispatchedAt) {
        setCommit({ status: "error", error: d.error || `Couldn't start the run (${res.status})` });
        push({ kind: "error", text: d.error || `Couldn't start the run (${res.status})` });
        return;
      }
      lastCommitted.current = JSON.stringify(snapshot);
      setCommit({ status: "done", url: d.commitUrl || "", sha: d.sha, repoUrl: d.repoUrl || "", unchanged: !!d.commitUnchanged });
      push({ kind: "step", text: `Committed ${d.sha.slice(0, 7)} · workflow dispatched on GitHub Actions` });
      if (d.actionsUrl) setRunUrl(d.actionsUrl);
      const started = Date.now();
      let last = "";
      while (!mySignal.aborted && Date.now() - started < 20 * 60_000) {
        await sleep(last ? 6000 : 4000);
        if (mySignal.aborted) break;
        const st = await fetch(`/api/labs/run?sha=${d.sha}&since=${encodeURIComponent(d.dispatchedAt)}`, { cache: "no-store" });
        const r = (await st.json().catch(() => ({}))) as {
          error?: string;
          status?: string;
          runUrl?: string;
          conclusion?: string | null;
          tests?: { name: string; ok: boolean; error?: string; durationMs: number; steps?: { title: string; ok: boolean; durationMs?: number; error?: string; screenshot?: string }[] }[];
          assertions?: { passed: number; failed: number; matchers: string[] };
          durationMs?: number;
        };
        if (!st.ok) {
          push({ kind: "error", text: r.error || `Couldn't read the run (${st.status})` });
          return;
        }
        if (r.runUrl) setRunUrl(r.runUrl);
        const secs = Math.round((Date.now() - started) / 1000);
        if (r.status !== last) {
          last = r.status || "";
          if (r.status === "pending" || r.status === "queued") push({ kind: "info", text: "Waiting for a GitHub Actions runner… (usually under a minute)" });
          if (r.status === "in_progress") push({ kind: "info", text: "Running: installing Playwright and Chromium, then your tests. Usually 1–3 minutes." });
        }
        if (r.status !== "completed") continue;
        push({ kind: "info", text: `Workflow ${r.conclusion || "finished"} after ${secs}s` });
        for (const t of r.tests || []) {
          push({ kind: "test", text: t.name });
          for (const s of t.steps || []) push({ kind: s.ok ? "step" : "fail", text: s.error ? `${s.title} — ${s.error.split("\n")[0]}` : s.title, ms: s.durationMs });
          push(t.ok ? { kind: "pass", text: `passed`, ms: t.durationMs } : { kind: "fail", text: t.error || "failed", ms: t.durationMs });
        }
        if (r.error) push({ kind: "error", text: r.error });
        const tests = (r.tests || []).map((t) => ({ name: t.name, ok: t.ok, error: t.error }));
        const ok = !r.error && tests.length > 0 && tests.every((t) => t.ok);
        let assertions = r.assertions;
        if (!assertions || assertions.passed < 0) {
          // no assertion report: count the expect() calls in the code and trust a green run
          const code = Object.values(snapshot).join("\n");
          assertions = { passed: ok ? (code.match(/\bexpect\s*\(/g) || []).length : 0, failed: 0, matchers: Array.from(new Set((code.match(/\.(to\w+)\s*\(/g) || []).map((m) => m.replace(/^\./, "").replace(/\s*\($/, "")))) };
        }
        const result: RunResult = {
          ok,
          error: r.error,
          assertions,
          tests,
          durationMs: r.durationMs || Date.now() - started,
        };
        if (!tests.length && !r.error) push({ kind: "error", text: "No tests were found. Test files must be named *.spec.ts." });
        const { rows } = finish(result, push, { lab: null, url: "", doc: null, mode: "github" });
        const reportTests: ReportTest[] = (r.tests || []).map((t) => ({
          name: t.name,
          status: t.ok ? "passed" : "failed",
          durationMs: t.durationMs,
          error: t.error,
          steps: (t.steps || []).map((s) => ({ title: s.title, status: s.ok ? "passed" : "failed", durationMs: s.durationMs, error: s.error, screenshot: s.screenshot })),
        }));
        deliver({
          scenario: scenario.title,
          scenarioId: id,
          app: app.name,
          mode: "github",
          startedAt,
          durationMs: result.durationMs,
          tests: reportTests,
          assertions: result.assertions,
          checks: rows,
          verdict: rows.every((x) => x.ok) ? "pass" : "fail",
          learner: github.user.login,
          baseURL: app.remote ? app.base : SITE.url + app.base,
          browser: "Chromium (headless) · Playwright Test",
          runUrl: r.runUrl,
          repoUrl: d.repoUrl,
          commitUrl: d.commitUrl,
          log: entries,
        });
        return;
      }
      if (mySignal.aborted) push({ kind: "info", text: "Stopped watching. The run continues on GitHub; open it from the link above." });
      else push({ kind: "error", text: "Gave up waiting after 20 minutes. Open the run on GitHub to see what happened." });
    } catch (e) {
      push({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setRunning(false);
      closeUnfilledReport(reportWin.current);
      reportWin.current = null;
    }
  }, [running, github, files, id, finish, prefs.openReport, scenario.title, app, deliver]);

  const run = useCallback(async () => {
    if (running) return;
    if (remote) return runRemote();
    const f = frame.current;
    if (!f) return;
    reportWin.current = prefs.openReport ? openReportWindow(scenario.title) : null;
    const startedAt = new Date().toISOString();
    setRunning(true);
    setChecks(null);
    setVerdict(null);
    const entries: LogEntry[] = [];
    // event-based screenshots: one after every action and assertion, keyed by log index
    const shots = new Map<number, Promise<string | null>>();
    const push = (e: LogEntry) => {
      entries.push(e);
      setLog([...entries]);
      appendLiveLog(reportWin.current, e);
    };
    const afterStep = (e: LogEntry) => {
      if (shots.size >= 80) return Promise.resolve();
      const i = entries.lastIndexOf(e);
      const p = snapshotFrame(f);
      if (i >= 0) shots.set(i, p);
      return p;
    };
    setLog([]);
    signal.current = { aborted: false };
    const [{ runProject }, { snapshotFrame }] = await Promise.all([import("@/lib/lab/runtime"), import("@/lib/lab/snapshot")]);
    let result: RunResult;
    try {
      result = await runProject(files, {
        frame: f,
        base: app.base,
        slowMo: speed,
        timeout: 5000,
        onLog: push,
        afterStep,
        signal: signal.current,
        beforeEachTest: freshPage,
      });
    } catch (e) {
      push({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      setRunning(false);
      closeUnfilledReport(reportWin.current);
      reportWin.current = null;
      return;
    }
    if (signal.current.aborted) {
      push({ kind: "info", text: "Run stopped." });
      setRunning(false);
      closeUnfilledReport(reportWin.current);
      reportWin.current = null;
      return;
    }

    let lab: unknown = null;
    let pageUrl = "";
    try {
      lab = (f.contentWindow as unknown as { __lab?: unknown })?.__lab ?? null;
      pageUrl = f.contentWindow?.location.href || "";
    } catch {
      /* ignore */
    }
    const { pass, passedTests, rows } = finish(result, push, { lab, url: pageUrl, doc: f.contentDocument, mode: "browser" });
    setRunning(false);
    void commitToGitHub(files, `${passedTests}/${result.tests.length} tests passed${pass ? ", scenario passed" : ""}`);
    const resolved = new Map<number, string | null>();
    await Promise.all(Array.from(shots.entries()).map(async ([i, p]) => resolved.set(i, await p.catch(() => null))));
    deliver({
      scenario: scenario.title,
      scenarioId: id,
      app: app.name,
      mode: "browser",
      startedAt,
      durationMs: result.durationMs,
      tests: modelFromLog(entries, resolved, result),
      assertions: result.assertions,
      checks: rows,
      verdict: pass ? "pass" : "fail",
      learner: github?.user?.login,
      baseURL: SITE.url + app.base,
      browser: browserName(),
      repoUrl: github?.user ? `https://github.com/${github.org}/lab-${github.user.login.toLowerCase()}` : undefined,
      log: entries,
    });
  }, [running, remote, runRemote, files, app, speed, freshPage, finish, commitToGitHub, prefs.openReport, scenario.title, id, github, deliver]);

  const stop = () => {
    signal.current.aborted = true;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      run();
      return;
    }
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: en } = ta;
      const next = code.slice(0, s) + "  " + code.slice(en);
      setCode(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + 2;
      });
    }
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
      const s = ta.selectionStart;
      const lineStart = code.lastIndexOf("\n", s - 1) + 1;
      const indent = code.slice(lineStart, s).match(/^\s*/)?.[0] || "";
      const extra = /[{(\[]\s*$/.test(code.slice(lineStart, s)) ? "  " : "";
      if (indent || extra) {
        e.preventDefault();
        const ins = "\n" + indent + extra;
        setCode(code.slice(0, s) + ins + code.slice(ta.selectionEnd));
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = s + ins.length;
        });
      }
    }
  };

  const lines = code.split("\n").length;
  const dirty = !sameFiles(files, starter);
  const resetCode = () => {
    if (dirty && !confirm("Replace all files with the starter template?")) return;
    setFiles(starter);
    setActive(sortPaths(starter).find((p) => p.startsWith("tests/")) || sortPaths(starter)[0]);
  };
  const loadSolution = () => {
    if (!solution) return;
    if (dirty && !confirm("Replace your code with the reference solution?")) return;
    const next = solution.files ? { ...solution.files } : { [MAIN_FILE]: solution.playwright };
    setFiles(next);
    setActive(sortPaths(next).find((p) => p.startsWith("tests/")) || sortPaths(next)[0]);
  };
  const resetApp = async () => {
    clearAppState();
    if (frame.current) frame.current.src = app.base + "?nav=" + Date.now();
  };
  const newFile = () => {
    const name = prompt("New file path (for example pages/cart.page.ts)", "pages/");
    if (!name) return;
    const path = name.trim().replace(/^\/+/, "");
    if (!/^[\w.-]+(\/[\w.-]+)*\.(ts|js|mjs|json|md|yml|yaml|csv|txt|env\.example)$/.test(path)) {
      alert("Use a path like pages/cart.page.ts (letters, numbers, dots, dashes, folders; .ts .js .json .md .yml .csv).");
      return;
    }
    if (path in files) {
      setActive(path);
      return;
    }
    setFiles((f) => ({ ...f, [path]: "" }));
    setActive(path);
    requestAnimationFrame(() => editor.current?.focus());
  };
  const renameFile = () => {
    const name = prompt("Rename file", active);
    if (!name || name === active) return;
    const path = name.trim().replace(/^\/+/, "");
    if (path in files) {
      alert("A file with that name already exists.");
      return;
    }
    setFiles((f) => {
      const next: Files = {};
      for (const [k, v] of Object.entries(f)) next[k === active ? path : k] = v;
      return next;
    });
    setActive(path);
  };
  const deleteFile = () => {
    if (paths.length <= 1) return;
    if (!confirm(`Delete ${active}?`)) return;
    setFiles((f) => {
      const next = { ...f };
      delete next[active];
      return next;
    });
    setActive(paths.find((p) => p !== active)!);
  };
  const download = async () => {
    const { makeZip, projectFiles } = await import("@/lib/lab/zip");
    const origin = typeof location !== "undefined" ? location.origin : SITE.url;
    const project = projectFiles(framework ? files : { [MAIN_FILE]: files[MAIN_FILE] ?? Object.values(files)[0] }, {
      name: `qa-lab-${scenario.id}`,
      baseURL: remote ? app.base : origin + app.base,
      title: scenario.title,
    });
    const blob = makeZip(project);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${scenario.id}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left: brief and editor */}
        <div className="min-w-0 space-y-4">
          <section className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide accent">Interview scenario</h2>
            <p className="mt-2 leading-relaxed">{scenario.story}</p>
            <h3 className="mt-4 text-sm font-semibold">{workspace ? "What the framework must have" : "Acceptance criteria"}</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
              {scenario.criteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
            <button onClick={() => setShowHints((v) => !v)} className="mt-3 text-sm font-semibold accent hover:underline">
              {showHints ? "Hide hints" : `Show hints (${scenario.hints.length})`}
            </button>
            {showHints && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm muted">
                {scenario.hints.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <span className="truncate text-xs font-semibold" title={active}>{active}</span>
              <span className="chip">Playwright · TypeScript</span>
              <div className="ml-auto flex items-center gap-1.5">
                {!remote && (
                  <>
                    <label className="sr-only" htmlFor="lab-speed">Speed</label>
                    <select id="lab-speed" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded-md border px-1.5 py-1 text-xs" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                      {SPEEDS.map((s) => (
                        <option key={s.ms} value={s.ms}>{s.label}</option>
                      ))}
                    </select>
                  </>
                )}
                <button onClick={resetCode} className="btn btn-ghost !px-2.5 !py-1 text-xs" disabled={running}>Reset</button>
                {running ? (
                  <button onClick={stop} className="btn !px-3 !py-1 text-xs" style={{ background: "var(--bad)", color: "#fff" }}>■ Stop</button>
                ) : (
                  <>
                    {!remote && (
                      <button onClick={run} className="btn btn-primary !px-3 !py-1 text-xs" title="Ctrl/⌘ + Enter">{workspace ? "▶ Run in browser" : "▶ Run tests"}</button>
                    )}
                    {canRunOnGitHub &&
                      (github?.user ? (
                        <button onClick={runRemote} className={`btn ${remote ? "btn-primary" : "btn-ghost"} !px-3 !py-1 text-xs`} title={remote ? "Ctrl/⌘ + Enter" : "Commit and run with real Playwright on GitHub Actions, using your playwright.config.ts"}>
                          {remote ? "▶ Run on GitHub" : "☁ Run on GitHub"}
                        </button>
                      ) : (
                        <a href={`/api/github/login?next=${encodeURIComponent(`/labs/${id}`)}`} className={`btn ${remote ? "btn-primary" : "btn-ghost"} !px-3 !py-1 text-xs`} title="Runs on GitHub Actions in a repo created in your name">
                          {remote ? "Sign in with GitHub to run" : "Sign in to run on GitHub"}
                        </a>
                      ))}
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row">
              {(framework || paths.length > 1) && (
                <aside className="flex shrink-0 flex-col border-b sm:w-44 sm:border-b-0 sm:border-r" style={{ borderColor: "var(--border)", background: "var(--surface)" }} aria-label="Project files">
                  <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide muted">
                    <span>Files</span>
                    <button onClick={newFile} className="rounded px-1.5 py-0.5 text-xs font-semibold normal-case accent hover:underline" disabled={running}>+ New</button>
                  </div>
                  <ul className="flex gap-1 overflow-x-auto px-2 pb-2 text-xs sm:block sm:space-y-0.5 sm:overflow-visible sm:pb-1">
                    {paths.map((p) => {
                      const dir = p.includes("/") ? p.slice(0, p.lastIndexOf("/") + 1) : "";
                      const name = p.slice(dir.length);
                      return (
                        <li key={p}>
                          <button
                            onClick={() => setActive(p)}
                            className="w-full whitespace-nowrap rounded px-2 py-1 text-left font-mono"
                            style={p === active ? { background: "var(--accent-soft)", color: "var(--accent)" } : undefined}
                            aria-current={p === active ? "true" : undefined}
                          >
                            <span className="muted">{dir}</span>
                            {name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-auto hidden gap-2 px-2 py-1.5 text-[11px] sm:flex">
                    <button onClick={renameFile} className="accent hover:underline" disabled={running}>Rename</button>
                    <button onClick={deleteFile} className="hover:underline" style={{ color: "var(--bad)" }} disabled={running || paths.length <= 1}>Delete</button>
                  </div>
                </aside>
              )}
              <div className="relative flex h-[320px] min-w-0 flex-1 overflow-hidden font-mono text-[13px] leading-[1.6] sm:h-[460px]" style={{ background: "var(--surface-2)" }}>
                <div ref={gutter} aria-hidden className="h-full select-none overflow-hidden py-3 pl-3 pr-2 text-right muted" style={{ minWidth: "2.75rem" }}>
                  {Array.from({ length: lines }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  ref={editor}
                  aria-label={`Code editor: ${active}`}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={onKeyDown}
                  onScroll={(e) => {
                    if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
                  }}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  wrap="off"
                  className="block h-full w-full resize-none overflow-auto bg-transparent py-3 pr-3 outline-none"
                  style={{ color: "var(--text)", tabSize: 2 }}
                />
              </div>
            </div>
          </section>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs muted">
            {workspace && !remote ? (
              <p>
                Your whole project, like a repo in VS Code. <b>Run in browser</b> runs every *.spec.ts against the practice app with the in-browser runtime (it ignores
                playwright.config.ts but the review checks it). <b>Run on GitHub</b> commits the project and runs it with real Playwright and <i>your</i> config, with{" "}
                <code className="inline-code">BASE_URL={SITE.url}{app.base}</code>. Ctrl/⌘ + Enter runs in the browser.
              </p>
            ) : remote ? (
              <p>
                Runs with real Playwright on GitHub Actions in your own repo: the files are committed, the <b>Lab run</b> workflow starts with{" "}
                <code className="inline-code">BASE_URL={app.base}</code>{workspace ? " and your own playwright.config.ts" : ""}, and the results come back here. Saved in this browser. Ctrl/⌘ + Enter runs.
              </p>
            ) : (
              <p>
                Runs in your browser with a Playwright-compatible API: locators, auto-waiting actions, <code className="inline-code">expect</code>, imports between files and{" "}
                <code className="inline-code">test.extend</code> fixtures. Saved in this browser. Ctrl/⌘ + Enter runs.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <label className="flex items-center gap-1" title="Opens a tab on Run that fills with the Allure-style report when the run finishes">
                <input type="checkbox" checked={prefs.openReport} onChange={(e) => updatePrefs({ openReport: e.target.checked })} /> Report in a new tab
              </label>
              <label className="flex items-center gap-1" title="Downloads a Word document with every step and screenshot after the run">
                <input type="checkbox" checked={prefs.downloadEvidence} onChange={(e) => updatePrefs({ downloadEvidence: e.target.checked })} /> Download evidence (.docx)
              </label>
              <button onClick={download} className="btn btn-ghost !px-2.5 !py-1 text-xs">⬇ Download as Playwright project</button>
            </div>
          </div>
          {github?.configured && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              {github.user ? (
                <>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {/* eslint-disable-next-line @next/next/no-img-element -- avatar comes from GitHub's CDN */}
                    {github.user.avatar && <img src={github.user.avatar} alt="" width={16} height={16} className="rounded-full" />}
                    {github.user.login}
                  </span>
                  <span className="muted">
                    Every run is committed to{" "}
                    <a href={`https://github.com/${github.org}/lab-${github.user.login.toLowerCase()}`} target="_blank" rel="noreferrer" className="font-mono accent hover:underline">
                      {github.org}/lab-{github.user.login.toLowerCase()}
                    </a>
                  </span>
                  {commit.status === "saving" && <span className="chip" style={{ color: "var(--warn)" }}>● Committing…</span>}
                  {commit.status === "done" && (
                    <a href={commit.url} target="_blank" rel="noreferrer" className="chip hover:underline" style={{ color: "var(--good)" }}>
                      ✓ {commit.unchanged ? "Already committed" : `Committed ${commit.sha.slice(0, 7)}`} ↗
                    </a>
                  )}
                  {commit.status === "error" && <span className="chip" style={{ color: "var(--bad)" }}>✗ {commit.error}</span>}
                  <form action="/api/github/signout" method="post" className="ml-auto" onSubmit={async (e) => { e.preventDefault(); await fetch("/api/github/signout", { method: "POST" }); location.reload(); }}>
                    <button className="muted hover:underline">Sign out</button>
                  </form>
                </>
              ) : (
                <>
                  <span className="muted">{remote ? "Real-site labs run on GitHub Actions in a repo created in your name. Sign in to run." : "Save your lab code to a GitHub repo in your name, automatically after every run."}</span>
                  <a href={`/api/github/login?next=${encodeURIComponent(`/labs/${id}`)}`} className="btn btn-ghost ml-auto !px-2.5 !py-1 text-xs">
                    Sign in with GitHub
                  </a>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: live preview and results */}
        <div className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
          {remote ? (
            <section className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">
                  <span aria-hidden>{app.icon}</span> {app.name}
                </h2>
                <span className="chip">Real site · runs on GitHub Actions</span>
                {running && <span className="chip" style={{ color: "var(--warn)" }}>● Running</span>}
                <a href={app.base} target="_blank" rel="noreferrer" className="ml-auto text-xs font-semibold accent hover:underline">Open the site ↗</a>
              </div>
              <p className="mt-2 text-sm muted">
                {app.base} can&apos;t be embedded here, so your code runs with real Playwright and Chromium on a GitHub Actions runner in your repo. Explore the site in a
                new tab while you write the test. Login: {app.credentials}.
              </p>
              <ol className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                {[
                  ["1", "Commit", "Your files go to labs/" + scenario.id + "/ in your repo."],
                  ["2", "Run", "The Lab run workflow installs Playwright and runs your spec against the real site."],
                  ["3", "Verify", "Results, assertion steps and the HTML report come back; the checks grade your code."],
                ].map(([n, t, d]) => (
                  <li key={n} className="rounded-lg p-2" style={{ background: "var(--surface-2)" }}>
                    <span className="font-semibold">{n}. {t}</span>
                    <p className="muted">{d}</p>
                  </li>
                ))}
              </ol>
              {runUrl && (
                <p className="mt-3 text-xs">
                  <a href={runUrl} target="_blank" rel="noreferrer" className="font-semibold accent hover:underline">Open the run on GitHub ↗</a>
                  <span className="muted"> · HTML report and traces are in the run&apos;s artifacts for 7 days.</span>
                </p>
              )}
            </section>
          ) : (
          <section className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <span className="flex gap-1" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="min-w-0 flex-1 truncate rounded-md px-2 py-0.5 font-mono text-xs muted" style={{ background: "var(--surface-2)" }} title={url}>
                {url.replace(/\?nav=\d+/, "")}
              </span>
              {running && <span className="chip" style={{ color: "var(--warn)" }}>● Running</span>}
              <button onClick={resetApp} className="text-xs font-semibold accent hover:underline" disabled={running}>Reset app</button>
              <a href={app.base} target="_blank" rel="noreferrer" className="text-xs font-semibold accent hover:underline">Open ↗</a>
            </div>
            <iframe ref={frame} src={app.base} title={`${app.name} practice app`} className="block h-[420px] w-full bg-white" />
            {runUrl && (
              <p className="border-t px-3 py-2 text-xs" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <a href={runUrl} target="_blank" rel="noreferrer" className="font-semibold accent hover:underline">Open the GitHub Actions run ↗</a>
                <span className="muted"> · runs with your playwright.config.ts; HTML report in the run&apos;s artifacts.</span>
              </p>
            )}
          </section>
          )}

          <section className="card p-4" aria-live="polite">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Test output</h2>
              <div className="flex flex-wrap items-center gap-1.5">
                {lastReport && !running && (
                  <>
                    <button onClick={() => showReport(null, lastReport)} className="btn btn-ghost !px-2 !py-0.5 text-xs" title="Allure-style run report with every step and screenshot">
                      📊 Open report ↗
                    </button>
                    <button onClick={() => downloadEvidence(lastReport)} className="btn btn-ghost !px-2 !py-0.5 text-xs" disabled={evidenceBusy} title="Word document with the event-based screenshots as evidence">
                      {evidenceBusy ? "Preparing…" : "⬇ Evidence (.docx)"}
                    </button>
                  </>
                )}
                {verdict === "pass" && <span className="chip" style={{ color: "var(--good)" }}>✓ Scenario passed</span>}
                {verdict === "fail" && <span className="chip" style={{ color: "var(--bad)" }}>✗ Not yet</span>}
              </div>
            </div>
            <div className="max-h-56 overflow-auto rounded-lg p-2 font-mono text-[12px] leading-relaxed" style={{ background: "var(--surface-2)" }}>
              {!log.length && (
                <p className="muted">
                  {remote
                    ? "Press Run on GitHub to commit your code and run it against the real site. Results appear here in a few minutes."
                    : workspace
                      ? "Build your project in the file tree, then Run in browser for fast feedback or Run on GitHub to prove it with real Playwright and your config."
                      : "Press Run tests to watch your code drive the practice app in the preview."}
                </p>
              )}
              {log.map((e, i) => (
                <div key={i} className="flex gap-2 whitespace-pre-wrap break-words">
                  <span aria-hidden style={{ color: e.kind === "pass" ? "var(--good)" : e.kind === "fail" || e.kind === "error" ? "var(--bad)" : "var(--muted)" }}>
                    {e.kind === "pass" ? "✓" : e.kind === "fail" || e.kind === "error" ? "✗" : e.kind === "test" ? "▸" : e.kind === "step" ? "·" : "i"}
                  </span>
                  <span className={e.kind === "test" ? "font-semibold" : ""} style={e.kind === "error" ? { color: "var(--bad)" } : undefined}>
                    {e.text}
                    {e.ms !== undefined && e.ms > 20 && <span className="muted"> {e.ms}ms</span>}
                  </span>
                </div>
              ))}
              <div ref={logEnd} />
            </div>
            {checks && (
              <div className="mt-3">
                <h3 className="mb-1 text-sm font-semibold">{workspace ? "Framework review" : "Scenario checks"}</h3>
                <ul className="space-y-1 text-sm">
                  {checks.map((c) => (
                    <li key={c.label} className="flex gap-2">
                      <span aria-hidden style={{ color: c.ok ? "var(--good)" : "var(--bad)" }}>{c.ok ? "✓" : "✗"}</span>
                      <span className={c.ok ? "" : "font-medium"}>{c.label}</span>
                      <span className="sr-only">{c.ok ? "passed" : "failed"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Reference solution</h2>
            <p className="text-sm muted">Try it yourself first. Then compare with the Playwright solution and the same {framework ? "framework" : "test"} in Selenium Java with TestNG.</p>
          </div>
          {solution && (
            <div className="flex gap-1.5">
              <button onClick={() => setSolTab(solTab === "playwright" ? null : "playwright")} className="btn btn-ghost !px-3 !py-1.5 text-xs">Playwright (TS)</button>
              <button onClick={() => setSolTab(solTab === "selenium" ? null : "selenium")} className="btn btn-ghost !px-3 !py-1.5 text-xs">Selenium (Java)</button>
            </div>
          )}
        </div>
        {solution && solTab && (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <pre className="max-h-[480px] overflow-auto rounded-lg p-4 font-mono text-[12.5px] leading-relaxed" style={{ background: "var(--surface-2)" }}>
                {solTab === "playwright" ? solution.playwright : solution.selenium}
              </pre>
              {solTab === "playwright" && (
                <button onClick={loadSolution} className="btn btn-primary absolute right-2 top-2 !px-2.5 !py-1 text-xs">Load into editor</button>
              )}
            </div>
            {solTab === "selenium" && (
              <p className="text-xs muted">
                The Selenium version is for study and for running locally against {remote ? app.base : `https://interview.qatechlabs.com${app.base}`}. {remote ? "The lab runner executes Playwright TypeScript on GitHub Actions." : "The in-browser runner executes Playwright-style TypeScript."}
              </p>
            )}
            <div>
              <h3 className="text-sm font-semibold">What the interviewer is looking for</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {solution.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
