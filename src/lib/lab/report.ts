/**
 * Run report: a self-contained HTML page built from one lab run (browser or GitHub Actions) that
 * can go straight to a delivery manager or product owner: executive summary, charts, environment,
 * acceptance checks, per-test results, failure analysis, step-by-step evidence with the
 * event-based screenshots, execution log and a sign-off block. Opened in a new tab by the workbench.
 */
import { analyse, environmentRows, fmtMs, classifyStep } from "./analysis";
import { barChart, columnChart, donutChart, type ChartPalette } from "./charts";

export type StepStatus = "passed" | "failed" | "info";
export interface ReportStep {
  title: string;
  status: StepStatus;
  durationMs?: number;
  error?: string;
  /** JPEG data URL taken right after the step */
  screenshot?: string;
}
export interface ReportTest {
  name: string;
  status: "passed" | "failed";
  durationMs?: number;
  error?: string;
  steps: ReportStep[];
}
export interface ReportModel {
  scenario: string;
  scenarioId: string;
  app: string;
  mode: "browser" | "github";
  startedAt: string;
  durationMs: number;
  tests: ReportTest[];
  assertions: { passed: number; failed: number; matchers?: string[] };
  checks: { label: string; ok: boolean }[];
  verdict: "pass" | "fail" | null;
  learner?: string;
  baseURL?: string;
  browser?: string;
  runUrl?: string;
  repoUrl?: string;
  commitUrl?: string;
  /** Everything that scrolled through the run log */
  log?: { kind: string; text: string; ms?: number }[];
}

export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Chart colours expressed as CSS variables so the print stylesheet can swap the palette. */
const CSS_PALETTE: ChartPalette = { pass: "var(--pass)", fail: "var(--fail)", info: "var(--info)", track: "var(--line)", ink: "var(--ink)", muted: "var(--muted)", accent: "var(--accent)", warn: "var(--warn)" };

