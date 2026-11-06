/**
 * Derived figures shared by the HTML run report and the Word evidence document: totals, pass rate,
 * step classification, failure analysis and the plain-English executive summary.
 */
import type { ReportModel, ReportStep, ReportTest } from "./report";

export type StepKind = "navigation" | "action" | "assertion" | "api" | "step" | "other";

export interface FailureRecord {
  testIndex: number;
  test: string;
  suite: string;
  stepIndex: number | null;
  step: string | null;
  error: string;
  screenshot?: string;
}

export interface TestRow {
  index: number;
  suite: string;
  name: string;
  fullName: string;
  status: "passed" | "failed";
  durationMs?: number;
  steps: number;
  assertions: number;
  failedSteps: number;
  screenshots: number;
  error?: string;
}

export interface Analysis {
  total: number;
  passed: number;
  failed: number;
  rate: number;
  stepsTotal: number;
  stepsFailed: number;
  screenshots: number;
  assertionsPassed: number;
  assertionsFailed: number;
  checksPassed: number;
  checksFailed: number;
  byKind: Record<StepKind, number>;
  rows: TestRow[];
  suites: { name: string; passed: number; failed: number; durationMs: number }[];
  failures: FailureRecord[];
  slowest?: TestRow;
  verdictLabel: string;
  verdictLong: string;
  summary: string;
  recommendation: string;
  risk: "low" | "medium" | "high";
}

