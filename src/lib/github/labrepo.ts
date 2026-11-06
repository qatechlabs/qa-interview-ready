import "server-only";
import { gh, GitHubError, githubConfig, installationToken, resetInstallationToken } from "./app";
import type { GitHubUser } from "./user";

/** Each learner gets one public repo in the lab organisation, named after their GitHub login. */
export function labRepoName(login: string) {
  const safe = login.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
  if (!safe) throw new GitHubError("Invalid GitHub login", 400);
  return `lab-${safe}`;
}

export const noreplyEmail = (u: GitHubUser) => `${u.id}+${u.login}@users.noreply.github.com`;

export const MAX_FILES = 40;
export const MAX_FILE_BYTES = 64 * 1024;
export const MAX_TOTAL_BYTES = 256 * 1024;
const PATH_RE = /^(?!\.)[\w.-]+(\/(?!\.)[\w.-]+)*$/;

/** Validates learner-supplied project files: safe relative paths and sane sizes. */
export function validateFiles(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new GitHubError("files must be an object of path → content", 400);
  const entries = Object.entries(input as Record<string, unknown>);
  if (!entries.length) throw new GitHubError("No files to commit", 400);
  if (entries.length > MAX_FILES) throw new GitHubError(`At most ${MAX_FILES} files per lab`, 400);
  let total = 0;
  const out: Record<string, string> = {};
  for (const [path, content] of entries) {
    if (typeof content !== "string") throw new GitHubError(`${path}: content must be text`, 400);
    if (!PATH_RE.test(path) || path.includes("..") || path.length > 200) throw new GitHubError(`${path}: unsafe file path`, 400);
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > MAX_FILE_BYTES) throw new GitHubError(`${path}: file is larger than ${MAX_FILE_BYTES / 1024} KB`, 400);
    total += bytes;
    out[path] = content;
  }
  if (total > MAX_TOTAL_BYTES) throw new GitHubError(`Project is larger than ${MAX_TOTAL_BYTES / 1024} KB`, 400);
  return out;
}

export interface Repo {
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
}

interface TreeEntry {
  path: string;
  mode: "100644";
  type: "blob";
  content?: string;
  sha?: string | null;
}

/** Playwright's JSON reporter drops expect() steps, so this tiny reporter records them for the lab checks. */
export const LAB_REPORTER = `// Records every expect() so the QA Interview Ready labs can grade assertions. Written to assertions.json.
const fs = require('fs');

class LabReporter {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.matchers = [];
  }

  onStepEnd(test, result, step) {
    if (step.category !== 'expect') return;
    const m = step.title.match(/(?:expect\\.(?:soft\\.|poll\\.)?|Expect ")(\\w+)/);
    const matcher = m ? m[1] : step.title;
    if (step.error) this.failed += 1;
    else this.passed += 1;
    if (!this.matchers.includes(matcher)) this.matchers.push(matcher);
  }

  onEnd() {
    fs.writeFileSync('assertions.json', JSON.stringify({ passed: this.passed, failed: this.failed, matchers: this.matchers }, null, 2));
  }
}

module.exports = LabReporter;
`;