/** Shown in the new tab while the run is in progress; the log is streamed into #log. */
export function placeholderHtml(title: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Running · ${esc(title)}</title>
<style>${BASE_CSS}</style></head><body><div class="wrap"><header class="hdr"><div class="brand">QA Interview Ready · Test execution report</div><h1>${esc(title)}</h1><p class="sub"><span class="spin"></span> Run in progress. This page turns into the report when the run finishes.</p></header>
<section class="card"><h2>Live log</h2><pre id="log" class="log"></pre></section></div></body></html>`;
}

export function buildReportHtml(m: ReportModel): string {
  const a = analyse(m);
  const started = new Date(m.startedAt);
  const env = environmentRows(m);
  const isUrl = (v: string) => /^https?:\/\//.test(v);

  const outcomePie = donutChart(
    [
      { label: "Passed", value: a.passed, color: CSS_PALETTE.pass },
      { label: "Failed", value: a.failed, color: CSS_PALETTE.fail },
    ],
    { title: "Test outcomes", centre: `${a.rate}%`, sub: "pass rate", palette: CSS_PALETTE },
  );
  const stepsPie = donutChart(
    [
      { label: "Navigation", value: a.byKind.navigation, color: CSS_PALETTE.info },
      { label: "Actions", value: a.byKind.action, color: CSS_PALETTE.accent },
      { label: "Assertions", value: a.byKind.assertion, color: CSS_PALETTE.pass },
      { label: "API calls", value: a.byKind.api, color: CSS_PALETTE.warn },
      { label: "Other", value: a.byKind.step + a.byKind.other, color: CSS_PALETTE.muted },
    ],
    { title: "Steps by type", centre: String(a.stepsTotal), sub: "steps", palette: CSS_PALETTE },
  );
  const stepsBar = barChart(
    a.rows.map((r) => ({ label: r.name, values: [r.steps - r.failedSteps, r.failedSteps], note: `${r.steps} step${r.steps === 1 ? "" : "s"}` })),
    [
      { name: "Passed steps", color: CSS_PALETTE.pass },
      { name: "Failed steps", color: CSS_PALETTE.fail },
    ],
    { title: "Steps per test", palette: CSS_PALETTE },
  );
  const durations = a.rows.filter((r) => r.durationMs != null);
  const durationCols = durations.length
    ? columnChart(
        durations.map((r) => ({ label: r.name, value: r.durationMs ?? 0, color: r.status === "passed" ? CSS_PALETTE.pass : CSS_PALETTE.fail })),
        { title: "Duration per test", palette: CSS_PALETTE, format: (v) => fmtMs(v) },
      )
    : "";
  const checksBar = m.checks.length
    ? barChart(
        [{ label: "Acceptance checks", values: [a.checksPassed, a.checksFailed], note: `${a.checksPassed}/${m.checks.length} passed` }],
        [
          { name: "Passed", color: CSS_PALETTE.pass },
          { name: "Failed", color: CSS_PALETTE.fail },
        ],
        { title: "Scenario acceptance", palette: CSS_PALETTE },
      )
    : "";

  const kpi = (label: string, value: string, cls = "") => `<div class="kpi ${cls}"><b>${value}</b><span>${label}</span></div>`;
  const kpis = [
    kpi("Pass rate", `${a.rate}%`, a.failed ? "bad" : "good"),
    kpi("Tests", String(a.total)),
    kpi("Passed", String(a.passed), "good"),
    kpi("Failed", String(a.failed), a.failed ? "bad" : ""),
    kpi("Assertions", `${a.assertionsPassed}${a.assertionsFailed ? ` / ${a.assertionsFailed} ✗` : ""}`),
    kpi("Steps", String(a.stepsTotal)),
    kpi("Evidence shots", String(a.screenshots)),
    kpi("Duration", fmtMs(m.durationMs) || "n/a"),
  ].join("");

  const links = [m.runUrl ? `<a href="${esc(m.runUrl)}" target="_blank" rel="noreferrer">GitHub Actions run ↗</a>` : "", m.commitUrl ? `<a href="${esc(m.commitUrl)}" target="_blank" rel="noreferrer">Commit ↗</a>` : "", m.repoUrl ? `<a href="${esc(m.repoUrl)}" target="_blank" rel="noreferrer">Repository ↗</a>` : ""].filter(Boolean).join(" · ");

  const resultsTable = `<table class="tbl"><thead><tr><th>#</th><th>Suite</th><th>Test case</th><th>Status</th><th class="num">Steps</th><th class="num">Assertions</th><th class="num">Evidence</th><th class="num">Duration</th></tr></thead><tbody>${a.rows
    .map(
      (r) =>
        `<tr class="${r.status}"><td>${r.index}</td><td class="muted">${esc(r.suite)}</td><td><a href="#t${r.index}">${esc(r.name)}</a>${r.error ? `<div class="errline">${esc(r.error.split("\n")[0].slice(0, 160))}</div>` : ""}</td><td><span class="badge ${r.status}">${r.status.toUpperCase()}</span></td><td class="num">${r.steps}${r.failedSteps ? ` <small class="bad">(${r.failedSteps} ✗)</small>` : ""}</td><td class="num">${r.assertions}</td><td class="num">${r.screenshots}</td><td class="num">${fmtMs(r.durationMs) || "–"}</td></tr>`,
    )
    .join("")}</tbody></table>`;

  const suitesTable = a.suites.length > 1 ? `<table class="tbl compact"><thead><tr><th>Suite</th><th class="num">Tests</th><th class="num">Passed</th><th class="num">Failed</th><th class="num">Duration</th></tr></thead><tbody>${a.suites.map((s) => `<tr><td>${esc(s.name)}</td><td class="num">${s.passed + s.failed}</td><td class="num good">${s.passed}</td><td class="num ${s.failed ? "bad" : ""}">${s.failed}</td><td class="num">${fmtMs(s.durationMs) || "–"}</td></tr>`).join("")}</tbody></table>` : "";

  const failuresHtml = a.failures.length
    ? a.failures
        .map(
          (f) => `<article class="failure"><h3><span class="badge failed">FAILED</span> ${esc(f.test)} <span class="meta">${esc(f.suite)}</span></h3>