export const fmtMs = (ms?: number) => (ms == null ? "" : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`);

export function classifyStep(title: string): StepKind {
  const t = title.toLowerCase();
  if (/^step:/.test(t)) return "step";
  if (/^(get|post|put|patch|delete|head|options)\b/.test(t) && /\s\S*(\/|→|->|\d{3})/.test(t)) return "api";
  if (/^(goto|navigate|page\.goto|open|reload|go ?back|go ?forward)\b/.test(t) || /\bgoto\(/.test(t)) return "navigation";
  if (/^(expect|assert|tobe|tohave|verify|check that|should)/.test(t) || /\bexpect\(/.test(t)) return "assertion";
  if (/^(click|fill|type|press|select|check|uncheck|hover|dblclick|tap|focus|clear|set|upload|drag|wait|scroll|locator|get)/.test(t) || /\.(click|fill|type|press|select|check|uncheck|hover)\(/.test(t)) return "action";
  return "other";
}

export function splitName(fullName: string) {
  const i = fullName.lastIndexOf(" › ");
  return i > 0 ? { suite: fullName.slice(0, i), name: fullName.slice(i + 3) } : { suite: "Tests", name: fullName };
}

export function analyse(m: ReportModel): Analysis {
  const total = m.tests.length;
  const passed = m.tests.filter((t) => t.status === "passed").length;
  const failed = total - passed;
  const rate = total ? Math.round((passed / total) * 100) : 0;
  const byKind: Record<StepKind, number> = { navigation: 0, action: 0, assertion: 0, api: 0, step: 0, other: 0 };
  const rows: TestRow[] = [];
  const failures: FailureRecord[] = [];
  const suiteMap = new Map<string, { passed: number; failed: number; durationMs: number }>();
  let stepsTotal = 0;
  let stepsFailed = 0;
  let screenshots = 0;
  m.tests.forEach((t: ReportTest, i) => {
    const { suite, name } = splitName(t.name);
    let assertions = 0;
    let failedSteps = 0;
    let shots = 0;
    t.steps.forEach((s: ReportStep) => {
      const k = classifyStep(s.title);
      byKind[k]++;
      if (k === "assertion") assertions++;
      if (s.status === "failed") failedSteps++;
      if (s.screenshot) shots++;
    });
    stepsTotal += t.steps.length;
    stepsFailed += failedSteps;
    screenshots += shots;
    rows.push({ index: i + 1, suite, name, fullName: t.name, status: t.status, durationMs: t.durationMs, steps: t.steps.length, assertions, failedSteps, screenshots: shots, error: t.error });
    const s = suiteMap.get(suite) ?? { passed: 0, failed: 0, durationMs: 0 };
    s[t.status]++;
    s.durationMs += t.durationMs ?? 0;
    suiteMap.set(suite, s);
    if (t.status === "failed") {
      const idx = t.steps.findIndex((x) => x.status === "failed");
      const step = idx >= 0 ? t.steps[idx] : null;
      // the screenshot that shows the failure: the failed step's own, else the last one before it
      const shot = step?.screenshot ?? [...t.steps.slice(0, Math.max(idx, 0))].reverse().find((x) => x.screenshot)?.screenshot ?? [...t.steps].reverse().find((x) => x.screenshot)?.screenshot;
      failures.push({ testIndex: i + 1, test: name, suite, stepIndex: idx >= 0 ? idx + 1 : null, step: step?.title ?? null, error: (step?.error || t.error || "The test did not pass.").trim(), screenshot: shot });
    }
  });
  const slowest = rows.filter((r) => r.durationMs != null).sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))[0];
  const checksPassed = m.checks.filter((c) => c.ok).length;
  const checksFailed = m.checks.length - checksPassed;
  const assertionsPassed = m.assertions.passed < 0 ? byKind.assertion : m.assertions.passed;
  const assertionsFailed = m.assertions.failed;

  const where = m.mode === "github" ? "on GitHub Actions with real Playwright (Chromium)" : "in the in-browser Playwright runtime";
  const verdictLabel = m.verdict === "pass" ? "PASSED" : m.verdict === "fail" ? "FAILED" : "COMPLETED";
  const verdictLong = m.verdict === "pass" ? "Scenario accepted: all tests and acceptance checks passed" : m.verdict === "fail" ? "Scenario not accepted: see failure analysis" : "Run finished";
  const risk: Analysis["risk"] = failed === 0 && checksFailed === 0 ? "low" : rate >= 80 ? "medium" : "high";
  const summary =
    `${passed} of ${total} automated test${total === 1 ? "" : "s"} passed (${rate}% pass rate) ${where} against ${m.app}` +
    `${m.baseURL ? ` at ${m.baseURL}` : ""}, executing ${stepsTotal} step${stepsTotal === 1 ? "" : "s"} and ${assertionsPassed + assertionsFailed} assertion${assertionsPassed + assertionsFailed === 1 ? "" : "s"} in ${fmtMs(m.durationMs) || "n/a"}. ` +
    (m.checks.length ? `${checksPassed} of ${m.checks.length} scenario acceptance check${m.checks.length === 1 ? "" : "s"} passed. ` : "") +
    `${screenshots} event-based screenshot${screenshots === 1 ? "" : "s"} were captured as evidence.`;
  const recommendation =
    risk === "low"
      ? "No defects were observed. The scenario can be signed off and the suite promoted to the regression pack."
      : failures.length
        ? `Hold sign-off. ${failures.length} test${failures.length === 1 ? "" : "s"} failed; the first failure is "${failures[0].test}"${failures[0].step ? ` at step ${failures[0].stepIndex} (${failures[0].step})` : ""}. Review the failure analysis below, fix or triage, and re-run.`
        : `Hold sign-off. ${checksFailed} acceptance check${checksFailed === 1 ? "" : "s"} did not pass; see the scenario acceptance section.`;
  return {
    total,
    passed,
    failed,
    rate,
    stepsTotal,
    stepsFailed,
    screenshots,
    assertionsPassed,
    assertionsFailed,
    checksPassed,
    checksFailed,
    byKind,
    rows,
    suites: Array.from(suiteMap.entries()).map(([name, s]) => ({ name, ...s })),
    failures,
    slowest,
    verdictLabel,
    verdictLong,
    summary,
    recommendation,
    risk,
  };
}

/** Rows for the "Environment and run details" table, shared by both outputs. */
export function environmentRows(m: ReportModel): [string, string][] {
  const started = new Date(m.startedAt);
  const ended = new Date(started.getTime() + (m.durationMs || 0));
  return [
    ["Scenario", m.scenario],
    ["Scenario ID", m.scenarioId],
    ["Application under test", m.app],
    ...(m.baseURL ? [["Base URL", m.baseURL] as [string, string]] : []),
    ["Execution environment", m.mode === "github" ? "GitHub Actions · ubuntu-latest runner · real Playwright" : "In-browser Playwright-compatible runtime · learner's browser"],
    ["Browser", m.browser ?? (m.mode === "github" ? "Chromium (headless)" : "Current browser (sandboxed iframe)")],
    ["Test framework", "Playwright Test (TypeScript)"],
    ["Started", started.toLocaleString()],
    ["Finished", ended.toLocaleString()],
    ["Total duration", fmtMs(m.durationMs) || "n/a"],
    ...(m.learner ? [["Executed by", m.learner] as [string, string]] : []),
    ...(m.repoUrl ? [["Repository", m.repoUrl] as [string, string]] : []),
    ...(m.commitUrl ? [["Commit", m.commitUrl] as [string, string]] : []),
    ...(m.runUrl ? [["CI run", m.runUrl] as [string, string]] : []),
    ["Report generated", new Date().toLocaleString()],
  ];
}