/** Root files the remote runner needs; re-added to older repos before a run. */
/** Serves a downloaded practice app (single index.html) on localhost for GitHub Actions runs. */
export const LAB_SERVE = `// Serves app.html (a QA Interview Ready practice app) at / for the Lab run workflow.
// Paths other than / redirect to the matching hash route, like the in-browser runtime does.
// /api/* is proxied to the practice app's REST API on the site (LAB_API_ORIGIN), so request.get('/api/products')
// and the app's own calls work exactly as they do in the browser lab.
const http = require("http");
const https = require("https");
const fs = require("fs");
const html = fs.readFileSync(process.argv[2] || "app.html");
const port = Number(process.env.PORT || 8080);
const apiOrigin = (process.env.LAB_API_ORIGIN || "").replace(/\\/$/, "");
const app = process.env.LAB_APP || "";

function proxy(req, res, url) {
  if (!apiOrigin) { res.statusCode = 502; res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ error: { code: "no_api", message: "LAB_API_ORIGIN is not set" } })); }
  let p = url.pathname;
  if (!p.startsWith("/api/sandbox/")) p = "/api/sandbox/" + app + p.slice(4);
  const target = new URL(p + url.search, apiOrigin);
  const headers = { ...req.headers, host: target.host };
  delete headers["accept-encoding"];
  const client = target.protocol === "https:" ? https : http;
  const up = client.request(target, { method: req.method, headers }, (r) => {
    const h = { ...r.headers };
    if (h["set-cookie"]) h["set-cookie"] = h["set-cookie"].map((c) => c.replace(/;\\s*secure/gi, "").replace(/;\\s*domain=[^;]*/gi, ""));
    delete h["content-encoding"]; delete h["transfer-encoding"]; delete h["content-length"];
    res.writeHead(r.statusCode || 502, h);
    r.pipe(res);
  });
  up.on("error", (e) => { res.statusCode = 502; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ error: { code: "upstream", message: e.message } })); });
  req.pipe(up);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return proxy(req, res, url);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    if (url.pathname === "/" || url.pathname === "/index.html") return res.end(html);
    if (url.pathname === "/favicon.ico") { res.statusCode = 204; return res.end(); }
    res.end(\`<!doctype html><script>location.replace("/" + location.search + "#" + location.pathname)</script>\`);
  })
  .listen(port, () => console.log("practice app on http://localhost:" + port + (apiOrigin ? ", API via " + apiOrigin : "")));
`;