<table class="kv"><tr><th>Failing step</th><td>${f.step ? `Step ${f.stepIndex}: <code>${esc(f.step)}</code>` : "Not attributable to a single step"}</td></tr><tr><th>Error</th><td><pre class="err">${esc(f.error)}</pre></td></tr><tr><th>Impact</th><td>The acceptance criteria covered by this test are not met; the scenario cannot be signed off until it passes.</td></tr></table>
${f.screenshot ? `<figure><a href="${f.screenshot}" target="_blank" title="Open full size"><img loading="lazy" src="${f.screenshot}" alt="Screenshot at failure: ${esc(f.test)}"></a><figcaption>Application state at the failure</figcaption></figure>` : ""}</article>`,
        )
        .join("")
    : `<p class="ok-note">✓ No failures. Every test and step completed as expected.</p>`;

  let shotNo = 0;
  const testHtml = (t: ReportTest, idx: number) => {
    const { name, suite } = (() => {
      const i = t.name.lastIndexOf(" › ");
      return i > 0 ? { suite: t.name.slice(0, i), name: t.name.slice(i + 3) } : { suite: "", name: t.name };
    })();
    return `
<details class="test ${t.status}" ${t.status === "failed" || a.total <= 3 ? "open" : ""} id="t${idx}">
  <summary><span class="dot"></span><span class="name">${idx}. ${esc(name)}${suite ? ` <span class="meta">${esc(suite)}</span>` : ""}</span><span class="meta">${t.steps.length} step${t.steps.length === 1 ? "" : "s"} · ${fmtMs(t.durationMs) || "–"}</span></summary>
  ${t.error ? `<pre class="err">${esc(t.error)}</pre>` : ""}
  <table class="tbl steps compact"><thead><tr><th>#</th><th>Type</th><th>Step</th><th>Status</th><th class="num">Time</th><th>Evidence</th></tr></thead><tbody>
  ${t.steps
    .map((s, j) => {
      const n = s.screenshot ? ++shotNo : 0;
      const kind = classifyStep(s.title);
      return `<tr class="step ${s.status}"><td>${j + 1}</td><td><span class="kind ${kind}">${kind}</span></td><td><code>${esc(s.title)}</code>${s.error ? `<pre class="err">${esc(s.error)}</pre>` : ""}</td><td><span class="badge ${s.status}">${s.status === "info" ? "INFO" : s.status.toUpperCase()}</span></td><td class="num">${fmtMs(s.durationMs) || "–"}</td><td>${n ? `<a href="#fig${n}">Fig. ${n}</a>` : "–"}</td></tr>${
        s.screenshot ? `<tr class="shot"><td colspan="6"><figure id="fig${n}"><a href="${s.screenshot}" target="_blank" title="Open full size"><img loading="lazy" src="${s.screenshot}" alt="Screenshot after: ${esc(s.title)}"></a><figcaption>Fig. ${n} · after step ${j + 1}: ${esc(s.title)}</figcaption></figure></td></tr>` : ""
      }`;
    })
    .join("\n")}
  </tbody></table>
</details>`;
  };
  const evidenceHtml = m.tests.map((t, i) => testHtml(t, i + 1)).join("") || `<p class="muted">No tests ran.</p>`;

  const checksHtml = m.checks.length
    ? `<table class="tbl compact"><thead><tr><th>#</th><th>Acceptance check</th><th>Result</th></tr></thead><tbody>${m.checks.map((c, i) => `<tr class="${c.ok ? "passed" : "failed"}"><td>${i + 1}</td><td>${esc(c.label)}</td><td><span class="badge ${c.ok ? "passed" : "failed"}">${c.ok ? "PASS" : "FAIL"}</span></td></tr>`).join("")}</tbody></table>`
    : `<p class="muted">No scenario checks were evaluated for this run.</p>`;

  const logHtml = (m.log || []).map((l) => `${l.kind === "pass" ? "✓" : l.kind === "fail" || l.kind === "error" ? "✗" : l.kind === "test" ? "▸" : "·"} ${esc(l.text)}${l.ms != null ? `  (${fmtMs(l.ms)})` : ""}`).join("\n");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(m.scenario)} · Test execution report</title><style>${BASE_CSS}${REPORT_CSS}</style></head>
