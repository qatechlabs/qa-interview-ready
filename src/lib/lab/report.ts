/**
 * Run report: an Allure-style, self-contained HTML page built from one lab run (browser or GitHub
 * Actions), with the event-based screenshots inline. Opened in a new tab by the workbench.
 */

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
  runUrl?: string;
  repoUrl?: string;
  commitUrl?: string;
  /** Everything that scrolled through the run log */
  log?: { kind: string; text: string; ms?: number }[];
}

export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmtMs = (ms?: number) => (ms == null ? "" : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`);

/** Shown in the new tab while the run is in progress; the log is streamed into #log. */
export function placeholderHtml(title: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Running · ${esc(title)}</title>
<style>${BASE_CSS}</style></head><body><div class="wrap"><header class="hdr"><div class="brand">QA Interview Ready · Run report</div><h1>${esc(title)}</h1><p class="sub"><span class="spin"></span> Run in progress. This page turns into the report when the run finishes.</p></header>
<section class="card"><h2>Live log</h2><pre id="log" class="log"></pre></section></div></body></html>`;
}

export function buildReportHtml(m: ReportModel): string {
  const total = m.tests.length;
  const passed = m.tests.filter((t) => t.status === "passed").length;
  const failed = total - passed;
  const rate = total ? Math.round((passed / total) * 100) : 0;
  const started = new Date(m.startedAt);
  const stepsTotal = m.tests.reduce((a, t) => a + t.steps.length, 0);
  const shots = m.tests.reduce((a, t) => a + t.steps.filter((s) => s.screenshot).length, 0);
  const donut = donutSvg(passed, failed);
  const env: [string, string][] = [
    ["Scenario", m.scenario],
    ["Application", m.app],
    ["Executed on", m.mode === "github" ? "GitHub Actions (real Playwright)" : "In-browser Playwright runtime"],
    ["Started", started.toLocaleString()],
    ["Duration", fmtMs(m.durationMs)],
    ...(m.learner ? [["Learner", m.learner] as [string, string]] : []),
    ...(m.baseURL ? [["Base URL", m.baseURL] as [string, string]] : []),
  ];
  const links = [m.runUrl ? `<a href="${esc(m.runUrl)}" target="_blank" rel="noreferrer">GitHub Actions run ↗</a>` : "", m.commitUrl ? `<a href="${esc(m.commitUrl)}" target="_blank" rel="noreferrer">Commit ↗</a>` : "", m.repoUrl ? `<a href="${esc(m.repoUrl)}" target="_blank" rel="noreferrer">Repository ↗</a>` : ""].filter(Boolean).join(" · ");
  const suites = groupBySuite(m.tests);
  let shotNo = 0;
  const testHtml = (t: ReportTest, idx: number) => `
<details class="test ${t.status}" ${t.status === "failed" || total <= 3 ? "open" : ""} id="t${idx}">
  <summary><span class="dot"></span><span class="name">${esc(t.name)}</span><span class="meta">${t.steps.length} step${t.steps.length === 1 ? "" : "s"} · ${fmtMs(t.durationMs)}</span></summary>
  ${t.error ? `<pre class="err">${esc(t.error)}</pre>` : ""}
  <ol class="steps">
  ${t.steps
    .map((s) => {
      const n = s.screenshot ? ++shotNo : 0;
      return `<li class="step ${s.status}"><div class="row"><span class="dot"></span><code>${esc(s.title)}</code><span class="meta">${fmtMs(s.durationMs)}</span></div>${s.error ? `<pre class="err">${esc(s.error)}</pre>` : ""}${
        s.screenshot ? `<figure><a href="${s.screenshot}" target="_blank" title="Open full size"><img loading="lazy" src="${s.screenshot}" alt="Screenshot after: ${esc(s.title)}"></a><figcaption>Evidence #${n} · after ${esc(s.title)}</figcaption></figure>` : ""
      }</li>`;
    })
    .join("\n")}
  </ol>
</details>`;
  let testIdx = 0;
  const suitesHtml = suites
    .map(
      (s: { name: string; tests: ReportTest[] }) => `<section class="suite"><h3>${esc(s.name)} <span class="meta">${s.tests.filter((t: ReportTest) => t.status === "passed").length}/${s.tests.length} passed</span></h3>${s.tests.map((t: ReportTest) => testHtml(t, testIdx++)).join("")}</section>`,
    )
    .join("");
  const checksHtml = m.checks.length
    ? `<ul class="checks">${m.checks.map((c) => `<li class="${c.ok ? "ok" : "ko"}"><span class="dot"></span>${esc(c.label)}</li>`).join("")}</ul>`
    : `<p class="muted">No scenario checks were evaluated.</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(m.scenario)} · Run report</title><style>${BASE_CSS}${REPORT_CSS}</style></head>
<body><div class="wrap">
<header class="hdr">
  <div class="brand">QA Interview Ready · Run report</div>
  <h1>${esc(m.scenario)}</h1>
  <p class="sub">${m.verdict === "pass" ? `<span class="pill pass">Scenario passed</span>` : m.verdict === "fail" ? `<span class="pill fail">Not yet</span>` : ""} ${esc(m.app)} · ${started.toLocaleString()} ${links ? "· " + links : ""}</p>
</header>
<nav class="tabs"><a href="#overview">Overview</a><a href="#suites">Suites</a><a href="#checks">Scenario checks</a><a href="#log">Execution log</a></nav>
<section class="card" id="overview"><h2>Overview</h2>
  <div class="overview">
    <div class="donut">${donut}<div class="rate"><b>${rate}%</b><span>passed</span></div></div>
    <div class="stats">
      <div class="stat"><b>${total}</b><span>tests</span></div>
      <div class="stat pass"><b>${passed}</b><span>passed</span></div>
      <div class="stat fail"><b>${failed}</b><span>failed</span></div>
      <div class="stat"><b>${m.assertions.passed < 0 ? "–" : m.assertions.passed}</b><span>assertions passed</span></div>
      <div class="stat ${m.assertions.failed ? "fail" : ""}"><b>${m.assertions.failed}</b><span>assertions failed</span></div>
      <div class="stat"><b>${stepsTotal}</b><span>steps</span></div>
      <div class="stat"><b>${shots}</b><span>screenshots</span></div>
      <div class="stat"><b>${fmtMs(m.durationMs)}</b><span>duration</span></div>
    </div>
    <table class="env">${env.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>
  </div>
</section>
<section class="card" id="suites"><h2>Suites</h2>${suitesHtml || `<p class="muted">No tests ran.</p>`}</section>
<section class="card" id="checks"><h2>Scenario checks</h2>${checksHtml}</section>
<section class="card" id="log"><h2>Execution log</h2><pre class="log">${(m.log || []).map((l) => `${l.kind === "pass" ? "✓" : l.kind === "fail" || l.kind === "error" ? "✗" : l.kind === "test" ? "▸" : "·"} ${esc(l.text)}${l.ms != null ? `  (${fmtMs(l.ms)})` : ""}`).join("\n")}</pre></section>
<footer class="foot">Generated by QA Interview Ready labs · ${esc(new Date().toLocaleString())}</footer>
</div></body></html>`;
}

