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
  reporter: process.env.CI ? [['list'], ['json', { outputFile: 'results.json' }], ['html', { open: 'never' }]] : 'list',
});
`,
    ".gitignore": "node_modules/\ntest-results/\nplaywright-report/\nresults.json\n",
    ".github/workflows/lab.yml": `name: Lab run

on:
  workflow_dispatch:
    inputs:
      lab:
        description: "Lab folder, for example labs/swagshop-login"
        required: true
      baseURL:
        description: "Site under test"
        required: true

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
      - name: Run the lab
        run: npx playwright test
        env:
          CI: "1"
          LAB_DIR: \${{ inputs.lab }}
          LAB_BASE_URL: \${{ inputs.baseURL }}
        continue-on-error: true
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: results
          path: |
            results.json
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
