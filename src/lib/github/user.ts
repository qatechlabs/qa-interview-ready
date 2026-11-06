import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cookieSecret } from "@/lib/access";
import { API, githubConfig, OAUTH } from "./app";

export const GITHUB_COOKIE = "qir_gh";
export const OAUTH_STATE_COOKIE = "qir_gh_state";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  avatar: string;
}

export async function signGitHubUser(u: GitHubUser) {
  return new SignJWT({ id: u.id, login: u.login, name: u.name, avatar: u.avatar })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(cookieSecret());
}

export async function verifyGitHubUser(token: string | undefined): Promise<GitHubUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, cookieSecret(), { algorithms: ["HS256"] });
    if (typeof payload.login !== "string" || typeof payload.id !== "number") return null;
    return { id: payload.id, login: payload.login, name: typeof payload.name === "string" ? payload.name : payload.login, avatar: typeof payload.avatar === "string" ? payload.avatar : "" };
  } catch {
    return null;
  }
}

/** The signed-in GitHub user for the current request, or null. */
export async function getGitHubUser(): Promise<GitHubUser | null> {
  if (!githubConfig()) return null;
  return verifyGitHubUser(cookies().get(GITHUB_COOKIE)?.value);
}

export function githubCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: MAX_AGE };
}

/** Exchanges an OAuth code for the user's identity. The user token is discarded: only the identity is kept. */
export async function fetchGitHubIdentity(code: string, redirectUri: string): Promise<GitHubUser> {
  const cfg = githubConfig();
  if (!cfg) throw new Error("GitHub App is not configured");
  const tokenRes = await fetch(`${OAUTH}/login/oauth/access_token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "qa-interview-ready-labs" },
    body: JSON.stringify({ client_id: cfg.clientId, client_secret: cfg.clientSecret, code, redirect_uri: redirectUri }),
    cache: "no-store",
  });
  const tok = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error?: string; error_description?: string };
  if (!tok.access_token) throw new Error(tok.error_description || tok.error || "GitHub did not return a token");
  const userRes = await fetch(`${API}/user`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${tok.access_token}`, "User-Agent": "qa-interview-ready-labs" },
    cache: "no-store",
  });
  if (!userRes.ok) throw new Error(`GitHub user lookup failed: ${userRes.status}`);
  const u = (await userRes.json()) as { id: number; login: string; name: string | null; avatar_url: string };
  return { id: u.id, login: u.login, name: u.name || u.login, avatar: u.avatar_url };
}
