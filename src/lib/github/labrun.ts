import "server-only";
import { API, gh, GitHubError, githubConfig, installationToken, resetInstallationToken } from "./app";
import { commitLab, commitTree, labRepoName, RUNNER_FILES, seedFiles, type Repo } from "./labrepo";
import type { GitHubUser } from "./user";
import { readZipEntry } from "./unzip";

export const WORKFLOW_FILE = "lab.yml";

export interface RunTest {
  name: string;
  ok: boolean;
  error?: string;
  durationMs: number;
}

export interface RunStatus {
  status: "pending" | "queued" | "in_progress" | "completed";
  conclusion?: string | null;
  runId?: number;
  runUrl?: string;
  /** Present once the results artifact was read. */
  tests?: RunTest[];
  assertions?: { passed: number; failed: number; matchers: string[] };
  error?: string;
  durationMs?: number;
}

async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
  try {
    return await fn(await installationToken());
  } catch (e) {
    if (e instanceof GitHubError && e.status === 401) {
      resetInstallationToken();
      return fn(await installationToken());
    }
    throw e;
  }
}

/**
 * Commits the lab, makes sure the workflow file exists, and dispatches a run of it.
 * Returns the commit (head) sha the run will report as head_sha.
 */
export async function dispatchLabRun(u: GitHubUser, siteUrl: string, scenarioId: string, files: Record<string, string>, baseURL: string, message: string) {
  const cfg = githubConfig();
  if (!cfg) throw new GitHubError("GitHub App is not configured", 503);
  const commit = await commitLab(u, siteUrl, scenarioId, files, message);
  const name = labRepoName(u.login);
  return withToken(async (token) => {
    const repo = await gh<Repo>(`/repos/${cfg.org}/${name}`, token);
    let head = commit.sha;
    // Repos created before the runner files existed (or changed) get the current ones before the run.
    const seed = seedFiles(u, siteUrl);
    const missing: Record<string, string> = {};
    for (const f of RUNNER_FILES) {
      try {
        const cur = await gh<{ content?: string; encoding?: string }>(`/repos/${cfg.org}/${name}/contents/${f}`, token);
        const text = cur.content && cur.encoding === "base64" ? Buffer.from(cur.content.replace(/\n/g, ""), "base64").toString("utf8") : "";
        // the config is ours, but a learner may have edited it: only replace it when it predates the reporter
        if (f === "playwright.config.ts" ? !text.includes("lab-reporter") : text !== seed[f] && f === "lab-reporter.js") missing[f] = seed[f];
      } catch (e) {
        if (!(e instanceof GitHubError) || e.status !== 404) throw e;
        missing[f] = seed[f];
      }
    }
    if (Object.keys(missing).length) {
      const r = await commitTree(token, cfg.org, repo, u, missing, "", "Update the lab runner files");
      head = r.sha;
    }
    const dispatchedAt = new Date().toISOString();
    await gh(`/repos/${cfg.org}/${name}/actions/workflows/${WORKFLOW_FILE}/dispatches`, token, {
      method: "POST",
      json: { ref: repo.default_branch || "main", inputs: { lab: `labs/${scenarioId}`, baseURL } },
    });
    return { sha: head, commitUrl: commit.url, commitUnchanged: commit.unchanged, repoUrl: repo.html_url, dispatchedAt, actionsUrl: `${repo.html_url}/actions/workflows/${WORKFLOW_FILE}` };
  });
}

interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  head_sha: string;
  run_started_at?: string;
  updated_at?: string;
}

