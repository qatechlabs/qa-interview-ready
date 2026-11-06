/**
 * Tiny HTTP toolkit for the practice-app APIs: a path matcher, typed JSON responses with the
 * common error shape, request-body parsing with validation helpers, and session plumbing.
 */
import { readSession, sessionCookies, SessionTooLarge } from "./session";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const bad = (message: string, details?: unknown) => new ApiError(400, "validation_error", message, details);
export const unauthorized = (message = "Authentication required") => new ApiError(401, "unauthorized", message);
export const forbidden = (message = "You do not have permission to do that") => new ApiError(403, "forbidden", message);
export const notFound = (what: string) => new ApiError(404, "not_found", `${what} not found`);
export const conflict = (message: string) => new ApiError(409, "conflict", message);

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Ctx<S> {
  method: Method;
  path: string[];
  url: URL;
  query: URLSearchParams;
  body: Record<string, unknown>;
  headers: Headers;
  state: S;
  /** mark the session as changed so the cookie is rewritten */
  touch: () => void;
  /** replace the whole session (reset) */
  replace: (s: S) => void;
  status: number;
}

export interface Route<S> {
  method: Method;
  pattern: string;
  handler: (c: Ctx<S>, params: Record<string, string>) => unknown | Promise<unknown>;
}

export const route = <S>(method: Method, pattern: string, handler: Route<S>["handler"]): Route<S> => ({ method, pattern, handler });

function match(pattern: string, path: string[]): Record<string, string> | null {
  const parts = pattern.split("/").filter(Boolean);
  if (parts.length !== path.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith(":")) params[parts[i].slice(1)] = decodeURIComponent(path[i]);
    else if (parts[i] !== path[i]) return null;
  }
  return params;
}

export async function parseBody(req: Request): Promise<Record<string, unknown>> {
  const ct = req.headers.get("content-type") || "";
  if (req.method === "GET" || req.method === "DELETE") return {};
  try {
    if (ct.includes("application/json")) {
      const text = await req.text();
      if (!text.trim()) return {};
      const v = JSON.parse(text);
      return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
    }
    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      const out: Record<string, unknown> = {};
      fd.forEach((v, k) => (out[k] = typeof v === "string" ? v : v.name));
      return out;
    }
    const text = await req.text();
    if (!text.trim()) return {};
    try {
      const v = JSON.parse(text);
      return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
    } catch {
      throw bad("Request body must be JSON (send Content-Type: application/json)");
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw bad("Malformed JSON body");
  }
}

export const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
export const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : NaN);

export function require<T extends Record<string, unknown>>(body: T, fields: string[]): Record<string, string> {
  const missing = fields.filter((f) => !str(body[f]));
  if (missing.length) throw bad(`${missing.map((f) => `'${f}'`).join(", ")} ${missing.length === 1 ? "is" : "are"} required`, { missing });
  return Object.fromEntries(fields.map((f) => [f, str(body[f])]));
}

export const json = (data: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders } });

export interface AppApi<S> {
  id: string;
  initial: () => S;
  routes: Route<S>[];
}

export async function handle<S>(api: AppApi<S>, req: Request, path: string[]): Promise<Response> {
  const url = new URL(req.url);
  const rawMethod = req.method.toUpperCase();
  if (rawMethod === "OPTIONS") return new Response(null, { status: 204, headers: { Allow: "GET, POST, PUT, PATCH, DELETE" } });
  const method = rawMethod as Method;
  const secure = url.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  let state = readSession<S>(api.id, req.headers.get("cookie"), api.initial);
  let dirty = false;
  const started = Date.now();
  try {
    const body = await parseBody(req);
    for (const r of api.routes) {
      if (r.method !== method) continue;
      const params = match(r.pattern, path);
      if (!params) continue;
      const ctx: Ctx<S> = {
        method,
        path,
        url,
        query: url.searchParams,
        body,
        headers: req.headers,
        state,
        touch: () => (dirty = true),
        replace: (s: S) => {
          state = s;
          ctx.state = s;
          dirty = true;
        },
        status: 200,
      };
      const data = await r.handler(ctx, params);
      const res = json(data ?? {}, ctx.status, { "X-Response-Time": `${Date.now() - started}ms` });
      if (dirty) for (const c of sessionCookies(api.id, state, secure)) res.headers.append("Set-Cookie", c);
      return res;
    }
    // method known for this path?
    const other = api.routes.filter((r) => match(r.pattern, path));
    if (other.length) return json({ error: { code: "method_not_allowed", message: `${method} is not allowed here; try ${other.map((r) => r.method).join(", ")}` } }, 405, { Allow: other.map((r) => r.method).join(", ") });
    return json({ error: { code: "not_found", message: `No endpoint ${method} /${path.join("/")}. GET the API root for the list of endpoints.` } }, 404);
  } catch (e) {
    if (e instanceof ApiError) return json({ error: { code: e.code, message: e.message, ...(e.details !== undefined ? { details: e.details } : {}) } }, e.status);
    if (e instanceof SessionTooLarge) return json({ error: { code: "session_too_large", message: e.message } }, 413);
    return json({ error: { code: "internal", message: (e as Error).message || "Unexpected error" } }, 500);
  }
}

/** Reads `Authorization: Bearer <token>` or a session user; tokens are `<app>.<user>.<sig>` issued by login. */
export const bearer = (headers: Headers) => {
  const h = headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : "";
};

export const paginate = <T>(items: T[], query: URLSearchParams, defaultLimit = 10, maxLimit = 50) => {
  const page = Math.max(1, Math.floor(num(query.get("page")) || 1));
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(num(query.get("limit")) || defaultLimit)));
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  return { items: items.slice((page - 1) * limit, page * limit), page, limit, total, pages };
};

export const nowIso = () => new Date().toISOString();
export const money2 = (n: number) => Math.round(n * 100) / 100;