<body><div class="wrap">
<header class="hdr">
  <div class="hdr-top"><div class="brand">QA Interview Ready · Test execution report</div><button class="print" onclick="window.print()">⎙ Print / save as PDF</button></div>
  <h1>${esc(m.scenario)}</h1>
  <p class="sub">${esc(m.app)} · ${started.toLocaleString()} · ${m.mode === "github" ? "GitHub Actions" : "In-browser run"}${m.learner ? ` · ${esc(m.learner)}` : ""} ${links ? "· " + links : ""}</p>
  <div class="verdict ${m.verdict ?? "none"}"><span class="pill ${m.verdict === "pass" ? "pass" : m.verdict === "fail" ? "fail" : ""}">${esc(a.verdictLabel)}</span><span>${esc(a.verdictLong)}</span><span class="risk ${a.risk}">Release risk: ${a.risk}</span></div>
</header>
<nav class="tabs"><a href="#summary">1 Summary</a><a href="#charts">2 Results</a><a href="#env">3 Environment</a><a href="#checks">4 Acceptance</a><a href="#results">5 Test results</a><a href="#failures">6 Failures</a><a href="#evidence">7 Evidence</a><a href="#log">8 Log</a><a href="#signoff">9 Sign-off</a></nav>

<section class="card" id="summary"><h2>1. Executive summary</h2>
  <p class="lead">${esc(a.summary)}</p>
  <div class="kpis">${kpis}</div>
  <div class="reco ${a.risk}"><b>Recommendation</b> ${esc(a.recommendation)}</div>
</section>

<section class="card" id="charts"><h2>2. Results at a glance</h2>
  <div class="charts">
    <div class="chart">${outcomePie}</div>
    <div class="chart">${stepsPie}</div>
    <div class="chart wide">${stepsBar}</div>
    ${durationCols ? `<div class="chart wide">${durationCols}</div>` : ""}
    ${checksBar ? `<div class="chart wide">${checksBar}</div>` : ""}
  </div>
  ${suitesTable}
</section>

<section class="card" id="env"><h2>3. Environment and run details</h2>
  <table class="kv">${env.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${isUrl(v) ? `<a href="${esc(v)}" target="_blank" rel="noreferrer">${esc(v)}</a>` : esc(v)}</td></tr>`).join("")}</table>
</section>

<section class="card" id="checks"><h2>4. Scenario acceptance checks</h2>${checksHtml}</section>

<section class="card" id="results"><h2>5. Test results</h2>${resultsTable}</section>

<section class="card" id="failures"><h2>6. Failure analysis</h2>${failuresHtml}</section>

<section class="card" id="evidence"><h2>7. Step-by-step evidence</h2><p class="muted">Each step is listed in execution order with its result, timing and the screenshot captured immediately after it. Click a screenshot for full size.</p>${evidenceHtml}</section>

<section class="card" id="log"><h2>8. Execution log</h2><pre class="log">${logHtml}</pre></section>

<section class="card" id="signoff"><h2>9. Sign-off</h2>
  <table class="tbl compact signoff"><thead><tr><th>Role</th><th>Name</th><th>Decision</th><th>Date</th><th>Signature</th></tr></thead><tbody>
  <tr><td>Test engineer</td><td>${esc(m.learner ?? "")}</td><td>${a.risk === "low" ? "Recommend sign-off" : "Hold"}</td><td>${esc(new Date().toLocaleDateString())}</td><td></td></tr>
  <tr><td>Delivery manager</td><td></td><td></td><td></td><td></td></tr>
  <tr><td>Product owner</td><td></td><td></td><td></td><td></td></tr>
  </tbody></table>
</section>
<footer class="foot">Generated by QA Interview Ready labs · ${esc(new Date().toLocaleString())} · Scenario ${esc(m.scenarioId)}</footer>
</div><script>window.addEventListener('beforeprint',function(){document.querySelectorAll('details').forEach(function(d){d.open=true})})</script></body></html>`;
}