function groupBySuite(tests: ReportTest[]) {
  const map = new Map<string, ReportTest[]>();
  for (const t of tests) {
    const i = t.name.lastIndexOf(" › ");
    const suite = i > 0 ? t.name.slice(0, i) : "Tests";
    const name = i > 0 ? t.name.slice(i + 3) : t.name;
    if (!map.has(suite)) map.set(suite, []);
    map.get(suite)!.push({ ...t, name });
  }
  return Array.from(map.entries()).map(([name, ts]) => ({ name, tests: ts }));
}

function donutSvg(passed: number, failed: number) {
  const total = passed + failed;
  const r = 54;
  const c = 2 * Math.PI * r;
  const p = total ? (passed / total) * c : 0;
  return `<svg viewBox="0 0 140 140" width="150" height="150" aria-label="${passed} passed, ${failed} failed">
<circle cx="70" cy="70" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="16"/>
${total ? `<circle cx="70" cy="70" r="${r}" fill="none" stroke="#dc2626" stroke-width="16" stroke-dasharray="${c}" transform="rotate(-90 70 70)"/>
<circle cx="70" cy="70" r="${r}" fill="none" stroke="#16a34a" stroke-width="16" stroke-dasharray="${p} ${c - p}" transform="rotate(-90 70 70)"/>` : ""}
</svg>`;
}

