/**
 * Server-side session state for the practice-app APIs, kept entirely in signed, compressed
 * cookies so it survives on stateless serverless deployments. Each app has its own cookie set
 * (`sbx_<app>_0`, `sbx_<app>_1`, ...); the state is JSON → deflate → base64url → HMAC.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";

const CHUNK = 3500;
const MAX_CHUNKS = 6;
const MAX_AGE = 60 * 60 * 24 * 2; // 2 days

const secret = () => process.env.ACCESS_TOKEN_SECRET || "sandbox-dev-secret-change-me";
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 32);

export function cookieName(app: string, i: number) {
  return `sbx_${app}_${i}`;
}

export function readSession<T>(app: string, cookieHeader: string | null, fallback: () => T): T {
  if (!cookieHeader) return fallback();
  const jar = new Map<string, string>();
  for (const part of cookieHeader.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0) jar.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  const chunks: string[] = [];
  for (let i = 0; i < MAX_CHUNKS; i++) {
    const v = jar.get(cookieName(app, i));
    if (!v) break;
    chunks.push(v);
  }
  if (!chunks.length) return fallback();
  const blob = chunks.join("");
  const dot = blob.lastIndexOf(".");
  if (dot < 0) return fallback();
  const payload = blob.slice(0, dot);
  const sig = blob.slice(dot + 1);
  const expected = sign(payload);
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return fallback();
    const json = inflateRawSync(Buffer.from(payload, "base64url")).toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return fallback();
  }
}

/** Set-Cookie header values that persist `state` (or clear the session when `state` is null). */
export function sessionCookies(app: string, state: unknown | null, secure: boolean): string[] {
  const attrs = `Path=/; SameSite=Lax; HttpOnly${secure ? "; Secure" : ""}`;
  const out: string[] = [];
  let used = 0;
  if (state !== null) {
    const payload = deflateRawSync(Buffer.from(JSON.stringify(state), "utf8")).toString("base64url");
    const blob = `${payload}.${sign(payload)}`;
    const n = Math.ceil(blob.length / CHUNK);
    if (n > MAX_CHUNKS) throw new SessionTooLarge();
    for (let i = 0; i < n; i++) out.push(`${cookieName(app, i)}=${blob.slice(i * CHUNK, (i + 1) * CHUNK)}; Max-Age=${MAX_AGE}; ${attrs}`);
    used = n;
  }
  for (let i = used; i < MAX_CHUNKS; i++) out.push(`${cookieName(app, i)}=; Max-Age=0; ${attrs}`);
  return out;
}

export class SessionTooLarge extends Error {
  constructor() {
    super("Session state is too large; clear some orders or reset the app.");
  }
}
