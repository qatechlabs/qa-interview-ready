import "server-only";
import { createPrivateKey, createSign } from "node:crypto";

/** GitHub App configuration for the per-learner lab repos. All five must be set to enable the feature. */
export function githubConfig() {
  const appId = process.env.GITHUB_APP_ID || "";
  const clientId = process.env.GITHUB_APP_CLIENT_ID || "";
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET || "";
  const privateKey = (process.env.GITHUB_APP_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  const org = process.env.GITHUB_LAB_ORG || "";
  if (!appId || !clientId || !clientSecret || !privateKey || !org) return null;
  return { appId, clientId, clientSecret, privateKey, org };
}

export const githubConfigured = () => githubConfig() !== null;

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

/** Overridable so the flow can be exercised against a local fake in tests. */
export const API = process.env.GITHUB_API_URL || "https://api.github.com";
export const OAUTH = process.env.GITHUB_OAUTH_URL || "https://github.com";

export async function gh<T = unknown>(path: string, token: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(path.startsWith("http") ? path : API + path, {
    ...rest,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "qa-interview-ready-labs",
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(rest.headers || {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const msg = (data as { message?: string } | undefined)?.message || res.statusText;
    throw new GitHubError(`GitHub ${init.method || "GET"} ${path}: ${res.status} ${msg}`, res.status, data);
  }
  return data as T;
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/** A short-lived JWT that authenticates as the GitHub App itself. */
export function appJwt() {
  const cfg = githubConfig();
  if (!cfg) throw new GitHubError("GitHub App is not configured", 503);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: cfg.appId }));
  const key = createPrivateKey(cfg.privateKey);
  const signature = createSign("RSA-SHA256").update(`${header}.${payload}`).sign(key);
  return `${header}.${payload}.${base64url(signature)}`;
}

let cached: { token: string; expires: number; org: string } | null = null;

/** An installation token for the lab organisation, cached until shortly before it expires. */
export async function installationToken(): Promise<string> {
  const cfg = githubConfig();
  if (!cfg) throw new GitHubError("GitHub App is not configured", 503);
  if (cached && cached.org === cfg.org && cached.expires > Date.now() + 60_000) return cached.token;
  const jwt = appJwt();
  const installations = await gh<{ id: number; account: { login: string } }[]>("/app/installations?per_page=100", jwt);
  const inst = installations.find((i) => i.account.login.toLowerCase() === cfg.org.toLowerCase());
  if (!inst) throw new GitHubError(`The GitHub App is not installed on the ${cfg.org} organisation`, 503);
  const tok = await gh<{ token: string; expires_at: string }>(`/app/installations/${inst.id}/access_tokens`, jwt, { method: "POST" });
  cached = { token: tok.token, expires: Date.parse(tok.expires_at), org: cfg.org };
  return tok.token;
}

/** Drops the cached installation token (used after a 401). */
export function resetInstallationToken() {
  cached = null;
}