/** Finds the dispatched run (by head sha, created after `since`) and reads its results when it has finished. */
export async function labRunStatus(u: GitHubUser, sha: string, since: string): Promise<RunStatus> {
  const cfg = githubConfig();
  if (!cfg) throw new GitHubError("GitHub App is not configured", 503);
  const name = labRepoName(u.login);
  const base = `/repos/${cfg.org}/${name}`;
  const sinceMs = Date.parse(since) - 120_000;
  return withToken(async (token) => {
    const runs = await gh<{ workflow_runs: WorkflowRun[] }>(`${base}/actions/workflows/${WORKFLOW_FILE}/runs?head_sha=${sha}&event=workflow_dispatch&per_page=10`, token);
    const run = runs.workflow_runs.filter((r) => Date.parse(r.created_at) >= sinceMs).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
    if (!run) return { status: "pending" };
    if (run.status !== "completed") return { status: run.status === "queued" || run.status === "waiting" || run.status === "pending" ? "queued" : "in_progress", runId: run.id, runUrl: run.html_url };
    const durationMs = run.run_started_at && run.updated_at ? Date.parse(run.updated_at) - Date.parse(run.run_started_at) : undefined;
    const out: RunStatus = { status: "completed", conclusion: run.conclusion, runId: run.id, runUrl: run.html_url, durationMs };
    const arts = await gh<{ artifacts: { id: number; name: string; expired: boolean }[] }>(`${base}/actions/runs/${run.id}/artifacts?per_page=20`, token);
    const art = arts.artifacts.find((a) => a.name === "results" && !a.expired);
    if (!art) {
      out.error = run.conclusion === "success" ? "The run finished but produced no results." : `The workflow ${run.conclusion || "failed"} before the tests ran (install step?). Open the run for the log.`;
      return out;
    }
    const zipRes = await fetch(`${API}${base}/actions/artifacts/${art.id}/zip`, {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "qa-interview-ready-labs" },
      redirect: "follow",
      cache: "no-store",
    });
    if (!zipRes.ok) throw new GitHubError(`artifact download: ${zipRes.status}`, zipRes.status);
    const zip = Buffer.from(await zipRes.arrayBuffer());
    const json = readZipEntry(zip, "results.json");
    if (!json) {
      out.error = "results.json was not in the artifact.";
      return out;
    }
    Object.assign(out, parseResults(json.toString("utf8")));
    const asserts = readZipEntry(zip, "assertions.json");
    if (asserts) {
      try {
        const a = JSON.parse(asserts.toString("utf8")) as { passed?: number; failed?: number; matchers?: string[] };
        if (typeof a.passed === "number") out.assertions = { passed: a.passed, failed: a.failed || 0, matchers: Array.isArray(a.matchers) ? a.matchers.filter((m) => typeof m === "string") : [] };
      } catch {
        /* keep what the report gave */
      }
    }
    return out;
  });
}

interface PwStep {
  title: string;
  error?: unknown;
  steps?: PwStep[];
}
interface PwSuite {
  title: string;
  specs?: { title: string; ok: boolean; tests?: { results?: { status: string; duration?: number; error?: { message?: string }; errors?: { message?: string }[]; steps?: PwStep[] }[] }[] }[];
  suites?: PwSuite[];
}

const stripAnsi = (s: string) => s.replace(/\u001b\[[0-9;]*m/g, "");

/** Flattens Playwright's JSON reporter output into per-test results and assertion counts. */
export function parseResults(text: string): Pick<RunStatus, "tests" | "assertions" | "error"> {
  let report: { suites?: PwSuite[]; errors?: { message?: string }[] };
  try {
    report = JSON.parse(text);
  } catch {
    return { tests: [], assertions: { passed: 0, failed: 0, matchers: [] }, error: "results.json could not be parsed." };
  }
  const tests: RunTest[] = [];
  const assertions = { passed: 0, failed: 0, matchers: [] as string[] };
  let sawSteps = false;
  const walkSteps = (steps: PwStep[] | undefined) => {
    for (const s of steps || []) {
      sawSteps = true;
      const m = s.title.match(/^(?:expect\.|Expect "|expect\.(?:soft|poll)\.)(\w+)/i) || s.title.match(/^expect\.(\w+)/);
      if (m) {
        if (s.error) assertions.failed++;
        else assertions.passed++;
        if (!assertions.matchers.includes(m[1])) assertions.matchers.push(m[1]);
      }
      walkSteps(s.steps);
    }
  };
  const walk = (suite: PwSuite, prefix: string[]) => {
    for (const spec of suite.specs || []) {
      const name = [...prefix, spec.title].join(" › ");
      const results = (spec.tests || []).flatMap((t) => t.results || []);
      const last = results[results.length - 1];
      const err = last?.error?.message || last?.errors?.[0]?.message;
      tests.push({ name, ok: !!spec.ok, error: spec.ok ? undefined : stripAnsi(err || last?.status || "failed").split("\n").slice(0, 6).join("\n"), durationMs: results.reduce((a, r) => a + (r.duration || 0), 0) });
      for (const r of results) walkSteps(r.steps);
    }
    for (const s of suite.suites || []) walk(s, s.title && !/\.(spec|test)\.[tj]s$/.test(s.title) ? [...prefix, s.title] : prefix);
  };
  for (const s of report.suites || []) walk(s, []);
  const topError = report.errors?.map((e) => stripAnsi(e.message || "")).filter(Boolean)[0];
  return { tests, assertions: sawSteps ? assertions : { passed: -1, failed: 0, matchers: [] }, error: topError ? topError.split("\n").slice(0, 8).join("\n") : undefined };
}