/** Turns Playwright traces into step-by-step evidence (evidence.json + evidence/*.jpeg). */
export const LAB_EVIDENCE = `// Builds step-by-step evidence for the QA Interview Ready labs from Playwright traces.
// Reads results.json, opens each test's trace.zip, lists the top-level steps and picks the
// screencast frame taken right after each step. Writes evidence.json + evidence/*.jpeg.
// No dependencies: the zip is read with node:zlib.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const resultsFile = process.env.PLAYWRIGHT_JSON_OUTPUT_NAME || path.join(process.cwd(), "results.json");
const outDir = path.join(process.cwd(), "evidence");
const MAX_FRAMES = 120;

function zipEntries(buf) {
  const entries = new Map();
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return entries;
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compressed = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    entries.set(name, () => {
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const data = buf.subarray(start, start + compressed);
      return method === 0 ? Buffer.from(data) : method === 8 ? zlib.inflateRawSync(data) : null;
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function lines(buf) {
  const out = [];
  for (const l of buf.toString("utf8").split("\\n")) {
    if (!l.trim()) continue;
    try { out.push(JSON.parse(l)); } catch { /* skip */ }
  }
  return out;
}

const strip = (s) => String(s || "").replace(/\\u001b\\[[0-9;]*m/g, "");

function traceSteps(entries) {
  // test runner steps live in test.trace; screencast frames in <n>-trace.trace
  const steps = [];
  const open = new Map();
  const frames = [];
  for (const [name, read] of entries) {
    if (!/(^|\\/)(test\\.trace|\\d+-trace\\.trace|trace\\.trace)$/.test(name)) continue;
    for (const e of lines(read())) {
      if (e.type === "screencast-frame") {
        const file = e.file || (e.sha1 ? \`resources/\${e.sha1}.jpeg\` : null);
        if (file) frames.push({ t: e.timestamp, file });
      } else if (e.type === "before" && e.class === "Test" && !e.parentId && ["pw:api", "expect", "test.step", "attach", "test.attach"].includes(e.method)) {
        const s = { title: strip(e.title) || e.method, start: e.startTime, end: null, error: null, method: e.method };
        if (e.method === "test.attach" || e.method === "attach") continue;
        open.set(e.callId, s);
        steps.push(s);
      } else if (e.type === "before" && e.class === "Test" && e.parentId && e.method === "expect") {
        // expect() inside a test.step: keep it as its own line
        const s = { title: strip(e.title) || e.method, start: e.startTime, end: null, error: null, method: e.method, child: true };
        open.set(e.callId, s);
        steps.push(s);
      } else if (e.type === "after" && open.has(e.callId)) {
        const s = open.get(e.callId);
        s.end = e.endTime;
        if (e.error) s.error = strip(e.error.message || e.error.error?.message || JSON.stringify(e.error)).split("\\n").slice(0, 6).join("\\n");
      }
    }
  }
  frames.sort((a, b) => a.t - b.t);
  steps.sort((a, b) => a.start - b.start);
  return { steps, frames };
}

function frameAfter(frames, end) {
  if (!frames.length || end == null) return null;
  let after = null;
  for (const f of frames) { if (f.t >= end) { after = f; break; } }
  if (after && after.t - end < 2500) return after;
  let before = null;
  for (const f of frames) { if (f.t <= end) before = f; else break; }
  return before || after;
}

function main() {
  if (!fs.existsSync(resultsFile)) { console.log("lab-evidence: no results.json, nothing to do"); return; }
  const report = JSON.parse(fs.readFileSync(resultsFile, "utf8"));
  fs.mkdirSync(outDir, { recursive: true });
  const evidence = {};
  let frameCount = 0;
  const copied = new Map();
  const walk = (suite) => {
    for (const spec of suite.specs || []) for (const t of spec.tests || []) for (const r of t.results || []) {
      const att = (r.attachments || []).find((a) => a.name === "trace" && a.path);
      if (!att || !fs.existsSync(att.path)) continue;
      let entries;
      try { entries = zipEntries(fs.readFileSync(att.path)); } catch (e) { console.log("lab-evidence: cannot read", att.path, e.message); continue; }
      const { steps, frames } = traceSteps(entries);
      const out = [];
      for (const s of steps) {
        const f = frameAfter(frames, s.end ?? s.start);
        let shot = null;
        if (f && entries.has(f.file)) {
          if (copied.has(f.file)) shot = copied.get(f.file);
          else if (frameCount < MAX_FRAMES) {
            shot = \`evidence/\${String(++frameCount).padStart(3, "0")}.jpeg\`;
            fs.writeFileSync(path.join(process.cwd(), shot), entries.get(f.file)());
            copied.set(f.file, shot);
          }
        }
        out.push({ title: s.title, ok: !s.error, durationMs: s.end != null ? Math.round(s.end - s.start) : undefined, error: s.error || undefined, screenshot: shot || undefined, child: s.child || undefined });
      }
      evidence[att.path] = { steps: out };
    }
    for (const s of suite.suites || []) walk(s);
  };
  for (const s of report.suites || []) walk(s);
  fs.writeFileSync(path.join(process.cwd(), "evidence.json"), JSON.stringify(evidence));
  console.log(\`lab-evidence: \${Object.keys(evidence).length} trace(s), \${frameCount} screenshot(s)\`);
}

main();
`;

export const RUNNER_FILES = [".github/workflows/lab.yml", "lab-reporter.js", "lab-evidence.js", "lab-serve.js", "playwright.config.ts"] as const;

