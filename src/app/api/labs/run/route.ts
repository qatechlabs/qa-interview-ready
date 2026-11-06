import { NextResponse } from "next/server";
import { GitHubError, githubConfigured } from "@/lib/github/app";
import { getGitHubUser } from "@/lib/github/user";
import { validateFiles } from "@/lib/github/labrepo";
import { dispatchLabRun, labRunStatus } from "@/lib/github/labrun";
import { getScenario, isRemote, labApp } from "@/lab/scenarios";
import { hasPremium } from "@/lib/access";
import { SITE } from "@/lib/config";

export const dynamic = "force-dynamic";

function fail(e: unknown, what: string) {
  if (e instanceof GitHubError) {
    console.error(`${what} failed`, e.message, e.detail);
    if (e.status === 400) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e.status === 403) return NextResponse.json({ error: "GitHub refused the request. Actions may be disabled for the organisation or the rate limit was hit." }, { status: 502 });
    return NextResponse.json({ error: `GitHub rejected the ${what}. Try again in a minute.` }, { status: 502 });
  }
  console.error(e);
  return NextResponse.json({ error: `Couldn't ${what}.` }, { status: 500 });
}

/**
 * Commits the lab and dispatches the "Lab run" workflow in the learner's repo against the real site.
 * Body: { scenarioId, files }. Returns { sha, dispatchedAt, commitUrl, actionsUrl, ... }.
 */
export async function POST(req: Request) {
  if (!githubConfigured()) return NextResponse.json({ error: "GitHub is not configured." }, { status: 503 });
  const user = await getGitHubUser();
  if (!user) return NextResponse.json({ error: "Sign in with GitHub to run on real sites." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { scenarioId?: unknown; files?: unknown };
  const scenario = typeof body.scenarioId === "string" ? getScenario(body.scenarioId) : undefined;
  if (!scenario) return NextResponse.json({ error: "Unknown scenario." }, { status: 400 });
  if (!isRemote(scenario)) return NextResponse.json({ error: "This lab runs in the browser." }, { status: 400 });
  if (!scenario.free && !(await hasPremium())) return NextResponse.json({ error: "This lab needs full access." }, { status: 403 });
  try {
    const files = validateFiles(body.files);
    const site = SITE.url.replace(/\/$/, "");
    const message = `lab(${scenario.id}): run on GitHub Actions\n\n${scenario.title} · ${site}/labs/${scenario.id}`;
    const result = await dispatchLabRun(user, site, scenario.id, files, labApp(scenario.app).base, message);
    return NextResponse.json(result);
  } catch (e) {
    return fail(e, "start the run");
  }
}

/** Polls the run: ?sha=<head sha>&since=<dispatchedAt>. */
export async function GET(req: Request) {
  if (!githubConfigured()) return NextResponse.json({ error: "GitHub is not configured." }, { status: 503 });
  const user = await getGitHubUser();
  if (!user) return NextResponse.json({ error: "Sign in with GitHub first." }, { status: 401 });
  const url = new URL(req.url);
  const sha = url.searchParams.get("sha") || "";
  const since = url.searchParams.get("since") || "";
  if (!/^[0-9a-f]{7,40}$/.test(sha) || Number.isNaN(Date.parse(since))) return NextResponse.json({ error: "sha and since are required." }, { status: 400 });
  try {
    return NextResponse.json(await labRunStatus(user, sha, since));
  } catch (e) {
    return fail(e, "read the run");
  }
}
