"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getScenario, labApp } from "@/lab/scenarios";
import type { LogEntry, RunResult } from "@/lib/lab/runtime";
import { markLabPassed } from "@/lib/lab/progress";

interface SolutionView {
  playwright: string;
  selenium: string;
  notes: string[];
}

interface CheckRow {
  label: string;
  ok: boolean;
}

const SPEEDS = [
  { label: "Fast", ms: 0 },
  { label: "Normal", ms: 250 },
  { label: "Slow", ms: 700 },
];

const draftKey = (id: string) => `qir_lab_draft_${id}`;

export function LabWorkbench({ id, solution }: { id: string; solution: SolutionView | null }) {
  const scenario = getScenario(id)!;
  const app = labApp(scenario.app);
  const [code, setCode] = useState(scenario.starter);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [checks, setChecks] = useState<CheckRow[] | null>(null);
  const [verdict, setVerdict] = useState<null | "pass" | "fail">(null);
  const [speed, setSpeed] = useState(250);
  const [url, setUrl] = useState(app.base);
  const [showHints, setShowHints] = useState(false);
  const [solTab, setSolTab] = useState<"playwright" | "selenium" | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const signal = useRef({ aborted: false });
  const gutter = useRef<HTMLDivElement>(null);
  const logEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey(id));
      if (saved) setCode(saved);
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (code === scenario.starter) localStorage.removeItem(draftKey(id));
        else localStorage.setItem(draftKey(id), code);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [code, id, scenario.starter]);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: "nearest" });
  }, [log]);

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

  const run = useCallback(async () => {
    if (running) return;
    const f = frame.current;
    if (!f) return;
    setRunning(true);
    setChecks(null);
    setVerdict(null);
    const entries: LogEntry[] = [];
    const push = (e: LogEntry) => {
      entries.push(e);
      setLog([...entries]);
    };
    setLog([]);
    signal.current = { aborted: false };
    const { runCode } = await import("@/lib/lab/runtime");
    let result: RunResult;
    try {
      result = await runCode(code, {
        frame: f,
        base: app.base,
        slowMo: speed,
        timeout: 5000,
        onLog: push,
        signal: signal.current,
        beforeEachTest: freshPage,
      });
    } catch (e) {
      push({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      setRunning(false);
      return;
    }
    if (signal.current.aborted) {
      push({ kind: "info", text: "Run stopped." });
      setRunning(false);
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
    const ctx = { lab, result, code, url: pageUrl, doc: f.contentDocument };
    const rows: CheckRow[] = [
      { label: "Your test ran without errors", ok: result.ok },
      { label: `At least ${scenario.minAssertions} passing assertion${scenario.minAssertions === 1 ? "" : "s"}`, ok: result.assertions.passed >= scenario.minAssertions },
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
    push({
      kind: pass ? "pass" : "info",
      text: `${result.assertions.passed} assertion${result.assertions.passed === 1 ? "" : "s"} passed, ${result.assertions.failed} failed · ${(result.durationMs / 1000).toFixed(1)}s`,
    });
    if (pass) markLabPassed(id);
    setRunning(false);
  }, [running, code, app.base, speed, freshPage, scenario, id]);

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
  const resetCode = () => {
    if (code !== scenario.starter && !confirm("Replace your code with the starter template?")) return;
    setCode(scenario.starter);
  };
  const loadSolution = () => {
    if (!solution) return;
    if (code !== scenario.starter && !confirm("Replace your code with the reference solution?")) return;
    setCode(solution.playwright);
  };
  const resetApp = async () => {
    clearAppState();
    if (frame.current) frame.current.src = app.base + "?nav=" + Date.now();
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left: brief and editor */}
        <div className="min-w-0 space-y-4">
          <section className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide accent">Interview scenario</h2>
            <p className="mt-2 leading-relaxed">{scenario.story}</p>
            <h3 className="mt-4 text-sm font-semibold">Acceptance criteria</h3>
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
              <span className="text-xs font-semibold">example.spec.ts</span>
              <span className="chip">Playwright · TypeScript</span>
              <div className="ml-auto flex items-center gap-1.5">
                <label className="sr-only" htmlFor="lab-speed">Speed</label>
                <select id="lab-speed" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded-md border px-1.5 py-1 text-xs" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                  {SPEEDS.map((s) => (
                    <option key={s.ms} value={s.ms}>{s.label}</option>
                  ))}
                </select>
                <button onClick={resetCode} className="btn btn-ghost !px-2.5 !py-1 text-xs" disabled={running}>Reset code</button>
                {running ? (
                  <button onClick={stop} className="btn !px-3 !py-1 text-xs" style={{ background: "#e11d48", color: "#fff" }}>■ Stop</button>
                ) : (
                  <button onClick={run} className="btn btn-primary !px-3 !py-1 text-xs" title="Ctrl/⌘ + Enter">▶ Run test</button>
                )}
              </div>
            </div>
            <div className="relative flex h-[320px] overflow-hidden font-mono text-[13px] leading-[1.6] sm:h-[460px]" style={{ background: "var(--surface-2)" }}>
              <div ref={gutter} aria-hidden className="h-full select-none overflow-hidden py-3 pl-3 pr-2 text-right muted" style={{ minWidth: "2.75rem" }}>
                {Array.from({ length: lines }, (_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                aria-label="Test code editor"
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
                className="block h-[320px] w-full resize-none overflow-auto bg-transparent py-3 pr-3 outline-none sm:h-[460px]"
                style={{ color: "var(--text)", tabSize: 2 }}
              />
            </div>
          </section>
          <p className="text-xs muted">
            Runs in your browser with a Playwright-compatible API: <code className="inline-code">page.goto</code>, <code className="inline-code">getByRole</code>,{" "}
            <code className="inline-code">getByLabel</code>, <code className="inline-code">getByTestId</code>, <code className="inline-code">locator</code>, actions with auto-waiting and{" "}
            <code className="inline-code">expect</code> web-first assertions. Your code is saved in this browser. Ctrl/⌘ + Enter runs it.
          </p>
        </div>

        {/* Right: live preview and results */}
        <div className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
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
          </section>

          <section className="card p-4" aria-live="polite">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Test output</h2>
              {verdict === "pass" && <span className="chip" style={{ color: "var(--good)" }}>✓ Scenario passed</span>}
              {verdict === "fail" && <span className="chip" style={{ color: "#e11d48" }}>✗ Not yet</span>}
            </div>
            <div className="max-h-56 overflow-auto rounded-lg p-2 font-mono text-[12px] leading-relaxed" style={{ background: "var(--surface-2)" }}>
              {!log.length && <p className="muted">Press Run test to watch your code drive the practice app in the preview.</p>}
              {log.map((e, i) => (
                <div key={i} className="flex gap-2 whitespace-pre-wrap break-words">
                  <span aria-hidden style={{ color: e.kind === "pass" ? "var(--good)" : e.kind === "fail" || e.kind === "error" ? "#e11d48" : "var(--muted)" }}>
                    {e.kind === "pass" ? "✓" : e.kind === "fail" || e.kind === "error" ? "✗" : e.kind === "test" ? "▸" : e.kind === "step" ? "·" : "i"}
                  </span>
                  <span className={e.kind === "test" ? "font-semibold" : e.kind === "error" ? "" : ""} style={e.kind === "error" ? { color: "#e11d48" } : undefined}>
                    {e.text}
                    {e.ms !== undefined && e.ms > 20 && <span className="muted"> {e.ms}ms</span>}
                  </span>
                </div>
              ))}
              <div ref={logEnd} />
            </div>
            {checks && (
              <div className="mt-3">
                <h3 className="mb-1 text-sm font-semibold">Scenario checks</h3>
                <ul className="space-y-1 text-sm">
                  {checks.map((c) => (
                    <li key={c.label} className="flex gap-2">
                      <span aria-hidden style={{ color: c.ok ? "var(--good)" : "#e11d48" }}>{c.ok ? "✓" : "✗"}</span>
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
            <p className="text-sm muted">Try it yourself first. Then compare with the Playwright solution and the same test in Selenium Java with TestNG.</p>
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
                The Selenium version is for study and for running locally against {`https://interview.qatechlabs.com${app.base}`}. The in-browser runner executes Playwright-style TypeScript.
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