/** The files every lab repo starts with. */
export function seedFiles(u: GitHubUser, siteUrl: string): Record<string, string> {
  return {
    "README.md": `# ${u.name}'s QA automation labs

Code written in the [QA Interview Ready live labs](${siteUrl}/labs), committed here automatically after every run. Each folder under \`labs/\` is one interview scenario: page objects, fixtures and tests, exactly as written in the browser.

## Run a lab locally

\`\`\`bash
npm install
npx playwright install chromium
LAB_DIR=labs/swagshop-login npm test
\`\`\`

\`LAB_DIR\` picks the scenario folder. \`LAB_BASE_URL\` overrides the site under test (each practice app lives under ${siteUrl}/sandbox/...).

## Run a lab on GitHub Actions

The **Lab run** workflow (Actions tab → Lab run → Run workflow) runs a lab folder against any site and keeps the Playwright report as an artifact. The live labs trigger it for the real-site scenarios.
`,
    "package.json": JSON.stringify(
      {
        name: labRepoName(u.login),
        private: true,
        scripts: { test: "playwright test" },
        devDependencies: { "@playwright/test": "^1.49.1", "@types/node": "^20" },
      },
      null,
      2,
    ) + "\n",
    "playwright.config.ts": `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: process.env.LAB_DIR || 'labs',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: process.env.LAB_BASE_URL || '${siteUrl}/sandbox/swagshop',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: process.env.CI ? [['list'], ['json', { outputFile: 'results.json' }], ['html', { open: 'never' }], ['./lab-reporter.js']] : 'list',
});
`,
    ".gitignore": "node_modules/\ntest-results/\nplaywright-report/\nresults.json\nassertions.json\nevidence.json\nevidence/\napp.html\n",
    "lab-reporter.js": LAB_REPORTER,
    "lab-evidence.js": LAB_EVIDENCE,
    "lab-serve.js": LAB_SERVE,
    ".github/workflows/lab.yml": `# lab-runner: v4 (managed by QA Interview Ready; edits are replaced before each run)
name: Lab run

on:
  workflow_dispatch:
    inputs:
      lab:
        description: "Lab folder, for example labs/swagshop-login"
        required: true
      baseURL:
        description: "Site under test"
        required: true
      app:
        description: "Practice app to serve locally (swagshop, peopledesk, trendkart) or empty for a real site"
        required: false
        default: ""

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install --no-audit --no-fund
      - run: npx playwright install --with-deps chromium
      - name: Serve the practice app
        # Practice apps are single-file and route by hash, so the run gets its own copy at http://localhost:8080
        # and page.goto('/') lands on the app exactly as it does in the browser lab.
        if: inputs.app != ''
        run: |
          curl -fsSL "\${{ inputs.baseURL }}/index.html" -o app.html
          LAB_API_ORIGIN="$(node -e 'console.log(new URL(process.argv[1]).origin)' "\${{ inputs.baseURL }}")" LAB_APP="\${{ inputs.app }}" node lab-serve.js app.html > serve.log 2>&1 &
          for i in 1 2 3 4 5 6 7 8 9 10; do curl -fs http://localhost:8080/ > /dev/null && break; sleep 1; done
          echo "BASE_URL=http://localhost:8080" >> "$GITHUB_ENV"
          echo "LAB_BASE_URL=http://localhost:8080" >> "$GITHUB_ENV"
      - name: Run the lab
        # A lab folder with its own playwright.config.ts (framework workspaces) runs with that config;
        # the others use the root config with LAB_DIR as testDir. Tracing is on for the evidence document.
        run: |
          CONFIG="playwright.config.ts"
          if [ -f "$LAB_DIR/playwright.config.ts" ]; then CONFIG="$LAB_DIR/playwright.config.ts"; fi
          echo "Using $CONFIG against $BASE_URL"
          npx playwright test --config "$CONFIG" --trace on --reporter="list,json,html,$GITHUB_WORKSPACE/lab-reporter.js"
        env:
          CI: "1"
          LAB_DIR: \${{ inputs.lab }}
          LAB_BASE_URL: \${{ env.LAB_BASE_URL || inputs.baseURL }}
          BASE_URL: \${{ env.BASE_URL || inputs.baseURL }}
          PLAYWRIGHT_JSON_OUTPUT_NAME: \${{ github.workspace }}/results.json
          PLAYWRIGHT_HTML_OUTPUT_DIR: \${{ github.workspace }}/playwright-report
          PLAYWRIGHT_HTML_OPEN: never
        continue-on-error: true
      - name: Collect evidence screenshots
        if: always()
        run: node lab-evidence.js
        env:
          PLAYWRIGHT_JSON_OUTPUT_NAME: \${{ github.workspace }}/results.json
        continue-on-error: true
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: results
          path: |
            results.json
            assertions.json
            evidence.json
            evidence
            playwright-report
          retention-days: 7
`,
  };
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

/** Returns the learner's lab repo, creating and seeding it on first use. */
export async function ensureRepo(u: GitHubUser, siteUrl: string): Promise<{ repo: Repo; created: boolean }> {
  const cfg = githubConfig();
  if (!cfg) throw new GitHubError("GitHub App is not configured", 503);
  const name = labRepoName(u.login);
  return withToken(async (token) => {
    try {
      const repo = await gh<Repo>(`/repos/${cfg.org}/${name}`, token);
      return { repo, created: false };
    } catch (e) {
      if (!(e instanceof GitHubError) || e.status !== 404) throw e;
    }
    const repo = await gh<Repo>(`/orgs/${cfg.org}/repos`, token, {
      method: "POST",
      json: {
        name,
        description: `${u.name}'s QA automation labs from QA Interview Ready`,
        homepage: `${siteUrl}/labs`,
        private: false,
        auto_init: true,
        has_issues: false,
        has_projects: false,
        has_wiki: false,
      },
    });
    // Give the learner push access. GitHub sends them an invitation to accept.
    try {
      await gh(`/repos/${cfg.org}/${name}/collaborators/${encodeURIComponent(u.login)}`, token, { method: "PUT", json: { permission: "push" } });
    } catch (e) {
      console.error("collaborator invite failed", e);
    }
    try {
      await gh(`/repos/${cfg.org}/${name}/topics`, token, { method: "PUT", json: { names: ["qa-interview-ready", "playwright", "test-automation"] } });
    } catch {
      /* topics are cosmetic */
    }
    await commitTree(token, cfg.org, repo, u, seedFiles(u, siteUrl), "", "Set up lab repo");
    return { repo, created: true };
  });
}

export interface CommitResult {
  sha: string;
  url: string;
  unchanged: boolean;
  repoUrl: string;
}

/**
 * Commits one lab's files under labs/<scenarioId>/ in a single commit authored by the learner.
 * Files that were in that folder before and are not in `files` any more are deleted.
 */
export async function commitLab(u: GitHubUser, siteUrl: string, scenarioId: string, files: Record<string, string>, message: string): Promise<CommitResult> {
  const cfg = githubConfig();
  if (!cfg) throw new GitHubError("GitHub App is not configured", 503);
  const { repo } = await ensureRepo(u, siteUrl);
  return withToken((token) => commitTree(token, cfg.org, repo, u, files, `labs/${scenarioId}/`, message));
}

export async function commitTree(token: string, org: string, repo: Repo, u: GitHubUser, files: Record<string, string>, prefix: string, message: string): Promise<CommitResult> {
  const base = `/repos/${org}/${repo.name}`;
  const branch = repo.default_branch || "main";
  const ref = await gh<{ object: { sha: string } }>(`${base}/git/ref/heads/${branch}`, token);
  const head = ref.object.sha;
  const headCommit = await gh<{ tree: { sha: string } }>(`${base}/git/commits/${head}`, token);

  const tree: TreeEntry[] = Object.entries(files).map(([path, content]) => ({ path: prefix + path, mode: "100644", type: "blob", content }));
  if (prefix) {
    // delete files that disappeared from the project
    const existing = await gh<{ tree: { path: string; type: string }[]; truncated: boolean }>(`${base}/git/trees/${headCommit.tree.sha}?recursive=1`, token);
    for (const e of existing.tree) {
      if (e.type === "blob" && e.path.startsWith(prefix) && !(e.path.slice(prefix.length) in files)) tree.push({ path: e.path, mode: "100644", type: "blob", sha: null });
    }
  }
  const newTree = await gh<{ sha: string }>(`${base}/git/trees`, token, { method: "POST", json: { base_tree: headCommit.tree.sha, tree } });
  if (newTree.sha === headCommit.tree.sha) {
    return { sha: head, url: `${repo.html_url}/commit/${head}`, unchanged: true, repoUrl: repo.html_url };
  }
  const commit = await gh<{ sha: string }>(`${base}/git/commits`, token, {
    method: "POST",
    json: { message, tree: newTree.sha, parents: [head], author: { name: u.name || u.login, email: noreplyEmail(u), date: new Date().toISOString() } },
  });
  await gh(`${base}/git/refs/heads/${branch}`, token, { method: "PATCH", json: { sha: commit.sha, force: false } });
  return { sha: commit.sha, url: `${repo.html_url}/commit/${commit.sha}`, unchanged: false, repoUrl: repo.html_url };
}
