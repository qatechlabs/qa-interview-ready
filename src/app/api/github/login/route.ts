import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { githubConfig, OAUTH } from "@/lib/github/app";
import { OAUTH_STATE_COOKIE } from "@/lib/github/user";
import { SITE } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Starts GitHub sign-in. `next` is the in-site path to return to afterwards. */
export async function GET(req: Request) {
  const cfg = githubConfig();
  if (!cfg) return NextResponse.json({ error: "GitHub sign-in is not configured." }, { status: 503 });
  const url = new URL(req.url);
  const rawNext = url.searchParams.get("next") || "/labs";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/labs";
  const state = randomBytes(16).toString("hex");
  const redirectUri = `${SITE.url.replace(/\/$/, "")}/api/github/callback`;
  const authorize = new URL(`${OAUTH}/login/oauth/authorize`);
  authorize.searchParams.set("client_id", cfg.clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", state);
  const res = NextResponse.redirect(authorize.toString(), 302);
  res.cookies.set(OAUTH_STATE_COOKIE, `${state}:${next}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