const BASE_CSS = `
:root{--bg:#080f1d;--card:#0c1629;--card2:#101c33;--ink:#efe9e2;--muted:#b9c0ce;--line:#1e2f50;--pass:#7fd3a4;--fail:#f09a93;--info:#93c5fd;--accent:#dbad96;--warn:#e9c46a;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:20px 16px 40px}
.hdr{background:linear-gradient(135deg,#101c33,#3d1020);color:#efe9e2;border:1px solid var(--line);border-radius:12px;padding:20px 22px;margin-bottom:14px}
.brand{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#dbad96}
.hdr h1{margin:4px 0 6px;font-size:24px}.sub{margin:0;color:#b9c0ce}.sub a{color:#e8c6b3}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin-bottom:14px}
.card h2{margin:0 0 12px;font-size:16px;letter-spacing:.01em}
.log{margin:0;white-space:pre-wrap;word-break:break-word;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#060a14;color:#efe9e2;padding:12px;border-radius:8px;max-height:420px;overflow:auto;border:1px solid var(--line)}
.spin{display:inline-block;width:12px;height:12px;border:2px solid #dbad96;border-top-color:transparent;border-radius:50%;animation:s 1s linear infinite;vertical-align:-2px;margin-right:6px}@keyframes s{to{transform:rotate(360deg)}}
.muted{color:var(--muted)}.good{color:var(--pass)}.bad{color:var(--fail)}
`;
const REPORT_CSS = `
.hdr-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
.print{background:transparent;border:1px solid #dbad96;color:#dbad96;border-radius:999px;padding:4px 12px;font:600 12px system-ui,sans-serif;cursor:pointer}.print:hover{background:#dbad96;color:#080f1d}
.verdict{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px;font-weight:600}
.pill{display:inline-block;border-radius:999px;padding:3px 12px;font-weight:800;font-size:12px;letter-spacing:.06em;background:#2b3f66;color:#efe9e2}.pill.pass{background:#17392a;color:#7fd3a4}.pill.fail{background:#4a1f22;color:#f09a93}
.risk{margin-left:auto;font-size:12px;text-transform:uppercase;letter-spacing:.06em;border-radius:999px;padding:3px 10px;border:1px solid var(--line)}.risk.low{color:var(--pass)}.risk.medium{color:var(--warn)}.risk.high{color:var(--fail)}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}.tabs a{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:5px 12px;color:var(--ink);text-decoration:none;font-weight:600;font-size:12px}.tabs a:hover{border-color:var(--accent);color:var(--accent)}
.lead{font-size:15px;line-height:1.6;margin:0 0 14px}
.kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px;margin-bottom:14px}
.kpi{border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--card2)}.kpi b{display:block;font-size:22px;line-height:1.1}.kpi span{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}.kpi.good b{color:var(--pass)}.kpi.bad b{color:var(--fail)}
.reco{border-radius:10px;padding:10px 14px;border:1px solid var(--line);background:var(--card2)}.reco b{margin-right:8px;text-transform:uppercase;font-size:11px;letter-spacing:.06em}.reco.low{border-color:#2f6b4c}.reco.medium{border-color:#8a7a2a}.reco.high{border-color:#7a2d35}
.charts{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}.chart{border:1px solid var(--line);border-radius:10px;padding:8px;background:var(--card2);overflow:hidden}.chart svg{width:100%;height:auto;display:block}.chart.wide{grid-column:1/-1}.chart.wide svg{max-width:720px;margin:0 auto}
.kv{border-collapse:collapse;width:100%;font-size:13px}.kv th{text-align:left;color:var(--muted);font-weight:600;padding:5px 10px 5px 0;width:190px;vertical-align:top;border-bottom:1px dashed var(--line)}.kv td{padding:5px 0;word-break:break-all;border-bottom:1px dashed var(--line)}.kv tr:last-child th,.kv tr:last-child td{border-bottom:0}.kv a{color:#e8c6b3}
.tbl{border-collapse:collapse;width:100%;font-size:13px}.tbl th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:8px 10px;border-bottom:1px solid var(--line);background:var(--card2)}.tbl td{padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}.tbl tbody tr:nth-child(even) td{background:rgba(255,255,255,.02)}.tbl .num{text-align:right;white-space:nowrap}.tbl.compact td,.tbl.compact th{padding:6px 8px}.tbl a{color:var(--ink);text-decoration:none;border-bottom:1px dotted var(--muted)}
.badge{display:inline-block;border-radius:6px;padding:1px 8px;font-size:11px;font-weight:800;letter-spacing:.05em}.badge.passed{background:#17392a;color:#7fd3a4}.badge.failed{background:#4a1f22;color:#f09a93}.badge.info{background:#1b2a4a;color:#93c5fd}
.kind{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);border:1px solid var(--line);border-radius:4px;padding:0 5px}.kind.assertion{color:var(--pass)}.kind.navigation{color:var(--info)}.kind.action{color:var(--accent)}.kind.api{color:var(--warn)}
.errline{font:11px/1.4 ui-monospace,Menlo,Consolas,monospace;color:var(--fail);margin-top:2px}
.failure{border:1px solid #5a1a2b;border-radius:10px;padding:12px 14px;margin:10px 0;background:#160b12}.failure h3{margin:0 0 8px;font-size:14px}.failure .meta{font-weight:400;color:var(--muted);font-size:12px;margin-left:6px}
.ok-note{color:var(--pass);font-weight:600}
.test{border:1px solid var(--line);border-radius:10px;margin:8px 0;background:var(--card)}.test summary{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;list-style:none}.test summary::-webkit-details-marker{display:none}
.test .name{font-weight:600;flex:1}.meta{color:var(--muted);font-size:12px;white-space:nowrap}
.dot{width:10px;height:10px;border-radius:50%;background:#6f7a92;flex:none}.passed>summary .dot{background:var(--pass)}.failed>summary .dot{background:var(--fail)}
.tbl.steps{border-top:1px solid var(--line)}.tbl.steps code{font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;word-break:break-word}.tbl.steps tr.shot td{background:transparent!important;padding-top:0}
.err{margin:6px 0 0;white-space:pre-wrap;color:#f09a93;background:#2a0b15;border:1px solid #5a1a2b;border-radius:8px;padding:8px 10px;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace}
figure{margin:6px 0 4px}figure img{max-width:min(100%,640px);border:1px solid var(--line);border-radius:8px;display:block}figcaption{font-size:11px;color:var(--muted);margin-top:3px}
.signoff td{height:34px}
.foot{text-align:center;color:var(--muted);font-size:12px;margin-top:10px}
@media (max-width:720px){.charts{grid-template-columns:1fr}.kv th{width:120px}}
@media print{
  :root{--bg:#fff;--card:#fff;--card2:#f6f3ee;--ink:#101c33;--muted:#5b6577;--line:#d9d4cc;--pass:#1f8a55;--fail:#c0392b;--info:#2d6cdf;--accent:#74223a;--warn:#9a7b00;color-scheme:light}
  body{font-size:12px}.wrap{max-width:none;padding:0}.hdr{background:#101c33!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;color:#efe9e2}
  .tabs,.print{display:none}.card{break-inside:avoid;border-color:#d9d4cc}.test{break-inside:avoid}
  .badge.passed{background:#dcf3e6;color:#1f8a55}.badge.failed{background:#fbe0dc;color:#c0392b}.badge.info{background:#e3ecfb;color:#2d6cdf}.pill.pass{background:#dcf3e6;color:#1f8a55}.pill.fail{background:#fbe0dc;color:#c0392b}
  .failure{background:#fff6f5}.err{background:#fff0ee;color:#c0392b;border-color:#f0c4bf}.log{background:#f6f3ee;color:#101c33;max-height:none}
  .kpi b,.badge,.pill,.chart,.hdr{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`;
