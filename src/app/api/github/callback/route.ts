import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { githubConfig } from "@/lib/github/app";
import { fetchGitHubIdentity, GITHUB_COOKIE, githubCookieOptions, OAUTH_STATE_COOKIE, signGitHubUser } from "@/lib/github/user";
import { SITE } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const site = SITE.url.replace(/\/$/, "");
  if (!githubConfig()) return NextResponse.redirect(`${site}/labs?github=unconfigured`);
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const saved = cookies().get(OAUTH_STATE_COOKIE)?.value || "";
  const sep = saved.indexOf(":");
  const savedState = sep < 0 ? saved : saved.slice(0, sep);
  const next = sep < 0 ? "/labs" : saved.slice(sep + 1) || "/labs";
  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${site}/labs?github=${reason}`);
    res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };
  if (!code || !state || !savedState || state !== savedState) return fail("state");
  try {
    const user = await fetchGitHubIdentity(code, `${site}/api/github/callback`);
    const token = await signGitHubUser(user);
    const res = NextResponse.redirect(`${site}${next}`);
    res.cookies.set(GITHUB_COOKIE, token, githubCookieOptions());
    res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    console.error("GitHub sign-in failed", e);
    return fail("failed");
  }
}
