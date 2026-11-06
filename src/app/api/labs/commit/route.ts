import { NextResponse } from "next/server";
import { GitHubError, githubConfigured } from "@/lib/github/app";
import { getGitHubUser } from "@/lib/github/user";
import { commitLab, validateFiles } from "@/lib/github/labrepo";
import { getScenario, isWorkspace } from "@/lab/scenarios";
import { hasTier } from "@/lib/access";
import { SITE } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Commits a lab's files to the learner's repo. Body: { scenarioId, files, summary? }.
 * Requires GitHub sign-in; locked scenarios also require full access.
 */
export async function POST(req: Request) {
  if (!githubConfigured()) return NextResponse.json({ error: "GitHub is not configured." }, { status: 503 });
  const user = await getGitHubUser();
  if (!user) return NextResponse.json({ error: "Sign in with GitHub first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { scenarioId?: unknown; files?: unknown; summary?: unknown };
  const scenario = typeof body.scenarioId === "string" ? getScenario(body.scenarioId) : undefined;
  if (!scenario) return NextResponse.json({ error: "Unknown scenario." }, { status: 400 });
  if (!scenario.free && !(await hasTier(isWorkspace(scenario) ? "architect" : "pro"))) return NextResponse.json({ error: `This lab needs the ${isWorkspace(scenario) ? "Architect" : "Pro"} tier.` }, { status: 403 });
  try {
    const files = validateFiles(body.files);
    const summary = typeof body.summary === "string" ? body.summary.slice(0, 120).replace(/[\r\n]+/g, " ") : "";
    const message = `lab(${scenario.id}): ${summary || "update"}\n\n${scenario.title} · ${SITE.url.replace(/\/$/, "")}/labs/${scenario.id}`;
    const result = await commitLab(user, SITE.url.replace(/\/$/, ""), scenario.id, files, message);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GitHubError) {
      console.error("lab commit failed", e.message, e.detail);
      const status = e.status === 400 ? 400 : 502;
      return NextResponse.json({ error: e.status === 400 ? e.message : "GitHub rejected the commit. Try again in a minute." }, { status });
    }
    console.error(e);
    return NextResponse.json({ error: "Couldn't commit to GitHub." }, { status: 500 });
  }
}