const BASE_CSS = `
:root{--bg:#f3f4f6;--card:#fff;--ink:#111827;--muted:#6b7280;--line:#e5e7eb;--pass:#16a34a;--fail:#dc2626;--info:#2563eb;--accent:#4f46e5}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:20px 16px 40px}
.hdr{background:#111827;color:#fff;border-radius:12px;padding:20px 22px;margin-bottom:14px}
.brand{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#a5b4fc}
.hdr h1{margin:4px 0 6px;font-size:22px}.sub{margin:0;color:#d1d5db}.sub a{color:#c7d2fe}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin-bottom:14px}
.card h2{margin:0 0 12px;font-size:16px}
.log{margin:0;white-space:pre-wrap;word-break:break-word;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#0b1020;color:#e5e7eb;padding:12px;border-radius:8px;max-height:420px;overflow:auto}
.spin{display:inline-block;width:12px;height:12px;border:2px solid #c7d2fe;border-top-color:transparent;border-radius:50%;animation:s 1s linear infinite;vertical-align:-2px;margin-right:6px}@keyframes s{to{transform:rotate(360deg)}}
.muted{color:var(--muted)}
`;
const REPORT_CSS = `
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}.tabs a{background:#fff;border:1px solid var(--line);border-radius:999px;padding:5px 12px;color:var(--ink);text-decoration:none;font-weight:600;font-size:13px}.tabs a:hover{border-color:var(--accent);color:var(--accent)}
.pill{display:inline-block;border-radius:999px;padding:2px 10px;font-weight:700;font-size:12px;margin-right:6px}.pill.pass{background:#dcfce7;color:#166534}.pill.fail{background:#fee2e2;color:#991b1b}
.overview{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:start}
.donut{position:relative;width:150px;height:150px}.rate{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}.rate b{font-size:26px}.rate span{font-size:11px;color:var(--muted)}
.stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}
.stat{border:1px solid var(--line);border-radius:10px;padding:8px 10px}.stat b{display:block;font-size:20px}.stat span{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}.stat.pass b{color:var(--pass)}.stat.fail b{color:var(--fail)}
.env{grid-column:1/-1;border-collapse:collapse;width:100%;font-size:13px}.env th{text-align:left;color:var(--muted);font-weight:600;padding:4px 10px 4px 0;width:140px;vertical-align:top}.env td{padding:4px 0;word-break:break-all}
.suite h3{margin:14px 0 6px;font-size:14px}.suite h3 .meta{font-weight:400;color:var(--muted);font-size:12px;margin-left:8px}
.test{border:1px solid var(--line);border-radius:10px;margin:6px 0;background:#fff}.test summary{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;list-style:none}.test summary::-webkit-details-marker{display:none}
.test .name{font-weight:600;flex:1}.meta{color:var(--muted);font-size:12px;white-space:nowrap}
.dot{width:10px;height:10px;border-radius:50%;background:#9ca3af;flex:none}.passed>summary .dot,.step.passed .dot,.checks .ok .dot{background:var(--pass)}.failed>summary .dot,.step.failed .dot,.checks .ko .dot{background:var(--fail)}.step.info .dot{background:var(--info)}
.steps{list-style:none;margin:0;padding:0 12px 10px 12px;border-top:1px solid var(--line)}.step{padding:6px 0;border-bottom:1px dashed var(--line)}.step:last-child{border-bottom:0}
.step .row{display:flex;align-items:center;gap:10px}.step code{flex:1;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;word-break:break-word}
.err{margin:6px 0 0 20px;white-space:pre-wrap;color:#991b1b;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 10px;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace}
figure{margin:8px 0 4px 20px}figure img{max-width:min(100%,560px);border:1px solid var(--line);border-radius:8px;display:block}figcaption{font-size:11px;color:var(--muted);margin-top:3px}
.checks{list-style:none;margin:0;padding:0}.checks li{display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px dashed var(--line)}.checks li:last-child{border-bottom:0}
.foot{text-align:center;color:var(--muted);font-size:12px;margin-top:10px}
@media (max-width:640px){.overview{grid-template-columns:1fr}.donut{margin:0 auto}}
`;
